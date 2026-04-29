import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
);

async function main() {
  const { data, error } = await supabase.from('profiles').select('email, role, team_id');
  if (error) {
    console.log('Error profiles:', error.message);
  } else {
    console.log('profiles:', data);
  }
}
main();
