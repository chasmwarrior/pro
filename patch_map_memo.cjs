const fs = require('fs');
let code = fs.readFileSync('src/components/MapLibreView.tsx', 'utf-8');

// Change export default function to const ... = React.memo(...)
const targetExport = `export default function MapLibreView({`;
const replaceExport = `const MapLibreView = React.memo(function MapLibreView({`;
code = code.replace(targetExport, replaceExport);

// Add export at the end
code += `\nexport default MapLibreView;\n`;

// Add logs in useEffects
const targetInit = `  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;`;
const replaceInit = `  // Initialize Map
  useEffect(() => {
    console.log('[MapLibreView] Initialize Map effect triggered. Container:', !!mapContainerRef.current);
    if (!mapContainerRef.current) return;
    
    // Check container dimensions
    const rect = mapContainerRef.current.getBoundingClientRect();
    console.log('[MapLibreView] Container rect:', rect.width, 'x', rect.height);
`;
code = code.replace(targetInit, replaceInit);

const targetContainer = `<div ref={mapContainerRef} className="maplibre-container" />`;
const replaceContainer = `<div ref={mapContainerRef} className="maplibre-container absolute inset-0 w-full h-full" style={{ width: '100%', height: '100%' }} />`;
code = code.replace(targetContainer, replaceContainer);

fs.writeFileSync('src/components/MapLibreView.tsx', code);
console.log('Applied React.memo and logs');
