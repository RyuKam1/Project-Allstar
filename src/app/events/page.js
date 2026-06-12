"use client";
import React, { useState, useEffect, useMemo } from "react";
import Navbar from "@/components/Layout/Navbar";
import { eventService } from "@/services/eventService";
import { tournamentService } from "@/services/tournamentService";
import { businessEventService } from "@/services/businessEventService";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useNotificationCenter } from "@/components/UI/NotificationCenter";
import EventCard, { EVENT_LAYOUT_ACCENTS } from "@/components/Events/EventCard";
import TeamPicker from "@/components/Tournament/TeamPicker";
import { isValidFreeTeamCount, MAX_TOURNAMENT_TEAMS, MIN_TOURNAMENT_TEAMS } from "@/lib/tournamentBracket";
import SportSelect from "@/components/Tournament/SportSelect";
import CoverImageField from "@/components/Tournament/CoverImageField";
import TournamentModePicker from "@/components/Tournament/TournamentModePicker";
import { BRACKET_MODES } from "@/lib/tournamentModes";
import {
  createLocalTeamId,
  saveLocalCustomTeams,
} from "@/lib/localCustomTeamsStorage";
import { sanitizeText } from "@/lib/security/inputSanitizer";
import { validateBracketRoster } from "@/lib/tournamentTeamRules";
import {
  DEFAULT_SPORT_LABEL,
  collectSportValues,
} from "@/lib/sportsCatalog";
import { useSportFilter } from "@/hooks/useSportFilter";
import SportFilterPills from "@/components/UI/SportFilterPills";
import { uploadCompressedImage, compressImage } from "@/lib/imageOptimizer";
import Icon from "@/components/UI/Icon";
import {
  SkeletonCardGrid,
  EmptyState,
  ModalHeader,
} from "@/components/UI/primitives";
import styles from "./events.module.css";
import bentoStyles from "@/styles/bento-grid.module.css";
import { getLayoutAccent } from "@/lib/cardLayoutAccents";

async function uploadTournamentCover(file) {
  if (!file) return null;
  const compressed = await compressImage(file, {
    maxSizeMB: 0.6,
    maxWidthOrHeight: 800,
  });
  const upload = await uploadCompressedImage(compressed, "allstar-assets", "tournament-covers");
  return upload?.publicUrl || null;
}

