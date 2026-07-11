const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const targetStr = `                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 shrink-0">`;
const replacementStr = `                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 shrink-0">
                        {/* Filters */}
                        <div className="flex items-center gap-2">
                          <select
                            value={radarFilterDivision}
                            onChange={(e) => setRadarFilterDivision(e.target.value)}
                            className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-lg px-2 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="all">Semua Divisi</option>
                            {appConfig?.divisions.map(d => (
                              <option key={d} value={d}>{d}</option>
                            ))}
                          </select>
                          <select
                            value={radarFilterStatus}
                            onChange={(e) => setRadarFilterStatus(e.target.value)}
                            className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-lg px-2 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="all">Semua Status</option>
                            <option value="working">Hadir (Sedang Bekerja)</option>
                            <option value="out_of_area">Luar Area</option>
                            <option value="offline">Off / Offline</option>
                          </select>
                        </div>`;

code = code.replace(targetStr, replacementStr);

const mapTargetStr = `                    <div className="h-[450px] rounded-2xl overflow-hidden border border-slate-200">
                      <MapLibreView
                        userLat={null}
                        userLng={null}
                        locations={locations}
                        radarMode={true}
                        workers={allWorkers}
                      />
                    </div>`;

const mapReplacementStr = `                    <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-wrap gap-4 text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                        <span className="font-medium text-slate-600">Sedang Bekerja (Dalam Geofence)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"></div>
                        <span className="font-medium text-slate-600">Luar Area</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-slate-400"></div>
                        <span className="font-medium text-slate-600">Off / Offline</span>
                      </div>
                    </div>
                    
                    <div className="h-[450px] rounded-2xl overflow-hidden border border-slate-200 relative">
                      <MapLibreView
                        userLat={null}
                        userLng={null}
                        locations={locations}
                        radarMode={true}
                        workers={filteredRadarWorkers}
                      />
                    </div>`;

code = code.replace(mapTargetStr, mapReplacementStr);

fs.writeFileSync('src/App.tsx', code);
