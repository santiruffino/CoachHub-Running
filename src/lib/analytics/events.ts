import { trackEvent } from '@/lib/analytics/ga';

export function trackSignupStarted(params: { role?: string; method?: string }) {
  trackEvent('sign_up_started', {
    role: params.role || 'unknown',
    method: params.method || 'unknown',
  });
}

export function trackSignupCompleted(params: { role?: string; method?: string }) {
  trackEvent('sign_up_completed', {
    role: params.role || 'unknown',
    method: params.method || 'unknown',
  });
}

export function trackSignupFailed(params: { role?: string; method?: string; reason?: string }) {
  trackEvent('sign_up_failed', {
    role: params.role || 'unknown',
    method: params.method || 'unknown',
    reason: params.reason || 'unknown',
  });
}

export function trackInvitationCreated(params: { role: 'ATHLETE' | 'COACH' }) {
  trackEvent('invitation_created', {
    role: params.role,
  });
}

export function trackTeamInviteLinkCreated(params: {
  teamId: string;
  hasExpiry: boolean;
  hasMaxUses: boolean;
}) {
  trackEvent('team_invite_link_created', {
    team_id: params.teamId,
    has_expiry: params.hasExpiry,
    has_max_uses: params.hasMaxUses,
  });
}

export function trackTeamInviteLinkRevoked(params: { linkId: string }) {
  trackEvent('team_invite_link_revoked', {
    link_id: params.linkId,
  });
}

export function trackTeamInviteLinkRotated(params: { linkId: string }) {
  trackEvent('team_invite_link_rotated', {
    link_id: params.linkId,
  });
}

export function trackTeamInviteLinkUsed(params: { linkId: string; method: 'team_link' }) {
  trackEvent('team_invite_link_used', {
    link_id: params.linkId,
    method: params.method,
  });
}

export function trackOnboardingStarted(params: { role: string; flow: string }) {
  trackEvent('onboarding_started', {
    role: params.role,
    flow: params.flow,
  });
}

export function trackOnboardingCompleted(params: { role: string; flow: string }) {
  trackEvent('onboarding_completed', {
    role: params.role,
    flow: params.flow,
  });
}

export function trackOnboardingFailed(params: { role: string; flow: string; reason?: string }) {
  trackEvent('onboarding_failed', {
    role: params.role,
    flow: params.flow,
    reason: params.reason || 'unknown',
  });
}

export function trackLoginSuccess() {
  trackEvent('login_success');
}

export function trackAuthenticatedSession(params: { role?: string; onboardingCompleted?: boolean }) {
  trackEvent('session_authenticated', {
    role: params.role || 'unknown',
    onboarding_completed: !!params.onboardingCompleted,
  });
}

export function trackDashboardViewed(params: { role?: string; visitType: 'new' | 'returning' }) {
  trackEvent('dashboard_viewed', {
    role: params.role || 'unknown',
    visit_type: params.visitType,
  });
}
