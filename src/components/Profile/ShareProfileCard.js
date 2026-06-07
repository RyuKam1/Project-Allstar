"use client";

import React, { useState } from "react";
import { useNotificationCenter } from "@/components/UI/NotificationCenter";
import Icon from "@/components/UI/Icon";
import styles from "./ShareProfileCard.module.css";

export default function ShareProfileCard({ profileId }) {
  const { notify } = useNotificationCenter();
  const [copied, setCopied] = useState(false);

  const publicPath = `/players/${profileId}`;
  const publicUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}${publicPath}`
      : publicPath;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      notify("Profile link copied.", "success");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      notify("Could not copy link. Select and copy manually.", "warning");
    }
  };

  return (
    <div className={`glass-panel ticket-card ${styles.card}`}>
      <div className={styles.header}>
        <Icon name="user" size={18} className={styles.headerIcon} />
        <h3 className={styles.title}>Share your profile</h3>
      </div>
      <p className={styles.hint}>
        Send this link so teammates can see your bio, teams, and wins.
      </p>
      <div className={styles.row}>
        <input
          readOnly
          value={publicUrl}
          className={styles.input}
          aria-label="Public profile link"
          onFocus={(e) => e.target.select()}
        />
        <button
          type="button"
          className={`btn-primary ${styles.copyBtn}`}
          onClick={handleCopy}
        >
          {copied ? "Copied" : "Copy link"}
        </button>
      </div>
    </div>
  );
}
