const fs = require('fs');
let code = fs.readFileSync('src/components/MapLibreView.tsx', 'utf-8');

const target = `      // Handle Resize using ResizeObserver
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
      
      setTimeout(() => { clearInterval(resizeInterval); }, 3000);

      return () => {
        resizeObserver.disconnect();
        clearInterval(resizeInterval);
        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
        }
      };`;

const replace = `      // Handle Resize using ResizeObserver
      const resizeObserver = new ResizeObserver(() => {
        if (mapRef.current) mapRef.current.resize();
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

      return () => {
        resizeObserver.disconnect();
        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
        }
      };`;

code = code.replace(target, replace);
fs.writeFileSync('src/components/MapLibreView.tsx', code);
console.log('Cleaned up map resize interval');
