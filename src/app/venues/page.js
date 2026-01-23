"use client";
import Navbar from "@/components/Layout/Navbar";
import VenueCard from "@/components/UI/VenueCard";
import LocationCard from "@/components/Locations/LocationCard";
import Map from "@/components/UI/Map";
import CommunityLocationForm from "@/components/Community/CommunityLocationForm";
import { communityLocationService } from "@/services/communityLocationService";
import { venueService } from "@/services/venueService";
import { useState, useRef, useEffect } from "react";
import { City, Country } from 'country-state-city';
import styles from './venues.module.css';

export default function VenuesPage() {
  const [displayVenues, setDisplayVenues] = useState([]);
  const [communityLocations, setCommunityLocations] = useState([]);
  const [officialVenues, setOfficialVenues] = useState([]); // Official Business Venues
  const [filterSport, setFilterSport] = useState('All');
  const [isLoading, setIsLoading] = useState(true);
  const [isGlobalView, setIsGlobalView] = useState(false);
  const [mapIsGlobal, setMapIsGlobal] = useState(false); // Controls map visual style (pins, user dot)

  // Search State
  const [userCountry, setUserCountry] = useState(null);
  const [citySearchTerm, setCitySearchTerm] = useState('');
  const [filteredCities, setFilteredCities] = useState([]);
  const [showCityResults, setShowCityResults] = useState(false);
  const [mapCenter, setMapCenter] = useState(null);
  const [mapZoom, setMapZoom] = useState(14); // New state for zoom level
  const [previousMapState, setPreviousMapState] = useState(null); // Store previous state to restore
  const [displayLimit, setDisplayLimit] = useState(50); // Progressive loading limit
  const observerTarget = useRef(null); // Ref for infinite scroll

  // Add Location Flow
  const [isAddingLocation, setIsAddingLocation] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newLocationCoords, setNewLocationCoords] = useState(null);

  // Use a ref to ensure we don't re-randomize unnecessarily if component re-renders
  const hasRandomized = useRef(false);
  const mapRef = useRef(null); // Ref for scrolling to map

  // Load Official Venues (Business) on Mount
  useEffect(() => {
    venueService.getAllVenues()
      .then(setOfficialVenues)
      .catch(err => console.error("Error loading official venues:", err));
  }, []);

  // REMOVED: Initial global fetch (user wants local-only by default)
  // useEffect(() => {
  //   loadCommunityLocations();
  // }, []);

  // Infinite Scroll Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && showCityResults) {
          setDisplayLimit((prev) => prev + 50);
        }
      },
      { threshold: 1.0 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [showCityResults, filteredCities, displayLimit]);

  const loadGlobalVenues = async () => {
    setIsLoading(true);
    try {
      // Load ALL venues (Globe view)
      const locations = await communityLocationService.getNearbyLocations(0, 0, 45000);
      setCommunityLocations(locations);
    } catch (error) {
      console.error("Failed to load community locations:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUserLocationFound = async (lat, lng) => {
    if (!hasRandomized.current) {
      hasRandomized.current = true;
      setMapCenter([lat, lng]); // Set initial center
      setMapZoom(14); // Set initial zoom

      setIsLoading(true); // Restored loading state since we start empty now
      // 2. Fetch nearby community locations
      communityLocationService.getNearbyLocations(lat, lng, 20)
        .then((locations) => {
          setCommunityLocations(locations);
          setIsLoading(false);
        })
        .catch((err) => {
          console.error(err);
          setIsLoading(false);
        });

      // 3. Detect Country
      detectUserCountry(lat, lng);
    }
  };

  const toggleGlobalView = () => {
    const newState = !isGlobalView;
    setIsGlobalView(newState);

    if (newState) {
      // --- SWITCHING TO GLOBAL ---

      // 1. Save current state
      if (mapCenter) {
        setPreviousMapState({ center: mapCenter, zoom: 14 });
      }

      // 2. Update Map Immediately (Zoom Out)
      setMapCenter([25, 0]);
      setMapZoom(2);

      // 3. Delayed Pin Resize (Wait for zoom out to start/progress)
      setTimeout(() => {
        setMapIsGlobal(true);
      }, 800); // 0.8s delay for pin shrink

      // 4. Fetch Data
      loadGlobalVenues();

    } else {
      // --- SWITCHING BACK TO LOCAL ---

      // 1. Restore Map View
      let targetCenter = previousMapState?.center;
      let targetZoom = 14;

      if (previousMapState) {
        targetCenter = previousMapState.center;
        targetZoom = previousMapState.zoom || 14;
      }

      if (targetCenter) {
        setMapCenter(targetCenter);
        setMapZoom(targetZoom);

        // Load Local Data
        setIsLoading(true);
        communityLocationService.getNearbyLocations(targetCenter[0], targetCenter[1], 20)
          .then((locations) => {
            setCommunityLocations(locations);
            setIsLoading(false);
          });
      } else {
        // Fallback clearing
        setCommunityLocations([]);
        setIsLoading(false);
        setMapZoom(4);
      }

      // 2. Delayed visual restore (wait for zoom in)
      setTimeout(() => {
        setMapIsGlobal(false); // Restore large pins and User Dot
      }, 2000);
    }
  };


  const detectUserCountry = async (lat, lng) => {
    try {
      // Use free reverse geocoding API to get country code & city
      const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`);
      const data = await response.json();

      if (data && data.countryCode) {
        setUserCountry(data.countryCode);
        console.log("Detected Country:", data.countryCode);

        // Auto-select city if detected
        if (data.city || data.locality) {
          const detectedCity = data.city || data.locality;
          setCitySearchTerm(detectedCity);
          console.log("Auto-selected City:", detectedCity);
        }
      }
    } catch (error) {
      console.error("Failed to detect country:", error);
      // Fallback to US if detection fails (optional)
      setUserCountry("US");
    }
  };

  // Normalize city names: strip apostrophes, trim, lowercase
  const normalizeCityName = (name) => {
    return name ? name.toLowerCase().replace(/['’]/g, "").trim() : "";
  };

  const handleCitySearch = (e) => {
    const term = e.target.value;
    setCitySearchTerm(term);
    setDisplayLimit(50); // Reset limit on search

    if (term.length > 2 && userCountry) {
      const cities = City.getCitiesOfCountry(userCountry);
      // Filter ALL matches, do not slice here
      const normalizedTerm = normalizeCityName(term);

      const matches = cities.filter(city =>
        normalizeCityName(city.name).includes(normalizedTerm)
      );
      setFilteredCities(matches);
      setShowCityResults(true);
    } else {
      setFilteredCities([]);
      setShowCityResults(false);
    }
  };

  const selectCity = (city) => {
    setCitySearchTerm(city.name);
    setShowCityResults(false);

    // Update map center to city coordinates
    const lat = parseFloat(city.latitude);
    const lng = parseFloat(city.longitude);

    console.log(`Selecting City: ${city.name} (${lat}, ${lng})`);

    // Fetch community locations by COORDINATES (Radius match)
    // This is more robust than string matching for "Tbilisi" vs "T'bilisi" logic issues
    if (lat && lng) {
      setIsLoading(true);
      communityLocationService.getNearbyLocations(lat, lng, 20)
        .then(locations => {
          console.log(`Found ${locations.length} community locations near ${city.name} (Radius 20km)`);
          setCommunityLocations(locations);
        })
        .catch(console.error)
        .finally(() => setIsLoading(false));
    }

    // Update map view
    setMapCenter([lat, lng]);
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
    // Refresh whatever view we are in - simplified to nearby user or city
    if (mapCenter) {
      communityLocationService.getNearbyLocations(mapCenter[0], mapCenter[1], 20)
        .then(setCommunityLocations);
    }
  };

  // Merge legacy venues and community locations
  const allLocations = [
    ...officialVenues.map(l => ({ ...l, type: 'business', isBusiness: true })),
    ...communityLocations.map(l => ({ ...l, type: 'community', isBusiness: false }))
  ];

  const activeLocations = allLocations.filter(loc => {
    // 1. Sport Filter
    if (filterSport !== 'All') {
      const sports = loc.sports || (loc.sport ? [loc.sport] : []);
      const matchesSport = sports.some(s => s === filterSport || s.includes(filterSport));
      if (!matchesSport) return false;
    }

    // 2. Distance-Based "Strict" Filter
    // Only apply if NOT in Global View
    if (!isGlobalView && citySearchTerm && mapCenter) {
      const [centerLat, centerLng] = mapCenter;
      // Simple distance check (approximate)
      const dist = Math.sqrt(
        Math.pow(loc.lat - centerLat, 2) + Math.pow(loc.lng - centerLng, 2)
      ) * 111; // degrees to km

      if (dist > 50) return false; // Hide venues > 50km from city center
    }

    return true;
  });

  return (
    <main className={styles.main}>
      <Navbar />

      <div className={`container ${styles.container}`}>
        <div className={styles.header}>
          <h1 className={styles.title}>
            <span className="primary-gradient-text">Explore</span> Map
          </h1>
        </div>

        {/* Map Integration */}
        <div id="map-section" className={styles.mapWrapper} ref={mapRef}>
          <Map
            venues={activeLocations}
            onUserLocationFound={handleUserLocationFound}
            isAddingLocation={isAddingLocation}
            onMapClick={handleMapClick}
            center={mapCenter}
            zoom={mapZoom}
            isGlobalView={isGlobalView}
          />
        </div>

        {/* Controls Area: Combobox + Toggle + Add Button */}
        <div className={styles.controlsArea}>
          <div className={styles.actionRow}>

            <div className={styles.searchGroup}>
              {/* City Search - Disabled when Global View is ON */}
              <div className={`${styles.comboboxContainer} ${isGlobalView ? styles.disabledArea : ''}`}>
                <div
                  className={`${styles.comboboxTrigger} ${showCityResults ? styles.active : ''}`}
                  onClick={() => {
                    if (isGlobalView) return; // Prevent interaction
                    if (!userCountry) return;
                    // Always load all cities when opening to ensure fresh state
                    if (!showCityResults) {
                      const cities = City.getCitiesOfCountry(userCountry);
                      setFilteredCities(cities);
                      setDisplayLimit(50);
                    }
                    setShowCityResults(!showCityResults);
                  }}
                >
                  <span className="icon">🔍</span>
                  <span style={{
                    flex: 1,
                    color: citySearchTerm ? 'var(--text-main)' : 'var(--text-muted)'
                  }}>
                    {citySearchTerm || (userCountry ? `Searching in ${userCountry}...` : "Detecting location...")}
                  </span>
                  <span className="icon">▼</span>
                </div>

                {showCityResults && !isGlobalView && (
                  <div className={styles.comboboxDropdown}>
                    {/* Sticky Search Input inside Dropdown */}
                    <div className={styles.dropdownSearch}>
                      <input
                        type="text"
                        placeholder="Type to filter cities..."
                        className={styles.dropdownInput}
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          const term = e.target.value;
                          if (userCountry) {
                            const allCities = City.getCitiesOfCountry(userCountry);
                            const matches = allCities.filter(city =>
                              city.name.toLowerCase().includes(term.toLowerCase())
                            );
                            setFilteredCities(matches);
                            setDisplayLimit(50); // Reset limit
                          }
                        }}
                      />
                    </div>

                    {/* Scrollable List */}
                    <div className={styles.cityList}>
                      {filteredCities.slice(0, displayLimit).map((city) => (
                        <div
                          key={`${city.name}-${city.latitude}`}
                          className={styles.cityItem}
                          onClick={() => selectCity(city)}
                        >
                          <span>{city.name}</span>
                          <span className={styles.countryBadge}>{city.stateCode}</span>
                        </div>
                      ))}

                      {/* Sentinel for Infinite Scroll */}
                      {filteredCities.length > displayLimit && (
                        <div ref={observerTarget} style={{ height: '20px', margin: '10px', textAlign: 'center', color: 'var(--text-muted)' }}>
                          Loading more...
                        </div>
                      )}

                      {filteredCities.length === 0 && (
                        <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                          No cities found.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Global Perspective Toggle */}
              <div className={styles.toggleContainer} onClick={toggleGlobalView} title="Show venues from all over the world">
                <label className={styles.switch} onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={!!isGlobalView} /* Double bang to ensure boolean true/false, never undefined */
                    onChange={toggleGlobalView}
                  />
                  <span className={`${styles.slider} ${styles.round}`}></span>
                </label>
                <span style={{ fontSize: '0.9rem', color: isGlobalView ? 'var(--color-primary)' : 'var(--text-muted)', fontWeight: 600 }}>
                  Global Venues
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                toggleAddLocationMode();
                if (!isAddingLocation) {
                  document.getElementById('map-section')?.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              className={`${styles.addLocationBtn} ${isAddingLocation ? styles.active : ''}`}
              suppressHydrationWarning
            >
              {isAddingLocation ? 'Cancel Pin Drop' : '+ Add Spot'}
            </button>
          </div>
        </div>

        {/* Sport Filters */}
        <div className="filter-group">
          {/* Removed button, replaced by toggle above */}

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
              suppressHydrationWarning
            >
              <span className="icon">{sport.icon}</span>
              <span>{sport.name}</span>
            </button>
          ))}
        </div>

        <div className="grid-auto-fit">
          {isLoading ? (
            <div className={styles.loaderContainer}>
              <span className={styles.loader}></span>
              <p>Loading venues...</p>
            </div>
          ) : activeLocations.length === 0 ? (
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
