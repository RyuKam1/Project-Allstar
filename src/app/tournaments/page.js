"use client";
import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Navbar from "@/components/Layout/Navbar";
import { tournamentService } from "@/services/tournamentService";
import { useRouter } from "next/navigation";
import EventCard from "@/components/Events/EventCard";
import Icon from "@/components/UI/Icon";
import { SkeletonCardGrid, EmptyState, ModalHeader } from "@/components/UI/primitives";
import { Stagger } from "@/components/UI/motion";
import { collectSportValues } from "@/lib/sportsCatalog";
import { useSportFilter } from "@/hooks/useSportFilter";
import SportFilterPills from "@/components/UI/SportFilterPills";
import styles from "./tournaments-list.module.css";
import eventStyles from "../events/events.module.css";

export default function TournamentsPage() {
  const router = useRouter();
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFilterSheet, setShowFilterSheet] = useState(false);

  const inUseSports = useMemo(
    () => collectSportValues(tournaments, (t) => t.sport),
    [tournaments],
  );
  const { filterSport, setFilterSport, sportFilters, filtersLoading, matchesFilter } = useSportFilter(
    inUseSports,
    { loading },
  );

  async function loadData() {
    const data = await tournamentService.getPublicTournaments();
    setTournaments(data);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  const activeTournaments = tournaments.filter((t) => matchesFilter(t.sport));

  const tournamentCards = activeTournaments.map((t) => ({
    id: t.id,
    routeId: t.id,
    title: t.name,
    sport: t.sport,
    kind: "Tournament",
    displayType: "Official",
    location: "Multiple venues",
    date: "Ongoing",
    cost: "Entry fee",
    coverImage: t.cover_image_url,
    imageAspect: "square",
  }));

  return (
    <main className={styles.main}>
      <Navbar />
      <div className={`container ${styles.container}`}>
        <div className={styles.header}>
          <h1 className={styles.title}>
            Tournaments <span className="primary-gradient-text">Bracket Hub</span>
          </h1>
          <Link href="/events" className={`btn-primary ${eventStyles.createBtn}`}>
            <span className={eventStyles.createBtnPlus} aria-hidden="true">+</span>
            Create Offline Tournament
          </Link>
        </div>

        <p style={{ color: "var(--text-muted)", margin: "0 0 1.25rem", fontSize: "0.92rem" }}>
          Verified official brackets only. Offline friendly tournaments live in{" "}
          <Link href="/profile/tournaments" style={{ color: "var(--color-primary)" }}>your profile dashboard</Link>.
        </p>

        <div className={eventStyles.contextBar} role="status">
          <span className={eventStyles.contextMeta}>
            <strong className="tabular">{activeTournaments.length}</strong> official brackets · {filterSport}
          </span>
          <button
            type="button"
            className={eventStyles.filterFab}
            onClick={() => setShowFilterSheet(true)}
            aria-label="Open tournament filters"
          >
            <Icon name="chevronDown" size={16} className="icon-inline" />
            Filters
            {filterSport !== "All" ? <span className={eventStyles.filterBadge}>1</span> : null}
          </button>
        </div>

        <SportFilterPills
          sportFilters={sportFilters}
          filterSport={filterSport}
          onSelect={setFilterSport}
          loading={filtersLoading}
          className={eventStyles.desktopFilters}
          enableSearch
        />

        {loading ? (
          <SkeletonCardGrid count={6} variant="event" />
        ) : activeTournaments.length === 0 ? (
          <EmptyState
            icon="trophy"
            title="No official tournaments yet"
            description={
              filterSport === "All"
                ? "Verified businesses publish official brackets here. Offline brackets stay in your profile."
                : `No ${filterSport} official tournaments found.`
            }
            actionLabel="Create offline tournament"
            onAction={() => router.push("/events")}
          />
        ) : (
          <Stagger className="grid-auto-fit">
            {tournamentCards.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </Stagger>
        )}
      </div>

      {showFilterSheet && (
        <div className="dismiss-backdrop" onClick={() => setShowFilterSheet(false)}>
          <div
            className={`glass-panel ticket-card ${eventStyles.filterSheet} dismiss-panel`}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Tournament filters"
          >
            <ModalHeader title="Filters" onClose={() => setShowFilterSheet(false)} />
            <div className={eventStyles.sheetSection}>
              <p className={eventStyles.sheetLabel}>Sport</p>
              <SportFilterPills
                sportFilters={sportFilters}
                filterSport={filterSport}
                onSelect={setFilterSport}
                loading={filtersLoading}
                className={eventStyles.sheetPills}
              />
            </div>
            <button
              type="button"
              className={`btn-primary ${eventStyles.sheetApply}`}
              onClick={() => setShowFilterSheet(false)}
            >
              Show {activeTournaments.length} tournaments
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
