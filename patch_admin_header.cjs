const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

const oldHeader = `                <div className="bg-gradient-to-r from-blue-500/10 via-slate-50 to-blue-500/5 border border-blue-100 rounded-xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 text-slate-800">
                  <div>
                    <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest block font-mono">Administrative Control Panel</span>
                    <h2 className="font-display font-bold text-2xl text-slate-900 mt-1">Konsol Manajemen Platform</h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Otorisasi persetujuan, pemantauan radar pekerja realtime, konfigurasi geofence, dan ekspor pelaporan resmi.
                    </p>
                  </div>
                  <span className="bg-blue-100 text-blue-700 border border-blue-200 font-mono text-[11px] font-bold py-1 px-3.5 rounded-full uppercase">
                    ROLE: {currentUser.role}
                  </span>
                </div>`;

if(content.includes(oldHeader)) {
  content = content.replace(oldHeader, '');
  fs.writeFileSync('src/App.tsx', content);
  console.log("Removed old admin header");
} else {
  console.log("Could not find old admin header");
}
