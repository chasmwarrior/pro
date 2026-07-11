const fs = require('fs');
let code = fs.readFileSync('src/components/MapLibreView.tsx', 'utf-8');

const target = `map.current.addControl(new maplibregl.NavigationControl(), 'top-right');`;
const replace = `map.current.addControl(new maplibregl.NavigationControl(), 'top-right');
      
      // Force resize to ensure it fits the modal correctly
      setTimeout(() => {
        if (map.current) map.current.resize();
      }, 200);
      setTimeout(() => {
        if (map.current) map.current.resize();
      }, 500);`;
code = code.replace(target, replace);
fs.writeFileSync('src/components/MapLibreView.tsx', code);
console.log('Added map resize');
