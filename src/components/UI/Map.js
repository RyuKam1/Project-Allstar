"use client";
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Map({ venues = [], onUserLocationFound }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const userMarkerRef = useRef(null);
  const router = useRouter();
  const [userLocation, setUserLocation] = useState(null);

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

  useEffect(() => {
    // Attempt to auto-locate user on mount
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation([latitude, longitude]);
          if (onUserLocationFound) {
            onUserLocationFound(latitude, longitude);
          }
        },
        (error) => {
          console.log("Auto-location optional: staying on default city", error);
        },
        { timeout: 5000 }
      );
    }
  }, []);

  useEffect(() => {
    // Lazy load Leaflet
    const initMap = async () => {
      if (!mapRef.current) return;
      
      try {
        const L = (await import('leaflet')).default;
        await import('leaflet/dist/leaflet.css');

        // Initialize Map
        if (!mapInstanceRef.current) {
          delete L.Icon.Default.prototype._getIconUrl;
          L.Icon.Default.mergeOptions({
            iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
            iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
          });

          const map = L.map(mapRef.current, { attributionControl: false }).setView([40.7300, -74.0000], 12);
          
          L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; OpenStreetMap &copy; CARTO',
            subdomains: 'abcd',
            maxZoom: 20
          }).addTo(map);

          mapInstanceRef.current = map;
        }

        const map = mapInstanceRef.current;
        
        // Remove old venue markers
        map.eachLayer((layer) => {
          if (layer instanceof L.Marker && layer !== userMarkerRef.current) {
            map.removeLayer(layer);
          }
        });

        // Add Venue Markers with Custom Icons
        venues.forEach(venue => {
          if (venue.coordinates) {
            // Determine style based on sport or type
            const key = venue.sport || venue.type;
            const config = sportConfig[key] || { color: '#6366f1', emoji: '📍' };

            const customIcon = L.divIcon({
              className: 'custom-venue-marker',
              html: `<div style="
                background-color: ${config.color};
                width: 32px;
                height: 32px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                border: 2px solid white;
                box-shadow: 0 4px 6px rgba(0,0,0,0.3);
                font-size: 18px;
              ">${config.emoji}</div>`,
              iconSize: [32, 32],
              iconAnchor: [16, 16],
              popupAnchor: [0, -20]
            });

            const marker = L.marker(venue.coordinates, { icon: customIcon }).addTo(map);
            
            const popupContent = document.createElement('div');
            popupContent.innerHTML = `
              <div style="color: black; padding: 5px; min-width: 150px;">
                <strong style="font-size: 1.1em">${venue.name}</strong><br/>
                <span style="color: ${config.color}; font-weight: 600; font-size: 0.9em">${venue.sport || venue.type}</span><br/>
                <span style="color: #555; font-size: 0.85em">${venue.location}</span><br/>
                <button id="btn-${venue.id}" style="
                  margin-top: 8px; 
                  background: ${config.color}; 
                  color: white; 
                  border: none; 
                  padding: 6px 12px; 
                  border-radius: 4px; 
                  cursor: pointer;
                  width: 100%;
                  font-size: 0.9em"
                >
                  View Details
                </button>
              </div>
            `;
            
            marker.bindPopup(popupContent);
            marker.on('popupopen', () => {
              const btn = document.getElementById(`btn-${venue.id}`);
              if (btn) {
                btn.onclick = () => router.push(`/venues/${venue.id}`);
              }
            });
          }
        });

        // Handle User Location
        if (userLocation) {
          if (userMarkerRef.current) {
            map.removeLayer(userMarkerRef.current);
          }

          // Create a custom pulsing dot for user location
          const userIcon = L.divIcon({
            className: 'user-location-marker',
            html: `<div style="
              width: 16px;
              height: 16px;
              background-color: #3b82f6;
              border: 3px solid white;
              border-radius: 50%;
              box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.4);
            "></div>`,
            iconSize: [24, 24],
            iconAnchor: [12, 12]
          });

          userMarkerRef.current = L.marker(userLocation, { icon: userIcon }).addTo(map);
          userMarkerRef.current.bindPopup("You are here").openPopup();
          
          // Fly to user
          map.flyTo(userLocation, 14);
        }

      } catch (error) {
        console.error("Error loading Leaflet:", error);
      }
    };

    initMap();

    // Clean up
    return () => {
       // Map cleanup logic
    };
  }, [venues, router, userLocation]);

  const handleLocateMe = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation([latitude, longitude]);
      }, (error) => {
        console.error("Error getting location:", error);
        alert("Could not get your location. Please check permissions.");
      });
    } else {
      alert("Geolocation is not supported by your browser.");
    }
  };

  return (
    <div className="glass-panel" style={{ position: 'relative', height: '400px', width: '100%', borderRadius: '16px', overflow: 'hidden', zIndex: 0 }}>
      <div ref={mapRef} style={{ height: '100%', width: '100%', zIndex: 0, backgroundColor: '#0f0f0fff' }} />
      
      {/* Locate Me Button Overlay */}
      <button 
        onClick={handleLocateMe}
        style={{
          position: 'absolute',
          bottom: '20px',
          right: '20px',
          zIndex: 1000,
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
      >
        📍 Locate Me
      </button>
    </div>
  );
}
