import { supabase } from "@/lib/supabaseClient";
import { sanitizeText } from "@/lib/security/inputSanitizer";

async function attachVenueNames(events = []) {
  const ids = [...new Set(events.map((e) => e.venue_id).filter(Boolean))];
  if (ids.length === 0) return events.map((e) => ({ ...e, venueName: null }));

  const { data: venues } = await supabase.from("venues").select("id, name, location").in("id", ids);
  const byId = new Map((venues || []).map((v) => [String(v.id), v]));
  return events.map((e) => {
    const v = byId.get(String(e.venue_id));
    return { ...e, venueName: v?.name || null, venueLocation: v?.location || null };
  });
}

function normalizePayload(payload) {
  return {
    venue_id: payload.venueId != null ? String(payload.venueId) : null,
    title: sanitizeText(payload.title, 160),
    description: payload.description ? sanitizeText(payload.description, 4000) : null,
    sport: payload.sport ? sanitizeText(payload.sport, 60) : null,
    event_type: payload.eventType ? sanitizeText(payload.eventType, 60) : null,
    starts_at: payload.startsAt || null,
    ends_at: payload.endsAt || null,
    capacity: payload.capacity ? Number(payload.capacity) : null,
    price_cents:
      payload.priceCents != null && payload.priceCents !== ""
        ? Math.max(0, Math.round(Number(payload.priceCents)))
        : null,
    registration_url: payload.registrationUrl ? sanitizeText(payload.registrationUrl, 500) : null,
  };
}

export const businessEventService = {
  // Events organized by the current user (any status).
  listMine: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    const { data, error } = await supabase
      .from("business_events")
      .select("*")
      .eq("organizer_id", user.id)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return attachVenueNames(data || []);
  },

  // Published events for the public listing.
  listPublic: async () => {
    const { data, error } = await supabase
      .from("business_events")
      .select("*")
      .eq("status", "published")
      .order("starts_at", { ascending: true });
    if (error) {
      console.error("Business events load error", error);
      return [];
    }
    return attachVenueNames(data || []);
  },

  getById: async (id) => {
    const { data, error } = await supabase
      .from("business_events")
      .select("*")
      .eq("id", id)
      .single();
    if (error) return null;
    const [withName] = await attachVenueNames([data]);
    return withName;
  },

  create: async (payload) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Must be logged in");
    if (!payload.venueId) throw new Error("Pick one of your venues");
    if (!payload.title?.trim()) throw new Error("Title is required");

    const row = {
      ...normalizePayload(payload),
      organizer_id: user.id,
      status: payload.status === "published" ? "published" : "draft",
    };

    const { data, error } = await supabase.from("business_events").insert(row).select().single();
    if (error) throw new Error(error.message);
    return data;
  },

  update: async (id, payload) => {
    const row = { ...normalizePayload(payload), updated_at: new Date().toISOString() };
    if (payload.status) row.status = payload.status;
    const { data, error } = await supabase
      .from("business_events")
      .update(row)
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  setStatus: async (id, status) => {
    const { data, error } = await supabase
      .from("business_events")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  remove: async (id) => {
    const { error } = await supabase.from("business_events").delete().eq("id", id);
    if (error) throw new Error(error.message);
    return true;
  },
};
