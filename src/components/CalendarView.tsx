import React, { useState } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Info, AlertTriangle, Check, ShieldAlert } from 'lucide-react';
import { User, LeaveRequest } from '../types';

interface CalendarViewProps {
  currentUser: User;
  leaveRequests: LeaveRequest[];
  onApplyLeave: (date: string, notes: string) => Promise<{ success: boolean; message: string; conflict: boolean }>;
}

const DIVISION_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'Management': { bg: 'bg-purple-100 text-purple-800 border-purple-200', text: 'text-purple-700', border: 'border-purple-500' },
  'Operations': { bg: 'bg-blue-100 text-blue-800 border-blue-200', text: 'text-blue-700', border: 'border-blue-500' },
  'Logistics': { bg: 'bg-amber-100 text-amber-800 border-amber-200', text: 'text-amber-700', border: 'border-amber-500' },
  'Finance': { bg: 'bg-emerald-100 text-emerald-800 border-emerald-200', text: 'text-emerald-700', border: 'border-emerald-500' },
  'Security': { bg: 'bg-rose-100 text-rose-800 border-rose-200', text: 'text-rose-700', border: 'border-rose-500' },
};

const DEFAULT_COLOR = { bg: 'bg-slate-100 text-slate-800 border-slate-200', text: 'text-slate-700', border: 'border-slate-500' };

