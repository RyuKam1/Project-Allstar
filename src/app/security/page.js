"use client";
import React from "react";
import Navbar from "@/components/Layout/Navbar";

export default function SecurityPage() {
  return (
    <main style={{ minHeight: "100dvh" }}>
      <Navbar />
      <div className="container" style={{ paddingTop: "100px", paddingBottom: "80px", maxWidth: "820px" }}>
        <h1 style={{ fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 800, marginBottom: "8px" }}>
          Security &amp; <span className="primary-gradient-text">Responsible Disclosure</span>
        </h1>
        <p style={{ color: "var(--text-muted)", marginBottom: "40px", lineHeight: 1.6 }}>
          We welcome good-faith security research and treat reporters as partners, not adversaries.
        </p>

        <section style={{ marginBottom: "32px" }}>
          <h2 style={{ fontSize: "1.4rem", marginBottom: "10px" }}>Scope</h2>
          <p style={{ color: "var(--text-muted)", lineHeight: 1.7 }}>
            The Project AllStar web application and its API. Please avoid testing that degrades service
            for others, accesses real user data, or involves social engineering of our team.
          </p>
        </section>

        <section style={{ marginBottom: "32px" }}>
          <h2 style={{ fontSize: "1.4rem", marginBottom: "10px" }}>How to report</h2>
          <ul style={{ color: "var(--text-muted)", lineHeight: 1.8, paddingLeft: "20px" }}>
            <li>Email <strong>security@project-allstar.app</strong> with steps to reproduce.</li>
            <li>Give us reasonable time to remediate before public disclosure (90 days default).</li>
            <li>Do not access, modify, or exfiltrate data that isn&apos;t yours.</li>
          </ul>
        </section>

        <section style={{ marginBottom: "32px" }}>
          <h2 style={{ fontSize: "1.4rem", marginBottom: "10px" }}>Safe harbor</h2>
          <p style={{ color: "var(--text-muted)", lineHeight: 1.7 }}>
            Good-faith research conducted in line with this policy will not lead to legal action from us.
            If in doubt about whether an action is authorized, ask first.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: "1.4rem", marginBottom: "10px" }}>Recognition</h2>
          <p style={{ color: "var(--text-muted)", lineHeight: 1.7 }}>
            We credit researchers who responsibly disclose valid issues (with your permission). A formal
            bug-bounty program is on our roadmap.
          </p>
        </section>
      </div>
    </main>
  );
}
