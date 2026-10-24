-- ===========================================================================
-- 003 - Firebase Cloud Messaging tokens
-- Run this file in the Supabase SQL editor (Dashboard > SQL Editor > New query)
-- ===========================================================================

-- Legacy single-token columns (kept so the app works even without the new table)
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS fcm_token TEXT;
ALTER TABLE public.admins  ADD COLUMN IF NOT EXISTS fcm_token TEXT;

-- One row per device/browser so a doctor can receive push notifications on
-- the web app AND on the phone at the same time.
CREATE TABLE IF NOT EXISTS public.fcm_tokens (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL,
  role        text NOT NULL CHECK (role IN ('admin', 'doctor')),
  token       text NOT NULL UNIQUE,
  platform    text,
  user_agent  text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS fcm_tokens_user_id_idx ON public.fcm_tokens (user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fcm_tokens TO anon, authenticated;

ALTER TABLE public.fcm_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fcm_tokens_all" ON public.fcm_tokens;
CREATE POLICY "fcm_tokens_all"
  ON public.fcm_tokens
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);
