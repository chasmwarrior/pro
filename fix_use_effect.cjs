const fs = require('fs');
let code = fs.readFileSync('src/components/MapLibreView.tsx', 'utf-8');

const effectCode = `  // Initialize Map
  useEffect(() => {
    console.log('[MapLibreView] Initialize Map effect triggered. Container:', !!mapContainerRef.current);
    if (!mapContainerRef.current) return;

    let initTimeout: NodeJS.Timeout;
    let resizeObserver: ResizeObserver;
    
    const initMap = () => {
      if (!mapContainerRef.current) return;
      const rect = mapContainerRef.current.getBoundingClientRect();
      console.log('[MapLibreView] Checking container rect:', rect.width, 'x', rect.height);
      
      // Wait for valid dimensions before initializing
      if (rect.width === 0 || rect.height === 0) {
         console.log('[MapLibreView] Container has 0 dimensions, retrying in 50ms...');
         initTimeout = setTimeout(initMap, 50);
         return;
      }
      
      console.log('[MapLibreView] Valid dimensions found, proceeding to initialize.');

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
        console.log('[MapLibreView] Initializing MapLibre GL instance...');
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
          map.resize();
        });

        map.on('error', (e) => {
          console.warn('MapLibre GL Error:', e);
          // Do not crash the app, handle map errors gracefully
        });

        // Handle map click if selecting custom location (Admin office picker)
        map.on('click', (e) => {
          if (onLocationSelectRef.current) {
            onLocationSelectRef.current(e.lngLat.lat, e.lngLat.lng);
          }
        });

        mapRef.current = map;

        // Handle Resize using ResizeObserver
        resizeObserver = new ResizeObserver(() => {
          if (mapRef.current) {
            console.log('[MapLibreView] ResizeObserver triggered map.resize()');
            mapRef.current.resize();
          }
        });
        
        if (mapContainerRef.current) {
          resizeObserver.observe(mapContainerRef.current);
        }
        
        // Delay initial resize to give the modal time to calculate dimensions
        setTimeout(() => {
          if (mapRef.current) mapRef.current.resize();
        }, 100);
        setTimeout(() => {
          if (mapRef.current) mapRef.current.resize();
        }, 300);

      } catch (err: any) {
        console.error('Failed to initialize MapLibre map:', err);
        setMapError('WebGL is disabled or unsupported in this container/browser.');
      }
    };

    initMap();

    return () => {
      if (initTimeout) clearTimeout(initTimeout);
      if (resizeObserver) resizeObserver.disconnect();
      if (mapRef.current) {
        console.log('[MapLibreView] Cleaning up MapLibre instance');
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []); // Remove userLat and userLng from dependencies since we only want to init once and let maplibregl handle panning/updating`;

const lines = code.split('\n');
const startIdx = lines.findIndex(l => l.includes('// Initialize Map'));
const endIdx = lines.findIndex((l, i) => i > startIdx && l.includes('// Handle markers update'));

if (startIdx !== -1 && endIdx !== -1) {
  const newLines = [
    ...lines.slice(0, startIdx),
    effectCode,
    ...lines.slice(endIdx)
  ];
  fs.writeFileSync('src/components/MapLibreView.tsx', newLines.join('\n'));
  console.log('Replaced MapLibreView useEffect successfully');
} else {
  console.error('Could not find start/end indices', startIdx, endIdx);
}
