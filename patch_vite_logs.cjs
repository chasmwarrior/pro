const fs = require('fs');
let code = fs.readFileSync('src/main.tsx', 'utf-8');

const target = `const originalError = console.error;
console.error = function(...args) {
  if (typeof args[0] === 'string' && args[0].includes('[vite] failed to connect to websocket')) return;
  originalError.apply(console, args);
};`;
const replace = `const originalError = console.error;
console.error = function(...args) {
  if (typeof args[0] === 'string' && (args[0].includes('[vite] failed to connect to websocket') || args[0].includes('WebSocket closed without opened'))) return;
  if (args[0] && args[0].message && args[0].message.includes('WebSocket closed without opened')) return;
  originalError.apply(console, args);
};

window.addEventListener('unhandledrejection', event => {
  if (event.reason && event.reason.message && event.reason.message.includes('WebSocket closed without opened')) {
    event.preventDefault();
  }
});
`;
code = code.replace(target, replace);
fs.writeFileSync('src/main.tsx', code);
console.log('Patched vite websocket error logs in main.tsx');
