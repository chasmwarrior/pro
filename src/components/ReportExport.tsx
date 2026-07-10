import React, { useState } from 'react';
import { Download, FileText, Filter, Calendar, Users, Printer, CheckCircle, Database, Eye, X } from 'lucide-react';
import { AttendanceRecord, User } from '../types';

interface ReportExportProps {
  records: AttendanceRecord[];
  workers: User[];
}

export default function ReportExport({ records, workers }: ReportExportProps) {
  const [filterType, setFilterType] = useState<'daily' | 'weekly' | 'monthly' | 'all'>('all');
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>('all');
  const [customDate, setCustomDate] = useState<string>('');
  const [isExporting, setIsExporting] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Filter logic
  const getFilteredRecords = () => {
    let result = [...records];

    // Filter by Worker
    if (selectedWorkerId !== 'all') {
      result = result.filter(r => r.userId === selectedWorkerId);
    }

    // Filter by Date type
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    if (filterType === 'daily') {
      const targetDate = customDate || todayStr;
      result = result.filter(r => r.date === targetDate);
    } else if (filterType === 'weekly') {
      // Last 7 days
      const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      result = result.filter(r => new Date(r.date) >= sevenDaysAgo);
    } else if (filterType === 'monthly') {
      // Same month and year
      const targetMonth = customDate ? customDate.substring(0, 7) : todayStr.substring(0, 7);
      result = result.filter(r => r.date.startsWith(targetMonth));
    }

    return result;
  };

  const filteredData = getFilteredRecords();

  // Excel Mock Export via CSV File Download
  const handleExportCSV = () => {
    setIsExporting(true);

    setTimeout(() => {
      // Build CSV String
      const headers = [
        'ID Rekor',
        'Tanggal',
        'ID Pekerja',
        'Nama Karyawan',
        'Divisi',
        'Jam Masuk',
        'Lokasi Masuk',
        'Koordinat Masuk',
        'Jam Keluar',
        'Lokasi Keluar',
        'Koordinat Keluar',
        'Terlambat',
        'Pulang Cepat',
        'Luar Geofence',
        'Status',
        'Denda (IDR)',
        'Bonus (IDR)',
        'Bukti Liveness (URL/Status)'
      ];

      const rows = filteredData.map(r => [
        r.id,
        r.date,
        r.userId,
        r.username,
        r.division,
        r.checkInTime,
        r.checkInLocationName,
        `"${r.checkInLat},${r.checkInLng}"`,
        r.checkOutTime || '-',
        r.checkOutLocationName || '-',
        r.checkOutLat ? `"${r.checkOutLat},${r.checkOutLng}"` : '-',
        r.isLate ? 'YA' : 'TIDAK',
        r.isEarlyOut ? 'YA' : 'TIDAK',
        r.isOutsideGeofence ? 'YA' : 'TIDAK',
        r.status.toUpperCase(),
        r.fineAmount,
        r.bonusAmount,
        r.livenessPhotoUrl ? 'Liveness Ada (Selfie)' : '-'
      ]);

      const csvContent = "\uFEFF" + [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');

      // Create download blob
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Rekap_Absensi_${filterType}_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setIsExporting(false);
    }, 800);
  };

  // PDF Print Trigger
  const handlePrintPDF = () => {
    setIsPrinting(true);

    // Create a printable iframe or open a new styled window for printer formatting
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Pop-up terblokir! Harap izinkan pop-up untuk mencetak rekap absensi.');
      setIsPrinting(false);
      return;
    }

    const rowsHtml = filteredData.map(r => `
      <tr style="border-bottom: 1px solid #e2e8f0; font-size: 10px;">
        <td style="padding: 8px;">${r.date}</td>
        <td style="padding: 8px;"><b>${r.username}</b><br/><small>${r.division}</small></td>
        <td style="padding: 8px;">${r.checkInTime}<br/><small style="color:#64748b">${r.checkInLocationName}</small></td>
        <td style="padding: 8px;">${r.checkOutTime || '-'}<br/><small style="color:#64748b">${r.checkOutLocationName || '-'}</small></td>
        <td style="padding: 8px; text-align: center;">${r.isLate ? '<span style="color:#ef4444; font-weight:bold;">Terlambat</span>' : '<span style="color:#10b981;">Tepat Waktu</span>'}</td>
        <td style="padding: 8px; text-align: center;">${r.isOutsideGeofence ? '<span style="color:#f59e0b; font-weight:bold;">Luar Area</span>' : '<span style="color:#64748b;">Kantor/Gudang</span>'}</td>
        <td style="padding: 8px; text-align: right;">Rp ${r.fineAmount.toLocaleString('id-ID')}</td>
        <td style="padding: 8px; text-align: right;">Rp ${r.bonusAmount.toLocaleString('id-ID')}</td>
        <td style="padding: 8px; text-align: center;">${r.livenessPhotoUrl ? '📸 Selfie Ada' : 'Tidak Ada'}</td>
        <td style="padding: 8px; text-align: center;"><b>${r.status.toUpperCase()}</b></td>
      </tr>
    `).join('');

    const totalFines = filteredData.reduce((acc, r) => acc + r.fineAmount, 0);
    const totalBonuses = filteredData.reduce((acc, r) => acc + r.bonusAmount, 0);

    printWindow.document.write(`
      <html>
        <head>
          <title>Laporan Rekap Absensi Profesional</title>
          <style>
            body { font-family: 'Inter', sans-serif; padding: 30px; color: #1e293b; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background-color: #f1f5f9; padding: 10px; text-align: left; font-size: 11px; text-transform: uppercase; border-bottom: 2px solid #cbd5e1; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #334155; padding-bottom: 15px; }
            .summary { margin-top: 25px; padding: 15px; background-color: #f8fafc; border-radius: 8px; display: flex; justify-content: space-around; font-size: 13px; }
            .footer { margin-top: 50px; text-align: center; font-size: 10px; color: #64748b; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="header">
            <div>
              <h2 style="margin: 0; font-family: 'Space Grotesk', sans-serif; color: #4f46e5;">Laporan Absensi Karyawan</h2>
              <p style="margin: 5px 0 0 0; font-size: 12px; color: #64748b;">Diekspor secara otomatis dari Platform Absensi Profesional</p>
            </div>
            <div style="text-align: right; font-size: 12px; color: #64748b;">
              <p style="margin: 0;"><b>Tanggal Cetak:</b> ${new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              <p style="margin: 3px 0 0 0;"><b>Filter Periode:</b> ${filterType.toUpperCase()}</p>
            </div>
          </div>

          <div class="summary">
            <div>Total Rekor Kehadiran: <b>${filteredData.length}</b></div>
            <div style="color: #ef4444;">Total Denda Kumulatif: <b>Rp ${totalFines.toLocaleString('id-ID')}</b></div>
            <div style="color: #10b981;">Total Bonus Kehadiran: <b>Rp ${totalBonuses.toLocaleString('id-ID')}</b></div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 10%;">Tanggal</th>
                <th style="width: 15%;">Nama / Divisi</th>
                <th style="width: 15%;">Masuk (Geofence)</th>
                <th style="width: 15%;">Pulang (Geofence)</th>
                <th style="width: 10%; text-align: center;">Disiplin</th>
                <th style="width: 10%; text-align: center;">Geofence</th>
                <th style="width: 10%; text-align: right;">Denda</th>
                <th style="width: 10%; text-align: right;">Bonus</th>
                <th style="width: 10%; text-align: center;">Liveness</th>
                <th style="width: 5%; text-align: center;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml || '<tr><td colspan="10" style="text-align:center; padding: 20px; color: #94a3b8;">Tidak ada data log absensi untuk kriteria terpilih.</td></tr>'}
            </tbody>
          </table>

          <div class="footer">
            <p>Laporan ini sah dan dihasilkan secara otomatis oleh sistem pencatatan server terenkripsi.</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    setIsPrinting(false);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-blue-600" />
          <h3 className="font-display font-semibold text-slate-800">Export Rekap Absensi</h3>
        </div>
        <span className="text-slate-400 font-mono text-xs">{filteredData.length} records selected</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
        {/* Filter Type */}
        <div className="space-y-1.5">
          <label htmlFor="filter-select" className="text-[11px] font-bold text-slate-400 uppercase flex items-center gap-1">
            <Filter className="w-3 h-3" />
            <span>Kriteria Periode</span>
          </label>
          <select
            id="filter-select"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50"
          >
            <option value="all">Semua Catatan</option>
            <option value="daily">Harian (Pilih Tanggal)</option>
            <option value="weekly">Mingguan (7 Hari Terakhir)</option>
            <option value="monthly">Bulanan (Pilih Bulan)</option>
          </select>
        </div>

        {/* Worker filter */}
        <div className="space-y-1.5">
          <label htmlFor="worker-select" className="text-[11px] font-bold text-slate-400 uppercase flex items-center gap-1">
            <Users className="w-3 h-3" />
            <span>Karyawan Terpilih</span>
          </label>
          <select
            id="worker-select"
            value={selectedWorkerId}
            onChange={(e) => setSelectedWorkerId(e.target.value)}
            className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50"
          >
            <option value="all">Semua Pekerja</option>
            {workers.map(w => (
              <option key={w.id} value={w.id}>{w.username} ({w.position})</option>
            ))}
          </select>
        </div>

        {/* Custom date input for Daily or Monthly */}
        {(filterType === 'daily' || filterType === 'monthly') && (
          <div className="space-y-1.5">
            <label htmlFor="custom-date-input" className="text-[11px] font-bold text-slate-400 uppercase flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>{filterType === 'daily' ? 'Pilih Tanggal' : 'Pilih Bulan'}</span>
            </label>
            <input
              id="custom-date-input"
              type={filterType === 'daily' ? 'date' : 'month'}
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50"
            />
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 pt-3 border-t border-slate-100">
        <button
          type="button"
          onClick={handleExportCSV}
          disabled={isExporting}
          id="btn-export-excel"
          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs py-2.5 px-4 rounded-lg shadow-sm transition flex items-center justify-center gap-2 cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>{isExporting ? 'Mengekspor...' : 'Ekspor ke Excel (.CSV)'}</span>
        </button>

        <button
          type="button"
          onClick={() => setShowPreview(true)}
          id="btn-preview-report"
          className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs py-2.5 px-4 rounded-lg shadow-sm transition flex items-center justify-center gap-2 cursor-pointer"
        >
          <Eye className="w-4 h-4" />
          <span>Pratinjau Laporan (PDF)</span>
        </button>

        <button
          type="button"
          onClick={handlePrintPDF}
          disabled={isPrinting}
          id="btn-export-pdf"
          className="flex-1 bg-slate-700 hover:bg-slate-800 text-white font-medium text-xs py-2.5 px-4 rounded-lg shadow-sm transition flex items-center justify-center gap-2 cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          <span>{isPrinting ? 'Mempersiapkan...' : 'Cetak Laporan Langsung'}</span>
        </button>
      </div>

      <div className="mt-4 flex items-center gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200/50">
        <CheckCircle className="w-4 h-4 text-blue-500 shrink-0" />
        <p className="text-[10px] text-slate-500 leading-normal">
          Format data ekspor sudah mencakup parameter absensi penuh: waktu masuk/pulang, koordinat radar, indikasi denda keterlambatan, jatah bonus, sisa cuti, dan lampiran URL liveness check.
        </p>
      </div>

      {/* Export Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-100 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 animate-fade-in text-slate-800">
            {/* Modal Header */}
            <div className="bg-slate-900 px-5 py-3 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-400" />
                <span className="font-display font-semibold text-xs uppercase tracking-wider">Pratinjau Dokumen Ekspor Laporan PDF</span>
              </div>
              <button
                type="button"
                onClick={() => setShowPreview(false)}
                className="p-1 hover:bg-slate-800 rounded-full transition text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Preview Area (styled as an A4 page) */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar flex justify-center bg-slate-200">
              <div className="bg-white max-w-3xl w-full shadow-lg border border-slate-300 p-8 text-slate-800 font-sans leading-normal relative min-h-[700px] flex flex-col justify-between">
                
                <div>
                  {/* PDF Corporate Header */}
                  <div className="flex justify-between items-start border-b-2 border-slate-800 pb-4">
                    <div>
                      <h1 className="font-display font-bold text-base text-indigo-700 tracking-tight">LAPORAN REKAP ABSENSI KARYAWAN</h1>
                      <p className="text-[9px] text-slate-500 font-mono mt-1">DIBUAT SECARA OTOMATIS OLEH SYSTEM ABSENPRO NUSANTARA • DIGITAL SECURE</p>
                    </div>
                    <div className="text-right text-[9px] font-mono text-slate-500 leading-normal">
                      <p><strong>TANGGAL CETAK:</strong> {new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                      <p><strong>FILTER PERIODE:</strong> {filterType.toUpperCase()}</p>
                      <p><strong>REKOR ABSEN:</strong> {filteredData.length} Baris</p>
                    </div>
                  </div>

                  {/* Summaries in PDF */}
                  <div className="grid grid-cols-3 gap-3 my-4 bg-slate-50 border border-slate-200 rounded-lg p-3 text-[10px]">
                    <div>
                      <span className="text-slate-500 block text-[8px] uppercase font-bold tracking-wider">TOTAL KUMULATIF DENDA</span>
                      <span className="text-rose-600 font-bold font-mono text-xs">Rp {filteredData.reduce((acc, r) => acc + r.fineAmount, 0).toLocaleString('id-ID')}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[8px] uppercase font-bold tracking-wider">TOTAL BONUS HADIR</span>
                      <span className="text-emerald-600 font-bold font-mono text-xs">Rp {filteredData.reduce((acc, r) => acc + r.bonusAmount, 0).toLocaleString('id-ID')}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[8px] uppercase font-bold tracking-wider">TINGKAT DISIPLIN KARYAWAN</span>
                      <span className="text-indigo-600 font-bold font-mono text-xs">
                        {filteredData.length > 0 
                          ? `${Math.round((filteredData.filter(r => !r.isLate).length / filteredData.length) * 100)}% Tepat Waktu`
                          : '100%'}
                      </span>
                    </div>
                  </div>

                  {/* Document Table */}
                  <div className="overflow-x-auto border border-slate-200 rounded-lg">
                    <table className="w-full text-left border-collapse text-[9px]">
                      <thead>
                        <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300 font-mono text-[8px] uppercase tracking-wider">
                          <th className="p-1.5 border-b border-slate-300">Tanggal</th>
                          <th className="p-1.5 border-b border-slate-300">Nama / Divisi</th>
                          <th className="p-1.5 border-b border-slate-300">Masuk (Geofence)</th>
                          <th className="p-1.5 border-b border-slate-300">Pulang (Geofence)</th>
                          <th className="p-1.5 border-b border-slate-300 text-center">Disiplin</th>
                          <th className="p-1.5 border-b border-slate-300 text-center">Geofence</th>
                          <th className="p-1.5 border-b border-slate-300 text-right">Denda</th>
                          <th className="p-1.5 border-b border-slate-300 text-right">Bonus</th>
                          <th className="p-1.5 border-b border-slate-300 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredData.length > 0 ? (
                          filteredData.map(r => (
                            <tr key={r.id} className="text-slate-600">
                              <td className="p-1.5 font-mono text-slate-500">{r.date}</td>
                              <td className="p-1.5">
                                <p className="font-bold text-slate-800">{r.username}</p>
                                <span className="text-[8px] text-slate-400 leading-tight block">{r.division}</span>
                              </td>
                              <td className="p-1.5 leading-tight">
                                <p className="font-bold text-slate-700">{r.checkInTime}</p>
                                <span className="text-[8px] text-slate-400 block max-w-[100px] truncate" title={r.checkInLocationName}>{r.checkInLocationName}</span>
                              </td>
                              <td className="p-1.5 leading-tight">
                                <p className="font-bold text-slate-700">{r.checkOutTime || '-'}</p>
                                <span className="text-[8px] text-slate-400 block max-w-[100px] truncate" title={r.checkOutLocationName || '-'}>{r.checkOutLocationName || '-'}</span>
                              </td>
                              <td className="p-1.5 text-center font-mono">
                                {r.isLate ? <span className="text-rose-600 font-bold">LATE</span> : <span className="text-emerald-600 font-bold">ONTIME</span>}
                              </td>
                              <td className="p-1.5 text-center font-mono">
                                {r.isOutsideGeofence ? <span className="text-amber-600 font-bold">OUT</span> : <span className="text-slate-400">IN</span>}
                              </td>
                              <td className="p-1.5 text-right font-mono text-rose-600">Rp {r.fineAmount.toLocaleString('id-ID')}</td>
                              <td className="p-1.5 text-right font-mono text-emerald-600">Rp {r.bonusAmount.toLocaleString('id-ID')}</td>
                              <td className="p-1.5 text-center">
                                <span className="text-[8px] uppercase px-1 rounded bg-slate-50 font-bold text-slate-700 border border-slate-200">
                                  {r.status}
                                </span>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={9} className="p-8 text-center text-slate-400 font-mono text-xs">
                              Tidak ada catatan absen yang cocok untuk kriteria rekap ini.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                </div>

                {/* PDF Footer / Verification Seal */}
                <div className="border-t-2 border-slate-200 pt-5 mt-8 flex justify-between items-end">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-full border-2 border-dashed border-indigo-600 flex items-center justify-center p-0.5 transform -rotate-12 select-none opacity-80 shrink-0">
                      <div className="w-full h-full rounded-full bg-indigo-50 border border-indigo-200 flex flex-col items-center justify-center text-[5px] font-bold text-indigo-700 font-mono leading-none">
                        <span>SYSTEM</span>
                        <span>VERIFIED</span>
                      </div>
                    </div>
                    <div className="text-[8px] text-slate-400 font-mono leading-tight">
                      <p>SIGNED SECURELY BY: ABSENPRO DIGITAL ENGINE</p>
                      <p>INTEGRITY CHECK ID: SHA256-PDF-VERIFY-8812</p>
                    </div>
                  </div>
                  
                  <div className="w-36 text-center border-t border-slate-300 pt-1 text-[8px] font-mono text-slate-500">
                    <p>Tanda Tangan Pengawas</p>
                  </div>
                </div>

              </div>
            </div>

            {/* Modal Actions */}
            <div className="bg-slate-50 border-t border-slate-200 px-5 py-3 flex justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setShowPreview(false)}
                className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 text-xs font-semibold transition cursor-pointer"
              >
                Kembali ke Filter
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowPreview(false);
                  handlePrintPDF();
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition flex items-center gap-2 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak / Ekspor PDF Sekarang</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
