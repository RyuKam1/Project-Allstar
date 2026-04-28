import { supabase } from "@/lib/supabaseClient";

const VENUE_EDIT_PREFIX = "venue_";
const FIELD_MAP = {
  name: "name",
  description: "description",
  address: "location"
};

function toEditType(field) {
  return `${VENUE_EDIT_PREFIX}${field}`;
}

function fromEditType(editType) {
  if (!editType?.startsWith(VENUE_EDIT_PREFIX)) return null;
  return editType.replace(VENUE_EDIT_PREFIX, "");
}

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

    const { data, error } = await supabase
      .from("location_edits")
      .insert({
        location_id: venueId,
        user_id: user.id,
        edit_type: toEditType(field),
        old_value: JSON.stringify(oldValue),
        new_value: JSON.stringify(newValue),
        weight: 1,
        status: "pending"
      })
      .select()
      .single();

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
      .select(`
        *,
        profiles:user_id (name, avatar)
      `)
      .eq("location_id", venueId)
      .eq("status", "pending")
      .like("edit_type", `${VENUE_EDIT_PREFIX}%`)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return data || [];
  },

  processEdit: async (editId, decision) => {
    if (!["applied", "rejected"].includes(decision)) {
      throw new Error("Invalid decision");
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Must be logged in");

    const { data: edit, error: editError } = await supabase
      .from("location_edits")
      .select("*")
      .eq("id", editId)
      .single();

    if (editError || !edit) throw new Error("Contribution not found");

    const targetField = fromEditType(edit.edit_type);
    if (!targetField) throw new Error("Invalid contribution type");

    const mappedField = FIELD_MAP[targetField];
    if (!mappedField) throw new Error("Unsupported contribution field");

    const { data: venue } = await supabase
      .from("venues")
      .select("id, owner_id")
      .eq("id", edit.location_id)
      .single();

    if (!venue || venue.owner_id !== user.id) {
      throw new Error("Only venue owner can process contributions");
    }

    const { error: updateEditError } = await supabase
      .from("location_edits")
      .update({
        status: decision,
        applied_at: decision === "applied" ? new Date().toISOString() : null
      })
      .eq("id", editId);

    if (updateEditError) throw new Error(updateEditError.message);

    if (decision === "applied") {
      const parsedValue = JSON.parse(edit.new_value);
      const { error: venueUpdateError } = await supabase
        .from("venues")
        .update({
          [mappedField]: parsedValue,
          updated_at: new Date().toISOString()
        })
        .eq("id", edit.location_id);

      if (venueUpdateError) throw new Error(venueUpdateError.message);
    }

    return true;
  }
};
