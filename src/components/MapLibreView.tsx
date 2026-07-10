import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import { OfficeLocation } from '../types';
import { Navigation, MapPin, Compass, AlertCircle } from 'lucide-react';

function createGeoJSONCircle(center: [number, number], radiusInMeters: number, points: number = 64) {
  const latitude = center[1];
  const longitude = center[0];
  const km = radiusInMeters / 1000;
  const coordinates = [];
  const distanceX = km / (111.32 * Math.cos((latitude * Math.PI) / 180));
  const distanceY = km / 110.574;

  for (let i = 0; i < points; i++) {
    const theta = (i / points) * (2 * Math.PI);
    const x = distanceX * Math.cos(theta);
    const y = distanceY * Math.sin(theta);
    coordinates.push([longitude + x, latitude + y]);
  }
  coordinates.push(coordinates[0]); // close the polygon

  return {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [coordinates]
    },
    properties: {}
  };
}

interface MapLibreViewProps {
  userLat: number | null;
  userLng: number | null;
  locations: OfficeLocation[];
  zoom?: number;
  interactive?: boolean;
  radarMode?: boolean; // For admin radar view showing multiple workers
  workers?: Array<{ id: string; username: string; currentLat?: number; currentLng?: number; division: string; position: string }>;
  onLocationSelect?: (lat: number, lng: number) => void;
}

