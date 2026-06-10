import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const TO_EMAIL = "eyalatiyawork@gmail.com";
const PLACEHOLDER = "re_YOUR_API_KEY_HERE";

const roleLabel: Record<string, string> = {
  tenant:   "שוכר / קונה",
  landlord: "בעל דירה / מוכר",
  agent:    "מתווך",
};

function hasRealKey() {
  const key = process.env.RESEND_API_KEY;
  return key && key !== PLACEHOLDER && key.startsWith("re_");
}

export async function POST(req: NextRequest) {
  try {
    const { name, email, phone, role, source } = await req.json();

    if (!name || !email) {
      return NextResponse.json({ error: "name and email required" }, { status: 400 });
    }

    // Dev mode — no real API key
    if (!hasRealKey()) {
      console.log("📧 [DEV] ליד חדש מ-Rently:");
      console.log(`   שם: ${name}`);
      console.log(`   מייל: ${email}`);
      console.log(`   טלפון: ${phone || "—"}`);
      console.log(`   סוג: ${roleLabel[role] || role}`);
      console.log(`   מקור: ${source}`);
      return NextResponse.json({ ok: true, dev: true });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    const html = `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="UTF-8" /></head>
<body style="font-family:sans-serif;background:#f8f9fa;padding:32px;direction:rtl">
  <div style="max-width:520px;margin:0 auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">

    <div style="background:linear-gradient(135deg,#17BDB0,#0F8A80);padding:24px 28px">
      <h1 style="color:white;margin:0;font-size:20px">&#127968; ליד חדש מ-Rently</h1>
      <p style="color:rgba(255,255,255,0.8);margin:6px 0 0;font-size:14px">טופס: ${source || "כללי"}</p>
    </div>

    <div style="padding:28px">
      <table style="width:100%;border-collapse:collapse">
        <tr><td style="padding:10px 0;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:13px">שם</td>
            <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-weight:700;color:#1A2B4A">${name}</td></tr>
        <tr><td style="padding:10px 0;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:13px">מייל</td>
            <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-weight:700;color:#1A2B4A">
              <a href="mailto:${email}" style="color:#17BDB0">${email}</a></td></tr>
        <tr><td style="padding:10px 0;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:13px">טלפון</td>
            <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-weight:700;color:#1A2B4A">
              ${phone ? `<a href="tel:${phone}" style="color:#17BDB0">${phone}</a>` : "—"}</td></tr>
        <tr><td style="padding:10px 0;color:#64748b;font-size:13px">סוג משתמש</td>
            <td style="padding:10px 0;font-weight:700;color:#1A2B4A">
              <span style="background:${role === "landlord" ? "#EEF2FF" : role === "agent" ? "#FFE8EA" : "#E0F7F5"};color:${role === "landlord" ? "#6366F1" : role === "agent" ? "#FF6B7A" : "#17BDB0"};padding:3px 10px;border-radius:99px;font-size:12px">
                ${roleLabel[role] || role || "—"}
              </span></td></tr>
      </table>
    </div>

    <div style="background:#F8FBFF;padding:16px 28px;border-top:1px solid #f1f5f9;font-size:12px;color:#94a3b8;text-align:center">
      נשלח אוטומטית מאתר Rently &#8226; ${new Date().toLocaleString("he-IL")}
    </div>
  </div>
</body>
</html>`;

    const { data, error } = await resend.emails.send({
      from: "Rently Leads <onboarding@resend.dev>",
      to: [TO_EMAIL],
      subject: `&#127968; ליד חדש: ${name} — ${roleLabel[role] || role || "כללי"}`,
      html,
      replyTo: email,
    });

    if (error) {
      console.error("Resend error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log("✅ Email sent:", data?.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("contact route error:", err);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
