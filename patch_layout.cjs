const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

// Move History & Stats out of dashboard
// 1. History
const historyStart = code.indexOf('{/* Worker Attendance Logs History & statistics */}');
const historyEnd = code.indexOf('</div>\n              </div>\n            )}\n\n            {/* =========================================================================\n               TAB: CALENDAR LEAVE REQUEST SYSTEM');

const historySection = code.substring(historyStart, historyEnd);

// 2. Stats
const statsStart = code.indexOf('{/* KPI Overview Chart using Recharts */}');
// it ends right before historyStart
const statsSection = code.substring(statsStart, historyStart);

// Remove them from dashboard
code = code.substring(0, statsStart) + code.substring(historyEnd);

// Now the dashboard ends where statsStart was
// Let's insert the new tabs right after the dashboard ends

const dashboardEndStr = '</div>\n              </div>\n            )}\n\n            {/* =========================================================================\n               TAB: CALENDAR LEAVE REQUEST SYSTEM';

const newTabs = `              </div>
            )}

            {/* =========================================================================
               TAB: HISTORY
               ========================================================================= */}
            {activeTab === 'history' && (
              <div className="space-y-6 animate-fade-in">
                ` + historySection + `              </div>
            )}

            {/* =========================================================================
               TAB: STATS
               ========================================================================= */}
            {activeTab === 'stats' && (
              <div className="space-y-6 animate-fade-in">
                ` + statsSection + `              </div>
            )}

            {/* =========================================================================
               TAB: CALENDAR LEAVE REQUEST SYSTEM`;

code = code.replace(dashboardEndStr, newTabs);

fs.writeFileSync('src/App.tsx', code);
