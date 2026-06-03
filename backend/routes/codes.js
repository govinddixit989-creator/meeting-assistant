const router = require('express').Router();
const supabase = require('../lib/supabase');

const DOWNLOAD_URL = 'https://github.com/govinddixit989-creator/meeting-assistant/releases/latest/download/MeetAssist.exe';

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