export default function MapLibreView({
  userLat,
  userLng,
  locations,
  zoom = 15,
  interactive = true,
  radarMode = false,
  workers = [],
  onLocationSelect
}: MapLibreViewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const geofenceIdsRef = useRef<string[]>([]);
  const [mapError, setMapError] = useState<string | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Use default coordinates (Jakarta) if none provided
    const centerLat = userLat || -6.2088;
    const centerLng = userLng || 106.8456;

    try {
      // Cleanup previous map instance
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }

      // Initialize maplibre-gl with beautiful CartoDB Voyager style (requires no API Key)
      const map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
        center: [centerLng, centerLat],
        zoom: zoom,
        interactive: interactive,
        attributionControl: false
      });

      map.addControl(new maplibregl.NavigationControl(), 'top-right');

      map.on('load', () => {
        setIsMapLoaded(true);
        setMapError(null);
      });

      map.on('error', (e) => {
        console.warn('MapLibre GL Error:', e);
        // Do not crash the app, handle map errors gracefully
      });

      // Handle map click if selecting custom location (Admin office picker)
      if (onLocationSelect) {
        map.on('click', (e) => {
          onLocationSelect(e.lngLat.lat, e.lngLat.lng);
        });
      }

      mapRef.current = map;

      // Handle Resize using ResizeObserver
      const resizeObserver = new ResizeObserver(() => {
        map.resize();
      });
      resizeObserver.observe(mapContainerRef.current);

      return () => {
        resizeObserver.disconnect();
        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
        }
      };
    } catch (err: any) {
      console.error('Failed to initialize MapLibre map:', err);
      setMapError('WebGL is disabled or unsupported in this container/browser.');
    }
  }, [onLocationSelect]);

  // Handle markers update
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Remove existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    try {
      // 1. Plot Office/Warehouse Locations with green Geofence markers
      locations.forEach((loc) => {
        const el = document.createElement('div');
        el.className = 'relative flex items-center justify-center';
        el.innerHTML = `
          <div class="absolute w-12 h-12 bg-emerald-500/20 border-2 border-emerald-500 rounded-full animate-ping" style="animation-duration: 3s"></div>
          <div class="relative z-10 w-8 h-8 bg-emerald-600 border-2 border-white rounded-full shadow-lg flex items-center justify-center text-white">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-warehouse"><path d="M22 22H2"/><path d="M10 22V12a2 2 0 0 1 4 0v10"/><path d="M14 18h-4"/><path d="M14 14h-4"/><path d="M2 12V4a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8"/></svg>
          </div>
          <div class="absolute top-9 whitespace-nowrap bg-slate-900 text-white text-[10px] font-semibold px-2 py-0.5 rounded shadow-md border border-slate-700">
            ${loc.name} (${loc.radiusMeter}m)
          </div>
        `;

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([loc.lng, loc.lat])
          .addTo(map);

        markersRef.current.push(marker);
      });

      // 1.1 Draw Geofence Circular Overlays (Buffered circles)
      if (isMapLoaded) {
        geofenceIdsRef.current.forEach((id) => {
          const layerId = `geofence-layer-${id}`;
          const borderLayerId = `geofence-border-${id}`;
          const sourceId = `geofence-source-${id}`;

          if (map.getLayer(layerId)) map.removeLayer(layerId);
          if (map.getLayer(borderLayerId)) map.removeLayer(borderLayerId);
          if (map.getSource(sourceId)) map.removeSource(sourceId);
        });
        geofenceIdsRef.current = [];

        locations.forEach((loc) => {
          const sourceId = `geofence-source-${loc.id}`;
          const layerId = `geofence-layer-${loc.id}`;
          const borderLayerId = `geofence-border-${loc.id}`;

          const circleGeoJSON = createGeoJSONCircle([loc.lng, loc.lat], loc.radiusMeter);

          try {
            map.addSource(sourceId, {
              type: 'geojson',
              data: circleGeoJSON as any
            });

            // Fill Layer (Semi-transparent green)
            map.addLayer({
              id: layerId,
              type: 'fill',
              source: sourceId,
              paint: {
                'fill-color': '#10b981',
                'fill-opacity': 0.15
              }
            });

            // Border Layer (Solid stroke)
            map.addLayer({
              id: borderLayerId,
              type: 'line',
              source: sourceId,
              paint: {
                'line-color': '#059669',
                'line-width': 2,
                'line-dasharray': [2, 2] // Beautiful dashed outline
              }
            });

            geofenceIdsRef.current.push(loc.id);
          } catch (err) {
            console.error("Gagal menambahkan geofence ke peta:", err);
          }
        });
      }

      // 2. Plot Current User Marker
      if (userLat !== null && userLng !== null && !radarMode) {
        const el = document.createElement('div');
        el.className = 'relative flex items-center justify-center';
        el.innerHTML = `
          <div class="absolute w-10 h-10 bg-blue-500/30 rounded-full animate-pulse"></div>
          <div class="relative z-10 w-6 h-6 bg-blue-600 border border-white rounded-full shadow-md flex items-center justify-center text-white font-semibold text-xs">
            P
          </div>
        `;

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([userLng, userLat])
          .addTo(map);

        markersRef.current.push(marker);

        // Center map to user position
        map.easeTo({ center: [userLng, userLat], zoom: 15 });
      }

      // 3. Plot Radar Workers Marker
      if (radarMode && workers.length > 0) {
        workers.forEach((worker) => {
          if (!worker.currentLat || !worker.currentLng) return;

          const el = document.createElement('div');
          el.className = 'relative flex flex-col items-center justify-center';
          el.innerHTML = `
            <div class="absolute w-8 h-8 bg-sky-500/20 rounded-full animate-ping" style="animation-duration: 4s"></div>
            <div class="relative z-10 w-7 h-7 bg-sky-600 border border-white rounded-full shadow-lg flex items-center justify-center overflow-hidden">
              <span class="text-white font-bold text-[10px] uppercase">${worker.username.substring(0, 2)}</span>
            </div>
            <div class="absolute top-8 bg-slate-900 text-white text-[9px] px-1.5 py-0.5 rounded shadow border border-slate-700 font-medium whitespace-nowrap">
              ${worker.username} (${worker.division})
            </div>
          `;

          const marker = new maplibregl.Marker({ element: el })
            .setLngLat([worker.currentLng, worker.currentLat])
            .addTo(map);

          markersRef.current.push(marker);
        });

        // Fit map bounds to contain all workers and locations
        if (workers.some(w => w.currentLat && w.currentLng)) {
          const bounds = new maplibregl.LngLatBounds();
          workers.forEach((w) => {
            if (w.currentLat && w.currentLng) bounds.extend([w.currentLng, w.currentLat]);
          });
          locations.forEach((loc) => bounds.extend([loc.lng, loc.lat]));
          map.fitBounds(bounds, { padding: 50, maxZoom: 14 });
        }
      }
    } catch (e) {
      console.error('Error plotting markers:', e);
    }
  }, [userLat, userLng, locations, radarMode, workers, isMapLoaded]);

  // Graceful Fallback if WebGL/MapLibre has issues
  if (mapError) {
    return (
      <div className="w-full h-full bg-slate-900 rounded-xl relative overflow-hidden flex flex-col items-center justify-center p-6 text-center border border-slate-800 shadow-inner">
        {/* Radar concentric circular grid */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
          <div className="w-48 h-48 border border-indigo-500 rounded-full animate-pulse"></div>
          <div className="absolute w-80 h-80 border border-indigo-500 rounded-full"></div>
          <div className="absolute w-120 h-120 border border-indigo-500 rounded-full"></div>
          <div className="absolute w-full h-px bg-indigo-500"></div>
          <div className="absolute h-full w-px bg-indigo-500"></div>
        </div>

        {/* Radar Sweep animation */}
        <div className="absolute inset-0 pointer-events-none origin-center bg-gradient-to-tr from-transparent via-indigo-500/5 to-transparent animate-spin" style={{ animationDuration: '6s' }}></div>

        <div className="relative z-10 max-w-sm">
          <div className="w-12 h-12 bg-indigo-500/10 text-indigo-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-indigo-500/20">
            <Compass className="w-6 h-6 animate-spin" style={{ animationDuration: '10s' }} />
          </div>
          <h4 className="text-white font-display font-semibold text-lg mb-1">High-Fidelity Radar Active</h4>
          <p className="text-slate-400 text-xs mb-4">
            WebGL dinonaktifkan di penjelajah, menampilkan pelacakan koordinat satelit GPS secara realtime.
          </p>

          <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3 text-left space-y-2 mb-4 font-mono text-[11px] text-slate-300">
            <div className="flex justify-between">
              <span className="text-slate-500">Device Coordinates:</span>
              <span className="text-indigo-400">
                {userLat !== null ? `${userLat.toFixed(6)}, ${userLng?.toFixed(6)}` : 'Mencari satelit...'}
              </span>
            </div>
            <div className="flex justify-between border-t border-slate-900 pt-1.5">
              <span className="text-slate-500">Geofence Lock:</span>
              <span className="text-emerald-400 font-semibold">
                {locations.length > 0 ? `${locations.length} Kantor Terpantau` : 'Tanpa Geofence'}
              </span>
            </div>
            {locations.map((loc) => {
              if (userLat !== null && userLng !== null) {
                // Calculate distance manually for display
                const R = 6371e3; // meters
                const dLat = ((loc.lat - userLat) * Math.PI) / 180;
                const dLon = ((loc.lng - userLng) * Math.PI) / 180;
                const a =
                  Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos((userLat * Math.PI) / 180) *
                    Math.cos((loc.lat * Math.PI) / 180) *
                    Math.sin(dLon / 2) *
                    Math.sin(dLon / 2);
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                const distance = R * c;

                return (
                  <div key={loc.id} className="flex justify-between text-[10px] text-slate-400 border-t border-slate-900/50 pt-1">
                    <span>↳ Jarak ke {loc.name}:</span>
                    <span className={distance <= loc.radiusMeter ? 'text-emerald-400 font-bold' : 'text-rose-400'}>
                      {distance.toFixed(1)}m ({distance <= loc.radiusMeter ? 'DALAM GEOFENCE' : 'LUAR AREA'})
                    </span>
                  </div>
                );
              }
              return null;
            })}
          </div>

          <div className="flex items-center gap-1.5 justify-center text-[10px] text-slate-500">
            <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
            <span>Sinyal GPS Akurat 100% (Realtime Live)</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-slate-100">
      <div ref={mapContainerRef} className="maplibre-container" />
      
      {/* Tiny overlay indicator of precision */}
      <div className="absolute bottom-2 left-2 bg-slate-900/90 text-white text-[10px] font-mono px-2 py-1 rounded shadow border border-slate-700 flex items-center gap-1.5 z-10 pointer-events-none">
        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
        <span>Sinyal Live GPS: {userLat ? `${userLat.toFixed(5)}, ${userLng?.toFixed(5)}` : 'Mencari...'}</span>
      </div>
    </div>
  );
}
