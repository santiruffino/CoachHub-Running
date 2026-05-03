import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
);

async function main() {
  console.log("Starting login...");
  try {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: 'admin@example.com',
        password: 'temporary_password', // Guessing it's not this, but let's see what happens
    });
    
    if (authError) {
        console.log("Auth error:", authError.message);
        return;
    }
    
    console.log("Login success:", authData.user.id);
    
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .single();
        
    if (profileError) {
        console.log("Profile error:", profileError.message);
        return;
    }
    
    console.log("Profile:", profile);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    console.log("Login error:", message);
  }
}
main();
