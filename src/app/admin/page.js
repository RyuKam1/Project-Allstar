"use client";

import React, { useState, useEffect } from "react";
import AdminSidebar from "@/components/Admin/AdminSidebar";
import DashboardStats from "@/components/Admin/DashboardStats";
import AdminDataTable from "@/components/Admin/AdminDataTable";
import { authService } from "@/services/authService";
import { teamService } from "@/services/teamService";
import { tournamentService } from "@/services/tournamentService";
import { venueService } from "@/services/venueService";
import { businessService } from "@/services/businessService";
import { adminReviewReportService } from "@/services/adminReviewReportService";
import { placeholderVenueCleanupService } from "@/services/placeholderVenueCleanupService";
import { useRouter } from "next/navigation";
import { useNotificationCenter } from "@/components/UI/NotificationCenter";
import Icon from "@/components/UI/Icon";
import tableStyles from "@/components/Admin/admin-data-table.module.css";
import styles from "./admin.module.css";

function PanelHeader({ title, onRefresh, rightActions = null }) {
  return (
    <div className={styles.panelHeader}>
      <h2 className={styles.panelTitle}>{title}</h2>
      <div className={styles.panelActions}>
        {rightActions}
        <button type="button" onClick={onRefresh} className={styles.refreshBtn}>
          <Icon name="clock" size={16} />
          Refresh
        </button>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const classMap = {
    pending: tableStyles.statusPending,
    reviewed: tableStyles.statusReviewed,
    dismissed: tableStyles.statusDismissed,
    approved: tableStyles.statusReviewed,
    rejected: tableStyles.statusDismissed,
  };
  return (
    <span className={classMap[status] || tableStyles.statusDismissed}>
      {String(status || "unknown").toUpperCase()}
    </span>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const { notify, confirm } = useNotificationCenter();
  const [activeTab, setActiveTabState] = useState("dashboard");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    users: [],
    teams: [],
    tournaments: [],
    venues: [],
    claims: [],
    reports: [],
  });
  const [currentUser, setCurrentUser] = useState(null);
  const [cleanupRunning, setCleanupRunning] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get("tab");
      if (tab) setActiveTabState(tab);
    }
    loadData();
    checkUser();
  }, []);

  const setActiveTab = (tab) => {
    setActiveTabState(tab);
    router.push(`?tab=${tab}`, { scroll: false });
  };

  const checkUser = async () => {
    const user = await authService.getCurrentUser();
    setCurrentUser(user);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const results = await Promise.allSettled([
        authService.getAllUsers(),
        teamService.getAllTeams(),
        tournamentService.getAllTournaments(),
        venueService.getAllVenues(),
        businessService.getAllClaims(),
        adminReviewReportService.getAllReports(),
      ]);

      const [usersRes, teamsRes, tournRes, venuesRes, claimsRes, reportsRes] =
        results;

      if (usersRes.status === "rejected") console.error("Users load failed:", usersRes.reason);
      if (teamsRes.status === "rejected") console.error("Teams load failed:", teamsRes.reason);
      if (tournRes.status === "rejected") console.error("Tourn load failed:", tournRes.reason);
      if (venuesRes.status === "rejected") console.error("Venues load failed:", venuesRes.reason);
      if (claimsRes.status === "rejected") console.error("Claims load failed:", claimsRes.reason);
      if (reportsRes.status === "rejected") console.error("Reports load failed:", reportsRes.reason);

      setData({
        users: usersRes.status === "fulfilled" ? usersRes.value : [],
        teams: teamsRes.status === "fulfilled" ? teamsRes.value : [],
        tournaments: tournRes.status === "fulfilled" ? tournRes.value : [],
        venues: venuesRes.status === "fulfilled" ? venuesRes.value : [],
        claims: claimsRes.status === "fulfilled" ? claimsRes.value : [],
        reports: reportsRes.status === "fulfilled" ? reportsRes.value : [],
      });
    } catch (e) {
      console.error("Admin load critical error", e);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (type, id) => {
    const approved = await confirm("Are you sure? This is irreversible.", {
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
    });
    if (!approved) return;
    try {
      const res = await fetch("/api/admin/resources", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, id }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || "Deletion failed");
      loadData();
      notify("Resource deleted.", "success");
    } catch (e) {
      notify(`Error: ${e.message}`, "error");
    }
  };

  const handleClaim = async (claimId, status) => {
    try {
      const res = await fetch(`/api/admin/claims/${claimId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || "Claim update failed");
      loadData();
      notify(`Claim ${status}.`, "success");
    } catch (e) {
      notify(`Error: ${e.message}`, "error");
    }
  };

  const handleReportAction = async (reportId, { status, deleteReview = false }) => {
    const label = deleteReview ? "delete this review" : status;
    const approved = await confirm(`Confirm: ${label}?`, {
      confirmLabel: deleteReview ? "Delete review" : "Confirm",
      cancelLabel: "Cancel",
    });
    if (!approved) return;

    try {
      await adminReviewReportService.resolveReport(reportId, { status, deleteReview });
      loadData();
      notify(deleteReview ? "Review removed." : "Report updated.", "success");
    } catch (e) {
      notify(`Error: ${e.message}`, "error");
    }
  };

  const handlePlaceholderVenueCleanup = async () => {
    const confirmed = await confirm(
      "Remove placeholder venues and attempt to delete their storage images?",
      { confirmLabel: "Run cleanup", cancelLabel: "Cancel" },
    );
    if (!confirmed) return;

    setCleanupRunning(true);
    try {
      const result = await placeholderVenueCleanupService.cleanup();
      await loadData();
      notify(
        `Cleanup complete. Deleted venues: ${result.deletedVenues}. Storage deleted: ${result.storage.deleted}.`,
        "success",
      );
    } catch (e) {
      notify(`Cleanup failed: ${e.message}`, "error");
    } finally {
      setCleanupRunning(false);
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className={styles.loading}>
          <div className="loading-spinner" />
        </div>
      );
    }

    switch (activeTab) {
      case "dashboard":
        return (
          <div>
            <PanelHeader title="System Overview" onRefresh={loadData} />
            <DashboardStats
              stats={{
                usersCount: data.users.length,
                teamsCount: data.teams.length,
                tournamentsCount: data.tournaments.length,
                venuesCount: data.venues.length,
                claimsCount: data.claims.filter((c) => c.status === "pending").length,
                reportsCount: data.reports.filter((r) => r.status === "pending").length,
              }}
            />
          </div>
        );

      case "users":
        return (
          <div>
            <PanelHeader title="User Management" onRefresh={loadData} />
            <AdminDataTable
              columns={[
                {
                  key: "name",
                  label: "Name",
                  render: (u) => <span className={tableStyles.cellStrong}>{u.name}</span>,
                },
                { key: "email", label: "Email" },
                {
                  key: "role",
                  label: "Role",
                  render: (u) => (
                    <span className={`badge badge-${u.role || "user"}`}>
                      {(u.role || "User").toUpperCase()}
                    </span>
                  ),
                },
                {
                  key: "created_at",
                  label: "Joined",
                  render: (u) =>
                    new Date(u.created_at || Date.now()).toLocaleDateString(),
                },
              ]}
              data={data.users}
              onDelete={() => notify("Deletion disabled for safety in this demo.", "warning")}
              emptyMessage="No users found."
            />
          </div>
        );

      case "venues":
        return (
          <div>
            <PanelHeader
              title="Venue Management"
              onRefresh={loadData}
              rightActions={
                <button
                  type="button"
                  onClick={handlePlaceholderVenueCleanup}
                  className={`btn-secondary ${tableStyles.actionBtn}`}
                  disabled={cleanupRunning}
                >
                  {cleanupRunning ? "Cleaning..." : "Remove Placeholder Venues"}
                </button>
              }
            />
            <AdminDataTable
              columns={[
                { key: "name", label: "Venue" },
                { key: "sport", label: "Sport" },
                { key: "location", label: "Location" },
                {
                  key: "owner_id",
                  label: "Status",
                  render: (v) =>
                    v.owner_id ? (
                      <span className={styles.ownerClaimed}>Owner claimed</span>
                    ) : (
                      <span className={styles.ownerUnclaimed}>Unclaimed</span>
                    ),
                },
              ]}
              data={data.venues}
              onDelete={(v) => handleDelete("venue", v.id)}
              actions={(v) => (
                <button
                  type="button"
                  className={`btn-secondary ${tableStyles.actionBtn}`}
                  onClick={() =>
                    window.open(`/venues/${v.id}`, "_blank", "noopener,noreferrer")
                  }
                >
                  View
                </button>
              )}
              emptyMessage="No venues found."
            />
          </div>
        );

      case "teams":
        return (
          <div>
            <PanelHeader title="Team Registry" onRefresh={loadData} />
            <AdminDataTable
              columns={[
                { key: "name", label: "Team Name" },
                { key: "sport", label: "Sport" },
                {
                  key: "members",
                  label: "Size",
                  render: (t) => t.members?.length || 0,
                },
              ]}
              data={data.teams}
              onDelete={(t) => handleDelete("team", t.id)}
              emptyMessage="No teams found."
            />
          </div>
        );

      case "tournaments":
        return (
          <div>
            <PanelHeader title="Tournament Registry" onRefresh={loadData} />
            <AdminDataTable
              columns={[
                { key: "name", label: "Name" },
                { key: "sport", label: "Sport" },
                {
                  key: "teams",
                  label: "Teams",
                  render: (t) => t.teams?.length || 0,
                },
              ]}
              data={data.tournaments}
              onDelete={(t) => handleDelete("tournament", t.id)}
              emptyMessage="No tournaments found."
            />
          </div>
        );

      case "claims":
        return (
          <div>
            <PanelHeader title="Business Verification Requests" onRefresh={loadData} />
            <AdminDataTable
              columns={[
                { key: "business_name", label: "Business" },
                {
                  key: "requester",
                  label: "Requester",
                  render: (c) => c.profile?.name || c.contact_email,
                },
                {
                  key: "venue",
                  label: "Target Venue",
                  render: (c) => c.venue?.name || "Unknown Venue",
                },
                {
                  key: "status",
                  label: "Status",
                  render: (c) => <StatusBadge status={c.status} />,
                },
              ]}
              data={data.claims}
              actions={(c) =>
                c.status === "pending" && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleClaim(c.id, "approved")}
                      className={tableStyles.approveBtn}
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => handleClaim(c.id, "rejected")}
                      className={tableStyles.rejectBtn}
                    >
                      Reject
                    </button>
                  </>
                )
              }
              emptyMessage="No claim requests."
            />
          </div>
        );

      case "reports":
        return (
          <div>
            <PanelHeader title="Review Reports Queue" onRefresh={loadData} />
            <AdminDataTable
              columns={[
                {
                  key: "reason",
                  label: "Report reason",
                  render: (r) => (
                    <div className={styles.reportReason}>{r.reason}</div>
                  ),
                },
                {
                  key: "review",
                  label: "Review content",
                  render: (r) =>
                    r.review ? (
                      <div>
                        <div className={tableStyles.cellStrong}>
                          {r.review.rating}/5 · {r.review.comment?.slice(0, 120)}
                          {r.review.comment?.length > 120 ? "…" : ""}
                        </div>
                        <div className={styles.reportMeta}>
                          By {r.review.author?.name || "Unknown"} ·{" "}
                          {r.review.location_type} #{r.review.location_id}
                        </div>
                      </div>
                    ) : (
                      <span className={tableStyles.cellMuted}>Review removed</span>
                    ),
                },
                {
                  key: "reporter",
                  label: "Reporter",
                  render: (r) => r.reporter?.name || r.reporter?.email || "Unknown",
                },
                {
                  key: "status",
                  label: "Status",
                  render: (r) => <StatusBadge status={r.status} />,
                },
                {
                  key: "created_at",
                  label: "Filed",
                  render: (r) => new Date(r.created_at).toLocaleDateString(),
                },
              ]}
              data={data.reports}
              actions={(r) =>
                r.status === "pending" && (
                  <>
                    <button
                      type="button"
                      className={tableStyles.dismissBtn}
                      onClick={() =>
                        handleReportAction(r.id, { status: "dismissed" })
                      }
                    >
                      Dismiss
                    </button>
                    {r.review && (
                      <button
                        type="button"
                        className={tableStyles.deleteBtn}
                        onClick={() =>
                          handleReportAction(r.id, {
                            status: "reviewed",
                            deleteReview: true,
                          })
                        }
                      >
                        Delete review
                      </button>
                    )}
                    <button
                      type="button"
                      className={tableStyles.approveBtn}
                      onClick={() =>
                        handleReportAction(r.id, { status: "reviewed" })
                      }
                    >
                      Mark reviewed
                    </button>
                  </>
                )
              }
              emptyMessage="No review reports in the queue."
            />
          </div>
        );

      default:
        return <div>Select a tab</div>;
    }
  };

  return (
    <main className={styles.main}>
      <AdminSidebar activeTab={activeTab} onTabChange={setActiveTab} />

      <div className={styles.content}>
        <div className={styles.topBar}>
          {currentUser && (
            <div className={`glass-panel ticket-card ${styles.userBadge}`}>
              <div
                className={`${styles.statusDot} ${
                  currentUser.role === "admin"
                    ? styles.statusDotAdmin
                    : styles.statusDotUser
                }`}
              />
              <span className={styles.userName}>
                {currentUser.name} ({currentUser.role || "user"})
              </span>
            </div>
          )}
        </div>
        {renderContent()}
      </div>
    </main>
  );
}
