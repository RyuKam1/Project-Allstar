import { supabase } from "@/lib/supabaseClient";
import { sanitizeText } from "@/lib/security/inputSanitizer";

export const eventReportService = {
  // Report an event for moderation. eventKind: 'community' | 'business'
  reportEvent: async (eventKind, eventId, reason) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Must be logged in to report");
    if (!["community", "business"].includes(eventKind)) {
      throw new Error("Invalid event type");
    }

    const safeReason = sanitizeText(reason, 1200);
    if (!safeReason || safeReason.length < 5) {
      throw new Error("Please provide a short reason");
    }

    const { error } = await supabase
      .from("event_reports")
      .upsert(
        {
          event_kind: eventKind,
          event_id: String(eventId),
          reporter_id: user.id,
          reason: safeReason,
          status: "pending",
        },
        { onConflict: "event_kind,event_id,reporter_id" },
      );

    if (error) throw new Error(error.message);
    return true;
  },

  // Admin: list all event reports (server route).
  getAllReports: async () => {
    const res = await fetch("/api/admin/event-reports");
    const payload = await res.json();
    if (!res.ok) throw new Error(payload.error || "Failed to load event reports");
    return payload.reports || [];
  },

  // Admin: resolve a report, optionally removing the reported event.
  resolveReport: async (reportId, { status, removeTarget = false }) => {
    const res = await fetch(`/api/admin/event-reports/${reportId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, removeTarget }),
    });
    const payload = await res.json();
    if (!res.ok) throw new Error(payload.error || "Failed to update report");
    return payload;
  },
};
