const router = require('express').Router();
const supabase = require('../lib/supabase');

// Register new user
router.post('/register', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

  // Create user via admin API (auto-confirms email)
  const { data: created, error: createErr } = await supabase.auth.admin.createUser({
    email, password, email_confirm: true,
  });
  if (createErr) return res.status(400).json({ error: createErr.message });

  // Insert profile row with 0 credits
  const { error: insertErr } = await supabase.from('users').insert({ id: created.user.id, email, credits: 0 });
  if (insertErr) {
    console.error('users insert failed:', insertErr.message);
    return res.status(500).json({ error: 'Account created but profile setup failed: ' + insertErr.message + '. Have you run schema.sql in Supabase?' });
  }

  // Sign in immediately to return a session
  const { data: session, error: signErr } = await supabase.auth.signInWithPassword({ email, password });
  if (signErr) return res.status(500).json({ error: signErr.message });

  res.json({
    token: session.session.access_token,
    refresh_token: session.session.refresh_token,
    user: { id: created.user.id, email },
  });
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return res.status(401).json({ error: 'Invalid email or password' });

  res.json({
    token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    user: { id: data.user.id, email: data.user.email },
  });
});

// Refresh access token
router.post('/refresh', async (req, res) => {
  const { refresh_token } = req.body || {};
  if (!refresh_token) return res.status(400).json({ error: 'refresh_token required' });

  const { data, error } = await supabase.auth.refreshSession({ refresh_token });
  if (error) return res.status(401).json({ error: error.message });

  res.json({
    token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  });
});

module.exports = router;
