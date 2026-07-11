const fs = require('fs');
let code = fs.readFileSync('src/components/MapLibreView.tsx', 'utf-8');

code = code.replace(
  `<div ref={mapContainerRef} className="maplibre-container" />`,
  `<div ref={mapContainerRef} className="maplibre-container absolute inset-0" />`
);

fs.writeFileSync('src/components/MapLibreView.tsx', code);
console.log('Fixed MapLibre container CSS class');
