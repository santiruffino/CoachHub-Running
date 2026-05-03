import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function main() {
  console.log("Starting anon login...");
  try {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: 'admin@coachhub.com', // wait, is this the email? I'll use the one I created if I knew it.
        password: 'temporary_password'
    });
    
    if (authError || !authData.user) {
        console.log("Login failed");
        return;
    }

    console.log("Logged in!", authData.user.id);
    console.log("Fetching profile...");
    
    // FETCH PROFILE
    const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', authData.user.id)
            .single();

    console.log("Profile error:", profileError);
    console.log("Profile data:", profile);

  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    console.log("Catch error:", message);
  }
}
main();
