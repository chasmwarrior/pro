const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

// 1. Move Manajer Hak Akses
const bannerStart = code.indexOf('{/* ----------------------------------------------------------------------\n                   DEVICE PERMISSIONS BANNER / COMPONENT');
const bannerEnd = code.indexOf('</div>\n                \n                {/* Geofence / Check-In Live Module */}');

const bannerSection = code.substring(bannerStart, bannerEnd + 6);

// remove banner from top
code = code.replace(bannerSection + '\n                \n', '');

// insert it at the bottom of dashboard (before </div>\n            )}\n\n            {/* =========================================================================\n               TAB: HISTORY)
const dashboardEndStrForBanner = '</div>\n            )}\n\n            {/* =========================================================================\n               TAB: HISTORY';
code = code.replace(dashboardEndStrForBanner, bannerSection + '\n              </div>\n            )}\n\n            {/* =========================================================================\n               TAB: HISTORY');

// 2. Fix Grid and Swap Map with Controls
const gridStartStr = '{/* Geofence / Check-In Live Module */}\n                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">';
code = code.replace(gridStartStr, '{/* Geofence / Check-In Live Module */}\n                <div className="flex flex-col gap-6">');

const leftColStart = code.indexOf('{/* Left Column: Tracking Status / Controls */}');
const rightColStart = code.indexOf('{/* Right Column: Live GPS Maplibre View */}');
const rightColEnd = code.indexOf('</div>\n                </div>\n\n                {/* Dashboard Metrics (Quotas/Sisa jatah) */}');

const rightColSection = code.substring(rightColStart, rightColEnd + 6);

// Remove right col from bottom of grid
code = code.replace(rightColSection + '\n                </div>\n\n                {/* Dashboard Metrics', '</div>\n\n                {/* Dashboard Metrics');

// Insert it before left col
code = code.substring(0, leftColStart) + rightColSection + '\n\n                  ' + code.substring(leftColStart);

fs.writeFileSync('src/App.tsx', code);
