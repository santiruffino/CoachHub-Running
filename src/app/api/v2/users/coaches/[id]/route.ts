import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/supabase/api-helpers';

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireRole('ADMIN');
  if (authResult.response) return authResult.response;

  const { id: targetCoachId } = await params;
  const adminId = authResult.user.id;
  const supabase = authResult.supabase;

  try {
    // 1. Reassign athletes to the ADMIN running team coach (which is adminId in this case)
    const { error: reassignError } = await supabase
      .from('profiles')
      .update({ coach_id: adminId })
      .eq('coach_id', targetCoachId)
      .eq('role', 'ATHLETE');

    if (reassignError) {
      console.error('Reassign athletes error:', reassignError);
      throw reassignError;
    }

    // 2. Delete the coach profile
    const { error: deleteError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', targetCoachId)
      .eq('role', 'COACH');

    if (deleteError) {
      console.error('Delete coach error:', deleteError);
      throw deleteError;
    }

    return NextResponse.json({ message: 'Coach deleted and athletes reassigned successfully' });
  } catch (error: any) {
    console.error('DELETE coach process error:', error.message);
    return NextResponse.json({ error: 'Failed to delete coach and reassign athletes' }, { status: 500 });
  }
}
