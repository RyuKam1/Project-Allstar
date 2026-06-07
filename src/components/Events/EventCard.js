"use client";

import React, { useState } from "react";
import Link from "next/link";
import Icon from "@/components/UI/Icon";
import styles from "../../app/events/events.module.css";

function parseEventDate(dateValue) {
  if (!dateValue || dateValue === "Ongoing") return null;
  const dateObj = new Date(dateValue);
  return Number.isNaN(dateObj.getTime()) ? null : dateObj;
}

function getSportInitial(sport) {
  return (sport || "E").charAt(0).toUpperCase();
}

export default function EventCard({ event }) {
  const [imageFailed, setImageFailed] = useState(false);
  const dateObj = parseEventDate(event.date);
  const href =
    event.kind === "Tournament"
      ? `/tournaments/${event.routeId || event.id}`
      : `/events/${event.routeId || event.id}`;

  const month = dateObj
    ? dateObj.toLocaleString("default", { month: "short" })
    : event.kind === "Tournament"
      ? "BR"
      : "TBD";
  const day = dateObj ? dateObj.getDate() : "—";

  return (
    <Link href={href} className={styles.eventCardLink}>
      <article className={`glass-panel ticket-card ${styles.eventCard}`}>
        <div className={styles.cardImageContainer}>
          {!imageFailed ? (
            <img
              src={`/events/${event.title}.webp`}
              alt=""
              className={styles.cardImage}
              loading="lazy"
              width={400}
              height={200}
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
          <p className={styles.cardSport}>{event.sport}</p>
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
