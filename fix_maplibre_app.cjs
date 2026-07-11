const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const target = `  // --- INITIALIZATION ---
  useEffect(() => {
    // Check local storage for session`;
const replace = `  // Trigger window resize when map modal opens to ensure MapLibre catches the new dimensions
  useEffect(() => {
    if (showCheckInMapModal) {
      setTimeout(() => window.dispatchEvent(new Event('resize')), 150);
      setTimeout(() => window.dispatchEvent(new Event('resize')), 500);
    }
  }, [showCheckInMapModal]);

  // --- INITIALIZATION ---
  useEffect(() => {
    // Check local storage for session`;

code = code.replace(target, replace);
fs.writeFileSync('src/App.tsx', code);
console.log('Added showCheckInMapModal useEffect');
