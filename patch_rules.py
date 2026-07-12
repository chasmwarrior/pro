import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

rules_ui = """
                        {/* Dynamic Rules Engine UI */}
                        <div className="pt-4 border-t border-slate-100 mt-4">
                          <h6 className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-3">Aturan Jam & Insentif Kustom</h6>
                          <div className="space-y-3">
                            {config?.rules?.map((rule, idx) => (
                              <div key={rule.id} className="flex flex-col sm:flex-row gap-2 items-start sm:items-center bg-slate-50 p-2 rounded-lg border border-slate-200 text-[10px]">
                                <input type="text" value={rule.name} onChange={e => {
                                  const newRules = [...(config.rules || [])];
                                  newRules[idx].name = e.target.value;
                                  setConfig({...config, rules: newRules});
                                }} className="flex-1 bg-white border border-slate-200 px-2 py-1 rounded" placeholder="Nama Aturan" />

                                <input type="time" value={rule.startTime} onChange={e => {
                                  const newRules = [...(config.rules || [])];
                                  newRules[idx].startTime = e.target.value;
                                  setConfig({...config, rules: newRules});
                                }} className="w-20 bg-white border border-slate-200 px-2 py-1 rounded" />

                                <span className="text-slate-400">-</span>

                                <input type="time" value={rule.endTime} onChange={e => {
                                  const newRules = [...(config.rules || [])];
                                  newRules[idx].endTime = e.target.value;
                                  setConfig({...config, rules: newRules});
                                }} className="w-20 bg-white border border-slate-200 px-2 py-1 rounded" />

                                <select value={rule.type} onChange={e => {
                                  const newRules = [...(config.rules || [])];
                                  newRules[idx].type = e.target.value as any;
                                  setConfig({...config, rules: newRules});
                                }} className="w-24 bg-white border border-slate-200 px-2 py-1 rounded">
                                  <option value="denda">Denda</option>
                                  <option value="bonus">Bonus</option>
                                  <option value="lembur">Lembur</option>
                                </select>

                                <input type="number" value={rule.amount} onChange={e => {
                                  const newRules = [...(config.rules || [])];
                                  newRules[idx].amount = Number(e.target.value);
                                  setConfig({...config, rules: newRules});
                                }} className="w-24 bg-white border border-slate-200 px-2 py-1 rounded font-mono font-bold" placeholder="Rp" />

                                <button type="button" onClick={() => {
                                  const newRules = [...(config.rules || [])];
                                  newRules.splice(idx, 1);
                                  setConfig({...config, rules: newRules});
                                }} className="text-rose-500 hover:bg-rose-100 p-1.5 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                              </div>
                            ))}
                            <button type="button" onClick={() => {
                              const newRule = { id: 'r'+Date.now(), name: 'Aturan Baru', startTime: '00:00', endTime: '23:59', type: 'denda' as any, amount: 0 };
                              setConfig({...config!, rules: [...(config?.rules || []), newRule]});
                            }} className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-1.5 px-3 rounded flex items-center gap-1">
                              <Plus className="w-3 h-3" /> Tambah Aturan Kustom
                            </button>
                          </div>
                        </div>
"""

content = content.replace(
"""                        {/* Section: Dynamic Overtime Settings */}""",
rules_ui + """\n                        {/* Section: Dynamic Overtime Settings */}"""
)

# Update handleSaveConfig to include rules
content = content.replace(
"""        overtimeConfig: {
          normalEndTime: "20:00:00",
          rateHour1: Number(settingsLemburHour1),
          rateHour2Onwards: Number(settingsLemburHour2Onwards)
        }
      })
    });""",
"""        overtimeConfig: {
          normalEndTime: "20:00:00",
          rateHour1: Number(settingsLemburHour1),
          rateHour2Onwards: Number(settingsLemburHour2Onwards)
        },
        rules: config?.rules || []
      })
    });"""
)

with open('src/App.tsx', 'w') as f:
    f.write(content)
