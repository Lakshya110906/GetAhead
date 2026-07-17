import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const APP_NAME = "GetAhead AI";
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "noreply@getahead.ai";
const APP_URL = process.env.NEXTAUTH_URL || "http://localhost:3005";

export async function sendVerificationEmail(email: string, name: string, token: string) {
  const verifyUrl = `${APP_URL}/verify-email?token=${token}`;

  return resend.emails.send({
    from: `${APP_NAME} <${FROM_EMAIL}>`,
    to: email,
    subject: "Verify your email address — GetAhead AI",
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
      <body style="margin:0;padding:0;background:#f8fafc;font-family:'Inter',sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 20px;">
          <tr><td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
              <tr>
                <td style="background:linear-gradient(135deg,#2563eb,#14b8a6);padding:40px;text-align:center;">
                  <h1 style="color:#fff;margin:0;font-size:28px;font-weight:700;">GetAhead AI</h1>
                  <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:14px;">AI-Powered Exam Evaluation</p>
                </td>
              </tr>
              <tr>
                <td style="padding:40px;">
                  <h2 style="color:#1f2937;font-size:22px;margin:0 0 16px;">Hi ${name}, verify your email</h2>
                  <p style="color:#6b7280;font-size:15px;line-height:1.6;margin:0 0 24px;">
                    Thanks for signing up! Please verify your email address to activate your account and start using GetAhead AI.
                  </p>
                  <table cellpadding="0" cellspacing="0" width="100%">
                    <tr><td align="center" style="padding:8px 0 32px;">
                      <a href="${verifyUrl}" style="background:linear-gradient(135deg,#2563eb,#14b8a6);color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:600;font-size:15px;display:inline-block;">
                        Verify Email Address
                      </a>
                    </td></tr>
                  </table>
                  <p style="color:#9ca3af;font-size:13px;margin:0 0 8px;">If the button doesn't work, copy and paste this link:</p>
                  <p style="color:#2563eb;font-size:13px;word-break:break-all;margin:0 0 24px;">${verifyUrl}</p>
                  <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
                  <p style="color:#9ca3af;font-size:12px;margin:0;">This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.</p>
                </td>
              </tr>
              <tr>
                <td style="background:#f8fafc;padding:20px;text-align:center;">
                  <p style="color:#9ca3af;font-size:12px;margin:0;">© 2026 GetAhead AI. All rights reserved.</p>
                </td>
              </tr>
            </table>
          </td></tr>
        </table>
      </body>
      </html>
    `,
  });
}

export async function sendPasswordResetEmail(email: string, name: string, token: string) {
  const resetUrl = `${APP_URL}/reset-password?token=${token}`;

  return resend.emails.send({
    from: `${APP_NAME} <${FROM_EMAIL}>`,
    to: email,
    subject: "Reset your password — GetAhead AI",
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
      <body style="margin:0;padding:0;background:#f8fafc;font-family:'Inter',sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 20px;">
          <tr><td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
              <tr>
                <td style="background:linear-gradient(135deg,#2563eb,#14b8a6);padding:40px;text-align:center;">
                  <h1 style="color:#fff;margin:0;font-size:28px;font-weight:700;">GetAhead AI</h1>
                  <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:14px;">AI-Powered Exam Evaluation</p>
                </td>
              </tr>
              <tr>
                <td style="padding:40px;">
                  <h2 style="color:#1f2937;font-size:22px;margin:0 0 16px;">Reset your password, ${name}</h2>
                  <p style="color:#6b7280;font-size:15px;line-height:1.6;margin:0 0 24px;">
                    We received a request to reset your password. Click the button below to create a new password.
                  </p>
                  <table cellpadding="0" cellspacing="0" width="100%">
                    <tr><td align="center" style="padding:8px 0 32px;">
                      <a href="${resetUrl}" style="background:linear-gradient(135deg,#2563eb,#14b8a6);color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:600;font-size:15px;display:inline-block;">
                        Reset Password
                      </a>
                    </td></tr>
                  </table>
                  <p style="color:#9ca3af;font-size:13px;margin:0 0 8px;">If the button doesn't work, copy and paste this link:</p>
                  <p style="color:#2563eb;font-size:13px;word-break:break-all;margin:0 0 24px;">${resetUrl}</p>
                  <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
                  <p style="color:#9ca3af;font-size:12px;margin:0;">This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email — your password won't change.</p>
                </td>
              </tr>
              <tr>
                <td style="background:#f8fafc;padding:20px;text-align:center;">
                  <p style="color:#9ca3af;font-size:12px;margin:0;">© 2026 GetAhead AI. All rights reserved.</p>
                </td>
              </tr>
            </table>
          </td></tr>
        </table>
      </body>
      </html>
    `,
  });
}
