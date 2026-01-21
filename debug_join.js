const { createClient } = require('@supabase/supabase-js');
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
        const urlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=["']?([^"'\n]+)["']?/);
        const keyMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=["']?([^"'\n]+)["']?/);

        if (!urlMatch || !keyMatch) {
            console.error("Credentials not found");
            return;
        }

        let supabaseUrl = urlMatch[1].trim();
        let supabaseKey = keyMatch[1].trim();
        if (!supabaseUrl.startsWith('http')) supabaseUrl = 'https://' + supabaseUrl;

        console.log("Connecting to:", supabaseUrl);
        const supabase = createClient(supabaseUrl, supabaseKey);

        console.log("Testing Community Location Query with JOIN...");

        // Use a wide lat/lng range to find at least one active venue
        // Just select top 5 active to see structure
        const { data, error } = await supabase
            .from('community_locations')
            .select(`
                id,
                name,
                business_venues (
                    booking_config,
                    status
                )
            `)
            .eq('status', 'active')
            .limit(5);

        if (error) {
            console.error("Query Error:", error);
        } else {
            console.log("Query Success. Found", data.length, "venues.");
            console.log(JSON.stringify(data, null, 2));

            const hasBizData = data.some(d => d.business_venues && (Array.isArray(d.business_venues) ? d.business_venues.length > 0 : true));
            console.log("Has Business Venue Data linked:", hasBizData);
        }

    } catch (err) {
        console.error("Script error:", err);
    }
}

run();
