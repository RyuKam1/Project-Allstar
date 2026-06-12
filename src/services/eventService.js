import { supabase } from "@/lib/supabaseClient";
import { getPublicProfilesMap } from "./publicProfileService";

// Build public-safe attendee objects from event_attendees rows.
// Only non-sensitive fields from profiles_public are exposed here — never
// contact details or private physical stats (see security master plan 2.7).
async function hydrateAttendees(attendeeRows = []) {
    const rows = attendeeRows || [];
    const userIds = rows.map((a) => a.user_id).filter(Boolean);
    const profileMap = await getPublicProfilesMap(userIds);
    return rows.map((a) => {
        const p = profileMap.get(a.user_id) || {};
        return {
            id: a.user_id,
            name: p.name,
            avatar: p.avatar,
            bio: p.bio,
            sport: p.sport,
            isVerifiedBusiness: p.is_verified_business || false
        };
    });
}

export const eventService = {
  getAllEvents: async () => {
    const { data: events, error } = await supabase
        .from('events')
        .select(`
            *,
            attendees:event_attendees(user_id)
        `);

    if (error) {
        console.error("Event fetch error", error);
        return [];
    }

    return Promise.all(events.map(async (e) => ({
        ...e,
        maxSpots: e.max_spots, // Align with frontend
        attendees: await hydrateAttendees(e.attendees)
    })));
  },

  getEventById: async (id) => {
    const { data: event } = await supabase
        .from('events')
        .select(`
            *,
            attendees:event_attendees(user_id)
        `)
        .eq('id', id)
        .single();

    if (!event) return null;

    return {
        ...event,
        maxSpots: event.max_spots, // Align with frontend
        attendees: await hydrateAttendees(event.attendees)
    };
  },

  createEvent: async (eventData, creator) => {
    const { data: newEvent, error } = await supabase
        .from('events')
        .insert({
            title: eventData.title,
            type: eventData.type,
            sport: eventData.sport,
            date: eventData.date,
            time: eventData.time,
            location: eventData.location,
            description: eventData.description,
            cost: eventData.cost,
            reward: eventData.reward,
            max_spots: eventData.maxSpots,
            image: eventData.image, // URL assumed
            image_gradient: eventData.imageGradient || "linear-gradient(45deg, #667eea, #764ba2)",
            creator_id: creator.id
        })
        .select()
        .single();

    if (error) throw new Error(error.message);
    return newEvent;
  },

  registerForEvent: async (eventId, user) => {
    // Check Status first
    const currentEvent = await eventService.getEventById(eventId);
    if (!currentEvent) throw new Error("Event not found");
    
    if (currentEvent.attendees.length >= currentEvent.maxSpots) {
        throw new Error("Event is full");
    }
    if (currentEvent.attendees.some(a => a.id === user.id)) {
        throw new Error("Already registered");
    }

    const { error } = await supabase
        .from('event_attendees')
        .insert({
            event_id: eventId,
            user_id: user.id
        });
    
    if (error) throw new Error(error.message);
    
    // Return fresh data
    return await eventService.getEventById(eventId);
  }
};
