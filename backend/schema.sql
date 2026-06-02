-- Run this in your Supabase SQL editor

-- Users profile (extends auth.users)
CREATE TABLE public.users (
  id       UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email    TEXT NOT NULL,
  credits  INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Usage logs
CREATE TABLE public.usage_logs (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  type         TEXT NOT NULL,   -- 'ask' | 'vision'
  credits_used INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Stripe payment sessions
CREATE TABLE public.stripe_sessions (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  session_id TEXT UNIQUE NOT NULL,
  amount     INTEGER,
  credits    INTEGER NOT NULL,
  plan       TEXT NOT NULL,
  status     TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS (backend uses service key so it bypasses these, but good practice)
ALTER TABLE public.users         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_logs    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_sessions ENABLE ROW LEVEL SECURITY;
