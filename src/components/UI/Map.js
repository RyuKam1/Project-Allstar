"use client";

import Icon from "@/components/UI/Icon";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { geodesicCircleLatLngs } from "@/utils/geoUtils";
import { useNotificationCenter } from "@/components/UI/NotificationCenter";

/** Pin geometry shared by hover preview and placed selection marker (tip = bottom center). */
const SELECTION_PIN_SIZE = 36;
const SELECTION_PIN_ANCHOR = [SELECTION_PIN_SIZE / 2, SELECTION_PIN_SIZE];

const SELECTION_PIN_SVG = `<svg width="${SELECTION_PIN_SIZE}" height="${SELECTION_PIN_SIZE}" viewBox="0 0 24 24" fill="#EF4444" stroke="white" stroke-width="2" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 4px 6px rgba(0,0,0,0.35)); display: block;">
  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
  <circle cx="12" cy="9" r="2.5" fill="white" />
</svg>`;

function createSelectionPinIcon(L) {
  return L.divIcon({
    className: "selection-pin-marker",
    html: `<div class="selection-pin">${SELECTION_PIN_SVG}</div>`,
    iconSize: [SELECTION_PIN_SIZE, SELECTION_PIN_SIZE],
    iconAnchor: SELECTION_PIN_ANCHOR,
  });
}

