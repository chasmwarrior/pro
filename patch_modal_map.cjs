const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

code = code.replace(
  `            <div className="flex-1 h-[400px] relative bg-slate-100">`,
  `            <div className="flex-1 min-h-[400px] h-full relative bg-slate-100">`
);

fs.writeFileSync('src/App.tsx', code);
console.log("Patched modal map height");
