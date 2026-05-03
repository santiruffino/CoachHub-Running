#!/usr/bin/env npx tsx

/**
 * Create Admin User Script
 * 
 * This script creates a new admin user in Supabase.
 * Admin users are considered "Super Coaches" and require a team_id to manage their club.
 * Run with: npx tsx scripts/create-admin.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as readline from 'readline';
import * as dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

function question(query: string): Promise<string> {
    return new Promise((resolve) => {
        rl.question(query, resolve);
    });
}

type ProfilePayload = {
    name: string;
    role: 'ADMIN';
    must_change_password: boolean;
    team_id?: string;
};

async function main() {
    console.log('\n🚀 Coach Hub - Create Admin User\n');

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

    // Fetch existing teams
    const { data: existingTeams, error: teamsError } = await supabase
        .from('running_teams')
        .select('id, name')
        .order('name');

    if (teamsError) {
        console.error('❌ Failed to fetch running teams:', teamsError.message);
        process.exit(1);
    }

    // Get user input
    const email = await question('Admin email: ');
    const password = await question('Password (min 6 characters): ');
    const name = await question('Full name: ');

    let selectedTeamId: string | null = null;
    let newTeamName: string | null = null;

    if (existingTeams && existingTeams.length > 0) {
        console.log('\nSelect a Running Team for this Admin:');
        console.log('0. Create a new Running Team');
        existingTeams.forEach((team, index) => {
            console.log(`${index + 1}. ${team.name} (${team.id})`);
        });

        let validSelection = false;
        while (!validSelection) {
            const selection = await question('\nEnter the number of your choice: ');
            const num = parseInt(selection, 10);
            
            if (num === 0) {
                validSelection = true;
                newTeamName = await question('Enter the name for the NEW Running Team: ');
            } else if (!isNaN(num) && num > 0 && num <= existingTeams.length) {
                validSelection = true;
                selectedTeamId = existingTeams[num - 1].id;
            } else {
                console.log('Invalid selection. Please try again.');
            }
        }
    } else {
        console.log('\nNo existing Running Teams found. A new one will be created.');
        newTeamName = await question('Enter the name for the NEW Running Team: ');
    }

    rl.close();

    console.log('\n⏳ Creating admin user...\n');

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

        // Create new team if requested
        if (newTeamName) {
            const { data: newTeam, error: newTeamError } = await supabase
                .from('running_teams')
                .insert({
                    name: newTeamName,
                    owner_id: authData.user.id
                })
                .select()
                .single();
            
            if (newTeamError) {
                throw new Error(`Failed to create new team: ${newTeamError.message}`);
            }
            
            selectedTeamId = newTeam.id;
            console.log(`✅ Created new Running Team: ${newTeam.name}`);
        }

        // Update profile to ADMIN role and assign team_id
        const profilePayload: ProfilePayload = {
            name,
            role: 'ADMIN',
            must_change_password: false,
        };

        if (selectedTeamId) {
            profilePayload.team_id = selectedTeamId;
        }

        const { error: profileError } = await supabase
            .from('profiles')
            .update(profilePayload)
            .eq('id', authData.user.id);

        if (profileError) {
            throw new Error(`Failed to update profile: ${profileError.message}`);
        }

        console.log(`✅ Profile updated to ADMIN role${selectedTeamId ? ` and assigned to team: ${selectedTeamId}` : ''}`);

        // Create coach profile (Admins act as super coaches)
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
            console.log('✅ Coach profile created (Admins require this)');
        }

        console.log('\n🎉 Success! Admin user created:\n');
        console.log(`   Email: ${email}`);
        console.log(`   Name: ${name}`);
        console.log(`   Role: ADMIN`);
        if (selectedTeamId) console.log(`   Team ID: ${selectedTeamId}`);
        console.log(`\n   You can now login at http://localhost:3000/login\n`);

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('\n❌ Error:', message);
        process.exit(1);
    }
}

main();
