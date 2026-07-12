const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

// The replacement for the Admin section inside the sidebar

const replacementNav = `
            {/* Privileged Admin Menu options */}
            {(currentUser.role === 'admin' || currentUser.role === 'supervisor') && (
              <>
                <div className="border-t border-slate-800 my-2"></div>
                <div className={\`\${isSidebarCollapsed ? 'hidden' : 'block'} px-3 py-1 text-[9px] font-bold text-slate-500 uppercase tracking-widest font-mono\`}>
                  Sistem Admin
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('admin');
                    setAdminSubTab('radar');
                  }}
                  title="Radar Pekerja"
                  className={\`w-full \${isSidebarCollapsed ? 'justify-center px-2 py-2' : 'justify-start px-3 py-2'} rounded-lg text-xs font-semibold flex items-center gap-2.5 transition cursor-pointer \${
                    activeTab === 'admin' && adminSubTab === 'radar'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'hover:bg-slate-800/80 text-slate-400 hover:text-slate-200'
                  }\`}
                >
                  <Map className="w-4 h-4 shrink-0" />
                  <span className={isSidebarCollapsed ? 'hidden' : 'inline'}>Radar Pekerja</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('admin');
                    setAdminSubTab('presence');
                  }}
                  title="Laporan Absensi"
                  className={\`w-full \${isSidebarCollapsed ? 'justify-center px-2 py-2' : 'justify-start px-3 py-2'} rounded-lg text-xs font-semibold flex items-center gap-2.5 transition cursor-pointer \${
                    activeTab === 'admin' && adminSubTab === 'presence'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'hover:bg-slate-800/80 text-slate-400 hover:text-slate-200'
                  }\`}
                >
                  <ClipboardList className="w-4 h-4 shrink-0" />
                  <span className={isSidebarCollapsed ? 'hidden' : 'inline'}>Laporan Absensi</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('admin');
                    setAdminSubTab('users');
                  }}
                  title="Kelola Pegawai"
                  className={\`w-full \${isSidebarCollapsed ? 'justify-center px-2 py-2' : 'justify-start px-3 py-2'} rounded-lg text-xs font-semibold flex items-center gap-2.5 transition cursor-pointer \${
                    activeTab === 'admin' && adminSubTab === 'users'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'hover:bg-slate-800/80 text-slate-400 hover:text-slate-200'
                  }\`}
                >
                  <Users className="w-4 h-4 shrink-0" />
                  <span className={isSidebarCollapsed ? 'hidden' : 'inline'}>Kelola Pegawai</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('admin');
                    setAdminSubTab('announcements');
                  }}
                  title="Pengumuman"
                  className={\`w-full \${isSidebarCollapsed ? 'justify-center px-2 py-2' : 'justify-start px-3 py-2'} rounded-lg text-xs font-semibold flex items-center gap-2.5 transition cursor-pointer \${
                    activeTab === 'admin' && adminSubTab === 'announcements'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'hover:bg-slate-800/80 text-slate-400 hover:text-slate-200'
                  }\`}
                >
                  <Megaphone className="w-4 h-4 shrink-0" />
                  <span className={isSidebarCollapsed ? 'hidden' : 'inline'}>Pengumuman</span>
                </button>
              </>
            )}
`;

// we need to replace lines 2017 to 2042 in App.tsx

// First find the string we're replacing exactly:
const searchString = `            {/* Privileged Admin Menu options */}
            {(currentUser.role === 'admin' || currentUser.role === 'supervisor') && (
              <>
                <div className="hidden md:block border-t border-slate-800 my-2"></div>
                <div className={\`\${isSidebarCollapsed ? 'hidden' : 'hidden lg:block'} px-3 py-1 text-[9px] font-bold text-slate-500 uppercase tracking-widest font-mono\`}>
                  Sistem Admin
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('admin');
                    setAdminSubTab('radar');
                  }}
                  title="Konsol Admin"
                  className={\`w-full \${isSidebarCollapsed ? 'justify-center px-2 py-2' : 'justify-center lg:justify-start px-2 lg:px-3 py-2'} rounded-lg text-xs font-semibold flex items-center gap-2.5 transition cursor-pointer \${
                    activeTab === 'admin'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'hover:bg-slate-800/80 text-slate-400 hover:text-slate-200'
                  }\`}
                >
                  <Settings className="w-4 h-4 shrink-0" />
                  <span className={isSidebarCollapsed ? 'hidden' : 'inline md:hidden lg:inline'}>Konsol Admin</span>
                </button>
              </>
            )}`;

if(content.includes(searchString)) {
  content = content.replace(searchString, replacementNav);
  fs.writeFileSync('src/App.tsx', content);
  console.log("Replaced navigation in sidebar successfully.");
} else {
  console.log("Could not find the navigation block to replace.");
}
