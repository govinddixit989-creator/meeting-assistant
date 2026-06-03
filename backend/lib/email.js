const fetch = require('node-fetch');

async function sendAccessCode(toEmail, code) {
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': process.env.BREVO_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sender:  { name: 'MeetAssist', email: process.env.BREVO_FROM || 'govinddixit989@gmail.com' },
      to:      [{ email: toEmail }],
      subject: 'Your MeetAssist Lifetime Access Code',
      htmlContent: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#0D1117;color:#F0F2F5;padding:32px;border-radius:12px">
          <h2 style="margin:0 0 8px;font-size:22px">Your access code is ready 🎉</h2>
          <p style="color:rgba(240,242,245,.6);margin:0 0 24px">Thanks for purchasing MeetAssist Lifetime access. Here's your unique code:</p>

          <div style="background:#111820;border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:24px;text-align:center;margin-bottom:24px">
            <div style="font-size:28px;font-weight:800;letter-spacing:.12em;color:#10B981">${code}</div>
            <div style="font-size:12px;color:rgba(240,242,245,.4);margin-top:6px">One-time use · tied to this email</div>
          </div>

          <p style="color:rgba(240,242,245,.6);margin:0 0 8px"><strong style="color:#F0F2F5">How to use:</strong></p>
          <ol style="color:rgba(240,242,245,.6);padding-left:20px;margin:0 0 24px">
            <li style="margin-bottom:6px">Go to <a href="https://meeting-assistant-blush.vercel.app" style="color:#10B981">meeting-assistant-blush.vercel.app</a></li>
            <li style="margin-bottom:6px">Click <strong style="color:#F0F2F5">"Already have a code?"</strong></li>
            <li style="margin-bottom:6px">Enter <strong style="color:#F0F2F5">this email address</strong> + the code above</li>
            <li>Download and install MeetAssist</li>
          </ol>

          <div style="background:rgba(251,191,36,.08);border:1px solid rgba(251,191,36,.2);border-radius:8px;padding:12px;font-size:12px;color:rgba(251,191,36,.8)">
            ⚠️ Keep this code private. It's tied to your email and can only be used once.
          </div>

          <p style="color:rgba(240,242,245,.3);font-size:11px;margin-top:24px">
            Questions? Reply to this email and we'll help you get set up.
          </p>
        </div>
      `,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Brevo error ${res.status}`);
  }
}

module.exports = { sendAccessCode };
