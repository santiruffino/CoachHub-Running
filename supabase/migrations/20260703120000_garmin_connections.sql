-- Garmin Connect account links (UNOFFICIAL integration — opt-in pilot).
--
-- Stores the garth-style session tokens obtained from a one-time Garmin login.
-- Tokens grant full access to the athlete's Garmin account, so oauth1_token and
-- oauth2_token are stored ENCRYPTED at the application layer (AES-256-GCM via
-- src/lib/garmin/crypto.ts) — never in plaintext. RLS mirrors strava_connections.

CREATE TABLE IF NOT EXISTS public.garmin_connections (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    garmin_user_id TEXT,
    -- Encrypted token blobs (base64 of iv:tag:ciphertext). Opaque to SQL.
    oauth1_token TEXT NOT NULL,
    oauth2_token TEXT,
    -- When the short-lived OAuth2 access token expires (unix ms handled in app).
    token_expires_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'needs_reauth')),
    -- Explicit pilot consent timestamp (see consent screen).
    consent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.garmin_connections ENABLE ROW LEVEL SECURITY;

-- Athlete manages their own connection.
CREATE POLICY "Users can read own garmin connection"
    ON public.garmin_connections FOR SELECT
    USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own garmin connection"
    ON public.garmin_connections FOR INSERT
    WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own garmin connection"
    ON public.garmin_connections FOR UPDATE
    USING ((select auth.uid()) = user_id)
    WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own garmin connection"
    ON public.garmin_connections FOR DELETE
    USING ((select auth.uid()) = user_id);

-- Coaches can read the connection status of athletes in their groups
-- (same join strava_connections uses). Tokens are encrypted regardless.
CREATE POLICY "Coaches can read athlete garmin connections"
    ON public.garmin_connections FOR SELECT
    USING (EXISTS (
        SELECT 1
        FROM public.athlete_groups ag
        JOIN public.groups g ON g.id = ag.group_id
        WHERE ag.athlete_id = garmin_connections.user_id
          AND g.coach_id = (select auth.uid())
    ));

CREATE POLICY "Admins can do everything on garmin connections"
    ON public.garmin_connections FOR ALL
    USING (is_admin((select auth.uid())));
