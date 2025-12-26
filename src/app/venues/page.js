"use client";
import Navbar from "@/components/Layout/Navbar";
import VenueCard from "@/components/UI/VenueCard";
import { venues as initialVenues } from "@/lib/venues";
import Map from "@/components/UI/Map";
import { randomizeVenues } from "@/utils/geoUtils";
import { useState, useRef } from "react";
import styles from './venues.module.css';

export default function VenuesPage() {
  const [displayVenues, setDisplayVenues] = useState(initialVenues);
  // Use a ref to ensure we don't re-randomize unnecessarily if component re-renders
  const hasRandomized = useRef(false);

  const handleUserLocationFound = (lat, lng) => {
    if (!hasRandomized.current) {
      const randomized = randomizeVenues(initialVenues, lat, lng);
      setDisplayVenues(randomized);
      hasRandomized.current = true;
    }
  };

  return (
    <main className={styles.main}>
      <Navbar />
      
      <div className={`container ${styles.container}`}>
        <div className={styles.header}>
          <h1 className={styles.title}>
            Discover <span className="primary-gradient-text">Spaces</span>
          </h1>
          <p className={styles.subtitle}>
             Find the perfect spot for your next game. Filter by sport, location, or amenities.
          </p>
        </div>

        {/* Map Integration */}
        <Map venues={displayVenues} onUserLocationFound={handleUserLocationFound} />

        {/* Filters Mockup */}
        <div className={styles.filters}>
          {['All', 'Stadiums', 'Courts', 'Fields', 'Gyms'].map((filter, i) => (
             <button key={filter} className={`${styles.filterButton} ${i === 0 ? styles.filterButtonActive : ''}`}>
               {filter}
             </button>
          ))}
        </div>
        
        <div className="grid-auto-fit">
          {displayVenues.map((venue) => (
            <VenueCard key={venue.id} venue={venue} />
          ))}
        </div>
      </div>
    </main>
  );
}
