"use client";
import Navbar from "@/components/Layout/Navbar";
import VenueCard from "@/components/UI/VenueCard";
import LocationCard from "@/components/Locations/LocationCard";
import { venues as initialVenues } from "@/lib/venues";
import Map from "@/components/UI/Map";
import CommunityLocationForm from "@/components/Community/CommunityLocationForm";
import { communityLocationService } from "@/services/communityLocationService";
import { randomizeVenues } from "@/utils/geoUtils";
import { useState, useRef, useEffect } from "react";
import styles from './venues.module.css';

export default function VenuesPage() {
  const [displayVenues, setDisplayVenues] = useState(initialVenues);
  const [communityLocations, setCommunityLocations] = useState([]);
  const [filterSport, setFilterSport] = useState('All');

  // Add Location Flow
  const [isAddingLocation, setIsAddingLocation] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newLocationCoords, setNewLocationCoords] = useState(null);

  // Use a ref to ensure we don't re-randomize unnecessarily if component re-renders
  const hasRandomized = useRef(false);

  useEffect(() => {
    loadCommunityLocations();
  }, []);

  const loadCommunityLocations = async () => {
    try {
      // Basic fetch, in reality would use user location radius
      // For demo, passing 0,0 and large radius or just fetching recent
      // Assuming getNearbyLocations handles it gracefully or we fetch all
      const locations = await communityLocationService.getNearbyLocations(0, 0, 10000);
      setCommunityLocations(locations);
    } catch (error) {
      console.error("Failed to load community locations:", error);
    }
  };

  const handleUserLocationFound = (lat, lng) => {
    if (!hasRandomized.current) {
      const randomized = randomizeVenues(initialVenues, lat, lng);
      setDisplayVenues(randomized);
      hasRandomized.current = true;

      // Also fetch nearby community locations
      communityLocationService.getNearbyLocations(lat, lng, 20)
        .then(setCommunityLocations)
        .catch(console.error);
    }
  };

  const toggleAddLocationMode = () => {
    setIsAddingLocation(!isAddingLocation);
    setNewLocationCoords(null);
  };

  const handleMapClick = (coords) => {
    setNewLocationCoords(coords);
    setShowAddForm(true);
    setIsAddingLocation(false); // Exit add mode
  };

  const handleLocationAdded = () => {
    setShowAddForm(false);
    setNewLocationCoords(null);
    loadCommunityLocations(); // Refresh list
  };

  // Merge legacy venues and community locations
  const allLocations = [
    ...displayVenues.map(v => ({
      ...v,
      type: 'business',
      isBusiness: true,
      // Map explicit image property if available, or fallback
      image_url: v.image || `/venues/${v.name}.jpg`,
      // Ensure sports array exists (legacy uses singular 'sport')
      sports: v.sport ? [v.sport] : []
    })),
    ...communityLocations.map(l => ({ ...l, type: 'community', isBusiness: false }))
  ];

  const activeLocations = allLocations.filter(loc => {
    if (filterSport === 'All') return true;

    // Check sports array or single sport field
    const sports = loc.sports || (loc.sport ? [loc.sport] : []);
    return sports.some(s => s === filterSport || s.includes(filterSport));
  });

  return (
    <main className={styles.main}>
      <Navbar />

      <div className={`container ${styles.container}`}>
        <div className={styles.header}>
          <h1 className={styles.title}>
            <span className="primary-gradient-text">Explore</span> Map
          </h1>
          <button
            onClick={toggleAddLocationMode}
            className={`${styles.addLocationBtn} ${isAddingLocation ? styles.active : ''}`}
          >
            {isAddingLocation ? 'Cancel Pin Drop' : '+ Add Spot'}
          </button>
        </div>

        {/* Map Integration */}
        <div className={styles.mapWrapper}>
          <Map
            venues={activeLocations}
            onUserLocationFound={handleUserLocationFound}
            isAddingLocation={isAddingLocation}
            onMapClick={handleMapClick}
          />
        </div>

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
          {activeLocations.length === 0 ? (
            <div className="text-center p-5 text-muted" style={{ gridColumn: '1 / -1' }}>
              No locations found for {filterSport}.
            </div>
          ) : (
            activeLocations.map((location, index) => (
              <div
                key={location.id}
                className={styles.animateCard}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <LocationCard
                  location={location}
                  type={location.isBusiness ? 'business' : 'community'}
                />
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add Location Modal */}
      {showAddForm && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 2000,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem'
        }}>
          <CommunityLocationForm
            initialCoords={newLocationCoords}
            onSuccess={handleLocationAdded}
            onCancel={() => setShowAddForm(false)}
          />
        </div>
      )}
    </main>
  );
}

