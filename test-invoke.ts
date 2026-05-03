import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
);

async function test() {
  console.log('Invoking function...');
  const { data, error } = await supabase.functions.invoke('process-strava-activity', {
    body: { test: true },
  });
  console.log('Data:', data);
  console.log('Error:', error);
}

test();
