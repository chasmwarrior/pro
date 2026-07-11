const fs = require('fs');
let code = fs.readFileSync('src/components/MapLibreView.tsx', 'utf-8');

const target = `<div className="w-full h-full relative rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-slate-200 min-h-[300px]" style={{ minHeight: '300px' }}>
      <div ref={mapContainerRef} className="maplibre-container absolute inset-0" style={{ width: '100%', height: '100%' }} />`;
const replace = `<div className="w-full h-full relative rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-slate-100 min-h-[300px]">
      <div ref={mapContainerRef} className="maplibre-container" />`;

code = code.replace(target, replace);
fs.writeFileSync('src/components/MapLibreView.tsx', code);
console.log('Reverted map wrapper and container');
