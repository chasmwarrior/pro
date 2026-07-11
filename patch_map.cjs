const fs = require('fs');
let code = fs.readFileSync('src/components/MapLibreView.tsx', 'utf-8');

const targetStr = `            <div class="absolute w-8 h-8 bg-sky-500/20 rounded-full animate-ping" style="animation-duration: 4s"></div>
            <div class="relative z-10 w-7 h-7 bg-sky-600 border border-white rounded-full shadow-lg flex items-center justify-center overflow-hidden">
              <span class="text-white font-bold text-[10px] uppercase">\${worker.username.substring(0, 2)}</span>
            </div>`;

const replacementStr = `            \${worker.todayStatus !== 'offline' ? \`<div class="absolute w-10 h-10 \${worker.todayStatus === 'working' ? 'bg-emerald-500/30' : 'bg-amber-500/30'} rounded-full animate-ping" style="animation-duration: 3s"></div>\` : ''}
            <div class="relative z-10 w-7 h-7 \${worker.todayStatus === 'working' ? 'bg-emerald-500' : worker.todayStatus === 'out_of_area' ? 'bg-amber-500' : 'bg-slate-400'} border border-white rounded-full shadow-lg flex items-center justify-center overflow-hidden">
              <span class="text-white font-bold text-[10px] uppercase">\${worker.username.substring(0, 2)}</span>
            </div>`;

code = code.replace(targetStr, replacementStr);

fs.writeFileSync('src/components/MapLibreView.tsx', code);
