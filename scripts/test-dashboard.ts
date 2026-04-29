import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
);

async function main() {
  const { data: admin } = await supabase.from('profiles').select('id, team_id, role').eq('email', 'admin@example.com').single();
  console.log("Admin:", admin);

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, team_id')
    .eq('id', admin!.id)
    .single();

  console.log("Profile:", profile);

  const { count: athletesCount, error: athletesError } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'ATHLETE');
    
  console.log("Athletes count:", athletesCount, athletesError);
}
main();
