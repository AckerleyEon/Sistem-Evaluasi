import nodemailer from "nodemailer";
import path from "path";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export async function kirimEmailOtpResetSandi(tujuan: string, kodeOtp: string) {
  const html = `
  <div style="background:#F3F4F6;padding:40px 16px;font-family:-apple-system,Segoe UI,Roboto,sans-serif;">
    <table role="presentation" width="100%" style="max-width:420px;margin:0 auto;">
      <tr>
        <td style="padding-bottom:24px;">
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr>
              <td width="44" style="padding-right:10px;" valign="middle">
                <table role="presentation" cellpadding="0" cellspacing="0" width="44" height="44" style="background:#fff;border-radius:12px;border:1px solid #E6EAF2;">
                  <tr>
                    <td align="center" valign="middle">
                      <img src="cid:logo-ee" alt="Logo" width="32" height="32" style="display:block;width:32px;height:32px;" />
                    </td>
                  </tr>
                </table>
              </td>
              <td valign="middle">
                <div style="font-weight:700;color:#1D2B3A;font-size:15px;line-height:19px;">Teknik Elektro</div>
                <div style="color:#64748B;font-size:12px;line-height:16px;">Sistem Evaluasi CPL</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="background:#fff;border:1px solid #E6EAF2;border-radius:24px;padding:32px;">
          <p style="margin:0 0 4px;font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#2F6BEA;">
            Reset Kata Sandi
          </p>
          <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#1D2B3A;">Kode verifikasi Anda</h1>
          <p style="margin:0 0 24px;font-size:14px;line-height:22px;color:#64748B;">
            Gunakan kode berikut untuk mengatur ulang kata sandi akun Administrator Anda. Kode berlaku
            selama <strong>10 menit</strong>.
          </p>
          <div style="background:#EEF3FB;border-radius:14px;padding:20px;text-align:center;margin-bottom:24px;">
            <span style="font-family:'Courier New',monospace;font-size:34px;font-weight:700;letter-spacing:10px;color:#2F6BEA;">
              ${kodeOtp}
            </span>
          </div>
          <p style="margin:0;font-size:13px;line-height:20px;color:#94A3B8;">
            Jika Anda tidak meminta reset kata sandi, abaikan email ini — akun Anda tetap aman dan kode ini
            akan kedaluwarsa dengan sendirinya.
          </p>
        </td>
      </tr>
      <tr>
        <td style="text-align:center;padding-top:20px;">
          <p style="margin:0;font-size:12px;color:#94A3B8;">
            &copy; 2026 Program Studi Teknik Elektro &bull; Universitas Trunojoyo Madura
          </p>
        </td>
      </tr>
    </table>
  </div>`;

  const info = await transporter.sendMail({
    from: `"Sistem Evaluasi CPL" <${process.env.GMAIL_USER}>`,
    to: tujuan,
    subject: `${kodeOtp} — Kode Reset Kata Sandi Anda`,
    html,
    attachments: [
      {
        filename: "logo-ee.png",
        path: path.join(process.cwd(), "public", "logo-ee.png"),
        cid: "logo-ee",
      },
    ],
  });

  console.log("Email OTP terkirim:", info.messageId, info.response);
}