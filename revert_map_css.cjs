const fs = require('fs');
let code = fs.readFileSync('src/components/MapLibreView.tsx', 'utf-8');

const target = `<div ref={mapContainerRef} style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }} />`;
const replace = `<div ref={mapContainerRef} className="maplibre-container absolute inset-0 w-full h-full" />`;

code = code.replace(target, replace);
fs.writeFileSync('src/components/MapLibreView.tsx', code);
console.log('Reverted to css classes for map container');
