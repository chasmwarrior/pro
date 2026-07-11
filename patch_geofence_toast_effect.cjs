const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const targetStr = `  // --------------------------------------------------------------------------
  // INITS & LIFECYCLE
  // --------------------------------------------------------------------------`;

const replacementStr = `  // --------------------------------------------------------------------------
  // INITS & LIFECYCLE
  // --------------------------------------------------------------------------

  // Geofence status change tracker for toast notification
  useEffect(() => {
    if (activeTab === 'dashboard' && deviceLat !== null && deviceLng !== null && locations.length > 0) {
      let isInside = false;
      locations.forEach(loc => {
        const R = 6371e3;
        const dLat = ((loc.lat - deviceLat) * Math.PI) / 180;
        const dLon = ((loc.lng - deviceLng) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos((deviceLat * Math.PI) / 180) *
            Math.cos((loc.lat * Math.PI) / 180) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;
        if (distance <= loc.radiusMeter) isInside = true;
      });
      
      const newStatus = isInside ? 'inside' : 'outside';
      if (currentGeofenceStatus !== 'unknown' && currentGeofenceStatus !== newStatus) {
        if (newStatus === 'outside') {
          showToast('Anda telah keluar dari area kantor', 'error');
        } else {
          showToast('Anda telah memasuki area kantor', 'success');
        }
      }
      setCurrentGeofenceStatus(newStatus);
    }
  }, [deviceLat, deviceLng, locations, activeTab, currentGeofenceStatus]);
`;

code = code.replace(targetStr, replacementStr);
fs.writeFileSync('src/App.tsx', code);
