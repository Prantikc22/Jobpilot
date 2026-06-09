"""Welcome and transactional emails via Resend."""
import os
import logging
import resend

logger = logging.getLogger(__name__)


def _client():
    key = os.environ.get("RESEND_API_KEY", "")
    if not key:
        raise RuntimeError("RESEND_API_KEY is not set")
    resend.api_key = key


def send_welcome_email(to_email: str, full_name: str) -> bool:
    """Send a stunning welcome email to a newly registered user. Returns True on success."""
    try:
        _client()
        first = (full_name or "").strip().split()[0] if (full_name or "").strip() else "there"

        html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Welcome to ApplyAgent</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
  * {{ margin: 0; padding: 0; box-sizing: border-box; }}
  body {{ background: #f4f4f5; font-family: 'Inter', Arial, sans-serif; -webkit-font-smoothing: antialiased; }}
</style>
</head>
<body style="background:#f4f4f5; padding: 40px 16px;">

  <!-- Outer wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px; width:100%;">

          <!-- Logo bar -->
          <tr>
            <td align="center" style="padding: 0 0 28px 0;">
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background: linear-gradient(135deg,#6366f1,#8b5cf6,#06b6d4); border-radius: 50%; width:44px; height:44px; text-align:center; vertical-align:middle;">
                    <span style="font-size:22px; line-height:44px;">✈️</span>
                  </td>
                  <td style="padding-left:10px; font-size:20px; font-weight:700; color:#09090b; letter-spacing:-0.5px;">ApplyAgent</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Hero card -->
          <tr>
            <td style="background:#ffffff; border-radius:24px; padding:48px 48px 40px; box-shadow:0 1px 3px rgba(0,0,0,0.08);">

              <!-- Headline -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="padding-bottom:8px;">
                    <div style="display:inline-block; background:linear-gradient(135deg,#ede9fe,#e0f2fe); border-radius:100px; padding:6px 16px; font-size:13px; font-weight:600; color:#6366f1; letter-spacing:0.02em;">YOUR PILOT IS READY 🚀</div>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding: 20px 0 16px;">
                    <h1 style="font-size:36px; font-weight:700; color:#09090b; letter-spacing:-1px; line-height:1.15;">Welcome aboard, {first}.</h1>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-bottom:36px;">
                    <p style="font-size:16px; color:#71717a; line-height:1.6; max-width:420px; margin:0 auto;">Your AI co-pilot is fuelled up and ready to apply to jobs <em>while you sleep</em>. Here's how to get airborne in 3 minutes.</p>
                  </td>
                </tr>
              </table>

              <!-- Steps -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:36px;">

                <!-- Step 1 -->
                <tr>
                  <td style="padding: 0 0 16px 0;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fafafa; border:1px solid #f0f0f0; border-radius:16px; padding:20px 24px;">
                      <tr>
                        <td width="40" valign="top" style="padding-right:16px;">
                          <div style="width:36px; height:36px; background:linear-gradient(135deg,#6366f1,#8b5cf6); border-radius:10px; text-align:center; line-height:36px; font-size:18px;">📋</div>
                        </td>
                        <td valign="top">
                          <p style="font-size:14px; font-weight:600; color:#09090b; margin-bottom:4px;">Step 1 — Complete onboarding</p>
                          <p style="font-size:13px; color:#71717a; line-height:1.5;">Tell us your target roles, upload your resume, and set your preferences. Takes 60 seconds.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Step 2 -->
                <tr>
                  <td style="padding: 0 0 16px 0;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fafafa; border:1px solid #f0f0f0; border-radius:16px; padding:20px 24px;">
                      <tr>
                        <td width="40" valign="top" style="padding-right:16px;">
                          <div style="width:36px; height:36px; background:linear-gradient(135deg,#06b6d4,#3b82f6); border-radius:10px; text-align:center; line-height:36px; font-size:18px;">🤖</div>
                        </td>
                        <td valign="top">
                          <p style="font-size:14px; font-weight:600; color:#09090b; margin-bottom:4px;">Step 2 — Activate Autopilot</p>
                          <p style="font-size:13px; color:#71717a; line-height:1.5;">Turn on the autopilot toggle in your dashboard. Your agent starts finding and applying to matching jobs automatically.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Step 3 -->
                <tr>
                  <td>
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fafafa; border:1px solid #f0f0f0; border-radius:16px; padding:20px 24px;">
                      <tr>
                        <td width="40" valign="top" style="padding-right:16px;">
                          <div style="width:36px; height:36px; background:linear-gradient(135deg,#10b981,#06b6d4); border-radius:10px; text-align:center; line-height:36px; font-size:18px;">📬</div>
                        </td>
                        <td valign="top">
                          <p style="font-size:14px; font-weight:600; color:#09090b; margin-bottom:4px;">Step 3 — Wait for interview calls</p>
                          <p style="font-size:13px; color:#71717a; line-height:1.5;">Your agent applies 24/7. Check your dashboard anytime to see every application it submits on your behalf.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

              </table>

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:36px;">
                <tr>
                  <td align="center">
                    <a href="https://www.getapplyagent.com/onboarding"
                       style="display:inline-block; background:#09090b; color:#ffffff; font-size:15px; font-weight:600; text-decoration:none; border-radius:100px; padding:14px 36px; letter-spacing:-0.2px;">
                      Launch my dashboard →
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Stats strip -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:linear-gradient(135deg,#faf5ff,#eff6ff); border-radius:16px; padding:24px;">
                <tr>
                  <td align="center" width="33%">
                    <p style="font-size:22px; font-weight:700; color:#6366f1; margin-bottom:4px;">500+</p>
                    <p style="font-size:12px; color:#71717a;">Jobs applied</p>
                  </td>
                  <td align="center" width="33%" style="border-left:1px solid #e4e4e7; border-right:1px solid #e4e4e7;">
                    <p style="font-size:22px; font-weight:700; color:#6366f1; margin-bottom:4px;">24/7</p>
                    <p style="font-size:12px; color:#71717a;">Always running</p>
                  </td>
                  <td align="center" width="33%">
                    <p style="font-size:22px; font-weight:700; color:#6366f1; margin-bottom:4px;">3 min</p>
                    <p style="font-size:12px; color:#71717a;">To get started</p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding: 28px 0 0 0;">
              <p style="font-size:12px; color:#a1a1aa; line-height:1.6;">
                You're receiving this because you just created an ApplyAgent account.<br />
                <a href="https://www.getapplyagent.com" style="color:#a1a1aa;">getapplyagent.com</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>"""

        resend.Emails.send({
            "from": "ApplyAgent <hello@getapplyagent.com>",
            "to": [to_email],
            "subject": f"Welcome aboard, {first} ✈️ — your pilot is ready",
            "html": html,
        })
        logger.info(f"[email] Welcome email sent to {to_email}")
        return True
    except Exception as e:
        logger.warning(f"[email] Failed to send welcome email to {to_email}: {e}")
        return False
