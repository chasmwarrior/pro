const fs = require('fs');
let code = fs.readFileSync('src/components/MapLibreView.tsx', 'utf-8');

code = code.replace(
  `<div className="w-full h-full relative rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-slate-100 min-h-[300px]">`,
  `<div className="w-full h-full relative rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-slate-100">`
);

fs.writeFileSync('src/components/MapLibreView.tsx', code);
console.log('Removed min-h-[300px] from MapLibre wrapper');
