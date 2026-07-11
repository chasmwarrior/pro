const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const btnCode = `                      {/* Force tracking refresh */}
                      <button
                        type="button"
                        onClick={trackDeviceLocation}
                        className="w-full border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold py-2 rounded-xl transition text-[11px] flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Gunakan Lokasi Saat Ini (Segarkan GPS)</span>
                      </button>
`;
code = code.replace(btnCode, ""); // remove from original location

const modalCode = `              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Status Geofence:</span>
                <span className={\`font-bold \${currentGeofenceStatus === 'inside' ? 'text-emerald-600' : 'text-amber-600'}\`}>
                  {currentGeofenceStatus === 'inside' ? 'Dalam Area Kantor' : 'Luar Area Kantor'}
                </span>
              </div>
              <button`;

const replaceModalCode = `              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Status Geofence:</span>
                <span className={\`font-bold \${currentGeofenceStatus === 'inside' ? 'text-emerald-600' : 'text-amber-600'}\`}>
                  {currentGeofenceStatus === 'inside' ? 'Dalam Area Kantor' : 'Luar Area Kantor'}
                </span>
              </div>
              {/* Force tracking refresh */}
              <button
                type="button"
                onClick={trackDeviceLocation}
                className="w-full border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold py-2 rounded-xl transition text-[11px] flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Gunakan Lokasi Saat Ini (Segarkan GPS)</span>
              </button>
              <button`;
code = code.replace(modalCode, replaceModalCode);

fs.writeFileSync('src/App.tsx', code);
console.log('Moved GPS refresh button to map modal');
