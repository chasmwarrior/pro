const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

const replacementTop = `
      {/* --------------------------------------------------------------------------
         MAIN LAYOUT (LOGGED IN USER CONSOLE)
         -------------------------------------------------------------------------- */}
      {currentUser && (
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden h-[calc(100vh)]">
          {/* --------------------------------------------------------------------------
             LEFT NAVIGATION SIDEBAR
             -------------------------------------------------------------------------- */}
          <nav
            className={\`\${
              isSidebarCollapsed ? 'w-full md:w-16' : 'w-full md:max-w-[280px] md:w-64'
            } bg-slate-900 border-r border-slate-800 flex flex-col p-3 transition-all duration-300 ease-in-out shrink-0 text-slate-300 z-50 overflow-y-auto\`}
          >
            {/* Header info inside sidebar */}
            <div className="flex flex-col gap-4 mb-6">
               <div className="flex items-center gap-3">
                 <div className="w-8 h-8 rounded-lg overflow-hidden bg-blue-500/10 border border-blue-500/20 flex items-center justify-center p-1 shadow-inner shrink-0">
                   {config?.branding.logoUrl ? (
                     <img src={config.branding.logoUrl} alt="Logo App" className="w-full h-full object-contain rounded-md" referrerPolicy="no-referrer" />
                   ) : (
                     <Landmark className="w-full h-full text-blue-500" />
                   )}
                 </div>
                 <div className={\`\${isSidebarCollapsed ? 'hidden md:hidden' : 'block'} flex-1 overflow-hidden\`}>
                   <h1 className="font-display font-bold text-sm text-white tracking-tight flex items-center gap-1 truncate">
                     <span>{config?.branding.name || 'AbsenPro'}</span>
                   </h1>
                   <p className="text-[9px] text-slate-400 font-mono leading-none truncate">Geofence & Liveness</p>
                 </div>
                 <button
                    type="button"
                    onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                    className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition hidden md:block shrink-0 ml-auto"
                  >
                    <Menu className="w-4 h-4" />
                  </button>
               </div>

               <div className={\`\${isSidebarCollapsed ? 'hidden md:hidden' : 'flex'} bg-slate-800/50 p-2.5 rounded-xl border border-slate-700/50 items-center gap-3\`}>
                  <img
                    src={currentUser.photoUrl}
                    alt={currentUser.username}
                    className="w-10 h-10 rounded-full object-cover border-2 border-slate-600 bg-slate-800 shrink-0"
                    referrerPolicy="no-referrer"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white capitalize leading-tight truncate">{currentUser.username}</p>
                    <span className="text-[9px] font-mono text-blue-400 uppercase tracking-wide inline-block mt-1">
                      {currentUser.role}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="p-2 hover:bg-rose-500/20 rounded-full text-slate-400 hover:text-rose-400 transition cursor-pointer shrink-0"
                    title="Keluar dari Akun"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
               </div>
            </div>

            {/* Time widget inside sidebar */}
            <div className={\`\${isSidebarCollapsed ? 'hidden md:hidden' : 'flex'} mb-6 bg-slate-800/30 border border-slate-700/50 rounded-xl p-3 items-center gap-3\`}>
                <Clock className="w-5 h-5 text-blue-400 animate-pulse shrink-0" />
                <div>
                  <span className="font-mono font-bold text-sm text-blue-400 block leading-tight">
                    {serverTime.toTimeString().split(' ')[0]}
                  </span>
                  <span className="text-[10px] text-slate-400 block leading-none mt-1">
                    {serverTime.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })}
                  </span>
                </div>
            </div>

            <div className="space-y-1.5 flex-1 overflow-y-auto custom-scrollbar">
`;

const startMarker = `{/* --------------------------------------------------------------------------
         MAIN LAYOUT (LOGGED IN USER CONSOLE)
         -------------------------------------------------------------------------- */}`;

let startIndex = content.indexOf(startMarker);
let endIndex = content.indexOf('<button\n              type="button"\n              onClick={() => setActiveTab(\'dashboard\')}', startIndex);

if (startIndex !== -1 && endIndex !== -1) {
  content = content.substring(0, startIndex) + replacementTop + content.substring(endIndex);
  fs.writeFileSync('src/App.tsx', content);
  console.log("Replaced sidebar top section successfully.");
} else {
  console.log("Could not find start or end index.", startIndex, endIndex);
}
