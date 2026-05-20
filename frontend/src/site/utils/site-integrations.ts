import type { SiteConfig } from "../api.js";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    grecaptcha?: {
      ready: (cb: () => void) => void;
      render: (el: HTMLElement, opts: { sitekey: string }) => number;
      getResponse: (widgetId: number) => string;
      reset: (widgetId?: number) => void;
    };
  }
}

let gaMeasurementId = "";
let gtmContainerId = "";
let gtagScriptLoaded = false;
let gtmInjected = false;

function injectScript(src: string, id: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.getElementById(id)) {
      resolve();
      return;
    }
    const el = document.createElement("script");
    el.id = id;
    el.async = true;
    el.src = src;
    el.onload = () => resolve();
    el.onerror = () => reject(new Error(`Gagal memuat ${src}`));
    document.head.appendChild(el);
  });
}

function initGtag(measurementId: string): void {
  window.dataLayer = window.dataLayer || [];
  if (!window.gtag) {
    window.gtag = function gtag(...args: unknown[]) {
      window.dataLayer?.push(args);
    };
    window.gtag("js", new Date());
  }
  const load = gtagScriptLoaded
    ? Promise.resolve()
    : injectScript(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`, "site-gtag-js");
  void load.then(() => {
    gtagScriptLoaded = true;
    window.gtag?.("config", measurementId);
  });
}

function initGtm(containerId: string): void {
  if (gtmInjected) return;
  gtmInjected = true;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ "gtm.start": new Date().getTime(), event: "gtm.js" });
  void injectScript(
    `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(containerId)}`,
    "site-gtm-js"
  );
  const noscript = document.createElement("noscript");
  const iframe = document.createElement("iframe");
  iframe.src = `https://www.googletagmanager.com/ns.html?id=${encodeURIComponent(containerId)}`;
  iframe.height = "0";
  iframe.width = "0";
  iframe.style.display = "none";
  iframe.style.visibility = "hidden";
  noscript.appendChild(iframe);
  document.body.prepend(noscript);
}

/** Muat GA / GTM dari config CMS (setelah getPublicConfig). */
export function applySiteIntegrations(cfg: Pick<SiteConfig, "gaMeasurementId" | "gtmContainerId">): void {
  gaMeasurementId = (cfg.gaMeasurementId || "").trim();
  gtmContainerId = (cfg.gtmContainerId || "").trim().toUpperCase();

  if (gaMeasurementId && /^G-[A-Z0-9]+$/i.test(gaMeasurementId)) {
    initGtag(gaMeasurementId);
  }
  if (gtmContainerId && /^GTM-[A-Z0-9]+$/i.test(gtmContainerId)) {
    initGtm(gtmContainerId);
  }
}

export function trackSitePageView(pagePath: string, pageTitle: string): void {
  if (!gaMeasurementId || !window.gtag) return;
  window.gtag("config", gaMeasurementId, {
    page_path: pagePath,
    page_title: pageTitle,
  });
}

let recaptchaScriptPromise: Promise<void> | null = null;

export function loadRecaptchaScript(): Promise<void> {
  if (recaptchaScriptPromise) return recaptchaScriptPromise;
  recaptchaScriptPromise = injectScript("https://www.google.com/recaptcha/api.js?render=explicit", "site-recaptcha-js");
  return recaptchaScriptPromise;
}

export function renderRecaptchaWidget(el: HTMLElement, siteKey: string): Promise<number> {
  return loadRecaptchaScript().then(
    () =>
      new Promise((resolve, reject) => {
        if (!window.grecaptcha) {
          reject(new Error("reCAPTCHA tidak tersedia"));
          return;
        }
        window.grecaptcha.ready(() => {
          try {
            const id = window.grecaptcha!.render(el, { sitekey: siteKey });
            resolve(id);
          } catch (e) {
            reject(e);
          }
        });
      })
  );
}

export function getRecaptchaResponse(widgetId: number): string {
  return window.grecaptcha?.getResponse(widgetId)?.trim() || "";
}

export function resetRecaptchaWidget(widgetId: number): void {
  window.grecaptcha?.reset(widgetId);
}
