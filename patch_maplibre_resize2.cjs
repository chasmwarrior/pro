const fs = require('fs');
let code = fs.readFileSync('src/components/MapLibreView.tsx', 'utf-8');

const targetResize = `      // Handle Resize using ResizeObserver
      const resizeObserver = new ResizeObserver(() => {
        map.resize();
      });`;
const replaceResize = `      // Handle Resize using ResizeObserver
      const resizeObserver = new ResizeObserver(() => {
        map.resize();
      });
      // Force resize after modal animation
      setTimeout(() => { if (mapRef.current) mapRef.current.resize(); }, 100);
      setTimeout(() => { if (mapRef.current) mapRef.current.resize(); }, 300);
      setTimeout(() => { if (mapRef.current) mapRef.current.resize(); }, 500);`;
code = code.replace(targetResize, replaceResize);

fs.writeFileSync('src/components/MapLibreView.tsx', code);
console.log("Patched MapLibre resize interval");
