import React from "react";
import Icon from "@/components/UI/Icon";
import styles from "./dashboard-stats.module.css";

function StatCard({ label, value, icon, color = "var(--color-primary)" }) {
  return (
    <div className={`glass-panel ticket-card ${styles.card}`}>
      <div className={styles.iconWrap} style={{ background: color }}>
        <Icon name={icon} size={26} />
      </div>
      <div>
        <div className={styles.label}>{label}</div>
        <div className={styles.value}>{value}</div>
      </div>
    </div>
  );
}

export default function DashboardStats({ stats }) {
  return (
    <div className={styles.grid}>
      <StatCard icon="users" label="Total Users" value={stats.usersCount} color="#3b82f6" />
      <StatCard icon="location" label="Venues" value={stats.venuesCount} color="#8b5cf6" />
      <StatCard icon="shield" label="Teams" value={stats.teamsCount} color="#ec4899" />
      <StatCard icon="trophy" label="Tournaments" value={stats.tournamentsCount} color="#f59e0b" />
      <StatCard icon="document" label="Pending Claims" value={stats.claimsCount} color="#10b981" />
      <StatCard icon="warning" label="Review Reports" value={stats.reportsCount} color="#ef4444" />
    </div>
  );
}
