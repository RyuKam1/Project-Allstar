"use client";
import { useState } from 'react';

import styles from './booking-modal.module.css';

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
    <div className={styles.overlay} onClick={onClose}>
      <div className={`glass-panel ${styles.modal}`} onClick={(e) => e.stopPropagation()}>
        {step === 1 && (
          <>
            <h2 className={styles.title}>Book {venue.name}</h2>
            
            <div className={styles.formGroup}>
              <label className={styles.label}>Select Date</label>
              <input 
                type="date" 
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={styles.input}
              />
            </div>
            
            <div className={styles.formGroup}>
              <label className={styles.label}>Available Time Slots</label>
              <select className={styles.select}>
                <option>10:00 AM - 11:00 AM</option>
                <option>11:00 AM - 12:00 PM</option>
                <option>04:00 PM - 05:00 PM</option>
                <option>07:00 PM - 08:00 PM</option>
              </select>
            </div>
            
            <div className={styles.actions}>
              <button onClick={onClose} className={styles.cancelBtn}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleBook}>
                Confirm Booking
              </button>
            </div>
          </>
        )}

        {step === 2 && (
          <div className={styles.processing}>
            <div className="spinner"></div>
            <div className={styles.loadingText}>Processing your reservation...</div>
          </div>
        )}

        {step === 3 && (
          <div className={styles.success}>
            <span className={styles.successIcon}>🎉</span>
            <h3 className={styles.successTitle}>Booking Confirmed!</h3>
            <p className={styles.successText}>Your spot is reserved. We've sent a confirmation to your email.</p>
            <button className={`btn-primary ${styles.fullWidthBtn}`} onClick={onClose}>
              Awesome, thanks!
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
