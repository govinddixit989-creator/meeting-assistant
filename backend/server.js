require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));

app.get('/', (_, res) => res.json({ name: 'MeetAssist API', status: 'ok' }));
app.get('/health', (_, res) => res.json({ ok: true, ts: Date.now() }));

app.use('/auth',   require('./routes/auth'));
app.use('/ai',     require('./routes/ai'));
app.use('/user',   require('./routes/credits'));
app.use('/codes',  require('./routes/codes'));

app.use((err, req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// Local dev only — Vercel handles the server in production
if (process.env.VERCEL !== '1') {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => console.log(`MeetAssist backend on :${PORT}`));
}

module.exports = app;
