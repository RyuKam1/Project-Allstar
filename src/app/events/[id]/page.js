"use client";
import React, { useState, useEffect } from 'react';
import Navbar from "@/components/Layout/Navbar";
import { useParams, useRouter } from 'next/navigation';
import { eventService } from "@/services/eventService";
import { useAuth } from "@/context/AuthContext";

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
    <main style={{ minHeight: '100vh', background: '#0a0a0a' }}>
      <Navbar />
      
      {/* Hero Header */}
      <div style={{ 
        height: '40vh', 
        background: event.imageGradient, 
        position: 'relative',
        display: 'flex',
        alignItems: 'flex-end',
        paddingBottom: '3rem',
        overflow: 'hidden'
      }}>
         {/* Background Image with Fallback */}
         <img 
            src={getEventImagePath(event.title)} 
            alt="" 
            style={{ 
                position: 'absolute', 
                inset: 0, 
                width: '100%', 
                height: '100%', 
                objectFit: 'cover',
                opacity: 0.4
            }}
            onError={handleImageError}
         />

         <div className="container" style={{ position: 'relative', zIndex: 2 }}>
            <span className="tag" style={{ background: 'white', color: 'black', marginBottom: '1rem', display: 'inline-block' }}>
                {event.type}
            </span>
            <h1 style={{ fontSize: '3rem', fontWeight: '800', textShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
                {event.title}
            </h1>
            <div style={{ display: 'flex', gap: '2rem', marginTop: '1rem', fontSize: '1.1rem', fontWeight: '500' }}>
                <span>📅 {event.date} at {event.time}</span>
                <span>📍 {event.location}</span>
                <span>🏅 {event.sport}</span>
            </div>
         </div>
      </div>

      <div className="container" style={{ marginTop: '-3rem', position: 'relative', zIndex: 10, display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem', paddingBottom: '4rem' }}>
        
        {/* Left Col */}
        <div className="glass-panel" style={{ padding: '2rem' }}>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
             <div className="glass-panel" style={{ padding: '2rem' }}>
                <h3 style={{ marginBottom: '1rem' }}>Registration</h3>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ color: '#888' }}>Cost</span>
                    <span style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>{event.cost}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ color: '#888' }}>Reward</span>
                    <span style={{ color: 'var(--color-accent)' }}>{event.reward}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                    <span style={{ color: '#888' }}>Spots Left</span>
                    <span style={{ color: isFull ? 'red' : '#4ade80' }}>
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

             <div className="glass-panel" style={{ padding: '1.5rem' }}>
                 <h4 style={{ marginBottom: '1rem' }}>Attendees</h4>
                 {event.attendees.length === 0 ? (
                    <span style={{ color: '#666' }}>Be the first to join!</span>
                 ) : (
                    <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(4, 1fr)', 
                        gap: '1rem', 
                        marginTop: '0.5rem' 
                    }}>
                        {event.attendees.map(a => (
                            <div 
                                key={a.id} 
                                onClick={() => openPlayerModal(a)}
                                style={{ 
                                    display: 'flex', 
                                    flexDirection: 'column', 
                                    alignItems: 'center', 
                                    gap: '0.4rem',
                                    cursor: 'pointer'
                                }}
                            >
                                <img 
                                    src={a.avatar || `https://ui-avatars.com/api/?name=${a.name}&background=random`} 
                                    alt={a.name}
                                    style={{ 
                                        width: '50px', 
                                        height: '50px', 
                                        borderRadius: '50%', 
                                        objectFit: 'cover',
                                        border: '2px solid rgba(255,255,255,0.1)',
                                        transition: 'transform 0.2s'
                                    }}
                                    onMouseOver={e => e.currentTarget.style.transform = 'scale(1.1)'}
                                    onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                                />
                                <span style={{ 
                                    fontSize: '0.75rem', 
                                    color: '#ccc', 
                                    textAlign: 'center',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    width: '100%'
                                }}>
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
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)', zIndex: 1000,
          display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem'
        }} onClick={() => setShowPlayerModal(false)}>
          <div 
            className="glass-panel" 
            style={{ width: '100%', maxWidth: '450px', padding: '2rem', position: 'relative' }}
            onClick={e => e.stopPropagation()}
          >
            <button 
              onClick={() => setShowPlayerModal(false)}
              style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: 'white', fontSize: '1.5rem', cursor: 'pointer' }}
            >
              ×
            </button>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <div 
                onClick={() => window.location.href = `/profile?id=${selectedPlayer.id}`}
                style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
                title="View Full Profile"
              >
                <img 
                  src={selectedPlayer.avatar || `https://ui-avatars.com/api/?name=${selectedPlayer.name}&background=random`} 
                  alt={selectedPlayer.name} 
                  style={{ width: '120px', height: '120px', borderRadius: '50%', border: '4px solid var(--color-primary)', objectFit: 'cover', marginBottom: '1rem', transition: 'transform 0.2s' }}
                  onMouseOver={e => e.currentTarget.style.transform = 'scale(1.05)'} 
                  onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
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
              <div style={{ 
                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', width: '100%', 
                background: 'rgba(255,255,255,0.05)', padding: '1.5rem', borderRadius: '12px', marginBottom: '1.5rem'
              }}>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Height</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{selectedPlayer.height || '--'}</div>
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Weight</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{selectedPlayer.weight || '--'}</div>
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Speed</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{selectedPlayer.speed || '--'}</div>
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Vertical</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{selectedPlayer.vertical || '--'}</div>
                </div>
              </div>

              <button 
                className="btn-primary" 
                style={{ width: '100%' }}
                onClick={() => window.location.href = `/profile?id=${selectedPlayer.id}`}
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
