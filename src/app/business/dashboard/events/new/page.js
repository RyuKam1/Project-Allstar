"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Layout/Navbar";
import EventWizard from "@/components/Business/EventWizard";
import { businessEventService } from "@/services/businessEventService";
import { useNotificationCenter } from "@/components/UI/NotificationCenter";

export default function NewBusinessEventPage() {
  const router = useRouter();
  const { notify } = useNotificationCenter();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (payload, intendedStatus) => {
    setSubmitting(true);
    try {
      await businessEventService.create({ ...payload, status: intendedStatus });
      notify(intendedStatus === "published" ? "Event published." : "Draft saved.", "success");
      router.push("/business/dashboard/events");
    } catch (e) {
      notify(`Could not save: ${e.message}`, "error");
      setSubmitting(false);
    }
  };

  return (
    <main style={{ minHeight: "100dvh" }}>
      <Navbar />
      <div className="container" style={{ paddingTop: "100px", paddingBottom: "60px", maxWidth: "720px" }}>
        <h1 style={{ fontSize: "clamp(1.6rem, 3vw, 2.2rem)", fontWeight: 800, marginBottom: "20px" }}>New event</h1>
        <div className="glass-panel" style={{ padding: "28px" }}>
          <EventWizard submitting={submitting} onSubmit={handleSubmit} />
        </div>
      </div>
    </main>
  );
}
