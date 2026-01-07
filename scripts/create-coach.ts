#!/usr/bin/env npx tsx

/**
 * Create Coach User Script
 * 
 * This script creates a new coach user in Supabase.
 * Run with: npx tsx scripts/create-coach.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as readline from 'readline';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

function question(query: string): Promise<string> {
    return new Promise((resolve) => {
        rl.question(query, resolve);
    });
}

async function main() {
    console.log('\n🚀 Coach Hub - Create Coach User\n');

    // Get Supabase credentials
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

    if (!supabaseUrl || !supabaseSecretKey) {
        console.error('❌ Error: Missing Supabase credentials');
        console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY are set in .env.local');
        process.exit(1);
    }

    // Create Supabase admin client
    const supabase = createClient(supabaseUrl, supabaseSecretKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });

    // Get user input
    const email = await question('Coach email: ');
    const password = await question('Password (min 6 characters): ');
    const name = await question('Full name: ');

    rl.close();

    console.log('\n⏳ Creating coach user...\n');

    try {
        // Create user in Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true, // Auto-confirm email
        });

        if (authError || !authData.user) {
            throw new Error(`Failed to create user: ${authError?.message}`);
        }

        console.log('✅ User created in Supabase Auth');

        // Update profile to COACH role
        const { error: profileError } = await supabase
            .from('profiles')
            .update({
                name,
                role: 'COACH',
                must_change_password: false,
            })
            .eq('id', authData.user.id);

        if (profileError) {
            throw new Error(`Failed to update profile: ${profileError.message}`);
        }

        console.log('✅ Profile updated to COACH role');

        // Create coach profile
        const { error: coachError } = await supabase
            .from('coach_profiles')
            .insert({
                id: authData.user.id,
            });

        if (coachError) {
            // Coach profile might already exist from trigger
            if (!coachError.message.includes('duplicate')) {
                console.warn('⚠️  Warning: Could not create coach profile:', coachError.message);
            }
        } else {
            console.log('✅ Coach profile created');
        }

        console.log('\n🎉 Success! Coach user created:\n');
        console.log(`   Email: ${email}`);
        console.log(`   Name: ${name}`);
        console.log(`   Role: COACH`);
        console.log(`\n   You can now login at http://localhost:3001/login\n`);

    } catch (error: any) {
        console.error('\n❌ Error:', error.message);
        process.exit(1);
    }
}

main();
