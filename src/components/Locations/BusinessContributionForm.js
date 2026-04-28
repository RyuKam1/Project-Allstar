"use client";
import React, { useState } from "react";
import { venueContributionService } from "@/services/venueContributionService";
import styles from "@/components/Community/community-location-form.module.css";

export default function BusinessContributionForm({ venue, onSuccess, onCancel }) {
  const [formData, setFormData] = useState({
    name: venue.name || "",
    description: venue.description || "",
    address: venue.location || ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const tasks = [];
      if (formData.name !== (venue.name || "")) {
        tasks.push(venueContributionService.submitEdit(venue.id, "name", formData.name));
      }
      if (formData.description !== (venue.description || "")) {
        tasks.push(venueContributionService.submitEdit(venue.id, "description", formData.description));
      }
      if (formData.address !== (venue.location || "")) {
        tasks.push(venueContributionService.submitEdit(venue.id, "address", formData.address));
      }

      if (tasks.length === 0) {
        setError("No changes detected");
        setIsSubmitting(false);
        return;
      }

      await Promise.all(tasks);
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.message || "Failed to submit contribution");
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.container} style={{ maxWidth: "500px", margin: "0 auto" }}>
      <h2 className={styles.title}>Suggest Venue Improvements</h2>
      <p className={styles.subtitle}>Owner will review and approve or reject your suggestions.</p>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.field}>
          <label className={styles.label}>Venue Name</label>
          <input className={styles.input} name="name" value={formData.name} onChange={handleInputChange} />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Address</label>
          <input className={styles.input} name="address" value={formData.address} onChange={handleInputChange} />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Description</label>
          <textarea
            className={styles.textarea}
            rows={4}
            name="description"
            value={formData.description}
            onChange={handleInputChange}
          />
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.actions}>
          <button type="button" onClick={onCancel} className="btn-secondary" disabled={isSubmitting}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={isSubmitting}>
            {isSubmitting ? "Submitting..." : "Submit for Review"}
          </button>
        </div>
      </form>
    </div>
  );
}
