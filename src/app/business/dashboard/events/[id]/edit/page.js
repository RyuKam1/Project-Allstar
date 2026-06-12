"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/components/Layout/Navbar";
import EventWizard from "@/components/Business/EventWizard";
import { businessEventService } from "@/services/businessEventService";
import { useNotificationCenter } from "@/components/UI/NotificationCenter";

export default function EditBusinessEventPage() {
  const params = useParams();
  const router = useRouter();
  const { notify } = useNotificationCenter();
  const [initial, setInitial] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const ev = await businessEventService.getById(params.id);
        if (!ev) {
          notify("Event not found.", "error");
          router.push("/business/dashboard/events");
          return;
        }
        setInitial(ev);
      } finally {
        setLoading(false);
      }
    })();
  }, [params.id, router, notify]);

  const handleSubmit = async (payload, intendedStatus) => {
    setSubmitting(true);
    try {
      await businessEventService.update(params.id, { ...payload, status: intendedStatus });
      notify(intendedStatus === "published" ? "Event published." : "Changes saved.", "success");
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
        <h1 style={{ fontSize: "clamp(1.6rem, 3vw, 2.2rem)", fontWeight: 800, marginBottom: "20px" }}>Edit event</h1>
        <div className="glass-panel" style={{ padding: "28px" }}>
          {loading ? (
            <p style={{ color: "var(--text-muted)" }}>Loading…</p>
          ) : (
            <EventWizard initial={initial} submitting={submitting} onSubmit={handleSubmit} />
          )}
        </div>
      </div>
    </main>
  );
}
