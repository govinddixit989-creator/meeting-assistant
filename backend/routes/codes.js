const router  = require('express').Router();
const supabase = require('../lib/supabase');
const { sendAccessCode } = require('../lib/email');

const DOWNLOAD_URL = 'https://github.com/govinddixit989-creator/meeting-assistant/releases/latest/download/MeetAssist.exe';

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const seg = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `LIFE-${seg()}-${seg()}`;
}

// POST /codes/send  — admin generates + emails a code to a user
// Protected by ADMIN_SECRET env var
router.post('/send', async (req, res) => {
  const { email, secret } = req.body || {};
  if (!email)  return res.status(400).json({ error: 'email required' });
  if (secret !== process.env.ADMIN_SECRET) return res.status(403).json({ error: 'Forbidden' });

  const code = generateCode();

  // Check for existing unused code for this email (avoid duplicates)
  const { data: existing } = await supabase
    .from('referral_codes')
    .select('code')
    .eq('email', email.toLowerCase())
    .eq('used', false)
    .single();

  if (existing) {
    // Resend existing unused code rather than creating a new one
    try { await sendAccessCode(email, existing.code); }
    catch(e) { return res.status(500).json({ error: 'Email failed: ' + e.message }); }
    return res.json({ ok: true, code: existing.code, note: 'Existing unused code resent' });
  }

  // Insert new code
  const { error } = await supabase
    .from('referral_codes')
    .insert({ code, email: email.toLowerCase() });

  if (error) return res.status(500).json({ error: error.message });

  // Send email
  try { await sendAccessCode(email, code); }
  catch(e) { return res.status(500).json({ error: 'Code saved but email failed: ' + e.message }); }

  res.json({ ok: true, code });
});

// POST /codes/validate  — requires both email + code
router.post('/validate', async (req, res) => {
  const code  = (req.body.code  || '').trim().toUpperCase();
  const email = (req.body.email || '').trim().toLowerCase();

  if (!code || !email) return res.status(400).json({ error: 'Email and access code are required' });

  const { data, error } = await supabase
    .from('referral_codes')
    .select('*')
    .eq('code', code)
    .single();

  if (error || !data)                              return res.status(404).json({ error: 'Invalid access code' });
  if (data.email.toLowerCase() !== email)          return res.status(403).json({ error: 'This code was issued to a different email address' });
  if (data.used)                                   return res.status(400).json({ error: 'This code has already been used' });

  // Mark as used
  await supabase
    .from('referral_codes')
    .update({ used: true, used_at: new Date().toISOString() })
    .eq('code', code);

  res.json({ valid: true, download_url: DOWNLOAD_URL });
});

module.exports = router;
