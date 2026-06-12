"use client";
import React from "react";
import Link from "next/link";
import Navbar from "@/components/Layout/Navbar";

export default function TransparencyPage() {
  return (
    <main style={{ minHeight: "100dvh" }}>
      <Navbar />
      <div className="container" style={{ paddingTop: "100px", paddingBottom: "80px", maxWidth: "820px" }}>
        <h1 style={{ fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 800, marginBottom: "8px" }}>
          Transparency <span className="primary-gradient-text">Report</span>
        </h1>
        <p style={{ color: "var(--text-muted)", marginBottom: "40px", lineHeight: 1.6 }}>
          We believe trust is earned through openness about how we moderate the platform.
          This page summarizes our enforcement principles and the safeguards in place.
        </p>

        <section style={{ marginBottom: "32px" }}>
          <h2 style={{ fontSize: "1.4rem", marginBottom: "10px" }}>What we moderate</h2>
          <ul style={{ color: "var(--text-muted)", lineHeight: 1.8, paddingLeft: "20px" }}>
            <li>Business claims &amp; venue proposals — reviewed with evidence before any ownership is granted.</li>
            <li>Reports on reviews, venues, community locations, and events.</li>
            <li>Likely-duplicate listings, flagged for consolidation.</li>
          </ul>
        </section>

        <section style={{ marginBottom: "32px" }}>
          <h2 style={{ fontSize: "1.4rem", marginBottom: "10px" }}>Our safeguards</h2>
          <ul style={{ color: "var(--text-muted)", lineHeight: 1.8, paddingLeft: "20px" }}>
            <li>Every admin action is recorded in an audit log.</li>
            <li>Ownership transfers have a 7-day dispute window and can be rolled back.</li>
            <li>Verification evidence is stored privately and never shown publicly.</li>
            <li>Rate limits and reporting tools curb spam and impersonation.</li>
          </ul>
        </section>

        <section style={{ marginBottom: "32px" }}>
          <h2 style={{ fontSize: "1.4rem", marginBottom: "10px" }}>Appeals</h2>
          <p style={{ color: "var(--text-muted)", lineHeight: 1.7 }}>
            If your content or listing was actioned and you believe it was a mistake, contact us — we
            review appeals and act proportionally.
          </p>
        </section>

        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginTop: "40px" }}>
          <Link href="/trust-safety" className="btn-secondary">Trust &amp; Safety</Link>
          <Link href="/security" className="btn-secondary">Report a vulnerability</Link>
        </div>
      </div>
    </main>
  );
}
