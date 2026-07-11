const fs = require('fs');
let code = fs.readFileSync('src/components/MapLibreView.tsx', 'utf-8');

const target = `      // Initialize maplibre-gl with beautiful CartoDB Voyager style (requires no API Key)
      const map = new maplibregl.Map({`;
const replace = `      // Initialize maplibre-gl with beautiful CartoDB Voyager style (requires no API Key)
      console.log('Initializing MapLibre GL...');
      const map = new maplibregl.Map({`;

code = code.replace(target, replace);
fs.writeFileSync('src/components/MapLibreView.tsx', code);
