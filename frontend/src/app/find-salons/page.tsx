"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Check,
  Crosshair,
  ExternalLink,
  Loader2,
  MapPin,
  Navigation,
  Phone,
  Search,
  Scissors,
  Star,
  X,
} from "lucide-react";
import "leaflet/dist/leaflet.css";

type Salon = {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  rating: number | null;
  rating_count: number;
  phone: string | null;
  website: string | null;
  maps_url: string | null;
  opening_hours: unknown;
  open_status: string | null;
  distance_meters: number;
  distance: string;
  thumbnail: string | null;
  source: string;
};

type Location = {
  lat: number;
  lng: number;
};

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://127.0.0.1:8000";

const DEFAULT_CENTER: Location = {
  lat: 15.3647,
  lng: 75.124,
};

const RADIUS_OPTIONS = [
  {
    label: "2 km",
    value: 2000,
  },
  {
    label: "5 km",
    value: 5000,
  },
  {
    label: "10 km",
    value: 10000,
  },
];

function formatDistance(
  meters: number
) {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }

  return `${(
    meters / 1000
  ).toFixed(1)} km`;
}

export default function FindSalonsPage() {
  const mapContainerRef =
    useRef<HTMLDivElement>(null);

  const mapRef =
    useRef<any>(null);

  const markersRef =
    useRef<any[]>([]);

  const userMarkerRef =
    useRef<any>(null);

  const [loading, setLoading] =
    useState(false);

  const [locating, setLocating] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [query, setQuery] =
    useState("");

  const [radius, setRadius] =
    useState(5000);

  const [location, setLocation] =
    useState<Location | null>(null);

  const [locationLabel, setLocationLabel] =
    useState("");

  const [salons, setSalons] =
    useState<Salon[]>([]);

  const [selectedSalon, setSelectedSalon] =
    useState<Salon | null>(null);

  const [activeSalonId, setActiveSalonId] =
    useState<string | null>(null);

  // ========================================================
  // CREATE MAP
  // ========================================================

  useEffect(() => {
    let mounted = true;

    async function initializeMap() {
      if (
        !mapContainerRef.current ||
        mapRef.current
      ) {
        return;
      }

      try {
        const L =
          await import("leaflet");

        if (
          !mounted ||
          !mapContainerRef.current
        ) {
          return;
        }

        const map =
          L.map(
            mapContainerRef.current,
            {
              center: [
                DEFAULT_CENTER.lat,
                DEFAULT_CENTER.lng,
              ],
              zoom: 13,
              zoomControl: false,
              attributionControl: true,
            }
          );

        L.control
          .zoom({
            position:
              "bottomright",
          })
          .addTo(map);

        L.tileLayer(
          "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
          {
            maxZoom: 19,
            attribution:
              "&copy; OpenStreetMap contributors",
          }
        ).addTo(map);

        mapRef.current =
          map;

        setTimeout(() => {
          map.invalidateSize();
        }, 300);
      } catch (err) {
        console.error(
          "Map initialization failed:",
          err
        );
      }
    }

    initializeMap();

    return () => {
      mounted = false;

      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // ========================================================
  // CLEAR MARKERS
  // ========================================================

  function clearMarkers() {
    markersRef.current.forEach(
      (marker) => {
        try {
          marker.remove();
        } catch {}
      }
    );

    markersRef.current = [];

    if (userMarkerRef.current) {
      try {
        userMarkerRef.current.remove();
      } catch {}

      userMarkerRef.current =
        null;
    }
  }

  // ========================================================
  // DRAW RESULTS
  // ========================================================

  async function drawResults(
    results: Salon[],
    center: Location
  ) {
    if (!mapRef.current) {
      return;
    }

    const L =
      await import("leaflet");

    const map =
      mapRef.current;

    clearMarkers();

    // ------------------------------------------------------
    // USER LOCATION
    // ------------------------------------------------------

    const userIcon =
      L.divIcon({
        className: "",
        html: `
          <div
            style="
              width:18px;
              height:18px;
              border-radius:50%;
              background:#111;
              border:4px solid white;
              box-shadow:0 3px 15px rgba(0,0,0,.45);
            "
          ></div>
        `,
        iconSize: [
          18,
          18,
        ],
        iconAnchor: [
          9,
          9,
        ],
      });

    const userMarker =
      L.marker(
        [
          center.lat,
          center.lng,
        ],
        {
          icon: userIcon,
          title:
            "Search location",
        }
      ).addTo(map);

    userMarker.bindPopup(
      "<strong>Search location</strong>"
    );

    userMarkerRef.current =
      userMarker;

    // ------------------------------------------------------
    // SALON MARKERS
    // ------------------------------------------------------

    results.forEach(
      (
        salon,
        index
      ) => {
        const salonIcon =
          L.divIcon({
            className: "",
            html: `
              <div
                style="
                  width:34px;
                  height:34px;
                  border-radius:50%;
                  background:#fff;
                  color:#000;
                  border:2px solid rgba(0,0,0,.18);
                  display:flex;
                  align-items:center;
                  justify-content:center;
                  font-size:11px;
                  font-weight:700;
                  box-shadow:0 5px 18px rgba(0,0,0,.4);
                "
              >
                ${index + 1}
              </div>
            `,
            iconSize: [
              34,
              34,
            ],
            iconAnchor: [
              17,
              17,
            ],
          });

        const marker =
          L.marker(
            [
              salon.latitude,
              salon.longitude,
            ],
            {
              icon:
                salonIcon,
              title:
                salon.name,
            }
          ).addTo(map);

        marker.bindPopup(`
          <div style="min-width:200px">
            <strong>
              ${salon.name}
            </strong>

            <br />

            <span style="font-size:12px">
              ${salon.address}
            </span>

            ${
              salon.rating !==
              null
                ? `
                  <br />
                  <br />
                  ⭐ ${salon.rating.toFixed(
                    1
                  )}
                  ${
                    salon.rating_count >
                    0
                      ? ` (${salon.rating_count})`
                      : ""
                  }
                `
                : ""
            }

            <br />

            <span style="font-size:12px">
              ${formatDistance(
                salon.distance_meters
              )}
            </span>
          </div>
        `);

        marker.on(
          "click",
          () => {
            setSelectedSalon(
              salon
            );

            setActiveSalonId(
              salon.id
            );
          }
        );

        markersRef.current.push(
          marker
        );
      }
    );

    // ------------------------------------------------------
    // FIT MAP
    // ------------------------------------------------------

    if (results.length > 0) {
      const bounds =
        L.latLngBounds(
          results.map(
            (salon) => [
              salon.latitude,
              salon.longitude,
            ]
          )
        );

      bounds.extend([
        center.lat,
        center.lng,
      ]);

      map.fitBounds(
        bounds,
        {
          padding: [
            60,
            60,
          ],
          maxZoom: 15,
        }
      );
    } else {
      map.setView(
        [
          center.lat,
          center.lng,
        ],
        14
      );
    }

    setTimeout(() => {
      map.invalidateSize();
    }, 250);
  }

  // ========================================================
  // FETCH SALONS
  // ========================================================

  async function fetchSalons(
    center: Location,
    label: string
  ) {
    setLoading(true);
    setError(null);
    setSelectedSalon(null);
    setActiveSalonId(null);

    try {
      const response =
        await fetch(
          `${API_URL}/nearby-salons`,
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              latitude:
                center.lat,
              longitude:
                center.lng,
              radius,
              limit: 20,
            }),
          }
        );

      if (!response.ok) {
        const errorData =
          await response
            .json()
            .catch(
              () => null
            );

        throw new Error(
          errorData?.detail ||
            `Server error (${response.status})`
        );
      }

      const data =
        await response.json();

      if (!data.success) {
        throw new Error(
          "The backend could not find salons."
        );
      }

      const results: Salon[] =
        Array.isArray(
          data.salons
        )
          ? data.salons
          : [];

      setLocation(
        center
      );

      setLocationLabel(
        label
      );

      setSalons(
        results
      );

      await drawResults(
        results,
        center
      );
    } catch (err) {
      console.error(err);

      setSalons([]);

      clearMarkers();

      setError(
        err instanceof Error
          ? err.message
          : "Unable to find nearby salons."
      );
    } finally {
      setLoading(false);
    }
  }

  // ========================================================
  // SEARCH LOCATION
  // ========================================================

  async function handleSearch() {
    const trimmed =
      query.trim();

    if (!trimmed) {
      useCurrentLocation();
      return;
    }

    setLoading(true);
    setError(null);
    setSelectedSalon(null);
    setActiveSalonId(null);

    try {
      // ----------------------------------------------------
      // STEP 1
      // Typed text → coordinates
      // ----------------------------------------------------

      const response =
        await fetch(
          `${API_URL}/search-location`,
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              query:
                trimmed,
            }),
          }
        );

      if (!response.ok) {
        const errorData =
          await response
            .json()
            .catch(
              () => null
            );

        throw new Error(
          errorData?.detail ||
            `Location search failed (${response.status})`
        );
      }

      const data =
        await response.json();

      const latitude =
        Number(
          data.latitude
        );

      const longitude =
        Number(
          data.longitude
        );

      if (
        !Number.isFinite(
          latitude
        ) ||
        !Number.isFinite(
          longitude
        )
      ) {
        throw new Error(
          "Location search returned invalid coordinates."
        );
      }

      const center = {
        lat: latitude,
        lng: longitude,
      };

      const label =
        data.name ||
        data.canonical_name ||
        trimmed;

      // ----------------------------------------------------
      // STEP 2
      // Coordinates → salons
      // ----------------------------------------------------

      await fetchSalons(
        center,
        label
      );
    } catch (err) {
      console.error(err);

      setSalons([]);

      clearMarkers();

      setError(
        err instanceof Error
          ? err.message
          : "Unable to search this location."
      );

      setLoading(false);
    }
  }

  // ========================================================
  // CURRENT LOCATION
  // ========================================================

  function useCurrentLocation() {
    if (
      !navigator.geolocation
    ) {
      setError(
        "Location services are not supported by this browser."
      );

      return;
    }

    setLocating(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      async (
        position
      ) => {
        const center = {
          lat:
            position.coords
              .latitude,

          lng:
            position.coords
              .longitude,
        };

        await fetchSalons(
          center,
          "Your current location"
        );

        setLocating(
          false
        );
      },

      (geoError) => {
        setLocating(
          false
        );

        if (
          geoError.code ===
          1
        ) {
          setError(
            "Location permission was denied. Allow location access and try again."
          );
        } else if (
          geoError.code ===
          2
        ) {
          setError(
            "Your location could not be determined."
          );
        } else {
          setError(
            "Location request timed out. Try again."
          );
        }
      },

      {
        enableHighAccuracy:
          true,

        timeout:
          12000,

        maximumAge:
          60000,
      }
    );
  }

  // ========================================================
  // FOCUS SALON
  // ========================================================

  async function focusSalon(
    salon: Salon
  ) {
    setSelectedSalon(
      salon
    );

    setActiveSalonId(
      salon.id
    );

    if (!mapRef.current) {
      return;
    }

    mapRef.current.setView(
      [
        salon.latitude,
        salon.longitude,
      ],
      16,
      {
        animate: true,
        duration: 0.7,
      }
    );

    const index =
      salons.findIndex(
        (item) =>
          item.id ===
          salon.id
      );

    const marker =
      markersRef.current[
        index
      ];

    if (marker) {
      marker.openPopup();
    }
  }

  // ========================================================
  // CHANGE RADIUS
  // ========================================================

  function changeRadius(
    value: number
  ) {
    setRadius(value);

    if (location) {
      fetchSalons(
        location,
        locationLabel
      );
    }
  }

  // ========================================================
  // UI
  // ========================================================

  return (
    <main className="min-h-screen overflow-hidden bg-[#070708] text-white">

      {/* Background */}

      <div className="pointer-events-none fixed inset-0">

        <div className="absolute left-[-15%] top-[-15%] h-[600px] w-[600px] rounded-full bg-white/[0.035] blur-[130px]" />

        <div className="absolute bottom-[-20%] right-[-10%] h-[600px] w-[600px] rounded-full bg-white/[0.025] blur-[140px]" />

      </div>

      {/* ====================================================
          NAVBAR
      ===================================================== */}

      <nav className="relative z-20 mx-auto flex max-w-7xl items-center justify-between px-6 py-6 lg:px-10">

        <a
          href="/"
          className="flex items-center gap-3"
        >

          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06]">
            <Scissors size={18} />
          </div>

          <div>

            <div className="text-[15px] font-semibold tracking-tight">
              HairVision
              <span className="text-white/35">
                {" "}AI
              </span>
            </div>

            <div className="text-[9px] uppercase tracking-[0.25em] text-white/25">
              Hair intelligence
            </div>

          </div>

        </a>

        <div className="hidden items-center gap-8 text-xs text-white/40 md:flex">

          <a
            href="/"
            className="transition hover:text-white"
          >
            Analyze
          </a>

          <a
            href="/"
            className="transition hover:text-white"
          >
            Discover
          </a>

          <a
            href="/"
            className="transition hover:text-white"
          >
            Try-On
          </a>

          <a
            href="/find-salons"
            className="text-white"
          >
            Find Salons
          </a>

        </div>

        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-[10px] text-white/45">

          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />

          Google Maps data

        </div>

      </nav>

      {/* ====================================================
          CONTENT
      ===================================================== */}

      <section className="relative z-10 mx-auto max-w-7xl px-6 pb-20 pt-10 lg:px-10 lg:pt-16">

        {/* Hero */}

        <motion.div
          initial={{
            opacity: 0,
            y: 20,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            duration: 0.65,
          }}
          className="mx-auto max-w-4xl text-center"
        >

          <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[10px] uppercase tracking-[0.2em] text-white/45">

            <MapPin size={12} />

            Real salons near you

          </div>

          <h1 className="text-5xl font-semibold leading-[0.95] tracking-[-0.055em] sm:text-6xl lg:text-8xl">

            Find your next

            <br />

            <span className="bg-gradient-to-r from-white via-white to-white/35 bg-clip-text text-transparent">

              perfect salon.

            </span>

          </h1>

          <p className="mx-auto mt-7 max-w-xl text-sm leading-6 text-white/40 sm:text-base">

            Search any city, area, locality,
            landmark or state and discover
            real salons around that location.

          </p>

        </motion.div>

        {/* Search */}

        <motion.div
          initial={{
            opacity: 0,
            y: 25,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            delay: 0.12,
            duration: 0.65,
          }}
          className="mx-auto mt-12 max-w-6xl"
        >

          <div className="rounded-[2rem] border border-white/[0.09] bg-white/[0.025] p-3 shadow-2xl">

            <div className="flex flex-col gap-3 lg:flex-row">

              {/* Search input */}

              <div className="flex flex-1 items-center gap-3 rounded-2xl border border-white/[0.07] bg-black/30 px-4 py-3">

                <Search
                  size={17}
                  className="shrink-0 text-white/30"
                />

                <input
                  value={query}
                  onChange={(event) =>
                    setQuery(
                      event.target.value
                    )
                  }
                  onKeyDown={(event) => {
                    if (
                      event.key ===
                      "Enter"
                    ) {
                      handleSearch();
                    }
                  }}
                  placeholder="Search any city, area, landmark or state..."
                  className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/20"
                />

                {query && (
                  <button
                    type="button"
                    onClick={() =>
                      setQuery("")
                    }
                    className="text-white/25 transition hover:text-white"
                  >
                    <X size={15} />
                  </button>
                )}

              </div>

              {/* Radius */}

              <div className="flex items-center gap-2 overflow-x-auto rounded-2xl border border-white/[0.07] bg-black/30 p-1">

                {RADIUS_OPTIONS.map(
                  (option) => (

                    <button
                      key={
                        option.value
                      }
                      type="button"
                      onClick={() =>
                        changeRadius(
                          option.value
                        )
                      }
                      className={`whitespace-nowrap rounded-xl px-4 py-2.5 text-[10px] font-medium transition ${
                        radius ===
                        option.value
                          ? "bg-white text-black"
                          : "text-white/35 hover:text-white"
                      }`}
                    >

                      {option.label}

                    </button>

                  )
                )}

              </div>

              {/* Search */}

              <button
                type="button"
                onClick={
                  handleSearch
                }
                disabled={
                  loading ||
                  locating
                }
                className="flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3 text-xs font-semibold text-black transition hover:scale-[1.01] hover:bg-white/90 disabled:opacity-50"
              >

                {loading ? (
                  <Loader2
                    size={15}
                    className="animate-spin"
                  />
                ) : (
                  <Search
                    size={15}
                  />
                )}

                Find salons

              </button>

              {/* My location */}

              <button
                type="button"
                onClick={
                  useCurrentLocation
                }
                disabled={
                  loading ||
                  locating
                }
                className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-xs text-white/65 transition hover:bg-white/[0.08] disabled:opacity-50"
              >

                {locating ? (
                  <Loader2
                    size={15}
                    className="animate-spin"
                  />
                ) : (
                  <Crosshair
                    size={15}
                  />
                )}

                My location

              </button>

            </div>

          </div>

        </motion.div>

        {/* Error */}

        <AnimatePresence>

          {error && (

            <motion.div
              initial={{
                opacity: 0,
                y: -8,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              exit={{
                opacity: 0,
                y: -8,
              }}
              className="mx-auto mt-4 flex max-w-3xl items-start gap-3 rounded-2xl border border-red-400/10 bg-red-400/[0.05] px-5 py-4 text-xs text-red-300/80"
            >

              <X
                size={15}
                className="mt-0.5 shrink-0"
              />

              <span>
                {error}
              </span>

            </motion.div>

          )}

        </AnimatePresence>

        {/* Main */}

        <motion.div
          initial={{
            opacity: 0,
            y: 30,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            delay: 0.22,
            duration: 0.7,
          }}
          className="mt-8 overflow-hidden rounded-[2rem] border border-white/[0.09] bg-[#0c0c0f] shadow-[0_30px_100px_rgba(0,0,0,0.35)]"
        >

          <div className="grid lg:grid-cols-[0.85fr_1.5fr]">

            {/* =================================================
                SALON LIST
            ================================================== */}

            <div className="max-h-[700px] overflow-y-auto border-b border-white/[0.07] lg:border-b-0 lg:border-r">

              <div className="sticky top-0 z-10 border-b border-white/[0.07] bg-[#0c0c0f]/95 px-6 py-5 backdrop-blur-xl">

                <div className="flex items-center justify-between gap-3">

                  <div>

                    <p className="text-[9px] uppercase tracking-[0.2em] text-white/25">
                      Nearby salons
                    </p>

                    <h2 className="mt-1 text-lg font-medium">
                      {location
                        ? `${salons.length} places found`
                        : "Ready to explore"}
                    </h2>

                  </div>

                  {location && (

                    <div className="max-w-[200px] truncate rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[9px] text-white/35">

                      {locationLabel}

                    </div>

                  )}

                </div>

              </div>

              {/* Initial */}

              {!location &&
                !loading && (

                  <div className="flex min-h-[420px] flex-col items-center justify-center px-8 text-center">

                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">

                      <Navigation
                        size={24}
                        className="text-white/45"
                      />

                    </div>

                    <h3 className="mt-6 text-lg font-medium">
                      Search anywhere
                    </h3>

                    <p className="mt-2 max-w-xs text-xs leading-5 text-white/30">

                      Enter any city, area,
                      locality, landmark or
                      state to find nearby salons.

                    </p>

                    <button
                      type="button"
                      onClick={
                        useCurrentLocation
                      }
                      className="mt-6 flex items-center gap-2 rounded-full bg-white px-5 py-3 text-xs font-semibold text-black transition hover:scale-[1.02]"
                    >

                      <Crosshair
                        size={14}
                      />

                      Use my location

                    </button>

                  </div>

                )}

              {/* Loading */}

              {loading && (

                <div className="space-y-3 p-5">

                  {Array.from({
                    length: 6,
                  }).map(
                    (
                      _,
                      index
                    ) => (

                      <div
                        key={
                          index
                        }
                        className="animate-pulse rounded-2xl border border-white/[0.06] bg-white/[0.025] p-5"
                      >

                        <div className="h-4 w-2/3 rounded bg-white/[0.07]" />

                        <div className="mt-3 h-3 w-full rounded bg-white/[0.05]" />

                        <div className="mt-2 h-3 w-1/2 rounded bg-white/[0.05]" />

                      </div>

                    )
                  )}

                </div>

              )}

              {/* No results */}

              {!loading &&
                location &&
                salons.length ===
                  0 && (

                  <div className="flex min-h-[420px] flex-col items-center justify-center px-8 text-center">

                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">

                      <Scissors
                        size={23}
                        className="text-white/40"
                      />

                    </div>

                    <h3 className="mt-6 text-lg font-medium">
                      No salons found
                    </h3>

                    <p className="mt-2 max-w-xs text-xs leading-5 text-white/30">

                      Try increasing the
                      search radius or
                      searching a nearby area.

                    </p>

                  </div>

                )}

              {/* Results */}

              {!loading &&
                salons.length >
                  0 && (

                  <div className="space-y-2 p-3">

                    {salons.map(
                      (
                        salon,
                        index
                      ) => (

                        <motion.button
                          key={
                            salon.id
                          }
                          type="button"
                          initial={{
                            opacity: 0,
                            x: -12,
                          }}
                          animate={{
                            opacity: 1,
                            x: 0,
                          }}
                          transition={{
                            delay:
                              index *
                              0.035,
                          }}
                          onClick={() =>
                            focusSalon(
                              salon
                            )
                          }
                          className={`group w-full rounded-2xl border p-5 text-left transition ${
                            activeSalonId ===
                            salon.id
                              ? "border-white/20 bg-white/[0.075]"
                              : "border-white/[0.06] bg-white/[0.018] hover:border-white/[0.12] hover:bg-white/[0.04]"
                          }`}
                        >

                          <div className="flex items-start justify-between gap-3">

                            <div className="min-w-0">

                              <div className="flex items-center gap-2">

                                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-white text-[9px] font-bold text-black">

                                  {index +
                                    1}

                                </span>

                                <h3 className="truncate text-sm font-semibold">

                                  {
                                    salon.name
                                  }

                                </h3>

                              </div>

                              <p className="mt-3 line-clamp-2 text-[11px] leading-5 text-white/30">

                                {
                                  salon.address
                                }

                              </p>

                            </div>

                            <ArrowRight
                              size={15}
                              className="mt-1 shrink-0 text-white/20 transition group-hover:translate-x-1 group-hover:text-white/60"
                            />

                          </div>

                          <div className="mt-4 flex flex-wrap items-center gap-2">

                            {salon.rating !==
                              null && (

                              <span className="flex items-center gap-1 rounded-full border border-white/[0.07] bg-white/[0.025] px-2.5 py-1 text-[9px] text-white/55">

                                <Star
                                  size={
                                    10
                                  }
                                  className="fill-current"
                                />

                                {salon.rating.toFixed(
                                  1
                                )}

                                {salon.rating_count >
                                  0 &&
                                  ` (${salon.rating_count})`}

                              </span>

                            )}

                            <span className="rounded-full border border-white/[0.07] bg-white/[0.025] px-2.5 py-1 text-[9px] text-white/40">

                              {
                                salon.distance
                              }

                            </span>

                            {salon.open_status && (

                              <span className="rounded-full border border-white/[0.07] bg-white/[0.025] px-2.5 py-1 text-[9px] text-white/40">

                                {
                                  salon.open_status
                                }

                              </span>

                            )}

                          </div>

                        </motion.button>

                      )
                    )}

                  </div>

                )}

            </div>

            {/* =================================================
                MAP
            ================================================== */}

            <div className="relative min-h-[620px] lg:min-h-[700px]">

              <div
                ref={
                  mapContainerRef
                }
                className="absolute inset-0"
              />

              <div className="pointer-events-none absolute left-5 top-5 z-[500]">

                <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/75 px-4 py-2.5 text-[9px] uppercase tracking-[0.15em] text-white/55 shadow-xl backdrop-blur-xl">

                  <MapPin
                    size={12}
                  />

                  Live salon map

                </div>

              </div>

              {location && (

                <div className="absolute bottom-5 left-5 right-5 z-[500] flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                  <div className="rounded-2xl border border-white/10 bg-black/75 px-4 py-3 shadow-xl backdrop-blur-xl">

                    <p className="text-[9px] uppercase tracking-[0.16em] text-white/25">
                      Searching around
                    </p>

                    <p className="mt-1 max-w-[300px] truncate text-xs text-white/65">
                      {
                        locationLabel
                      }
                    </p>

                  </div>

                  <button
                    type="button"
                    onClick={
                      useCurrentLocation
                    }
                    className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-black/75 px-4 py-3 text-[10px] text-white/60 shadow-xl backdrop-blur-xl transition hover:bg-black/90 hover:text-white"
                  >

                    <Crosshair
                      size={13}
                    />

                    Recenter

                  </button>

                </div>

              )}

            </div>

          </div>

        </motion.div>

      </section>

      {/* ======================================================
          SALON MODAL
      ======================================================= */}

      <AnimatePresence>

        {selectedSalon && (

          <motion.div
            initial={{
              opacity: 0,
            }}
            animate={{
              opacity: 1,
            }}
            exit={{
              opacity: 0,
            }}
            className="fixed inset-0 z-[1000] flex items-end justify-center bg-black/70 p-4 backdrop-blur-md sm:items-center"
            onClick={() =>
              setSelectedSalon(
                null
              )
            }
          >

            <motion.div
              initial={{
                opacity: 0,
                y: 20,
                scale: 0.98,
              }}
              animate={{
                opacity: 1,
                y: 0,
                scale: 1,
              }}
              exit={{
                opacity: 0,
                y: 15,
              }}
              onClick={(event) =>
                event.stopPropagation()
              }
              className="relative w-full max-w-lg overflow-hidden rounded-[2rem] border border-white/10 bg-[#101011] shadow-2xl"
            >

              <button
                type="button"
                onClick={() =>
                  setSelectedSalon(
                    null
                  )
                }
                className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/50 text-white/50 backdrop-blur-xl transition hover:text-white"
              >

                <X size={15} />

              </button>

              <div className="border-b border-white/[0.07] p-7">

                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-black">

                  <Scissors
                    size={20}
                  />

                </div>

                <h2 className="mt-6 pr-10 text-2xl font-semibold tracking-tight">

                  {
                    selectedSalon.name
                  }

                </h2>

                <p className="mt-2 text-xs leading-5 text-white/35">

                  {
                    selectedSalon.address
                  }

                </p>

                <div className="mt-5 flex flex-wrap gap-2">

                  {selectedSalon.rating !==
                    null && (

                    <span className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] text-white/60">

                      <Star
                        size={11}
                        className="fill-current"
                      />

                      {
                        selectedSalon.rating.toFixed(
                          1
                        )
                      }

                      {selectedSalon.rating_count >
                        0 &&
                        ` · ${selectedSalon.rating_count} reviews`}

                    </span>

                  )}

                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] text-white/40">

                    {
                      selectedSalon.distance
                    }

                  </span>

                  {selectedSalon.open_status && (

                    <span className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] text-white/40">

                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />

                      {
                        selectedSalon.open_status
                      }

                    </span>

                  )}

                </div>

              </div>

              <div className="grid gap-2 p-5 sm:grid-cols-2">

                {selectedSalon.maps_url && (

                  <a
                    href={
                      selectedSalon.maps_url
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-3.5 text-xs font-semibold text-black transition hover:bg-white/90"
                  >

                    <Navigation
                      size={14}
                    />

                    Directions

                  </a>

                )}

                {selectedSalon.phone && (

                  <a
                    href={`tel:${selectedSalon.phone}`}
                    className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3.5 text-xs text-white/65 transition hover:bg-white/[0.08] hover:text-white"
                  >

                    <Phone
                      size={14}
                    />

                    Call salon

                  </a>

                )}

                {selectedSalon.website && (

                  <a
                    href={
                      selectedSalon.website
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3.5 text-xs text-white/65 transition hover:bg-white/[0.08] hover:text-white sm:col-span-2"
                  >

                    <ExternalLink
                      size={14}
                    />

                    Visit website

                  </a>

                )}

              </div>

              <div className="flex items-center gap-2 border-t border-white/[0.07] px-6 py-4 text-[9px] text-white/20">

                <Check
                  size={11}
                />

                Google Maps data
                via SerpApi

              </div>

            </motion.div>

          </motion.div>

        )}

      </AnimatePresence>

    </main>
  );
}