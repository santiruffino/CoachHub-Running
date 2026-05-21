import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { TrainingsList } from '@/features/trainings/components/TrainingsList';

export const dynamic = 'force-dynamic';

export default async function TrainingsPage() {
    const supabase = await createClient();

    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        redirect('/login');
    }

    // Get all template trainings for this coach or team
    const { data: trainings, error } = await supabase
        .from('trainings')
        .select('*')
        .eq('is_template', true)
        .order('created_at', { ascending: false });

    if (error) {
        return (
            <div className="p-8 text-center text-muted-foreground">
                Failed to load trainings. Please try again later.
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <TrainingsList initialTrainings={trainings || []} />
        </div>
    );
}
