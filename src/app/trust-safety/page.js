"use client";
import React from "react";
import Link from "next/link";
import Navbar from "@/components/Layout/Navbar";

export default function TrustSafetyPage() {
  return (
    <main style={{ minHeight: "100dvh" }}>
      <Navbar />
      <div className="container" style={{ paddingTop: "100px", paddingBottom: "80px", maxWidth: "820px" }}>
        <h1 style={{ fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 800, marginBottom: "8px" }}>
          Trust &amp; <span className="primary-gradient-text">Safety</span>
        </h1>
        <p style={{ color: "var(--text-muted)", marginBottom: "40px", lineHeight: 1.6 }}>
          Project AllStar connects real athletes, venues, and communities. Our promise is simple:
          <strong> nothing official is public until it&apos;s proven, and nothing powerful is granted by default.</strong>
        </p>

        <section style={{ marginBottom: "32px" }}>
          <h2 style={{ fontSize: "1.4rem", marginBottom: "10px" }}>How verification works</h2>
          <p style={{ color: "var(--text-muted)", lineHeight: 1.7 }}>
            Businesses don&apos;t get instant control of a listing. Claiming or proposing a venue
            puts it into a review queue where our trust team verifies ownership using the evidence
            you provide. The current community maintainer keeps control until a claim is approved.
            A &quot;Verified Business&quot; badge only appears after that review passes.
          </p>
        </section>

        <section style={{ marginBottom: "32px" }}>
          <h2 style={{ fontSize: "1.4rem", marginBottom: "10px" }}>Reporting fraud &amp; abuse</h2>
          <p style={{ color: "var(--text-muted)", lineHeight: 1.7 }}>
            Every venue, community location, and review can be reported. Use the <strong>Report</strong> button
            on any listing to flag impersonation, wrong locations, spam, or unsafe content. Reports go
            straight to our moderation queue. Filing false or abusive reports may affect your account.
          </p>
        </section>

        <section style={{ marginBottom: "32px" }}>
          <h2 style={{ fontSize: "1.4rem", marginBottom: "10px" }}>Acceptable use</h2>
          <ul style={{ color: "var(--text-muted)", lineHeight: 1.8, paddingLeft: "20px" }}>
            <li>No impersonating a business, venue, or person you don&apos;t represent.</li>
            <li>No creating fake listings, events, or reviews.</li>
            <li>No scraping or harvesting member contact details.</li>
            <li>No misleading &quot;official&quot; titles on community events.</li>
          </ul>
          <p style={{ color: "var(--text-muted)", lineHeight: 1.7 }}>
            Violations may lead to content removal, loss of verification, suspension, or a ban —
            proportional to the harm, with an appeal path.
          </p>
        </section>

        <section style={{ marginBottom: "32px" }}>
          <h2 style={{ fontSize: "1.4rem", marginBottom: "10px" }}>Your privacy</h2>
          <p style={{ color: "var(--text-muted)", lineHeight: 1.7 }}>
            We minimize what we collect. Verification documents are stored privately and reviewed
            only by our trust team — never shown publicly. Public profiles never expose your email
            or private physical stats.
          </p>
        </section>

        <section style={{ marginBottom: "32px" }}>
          <h2 style={{ fontSize: "1.4rem", marginBottom: "10px" }}>Security research</h2>
          <p style={{ color: "var(--text-muted)", lineHeight: 1.7 }}>
            We welcome good-faith security research. If you find a vulnerability, please report it to
            our security contact and give us reasonable time to fix it before public disclosure (90 days).
          </p>
        </section>

        <div style={{ marginTop: "40px" }}>
          <Link href="/business" className="btn-primary">For businesses</Link>
        </div>
      </div>
    </main>
  );
}
