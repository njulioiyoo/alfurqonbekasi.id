/** Verifikasi token reCAPTCHA v2 (checkbox) ke Google. */
export async function verifyRecaptchaToken(
  secret: string,
  token: string
): Promise<{ ok: boolean; error?: string }> {
  const body = new URLSearchParams({
    secret: secret.trim(),
    response: token.trim(),
  });
  try {
    const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const data = (await res.json()) as { success?: boolean; "error-codes"?: string[] };
    if (data.success) return { ok: true };
    const codes = data["error-codes"]?.join(", ") || "verifikasi gagal";
    return { ok: false, error: codes };
  } catch {
    return { ok: false, error: "Tidak dapat menghubungi layanan reCAPTCHA" };
  }
}
