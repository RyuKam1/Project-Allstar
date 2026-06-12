"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Navbar from "@/components/Layout/Navbar";
import { businessService } from "@/services/businessService";
import { venueService } from "@/services/venueService";
import { communityLocationService } from "@/services/communityLocationService";
import { useNotificationCenter } from "@/components/UI/NotificationCenter";
import Icon from "@/components/UI/Icon";
import { Field, EmptyState, SkeletonList, Tag } from "@/components/UI/primitives";
import { sanitizeHttpUrl } from "@/lib/security/inputSanitizer";
import styles from "./claim.module.css";

async function searchClaimableVenues(query) {
  const [official, community] = await Promise.all([
    venueService.searchVenues(query),
    communityLocationService.searchLocations(query),
  ]);

  return [
    ...official.map((v) => ({ ...v, _claimType: "business" })),
    ...community.map((v) => ({ ...v, _claimType: "community" })),
  ];
}

function ClaimVenueContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { notify } = useNotificationCenter();

  const initialVenueId = searchParams.get("id");
  const initialVenueType = searchParams.get("type");

  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState([]);
  const [selectedVenue, setSelectedVenue] = useState(null);
  const [venueType, setVenueType] = useState(initialVenueType || "business");
  const [isSearching, setIsSearching] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    businessName: "",
    contactEmail: "",
    contactPhone: "",
    website: "",
  });
  const [proofFile, setProofFile] = useState(null);

  useEffect(() => {
    if (!initialVenueId) return;

    const fetchVenue = async () => {
      const table =
        initialVenueType === "community" ? "community_locations" : "venues";
      const { data, error } = await supabase
        .from(table)
        .select("*")
        .eq("id", initialVenueId)
        .single();

      if (data && !error) {
        setSelectedVenue(data);
        setVenueType(initialVenueType || "business");
      }
    };

    fetchVenue();
  }, [initialVenueId, initialVenueType]);

  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setResults([]);
      return undefined;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const merged = await searchClaimableVenues(trimmed);
        setResults(merged);
      } catch (error) {
        console.error(error);
        notify("Could not search venues. Try again.", "error");
      } finally {
        setIsSearching(false);
      }
    }, 320);

    return () => clearTimeout(timer);
  }, [searchQuery, notify]);

  const handleSelectVenue = (venue) => {
    setSelectedVenue(venue);
    setVenueType(venue._claimType || "business");
  };

  const handleClaimSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const claim = await businessService.claimVenue(selectedVenue.id, formData, venueType);

      const websiteUrl = formData.website?.trim()
        ? sanitizeHttpUrl(formData.website.trim(), 500)
        : '';
      if (formData.website?.trim() && !websiteUrl) {
        throw new Error('Enter a valid website URL (http or https).');
      }

      // Attach verification evidence (optional but strongly encouraged).
      const evidenceJobs = [];
      if (websiteUrl) {
        evidenceJobs.push(
          businessService.addClaimEvidence(claim.id, { type: "domain", payload: websiteUrl }),
        );
      }
      if (proofFile) {
        evidenceJobs.push(businessService.addClaimEvidence(claim.id, { type: "license", file: proofFile }));
      }
      if (evidenceJobs.length) {
        try {
          await Promise.all(evidenceJobs);
        } catch (evErr) {
          // The claim is filed; surface evidence issues without losing the claim.
          notify(`Claim filed, but evidence upload failed: ${evErr.message}`, "warning");
        }
      }

      notify("Claim request submitted. We will verify your ownership before transferring control.", "success");
      router.push("/business/dashboard");
    } catch (error) {
      console.error(error);
      notify(`Error submitting claim: ${error.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const currentStep = selectedVenue ? 2 : 1;

  return (
    <main className={styles.main}>
      <Navbar />
      <div className={`container ${styles.container}`}>
        <div className={styles.header}>
          <h1 className={styles.title}>Claim your venue</h1>
          <p className={styles.subtitle}>
            Find your listing on Project AllStar, verify ownership, and unlock
            the business dashboard.
          </p>
        </div>

        <div className={styles.steps} aria-label="Claim progress">
          <span
            className={`${styles.step} ${currentStep >= 1 ? styles.stepActive : ""} ${currentStep > 1 ? styles.stepDone : ""}`}
          >
            <span className={styles.stepNum}>1</span>
            Find venue
          </span>
          <span
            className={`${styles.step} ${currentStep >= 2 ? styles.stepActive : ""}`}
          >
            <span className={styles.stepNum}>2</span>
            Verify details
          </span>
        </div>

        {!selectedVenue && (
          <div className={`glass-panel ticket-card ${styles.panel}`}>
            <form
              onSubmit={(e) => e.preventDefault()}
              className={styles.searchForm}
            >
              <input
                type="search"
                placeholder="Search by venue name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={styles.searchInput}
                aria-label="Search venues to claim"
              />
              <button
                type="button"
                className={`btn-primary ${styles.searchBtn}`}
                disabled={isSearching}
                aria-label="Search venues"
              >
                <Icon name="search" size={18} />
              </button>
            </form>

            <div className={styles.results}>
              {isSearching && (
                <div className={styles.searching}>
                  <span className="jumping-dots">Searching</span>
                </div>
              )}

              {!isSearching &&
                results.map((venue) => (
                  <button
                    key={`${venue._claimType}-${venue.id}`}
                    type="button"
                    onClick={() => handleSelectVenue(venue)}
                    className={styles.resultBtn}
                    aria-label={`Select venue ${venue.name}`}
                  >
                    <div className={styles.resultName}>{venue.name}</div>
                    <div className={styles.resultMeta}>
                      <Tag>
                        {venue._claimType === "community"
                          ? "Community"
                          : "Official"}
                      </Tag>
                      {(venue.sports?.join(", ") || venue.sport || "Sports venue")}
                    </div>
                  </button>
                ))}

              {!isSearching &&
                searchQuery.trim().length > 0 &&
                results.length === 0 && (
                  <EmptyState
                    icon="search"
                    title="No venues found"
                    description="Try a different name, or add your venue on the map first."
                    actionLabel="Browse venues"
                    actionHref="/venues"
                  />
                )}

              {!isSearching && searchQuery.trim().length === 0 && (
                <EmptyState
                  icon="location"
                  title="Search to get started"
                  description="Enter your venue name to find the listing you want to claim."
                />
              )}
            </div>
          </div>
        )}

        {selectedVenue && (
          <div className={`glass-panel ticket-card ${styles.panel}`}>
            <button
              type="button"
              onClick={() => setSelectedVenue(null)}
              className={styles.backBtn}
            >
              ← Back to search
            </button>

            <h2 className={styles.claimTitle}>
              Claiming{" "}
              <span className="primary-gradient-text">{selectedVenue.name}</span>
            </h2>

            <form onSubmit={handleClaimSubmit} className={styles.claimForm}>
              <Field id="claim-business-name" label="Official business name" required>
                <input
                  id="claim-business-name"
                  required
                  type="text"
                  value={formData.businessName}
                  onChange={(e) =>
                    setFormData({ ...formData, businessName: e.target.value })
                  }
                  className={styles.input}
                  placeholder="e.g. Downtown Sports LLC"
                />
              </Field>

              <Field id="claim-email" label="Business email" required>
                <input
                  id="claim-email"
                  required
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) =>
                    setFormData({ ...formData, contactEmail: e.target.value })
                  }
                  className={styles.input}
                  placeholder="official@venue.com"
                />
              </Field>

              <Field id="claim-phone" label="Phone number" required>
                <input
                  id="claim-phone"
                  required
                  type="tel"
                  value={formData.contactPhone}
                  onChange={(e) =>
                    setFormData({ ...formData, contactPhone: e.target.value })
                  }
                  className={styles.input}
                  placeholder="(555) 123-4567"
                />
              </Field>

              <Field id="claim-website" label="Business website or domain">
                <input
                  id="claim-website"
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  className={styles.input}
                  placeholder="https://yourvenue.com"
                />
              </Field>

              <Field id="claim-proof" label="Proof of ownership (license, utility bill, etc.)">
                <input
                  id="claim-proof"
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                  className={styles.input}
                />
              </Field>

              <div className={styles.disclaimer}>
                By submitting, you confirm that you are the authorized
                representative of this venue. Evidence is stored privately and
                only reviewed by our trust team. False claims may result in
                account suspension.
              </div>

              <button
                type="submit"
                className={`btn-primary ${styles.submitBtn}`}
                disabled={loading}
              >
                {loading ? "Submitting..." : "Submit claim request"}
              </button>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}

export default function ClaimVenuePage() {
  return (
    <React.Suspense
      fallback={
        <div className={styles.suspenseWrap}>
          <SkeletonList rows={4} />
        </div>
      }
    >
      <ClaimVenueContent />
    </React.Suspense>
  );
}
