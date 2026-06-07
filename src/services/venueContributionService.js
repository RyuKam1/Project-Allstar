import { supabase } from "@/lib/supabaseClient";
import { getPublicProfilesMap } from "./publicProfileService";

const VENUE_EDIT_PREFIX = "venue_";
const FIELD_MAP = {
  name: "name",
  description: "description",
  address: "location"
};

export const venueContributionService = {
  submitEdit: async (venueId, field, newValue) => {
    const mappedField = FIELD_MAP[field];
    if (!mappedField) throw new Error("Unsupported field for venue contribution");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Must be logged in to submit contribution");

    const { data: venue, error: venueError } = await supabase
      .from("venues")
      .select("id, owner_id, booking_config, name, description, location")
      .eq("id", venueId)
      .single();

    if (venueError || !venue) throw new Error("Venue not found");

    if (venue.owner_id === user.id) {
      throw new Error("Owners can edit directly from dashboard");
    }

    const allowContrib = !!venue.booking_config?.allow_community_contributions;
    if (!allowContrib) throw new Error("Venue owner has disabled community contributions");

    const oldValue = venue[mappedField] ?? null;
    if (String(oldValue ?? "").trim() === String(newValue ?? "").trim()) {
      throw new Error("No changes detected");
    }

    const { data, error } = await supabase.rpc("submit_venue_edit", {
      p_venue_id: Number(venueId),
      p_field: field,
      p_new_value: String(newValue ?? ""),
    });

    if (error) throw new Error(error.message);
    return data;
  },

  getPendingEdits: async (venueId) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Must be logged in");

    const { data: venue } = await supabase
      .from("venues")
      .select("owner_id")
      .eq("id", venueId)
      .single();

    if (!venue || venue.owner_id !== user.id) {
      throw new Error("Only venue owner can review pending contributions");
    }

    const { data, error } = await supabase
      .from("location_edits")
      .select("*")
      .eq("location_id", venueId)
      .eq("status", "pending")
      .like("edit_type", `${VENUE_EDIT_PREFIX}%`)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    const profileMap = await getPublicProfilesMap((data || []).map((edit) => edit.user_id));
    return (data || []).map((edit) => ({
      ...edit,
      profiles: profileMap.get(edit.user_id) || null
    }));
  },

  processEdit: async (editId, decision) => {
    if (!["applied", "rejected"].includes(decision)) {
      throw new Error("Invalid decision");
    }

    const { error } = await supabase.rpc("process_location_edit", {
      p_edit_id: editId,
      p_decision: decision,
    });
    if (error) throw new Error(error.message);

    return true;
  }
};
