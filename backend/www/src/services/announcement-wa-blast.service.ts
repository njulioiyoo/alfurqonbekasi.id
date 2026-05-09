import { getAnnouncementById, parseRecipientPhonesJson, updateAnnouncement } from "./announcement.service.js";

function webhookUrl(): string {
  return (process.env.WHATSAPP_BLAST_WEBHOOK_URL || "").trim();
}

/**
 * Kirim payload ke webhook eksternal (n8n, Bot, dll.). Tanpa URL → status `skipped`.
 */
export async function deliverAnnouncementWaBlast(announcementId: string): Promise<void> {
  const row = await getAnnouncementById(announcementId);
  if (!row) return;

  const phones = parseRecipientPhonesJson(row.wa_recipient_phones);
  const message =
    (row.wa_message && row.wa_message.trim()) ||
    `*${row.title}*\n\n${row.summary}${row.body ? `\n\n${row.body}` : ""}`;

  const url = webhookUrl();
  if (!url) {
    await updateAnnouncement(announcementId, {
      wa_blast_status: "skipped",
      wa_blast_sent_at: null,
      wa_blast_last_error:
        "WHATSAPP_BLAST_WEBHOOK_URL belum diatur di server. Status blast ditandai sebagai dilewati.",
    });
    return;
  }

  if (!phones.length) {
    await updateAnnouncement(announcementId, {
      wa_blast_status: "skipped",
      wa_blast_last_error: "Tidak ada nomor penerima. Isi daftar nomor WA (satu baris per nomor).",
    });
    return;
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        announcementId: row.id,
        title: row.title,
        slug: row.slug,
        message,
        recipients: phones,
        validFrom: row.valid_from,
        validUntil: row.valid_until,
      }),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      await updateAnnouncement(announcementId, {
        wa_blast_status: "failed",
        wa_blast_last_error: `Webhook ${res.status}: ${t.slice(0, 500)}`,
      });
      return;
    }
    await updateAnnouncement(announcementId, {
      wa_blast_status: "sent",
      wa_blast_sent_at: new Date(),
      wa_blast_last_error: null,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await updateAnnouncement(announcementId, {
      wa_blast_status: "failed",
      wa_blast_last_error: msg.slice(0, 1000),
    });
  }
}

export function shouldAutoTriggerWaBlast(params: {
  prevStatus: string | null;
  nextStatus: string;
  prevWaFlag: boolean | null;
  nextWaFlag: boolean;
  prevSentAt: Date | null;
}): boolean {
  if (params.nextStatus !== "published" || !params.nextWaFlag) return false;
  if (params.prevSentAt) return false;
  if (params.prevStatus === null) return true;
  if (params.prevStatus !== "published" && params.nextStatus === "published") return true;
  if (!params.prevWaFlag && params.nextWaFlag) return true;
  return false;
}
