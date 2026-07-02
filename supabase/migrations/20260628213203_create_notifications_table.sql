CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  link text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user_unread_created
  ON public.notifications (user_id, is_read, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
  ON public.notifications
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can mark their own notifications read"
  ON public.notifications
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

COMMENT ON TABLE public.notifications IS 'Per-user in-app notification center entries. Inserted via service role only (no client-side INSERT policy); read/update is scoped to the owning user.';
COMMENT ON COLUMN public.notifications.type IS 'Producer-defined category, e.g. chat_message, workout_assigned, race_reminder. Used for grouping/icons in the UI.';
COMMENT ON COLUMN public.notifications.link IS 'Optional deep link (relative app path) to navigate to when the notification is clicked.';

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