export default function Map({
  venues = [],
  onUserLocationFound,
  onUserLocationUpdate,
  onLocationUnavailable,
  onGeolocationStatusChange,
  isAddingLocation,
  onMapClick,
  minimal = false,
  initialCenter = [40.73, -74.0],
  initialZoom = 12,
  style = {},
  className = "",
  center = null, // New prop for external control
  zoom = 14, // New prop for dynamic zoom control
  isGlobalView = false, // New prop for global view styling
  cityHighlightGeoJSON = null,
  cityHighlightCircle = null,
  hideInternalPlaceSearch = false,
  onUserMapNavigate,
  onLocateMeTriggered,
}) {
  const GEO_RETRY_DEBOUNCE_MS = 1200;
  const LOCATION_REFRESH_MS = 10000;
  const PARKS_FETCH_DEBOUNCE_MS = 2500;

  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const userMarkerRef = useRef(null);
  const initialCenterRef = useRef(false);
  const router = useRouter();
  const { notify } = useNotificationCenter();
  const [userLocation, setUserLocation] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const tempMarkerRef = useRef(null);
  const pinPreviewRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [parksOverlaySupported, setParksOverlaySupported] = useState(true);
  const parksOverlayRef = useRef(null);
  const parksOverlayAbortRef = useRef(null);
  const parksOverlayCacheRef = useRef(new globalThis.Map());
  const highlightLayerRef = useRef(null);
  const permissionStatusRef = useRef(null);
  const locationIntervalRef = useRef(null);
  const lastRetryRef = useRef(0);
  const suppressNavigateEventRef = useRef(false);
  const suppressNavigateTimerRef = useRef(null);

  const [isLocating, setIsLocating] = useState(!minimal);
  const [geoStatus, setGeoStatus] = useState(minimal ? "idle" : "pending");
  const [initCenter, setInitCenter] = useState(initialCenter);
  const [themeRefreshKey, setThemeRefreshKey] = useState(0);

  // Sport Configuration for Markers
  const sportConfig = {
    Basketball: { color: "#F97316", emoji: "🏀" },
    Soccer: { color: "#10B981", emoji: "⚽" },
    Tennis: { color: "#84CC16", emoji: "🎾" },
    Baseball: { color: "#EF4444", emoji: "⚾" },
    Volleyball: { color: "#8B5CF6", emoji: "🏐" },
    Swimming: { color: "#3B82F6", emoji: "🏊" },
    Fitness: { color: "#06B6D4", emoji: "💪" },
    Gym: { color: "#06B6D4", emoji: "💪" },
    Running: { color: "#EC4899", emoji: "🏃" },
    Skating: { color: "#64748B", emoji: "🛹" },
    "Multi-sport": { color: "#059669", emoji: "♾️" },
    "Public Park": { color: "#059669", emoji: "🌳" },
  };

  const emitGeoStatus = (status, payload = {}) => {
    setGeoStatus(status);
    if (onGeolocationStatusChange) {
      onGeolocationStatusChange({ status, ...payload });
    }
  };

  const suppressNavigateEvents = (durationMs = 700) => {
    suppressNavigateEventRef.current = true;
    if (suppressNavigateTimerRef.current) {
      clearTimeout(suppressNavigateTimerRef.current);
    }
    suppressNavigateTimerRef.current = setTimeout(() => {
      suppressNavigateEventRef.current = false;
    }, durationMs);
  };

  const clearLocationInterval = () => {
    if (locationIntervalRef.current) {
      clearInterval(locationIntervalRef.current);
      locationIntervalRef.current = null;
    }
  };

  const startLiveLocationUpdates = () => {
    if (minimal || isGlobalView || !("geolocation" in navigator)) return;
    clearLocationInterval();
    locationIntervalRef.current = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation([latitude, longitude]);
          if (onUserLocationUpdate) {
            onUserLocationUpdate(latitude, longitude);
          }
        },
        () => {
          // Silent in interval loop; state transitions are handled by explicit retries and Locate Me.
        },
        {
          timeout: 2500,
          enableHighAccuracy: false,
          maximumAge: 5000,
        },
      );
    }, LOCATION_REFRESH_MS);
  };

  const applyLocationFix = (
    latitude,
    longitude,
    { notifyInitial = false, flyTo = false } = {},
  ) => {
    setUserLocation([latitude, longitude]);
    setInitCenter([latitude, longitude]);
    if (!initialCenterRef.current) {
      initialCenterRef.current = true;
    }
    emitGeoStatus("granted");
    setIsLocating(false);

    if (notifyInitial && onUserLocationFound) {
      onUserLocationFound(latitude, longitude);
    }
    if (onUserLocationUpdate) {
      onUserLocationUpdate(latitude, longitude);
    }
    if (flyTo && mapInstanceRef.current) {
      suppressNavigateEvents();
      mapInstanceRef.current.flyTo([latitude, longitude], 14);
    }
  };

  const handleGeoError = (error) => {
    let reason = "error";
    let status = "unavailable";
    if (error?.code === 1) {
      reason = "denied";
      status = "denied";
    } else if (error?.code === 2) {
      reason = "unavailable";
      status = "unavailable";
    } else if (error?.code === 3) {
      reason = "timeout";
      status = "timeout";
    }
    clearLocationInterval();
    setIsLocating(false);
    emitGeoStatus(status, { reason, errorCode: error?.code });
    if (onLocationUnavailable) {
      onLocationUnavailable({ reason, error });
    }
  };

  const requestLocation = ({
    notifyInitial = false,
    flyTo = false,
    timeout = 3500,
  } = {}) => {
    if (minimal) return;
    if (!("geolocation" in navigator)) {
      emitGeoStatus("unsupported", { reason: "unsupported" });
      setIsLocating(false);
      clearLocationInterval();
      if (onLocationUnavailable) {
        onLocationUnavailable({ reason: "unsupported" });
      }
      return;
    }

    if (notifyInitial) {
      setIsLocating(true);
      emitGeoStatus("pending");
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        applyLocationFix(latitude, longitude, { notifyInitial, flyTo });
      },
      (error) => {
        handleGeoError(error);
      },
      {
        timeout,
        enableHighAccuracy: true,
        maximumAge: 1000,
      },
    );
  };

  const retryLocationProbe = () => {
    const now = Date.now();
    if (now - lastRetryRef.current < GEO_RETRY_DEBOUNCE_MS) return;
    lastRetryRef.current = now;
    requestLocation({ notifyInitial: true, timeout: 2500 });
  };

  // 1. Initialize map immediately; geolocation runs in parallel.
  useEffect(() => {
    let isMounted = true;

    const initMap = async () => {
      if (mapInstanceRef.current) return; // Already initialized

      try {
        const L = (await import("leaflet")).default;
        await import("leaflet/dist/leaflet.css");

        if (!isMounted) return;
        // Double check ref after async wait
        if (mapInstanceRef.current) return;
        // Triple check DOM element integrity
        if (mapRef.current?._leaflet_id) return;

        // Styles
        if (!document.getElementById("pin-animation-style")) {
          const style = document.createElement("style");
          style.id = "pin-animation-style";
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
                 .city-outline-glow {
                     filter: drop-shadow(0 0 6px var(--map-highlight-glow, rgba(255, 255, 255, 0.22)))
                             drop-shadow(0 0 14px var(--map-highlight-glow, rgba(255, 255, 255, 0.12)));
                 }
             `;
          document.head.appendChild(style);
        }

        // Fix Icon
        delete L.Icon.Default.prototype._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl:
            "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
          iconUrl:
            "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
          shadowUrl:
            "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
        });

        // Map Instance
        const map = L.map(mapRef.current, {
          attributionControl: false,
          zoomControl: !minimal,
          maxBounds: [
            [-90, -180],
            [90, 180],
          ],
          maxBoundsViscosity: 1.0,
          worldCopyJump: false,
        }).setView(initCenter, initialZoom);

        L.tileLayer(
          "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
          {
            attribution: "&copy; OpenStreetMap &copy; CARTO",
            subdomains: "abcd",
            maxZoom: 20,
            noWrap: true,
            bounds: [
              [-90, -180],
              [90, 180],
            ],
          },
        ).addTo(map);

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
      clearLocationInterval();
      if (mapInstanceRef.current) {
        if (suppressNavigateTimerRef.current) {
          clearTimeout(suppressNavigateTimerRef.current);
        }
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        setMapReady(false);
      }
    };
  }, [minimal]);

  // 1.5 Initial location request.
  useEffect(() => {
    if (minimal) return;
    requestLocation({ notifyInitial: true, timeout: 3500 });
  }, [minimal]);

  // 1.6 Permission API watchers + lifecycle retries.
  useEffect(() => {
    if (minimal || !("geolocation" in navigator)) return undefined;

    let cancelled = false;
    const setupPermissions = async () => {
      if (!navigator.permissions?.query) return;
      try {
        const status = await navigator.permissions.query({ name: "geolocation" });
        if (cancelled) return;
        permissionStatusRef.current = status;
        if (status.state === "denied") {
          emitGeoStatus("denied", { reason: "denied" });
        }
        status.onchange = () => {
          if (status.state === "granted") {
            retryLocationProbe();
          } else if (status.state === "denied") {
            clearLocationInterval();
            emitGeoStatus("denied", { reason: "denied" });
            if (onLocationUnavailable) {
              onLocationUnavailable({ reason: "denied" });
            }
          }
        };
      } catch (error) {
        console.warn("Permissions API not available for geolocation.", error);
      }
    };

    setupPermissions();

    const onFocus = () => retryLocationProbe();
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") retryLocationProbe();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      if (permissionStatusRef.current) {
        permissionStatusRef.current.onchange = null;
      }
    };
  }, [minimal, onLocationUnavailable]);

  // 1.7 Live location refresh loop while granted.
  useEffect(() => {
    if (minimal || isGlobalView || geoStatus !== "granted") {
      clearLocationInterval();
      return;
    }
    startLiveLocationUpdates();
    return () => clearLocationInterval();
  }, [minimal, isGlobalView, geoStatus]);

  // 2.5 Handle Center & Zoom Updates (Fly to new center if map exists)
  useEffect(() => {
    if (mapReady && mapInstanceRef.current && center) {
      suppressNavigateEvents();
      mapInstanceRef.current.flyTo(center, zoom);
    }
  }, [mapReady, center, zoom]);

  useEffect(() => {
    if (mapReady && mapInstanceRef.current && initCenter && !center) {
      // Only use initCenter if no external center provided
      suppressNavigateEvents();
      mapInstanceRef.current.flyTo(initCenter, initialZoom);
    }
  }, [mapReady, initCenter, initialZoom]);

  // Detect manual map navigation so parent can stop auto-follow.
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady || typeof onUserMapNavigate !== "function") return;

    const notifyNavigate = (e) => {
      if (suppressNavigateEventRef.current) return;
      if (
        e?.originalEvent ||
        e?.type === "dragstart" ||
        e?.type === "zoomstart" ||
        e?.type === "movestart" ||
        e?.type === "wheel"
      ) {
        onUserMapNavigate();
      }
    };

    // dragstart/zoomstart catch explicit pan+zoom actions;
    // movestart helps capture touch interactions on mobile.
    map.on("dragstart", notifyNavigate);
    map.on("zoomstart", notifyNavigate);
    map.on("movestart", notifyNavigate);
    map.on("wheel", notifyNavigate);

    return () => {
      map.off("dragstart", notifyNavigate);
      map.off("zoomstart", notifyNavigate);
      map.off("movestart", notifyNavigate);
      map.off("wheel", notifyNavigate);
    };
  }, [mapReady, onUserMapNavigate]);

  // Keep map dimensions healthy on mobile rotations/layout shifts.
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current || !mapRef.current) return;

    const map = mapInstanceRef.current;
    const resize = () => map.invalidateSize();

    window.addEventListener("resize", resize);
    const observer = new ResizeObserver(resize);
    observer.observe(mapRef.current);

    return () => {
      window.removeEventListener("resize", resize);
      observer.disconnect();
    };
  }, [mapReady]);

  // Repaint highlight styles immediately when theme changes.
  useEffect(() => {
    if (typeof document === "undefined") return undefined;

    const bump = () => setThemeRefreshKey((prev) => prev + 1);
    const observer = new MutationObserver((mutations) => {
      const changedTheme = mutations.some(
        (m) =>
          m.type === "attributes" &&
          m.attributeName === "data-theme" &&
          (m.target === document.documentElement || m.target === document.body),
      );
      if (changedTheme) bump();
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    if (document.body) {
      observer.observe(document.body, {
        attributes: true,
        attributeFilter: ["data-theme"],
      });
    }

    return () => observer.disconnect();
  }, []);

  // 3. Handle User Location Marker (Separate Effect)
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current || minimal || !userLocation)
      return;

    // Hide user location if in global view
    const map = mapInstanceRef.current;
    if (isGlobalView) {
      if (userMarkerRef.current) {
        map.removeLayer(userMarkerRef.current);
        userMarkerRef.current = null;
      }
      return;
    }

    const renderUserMarker = async () => {
      const L = (await import("leaflet")).default;

      const userIcon = L.divIcon({
        className: "user-location-marker",
        html: `<div style="width: 16px; height: 16px; background-color: #3b82f6; border: 3px solid white; border-radius: 50%; box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.4);"></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      if (userMarkerRef.current) {
        userMarkerRef.current.setLatLng(userLocation);
      } else {
        userMarkerRef.current = L.marker(userLocation, { icon: userIcon }).addTo(
          map,
        );
        userMarkerRef.current.bindPopup("You are here");
      }
    };
    renderUserMarker();
  }, [mapReady, minimal, userLocation, isGlobalView]);

  // City highlight outline layer.
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current || minimal || isGlobalView) {
      if (highlightLayerRef.current && mapInstanceRef.current) {
        mapInstanceRef.current.removeLayer(highlightLayerRef.current);
        highlightLayerRef.current = null;
      }
      return;
    }

    const renderHighlight = async () => {
      const L = (await import("leaflet")).default;
      const map = mapInstanceRef.current;
      if (!map) return;
      const rootStyles = getComputedStyle(document.documentElement);
      const themedOutlineColor =
        rootStyles.getPropertyValue("--map-highlight-stroke").trim() ||
        rootStyles.getPropertyValue("--color-primary").trim() ||
        rootStyles.getPropertyValue("--text-main").trim() ||
        "#60a5fa";
      const themedFillColor =
        rootStyles.getPropertyValue("--map-highlight-fill").trim() ||
        `rgba(${rootStyles.getPropertyValue("--color-primary-rgb").trim() || "99,102,241"}, 0.14)`;
      const strokeWeight = parseFloat(
        rootStyles.getPropertyValue("--map-highlight-stroke-width").trim() || "1.2",
      );
      const strokeOpacity = parseFloat(
        rootStyles.getPropertyValue("--map-highlight-stroke-opacity").trim() || "0.78",
      );
      const polygonFillOpacity = parseFloat(
        rootStyles.getPropertyValue("--map-highlight-fill-opacity").trim() || "0.08",
      );
      const circleFillOpacity = parseFloat(
        rootStyles.getPropertyValue("--map-highlight-circle-fill-opacity").trim() || "0.06",
      );

      if (highlightLayerRef.current) {
        map.removeLayer(highlightLayerRef.current);
        highlightLayerRef.current = null;
      }

      if (cityHighlightGeoJSON) {
        highlightLayerRef.current = L.geoJSON(cityHighlightGeoJSON, {
          style: {
            color: themedOutlineColor,
            weight: Number.isFinite(strokeWeight) ? strokeWeight : 1.2,
            opacity: Number.isFinite(strokeOpacity) ? strokeOpacity : 0.78,
            fill: true,
            fillColor: themedFillColor,
            fillOpacity: Number.isFinite(polygonFillOpacity)
              ? polygonFillOpacity
              : 0.08,
            className: "city-outline-glow",
          },
        }).addTo(map);
        return;
      }

      if (cityHighlightCircle?.center && cityHighlightCircle?.radiusMeters) {
        const [cLat, cLng] = cityHighlightCircle.center;
        const ring = geodesicCircleLatLngs(
          cLat,
          cLng,
          cityHighlightCircle.radiusMeters,
        );
        if (ring.length >= 4) {
          highlightLayerRef.current = L.polygon(ring, {
            color: themedOutlineColor,
            weight: Number.isFinite(strokeWeight) ? strokeWeight : 1.2,
            opacity: Number.isFinite(strokeOpacity) ? strokeOpacity : 0.78,
            fill: true,
            fillColor: themedFillColor,
            fillOpacity: Number.isFinite(circleFillOpacity)
              ? circleFillOpacity
              : 0.06,
            className: "city-outline-glow",
          }).addTo(map);
        }
      }
    };

    renderHighlight();
  }, [
    mapReady,
    minimal,
    isGlobalView,
    cityHighlightGeoJSON,
    cityHighlightCircle,
    themeRefreshKey,
  ]);

  // 3.5 Parks Overlay (green)
  useEffect(() => {
    if (
      !mapReady ||
      !mapInstanceRef.current ||
      minimal ||
      isGlobalView ||
      !parksOverlaySupported
    )
      return undefined;

    const map = mapInstanceRef.current;
    let disposed = false;
    let debounceTimer = null;

    const clearOverlay = () => {
      if (parksOverlayAbortRef.current) {
        parksOverlayAbortRef.current.abort();
        parksOverlayAbortRef.current = null;
      }
      if (parksOverlayRef.current) {
        map.removeLayer(parksOverlayRef.current);
        parksOverlayRef.current = null;
      }
    };

    const fetchParks = async () => {
      try {
        const L = (await import("leaflet")).default;
        if (disposed || !mapInstanceRef.current) return;
        const zoom = map.getZoom();
        if (zoom < 13) {
          clearOverlay();
          return;
        }

        const bounds = map.getBounds();
        const bbox = `${bounds.getSouth()},${bounds.getWest()},${bounds.getNorth()},${bounds.getEast()}`;
        const cacheKey = `${zoom}:${bbox}`;
        const cachedFeatures = parksOverlayCacheRef.current.get(cacheKey);
        if (cachedFeatures) {
          if (parksOverlayRef.current) {
            map.removeLayer(parksOverlayRef.current);
          }
          parksOverlayRef.current = L.geoJSON(
            { type: "FeatureCollection", features: cachedFeatures },
            {
              style: {
                color: "#22c55e",
                weight: 1.2,
                opacity: 0.72,
                fillColor: "#16a34a",
                fillOpacity: 0.18,
              },
            },
          ).addTo(map);
          return;
        }

        if (parksOverlayAbortRef.current) {
          parksOverlayAbortRef.current.abort();
        }
        const controller = new AbortController();
        parksOverlayAbortRef.current = controller;

        const query = `
          [out:json][timeout:20];
          (
            nwr["leisure"="park"](${bbox});
          );
          out geom;
        `;

        const response = await fetch(
          "https://overpass-api.de/api/interpreter",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/x-www-form-urlencoded; charset=UTF-8",
            },
            body: `data=${encodeURIComponent(query)}`,
            signal: controller.signal,
          },
        );

        if (!response.ok) {
          if (response.status >= 400) setParksOverlaySupported(false);
          return;
        }

        const data = await response.json();
        if (disposed || !data?.elements) return;

        const features = data.elements
          .map((el) => {
            if (!Array.isArray(el.geometry) || el.geometry.length < 3)
              return null;
            const coords = el.geometry.map((p) => [p.lon, p.lat]);
            const first = coords[0];
            const last = coords[coords.length - 1];
            const isClosed =
              first && last && first[0] === last[0] && first[1] === last[1];

            return {
              type: "Feature",
              geometry: {
                type: isClosed ? "Polygon" : "LineString",
                coordinates: isClosed ? [coords] : coords,
              },
              properties: {
                name: el.tags?.name || "Park",
              },
            };
          })
          .filter(Boolean);
        parksOverlayCacheRef.current.set(cacheKey, features);
        if (parksOverlayCacheRef.current.size > 24) {
          const firstKey = parksOverlayCacheRef.current.keys().next().value;
          parksOverlayCacheRef.current.delete(firstKey);
        }

        if (parksOverlayRef.current) {
          map.removeLayer(parksOverlayRef.current);
        }

        parksOverlayRef.current = L.geoJSON(
          { type: "FeatureCollection", features },
          {
            style: {
              color: "#22c55e",
              weight: 1.2,
              opacity: 0.72,
              fillColor: "#16a34a",
              fillOpacity: 0.18,
            },
          },
        ).addTo(map);
      } catch (error) {
        if (error?.name === "AbortError") return;
        if (
          error instanceof TypeError ||
          /Failed to fetch/i.test(String(error?.message || ""))
        ) {
          setParksOverlaySupported(false);
        }
      }
    };

    const scheduleFetch = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(fetchParks, PARKS_FETCH_DEBOUNCE_MS);
    };

    scheduleFetch();
    map.on("moveend", scheduleFetch);
    map.on("zoomend", scheduleFetch);

    return () => {
      disposed = true;
      if (debounceTimer) clearTimeout(debounceTimer);
      map.off("moveend", scheduleFetch);
      map.off("zoomend", scheduleFetch);
      clearOverlay();
    };
  }, [mapReady, minimal, isGlobalView, parksOverlaySupported]);

  // 4. Handle Venue Markers (Smart Diffing - ONLY renders changes)
  const venueMarkersRef = useRef({}); // Store markers by venue ID: { [id]: marker }
  // Keep track of the view mode used for the current markers to force update on change
  const lastViewModeRef = useRef(isGlobalView);

  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current) return;

    // Check if view mode changed, if so we might need to clear all to force re-render style
    const viewModeChanged = lastViewModeRef.current !== isGlobalView;
    if (viewModeChanged) {
      // Clear all markers to force full re-render with new style
      const map = mapInstanceRef.current;
      Object.values(venueMarkersRef.current).forEach((marker) =>
        map.removeLayer(marker),
      );
      venueMarkersRef.current = {};
      lastViewModeRef.current = isGlobalView;
    }

    const renderVenues = async () => {
      const L = (await import("leaflet")).default;
      const map = mapInstanceRef.current;
      const currentMarkers = venueMarkersRef.current;
      const newVenuesSet = new Set(venues.map((v) => v.id));

      // 1. Remove markers that are no longer in the list
      Object.keys(currentMarkers).forEach((venueId) => {
        if (
          !newVenuesSet.has(venueId) &&
          !newVenuesSet.has(parseInt(venueId))
        ) {
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
            // Since we clear on viewMode change, existence here means it's valid for current mode
            // Just check position
            const existingMarker = currentMarkers[venue.id];
            const existingLatLng = existingMarker.getLatLng();

            // Check if moved (simple epsilon check)
            const isSamePos =
              Math.abs(existingLatLng.lat - lat) < 0.0001 &&
              Math.abs(existingLatLng.lng - lng) < 0.0001;

            if (isSamePos) {
              return; // Same ID, Same Spot, Same Mode -> Do nothing
            } else {
              map.removeLayer(existingMarker);
              delete currentMarkers[venue.id];
            }
          }

          let sportKey = "Multi-sport";
          let emoji = "📍";
          const sportsList = Array.isArray(venue.sports)
            ? venue.sports
            : venue.sport
              ? [venue.sport]
              : [];

          if (sportsList.length > 1) {
            sportKey = "Multi-sport";
            emoji = "♾️";
          } else if (sportsList.length === 1) {
            sportKey = sportsList[0];
            emoji = sportConfig[sportKey]?.emoji || "📍";
          } else {
            sportKey = venue.type || "Venue";
          }

          const config = sportConfig[sportKey] || {
            color: "#6366f1",
            emoji: emoji,
          };
          if (sportKey === "Multi-sport") {
            config.color = "#8b5cf6";
            config.emoji = "♾️";
          }

          const isCommunity = !!venue.created_by;
          const borderColor = isCommunity ? "#14b8a6" : "white";

          // Optimized delay: Cap it so large lists don't wait forever. Waves of 15.
          const delay = (index % 15) * 0.05;

          // GLOBAL VIEW SMALL MARKER
          let customIcon;
          if (isGlobalView) {
            customIcon = L.divIcon({
              className: "custom-venue-marker-global",
              html: `<div class="marker-pin-global" style="
                      background-color: ${config.color};
                      width: 8px;
                      height: 8px;
                      border-radius: 50%;
                      border: 1px solid rgba(255,255,255,0.8);
                      box-shadow: 0 1px 2px rgba(0,0,0,0.3);
                    "></div>`,
              iconSize: [8, 8],
              iconAnchor: [4, 4],
              popupAnchor: [0, -5],
            });
          } else {
            // NORMAL MARKER
            customIcon = L.divIcon({
              className: "custom-venue-marker",
              html: `<div class="marker-pin" style="
                      background-color: ${config.color};
                      width: 28px;
                      height: 28px;
                      border-radius: 50%;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      border: 2px solid ${borderColor};
                      box-shadow: 0 4px 6px rgba(0,0,0,0.3);
                      font-size: 19px;
                      animation-delay: ${delay}s;
                    ">${config.emoji}</div>`,
              iconSize: [56, 56],
              iconAnchor: [28, 28],
              popupAnchor: [0, -24],
            });
          }

          const marker = L.marker([lat, lng], { icon: customIcon }).addTo(map);

          if (!minimal && !isGlobalView) {
            // Disable popups in global view to keep it clean? Or keep them?
            // User didn't ask to disable popups, but "reduce pins" implies simpler view.
            // Let's keep popups but maybe cleaner.
            // For now, attaching popup is fine.

            const detailUrl = `/locations/${venue.id}${isCommunity ? "?type=community" : "?type=business"}`;
            const sportsDisplay =
              sportsList.length > 1
                ? `${sportsList.length} Sports: ${sportsList.slice(0, 2).join(", ")}${sportsList.length > 2 ? "..." : ""}`
                : sportKey;

            const popupContent = document.createElement("div");
            popupContent.style.color = "black";
            popupContent.style.padding = "5px";
            popupContent.style.minWidth = "150px";

            const title = document.createElement("strong");
            title.style.fontSize = "1.1em";
            title.textContent = String(venue.name || "Venue");
            popupContent.appendChild(title);
            popupContent.appendChild(document.createElement("br"));

            const sportsText = document.createElement("span");
            sportsText.style.color = config.color;
            sportsText.style.fontWeight = "600";
            sportsText.style.fontSize = "0.9em";
            sportsText.textContent = sportsDisplay;
            popupContent.appendChild(sportsText);
            popupContent.appendChild(document.createElement("br"));

            if (isCommunity) {
              const communityBadge = document.createElement("span");
              communityBadge.style.fontSize = "0.75rem";
              communityBadge.style.background = "#14b8a6";
              communityBadge.style.color = "white";
              communityBadge.style.padding = "2px 6px";
              communityBadge.style.borderRadius = "10px";
              communityBadge.textContent = "Community";
              popupContent.appendChild(communityBadge);
              popupContent.appendChild(document.createElement("br"));
            }

            const detailsButton = document.createElement("button");
            detailsButton.type = "button";
            detailsButton.style.marginTop = "8px";
            detailsButton.style.background = config.color;
            detailsButton.style.color = "white";
            detailsButton.style.border = "none";
            detailsButton.style.padding = "6px 12px";
            detailsButton.style.borderRadius = "4px";
            detailsButton.style.cursor = "pointer";
            detailsButton.style.width = "100%";
            detailsButton.style.fontSize = "0.9em";
            detailsButton.textContent = isCommunity
              ? "Join Activity"
              : "View Details";
            detailsButton.addEventListener("click", () => router.push(detailUrl));
            popupContent.appendChild(detailsButton);

            marker.bindPopup(popupContent);
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
  }, [mapReady, venues, minimal, router, isGlobalView]);

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

    map.on("click", handleMapClickEvent);
    return () => {
      map.off("click", handleMapClickEvent);
    };
  }, [isAddingLocation, onMapClick, mapReady]);

  // Hover preview pin — tip tracks exact map coordinates under the pointer
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady || !isAddingLocation) {
      map?.getContainer()?.classList.remove("map-pin-drop-mode");
      if (pinPreviewRef.current) {
        pinPreviewRef.current.style.display = "none";
      }
      return;
    }

    const container = map.getContainer();
    container.classList.add("map-pin-drop-mode");

    const showPreviewAt = (latlng) => {
      const preview = pinPreviewRef.current;
      if (!preview || !latlng) return;
      const point = map.latLngToContainerPoint(latlng);
      preview.style.display = "block";
      preview.style.left = `${point.x}px`;
      preview.style.top = `${point.y}px`;
    };

    const hidePreview = () => {
      if (pinPreviewRef.current) {
        pinPreviewRef.current.style.display = "none";
      }
    };

    const onMouseMove = (e) => {
      showPreviewAt(e.latlng);
    };

    const onMouseOut = () => {
      hidePreview();
    };

    map.on("mousemove", onMouseMove);
    map.on("mouseout", onMouseOut);

    return () => {
      container.classList.remove("map-pin-drop-mode");
      map.off("mousemove", onMouseMove);
      map.off("mouseout", onMouseOut);
      hidePreview();
    };
  }, [isAddingLocation, mapReady]);

  // Marker Rendering Effect - Same as before
  useEffect(() => {
    if (!mapInstanceRef.current || !selectedLocation) return;
    const map = mapInstanceRef.current;
    const renderMarker = async () => {
      const L = (await import("leaflet")).default;
      if (tempMarkerRef.current) map.removeLayer(tempMarkerRef.current);
      const marker = L.marker([selectedLocation.lat, selectedLocation.lng], {
        icon: createSelectionPinIcon(L),
        zIndexOffset: 1000,
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
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`,
      );
      const data = await response.json();
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        const newCoords = [parseFloat(lat), parseFloat(lon)];
        if (mapInstanceRef.current) {
          suppressNavigateEvents();
          mapInstanceRef.current.flyTo(newCoords, 16);
          if (isAddingLocation && onMapClick) {
            const newLocation = { lat: parseFloat(lat), lng: parseFloat(lon) };
            setSelectedLocation(newLocation);
            onMapClick(newLocation);
          }
        }
      } else {
        notify("Location not found. Try a different search term.", "warning");
      }
    } catch (error) {
      console.error("Search failed:", error);
      notify("Search failed. Please try again.", "error");
    } finally {
      setIsSearching(false);
    }
  };

  const handleLocateMe = () => {
    if (typeof onLocateMeTriggered === "function") {
      onLocateMeTriggered();
    }
    requestLocation({ notifyInitial: true, flyTo: true, timeout: 3500 });
  };

  return (
    <div
      className={`glass-panel ${className}`}
      style={{
        position: "relative",
        height: "clamp(240px, 50dvh, 560px)",
        width: "100%",
        borderRadius: "16px",
        overflow: "hidden",
        zIndex: 0,
        ...style,
      }}
    >
      <div
        ref={mapRef}
        style={{
          height: "100%",
          width: "100%",
          zIndex: 0,
          backgroundColor: "#0f0f0fff",
        }}
      />

      {isAddingLocation && (
        <div
          className="map-pin-preview-layer"
          aria-hidden="true"
        >
          <div
            ref={pinPreviewRef}
            className="map-pin-preview"
            dangerouslySetInnerHTML={{ __html: SELECTION_PIN_SVG }}
          />
        </div>
      )}

      {!minimal && (isLocating || geoStatus !== "granted") && (
        <div
          style={{
            position: "absolute",
            top: "12px",
            left: "12px",
            zIndex: 600,
            background: "rgba(0, 0, 0, 0.55)",
            border: "1px solid rgba(255,255,255,0.2)",
            backdropFilter: "blur(8px)",
            color: "var(--text-main)",
            borderRadius: "999px",
            padding: "6px 12px",
            fontSize: "0.8rem",
            pointerEvents: "none",
          }}
        >
          {isLocating ? "Locating..." : "Manual city mode"}
        </div>
      )}

      {!minimal && (
        <>
          {!hideInternalPlaceSearch && (
            <form
              onSubmit={handleSearch}
              style={{
                position: "absolute",
                top: "20px",
                right: "20px",
                zIndex: 500,
                background: "white",
                borderRadius: "8px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                display: "flex",
                overflow: "hidden",
                width: "260px",
              }}
            >
              <input
                type="text"
                placeholder="Search places..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                suppressHydrationWarning
                style={{
                  border: "none",
                  padding: "10px 14px",
                  outline: "none",
                  flex: 1,
                  color: "#333",
                }}
              />
              <button
                type="submit"
                suppressHydrationWarning
                style={{
                  background: "var(--color-primary, #3b82f6)",
                  color: "white",
                  border: "none",
                  padding: "0 12px",
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
              >
                {isSearching ? "..." : <Icon name="search" size={16} />}
              </button>
            </form>
          )}

          <button
            onClick={handleLocateMe}
            suppressHydrationWarning
            style={{
              position: "absolute",
              bottom: "max(16px, env(safe-area-inset-bottom))",
              right: "20px",
              zIndex: 400,
              background: "white",
              color: "#333",
              border: "none",
              padding: "12px 18px",
              minHeight: "44px",
              borderRadius: "8px",
              boxShadow: "0 4px 6px rgba(0,0,0,0.3)",
              cursor: "pointer",
              fontWeight: "600",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
            type="button"
          >
            <Icon name="location" size={16} className="icon-inline" /> Locate Me
          </button>
        </>
      )}

      {isAddingLocation && (
        <div
          style={{
            position: "absolute",
            top: "20px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 400,
            background: "rgba(20, 184, 166, 0.9)",
            backdropFilter: "blur(8px)",
            color: "white",
            padding: "8px 20px",
            borderRadius: "24px",
            fontWeight: "600",
            boxShadow: "0 8px 20px rgba(0,0,0,0.3)",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            whiteSpace: "nowrap",
            pointerEvents: "none",
          }}
        >
          <Icon name="location" size={16} className="icon-inline" /> Click map to place pin
        </div>
      )}
    </div>
  );
}
