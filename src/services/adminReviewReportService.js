export const adminReviewReportService = {
  getAllReports: async () => {
    const res = await fetch("/api/admin/review-reports");
    const payload = await res.json();
    if (!res.ok) throw new Error(payload.error || "Failed to load review reports");
    return payload.reports || [];
  },

  resolveReport: async (reportId, { status, deleteReview = false }) => {
    const res = await fetch(`/api/admin/review-reports/${reportId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, deleteReview }),
    });
    const payload = await res.json();
    if (!res.ok) throw new Error(payload.error || "Failed to update report");
    return payload;
  },
};
