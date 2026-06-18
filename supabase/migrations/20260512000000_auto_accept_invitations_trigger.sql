-- =============================================
-- Migration: Auto-Accept Invitations on User Signup
-- 
-- Improves the experience for "Login Only with Email"
-- by automatically linking new users to their invited
-- teams and coaches as soon as they sign up (even via Magic Link).
-- =============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  invitation_record RECORD;
  final_role user_role := 'ATHLETE';
  final_team_id UUID := NULL;
  final_coach_id UUID := NULL;
BEGIN
  -- 1. Check if there is a pending invitation for this email
  SELECT * INTO invitation_record 
  FROM public.invitations 
  WHERE email = NEW.email 
    AND accepted = false 
    AND expires_at > now()
  LIMIT 1;

  -- 2. If invitation found, use its data and mark as accepted
  IF invitation_record IS NOT NULL THEN
    final_role := invitation_record.role;
    final_team_id := invitation_record.team_id;
    final_coach_id := invitation_record.coach_id;

    UPDATE public.invitations 
    SET accepted = true 
    WHERE id = invitation_record.id;
  END IF;

  -- 3. Insert into public.profiles
  INSERT INTO public.profiles (
    id, 
    email, 
    role, 
    team_id, 
    coach_id, 
    is_onboarding_completed
  )
  VALUES (
    NEW.id, 
    NEW.email, 
    final_role, 
    final_team_id, 
    final_coach_id, 
    false
  );

  -- 4. Create role-specific profile placeholder
  IF final_role = 'COACH' THEN
    INSERT INTO public.coach_profiles (id) VALUES (NEW.id);
  ELSE
    INSERT INTO public.athlete_profiles (user_id) VALUES (NEW.id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