export default function EventsAndTournamentsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { notify } = useNotificationCenter();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFilterSheet, setShowFilterSheet] = useState(false);

  const inUseSports = useMemo(
    () => collectSportValues(items, (item) => item.sport),
    [items],
  );
  const { filterSport, setFilterSport, sportFilters, filtersLoading, matchesFilter } = useSportFilter(
    inUseSports,
    { loading },
  );

  const [showHostModal, setShowHostModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    sport: DEFAULT_SPORT_LABEL,
    customSport: "",
  });
  const [bracket, setBracket] = useState({ teams: [], customNames: [] });
  const [bracketMode, setBracketMode] = useState(BRACKET_MODES.STANDARD);
  const [cover, setCover] = useState({ file: null, previewUrl: null });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [events, officialTournaments, businessEvents] = await Promise.all([
        eventService.getAllEvents(),
        tournamentService.getPublicTournaments(),
        businessEventService.listPublic(),
      ]);

      const normalizedEvents = events.map((e) => ({
        ...e,
        kind: "Event",
        routeId: e.id,
        displayType: e.type,
      }));

      const normalizedBusinessEvents = (businessEvents || []).map((be) => ({
        id: be.id,
        title: be.title,
        sport: be.sport,
        kind: "BusinessEvent",
        routeId: be.id,
        displayType: be.event_type || "Event",
        location: be.venueName || be.venueLocation || "Venue",
        date: be.starts_at,
        cost:
          be.price_cents == null
            ? "Free"
            : be.price_cents === 0
              ? "Free"
              : `$${(be.price_cents / 100).toFixed(2)}`,
        isVerifiedHost: true,
      }));

      const normalizedTournaments = (officialTournaments || []).map((t) => ({
        id: t.id,
        title: t.name,
        sport: t.sport,
        kind: "Tournament",
        routeId: t.id,
        displayType: "Official",
        location: "Multiple Venues",
        date: "Ongoing",
        cost: "Entry Fee",
        coverImage: t.cover_image_url,
        imageAspect: "square",
        teams: t.teams,
      }));

      setItems([
        ...normalizedBusinessEvents,
        ...normalizedEvents,
        ...normalizedTournaments,
      ]);
    } catch (err) {
      console.error("Failed to load data", err);
    } finally {
      setLoading(false);
    }
  };

  const activeItems = items.filter((item) => matchesFilter(item.sport));

  const bracketTotal = bracket.teams.length + bracket.customNames.length;
  const bracketRosterCheck = validateBracketRoster({
    teams: bracket.teams,
    customNames: bracket.customNames,
    allowCustom: true,
  });
  const canCreateBracket =
    Boolean(formData.title.trim()) &&
    isValidFreeTeamCount(bracketTotal) &&
    bracketRosterCheck.ok;

  const resetModal = () => {
    setFormData({ title: "", sport: DEFAULT_SPORT_LABEL, customSport: "" });
    setBracket({ teams: [], customNames: [] });
    setBracketMode(BRACKET_MODES.STANDARD);
    setCover({ file: null, previewUrl: null });
  };

  const handleHostSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      notify("Please login first.", "warning");
      return;
    }

    const total = bracket.teams.length + bracket.customNames.length;
    const roster = validateBracketRoster({
      teams: bracket.teams,
      customNames: bracket.customNames,
      allowCustom: true,
    });

    if (!isValidFreeTeamCount(total) || !roster.ok) {
      notify(
        roster.errors[0] ||
          `Pick ${MIN_TOURNAMENT_TEAMS}–${MAX_TOURNAMENT_TEAMS} unique teams total for the bracket.`,
        "warning",
      );
      return;
    }

    setSubmitting(true);
    try {
      let coverImageUrl = null;
      if (cover.file) {
        coverImageUrl = await uploadTournamentCover(cover.file);
        if (!coverImageUrl) {
          notify("Cover upload failed. Creating bracket without a cover.", "warning");
        }
      }

      const localCustomTeams = bracket.customNames
        .map((name) => ({
          id: createLocalTeamId(),
          name: sanitizeText(name, 60),
        }))
        .filter((team) => team.name);

      const created = await tournamentService.createTournament(
        {
          name: formData.title,
          sport: formData.sport,
          customSport: formData.customSport,
          teams: bracket.teams,
          localCustomTeams,
          coverImageUrl,
          bracketMode,
        },
        user,
      );
      saveLocalCustomTeams(created.id, localCustomTeams);
      setShowHostModal(false);
      resetModal();
      notify("Offline tournament created.", "success");
      router.push("/profile/tournaments");
    } catch (err) {
      notify(`Failed to create: ${err.message}`, "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className={styles.main}>
      <Navbar />

      <div className={`container ${styles.contentContainer}`}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>
              Discover{" "}
              <span className="primary-gradient-text">Events & Tournaments</span>
            </h1>
            <p className={styles.subtitle}>
              Official events and verified business tournaments. Offline brackets live in your profile dashboard.
            </p>
          </div>
          <button
            className={`btn-primary ${styles.createBtn}`}
            onClick={() =>
              user ? setShowHostModal(true) : router.push("/login")
            }
          >
            <span className={styles.createBtnPlus} aria-hidden="true">
              +
            </span>
            Create Offline Tournament
          </button>
        </div>

        <div className={styles.contextBar} role="status">
          <span className={styles.contextMeta}>
            <strong className="tabular">{activeItems.length}</strong> events ·{" "}
            {filterSport}
          </span>
          <button
            type="button"
            className={styles.filterFab}
            onClick={() => setShowFilterSheet(true)}
            aria-label="Open event filters"
          >
            <Icon name="chevronDown" size={16} className="icon-inline" />
            Filters
            {filterSport !== "All" ? (
              <span className={styles.filterBadge}>1</span>
            ) : null}
          </button>
        </div>

        <SportFilterPills
          sportFilters={sportFilters}
          filterSport={filterSport}
          onSelect={setFilterSport}
          loading={filtersLoading}
          className={styles.desktopFilters}
          enableSearch
        />

        {loading ? (
          <SkeletonCardGrid
            count={9}
            variant="event"
            gridClassName={`${bentoStyles.grid} ${bentoStyles.gridMd}`}
            itemClassName={bentoStyles.item}
          />
        ) : activeItems.length === 0 ? (
          <EmptyState
            icon="calendar"
            title="No events in this filter"
            description={
              filterSport === "All"
                ? "Official events and verified tournaments appear here. Offline brackets stay in your profile."
                : `No ${filterSport} events yet. Try another sport or create an offline tournament for friends.`
            }
            actionLabel={
              user ? "Create offline tournament" : "Sign in to create"
            }
            onAction={() =>
              user ? setShowHostModal(true) : router.push("/login")
            }
          />
        ) : (
          <div className={`${bentoStyles.grid} ${bentoStyles.gridMd} list-stagger`}>
            {activeItems.map((item, index) => (
              <div key={`${item.kind}_${item.id}`} className={bentoStyles.item}>
                <EventCard
                  event={item}
                  layoutAccent={getLayoutAccent(index, EVENT_LAYOUT_ACCENTS)}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {showFilterSheet && (
        <div
          className="dismiss-backdrop"
          onClick={() => setShowFilterSheet(false)}
        >
          <div
            className={`glass-panel ticket-card ${styles.filterSheet} dismiss-panel`}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Event filters"
          >
            <ModalHeader
              title="Filters"
              onClose={() => setShowFilterSheet(false)}
            />
            <div className={styles.sheetSection}>
              <p className={styles.sheetLabel}>Sport</p>
              <SportFilterPills
                sportFilters={sportFilters}
                filterSport={filterSport}
                onSelect={setFilterSport}
                loading={filtersLoading}
                className={styles.sheetPills}
              />
            </div>
            <button
              type="button"
              className={`btn-primary ${styles.sheetApply}`}
              onClick={() => setShowFilterSheet(false)}
            >
              Show {activeItems.length} events
            </button>
          </div>
        </div>
      )}

      {showHostModal && (
        <div
          className={styles.modalOverlay}
          onClick={() => {
            setShowHostModal(false);
            resetModal();
          }}
        >
          <div
            className={`glass-panel ${styles.modal}`}
            onClick={(e) => e.stopPropagation()}
          >
            <ModalHeader
              title="Create Offline Tournament"
              onClose={() => {
                setShowHostModal(false);
                resetModal();
              }}
              closeLabel="Close create offline tournament modal"
            />

            <p
              className={styles.subtitle}
              style={{ marginBottom: "1rem", fontSize: "0.9rem" }}
            >
              Friendly brackets for friends or pickup groups. These stay in your profile — not on the public events feed.
            </p>

            <form onSubmit={handleHostSubmit}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Tournament name</label>
                <input
                  className={styles.input}
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  required
                  placeholder="Anything goes — e.g. Backyard BBQ bracket"
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Cover image (optional)</label>
                <CoverImageField
                  file={cover.file}
                  previewUrl={cover.previewUrl}
                  onChange={setCover}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Sport</label>
                <SportSelect
                  value={formData.sport}
                  customSport={formData.customSport}
                  onChange={(sport) => {
                    setFormData((prev) => ({ ...prev, sport }));
                    setBracket({ teams: [], customNames: [] });
                  }}
                  onCustomSportChange={(customSport) =>
                    setFormData((prev) => ({ ...prev, customSport }))
                  }
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Tournament format</label>
                <TournamentModePicker value={bracketMode} onChange={setBracketMode} />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Build the bracket</label>
                <TeamPicker
                  sport={
                    formData.sport === "__other__"
                      ? formData.customSport
                      : formData.sport
                  }
                  value={bracket}
                  onChange={setBracket}
                />
              </div>

              <button
                type="submit"
                className="btn-primary"
                style={{ width: "100%", marginTop: "1rem" }}
                disabled={submitting || !canCreateBracket}
              >
                {submitting ? "Creating…" : "Create offline bracket"}
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
