import { supabase } from "@/lib/supabaseClient";
import { sanitizeText } from "@/lib/security/inputSanitizer";

export const locationReportService = {
  // Report a venue or community location for moderation.
  // locationType: 'community' | 'venue'
  reportLocation: async (locationType, locationId, reason) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Must be logged in to report");

    if (!["community", "venue"].includes(locationType)) {
      throw new Error("Invalid location type");
    }

    const safeReason = sanitizeText(reason, 1200);
    if (!safeReason || safeReason.length < 5) {
      throw new Error("Please provide a short reason");
    }

    const { error } = await supabase
      .from("location_reports")
      .upsert(
        {
          location_type: locationType,
          location_id: String(locationId),
          reporter_id: user.id,
          reason: safeReason,
          status: "pending",
        },
        { onConflict: "location_type,location_id,reporter_id" },
      );

    if (error) throw new Error(error.message);
    return true;
  },

  // Admin: list all location reports (server route).
  getAllReports: async () => {
    const res = await fetch("/api/admin/location-reports");
    const payload = await res.json();
    if (!res.ok) throw new Error(payload.error || "Failed to load location reports");
    return payload.reports || [];
  },

  // Admin: resolve a report, optionally removing the reported target.
  resolveReport: async (reportId, { status, removeTarget = false }) => {
    const res = await fetch(`/api/admin/location-reports/${reportId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, removeTarget }),
    });
    const payload = await res.json();
    if (!res.ok) throw new Error(payload.error || "Failed to update report");
    return payload;
  },
};
