const fs = require('fs');
let code = fs.readFileSync('src/components/MapLibreView.tsx', 'utf-8');

// Ensure the map resizes immediately on load
const targetMapLoad = `      map.on('load', () => {
        setIsMapLoaded(true);
        setMapError(null);
      });`;
const replaceMapLoad = `      map.on('load', () => {
        setIsMapLoaded(true);
        setMapError(null);
        map.resize();
      });`;
code = code.replace(targetMapLoad, replaceMapLoad);

fs.writeFileSync('src/components/MapLibreView.tsx', code);
console.log("Patched MapLibre load");
