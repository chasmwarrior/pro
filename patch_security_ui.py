import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

# 1. Add clock to dashboard
dashboard_clock = """
                {/* Clock on Dashboard */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center gap-4 text-slate-800">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                    <Clock className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block font-mono">Waktu Sistem Server</span>
                    <p className="font-display font-bold text-2xl text-slate-900 mt-0.5 leading-tight">
                      {serverTime.toTimeString().split(' ')[0]}
                    </p>
                    <p className="text-xs text-slate-500">
                      {serverTime.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                </div>"""

content = content.replace(
"""            {activeTab === 'dashboard' && (
              <div className="space-y-6 animate-fade-in">

                                {/* Geofence / Check-In Live Module */}""",
f"""            {{activeTab === 'dashboard' && (
              <div className="space-y-6 animate-fade-in">
{dashboard_clock}

                                {{/* Geofence / Check-In Live Module */}}"""
)

# 2. Add permission manager to sidebar
permission_ui = """            <div className="border-t border-slate-800 my-2"></div>
            <div className={`${isSidebarCollapsed ? 'hidden' : 'block'} px-3 py-1 text-[9px] font-bold text-slate-500 uppercase tracking-widest font-mono`}>
              Akses Perangkat
            </div>

            {/* Sidebar Toggle Permissions */}
            <div className={`${isSidebarCollapsed ? 'hidden' : 'block'} px-3 py-2 bg-slate-800/30 rounded-lg border border-slate-700/50 space-y-3`}>
              <div className="flex justify-between items-center text-[10px]">
                <div className="flex items-center gap-1.5 text-slate-300">
                  <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                  <span>GPS / Lokasi</span>
                </div>
                <button
                  type="button"
                  onClick={requestGPSPermission}
                  className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    permissionStates.gps === 'granted' ? 'bg-emerald-500' : 'bg-slate-600'
                  }`}
                >
                  <span className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    permissionStates.gps === 'granted' ? 'translate-x-3' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              <div className="flex justify-between items-center text-[10px]">
                <div className="flex items-center gap-1.5 text-slate-300">
                  <Camera className="w-3.5 h-3.5 text-blue-500" />
                  <span>Kamera</span>
                </div>
                <button
                  type="button"
                  onClick={requestCameraPermission}
                  className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    permissionStates.camera === 'granted' ? 'bg-blue-500' : 'bg-slate-600'
                  }`}
                >
                  <span className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    permissionStates.camera === 'granted' ? 'translate-x-3' : 'translate-x-0'
                  }`} />
                </button>
              </div>
            </div>"""

content = content.replace(
"""            {/* Quick user details inside sidebar */}
            <div className={`${isSidebarCollapsed ? 'hidden' : 'block'} mt-auto bg-slate-950/40 border border-slate-800/60 p-2.5 rounded-lg text-xs font-mono`}>""",
permission_ui + """
            {/* Quick user details inside sidebar */}
            <div className={`${isSidebarCollapsed ? 'hidden' : 'block'} mt-auto bg-slate-950/40 border border-slate-800/60 p-2.5 rounded-lg text-xs font-mono`}>"""
)

with open('src/App.tsx', 'w') as f:
    f.write(content)

with open('src/components/CalendarView.tsx', 'r') as f:
    cal_content = f.read()

cal_content = cal_content.replace('cuti', 'libur')
cal_content = cal_content.replace('Cuti', 'Libur')

with open('src/components/CalendarView.tsx', 'w') as f:
    f.write(cal_content)
