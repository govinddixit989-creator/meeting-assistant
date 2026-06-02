const router = require('express').Router();
const requireAuth = require('../middleware/auth');
const supabase = require('../lib/supabase');
const Stripe = require('stripe');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Credit amounts per plan  (1 credit = 1 AI text query, ~3 min of active use)
const PLANS = {
  starter:  { priceId: process.env.STRIPE_PRICE_STARTER,  credits: 40,  label: 'Starter – 2 hrs',  amount: 500  },
  standard: { priceId: process.env.STRIPE_PRICE_STANDARD, credits: 160, label: 'Standard – 8 hrs', amount: 1500 },
  pro:      { priceId: process.env.STRIPE_PRICE_PRO,      credits: 400, label: 'Pro – 20 hrs',      amount: 3000 },
};

// POST /stripe/checkout  — create Stripe Checkout session
router.post('/checkout', requireAuth, async (req, res) => {
  const { plan } = req.body || {};
  const p = PLANS[plan];
  if (!p) return res.status(400).json({ error: 'Invalid plan. Choose: starter, standard, pro' });

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price: p.priceId, quantity: 1 }],
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL}?payment=success`,
      cancel_url:  `${process.env.FRONTEND_URL}?payment=cancelled`,
      client_reference_id: req.user.id,
      metadata: { user_id: req.user.id, plan, credits: String(p.credits) },
    });

    await supabase.from('stripe_sessions').insert({
      user_id: req.user.id,
      session_id: session.id,
      amount: p.amount,
      credits: p.credits,
      plan,
      status: 'pending',
    });

    res.json({ url: session.url });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /stripe/webhook  — called by Stripe on payment completion
router.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch(e) {
    console.error('Webhook signature failed:', e.message);
    return res.status(400).json({ error: e.message });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const userId  = session.metadata?.user_id;
    const credits = parseInt(session.metadata?.credits || '0', 10);

    if (userId && credits > 0) {
      const { data: user } = await supabase
        .from('users').select('credits').eq('id', userId).single();

      await supabase
        .from('users')
        .update({ credits: (user?.credits || 0) + credits })
        .eq('id', userId);

      await supabase
        .from('stripe_sessions')
        .update({ status: 'completed' })
        .eq('session_id', session.id);

      console.log(`Added ${credits} credits to user ${userId}`);
    }
  }

  res.json({ received: true });
});

module.exports = router;
