import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { AlertCircle, Compass } from 'lucide-react';

interface MapViewProps {
  userLat: number | null;
  userLng: number | null;
  locations?: Array<{
    id: string;
    name: string;
    lat: number;
    lng: number;
    radiusMeter: number;
  }>;
  radarMode?: boolean;
  workers?: Array<{
    id: string;
    username: string;
    division: string;
    currentLat: number | null;
    currentLng: number | null;
    todayStatus: 'working' | 'out_of_area' | 'offline';
    photoUrl?: string;
  }>;
}

// Fix Leaflet's default icon path issues in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom Icons
const createCustomIcon = (color: string, label: string) => {
  return L.divIcon({
    className: 'custom-div-icon',
    html: `
      <div class="relative flex items-center justify-center">
        <div class="absolute w-8 h-8 rounded-full animate-pulse" style="background-color: ${color}40;"></div>
        <div class="relative z-10 w-6 h-6 border border-white rounded-full shadow-md flex items-center justify-center text-white font-semibold text-xs" style="background-color: ${color};">
          ${label}
        </div>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

const userIcon = createCustomIcon('#2563eb', 'P'); // Blue for user
const locationIcon = createCustomIcon('#0ea5e9', 'K'); // Light blue for office

// Worker Icons based on status
const getWorkerIcon = (status: string, username: string, photoUrl?: string) => {
  let color = '#94a3b8'; // offline
  let animate = '';
  if (status === 'working') {
    color = '#10b981'; // emerald
    animate = 'animate-ping';
  } else if (status === 'out_of_area') {
    color = '#f59e0b'; // amber
  }

  const innerHtml = photoUrl
    ? `<img src="${photoUrl}" class="w-full h-full object-cover" />`
    : `<span class="text-white font-bold text-[10px] uppercase">${username.substring(0, 2)}</span>`;

  return L.divIcon({
    className: 'custom-div-icon',
    html: `
      <div class="relative flex flex-col items-center justify-center group">
        ${status !== 'offline' ? `<div class="absolute w-12 h-12 rounded-full ${animate}" style="background-color: ${color}40; animation-duration: 3s"></div>` : ''}
        <div class="relative z-10 w-9 h-9 border-2 border-white rounded-full shadow-xl flex items-center justify-center overflow-hidden transition-transform transform group-hover:scale-110" style="background-color: ${color}; border-color: ${color};">
          ${innerHtml}
        </div>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
};

// Component to handle auto-panning to user location
function LocationMarker({ userLat, userLng }: { userLat: number | null, userLng: number | null }) {
  const map = useMap();

  useEffect(() => {
    if (userLat !== null && userLng !== null) {
      map.flyTo([userLat, userLng], map.getZoom(), {
        animate: true,
        duration: 1.5 // Smooth transition
      });

      // After flying, invalidate size to ensure no grey tiles
      setTimeout(() => {
          map.invalidateSize();
      }, 1500);
    }
  }, [userLat, userLng, map]);

  return userLat !== null && userLng !== null ? (
    <Marker position={[userLat, userLng]} icon={userIcon}>
      <Popup>Lokasi Anda Saat Ini</Popup>
    </Marker>
  ) : null;
}

// Component to handle Map Bounds and invalidation
function MapBoundsHandler({ locations, workers, radarMode, userLat, userLng }: any) {
    const map = useMap();

    useEffect(() => {
        // Fix for modal showing grey tiles
        setTimeout(() => {
            map.invalidateSize();
        }, 100);
        setTimeout(() => {
            map.invalidateSize();
        }, 500);

        if (radarMode && workers && workers.length > 0) {
            const bounds = L.latLngBounds([]);
            let hasPoints = false;

            workers.forEach((w: any) => {
                if (w.currentLat && w.currentLng) {
                    bounds.extend([w.currentLat, w.currentLng]);
                    hasPoints = true;
                }
            });

            locations?.forEach((loc: any) => {
                bounds.extend([loc.lat, loc.lng]);
                hasPoints = true;
            });

            if (userLat && userLng) {
                 bounds.extend([userLat, userLng]);
                 hasPoints = true;
            }

            if (hasPoints && bounds.isValid()) {
                map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
            }
        }
    }, [map, radarMode, workers, locations, userLat, userLng]);

    return null;
}

const MapView = React.memo(function MapView({
  userLat,
  userLng,
  locations = [],
  radarMode = false,
  workers = []
}: MapViewProps) {

  // Default center (Jakarta) if no user location
  const defaultCenter: [number, number] = [-6.2088, 106.8456];
  const center: [number, number] = userLat !== null && userLng !== null
    ? [userLat, userLng]
    : (locations.length > 0 ? [locations[0].lat, locations[0].lng] : defaultCenter);

  return (
    <div className="w-full h-full relative rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-slate-100 min-h-[400px]">
      <MapContainer
        center={center}
        zoom={15}
        style={{ width: '100%', height: '100%', minHeight: '400px', zIndex: 0 }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapBoundsHandler locations={locations} workers={workers} radarMode={radarMode} userLat={userLat} userLng={userLng} />
        <LocationMarker userLat={userLat} userLng={userLng} />

        {/* Draw Geofences */}
        {locations.map((loc) => (
          <React.Fragment key={loc.id}>
            {/* The Radius Circle */}
            <Circle
              center={[loc.lat, loc.lng]}
              radius={loc.radiusMeter}
              pathOptions={{
                fillColor: '#10b981',
                fillOpacity: 0.15,
                color: '#059669',
                weight: 2,
                dashArray: '5, 5'
              }}
            />
            {/* The Office Marker */}
            <Marker position={[loc.lat, loc.lng]} icon={locationIcon}>
              <Popup>
                <div className="text-sm font-semibold">{loc.name}</div>
                <div className="text-xs text-slate-500">Radius: {loc.radiusMeter}m</div>
              </Popup>
            </Marker>
          </React.Fragment>
        ))}

        {/* Draw Radar Workers */}
        {radarMode && workers.map((worker) => {
          if (!worker.currentLat || !worker.currentLng) return null;
          return (
            <Marker
              key={worker.id}
              position={[worker.currentLat, worker.currentLng]}
              icon={getWorkerIcon(worker.todayStatus, worker.username, worker.photoUrl)}
            >
              <Popup>
                <div className="text-sm font-semibold text-slate-800">{worker.username}</div>
                <div className="text-[10px] text-slate-500 uppercase">{worker.division}</div>
                <div className="text-xs mt-1 capitalize font-bold text-blue-600">Status: {worker.todayStatus.replace('_', ' ')}</div>
              </Popup>
            </Marker>
          );
        })}

      </MapContainer>

      {/* Tiny overlay indicator of precision */}
      <div className="absolute bottom-2 left-2 bg-slate-900/90 text-white text-[10px] font-mono px-2 py-1 rounded shadow border border-slate-700 flex items-center gap-1.5 z-[1000] pointer-events-none">
        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
        <span>Sinyal Live GPS: {userLat ? `${userLat.toFixed(5)}, ${userLng?.toFixed(5)}` : 'Mencari...'}</span>
      </div>
    </div>
  );
});

export default MapView;
