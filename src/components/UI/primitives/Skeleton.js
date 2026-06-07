"use client";

import React from "react";
import locationStyles from "@/components/Locations/location-card.module.css";
import eventStyles from "@/app/events/events.module.css";
import styles from "./primitives.module.css";

export default function Skeleton({ width, height, className = "", style = {}, circle = false, ...props }) {
  return (
    <div
      className={`${styles.skeleton} ${className}`.trim()}
      style={{
        width: width ?? "100%",
        height: height ?? "1rem",
        borderRadius: circle ? "50%" : undefined,
        ...style,
      }}
      aria-hidden="true"
      {...props}
    />
  );
}

export function SkeletonVenueCard() {
  return (
    <div
      className={`glass-panel court-frame ticket-card ${locationStyles.card} ${styles.skeletonCardShell}`}
      aria-hidden="true"
    >
      <div className={locationStyles.imageContainer}>
        <Skeleton className={styles.skeletonImageFill} />
        <div className={locationStyles.badges}>
          <Skeleton width={84} height={22} className={styles.skeletonTag} />
        </div>
      </div>

      <div className={locationStyles.content}>
        <div className={locationStyles.header}>
          <Skeleton height={20} width="72%" className={styles.skeletonLine} />
          <Skeleton height={14} width={44} className={styles.skeletonLine} />
        </div>

        <div className={locationStyles.sports}>
          <Skeleton width={68} height={26} className={styles.skeletonTag} />
          <Skeleton width={62} height={26} className={styles.skeletonTag} />
        </div>

        <div className={locationStyles.footer}>
          <Skeleton height={14} width="38%" className={styles.skeletonLine} />
          <Skeleton height={14} width={76} className={styles.skeletonLine} />
        </div>
      </div>
    </div>
  );
}

export function SkeletonEventCard() {
  return (
    <article
      className={`glass-panel ticket-card ${eventStyles.eventCard} ${styles.skeletonCardShell}`}
      aria-hidden="true"
    >
      <div className={eventStyles.cardImageContainer}>
        <Skeleton className={styles.skeletonImageFill} />
        <div className={eventStyles.cardDateBadge}>
          <Skeleton height={9} width={26} className={styles.skeletonLine} style={{ marginBottom: 6 }} />
          <Skeleton height={18} width={22} className={styles.skeletonLine} style={{ margin: "0 auto" }} />
        </div>
        <Skeleton
          width={58}
          height={22}
          className={`${styles.skeletonTag} ${eventStyles.cardTypeTag}`}
        />
      </div>

      <div className={eventStyles.cardBody}>
        <Skeleton
          height={11}
          width="32%"
          className={styles.skeletonLine}
          style={{ marginBottom: "var(--space-2, 8px)" }}
        />
        <Skeleton height={18} width="94%" className={styles.skeletonLine} style={{ marginBottom: 6 }} />
        <Skeleton
          height={18}
          width="70%"
          className={styles.skeletonLine}
          style={{ marginBottom: "var(--space-4, 16px)" }}
        />
        <div className={eventStyles.cardFooter}>
          <Skeleton height={14} width="58%" className={styles.skeletonLine} />
          <Skeleton height={14} width={36} className={styles.skeletonLine} />
        </div>
      </div>
    </article>
  );
}

const CARD_BY_VARIANT = {
  venue: SkeletonVenueCard,
  event: SkeletonEventCard,
};

export function SkeletonCardGrid({ count = 6, className = "", nested = false, variant = "venue" }) {
  const Card = CARD_BY_VARIANT[variant] || SkeletonVenueCard;
  const cards = Array.from({ length: count }).map((_, i) => <Card key={i} />);

  if (nested) {
    return cards;
  }

  return <div className={`grid-auto-fit ${className}`.trim()}>{cards}</div>;
}

export function SkeletonProfile() {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(300px, 1fr) 2fr",
        gap: "2rem",
        alignItems: "start",
      }}
      className="skeleton-profile-grid"
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
        <div className="glass-panel" style={{ padding: "2rem", textAlign: "center" }}>
          <Skeleton width={120} height={120} circle style={{ margin: "0 auto 1.5rem" }} />
          <Skeleton width="55%" height={28} style={{ margin: "0 auto 10px" }} />
          <Skeleton width="40%" height={16} style={{ margin: "0 auto 1.5rem" }} />
          <Skeleton width="100%" height={44} />
        </div>
        <div className="glass-panel" style={{ padding: "1.5rem" }}>
          <Skeleton width="50%" height={22} style={{ marginBottom: "1.25rem" }} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <Skeleton height={72} />
            <Skeleton height={72} />
            <Skeleton height={72} />
            <Skeleton height={72} />
          </div>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
        <div className="glass-panel" style={{ padding: "1.5rem" }}>
          <Skeleton width="45%" height={26} style={{ marginBottom: "1.25rem" }} />
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} height={64} style={{ marginBottom: "10px" }} />
          ))}
        </div>
        <div className="glass-panel" style={{ padding: "1.5rem" }}>
          <Skeleton width="40%" height={26} style={{ marginBottom: "1.25rem" }} />
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} height={88} style={{ marginBottom: "10px" }} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function SkeletonList({ rows = 5 }) {
  return (
    <div>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} height={48} style={{ marginBottom: "8px" }} />
      ))}
    </div>
  );
}

