const fs = require('fs');
let code = fs.readFileSync('src/components/MapLibreView.tsx', 'utf-8');

const target = `      return () => {
        resizeObserver.disconnect();
        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
        }
      };`;
const replace = `      return () => {
        resizeObserver.disconnect();
        clearInterval(resizeInterval);
        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
        }
      };`;

code = code.replace(target, replace);
fs.writeFileSync('src/components/MapLibreView.tsx', code);
console.log('Patched map strict mode cleanup');
