const fs = require('fs');
let code = fs.readFileSync('src/components/MapLibreView.tsx', 'utf-8');

code = code.replace(
  `<div ref={mapContainerRef} className="maplibre-container absolute inset-0" />`,
  `<div ref={mapContainerRef} style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }} />`
);
code = code.replace(
  `<div ref={mapContainerRef} className="maplibre-container" />`,
  `<div ref={mapContainerRef} style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }} />`
);

fs.writeFileSync('src/components/MapLibreView.tsx', code);
console.log('Fixed MapLibre container inline styles');
