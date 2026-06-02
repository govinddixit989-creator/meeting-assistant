require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();

// Stripe webhook needs raw body — must be before express.json()
app.use('/stripe/webhook', express.raw({ type: 'application/json' }));

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));

app.use('/auth',   require('./routes/auth'));
app.use('/ai',     require('./routes/ai'));
app.use('/user',   require('./routes/credits'));
app.use('/stripe', require('./routes/stripe'));

app.get('/health', (_, res) => res.json({ ok: true, ts: Date.now() }));

app.use((err, req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`MeetAssist backend on :${PORT}`));
