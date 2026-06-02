const router = require('express').Router();
const requireAuth = require('../middleware/auth');
const supabase = require('../lib/supabase');
const fetch = require('node-fetch');
const FormData = require('form-data');
const multer = require('multer');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });
const GROQ_KEY = process.env.GROQ_API_KEY;

// Credit costs per call
const COST = { ask: 1, vision: 2 };

async function deductCredits(userId, type) {
  const cost = COST[type] || 0;
  if (cost === 0) return { ok: true };

  const { data, error } = await supabase
    .from('users')
    .select('credits')
    .eq('id', userId)
    .single();

  if (error || !data) return { ok: false, error: 'User not found' };
  if (data.credits < cost) return { ok: false, error: 'Insufficient credits', credits: data.credits };

  const { error: upErr } = await supabase
    .from('users')
    .update({ credits: data.credits - cost })
    .eq('id', userId);

  if (upErr) return { ok: false, error: upErr.message };

  await supabase.from('usage_logs').insert({ user_id: userId, type, credits_used: cost });
  return { ok: true, remaining: data.credits - cost };
}

// POST /ai/ask  — streaming text response
router.post('/ask', requireAuth, async (req, res) => {
  const result = await deductCredits(req.user.id, 'ask');
  if (!result.ok) {
    return res.status(402).json({ error: result.error, credits: result.credits ?? 0 });
  }

  const { messages, max_tokens = 400, temperature = 0.65 } = req.body;

  const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_KEY}` },
    body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages, max_tokens, temperature, stream: true }),
  }).catch(e => { throw new Error('Groq unreachable: ' + e.message); });

  if (!groqRes.ok) {
    const err = await groqRes.json().catch(() => ({}));
    return res.status(502).json({ error: err.error?.message || 'Groq error ' + groqRes.status });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('X-Credits-Remaining', result.remaining ?? 0);
  groqRes.body.pipe(res);
});

// POST /ai/vision  — screenshot + transcript analysis
router.post('/vision', requireAuth, async (req, res) => {
  const result = await deductCredits(req.user.id, 'vision');
  if (!result.ok) {
    return res.status(402).json({ error: result.error, credits: result.credits ?? 0 });
  }

  const { messages, max_tokens = 500, temperature = 0.65 } = req.body;

  const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_KEY}` },
    body: JSON.stringify({ model: 'meta-llama/llama-4-scout-17b-16e-instruct', messages, max_tokens, temperature }),
  }).catch(e => { throw new Error('Groq unreachable: ' + e.message); });

  if (!groqRes.ok) {
    const err = await groqRes.json().catch(() => ({}));
    return res.status(502).json({ error: err.error?.message || 'Groq error ' + groqRes.status });
  }

  const data = await groqRes.json();
  res.set('X-Credits-Remaining', result.remaining ?? 0);
  res.json(data);
});

// POST /ai/transcribe  — Whisper proxy (free, no credit deduction)
router.post('/transcribe', requireAuth, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No audio file provided' });

  const form = new FormData();
  form.append('file', req.file.buffer, { filename: 'audio.webm', contentType: req.file.mimetype });
  form.append('model', req.body.model || 'whisper-large-v3-turbo');
  form.append('response_format', req.body.response_format || 'json');
  if (req.body.language) form.append('language', req.body.language);

  const groqRes = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${GROQ_KEY}`, ...form.getHeaders() },
    body: form,
  }).catch(e => { throw new Error('Groq unreachable: ' + e.message); });

  if (!groqRes.ok) {
    const err = await groqRes.json().catch(() => ({}));
    return res.status(502).json({ error: err.error?.message || 'Whisper error' });
  }

  const data = await groqRes.json();
  res.json(data);
});

module.exports = router;