export function SkeletonTeamGrid({ count = 6, className = "", nested = false }) {
  const cards = Array.from({ length: count }).map((_, i) => (
    <div key={i} className={`glass-panel ${styles.skeletonTeamCard}`}>
      <Skeleton width={88} height={88} circle style={{ marginTop: "0.5rem", marginBottom: "0.85rem" }} />
      <Skeleton width="72%" height={20} />
      <Skeleton width="48%" height={14} style={{ marginTop: "0.35rem" }} />
      <Skeleton width="90%" height={14} style={{ marginTop: "0.85rem" }} />
      <div style={{ display: "flex", gap: "8px", justifyContent: "center", width: "100%", marginTop: "1rem" }}>
        <Skeleton width={88} height={34} />
        <Skeleton width={88} height={34} />
      </div>
    </div>
  ));

  if (nested) {
    return cards;
  }

  return <div className={`grid-auto-fit list-stagger ${className}`.trim()}>{cards}</div>;
}

export function SkeletonCommunityFeed({ count = 3, className = "" }) {
  return (
    <div className={className} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="glass-panel" style={{ padding: "1.8rem" }}>
          <div style={{ display: "flex", gap: "1rem", marginBottom: "1.2rem" }}>
            <Skeleton width={52} height={52} circle />
            <div style={{ flex: 1 }}>
              <Skeleton width="35%" height={18} style={{ marginBottom: "6px" }} />
              <Skeleton width="22%" height={14} />
            </div>
          </div>
          <Skeleton height={14} style={{ marginBottom: "8px" }} />
          <Skeleton height={14} style={{ marginBottom: "8px" }} />
          <Skeleton width="78%" height={14} style={{ marginBottom: "1.2rem" }} />
          <Skeleton height={180} style={{ marginBottom: "1rem", borderRadius: "12px" }} />
          <div style={{ display: "flex", gap: "12px" }}>
            <Skeleton width={84} height={36} />
            <Skeleton width={128} height={36} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonCommunitySidebar() {
  return (
    <div className="glass-panel" style={{ padding: "1.5rem" }}>
      <Skeleton width="60%" height={22} style={{ marginBottom: "1.25rem" }} />
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "12px" }}
        >
          <Skeleton width={24} height={24} />
          <Skeleton width={32} height={32} circle />
          <div style={{ flex: 1 }}>
            <Skeleton width="70%" height={14} style={{ marginBottom: "4px" }} />
            <Skeleton width="42%" height={12} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonEventDetail() {
  return (
    <div className="container" style={{ paddingTop: "120px", paddingBottom: "4rem" }}>
      <Skeleton width="40%" height={14} style={{ marginBottom: "1.5rem" }} />
      <Skeleton height="45vh" style={{ marginBottom: "2rem", borderRadius: "var(--border-radius, 12px)", minHeight: "280px" }} />
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "2rem" }}>
        <div className="glass-panel" style={{ padding: "2rem" }}>
          <Skeleton width="50%" height={28} style={{ marginBottom: "1.25rem" }} />
          <Skeleton height={14} style={{ marginBottom: "8px" }} />
          <Skeleton height={14} style={{ marginBottom: "8px" }} />
          <Skeleton width="88%" height={14} style={{ marginBottom: "2rem" }} />
          <Skeleton width="35%" height={22} style={{ marginBottom: "1rem" }} />
          <Skeleton height={14} style={{ marginBottom: "6px" }} />
          <Skeleton height={14} style={{ marginBottom: "6px" }} />
          <Skeleton width="72%" height={14} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div className="glass-panel" style={{ padding: "2rem" }}>
            <Skeleton width="55%" height={22} style={{ marginBottom: "1.25rem" }} />
            <Skeleton height={14} style={{ marginBottom: "10px" }} />
            <Skeleton height={14} style={{ marginBottom: "10px" }} />
            <Skeleton height={14} style={{ marginBottom: "1.5rem" }} />
            <Skeleton height={44} />
          </div>
          <div className="glass-panel" style={{ padding: "1.5rem" }}>
            <Skeleton width="45%" height={20} style={{ marginBottom: "1rem" }} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem" }}>
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} width={55} height={55} circle style={{ margin: "0 auto" }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SkeletonVenueDetail() {
  return <SkeletonEventDetail />;
}

export function SkeletonCommentList({ rows = 3 }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px", padding: "0.5rem 0" }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
          <Skeleton width={32} height={32} circle />
          <div style={{ flex: 1 }}>
            <Skeleton width="30%" height={14} style={{ marginBottom: "6px" }} />
            <Skeleton height={12} style={{ marginBottom: "4px" }} />
            <Skeleton width="85%" height={12} />
          </div>
        </div>
      ))}
    </div>
  );
}
