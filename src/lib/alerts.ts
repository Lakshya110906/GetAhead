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
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "noreply@getahead.ai";
const ADMIN_ALERT_EMAIL = process.env.ADMIN_ALERT_EMAIL || process.env.ADMIN_EMAIL;

export async function sendOpsAlert(type: string, message: string): Promise<void> {
  console.error(`[OPS ALERT: ${type}] ${message}`);

  try {
    await prisma.errorLog.create({ data: { type, message, path: "alerts" } });
  } catch (err) {
    console.error("[OPS ALERT] failed to persist alert log:", err);
  }

  if (!ADMIN_ALERT_EMAIL) {
    console.warn("[OPS ALERT] ADMIN_ALERT_EMAIL not configured — alert was logged but not emailed.");
    return;
  }

  try {
    await resend.emails.send({
      from: `${APP_NAME} Ops <${FROM_EMAIL}>`,
      to: ADMIN_ALERT_EMAIL,
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
