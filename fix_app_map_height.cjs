const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const target = `<div className="flex-1 min-h-[400px] h-full relative bg-slate-100">`;
const replace = `<div className="flex-1 h-[400px] relative bg-slate-100">`;

code = code.replace(target, replace);
fs.writeFileSync('src/App.tsx', code);
console.log('Restored map wrapper height to h-[400px]');
