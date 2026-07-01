import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/api-helpers';
import { apiError } from '@/lib/api/error-response';
import { reportApiError } from '@/lib/api/report-error';
import { createRequestLogger } from '@/lib/logger';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { requestId, logger } = createRequestLogger('/api/v2/activities/[id]/compliance', req);
    const { id } = await params;
    
    // Use requireRole to ensure authorized access (Athletes or Coaches)
    const { supabase, response } = await requireRole(['ATHLETE', 'COACH', 'ADMIN']);
    if (response) return response;

    try {
        const { data, error } = await supabase
            .from('activity_compliance')
            .select('*')
            .eq('activity_id', id)
            .maybeSingle();

        if (error) throw error;

        return NextResponse.json(data);
    } catch (error: unknown) {
        reportApiError(error, { route: '/api/v2/activities/[id]/compliance', method: 'GET', requestId, logger });
        return NextResponse.json(apiError('INTERNAL_SERVER_ERROR'),
            { status: 500 }
        );
    }
}
