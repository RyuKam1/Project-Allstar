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
  const [filterSport, setFilterSport] = useState('All');
  // Use a ref to ensure we don't re-randomize unnecessarily if component re-renders
  const hasRandomized = useRef(false);

  const handleUserLocationFound = (lat, lng) => {
    if (!hasRandomized.current) {
      const randomized = randomizeVenues(initialVenues, lat, lng);
      setDisplayVenues(randomized);
      hasRandomized.current = true;
    }
  };

  const activeVenues = displayVenues.filter(venue => 
    filterSport === 'All' || venue.sport === filterSport
  );

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
        <Map venues={activeVenues} onUserLocationFound={handleUserLocationFound} />

        {/* Sport Filters */}
        <div className="filter-group">
          {[
            { name: 'All', icon: '🌟' },
            { name: 'Basketball', icon: '🏀' },
            { name: 'Soccer', icon: '⚽' },
            { name: 'Tennis', icon: '🎾' },
            { name: 'Volleyball', icon: '🏐' },
            { name: 'Fitness', icon: '💪' },
            { name: 'Baseball', icon: '⚾' }
          ].map((sport) => (
             <button 
               key={sport.name} 
               onClick={() => setFilterSport(sport.name)}
               className={`filter-pill ${filterSport === sport.name ? 'filter-pill-active' : ''}`}
             >
               <span className="icon">{sport.icon}</span>
               <span>{sport.name}</span>
             </button>
          ))}
        </div>
        
        <div className="grid-auto-fit">
          {activeVenues.length === 0 ? (
            <div className="text-center p-5 text-muted" style={{ gridColumn: '1 / -1' }}>
              No venues found for {filterSport}.
            </div>
          ) : (
            activeVenues.map((venue) => (
              <VenueCard key={venue.id} venue={venue} />
            ))
          )}
        </div>
      </div>
    </main>
  );
}
