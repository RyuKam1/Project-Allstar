const { createClient } = require('@supabase/supabase-js');

// Load env vars - typically these are in .env.local, but since we are running isolated script
// we will try to read them or assume they are available. 
// For this script, we'll try to grep them from .env.local first if possible, or expect them hardcoded for test.
// ACTUALLY: We can just use the user's existing supabaseClient IF it runs in node.
// But the project is Next.js, importing might be tricky with "use client" directives or alias imports.
// EASIER: Read .env.local from disk and use regex to get keys.

const fs = require('fs');
const path = require('path');

async function run() {
    try {
        const envPath = path.join(__dirname, '.env.local');
        if (!fs.existsSync(envPath)) {
            console.error("No .env.local found!");
            return;
        }

        const envContent = fs.readFileSync(envPath, 'utf8');

        // More robust regex to handle potential quotes or whitespace
        const urlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=["']?([^"'\n]+)["']?/);
        const keyMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=["']?([^"'\n]+)["']?/);

        if (!urlMatch || !keyMatch) {
            console.error("Could not find Supabase credentials in .env.local");
            console.log("Found content length:", envContent.length);
            return;
        }

        let supabaseUrl = urlMatch[1].trim();
        let supabaseKey = keyMatch[1].trim();

        // Ensure https:// is present if missing (though typically env has it)
        if (!supabaseUrl.startsWith('http')) {
            supabaseUrl = 'https://' + supabaseUrl;
        }

        console.log("Connecting to:", supabaseUrl);
        const supabase = createClient(supabaseUrl, supabaseKey);

        console.log("Checking 'business_venues' table structure...");

        // Try to select a single row to see if it errors on column selection
        const { data, error } = await supabase
            .from('business_venues')
            .select('booking_config')
            .limit(1);

        if (error) {
            console.error("ERROR querying booking_config:", error.message);
            console.log("The column 'booking_config' likely DOES NOT EXIST or table is missing.");
        } else {
            console.log("SUCCESS: 'booking_config' column exists and is accessible.");
            console.log("Sample data:", data);
        }

    } catch (err) {
        console.error("Script error:", err);
    }
}

run();
