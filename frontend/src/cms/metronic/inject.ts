export function injectStylesheet(href: string, attr: string): HTMLLinkElement {
  const el = document.createElement("link");
  el.rel = "stylesheet";
  el.type = "text/css";
  el.href = href;
  el.setAttribute("data-metronic", attr);
  document.head.appendChild(el);
  return el;
}

export function removeByMetronicAttr(attr: string): void {
  document.querySelectorAll(`[data-metronic="${attr}"]`).forEach((n) => n.remove());
}

export function injectInlineScript(content: string, attr: string): void {
  const el = document.createElement("script");
  el.textContent = content;
  el.setAttribute("data-metronic", attr);
  document.head.appendChild(el);
}

export function loadScript(src: string, attr: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const el = document.createElement("script");
    el.src = src;
    el.async = false;
    el.setAttribute("data-metronic", attr);
    el.onload = () => resolve();
    el.onerror = () => reject(new Error(`Gagal memuat script: ${src}`));
    document.body.appendChild(el);
  });
}

export async function loadScriptChain(urls: string[], attrPrefix: string): Promise<void> {
  for (let i = 0; i < urls.length; i++) {
    await loadScript(urls[i], `${attrPrefix}-${i}`);
  }
}
