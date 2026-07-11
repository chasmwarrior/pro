const fs = require('fs');
let code = fs.readFileSync('src/components/MapLibreView.tsx', 'utf-8');

const targetStr = `style: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',`;
const replaceStr = `style: {
          version: 8,
          sources: {
            'osm': {
              type: 'raster',
              tiles: [
                'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
                'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
                'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png'
              ],
              tileSize: 256,
              attribution: '&copy; OpenStreetMap Contributors'
            }
          },
          layers: [
            {
              id: 'osm',
              type: 'raster',
              source: 'osm'
            }
          ]
        },`;

code = code.replace(targetStr, replaceStr);
fs.writeFileSync('src/components/MapLibreView.tsx', code);
console.log("Updated MapLibre to use OSM raster style");
