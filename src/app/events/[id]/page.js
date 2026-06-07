"use client";
import React, { useState, useEffect } from 'react';
import Navbar from "@/components/Layout/Navbar";
import Icon from "@/components/UI/Icon";
import { useParams, useRouter } from 'next/navigation';
import { eventService } from "@/services/eventService";
import { useAuth } from "@/context/AuthContext";
import { useNotificationCenter } from "@/components/UI/NotificationCenter";
import {
  Breadcrumbs,
  Tag,
  Button,
  EmptyState,
  SkeletonEventDetail,
} from '@/components/UI/primitives';

import styles from './event-detail.module.css';

function getSportInitial(sport) {
  return (sport || "E").charAt(0).toUpperCase();
}

export default function EventDetails() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { notify, confirm } = useNotificationCenter();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [heroImageFailed, setHeroImageFailed] = useState(false);

  const [showPlayerModal, setShowPlayerModal] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  useEffect(() => {
    if (params?.id) {
      loadEvent();
    }
  }, [params?.id]);

  const loadEvent = async () => {
    setLoading(true);
    setHeroImageFailed(false);
    try {
      const data = await eventService.getEventById(params.id);
      setEvent(data);
    } catch (error) {
      console.error("Failed to load event", error);
      setEvent(null);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!user) {
      notify("Please login to register.", "warning");
      router.push('/login');
      return;
    }
    const shouldRegister = await confirm(`Register for ${event.title}?`, {
      confirmLabel: "Register",
      cancelLabel: "Not now",
    });
    if (shouldRegister) {
      setRegistering(true);
      try {
        const updated = await eventService.registerForEvent(event.id, user);
        setEvent(updated);
        notify("Successfully registered.", "success");
      } catch (err) {
        notify(err.message, "error");
      } finally {
        setRegistering(false);
      }
    }
  };

  const openPlayerModal = (player) => {
    setSelectedPlayer(player);
    setShowPlayerModal(true);
  };

  const getFirstName = (fullName) => {
    if (!fullName) return "Athlete";
    return fullName.split(' ')[0];
  };

  const getEventImagePath = (title) => {
    if (!title) return null;
    return `/events/${title}.webp`;
  };

  if (loading) {
    return (
      <main className={styles.main}>
        <Navbar />
        <SkeletonEventDetail />
      </main>
    );
  }

  if (!event) {
    return (
      <main className={styles.main}>
        <Navbar />
        <div className={`container ${styles.notFoundWrap}`}>
          <EmptyState
            icon="calendar"
            title="Event not found"
            description="This event may have been removed or the link is incorrect."
            actionLabel="Browse events"
            actionHref="/events"
          />
        </div>
      </main>
    );
  }

  const spotsLeft = event.maxSpots - event.attendees.length;
  const isFull = spotsLeft <= 0;
  const isRegistered = user && event.attendees.some(a => a.id === user.id);

  return (
    <main className={styles.main}>
      <Navbar />

      <div className={styles.hero}>
        {!heroImageFailed ? (
          <img
            src={getEventImagePath(event.title)}
            alt=""
            className={styles.heroImage}
            onError={() => setHeroImageFailed(true)}
          />
        ) : (
          <div className={styles.heroFallback} aria-hidden="true">
            {getSportInitial(event.sport)}
          </div>
        )}
        <div className={styles.heroOverlay} aria-hidden="true" />

        <div className={`container ${styles.heroContent}`}>
          <Breadcrumbs
            items={[
              { label: "Events", href: "/events" },
              { label: event.title },
            ]}
          />
          <Tag className={styles.heroTag}>{event.type}</Tag>
          <h1 className={styles.heroTitle}>{event.title}</h1>
          <div className={styles.heroMeta}>
            <span className={styles.metaItem}>
              <Icon name="calendar" size={18} className="icon-inline" />
              {event.date} at {event.time}
            </span>
            <span className={styles.metaItem}>
              <Icon name="location" size={18} className="icon-inline" />
              {event.location}
            </span>
            <span className={styles.metaItem}>
              <Icon name="medal" size={18} className="icon-inline" />
              {event.sport}
            </span>
          </div>
        </div>
      </div>

      <div className={`container ${styles.detailsLayout}`}>
        <div className={`glass-panel ticket-card ${styles.section}`}>
          <h2 className={styles.sectionTitle}>About this Event</h2>
          <p className={styles.description}>{event.description}</p>

          <h3 className={styles.subsectionTitle}>Rules & Info</h3>
          <ul className={styles.rulesList}>
            <li>No equipment provided, please bring your own.</li>
            <li>Arrive 15 minutes early for check-in.</li>
            <li>Respect the venue and other participants.</li>
          </ul>
        </div>

        <div className={styles.sidebar}>
          <div className={`glass-panel ticket-card ${styles.regCard}`}>
            <h3 className={styles.cardTitle}>Registration</h3>

            <div className={styles.regRow}>
              <span className={styles.regLabel}>Cost</span>
              <span className={styles.regValue}>{event.cost}</span>
            </div>
            <div className={styles.regRow}>
              <span className={styles.regLabel}>Reward</span>
              <span className={styles.regReward}>{event.reward}</span>
            </div>
            <div className={`${styles.regRow} ${styles.regRowLast}`}>
              <span className={styles.regLabel}>Spots Left</span>
              <span className={isFull ? styles.spotsFull : styles.spotsOpen}>
                {spotsLeft} / {event.maxSpots}
              </span>
            </div>

            {isRegistered ? (
              <Button fullWidth disabled className={styles.registeredButton}>
                <Icon name="check" size={18} className="icon-inline" />
                You&apos;re going
              </Button>
            ) : (
              <Button
                fullWidth
                onClick={handleRegister}
                loading={registering}
                disabled={isFull || registering}
              >
                {isFull ? 'Sold Out' : 'Register Now'}
              </Button>
            )}
          </div>

          <div className={`glass-panel ${styles.attendeesCard}`}>
            <h4 className={styles.cardTitle}>Attendees</h4>
            {event.attendees.length === 0 ? (
              <span className={styles.emptyAttendees}>Be the first to join!</span>
            ) : (
              <div className={styles.attendeesGrid}>
                {event.attendees.map(a => (
                  <button
                    type="button"
                    key={a.id}
                    onClick={() => openPlayerModal(a)}
                    className={styles.attendeeItem}
                  >
                    <img
                      src={a.avatar || `https://ui-avatars.com/api/?name=${a.name}&background=random`}
                      alt={a.name}
                      className={styles.attendeeAvatar}
                    />
                    <span className={styles.attendeeName}>
                      {getFirstName(a.name)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showPlayerModal && selectedPlayer && (
        <div className={styles.modalOverlay} onClick={() => setShowPlayerModal(false)}>
          <div
            className={`glass-panel ${styles.modalContent}`}
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="player-modal-title"
          >
            <button
              type="button"
              onClick={() => setShowPlayerModal(false)}
              className={styles.closeButton}
              aria-label="Close"
            >
              <Icon name="x" size={18} />
            </button>

            <div className={styles.playerInfo}>
              <button
                type="button"
                onClick={() => router.push(`/players/${selectedPlayer.id}`)}
                className={styles.playerProfileLink}
                title="View Full Profile"
              >
                <img
                  src={selectedPlayer.avatar || `https://ui-avatars.com/api/?name=${selectedPlayer.name}&background=random`}
                  alt={selectedPlayer.name}
                  className={styles.playerAvatarLarge}
                />
                <h2 id="player-modal-title" className={styles.playerName}>
                  {selectedPlayer.name}
                </h2>
              </button>

              <div className={styles.playerRole}>
                {selectedPlayer.sport || 'Athlete'} | {selectedPlayer.positions || 'Participant'}
              </div>
              <p className={styles.playerBio}>
                &quot;{selectedPlayer.bio || `Attendee of ${event.title}`}&quot;
              </p>

              <div className={styles.playerStatsGrid}>
                <div className={styles.statItem}>
                  <div className={styles.statLabel}>Height</div>
                  <div className={styles.statValue}>{selectedPlayer.height || '--'}</div>
                </div>
                <div className={styles.statItem}>
                  <div className={styles.statLabel}>Weight</div>
                  <div className={styles.statValue}>{selectedPlayer.weight || '--'}</div>
                </div>
                <div className={styles.statItem}>
                  <div className={styles.statLabel}>Speed</div>
                  <div className={styles.statValue}>{selectedPlayer.speed || '--'}</div>
                </div>
                <div className={styles.statItem}>
                  <div className={styles.statLabel}>Vertical</div>
                  <div className={styles.statValue}>{selectedPlayer.vertical || '--'}</div>
                </div>
              </div>

              <Button fullWidth onClick={() => router.push(`/players/${selectedPlayer.id}`)}>
                View Full Profile
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
