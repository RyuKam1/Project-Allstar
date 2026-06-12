"use client";

import React, { useState } from "react";
import Link from "next/link";
import Icon from "@/components/UI/Icon";
import styles from "../../app/events/events.module.css";

export const EVENT_LAYOUT_ACCENTS = [
  "",
  styles.layoutLift,
  styles.layoutDrop,
  styles.layoutCompact,
  styles.layoutEase,
  styles.layoutSet,
  styles.layoutDrift,
];

function parseEventDate(dateValue) {
  if (!dateValue || dateValue === "Ongoing") return null;
  const dateObj = new Date(dateValue);
  return Number.isNaN(dateObj.getTime()) ? null : dateObj;
}

function getSportInitial(sport) {
  return (sport || "E").charAt(0).toUpperCase();
}

export default function EventCard({ event, layoutAccent = "" }) {
  const [imageFailed, setImageFailed] = useState(false);
  const dateObj = parseEventDate(event.date);
  const href =
    event.kind === "Tournament"
      ? `/tournaments/${event.routeId || event.id}`
      : event.kind === "BusinessEvent"
        ? `/business-events/${event.routeId || event.id}`
        : `/events/${event.routeId || event.id}`;

  const month = dateObj
    ? dateObj.toLocaleString("default", { month: "short" })
    : event.kind === "Tournament"
      ? "BR"
      : "TBD";
  const day = dateObj ? dateObj.getDate() : "—";
  const useCover = Boolean(event.coverImage);
  const imageClass = event.imageAspect === "square"
    ? `${styles.cardImage} ${styles.cardImageSquare}`
    : styles.cardImage;

  return (
    <Link href={href} className={styles.eventCardLink}>
      <article className={`glass-panel ticket-card ${styles.eventCard} ${layoutAccent}`.trim()}>
        <div className={`${styles.cardImageContainer} ${event.imageAspect === "square" ? styles.cardImageContainerSquare : ""}`}>
          {useCover ? (
            <img
              src={event.coverImage}
              alt=""
              className={imageClass}
              loading="lazy"
              width={400}
              height={event.imageAspect === "square" ? 400 : 228}
            />
          ) : !imageFailed ? (
            <img
              src={`/events/${event.title}.webp`}
              alt=""
              className={styles.cardImage}
              loading="lazy"
              width={400}
              height={228}
              onError={() => setImageFailed(true)}
            />
          ) : (
            <div className={styles.sportFallback} aria-hidden="true">
              {getSportInitial(event.sport)}
            </div>
          )}

          <div className={`${styles.cardDateBadge} tabular`}>
            <span className={styles.cardDateMonth}>{month}</span>
            <span className={styles.cardDateDay}>{day}</span>
          </div>

          <span className={`tape-tag ${styles.cardTypeTag}`}>
            {event.displayType || event.kind}
          </span>
        </div>

        <div className={styles.cardBody}>
          <p className={styles.cardSport}>
            {event.sport}
            {event.isVerifiedHost && (
              <span
                title="Hosted by a verified business"
                style={{ marginLeft: "8px", fontSize: "0.7rem", fontWeight: 700, color: "var(--color-primary)" }}
              >
                Verified Host
              </span>
            )}
          </p>
          <h3 className={styles.cardTitle}>{event.title}</h3>

          <div className={styles.cardFooter}>
            <span className={styles.cardMetaItem}>
              <Icon name="location" size={14} className="icon-inline" />
              {event.location || "TBD"}
            </span>
            <span className={`${styles.cardCost} tabular`}>
              {event.cost || "Free"}
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}
