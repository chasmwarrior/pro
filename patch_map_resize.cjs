const fs = require('fs');
let code = fs.readFileSync('src/components/MapLibreView.tsx', 'utf-8');

const target = `      // Handle Resize using ResizeObserver
      const resizeObserver = new ResizeObserver(() => {
        map.resize();
      });
      // Force resize after modal animation
      setTimeout(() => { if (mapRef.current) mapRef.current.resize(); }, 100);
      setTimeout(() => { if (mapRef.current) mapRef.current.resize(); }, 300);
      setTimeout(() => { if (mapRef.current) mapRef.current.resize(); }, 500);
      resizeObserver.observe(mapContainerRef.current);`;

const replace = `      // Handle Resize using ResizeObserver
      const resizeObserver = new ResizeObserver(() => {
        if (mapRef.current) mapRef.current.resize();
      });
      if (mapContainerRef.current) {
        resizeObserver.observe(mapContainerRef.current);
      }

      // Force resize vigorously for modal transitions
      const resizeInterval = setInterval(() => {
        if (mapRef.current) {
          mapRef.current.resize();
        }
      }, 250);
      
      setTimeout(() => { clearInterval(resizeInterval); }, 3000);`;

code = code.replace(target, replace);
fs.writeFileSync('src/components/MapLibreView.tsx', code);
console.log('Patched map resize with interval');
