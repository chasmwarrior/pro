import re

with open('src/components/CalendarView.tsx', 'r') as f:
    content = f.read()

props_interface = """interface CalendarViewProps {
  currentUser: any;
  leaveRequests: Array<any>;
  onApplyLeave: (dates: string[], notes: string) => Promise<{success: boolean, message: string, conflict: boolean}>;
  onCancelLeave?: (leaveId: string) => Promise<{success: boolean, message: string}>;
}"""

content = content.replace(
"""interface CalendarViewProps {
  currentUser: any;
  leaveRequests: Array<any>;
  onApplyLeave: (dates: string[], notes: string) => Promise<{success: boolean, message: string, conflict: boolean}>;
}""",
props_interface
)

func_def = """export default function CalendarView({ currentUser, leaveRequests, onApplyLeave, onCancelLeave }: CalendarViewProps) {"""

content = content.replace(
"""export default function CalendarView({ currentUser, leaveRequests, onApplyLeave }: CalendarViewProps) {""",
func_def
)

# Render Cancel button
cancel_button = """                  <div className="flex items-center justify-between font-bold mb-1">
                      <span className="font-mono text-slate-600">{l.date}</span>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[9px] uppercase font-bold tracking-wider ${
                          l.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          l.status === 'rejected' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                          'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {l.status === 'approved' ? 'Disetujui' : l.status === 'rejected' ? 'Ditolak' : 'Tertunda'}
                        </span>
                        {onCancelLeave && (
                          <button
                            type="button"
                            onClick={async () => {
                               if(window.confirm('Batalkan pengajuan libur ini?')) {
                                  const res = await onCancelLeave(l.id);
                                  if(!res.success) alert(res.message);
                               }
                            }}
                            className="text-rose-500 hover:text-rose-700 font-bold px-1"
                            title="Batalkan pengajuan (Maks H-1)"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>"""

content = content.replace(
"""                    <div className="flex items-center justify-between font-bold mb-1">
                      <span className="font-mono text-slate-600">{l.date}</span>
                      <span className={`px-2 py-0.5 rounded text-[9px] uppercase font-bold tracking-wider ${
                        l.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        l.status === 'rejected' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                        'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {l.status === 'approved' ? 'Disetujui' : l.status === 'rejected' ? 'Ditolak' : 'Tertunda'}
                      </span>
                    </div>""",
cancel_button
)

with open('src/components/CalendarView.tsx', 'w') as f:
    f.write(content)
