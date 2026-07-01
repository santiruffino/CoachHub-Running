import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { reportApiError } from '@/lib/api/report-error';
import { createRequestLogger } from '@/lib/logger';

export async function POST(request: Request) {
  const { requestId, logger } = createRequestLogger('/api/auth/logout', request);
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    reportApiError(error, { route: '/api/auth/logout', method: 'POST', requestId, logger });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
