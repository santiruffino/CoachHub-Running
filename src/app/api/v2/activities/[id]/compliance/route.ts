import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/api-helpers';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
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
    } catch (error: any) {
        console.error('Get activity compliance error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
