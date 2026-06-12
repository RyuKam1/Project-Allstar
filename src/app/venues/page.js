"use client";
import Navbar from "@/components/Layout/Navbar";
import LocationCard, { VENUE_LAYOUT_ACCENTS } from "@/components/Locations/LocationCard";
import bentoStyles from '@/styles/bento-grid.module.css';
import { getLayoutAccent } from '@/lib/cardLayoutAccents';
import Map from "@/components/UI/Map";
import CommunityLocationForm from "@/components/Community/CommunityLocationForm";
import { communityLocationService } from "@/services/communityLocationService";
import { venueService } from "@/services/venueService";
import { filterPlaceholderVenues } from "@/lib/placeholderVenues";
import { getCityOutline } from "@/lib/nominatimCityOutline";
import { useState, useRef, useEffect, Suspense, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { getDistance } from '@/utils/geoUtils';
import Icon from '@/components/UI/Icon';
import { EmptyState, ModalHeader, SkeletonCardGrid } from '@/components/UI/primitives';
import { collectSportValues } from '@/lib/sportsCatalog';
import { useSportFilter } from '@/hooks/useSportFilter';
import SportFilterPills from '@/components/UI/SportFilterPills';
import styles from './venues.module.css';

function getLocationLatLng(loc) {
  if (loc == null) return null;
  if (typeof loc.lat === 'number' && typeof loc.lng === 'number') {
    return [loc.lat, loc.lng];
  }
  if (Array.isArray(loc.coordinates) && loc.coordinates.length >= 2) {
    const a = Number(loc.coordinates[0]);
    const b = Number(loc.coordinates[1]);
    if (!Number.isNaN(a) && !Number.isNaN(b)) return [a, b];
  }
  if (loc.coordinates != null && typeof loc.coordinates === 'object') {
    const a = Number(loc.coordinates.lat);
    const b = Number(loc.coordinates.lng);
    if (!Number.isNaN(a) && !Number.isNaN(b)) return [a, b];
  }
  return null;
}

function VenuesPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const textQuery = (searchParams.get('q') || '').trim().toLowerCase();
  const [communityLocations, setCommunityLocations] = useState([]);
  const [officialVenues, setOfficialVenues] = useState([]); // Official Business Venues
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showRefreshSpin, setShowRefreshSpin] = useState(false);
  const [refreshSpinKey, setRefreshSpinKey] = useState(0);
  const [isGlobalView, setIsGlobalView] = useState(false);
  const [isAreaSearchEnabled, setIsAreaSearchEnabled] = useState(false);
  const [areaRadiusKm, setAreaRadiusKm] = useState(5);
  const [userCoords, setUserCoords] = useState(null);
  const [isAreaAutoFollow, setIsAreaAutoFollow] = useState(true);

  // Search State
  const [userCountry, setUserCountry] = useState(null);
  const [locationStatus, setLocationStatus] = useState("pending");
  const [locationNotice, setLocationNotice] = useState("");
  const [citySearchTerm, setCitySearchTerm] = useState('');
  const [filteredCities, setFilteredCities] = useState([]);
  const [showCityResults, setShowCityResults] = useState(false);
  const [mapCenter, setMapCenter] = useState(null);
  const [mapZoom, setMapZoom] = useState(2); // New state for zoom level
  const [previousMapState, setPreviousMapState] = useState(null); // Store previous state to restore
  const [cityHighlightGeoJSON, setCityHighlightGeoJSON] = useState(null);
  const [cityHighlightCircle, setCityHighlightCircle] = useState(null);
  const [displayLimit, setDisplayLimit] = useState(50);
  const [viewMode, setViewMode] = useState('split'); // Progressive loading limit
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const observerTarget = useRef(null); // Ref for infinite scroll

  // Add Location Flow
  const [isAddingLocation, setIsAddingLocation] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newLocationCoords, setNewLocationCoords] = useState(null);

  const gpsInitializedRef = useRef(false);
  const userCoordsRef = useRef(null);
  const outlineRequestIdRef = useRef(0);
  const outlineDebounceRef = useRef(null);
  const nearbyRequestIdRef = useRef(0);
  const areaRadiusDebounceRef = useRef(null);
  const mapRef = useRef(null); // Ref for scrolling to map
  const countryStateCityRef = useRef(null);
  const cityCacheRef = useRef(new globalThis.Map());
  const wasRefreshingRef = useRef(false);
  const [countries, setCountries] = useState([]);
  const defaultMapCenter = [25, 0];
  const defaultMapZoom = 2;

  const shouldUseManualCitySelection = locationStatus !== "granted";
  const isAreaSearchAvailable =
    locationStatus === "granted" && !isGlobalView && Array.isArray(userCoords);
  const effectiveNearbyRadiusKm = isAreaSearchEnabled ? areaRadiusKm : 20;

  // Load Official Venues (Business) on Mount
  useEffect(() => {
    venueService.getAllVenues()
      .then((rows) => setOfficialVenues(filterPlaceholderVenues(rows || [])))
      .catch(err => console.error("Error loading official venues:", err));
  }, []);

  const ensureCountryStateCity = async () => {
    if (countryStateCityRef.current) return countryStateCityRef.current;
    countryStateCityRef.current = await import('country-state-city');
    return countryStateCityRef.current;
  };

  const loadCitiesForCountry = async (countryCode) => {
    if (!countryCode) return [];
    const cached = cityCacheRef.current.get(countryCode);
    if (cached) return cached;
    const mod = await ensureCountryStateCity();
    const allCities = mod.City.getCitiesOfCountry(countryCode) || [];
    cityCacheRef.current.set(countryCode, allCities);
    return allCities;
  };

  useEffect(() => {
    let isMounted = true;
    ensureCountryStateCity().then((mod) => {
      if (!isMounted) return;
      const allCountries = mod.Country.getAllCountries() || [];
      setCountries(allCountries);

      if (!userCountry) {
        const localeCountry =
          typeof navigator !== "undefined" && navigator.language?.includes("-")
            ? navigator.language.split("-")[1]?.toUpperCase()
            : null;
        const isValid = localeCountry && mod.Country.getCountryByCode(localeCountry);
        setUserCountry(isValid ? localeCountry : "US");
      }
    }).catch((err) => {
      console.error("Failed to load country-state-city data:", err);
      if (!isMounted) return;
      if (!userCountry) setUserCountry("US");
    });

    return () => {
      isMounted = false;
    };
  }, [userCountry]);

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

  useEffect(() => {
    if (isRefreshing && !wasRefreshingRef.current) {
      setRefreshSpinKey((key) => key + 1);
      setShowRefreshSpin(true);
    }
    wasRefreshingRef.current = isRefreshing;
  }, [isRefreshing]);

  const loadGlobalVenues = async () => {
    const hasExistingData = communityLocations.length > 0 || officialVenues.length > 0;
    if (hasExistingData) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    try {
      // Load ALL venues (Globe view)
      const locations = await communityLocationService.getNearbyLocations(0, 0, 45000);
      setCommunityLocations(locations);
    } catch (error) {
      console.error("Failed to load community locations:", error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const loadNearbyForCoords = async (lat, lng, radiusKm = 20) => {
    const id = ++nearbyRequestIdRef.current;
    const hasExistingData = communityLocations.length > 0 || officialVenues.length > 0;
    if (hasExistingData) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    try {
      const locations = await communityLocationService.getNearbyLocations(
        lat,
        lng,
        radiusKm,
      );
      if (id !== nearbyRequestIdRef.current) return;
      setCommunityLocations(locations);
    } catch (error) {
      console.error("Failed to load nearby locations:", error);
      if (id !== nearbyRequestIdRef.current) return;
      // Preserve current results on refresh failure to avoid blanking the page.
    } finally {
      if (id === nearbyRequestIdRef.current) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
  };

  const applyCityHighlight = async ({
    cityName,
    countryCode,
    stateCode,
    lat,
    lng,
  }) => {
    const id = ++outlineRequestIdRef.current;
    if (outlineDebounceRef.current) {
      clearTimeout(outlineDebounceRef.current);
    }
    outlineDebounceRef.current = setTimeout(async () => {
      const outline = await getCityOutline({
        cityName,
        countryCode,
        stateCode,
        lat,
        lng,
      });
      if (id !== outlineRequestIdRef.current) return;
      setCityHighlightGeoJSON(outline.geoJSON || null);
      setCityHighlightCircle(outline.circle || null);
    }, 220);
  };

  useEffect(() => {
    return () => {
      if (outlineDebounceRef.current) {
        clearTimeout(outlineDebounceRef.current);
      }
    };
  }, []);

  const handleUserLocationFound = async (lat, lng) => {
    setLocationStatus("granted");
    setLocationNotice("");
    userCoordsRef.current = [lat, lng];
    setUserCoords([lat, lng]);

    if (!gpsInitializedRef.current) {
      gpsInitializedRef.current = true;
      setMapCenter([lat, lng]);
      setMapZoom(14);
      await loadNearbyForCoords(lat, lng, effectiveNearbyRadiusKm);
      await detectUserCountry(lat, lng);
    }
  };

  const handleUserLocationUpdate = (lat, lng) => {
    if (isGlobalView || locationStatus !== "granted") return;
    userCoordsRef.current = [lat, lng];
    setUserCoords([lat, lng]);
    if (isAreaSearchEnabled && isAreaAutoFollow) {
      setMapCenter([lat, lng]);
    }
  };

  const handleLocationUnavailable = ({ reason }) => {
    setLocationStatus(reason === "denied" ? "denied" : "manual");
    setUserCoords(null);
    setIsAreaSearchEnabled(false);
    setIsAreaAutoFollow(true);
    gpsInitializedRef.current = false;
    setMapCenter((prev) => prev || defaultMapCenter);
    setMapZoom((prev) => (prev === 14 ? defaultMapZoom : prev));
    setCommunityLocations((prev) => (Array.isArray(prev) ? prev : []));

    if (reason === "denied") {
      setLocationNotice("Location permission is denied. Pick a country and city to browse venues.");
    } else if (reason === "timeout") {
      setLocationNotice("Location request timed out. You can still browse by selecting your city.");
    } else if (reason === "unsupported") {
      setLocationNotice("Your browser does not support location. Select your city to continue.");
    } else {
      setLocationNotice("Live location is unavailable right now. Select your city to continue.");
    }
  };

  const handleGeoStatusChange = ({ status }) => {
    if (status === "granted") {
      setLocationStatus("granted");
      setLocationNotice("");
      return;
    }
    if (status === "pending") {
      setLocationStatus("pending");
    }
  };

  useEffect(() => {
    if (!isAreaSearchEnabled) return;
    if (!isAreaSearchAvailable) {
      setIsAreaSearchEnabled(false);
      setIsAreaAutoFollow(true);
    }
  }, [isAreaSearchEnabled, isAreaSearchAvailable]);

  useEffect(() => {
    if (
      !isAreaSearchEnabled ||
      !isAreaAutoFollow ||
      !Array.isArray(userCoords) ||
      isGlobalView
    ) {
      return;
    }
    const [lat, lng] = userCoords;
    setMapCenter([lat, lng]);
  }, [isAreaSearchEnabled, isAreaAutoFollow, userCoords, isGlobalView]);

  useEffect(() => {
    if (!isAreaSearchEnabled || !Array.isArray(userCoordsRef.current) || isGlobalView) {
      return;
    }

    if (areaRadiusDebounceRef.current) {
      clearTimeout(areaRadiusDebounceRef.current);
    }
    areaRadiusDebounceRef.current = setTimeout(() => {
      const coords = userCoordsRef.current;
      if (!coords) return;
      loadNearbyForCoords(coords[0], coords[1], areaRadiusKm);
    }, 180);

    return () => {
      if (areaRadiusDebounceRef.current) {
        clearTimeout(areaRadiusDebounceRef.current);
      }
    };
  }, [isAreaSearchEnabled, areaRadiusKm, isGlobalView]);

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

      // 3. Fetch Data
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
        setIsRefreshing(true);
        communityLocationService.getNearbyLocations(
          targetCenter[0],
          targetCenter[1],
          effectiveNearbyRadiusKm,
        )
          .then((locations) => {
            setCommunityLocations(locations);
            setIsRefreshing(false);
          })
          .catch((error) => {
            console.error("Failed to restore local data:", error);
            setIsRefreshing(false);
          });
      } else {
        // Fallback clearing
        setCommunityLocations([]);
        setIsLoading(false);
        setIsRefreshing(false);
        setMapZoom(4);
      }

    }
  };


  const detectUserCountry = async (lat, lng) => {
    try {
      const reverseGeoUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`;
      // Use free reverse geocoding API to get country code & city
      const response = await fetch(reverseGeoUrl);
      if (!response.ok) {
        throw new Error(`Country detection failed with status ${response.status}`);
      }
      const data = await response.json();

      if (data && data.countryCode) {
        setUserCountry(data.countryCode);
        console.log("Detected Country:", data.countryCode);

        // Auto-select city if detected
        if (data.city || data.locality) {
          const detectedCity = data.city || data.locality;
          setCitySearchTerm(detectedCity);
          await applyCityHighlight({
            cityName: detectedCity,
            countryCode: data.countryCode,
            stateCode: data.principalSubdivisionCode || data.principalSubdivision || null,
            lat,
            lng,
          });
          console.log("Auto-selected City:", detectedCity);
        }
      }
    } catch (error) {
      console.error("Failed to detect country:", error);
      setUserCountry((prev) => prev || "US");
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
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      loadNearbyForCoords(lat, lng);
      applyCityHighlight({
        cityName: city.name,
        countryCode: userCountry,
        stateCode: city.stateCode,
        lat,
        lng,
      });
    }

    // Update map view
    setMapCenter([lat, lng]);
    setMapZoom(14);
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
      communityLocationService.getNearbyLocations(
        mapCenter[0],
        mapCenter[1],
        effectiveNearbyRadiusKm,
      )
        .then(setCommunityLocations);
    }
  };

  // Merge legacy venues and community locations
  const allLocations = useMemo(() => [
    ...officialVenues.map(l => ({ ...l, type: 'business', isBusiness: true })),
    ...communityLocations.map(l => ({ ...l, type: 'community', isBusiness: false }))
  ], [officialVenues, communityLocations]);

  const inUseSports = useMemo(
    () => collectSportValues(allLocations, (loc) => loc.sports || (loc.sport ? [loc.sport] : [])),
    [allLocations],
  );
  const { filterSport, setFilterSport, sportFilters, filtersLoading, matchesFilter } = useSportFilter(
    inUseSports,
    { multi: true, loading: isLoading },
  );

  const activeLocations = allLocations.filter(loc => {
    const sports = loc.sports || (loc.sport ? [loc.sport] : []);
    if (!matchesFilter(sports)) return false;
    if (!isGlobalView && mapCenter) {
      const areaFilterActive = isAreaSearchEnabled && Array.isArray(userCoords);
      const cityFilterActive = !isAreaSearchEnabled && !!citySearchTerm;
      if (areaFilterActive || cityFilterActive) {
        const centerSource = areaFilterActive ? userCoords : mapCenter;
        const maxDistanceKm = areaFilterActive ? areaRadiusKm : 50;
        const point = getLocationLatLng(loc);
        if (!point) return false;
        const dist = getDistance(
          centerSource[0],
          centerSource[1],
          point[0],
          point[1],
        );
        if (dist > maxDistanceKm) return false;
      }
    }

    // 3. Text search from homepage / URL ?q=
    if (textQuery) {
      const haystack = [
        loc.name,
        loc.city,
        loc.address,
        ...(loc.sports || []),
        loc.sport,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(textQuery)) return false;
    }

    return true;
  });

  const displayedDiameterKm = areaRadiusKm * 2;
  const diameterLabel =
    displayedDiameterKm < 1
      ? `${Math.round(displayedDiameterKm * 1000)} m`
      : `${displayedDiameterKm.toFixed(displayedDiameterKm >= 10 ? 0 : 1)} km`;

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
        <div id="map-section" className={`${styles.mapWrapper} ${viewMode === 'list' ? styles.mapHidden : ''}`} ref={mapRef}>
          <Map
            venues={activeLocations}
            onUserLocationFound={handleUserLocationFound}
            onUserLocationUpdate={handleUserLocationUpdate}
            onGeolocationStatusChange={handleGeoStatusChange}
            onLocationUnavailable={handleLocationUnavailable}
            isAddingLocation={isAddingLocation}
            onMapClick={handleMapClick}
            initialCenter={defaultMapCenter}
            initialZoom={defaultMapZoom}
            center={mapCenter}
            zoom={mapZoom}
            isGlobalView={isGlobalView}
            cityHighlightGeoJSON={isAreaSearchEnabled ? null : cityHighlightGeoJSON}
            cityHighlightCircle={
              isAreaSearchEnabled && Array.isArray(userCoords)
                ? { center: userCoords, radiusMeters: areaRadiusKm * 1000 }
                : cityHighlightCircle
            }
            hideInternalPlaceSearch={true}
            onLocateMeTriggered={() => {
              if (isAreaSearchEnabled && isAreaSearchAvailable) {
                setIsAreaAutoFollow(true);
              }
            }}
            onUserMapNavigate={() => {
              if (isAreaSearchEnabled && isAreaAutoFollow) {
                setIsAreaAutoFollow(false);
              }
            }}
          />
        </div>
        {!isGlobalView && locationNotice && (
          <div className={styles.locationBanner}>{locationNotice}</div>
        )}

        {/* Controls Area: Combobox + Toggle + Add Button */}
        <div className={styles.controlsArea}>
          <div className={styles.actionRow}>

            <div className={styles.searchGroup}>
              {!isGlobalView && shouldUseManualCitySelection && (
                <select
                  className={styles.countrySelect}
                  value={userCountry || ""}
                  onChange={(e) => {
                    setUserCountry(e.target.value);
                    setCitySearchTerm("");
                    setFilteredCities([]);
                    setShowCityResults(false);
                    setCityHighlightGeoJSON(null);
                    setCityHighlightCircle(null);
                    setCommunityLocations([]);
                  }}
                >
                  {countries.map((country) => (
                    <option key={country.isoCode} value={country.isoCode}>
                      {country.name}
                    </option>
                  ))}
                </select>
              )}

              {/* City Search - Disabled when Global View is ON */}
              <div
                className={`${styles.comboboxContainer} ${(isGlobalView || isAreaSearchEnabled) ? styles.disabledArea : ''}`}
              >
                <button
                  type="button"
                  className={`${styles.comboboxTrigger} ${showCityResults ? styles.active : ''}`}
                  aria-expanded={showCityResults}
                  aria-label="Open city selector"
                  onClick={() => {
                    if (isGlobalView || isAreaSearchEnabled) return; // Prevent interaction
                    if (!userCountry) return;
                    // Always load all cities when opening to ensure fresh state
                    if (!showCityResults) {
                      loadCitiesForCountry(userCountry)
                        .then((cities) => {
                          setFilteredCities(cities);
                          setDisplayLimit(50);
                        })
                        .catch((err) => {
                          console.error("Failed to load cities:", err);
                          setFilteredCities([]);
                        });
                    }
                    setShowCityResults(!showCityResults);
                  }}
                >
                  <Icon name="search" size={16} className="icon-inline" />
                  <span style={{
                    flex: 1,
                    color: citySearchTerm ? 'var(--text-main)' : 'var(--text-muted)'
                  }}>
                    {citySearchTerm || (userCountry ? `Searching in ${userCountry}...` : "Choose country first")}
                  </span>
                  <Icon name="chevronDown" size={16} className="icon-inline" />
                </button>

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
                            loadCitiesForCountry(userCountry)
                              .then((allCities) => {
                                const matches = allCities.filter(city =>
                                  city.name.toLowerCase().includes(term.toLowerCase())
                                );
                                setFilteredCities(matches);
                                setDisplayLimit(50); // Reset limit
                              })
                              .catch((err) => {
                                console.error("Failed to filter city list:", err);
                                setFilteredCities([]);
                              });
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

              <div className={styles.toggleRow}>
              {/* Global Perspective Toggle */}
              <div className={styles.toggleContainer} onClick={toggleGlobalView} title="Show venues from all over the world">
                <label className={styles.switch} onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={!!isGlobalView} /* Double bang to ensure boolean true/false, never undefined */
                    aria-label="Toggle global venues"
                    onChange={toggleGlobalView}
                  />
                  <span className={`${styles.slider} ${styles.round}`}></span>
                </label>
                <span style={{ fontSize: '0.9rem', color: isGlobalView ? 'var(--color-primary)' : 'var(--text-muted)', fontWeight: 600 }}>
                  Global Venues
                </span>
              </div>

              <div
                className={`${styles.toggleContainer} ${!isAreaSearchAvailable ? styles.disabledArea : ""}`}
                title="Search venues inside a radius around your location"
              >
                <label className={styles.switch} onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={!!isAreaSearchEnabled}
                    disabled={!isAreaSearchAvailable}
                    aria-label="Toggle area search"
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setIsAreaSearchEnabled(checked);
                      setIsAreaAutoFollow(true);
                      if (checked) {
                        const coords =
                          userCoordsRef.current ||
                          (Array.isArray(userCoords) ? userCoords : null);
                        if (coords) {
                          setMapCenter(coords);
                          loadNearbyForCoords(coords[0], coords[1], areaRadiusKm);
                        }
                      }
                    }}
                  />
                  <span className={`${styles.slider} ${styles.round}`}></span>
                </label>
                <span style={{ fontSize: '0.9rem', color: isAreaSearchEnabled ? 'var(--color-primary)' : 'var(--text-muted)', fontWeight: 600 }}>
                  Search by area
                </span>
              </div>

              {isAreaSearchEnabled && (
                <div className={styles.areaControls}>
                  <span className={styles.areaLabel}>
                    Diameter: {diameterLabel}
                  </span>
                  <input
                    className={styles.areaSlider}
                    type="range"
                    aria-label="Area search radius in kilometers"
                    min="0.5"
                    max="50"
                    step="0.5"
                    value={areaRadiusKm}
                    onChange={(e) => setAreaRadiusKm(parseFloat(e.target.value))}
                  />
                </div>
              )}
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
        <div className={styles.contextBar} role="status">
          <span className={styles.contextMeta}>
            <strong className="tabular">{activeLocations.length}</strong> venues · {filterSport}
            {citySearchTerm ? ` · ${citySearchTerm}` : ''}
            {textQuery ? ` · “${searchParams.get('q')}”` : ''}
          </span>
          <div className={styles.viewToggle} role="group" aria-label="View mode">
            {[
              { id: 'split', label: 'Split' },
              { id: 'list', label: 'List' },
              { id: 'map', label: 'Map' },
            ].map((mode) => (
              <button
                key={mode.id}
                type="button"
                className={`${styles.viewBtn} ${viewMode === mode.id ? styles.viewBtnActive : ''}`}
                onClick={() => {
                  setViewMode(mode.id);
                  if (mode.id === 'map') {
                    document.getElementById('map-section')?.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
              >
                {mode.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            className={styles.filterFab}
            onClick={() => setShowFilterSheet(true)}
            aria-label="Open venue filters"
          >
            <Icon name="chevronDown" size={16} className="icon-inline" />
            Filters
            {filterSport !== 'All' ? <span className={styles.filterBadge}>1</span> : null}
          </button>
        </div>

        <SportFilterPills
          sportFilters={sportFilters}
          filterSport={filterSport}
          onSelect={setFilterSport}
          loading={filtersLoading}
          className={styles.desktopFilters}
          enableSearch
        />

        <div className={`${bentoStyles.grid} ${bentoStyles.gridMd} ${viewMode === 'map' ? styles.listHidden : ''} list-stagger`}>
          {isLoading && activeLocations.length === 0 ? (
            <SkeletonCardGrid
              count={9}
              nested
              variant="venue"
              gridClassName={`${bentoStyles.grid} ${bentoStyles.gridMd}`}
              itemClassName={bentoStyles.item}
            />
          ) : activeLocations.length === 0 ? (
            <div style={{ gridColumn: '1 / -1' }}>
              <EmptyState
                title="No venues in this area"
                description={
                  filterSport !== 'All' || textQuery
                    ? 'Try widening your search radius, changing sport filters, or switching to global view.'
                    : 'Enable location access or pick a city to discover courts and fields near you.'
                }
                actionLabel={
                  filterSport !== 'All' || textQuery
                    ? 'Clear filters'
                    : isGlobalView
                      ? undefined
                      : 'Expand search area'
                }
                onAction={
                  filterSport !== 'All' || textQuery
                    ? () => {
                        setFilterSport('All');
                        if (textQuery) router.push('/venues');
                      }
                    : !isGlobalView
                      ? () => {
                          if (isAreaSearchAvailable) {
                            setIsAreaSearchEnabled(true);
                            setAreaRadiusKm(Math.min(areaRadiusKm + 10, 50));
                          } else {
                            setIsGlobalView(true);
                            loadGlobalVenues();
                          }
                        }
                      : undefined
                }
              />
            </div>
          ) : (
            activeLocations.map((location, index) => (
              <div key={location.id} className={bentoStyles.item}>
                <LocationCard
                  location={location}
                  type={location.isBusiness ? 'business' : 'community'}
                  layoutAccent={getLayoutAccent(index, VENUE_LAYOUT_ACCENTS)}
                />
              </div>
            ))
          )}
        </div>
      </div>

      {showRefreshSpin && (
        <div
          key={refreshSpinKey}
          className={styles.refreshIndicator}
          role="status"
          aria-live="polite"
          aria-label="Updating venues"
          onAnimationEnd={() => setShowRefreshSpin(false)}
        >
          <Icon name="refresh" size={16} />
        </div>
      )}

      {/* Add Location Modal */}
      {showFilterSheet && (
        <div className="dismiss-backdrop" onClick={() => setShowFilterSheet(false)}>
          <div
            className={`glass-panel ticket-card ${styles.filterSheet} dismiss-panel`}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Venue filters"
          >
            <ModalHeader title="Filters" onClose={() => setShowFilterSheet(false)} />

            <div className={styles.sheetSection}>
              <p className={styles.sheetLabel}>View</p>
              <div className={styles.sheetViewToggle} role="group" aria-label="View mode">
                {[
                  { id: 'split', label: 'Split' },
                  { id: 'list', label: 'List' },
                  { id: 'map', label: 'Map' },
                ].map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    className={`${styles.sheetViewBtn} ${viewMode === mode.id ? styles.sheetViewBtnActive : ''}`}
                    onClick={() => {
                      setViewMode(mode.id);
                      if (mode.id === 'map') {
                        setShowFilterSheet(false);
                        document.getElementById('map-section')?.scrollIntoView({ behavior: 'smooth' });
                      }
                    }}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.sheetSection}>
              <p className={styles.sheetLabel}>Sport</p>
              <SportFilterPills
                sportFilters={sportFilters}
                filterSport={filterSport}
                onSelect={setFilterSport}
                loading={filtersLoading}
                className={styles.sheetPills}
              />
            </div>

            <button
              type="button"
              className={`btn-primary ${styles.sheetApply}`}
              onClick={() => setShowFilterSheet(false)}
            >
              Show {activeLocations.length} venues
            </button>
          </div>
        </div>
      )}

      {showAddForm && (
        <div className="dismiss-backdrop" onClick={() => setShowAddForm(false)}>
          <div onClick={(e) => e.stopPropagation()}>
            <CommunityLocationForm
              initialCoords={newLocationCoords}
              onSuccess={handleLocationAdded}
              onCancel={() => setShowAddForm(false)}
            />
          </div>
        </div>
      )}
    </main>
  );
}

export default function VenuesPage() {
  return (
    <Suspense fallback={null}>
      <VenuesPageContent />
    </Suspense>
  );
}
