-- Drop function if it exists to allow updates
DROP FUNCTION IF EXISTS search_all(text, text);

-- Create a function to search multiple tables with filtering
CREATE OR REPLACE FUNCTION search_all(query text, filter_type text DEFAULT 'All')
RETURNS TABLE (
    id uuid,
    type text,
    title text,
    subtitle text,
    image text,
    url_path text
) AS $$
DECLARE
    search_query text;
BEGIN
    search_query := '%' || query || '%';

    RETURN QUERY
    -- Search Profiles
    SELECT 
        p.id, 
        'Player'::text as type, 
        p.name as title, 
        COALESCE(p.sport, 'Athlete') as subtitle, 
        p.avatar as image,
        '/profile?id=' || p.id::text as url_path
    FROM profiles p
    WHERE p.name ILIKE search_query
    AND (filter_type = 'All' OR filter_type = 'Players')

    UNION ALL

    -- Search Teams
    SELECT 
        t.id, 
        'Team'::text as type, 
        t.name as title, 
        t.sport as subtitle, 
        t.logo as image,
        '/teams/' || t.id::text as url_path
    FROM teams t
    WHERE t.name ILIKE search_query
    AND (filter_type = 'All' OR filter_type = 'Teams')

    UNION ALL

    -- Search Events
    SELECT 
        e.id, 
        'Event'::text as type, 
        e.title as title, 
        e.date || ' • ' || e.location as subtitle, 
        NULL as image,
        '/events' as url_path
    FROM events e
    WHERE e.title ILIKE search_query
    AND (filter_type = 'All' OR filter_type = 'Events')

    UNION ALL

    -- Search Tournaments
    SELECT 
        tr.id, 
        'Tournament'::text as type, 
        tr.name as title, 
        tr.sport || ' • ' || tr.status as subtitle, 
        NULL as image,
        '/events' as url_path
    FROM tournaments tr
    WHERE tr.name ILIKE search_query
    AND (filter_type = 'All' OR filter_type = 'Tournaments')
    
    LIMIT 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
