import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { WorkoutBuilderView } from '@/features/trainings/components/builder/WorkoutBuilderView';

export const dynamic = 'force-dynamic';

export default async function WorkoutBuilderPage({ 
    searchParams 
}: { 
    searchParams: Promise<{ [key: string]: string | string[] | undefined }> 
}) {
    const resolvedParams = await searchParams;
    const athleteId = typeof resolvedParams.athleteId === 'string' ? resolvedParams.athleteId : null;
    const workoutId = typeof resolvedParams.id === 'string' ? resolvedParams.id : null;

    const supabase = await createClient();

    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        redirect('/login');
    }

    // Check if user is coach or admin
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (!profile || (profile.role !== 'COACH' && profile.role !== 'ADMIN')) {
        redirect('/dashboard');
    }

    let initialWorkout = null;
    if (workoutId) {
        const { data: workout, error } = await supabase
            .from('trainings')
            .select('*')
            .eq('id', workoutId)
            .single();
        
        if (!error && workout) {
            initialWorkout = workout;
        }
    }

    return (
        <WorkoutBuilderView 
            initialWorkout={initialWorkout as any} 
            athleteId={athleteId} 
        />
    );
}
