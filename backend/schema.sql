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

-- Lifetime access codes (admin-issued, tied to buyer email)
-- user_id is populated when the code is redeemed or when the buyer registers
CREATE TABLE public.referral_codes (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code       TEXT UNIQUE NOT NULL,
  email      TEXT NOT NULL,
  user_id    UUID REFERENCES public.users(id) ON DELETE SET NULL,
  used       BOOLEAN NOT NULL DEFAULT false,
  used_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS (backend uses service key so it bypasses these, but good practice)
ALTER TABLE public.users          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_logs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;

-- Migration: add user_id FK to existing referral_codes tables (safe to run on already-migrated tables)
ALTER TABLE public.referral_codes
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE SET NULL;
