"use client";
import React, { useState, useEffect } from 'react';
import Navbar from "@/components/Layout/Navbar";
import { useParams, useRouter } from 'next/navigation';
import { eventService } from "@/services/eventService";
import { useAuth } from "@/context/AuthContext";

import styles from './event-detail.module.css';

export default function EventDetails() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);

  // Player Modal State
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  useEffect(() => {
    if (params?.id) {
      loadEvent();
    }
  }, [params?.id]);

  const loadEvent = async () => {
    try {
      const data = await eventService.getEventById(params.id);
      setEvent(data);
    } catch (error) {
      console.error("Failed to load event", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!user) {
        alert("Please login to register.");
        router.push('/login');
        return;
    }
    if (confirm(`Register for ${event.title}?`)) {
        setRegistering(true);
        try {
            const updated = await eventService.registerForEvent(event.id, user);
            setEvent(updated);
            alert("Successfully registered!");
        } catch (err) {
            alert(err.message);
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

  const handleImageError = (e) => {
    e.target.style.display = 'none';
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '100px' }}>Loading...</div>;
  if (!event) return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '100px' }}>Event not found</div>;

  const spotsLeft = event.maxSpots - event.attendees.length;
  const isFull = spotsLeft <= 0;
  const isRegistered = user && event.attendees.some(a => a.id === user.id);

  return (
    <main className={styles.main}>
      <Navbar />
      
      {/* Hero Header */}
      <div className={styles.hero} style={{ background: event.imageGradient }}>
         {/* Background Image with Fallback */}
         <img 
            src={getEventImagePath(event.title)} 
            alt="" 
            className={styles.heroImage}
            onError={handleImageError}
         />

         <div className={`container ${styles.heroContent}`}>
            <span className="tag" style={{ background: 'white', color: 'black', marginBottom: '1rem', display: 'inline-block' }}>
                {event.type}
            </span>
            <h1 className={styles.heroTitle}>
                {event.title}
            </h1>
            <div className={styles.heroMeta}>
                <span>📅 {event.date} at {event.time}</span>
                <span>📍 {event.location}</span>
                <span>🏅 {event.sport}</span>
            </div>
         </div>
      </div>

      <div className={`container ${styles.detailsLayout}`}>
        
        {/* Left Col */}
        <div className={`glass-panel ${styles.section}`}>
            <h2>About this Event</h2>
            <p style={{ lineHeight: '1.6', color: '#ccc', marginBottom: '2rem' }}>
                {event.description}
            </p>

            <h3>Rules & Info</h3>
            <ul style={{ paddingLeft: '1.2rem', color: '#ccc', lineHeight: '1.6' }}>
                <li>No equipment provided, please bring your own.</li>
                <li>Arrive 15 minutes early for check-in.</li>
                <li>Respect the venue and other participants.</li>
            </ul>
        </div>

        {/* Right Col */}
        <div className={styles.sidebar}>
             <div className={`glass-panel ${styles.regCard}`}>
                <h3 style={{ marginBottom: '1rem' }}>Registration</h3>
                
                <div className={styles.regRow}>
                    <span style={{ color: '#888' }}>Cost</span>
                    <span className={styles.regValue}>{event.cost}</span>
                </div>
                <div className={styles.regRow}>
                    <span style={{ color: '#888' }}>Reward</span>
                    <span style={{ color: 'var(--color-accent)', fontWeight: 'bold' }}>{event.reward}</span>
                </div>
                <div className={styles.regRow} style={{ marginBottom: '1.5rem' }}>
                    <span style={{ color: '#888' }}>Spots Left</span>
                    <span style={{ color: isFull ? 'red' : '#4ade80', fontWeight: 'bold' }}>
                        {spotsLeft} / {event.maxSpots}
                    </span>
                </div>

                {isRegistered ? (
                    <button className="btn-primary" disabled style={{ width: '100%', background: '#4ade80', color: 'black' }}>
                        ✅ You are Going!
                    </button>
                ) : (
                    <button 
                        className="btn-primary" 
                        style={{ width: '100%', opacity: (isFull || registering) ? 0.5 : 1 }}
                        disabled={isFull || registering}
                        onClick={handleRegister}
                    >
                        {isFull ? 'Sold Out' : (registering ? 'Registering...' : 'Register Now')}
                    </button>
                )}
             </div>

             <div className={`glass-panel ${styles.attendeesCard}`}>
                 <h4 style={{ marginBottom: '1rem' }}>Attendees</h4>
                 {event.attendees.length === 0 ? (
                    <span style={{ color: '#666' }}>Be the first to join!</span>
                 ) : (
                    <div className={styles.attendeesGrid}>
                        {event.attendees.map(a => (
                            <div 
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
                            </div>
                        ))}
                    </div>
                 )}
             </div>
        </div>

      </div>

      {/* Athlete Info Modal */}
      {showPlayerModal && selectedPlayer && (
        <div className={styles.modalOverlay} onClick={() => setShowPlayerModal(false)}>
          <div 
            className={`glass-panel ${styles.modalContent}`}
            onClick={e => e.stopPropagation()}
          >
            <button 
              onClick={() => setShowPlayerModal(false)}
              className={styles.closeButton}
            >
              ×
            </button>

            <div className={styles.playerInfo} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div 
                onClick={() => router.push(`/profile?id=${selectedPlayer.id}`)}
                style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
                title="View Full Profile"
              >
                <img 
                  src={selectedPlayer.avatar || `https://ui-avatars.com/api/?name=${selectedPlayer.name}&background=random`} 
                  alt={selectedPlayer.name} 
                  className={styles.playerAvatarLarge}
                />
                <h2 style={{ margin: 0, fontSize: '2rem', textDecoration: 'underline', textUnderlineOffset: '4px' }}>
                    {selectedPlayer.name}
                </h2>
              </div>

              <div style={{ color: 'var(--color-primary)', fontWeight: 'bold', marginBottom: '0.2rem', marginTop: '0.5rem' }}>
                 {selectedPlayer.sport || 'Athlete'} | {selectedPlayer.positions || 'Participant'}
              </div>
              <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontStyle: 'italic' }}>
                "{selectedPlayer.bio || `Attendee of ${event.title}`}"
              </p>

              {/* Physical Stats Grid */}
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

              <button 
                className="btn-primary" 
                style={{ width: '100%' }}
                onClick={() => router.push(`/profile?id=${selectedPlayer.id}`)}
              >
                View Full Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
