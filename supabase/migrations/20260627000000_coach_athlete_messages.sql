-- Migration to support coach-athlete direct messages (SAN-115)

CREATE TABLE IF NOT EXISTS public.coach_athlete_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    athlete_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    coach_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    body TEXT NOT NULL CHECK (char_length(trim(body)) > 0),
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CHECK (athlete_id <> coach_id)
);

CREATE INDEX IF NOT EXISTS idx_coach_athlete_messages_thread
    ON public.coach_athlete_messages (athlete_id, coach_id, created_at);

CREATE INDEX IF NOT EXISTS idx_coach_athlete_messages_sender
    ON public.coach_athlete_messages (sender_id, created_at);

CREATE INDEX IF NOT EXISTS idx_coach_athlete_messages_unread
    ON public.coach_athlete_messages (athlete_id, coach_id, read_at)
    WHERE read_at IS NULL;

ALTER TABLE public.coach_athlete_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Thread participants can view messages" ON public.coach_athlete_messages
    FOR SELECT USING (
        athlete_id = auth.uid()
        OR coach_id = auth.uid()
    );

CREATE POLICY "Thread participants can send messages" ON public.coach_athlete_messages
    FOR INSERT WITH CHECK (
        sender_id = auth.uid()
        AND EXISTS (
            SELECT 1
            FROM public.profiles p
            WHERE p.id = athlete_id
              AND p.role = 'ATHLETE'
              AND p.coach_id = coach_id
              AND (
                  (auth.uid() = athlete_id)
                  OR (auth.uid() = coach_id)
              )
        )
    );

CREATE POLICY "Thread participants can mark messages read" ON public.coach_athlete_messages
    FOR UPDATE USING (
        athlete_id = auth.uid()
        OR coach_id = auth.uid()
    )
    WITH CHECK (
        athlete_id = auth.uid()
        OR coach_id = auth.uid()
    );
