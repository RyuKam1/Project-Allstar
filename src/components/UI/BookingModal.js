"use client";
import { useState } from 'react';

export default function BookingModal({ venue, onClose }) {
  const [step, setStep] = useState(1);
  const [date, setDate] = useState('');

  const handleBook = () => {
    setStep(2);
    setTimeout(() => {
      setStep(3);
    }, 1500);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.8)',
      backdropFilter: 'blur(5px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000
    }} onClick={onClose}>
      <div 
        className="glass-panel" 
        style={{ width: '400px', padding: '2rem', background: '#0a0a0a', border: '1px solid #333' }}
        onClick={(e) => e.stopPropagation()}
      >
        {step === 1 && (
          <>
            <h2 style={{ marginTop: 0 }}>Book {venue.name}</h2>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Date</label>
              <input 
                type="date" 
                value={date}
                onChange={(e) => setDate(e.target.value)}
                style={{ 
                  width: '100%', 
                  padding: '10px', 
                  background: '#222', 
                  border: '1px solid #444', 
                  color: 'white',
                  borderRadius: '8px' 
                }}
              />
            </div>
            <div style={{ marginBottom: '2rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Time Slot</label>
              <select style={{ 
                width: '100%', 
                padding: '10px', 
                background: '#222', 
                border: '1px solid #444', 
                color: 'white',
                borderRadius: '8px' 
              }}>
                <option>10:00 AM - 11:00 AM</option>
                <option>11:00 AM - 12:00 PM</option>
                <option>04:00 PM - 05:00 PM</option>
              </select>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button 
                onClick={onClose}
                style={{ background: 'transparent', border: 'none', color: '#888', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button className="btn-primary" onClick={handleBook}>
                Confirm Booking
              </button>
            </div>
          </>
        )}

        {step === 2 && (
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <div className="spinner" style={{ marginBottom: '1rem' }}>⌛ Processing...</div>
          </div>
        )}

        {step === 3 && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
            <h3 style={{ color: 'var(--color-primary)' }}>Booking Confirmed!</h3>
            <p style={{ color: 'var(--text-muted)' }}>See you at the game.</p>
            <button className="btn-primary" onClick={onClose} style={{ width: '100%', marginTop: '1rem' }}>
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
