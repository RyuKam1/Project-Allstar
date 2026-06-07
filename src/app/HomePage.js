"use client";

import Navbar from "@/components/Layout/Navbar";
import MemberDashboard from "@/components/Home/MemberDashboard";
import { useAuth } from "@/context/AuthContext";
import { Reveal, Stagger } from "@/components/UI/motion";
import { SkeletonCardGrid } from "@/components/UI/primitives";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "./page.module.css";

const DISCOVERY_PATHS = [
  { label: "Browse venues", href: "/venues", meta: "Courts, fields, gyms" },
  { label: "Join a team", href: "/teams", meta: "Open rosters nearby" },
  { label: "Find events", href: "/events", meta: "Runs, workshops, brackets" },
];

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e) => {
    e.preventDefault();
    const q = searchQuery.trim();
    router.push(q ? `/venues?q=${encodeURIComponent(q)}` : "/venues");
  };

  if (loading) {
    return (
      <main className={styles.main}>
        <Navbar />
        <div className={`container ${styles.heroSection}`}>
          <SkeletonCardGrid count={3} />
        </div>
      </main>
    );
  }

  if (user) {
    return (
      <main className={styles.main}>
        <Navbar />
        <MemberDashboard user={user} />
      </main>
    );
  }

  return (
    <main className={styles.main}>
      <Navbar />

      <section className={`container ${styles.heroSection}`}>
        <div className={styles.heroGrid}>
          <Reveal className={styles.heroCopy}>
            <p className={styles.eyebrow}>Local sports, one platform</p>
            <h1 className={styles.title}>
              <span className={styles.titleLine}>Play local.</span>
              <span className={`${styles.titleLine} ${styles.titleAccent}`}>
                Go AllStar.
              </span>
            </h1>
            <p className={styles.subtitle}>
              Discover courts, fields, and gyms near you. Join teams, enter
              tournaments, and meet players in your city.
            </p>

            <form className={styles.searchForm} onSubmit={handleSearch}>
              <div className={styles.searchField}>
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search venues, sports, cities…"
                  className={styles.searchInput}
                  aria-label="Search venues"
                />
                <button
                  type="submit"
                  className={`btn-primary ${styles.searchBtn}`}
                >
                  Search
                </button>
              </div>
            </form>

            <Stagger className={styles.actions} stagger={0.06}>
              <Link href="/venues">
                <button
                  type="button"
                  className={`btn-secondary ${styles.secondaryButton}`}
                >
                  Explore venues
                </button>
              </Link>
              <Link href="/register">
                <button
                  type="button"
                  className={`btn-primary ${styles.primaryButton}`}
                >
                  Create free account
                </button>
              </Link>
            </Stagger>
          </Reveal>

          <Reveal className={styles.heroAside} delay={0.08}>
            <div
              className={`glass-panel court-frame ticket-card ${styles.previewPanel}`}
            >
              <p className={styles.panelLabel}>Start here</p>
              <p className={styles.panelHint}>
                Three paths into the app — no account required to browse.
              </p>
              <ul className={styles.heroList}>
                {DISCOVERY_PATHS.map((row) => (
                  <li key={row.href}>
                    <Link href={row.href} className={styles.discoveryLink}>
                      <span>
                        <strong>{row.label}</strong>
                        <span className={styles.discoveryMeta}>{row.meta}</span>
                      </span>
                      <span className={styles.discoveryArrow} aria-hidden="true">
                        →
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              <Link href="/community" className={styles.panelLink}>
                See community posts →
              </Link>
            </div>
          </Reveal>
        </div>

        <hr className="chalk-divider" />

        <Reveal className={`glass-panel court-frame ${styles.ctaStrip}`} delay={0.12}>
          <div>
            <h2 className={styles.ctaTitle}>Own a venue?</h2>
            <p className={styles.ctaText}>
              Claim your listing, update hours, and reach local players.
            </p>
          </div>
          <Link href="/business">
            <button type="button" className="btn-secondary">
              Business portal
            </button>
          </Link>
        </Reveal>
      </section>
    </main>
  );
}
