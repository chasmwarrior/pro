const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

// The error is TS1381 around line 2310 and TS17008 / TS17002 around main / div.
// Let's just fix the history tab missing div.
// 2308:                   </div>
// 2309:                               </div>
// 2310:             )}

code = code.replace(
`                  </div>
                              </div>
            )}

            {/* =========================================================================
               TAB: STATS`,
`                  </div>
                </div>
              </div>
            )}

            {/* =========================================================================
               TAB: STATS`);

fs.writeFileSync('src/App.tsx', code);
