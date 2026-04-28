"use client";
import React, { useEffect, useState } from "react";
import { venueContributionService } from "@/services/venueContributionService";
import styles from "@/components/Community/pending-edits.module.css";

export default function PendingVenueContributions({ venueId, onUpdate }) {
  const [edits, setEdits] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEdits();
  }, [venueId]);

  const loadEdits = async () => {
    try {
      const data = await venueContributionService.getPendingEdits(venueId);
      setEdits(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleProcess = async (editId, decision) => {
    try {
      await venueContributionService.processEdit(editId, decision);
      setEdits((prev) => prev.filter((e) => e.id !== editId));
      if (decision === "applied" && onUpdate) onUpdate();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return null;
  if (!edits.length) return null;

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Pending Venue Contributions ({edits.length})</h3>
      <div className={styles.list}>
        {edits.map((edit) => (
          <div key={edit.id} className={styles.editCard}>
            <div className={styles.header}>
              <span className={styles.typeTag}>{edit.edit_type.replace("venue_", "").replace(/_/g, " ")}</span>
              <span className={styles.user}>by {edit.profiles?.name || "Unknown"}</span>
            </div>

            <div className={styles.diff}>
              <div className={styles.val}>
                <span className={styles.label}>Old:</span>
                <span className={styles.old}>{formatValue(edit.old_value)}</span>
              </div>
              <div className={styles.val}>
                <span className={styles.label}>New:</span>
                <span className={styles.new}>{formatValue(edit.new_value)}</span>
              </div>
            </div>

            <div className={styles.actions}>
              <button onClick={() => handleProcess(edit.id, "rejected")} className={styles.rejectBtn}>
                Reject
              </button>
              <button onClick={() => handleProcess(edit.id, "applied")} className={styles.approveBtn}>
                Approve
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatValue(raw) {
  if (!raw) return "None";
  try {
    const val = JSON.parse(raw);
    if (Array.isArray(val)) return val.join(", ");
    return String(val);
  } catch {
    return String(raw);
  }
}
