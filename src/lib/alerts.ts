import { Resend } from "resend";
import { prisma } from "@/lib/prisma";

// Shared ops-alert channel: every "notice this before a user does" signal in
// the app (spend threshold, queue depth, uptime) funnels through here so
// there's exactly one place that decides how an operator actually finds out —
// console (Vercel function logs), ErrorLog (durable, visible in the admin
// panel's System Logs tab), and email (the only real paging channel this
// app has access to; there's no PagerDuty/Slack integration configured).
const resend = new Resend(process.env.RESEND_API_KEY || "re_dummy_key_for_build");
const APP_NAME = "GetAhead AI";
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
const ADMIN_ALERT_EMAIL = process.env.ADMIN_ALERT_EMAIL || process.env.ADMIN_EMAIL;

/**
 * Whether an alert can actually be emailed. Production had no RESEND_API_KEY
 * (confirmed Nov 2026), so every alert was "sent" through the build-time
 * dummy key and failed silently. Callers report this instead of implying an
 * email went out; the durable ErrorLog row is written either way.
 */
export function isAlertEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && ADMIN_ALERT_EMAIL);
}

export async function sendOpsAlert(type: string, message: string): Promise<void> {
  console.error(`[OPS ALERT: ${type}] ${message}`);

  try {
    await prisma.errorLog.create({ data: { type, message, path: "alerts" } });
  } catch (err) {
    console.error("[OPS ALERT] failed to persist alert log:", err);
  }

  const to = ADMIN_ALERT_EMAIL;
  if (!isAlertEmailConfigured() || !to) {
    console.warn(
      `[OPS ALERT] not emailed: ${!process.env.RESEND_API_KEY ? "RESEND_API_KEY" : "ADMIN_ALERT_EMAIL/ADMIN_EMAIL"} is not set. ` +
        "The alert is recorded in ErrorLog (admin → System Logs)."
    );
    return;
  }

  try {
    await resend.emails.send({
      from: `${APP_NAME} Ops <${FROM_EMAIL}>`,
      to,
      subject: `[${type}] GetAhead AI ops alert`,
      html: `<p style="font-family:sans-serif;font-size:14px;color:#111;">${message}</p>`,
    });
  } catch (err) {
    console.error("[OPS ALERT] failed to send alert email:", err);
  }
}

/** Fires at most once per calendar day per alertKey, tracked via SystemSetting. */
export async function alertOncePerDay(alertKey: string, type: string, message: string): Promise<void> {
  const dateKey = new Date().toISOString().slice(0, 10);
  const key = `${alertKey}:${dateKey}`;
  const already = await prisma.systemSetting.findUnique({ where: { key } });
  if (already) return;

  await sendOpsAlert(type, message);

  await prisma.systemSetting.upsert({
    where: { key },
    create: { key, value: new Date().toISOString() },
    update: { value: new Date().toISOString() },
  });
}
