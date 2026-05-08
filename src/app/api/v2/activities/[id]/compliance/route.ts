import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/api-helpers';
import { appLogger } from '@/lib/app-logger';
import { apiError } from '@/lib/api/error-response';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    void req;
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
        appLogger.error('Get activity compliance error:', error);
        return NextResponse.json(apiError('INTERNAL_SERVER_ERROR', 'Internal server error'),
            { status: 500 }
        );
    }
}
