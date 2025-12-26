"use client";
import React, { useState, useEffect } from 'react';
import Navbar from "@/components/Layout/Navbar";
import BookingModal from "@/components/UI/BookingModal";
import { useParams } from 'next/navigation';
import { venueService } from "@/services/venueService";
import { useAuth } from "@/context/AuthContext";
import styles from './venue-detail.module.css';
import { extractDominantColor } from '@/utils/colorUtils';

export default function VenueDetails() {
  const params = useParams();
  const { user } = useAuth();
  const [showBooking, setShowBooking] = useState(false);
  const [venue, setVenue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [headerColor, setHeaderColor] = useState(null);

  useEffect(() => {
    if (params?.id) {
      loadVenue();
    }
  }, [params?.id]);

  useEffect(() => {
    if (venue && venue.gallery && venue.gallery.length > 0) {
      // Extract color from the first image
      const imageSrc = venue.gallery[0];
      extractDominantColor(imageSrc).then(color => {
        setHeaderColor(color);
      });
    }
  }, [venue]);

  const loadVenue = async () => {
    try {
      const data = await venueService.getVenueById(params.id);
      setVenue(data);
    } catch (error) {
      console.error("Failed to load venue", error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("File is too large (Max 5MB)");
      return;
    }

    setUploading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const updatedVenue = await venueService.uploadVenueImage(venue.id, reader.result);
        setVenue(updatedVenue);
      } catch (err) {
        alert("Failed to upload image");
      } finally {
        setUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  if (loading) {
    return (
      <main className={styles.loading}>
        <h2>Loading venue...</h2>
      </main>
    );
  }

  if (!venue) {
    return (
      <main className={styles.loading}>
        <h2>Venue not found</h2>
      </main>
    );
  }

  // Construct gradient: dynamic color (if found) or fallback venue gradient
  // Use a specialized gradient that blends the color
  const bgStyle = headerColor 
    ? { background: `linear-gradient(to right, ${headerColor}, #1a1a2e)` }
    : { background: venue.imageGradient };

  return (
    <main className={styles.main}>
      <Navbar />
      
      {/* Hero Header */}
      <div 
        className={styles.hero}
        style={bgStyle}
      >
        {/* Helper visual if gallery has images, maybe show first one as BG? For now keep gradient as base */}
        {venue.gallery && venue.gallery.length > 0 && (
          <div 
            className={styles.heroBgImage}
            style={{ backgroundImage: `url('${venue.gallery[0]}')` }} 
          />
        )}

        <div className={styles.heroGradientOverlay} />
        
        <div className={`container ${styles.heroContent}`}>
          <span className={styles.tag}>
            {venue.type}
          </span>
          <h1 className={styles.title}>{venue.name}</h1>
          <div className={styles.meta}>
             <span>📍 {venue.location}</span>
             <span>⭐ {venue.rating} Rating</span>
             <span>💲 {venue.price}</span>
          </div>
        </div>
      </div>

      <div className={`container ${styles.contentGrid}`}>
        {/* Left Column */}
        <div>
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>About</h2>
            <p className={styles.description}>
              Experience top-tier sports facilities at {venue.name}. Whether you are training for the big leagues or just having fun with friends, this venue offers everything you need.
              Maintained daily to professional standards.
            </p>
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitleNoMargin}>Gallery</h2>
              {user && (
                <div>
                   <input 
                     type="file" 
                     id="venue-img-upload" 
                     accept="image/*" 
                     className={styles.hidden}
                     onChange={handleImageUpload}
                     disabled={uploading}
                   />
                   <label 
                     htmlFor="venue-img-upload" 
                     className={`btn-primary ${styles.uploadLabel}`}
                     style={{ 
                       opacity: uploading ? 0.7 : 1,
                       cursor: uploading ? 'wait' : 'pointer'
                     }}
                   >
                     {uploading ? 'Uploading...' : 'Add Photo 📷'}
                   </label>
                </div>
              )}
            </div>

            {(!venue.gallery || venue.gallery.length === 0) ? (
              <div className={`glass-panel ${styles.emptyGallery}`}>
                No photos yet. Be the first to add one!
              </div>
            ) : (
              <div className={`grid-auto-fit ${styles.galleryGrid}`}>
                {venue.gallery.map((img, idx) => (
                   <div key={idx} className={styles.galleryItem}>
                     <img 
                       src={img} 
                       alt={`Venue ${idx}`} 
                       className={styles.galleryImage}
                     />
                   </div>
                ))}
              </div>
            )}
            {!user && (
              <p className={styles.loginPrompt}>
                <a href="/login" className={styles.loginLink}>Log in</a> to upload photos.
              </p>
            )}
          </section>

          <section>
            <h2 className={styles.sectionTitle}>Amenities</h2>
            <div className={styles.amenities}>
              {venue.amenities.map(item => (
                <div key={item} className={`glass-panel ${styles.amenityItem}`}>
                  {item}
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Right Column - Booking Card */}
        <div>
          <div className={`glass-panel ${styles.bookingCard}`}>
            <h3 className={styles.bookingTitle}>Reserve Your Spot</h3>
            <p className={styles.bookingSubtitle}>
              Instant confirmation. No hidden fees.
            </p>
            
            <div className={styles.priceBox}>
              <div className={styles.priceLabel}>Price</div>
              <div className={styles.priceValue}>{venue.price}</div>
            </div>

            <button 
              className={`btn-primary ${styles.bookButton}`}
              onClick={() => setShowBooking(true)}
            >
              Book Now
            </button>
          </div>
        </div>
      </div>

      {showBooking && <BookingModal venue={venue} onClose={() => setShowBooking(false)} />}
    </main>
  );
}
