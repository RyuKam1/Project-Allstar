"use client";

import React, { useState } from "react";
import { Modal } from "@/components/UI/primitives";
import Icon from "@/components/UI/Icon";
import { locationReportService } from "@/services/locationReportService";
import { useNotificationCenter } from "@/components/UI/NotificationCenter";

// Reusable "Report" control for venue + community location pages.
// locationType: 'venue' | 'community'
export default function ReportLocationButton({ locationType, locationId, className = "" }) {
  const { notify } = useNotificationCenter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (reason.trim().length < 5) {
      notify("Please describe the issue (at least 5 characters).", "warning");
      return;
    }
    setSubmitting(true);
    try {
      await locationReportService.reportLocation(locationType, locationId, reason.trim());
      notify("Thanks — our trust team will review this listing.", "success");
      setOpen(false);
      setReason("");
    } catch (e) {
      notify(`Could not submit report: ${e.message}`, "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className={`btn-secondary ${className}`}
        onClick={() => setOpen(true)}
        aria-label="Report this listing"
      >
        <Icon name="warning" size={16} className="icon-inline" /> Report
      </button>

      <Modal open={open} title="Report this listing" onClose={() => setOpen(false)}>
        <p style={{ color: "var(--text-muted)", marginTop: 0 }}>
          Tell us what&apos;s wrong (impersonation, wrong location, spam, closed, etc.).
          False or abusive reports may affect your account.
        </p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={4}
          maxLength={1200}
          placeholder="Describe the problem…"
          style={{ width: "100%", padding: "12px", borderRadius: "10px", resize: "vertical" }}
        />
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "16px" }}>
          <button type="button" className="btn-secondary" onClick={() => setOpen(false)} disabled={submitting}>
            Cancel
          </button>
          <button type="button" className="btn-primary" onClick={submit} disabled={submitting}>
            {submitting ? "Submitting…" : "Submit report"}
          </button>
        </div>
      </Modal>
    </>
  );
}
