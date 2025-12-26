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
        paddingBottom: '3rem'
      }}>
         <div className="container">
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
                 <h4>Attendees</h4>
                 <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '1rem' }}>
                    {event.attendees.length === 0 && <span style={{ color: '#666' }}>Be the first to join!</span>}
                    {event.attendees.map(a => (
                        <div key={a.id} style={{ 
                            width: '32px', height: '32px', borderRadius: '50%', background: '#333',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem',
                            border: '1px solid #555'
                        }} title={a.name}>
                            {a.name.charAt(0)}
                        </div>
                    ))}
                 </div>
             </div>
        </div>

      </div>
    </main>
  );
}
