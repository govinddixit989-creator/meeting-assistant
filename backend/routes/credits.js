const router = require('express').Router();
const requireAuth = require('../middleware/auth');
const supabase = require('../lib/supabase');

// GET /user/credits — returns balance and email
router.get('/credits', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('users')
    .select('email, credits')
    .eq('id', req.user.id)
    .single();

  // Row genuinely missing (PGRST116 = "no rows") — create it
  if (error?.code === 'PGRST116') {
    const { data: inserted, error: insErr } = await supabase
      .from('users')
      .insert({ id: req.user.id, email: req.user.email, credits: 0 })
      .select('email, credits')
      .single();
    if (insErr) return res.status(500).json({ error: insErr.message });
    return res.json(inserted);
  }

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

module.exports = router;
