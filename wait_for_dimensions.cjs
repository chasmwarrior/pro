const fs = require('fs');
let code = fs.readFileSync('src/components/MapLibreView.tsx', 'utf-8');

const target = `  // Initialize Map
  useEffect(() => {
    console.log('[MapLibreView] Initialize Map effect triggered. Container:', !!mapContainerRef.current);
    if (!mapContainerRef.current) return;
    
    // Check container dimensions
    const rect = mapContainerRef.current.getBoundingClientRect();
    console.log('[MapLibreView] Container rect:', rect.width, 'x', rect.height);


    // Use default coordinates (Jakarta) if none provided
    const centerLat = userLat || -6.2088;
    const centerLng = userLng || 106.8456;`;

const replace = `  // Initialize Map
  useEffect(() => {
    console.log('[MapLibreView] Initialize Map effect triggered. Container:', !!mapContainerRef.current);
    if (!mapContainerRef.current) return;

    let initTimeout: NodeJS.Timeout;
    
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
      const centerLng = userLng || 106.8456;`;

code = code.replace(target, replace);
fs.writeFileSync('src/components/MapLibreView.tsx', code);
console.log('Added check for container dimensions');