export default function CalendarView({ currentUser, leaveRequests, onApplyLeave }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'warning'; text: string } | null>(null);

  const isAdminOrSpv = currentUser.role === 'admin' || currentUser.role === 'supervisor';

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Create array of days for calendar
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blankDays = Array.from({ length: firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1 }, (_, i) => i); // Mon-based starts

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  // Convert day number to string date YYYY-MM-DD
  const formatDateString = (day: number) => {
    const d = new Date(year, month, day);
    const offset = d.getTimezoneOffset();
    const localDate = new Date(d.getTime( ) - (offset * 60 * 1000));
    return localDate.toISOString().split('T')[0];
  };

  // Filter leave requests based on division rules:
  // - Admin/Supervisor can see all requests
  // - Workers can ONLY see requests for their own division
  const visibleRequests = leaveRequests.filter((req) => {
    if (isAdminOrSpv) return req.status === 'approved';
    return req.division === currentUser.division && req.status === 'approved';
  });

  const getDayLeaves = (dateStr: string) => {
    return visibleRequests.filter((r) => r.date === dateStr);
  };

  const handleDayClick = (day: number) => {
    const dateStr = formatDateString(day);
    const todayStr = new Date().toISOString().split('T')[0];

    // Prevent past date selections
    if (dateStr < todayStr) {
      setStatusMessage({
        type: 'error',
        text: 'Anda tidak dapat memilih tanggal yang sudah terlewat untuk pengajuan cuti/libur.'
      });
      setSelectedDate(null);
      return;
    }

    setSelectedDate(dateStr);
    setStatusMessage(null);

    // Check same division lock warning
    const sameDivLeaves = leaveRequests.filter(
      (r) => r.date === dateStr && r.division === currentUser.division && r.status === 'approved'
    );

    if (sameDivLeaves.length > 0) {
      const firstBooker = sameDivLeaves[0].username;
      setStatusMessage({
        type: 'warning',
        text: `Tanggal ini sudah di-lock/dibooking oleh pekerja ${firstBooker} (${currentUser.division}). Pengajuan Anda akan membutuhkan persetujuan manual oleh Administrator/Supervisor.`
      });
    }
  };

  const handleSubmitLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate) return;

    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      const res = await onApplyLeave(selectedDate, notes);
      if (res.success) {
        setStatusMessage({
          type: res.conflict ? 'warning' : 'success',
          text: res.message
        });
        setNotes('');
        setSelectedDate(null);
      } else {
        setStatusMessage({
          type: 'error',
          text: res.message
        });
      }
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: 'Terjadi kesalahan saat mengajukan libur.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const todayStr = new Date().toISOString().split('T')[0];

  const getSelectedDateConflicts = () => {
    if (!selectedDate) return [];
    const dayReqs = leaveRequests.filter(r => r.date === selectedDate && r.status !== 'rejected');
    const divisionGroups: Record<string, string[]> = {};
    dayReqs.forEach(r => {
      if (!divisionGroups[r.division]) {
        divisionGroups[r.division] = [];
      }
      divisionGroups[r.division].push(r.username);
    });
    return Object.entries(divisionGroups)
      .filter(([_, users]) => users.length >= 2)
      .map(([div, users]) => ({ division: div, usernames: users }));
  };
  const selectedDateConflicts = getSelectedDateConflicts();

  const myLeaves = leaveRequests.filter((l) => l.userId === currentUser.id);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-blue-600" />
          <h3 className="font-display font-semibold text-slate-800">Kalender Pengajuan Libur</h3>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg p-1 shadow-sm">
            <button 
              type="button" 
              onClick={prevMonth} 
              className="p-1 hover:bg-slate-100 rounded text-slate-600 transition"
              id="btn-prev-month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-semibold px-2 text-slate-700 min-w-[120px] text-center">
              {monthNames[month]} {year}
            </span>
            <button 
              type="button" 
              onClick={nextMonth} 
              className="p-1 hover:bg-slate-100 rounded text-slate-600 transition"
              id="btn-next-month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Grid */}
        <div className="lg:col-span-2">
          <div className="grid grid-cols-7 gap-1 text-center font-semibold text-xs text-slate-400 uppercase tracking-wider mb-2">
            <div>Sen</div>
            <div>Sel</div>
            <div>Rab</div>
            <div>Kam</div>
            <div>Jum</div>
            <div>Sab</div>
            <div>Min</div>
          </div>

          <div className="grid grid-cols-7 gap-1">
            {/* Blank offset days */}
            {blankDays.map((b) => (
              <div key={`blank-${b}`} className="aspect-square bg-slate-50/50 rounded-lg border border-transparent"></div>
            ))}

            {/* Actual days of month */}
            {daysArray.map((day) => {
              const dateStr = formatDateString(day);
              const dayLeaves = getDayLeaves(dateStr);
              const isSelected = selectedDate === dateStr;
              const isPast = dateStr < todayStr;
              const isToday = dateStr === todayStr;

              // Check for division-level conflicts (multiple leaves on same division on same day)
              const dayReqs = leaveRequests.filter(r => r.date === dateStr && r.status !== 'rejected');
              const divisionGroups: Record<string, string[]> = {};
              dayReqs.forEach(r => {
                if (!divisionGroups[r.division]) {
                  divisionGroups[r.division] = [];
                }
                divisionGroups[r.division].push(r.username);
              });
              const dayConflicts = Object.entries(divisionGroups)
                .filter(([_, users]) => users.length >= 2)
                .map(([div, users]) => ({ division: div, usernames: users }));

              return (
                <button
                  key={`day-${day}`}
                  type="button"
                  onClick={() => handleDayClick(day)}
                  id={`day-${dateStr}`}
                  className={`aspect-square p-1 rounded-lg border transition flex flex-col justify-between text-left relative group ${
                    isPast 
                      ? 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed' 
                      : isSelected 
                        ? 'border-blue-600 ring-2 ring-blue-100 bg-blue-50/20' 
                        : isToday
                          ? 'border-blue-500 bg-white hover:bg-slate-50'
                          : 'border-slate-100 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className={`text-[11px] font-semibold flex items-center justify-center w-5 h-5 rounded-full ${
                      isToday ? 'bg-blue-600 text-white' : 'text-slate-600'
                    }`}>
                      {day}
                    </span>
                    {dayConflicts.length > 0 && (
                      <div 
                        className="text-amber-500 bg-amber-50 p-0.5 rounded-full border border-amber-200 animate-pulse shrink-0 cursor-help"
                        title={`Konflik Jadwal: Ada ${dayConflicts.length} divisi dengan cuti ganda (${dayConflicts.map(c => `${c.division}: ${c.usernames.join(', ')}`).join(' | ')})`}
                      >
                        <AlertTriangle className="w-2.5 h-2.5" />
                      </div>
                    )}
                  </div>

                  {/* Render Booked Leaves Indicator */}
                  <div className="w-full space-y-0.5 mt-1 overflow-hidden">
                    {dayLeaves.map((leave) => {
                      const col = DIVISION_COLORS[leave.division] || DEFAULT_COLOR;
                      return (
                        <div
                          key={leave.id}
                          className={`text-[8px] leading-tight px-1 py-0.5 rounded border truncate ${col.bg} ${col.border} border-l-2`}
                          title={`${leave.username} (${leave.division})`}
                        >
                          {isAdminOrSpv ? `${leave.username} [${leave.division}]` : leave.username}
                        </div>
                      );
                    })}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Division Legend */}
          <div className="mt-5 p-3.5 bg-slate-50 border border-slate-200/60 rounded-xl flex flex-wrap gap-3 text-xs">
            <span className="font-semibold text-slate-500 flex items-center gap-1">Divisi:</span>
            {Object.entries(DIVISION_COLORS).map(([div, colors]) => (
              <div key={div} className="flex items-center gap-1">
                <span className={`w-2.5 h-2.5 rounded-full border border-current opacity-70 ${colors.bg}`}></span>
                <span className="text-slate-600 text-[11px]">{div}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Input Form Column */}
        <div className="space-y-4">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
            <h4 className="font-display font-semibold text-slate-700 text-sm mb-3 flex items-center gap-1.5">
              <CalendarIcon className="w-4 h-4 text-blue-500" />
              <span>Form Pengajuan</span>
            </h4>

            {selectedDate ? (
              <form onSubmit={handleSubmitLeave} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase">Tanggal Terpilih</label>
                  <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 font-mono">
                    {new Date(selectedDate).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </div>
                </div>

                {/* Conflict Leave Warning */}
                {selectedDateConflicts.length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-amber-800 text-[11px] flex gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5 animate-bounce" />
                    <div>
                      <p className="font-bold text-amber-900 text-xs">Peringatan Konflik Cuti</p>
                      <p className="text-[10px] text-slate-600 leading-relaxed mt-0.5">
                        Ada karyawan dari divisi yang sama mengajukan cuti pada tanggal ini:
                      </p>
                      <ul className="list-disc pl-4 mt-1.5 text-[10px] text-slate-700 space-y-1">
                        {selectedDateConflicts.map((c, idx) => (
                          <li key={idx}>
                            Divisi <span className="font-bold text-amber-900">{c.division}</span>: {c.usernames.join(', ')}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <label htmlFor="notes-textarea" className="text-[11px] font-bold text-slate-400 uppercase">Keterangan / Alasan</label>
                  <textarea
                    id="notes-textarea"
                    required
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Contoh: Keperluan keluarga, cek kesehatan, atau jatah liburan berkala..."
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  id="btn-submit-leave"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs py-2 px-4 rounded-lg shadow-sm transition flex items-center justify-center gap-2"
                >
                  {isSubmitting ? 'Mengirim...' : 'Kunci Jatah Libur'}
                </button>
              </form>
            ) : (
              <div className="text-center py-8 text-slate-400">
                <Info className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p className="text-xs">
                  Silakan pilih tanggal yang tersedia pada kalender untuk mengajukan cuti atau jatah libur.
                </p>
              </div>
            )}
          </div>

          {/* Alert Status Panel */}
          {statusMessage && (
            <div className={`p-4 rounded-xl border flex gap-3 text-xs ${
              statusMessage.type === 'success' 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                : statusMessage.type === 'warning'
                  ? 'bg-amber-50 border-amber-200 text-amber-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}>
              {statusMessage.type === 'success' ? (
                <Check className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : statusMessage.type === 'warning' ? (
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              ) : (
                <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
              )}
              <div>
                <p className="font-semibold capitalize">{statusMessage.type === 'warning' ? 'Perhatian / Konflik' : statusMessage.type}</p>
                <p className="mt-0.5 leading-relaxed text-[11px]">{statusMessage.text}</p>
              </div>
            </div>
          )}

          {/* Personal Leave Requests Status list with Supervisor feedback */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mt-4">
            <h4 className="font-display font-semibold text-slate-700 text-xs mb-3 flex items-center gap-1.5 uppercase tracking-wider font-mono">
              <Info className="w-4 h-4 text-indigo-500" />
              <span>Status Pengajuan Anda</span>
            </h4>
            {myLeaves.length > 0 ? (
              <div className="space-y-3 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                {myLeaves.slice().reverse().map((l) => (
                  <div key={l.id} className="bg-white p-3 rounded-lg border border-slate-200/60 shadow-xs text-[11px]">
                    <div className="flex items-center justify-between font-bold mb-1">
                      <span className="font-mono text-slate-600">{l.date}</span>
                      <span className={`px-2 py-0.5 rounded text-[9px] uppercase font-bold tracking-wider ${
                        l.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        l.status === 'rejected' ? 'bg-rose-50 text-rose-700 border border-rose-200' : 
                        'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {l.status === 'approved' ? 'Disetujui' : l.status === 'rejected' ? 'Ditolak' : 'Tertunda'}
                      </span>
                    </div>
                    <p className="text-slate-500 italic mt-1">" {l.notes} "</p>
                    {l.adminRemarks && (
                      <div className="mt-2 bg-slate-50 border-l-2 border-indigo-500 p-2 text-[10px] text-slate-700 font-sans">
                        <span className="font-bold text-indigo-600 block text-[8px] uppercase tracking-wider mb-0.5">Catatan Supervisor:</span>
                        {l.adminRemarks}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-400 text-xs text-center py-4 italic">Belum ada riwayat pengajuan cuti.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
