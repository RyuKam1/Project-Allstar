import { supabase } from "@/lib/supabaseClient";

export const eventService = {
  getAllEvents: async () => {
    const { data: events, error } = await supabase
        .from('events')
        .select(`
            *,
            attendees:event_attendees(
                user_id,
                profile:user_id(id, name, email)
            )
        `);
    
    if (error) {
        console.error("Event fetch error", error);
        return [];
    }

    // Map to frontend structure
    return events.map(e => ({
        ...e,
        attendees: e.attendees ? e.attendees.map(a => ({
            id: a.user_id,
            name: a.profile?.name,
            email: a.profile?.email
        })) : []
    }));
  },

  getEventById: async (id) => {
    const { data: event } = await supabase
        .from('events')
        .select(`
            *,
            attendees:event_attendees(
                user_id,
                profile:user_id(id, name, email)
            )
        `)
        .eq('id', id)
        .single();
    
    if (!event) return null;

    return {
        ...event,
        attendees: event.attendees ? event.attendees.map(a => ({
            id: a.user_id,
            name: a.profile?.name,
            email: a.profile?.email
        })) : []
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
    if (currentEvent.attendees.length >= currentEvent.max_spots) {
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
    return true; // Reloading UI will fetch fresh
  }
};
