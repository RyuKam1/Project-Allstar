"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Navbar from "@/components/Layout/Navbar";
import { getPublicProfile } from "@/services/publicProfileService";
import { teamService } from "@/services/teamService";
import { Breadcrumbs, EmptyState, SkeletonProfile, Tag } from "@/components/UI/primitives";
import profileStyles from "@/app/profile/profile.module.css";
import styles from "./player-profile.module.css";

export default function PlayerProfilePage() {
  const { id } = useParams();
  const [profile, setProfile] = useState(null);
  const [teams, setTeams] = useState([]);
  const [careerWins, setCareerWins] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const load = async () => {
      setLoading(true);
      try {
        const publicProfile = await getPublicProfile(id);
        if (!publicProfile) {
          setProfile(null);
          return;
        }

        setProfile(publicProfile);
        const userTeams = await teamService.getUserTeams(id);
        setTeams(userTeams);

        const wins = [];
        userTeams.forEach((team) => {
          team.wins?.forEach((win) => {
            wins.push({ ...win, teamName: team.name, teamSport: team.sport });
          });
        });
        wins.sort((a, b) => new Date(b.date) - new Date(a.date));
        setCareerWins(wins);
      } catch (error) {
        console.error(error);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  if (loading) {
    return (
      <main className={profileStyles.main}>
        <Navbar />
        <div className={`container ${profileStyles.container}`}>
          <SkeletonProfile />
        </div>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className={profileStyles.main}>
        <Navbar />
        <div className={`container ${styles.notFoundWrap}`}>
          <EmptyState
            icon="user"
            title="Player not found"
            description="This profile may be private, removed, or the link is incorrect."
            actionLabel="Browse teams"
            actionHref="/teams"
          />
        </div>
      </main>
    );
  }

  return (
    <main className={profileStyles.main}>
      <Navbar />
      <div className={`container ${profileStyles.container}`}>
        <div className={styles.breadcrumbWrap}>
          <Breadcrumbs
            items={[
              { label: "Teams", href: "/teams" },
              { label: profile.name },
            ]}
          />
        </div>

        <div className={`${profileStyles.profileGrid} list-stagger`}>
          <div className={profileStyles.leftColumn}>
            <div
              className={`glass-panel ticket-card ${profileStyles.glassPanel} ${profileStyles.identityCard}`}
            >
              <div className={profileStyles.avatarContainer}>
                <img
                  src={
                    profile.avatar ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name || "Player")}&background=random&size=200`
                  }
                  alt={profile.name}
                  className={profileStyles.avatarImage}
                />
              </div>
              <h1 className={profileStyles.userName}>{profile.name}</h1>
              <p className={profileStyles.userBio}>
                {profile.bio || "Athlete on Project AllStar"}
              </p>
              <div className={styles.metaTags}>
                {profile.sport && <Tag accent>{profile.sport}</Tag>}
                {profile.is_verified_business && <Tag>Verified Business</Tag>}
              </div>
            </div>

            {teams.length > 0 && (
              <div className={`glass-panel ticket-card ${profileStyles.glassPanel}`}>
                <h3 className={styles.sectionTitle}>Teams</h3>
                <ul className={styles.teamList}>
                  {teams.map((team) => (
                    <li key={team.id}>
                      <Link href={`/teams/${team.id}`} className={styles.teamLink}>
                        <span className={styles.teamName}>{team.name}</span>
                        <span className={styles.teamSport}>{team.sport}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className={profileStyles.rightColumn}>
            <div className={`glass-panel ticket-card ${profileStyles.glassPanel}`}>
              <h2 className={profileStyles.sectionTitle}>
                Career highlights
                <span className={profileStyles.winCount}>{careerWins.length} wins</span>
              </h2>

              {careerWins.length === 0 ? (
                <div className={profileStyles.emptyState}>
                  No wins recorded yet.
                </div>
              ) : (
                <div
                  className={profileStyles.historyScroll}
                  tabIndex={0}
                  aria-label="Career highlights list"
                >
                  <div className={`${profileStyles.historyList} list-stagger`}>
                  {careerWins.map((win) => (
                    <div key={win.id} className={profileStyles.historyItem}>
                      <div>
                        <div className={profileStyles.historyTitle}>
                          {win.description}
                        </div>
                        <div className={profileStyles.historySubtitle}>
                          {win.teamName} · {win.teamSport}
                        </div>
                      </div>
                      <div className={profileStyles.historyMeta}>
                        <div className={profileStyles.metaCategory}>
                          {win.category || "Match"}
                        </div>
                        <div className={profileStyles.metaDate}>
                          {new Date(win.date).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
