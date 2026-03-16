import { createClient } from '@supabase/supabase-js';
import { materializePresetsForChild } from './app/lib/dal/presetMutations';

const supabaseUrl = "https://bogcioohmwtmxpzsxysw.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJvZ2Npb29obXd0bXhwenN4eXN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0MTQ3MzQsImV4cCI6MjA4ODk5MDczNH0.XswTtMArl6_IshW_T0kGioUmcJrxi7tuJpVREnsaXRw";
const supabase = createClient(supabaseUrl, supabaseKey);

async function testMaterialization() {
    const childId = "7a8b9c0d-1e2f-3a4b-5c6d-7e8f9a0b1c2d";
    const { data: profile } = await supabase.from('profiles').select('id').eq('is_admin', true).limit(1).single();
    
    if (profile) {
        console.log('Testing materialization for child:', childId, 'parent:', profile.id);
        await materializePresetsForChild(childId, profile.id);
        await materializePresetsForChild(childId, profile.id);
    }
}

async function inspectTasks() {
    await testMaterialization();
    
    const { data: tasks, error } = await supabase
        .from('tasks')
        .select('id, title, due_date, preset_id, created_at, is_active')
        .order('created_at', { ascending: false })
        .limit(20);

    if (error) {
        console.error('Error fetching tasks:', error);
        return;
    }

    console.log('Recent Tasks:');
    console.log(JSON.stringify(tasks, null, 2));
    
    const seen = new Set();
    let duplicatesFound = false;
    for (const t of tasks || []) {
        if (t.preset_id && t.due_date) {
            const key = `${t.preset_id}-${t.due_date}`;
            if (seen.has(key)) {
                console.log('Duplicate detected:', key);
                duplicatesFound = true;
            }
            seen.add(key);
        }
    }
    
    if (duplicatesFound) {
        console.log('VERIFICATION FAILURE: Duplicate tasks found for same preset/day');
    } else {
        console.log('VERIFICATION SUCCESS: No duplicate tasks found');
    }
}

inspectTasks();
