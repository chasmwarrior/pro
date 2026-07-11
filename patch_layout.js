const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

// Move Manajer Hak Akses to the bottom of the dashboard
const bannerStart = code.indexOf('{/* ----------------------------------------------------------------------\n                   DEVICE PERMISSIONS BANNER / COMPONENT');
const bannerEnd = code.indexOf('</div>\n                \n                {/* Geofence / Check-In Live Module */}');
const bannerSection = code.substring(bannerStart, bannerEnd + 6); // include the </div>

code = code.replace(bannerSection + '\n                \n', '');

// Insert it at the end of the dashboard (before the history logs or whatever is left)
// Wait, the "Worker Attendance Logs" is removed. What's the last thing? 
// "Dashboard Metrics (Quotas/Sisa jatah)" is currently the last thing in the dashboard.
const metricsEndStr = '</div>\n\n                {/* KPI Overview Chart using Recharts */}';
const metricsEnd = code.indexOf(metricsEndStr);

if (metricsEnd !== -1) {
    code = code.substring(0, metricsEnd) + '\n\n                ' + bannerSection + code.substring(metricsEnd);
} else {
    // maybe KPI chart is already moved? let's just insert before the closing of dashboard
    // We will do that later. Let's do it carefully.
}

fs.writeFileSync('src/App.tsx', code);
