import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic'; // No caching

export async function POST(request) {
    try {
        console.log("API: Handling Request. Key Exists?", !!process.env.SUPABASE_SERVICE_ROLE_KEY); // DEBUG
        const body = await request.json();
        const { venueIds } = body;

        if (!venueIds || !Array.isArray(venueIds) || venueIds.length === 0) {
            return NextResponse.json({ data: [] });
        }

        // Fetch using Admin Client (Bypasses RLS)
        const { data, error } = await supabaseAdmin
            .from('business_venues')
            .select('venue_id, booking_config, status')
            .in('venue_id', venueIds);

        if (error) {
            console.error("Supabase Admin Fetch Error:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ data });

    } catch (error) {
        console.error("API Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
