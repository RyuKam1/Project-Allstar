"use client";
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Map({
  venues = [],
  onUserLocationFound,
  isAddingLocation,
  onMapClick,
  minimal = false,
  initialCenter = [40.7300, -74.0000],
  initialZoom = 12,
  style = {},
  className = ''
}) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const userMarkerRef = useRef(null);
  const initialCenterRef = useRef(false); // Track if we've auto-centered
  const openUserPopupRef = useRef(false); // Track if we should open the popup (only on click)
  const router = useRouter();
  const [userLocation, setUserLocation] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const tempMarkerRef = useRef(null); // Ref to hold the Leaflet marker instance
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  const [isLocating, setIsLocating] = useState(!minimal); // Start locating unless minimal mode
  const [initCenter, setInitCenter] = useState(initialCenter);

  // Sport Configuration for Markers
  const sportConfig = {
    "Basketball": { color: '#F97316', emoji: '🏀' },
    "Soccer": { color: '#10B981', emoji: '⚽' },
    "Tennis": { color: '#84CC16', emoji: '🎾' },
    "Baseball": { color: '#EF4444', emoji: '⚾' },
    "Volleyball": { color: '#8B5CF6', emoji: '🏐' },
    "Swimming": { color: '#3B82F6', emoji: '🏊' },
    "Fitness": { color: '#06B6D4', emoji: '💪' },
    "Gym": { color: '#06B6D4', emoji: '💪' },
    "Running": { color: '#EC4899', emoji: '🏃' },
    "Skating": { color: '#64748B', emoji: '🛹' },
    "Multi-sport": { color: '#059669', emoji: '🌳' },
    "Public Park": { color: '#059669', emoji: '🌳' },
  };

  // 1. First: Try to get User Location before loading map
  useEffect(() => {
    if (minimal) return;

    if (!("geolocation" in navigator)) {
      setIsLocating(false);
      return;
    }

    const timer = setTimeout(() => {
      // Timeout fallback: just load the map at default center
      console.log("Location timeout - falling back to default");
      setIsLocating(false);
    }, 4000); // 4 second timeout

    navigator.geolocation.getCurrentPosition(
      (position) => {
        clearTimeout(timer);
        const { latitude, longitude } = position.coords;
        setUserLocation([latitude, longitude]);
        setInitCenter([latitude, longitude]); // Set this so map init uses it

        if (onUserLocationFound) {
          onUserLocationFound(latitude, longitude);
        }
        setIsLocating(false); // Ready to render map
      },
      (error) => {
        clearTimeout(timer);
        console.log("Auto-location failed or denied", error);
        setIsLocating(false);
      },
      { timeout: 3500 }
    );
  }, [minimal, onUserLocationFound]);

  // 2. Initialize Map (Only after isLocating is false)
  useEffect(() => {
    if (isLocating) return;

    let isMounted = true;

    const initMap = async () => {
      if (mapInstanceRef.current) return; // Already initialized

      try {
        const L = (await import('leaflet')).default;
        await import('leaflet/dist/leaflet.css');

        if (!isMounted) return;
        // Double check ref after async wait
        if (mapInstanceRef.current) return;
        // Triple check DOM element integrity
        if (mapRef.current?._leaflet_id) return;

        // Styles
        if (!document.getElementById('pin-animation-style')) {
          const style = document.createElement('style');
          style.id = 'pin-animation-style';
          style.innerHTML = `
                 @keyframes pinPopReveal {
                     0% { opacity: 0; transform: scale(0.5); }
                     70% { opacity: 1; transform: scale(1.15); }
                     100% { opacity: 1; transform: scale(1); }
                 }
                 .marker-pin {
                     animation: pinPopReveal 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) both;
                     animation-iteration-count: 1;
                     transform-origin: center bottom;
                 }
                 .selection-pin {
                     animation: pinPopReveal 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) both;
                     animation-iteration-count: 1;
                     transform-origin: bottom center;
                 }
             `;
          document.head.appendChild(style);
        }

        // Fix Icon
        delete L.Icon.Default.prototype._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        });

        // Map Instance
        const map = L.map(mapRef.current, {
          attributionControl: false,
          zoomControl: !minimal,
          maxBounds: [[-90, -180], [90, 180]],
          maxBoundsViscosity: 1.0,
          worldCopyJump: false
        }).setView(initCenter, initialZoom);

        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
          attribution: '&copy; OpenStreetMap &copy; CARTO',
          subdomains: 'abcd',
          maxZoom: 20,
          noWrap: true,
          bounds: [[-90, -180], [90, 180]]
        }).addTo(map);

        mapInstanceRef.current = map;
        setMapReady(true);

      } catch (error) {
        console.error("Error initializing map:", error);
      }
    };

    initMap();

    // Cleanup function
    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        setMapReady(false);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLocating, minimal]); // Removed initCenter/initialZoom to prevent re-init loops

  // 2.5 Handle Center Updates (Fly to new center if map exists)
  useEffect(() => {
    if (mapReady && mapInstanceRef.current && initCenter) {
      mapInstanceRef.current.flyTo(initCenter, initialZoom);
    }
  }, [mapReady, initCenter, initialZoom]);


  // 3. Handle User Location Marker (Separate Effect)
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current || minimal || !userLocation) return;

    const renderUserMarker = async () => {
      const L = (await import('leaflet')).default;
      const map = mapInstanceRef.current;

      if (userMarkerRef.current) map.removeLayer(userMarkerRef.current);

      const userIcon = L.divIcon({
        className: 'user-location-marker',
        html: `<div style="width: 16px; height: 16px; background-color: #3b82f6; border: 3px solid white; border-radius: 50%; box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.4);"></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      userMarkerRef.current = L.marker(userLocation, { icon: userIcon }).addTo(map);
      userMarkerRef.current.bindPopup("You are here");
    };
    renderUserMarker();
  }, [mapReady, minimal, userLocation]);


  // 4. Handle Venue Markers (Smart Diffing - ONLY renders changes)
  const venueMarkersRef = useRef({}); // Store markers by venue ID: { [id]: marker }

  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current) return;

    const renderVenues = async () => {
      const L = (await import('leaflet')).default;
      const map = mapInstanceRef.current;
      const currentMarkers = venueMarkersRef.current;
      const newVenuesSet = new Set(venues.map(v => v.id));

      // 1. Remove markers that are no longer in the list
      Object.keys(currentMarkers).forEach(venueId => {
        if (!newVenuesSet.has(venueId) && !newVenuesSet.has(parseInt(venueId))) {
          map.removeLayer(currentMarkers[venueId]);
          delete currentMarkers[venueId];
        }
      });

      // 2. Add or Update markers
      venues.forEach((venue, index) => {
        let lat, lng;
        if (Array.isArray(venue.coordinates)) {
          [lat, lng] = venue.coordinates;
        } else if (venue.coordinates?.lat) {
          lat = venue.coordinates.lat;
          lng = venue.coordinates.lng;
        } else if (venue.lat && venue.lng) {
          lat = venue.lat;
          lng = venue.lng;
        }

        if (lat && lng) {
          // If marker already exists...
          if (currentMarkers[venue.id]) {
            const existingMarker = currentMarkers[venue.id];
            const existingLatLng = existingMarker.getLatLng();

            // Check if moved (simple epsilon check)
            const isSamePos = Math.abs(existingLatLng.lat - lat) < 0.0001 &&
              Math.abs(existingLatLng.lng - lng) < 0.0001;

            if (isSamePos) {
              return; // Same ID, Same Spot -> Do nothing (Stable)
            } else {
              // Same ID, New Spot -> Remove old, let it re-create (Animation!)
              map.removeLayer(existingMarker);
              delete currentMarkers[venue.id];
            }
          }

          let sportKey = 'Multi-sport';
          let emoji = '📍';
          const sportsList = Array.isArray(venue.sports) ? venue.sports : (venue.sport ? [venue.sport] : []);

          if (sportsList.length > 1) {
            sportKey = 'Multi-sport';
            emoji = '🏟️';
          } else if (sportsList.length === 1) {
            sportKey = sportsList[0];
            emoji = sportConfig[sportKey]?.emoji || '📍';
          } else {
            sportKey = venue.type || 'Venue';
          }

          const config = sportConfig[sportKey] || { color: '#6366f1', emoji: emoji };
          if (sportKey === 'Multi-sport') {
            config.color = '#8b5cf6';
            config.emoji = '🏟️';
          }

          const isCommunity = !!venue.created_by;
          const borderColor = isCommunity ? '#14b8a6' : 'white';

          // Optimized delay: Cap it so large lists don't wait forever. Waves of 15.
          const delay = (index % 15) * 0.05;

          const customIcon = L.divIcon({
            className: 'custom-venue-marker',
            html: `<div class="marker-pin" style="
                    background-color: ${config.color};
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border: 2px solid ${borderColor};
                    box-shadow: 0 4px 6px rgba(0,0,0,0.3);
                    font-size: 18px;
                    animation-delay: ${delay}s;
                  ">${config.emoji}</div>`,
            iconSize: [32, 32],
            iconAnchor: [16, 16],
            popupAnchor: [0, -20]
          });

          const marker = L.marker([lat, lng], { icon: customIcon }).addTo(map);

          if (!minimal) {
            const detailUrl = `/locations/${venue.id}${isCommunity ? '?type=community' : '?type=business'}`;
            const sportsDisplay = sportsList.length > 1
              ? `${sportsList.length} Sports: ${sportsList.slice(0, 2).join(', ')}${sportsList.length > 2 ? '...' : ''}`
              : sportKey;

            const popupContent = document.createElement('div');
            popupContent.innerHTML = `
                      <div style="color: black; padding: 5px; min-width: 150px;">
                        <strong style="font-size: 1.1em">${venue.name}</strong><br/>
                        <span style="color: ${config.color}; font-weight: 600; font-size: 0.9em">${sportsDisplay}</span><br/>
                        ${isCommunity ? '<span style="font-size:0.75rem; background:#14b8a6; color:white; padding:2px 6px; border-radius:10px;">Community</span>' : ''}
                        <br/>
                        <button id="btn-${venue.id}" style="margin-top: 8px; background: ${config.color}; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; width: 100%; font-size: 0.9em">
                          ${isCommunity ? 'Join Activity' : 'View Details'}
                        </button>
                      </div>
                    `;
            marker.bindPopup(popupContent);
            marker.on('popupopen', () => {
              const btn = document.getElementById(`btn-${venue.id}`);
              if (btn) btn.onclick = () => router.push(detailUrl);
            });
          }

          // Store in ref
          venueMarkersRef.current[venue.id] = marker;
        }
      });
    };

    const timer = setTimeout(() => {
      renderVenues();
    }, 100); // Small delay to allow overlay to start fading

    return () => clearTimeout(timer);
  }, [mapReady, venues, minimal, router]);

  // Click Handler - Same as before
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady) return;

    const handleMapClickEvent = (e) => {
      if (isAddingLocation && onMapClick) {
        const newLocation = { lat: e.latlng.lat, lng: e.latlng.lng };
        setSelectedLocation(newLocation);
        onMapClick(newLocation);
      }
    };

    map.on('click', handleMapClickEvent);
    return () => { map.off('click', handleMapClickEvent); };
  }, [isAddingLocation, onMapClick, mapReady]);

  // Marker Rendering Effect - Same as before
  useEffect(() => {
    if (!mapInstanceRef.current || !selectedLocation) return;
    const map = mapInstanceRef.current;
    const renderMarker = async () => {
      const L = (await import('leaflet')).default;
      if (tempMarkerRef.current) map.removeLayer(tempMarkerRef.current);
      const selectionIcon = L.divIcon({
        className: 'selection-pin-marker',
        html: `<div class="selection-pin" style="transform: translate(0, -5px);">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="#EF4444" stroke="white" stroke-width="2" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3)); display: block;">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                    <circle cx="12" cy="9" r="2.5" fill="white" />
                </svg>
            </div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 36]
      });
      const marker = L.marker([selectedLocation.lat, selectedLocation.lng], {
        icon: selectionIcon,
        zIndexOffset: 1000
      }).addTo(map);
      tempMarkerRef.current = marker;
    };
    renderMarker();
  }, [selectedLocation]);

  // Search Handler (Unchanged)
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        const newCoords = [parseFloat(lat), parseFloat(lon)];
        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo(newCoords, 16);
          if (isAddingLocation && onMapClick) {
            const newLocation = { lat: parseFloat(lat), lng: parseFloat(lon) };
            setSelectedLocation(newLocation);
            onMapClick(newLocation);
          }
        }
      } else {
        alert('Location not found');
      }
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleLocateMe = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation([latitude, longitude]);
        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([latitude, longitude], 14);
        }
      }, (error) => {
        console.error("Error getting location:", error);
        alert("Could not get your location.");
      });
    }
  };

  return (
    <div
      className={`glass-panel ${className}`}
      style={{
        position: 'relative',
        height: '500px',
        width: '100%',
        borderRadius: '16px',
        overflow: 'hidden',
        zIndex: 0,
        ...style
      }}
    >
      <div ref={mapRef} style={{ height: '100%', width: '100%', zIndex: 0, backgroundColor: '#0f0f0fff' }} />

      {/* Locating Overlay */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        background: '#0f0f0f',
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        zIndex: 600,
        transition: 'opacity 0.8s ease, visibility 0.8s ease',
        opacity: isLocating ? 1 : 0,
        visibility: isLocating ? 'visible' : 'hidden',
        pointerEvents: isLocating ? 'auto' : 'none'
      }}>
        <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          <p className="pulse-text" style={{ fontSize: '1.2rem', marginBottom: '10px' }}>📍</p>
          <p>Locating you...</p>
        </div>
      </div>

      {
        !minimal && (
          <>
            <form
              onSubmit={handleSearch}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                zIndex: 500,
                background: 'white',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                display: 'flex',
                overflow: 'hidden',
                width: '260px'
              }}
            >
              <input
                type="text"
                placeholder="Search places..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  border: 'none',
                  padding: '10px 14px',
                  outline: 'none',
                  flex: 1,
                  color: '#333'
                }}
              />
              <button
                type="submit"
                style={{
                  background: 'var(--color-primary, #3b82f6)',
                  color: 'white',
                  border: 'none',
                  padding: '0 12px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                {isSearching ? '...' : '🔍'}
              </button>
            </form>

            <button
              onClick={handleLocateMe}
              style={{
                position: 'absolute',
                bottom: '20px',
                right: '20px',
                zIndex: 400,
                background: 'white',
                color: '#333',
                border: 'none',
                padding: '10px 16px',
                borderRadius: '8px',
                boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
                cursor: 'pointer',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              type="button"
            >
              📍 Locate Me
            </button>
          </>
        )
      }

      {
        isAddingLocation && (
          <div style={{
            position: 'absolute',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 400,
            background: 'rgba(20, 184, 166, 0.9)',
            backdropFilter: 'blur(8px)',
            color: 'white',
            padding: '8px 20px',
            borderRadius: '24px',
            fontWeight: '600',
            boxShadow: '0 8px 20px rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            whiteSpace: 'nowrap',
            pointerEvents: 'none'
          }}>
            <span>📍 Tap map to place pin</span>
          </div>
        )
      }
    </div >
  );
}
