import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

// Set up JSON parsing with a large size limit to support base64 liveness photos
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ limit: '15mb', extended: true }));

const DB_PATH = path.join(process.cwd(), 'src', 'db', 'db.json');

// Ensure database directory and file exist
function ensureDB() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(DB_PATH)) {
    const initialData = {
      users: [
        {
          id: "u1",
          username: "admin",
          email: "admin@absensi.com",
          password: "admin",
          role: "admin",
          status: "approved",
          division: "Management",
          position: "Director",
          photoUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
          leaveQuota: { libur: 12, telat: 5, telatDarurat: 3, pulangCepat: 5 },
          lastCheckInDevice: "PC-Admin-Device",
          currentLat: -6.2088,
          currentLng: 106.8456,
          lastActiveAt: new Date().toISOString()
        },
        {
          id: "u2",
          username: "supervisor",
          email: "spv@absensi.com",
          password: "password",
          role: "supervisor",
          status: "approved",
          division: "Operations",
          position: "Supervisor Gudang",
          photoUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
          leaveQuota: { libur: 12, telat: 5, telatDarurat: 3, pulangCepat: 5 },
          lastCheckInDevice: "Android-Device-SPV",
          currentLat: -6.2349,
          currentLng: 106.9896,
          lastActiveAt: new Date().toISOString()
        },
        {
          id: "u3",
          username: "budi",
          email: "budi@absensi.com",
          password: "password",
          role: "worker",
          status: "approved",
          division: "Logistics",
          position: "Kurir Delivery",
          photoUrl: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150",
          leaveQuota: { libur: 10, telat: 4, telatDarurat: 2, pulangCepat: 3 },
          lastCheckInDevice: "Android-Budi-S21",
          currentLat: -6.2091,
          currentLng: 106.8461,
          lastActiveAt: new Date().toISOString()
        },
        {
          id: "u4",
          username: "siti",
          email: "siti@absensi.com",
          password: "password",
          role: "worker",
          status: "pending",
          division: "Operations",
          position: "Staff Gudang",
          photoUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150",
          leaveQuota: { libur: 12, telat: 5, telatDarurat: 3, pulangCepat: 5 }
        }
      ],
      attendanceRecords: [
        {
          id: "r1",
          userId: "u3",
          username: "budi",
          division: "Logistics",
          date: "2026-07-08",
          checkInTime: "07:45:12",
          checkInLat: -6.2089,
          checkInLng: 106.8458,
          checkInLocationName: "Kantor Pusat Jakarta",
          checkOutTime: "17:05:30",
          checkOutLat: -6.2088,
          checkOutLng: 106.8456,
          checkOutLocationName: "Kantor Pusat Jakarta",
          isLate: false,
          isEarlyOut: false,
          isOutsideGeofence: false,
          status: "approved",
          fineAmount: 0,
          bonusAmount: 25000,
          note: "Hadir tepat waktu di area kantor"
        },
        {
          id: "r2",
          userId: "u3",
          username: "budi",
          division: "Logistics",
          date: "2026-07-09",
          checkInTime: "08:15:44",
          checkInLat: -6.2088,
          checkInLng: 106.8456,
          checkInLocationName: "Kantor Pusat Jakarta",
          checkOutTime: "17:01:10",
          checkOutLat: -6.2088,
          checkOutLng: 106.8456,
          checkOutLocationName: "Kantor Pusat Jakarta",
          isLate: true,
          isEarlyOut: false,
          isOutsideGeofence: false,
          status: "approved",
          fineAmount: 50000,
          bonusAmount: 0,
          note: "Terlambat masuk 15 menit"
        }
      ],
      leaveRequests: [
        {
          id: "l1",
          userId: "u3",
          username: "budi",
          division: "Logistics",
          date: "2026-07-15",
          status: "approved",
          notes: "Menghadiri pernikahan keluarga"
        },
        {
          id: "l2",
          userId: "u3",
          username: "budi",
          division: "Logistics",
          date: "2026-07-20",
          status: "pending",
          notes: "Pemeriksaan kesehatan rutin"
        }
      ],
      locations: [
        {
          id: "loc1",
          name: "Kantor Pusat Jakarta",
          lat: -6.2088,
          lng: 106.8456,
          radiusMeter: 150
        },
        {
          id: "loc2",
          name: "Gudang Bekasi Timur",
          lat: -6.2349,
          lng: 106.9896,
          radiusMeter: 200
        }
      ],
      announcements: [
        {
          id: "a1",
          title: "Sosialisasi Disiplin Kerja & Aturan Absensi",
          content: "Diberitahukan kepada seluruh pekerja untuk selalu melakukan check-in tepat waktu sebelum jam 08:00 pagi. Jika berada di luar wilayah geofence kantor/gudang, harap melakukan liveness check berupa foto lokasi terkini untuk verifikasi admin.",
          startDate: "2026-07-01",
          endDate: "2026-07-31",
          createdBy: "admin"
        }
      ],
      config: {
        branding: {
          name: "AbsenPro Nusantara",
          logoUrl: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=100&h=100&fit=crop&q=80"
        },
        dendaTelat: 50000,
        bonusTepatWaktu: 25000,
        bonusDisiplinBulanan: 200000,
        divisions: [
          "Management",
          "Operations",
          "Logistics",
          "Finance",
          "Security"
        ],
        positions: [
          "Director",
          "Supervisor Gudang",
          "Kurir Delivery",
          "Staff Gudang",
          "Admin Operasional",
          "Security Guard"
        ]
      }
    };
    fs.writeFileSync(DB_PATH, JSON.stringify(initialData, null, 2), 'utf-8');
  }
}

ensureDB();

function readDB() {
  ensureDB();
  const data = fs.readFileSync(DB_PATH, 'utf-8');
  return JSON.parse(data);
}

function writeDB(data: any) {
  ensureDB();
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

// Distance utility (Haversine formula)
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in meters
}

/* ==========================================================================
   API ENDPOINTS
   ========================================================================== */

// 1. Time API (Ensures clients display authentic server time to prevent clock manipulation)
app.get('/api/time', (req, res) => {
  res.json({ serverTime: new Date().toISOString() });
});

// 2. Branding & Configurations
app.get('/api/config', (req, res) => {
  const db = readDB();
  res.json(db.config);
});

app.post('/api/config', (req, res) => {
  const db = readDB();
  db.config = { ...db.config, ...req.body };
  writeDB(db);
  res.json({ success: true, config: db.config });
});

// 3. Auth Endpoints
app.post('/api/auth/register', (req, res) => {
  const { username, email, password, isGoogleAuth, googlePhoto } = req.body;
  const db = readDB();

  // Validate uniqueness
  const exists = db.users.find((u: any) => u.email.toLowerCase() === email.toLowerCase() || u.username.toLowerCase() === username.toLowerCase());
  if (exists) {
    return res.status(400).json({ error: 'Username atau Email sudah terdaftar.' });
  }

  const newUser = {
    id: 'u_' + Math.random().toString(36).substr(2, 9),
    username,
    email: email.toLowerCase(),
    password: password || 'oauth-account',
    role: 'worker',
    status: 'pending', // Registration locks status to pending until Admin approves
    division: 'Belum Ditentukan',
    position: 'Belum Ditentukan',
    photoUrl: googlePhoto || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
    leaveQuota: {
      libur: 12,
      telat: 5,
      telatDarurat: 3,
      pulangCepat: 5
    }
  };

  db.users.push(newUser);
  writeDB(db);
  res.json({ success: true, user: newUser });
});

app.post('/api/auth/login', (req, res) => {
  const { credential, password, isGoogleAuth } = req.body; // credential can be email or username
  const db = readDB();

  let user;
  if (isGoogleAuth) {
    user = db.users.find((u: any) => u.email.toLowerCase() === credential.toLowerCase());
    if (!user) {
      // Auto-register google users as pending if they don't exist
      const newId = 'u_' + Math.random().toString(36).substr(2, 9);
      user = {
        id: newId,
        username: credential.split('@')[0],
        email: credential.toLowerCase(),
        password: 'google-oauth',
        role: 'worker',
        status: 'pending',
        division: 'Belum Ditentukan',
        position: 'Belum Ditentukan',
        photoUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
        leaveQuota: { libur: 12, telat: 5, telatDarurat: 3, pulangCepat: 5 }
      };
      db.users.push(user);
      writeDB(db);
    }
  } else {
    user = db.users.find(
      (u: any) =>
        (u.email.toLowerCase() === credential.toLowerCase() || u.username.toLowerCase() === credential.toLowerCase()) &&
        u.password === password
    );
  }

  if (!user) {
    return res.status(401).json({ error: 'Kredensial atau Password salah.' });
  }

  if (user.status === 'pending') {
    return res.status(403).json({
      error: 'Akun Anda masih dalam status PENDING verifikasi. Harap tunggu persetujuan dari Administrator atau Supervisor.',
      user
    });
  }

  if (user.status === 'rejected') {
    return res.status(403).json({ error: 'Pendaftaran akun Anda ditolak oleh Administrator/Supervisor.' });
  }

  res.json({ success: true, user });
});

// 4. Pending Workers Management
app.get('/api/users/pending', (req, res) => {
  const db = readDB();
  const pendingUsers = db.users.filter((u: any) => u.status === 'pending');
  res.json(pendingUsers);
});

app.get('/api/users', (req, res) => {
  const db = readDB();
  res.json(db.users);
});

app.post('/api/users/approve', (req, res) => {
  const { userId, role, division, position, locationId } = req.body;
  const db = readDB();

  const userIdx = db.users.findIndex((u: any) => u.id === userId);
  if (userIdx === -1) {
    return res.status(404).json({ error: 'Pengguna tidak ditemukan.' });
  }

  db.users[userIdx].status = 'approved';
  db.users[userIdx].role = role || 'worker';
  db.users[userIdx].division = division || 'Operations';
  db.users[userIdx].position = position || 'Staff Gudang';
  // Keep track of workplace location preferences if assigned
  db.users[userIdx].assignedLocationId = locationId || 'loc1';

  writeDB(db);
  res.json({ success: true, user: db.users[userIdx] });
});

app.post('/api/users/reject', (req, res) => {
  const { userId } = req.body;
  const db = readDB();

  const userIdx = db.users.findIndex((u: any) => u.id === userId);
  if (userIdx === -1) {
    return res.status(404).json({ error: 'Pengguna tidak ditemukan.' });
  }

  db.users[userIdx].status = 'rejected';
  writeDB(db);
  res.json({ success: true });
});

// 5. Attendance Operations (Check in / Check out)
app.post('/api/attendance/check-in', (req, res) => {
  const { userId, lat, lng, device, livenessPhoto } = req.body;
  const db = readDB();

  const user = db.users.find((u: any) => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: 'User tidak ditemukan.' });
  }

  // Device binding check
  if (user.lastCheckInDevice && user.lastCheckInDevice !== device) {
    return res.status(400).json({
      error: `Perangkat terdeteksi berbeda (${device}). Perangkat Anda dikunci ke '${user.lastCheckInDevice}'. Hubungi Administrator untuk melakukan UNBIND DEVICE.`
    });
  }

  // Determine locations & geofences
  const locations = db.locations;
  let nearestLoc: any = null;
  let minDistance = Infinity;

  locations.forEach((loc: any) => {
    const dist = getDistance(lat, lng, loc.lat, loc.lng);
    if (dist < minDistance) {
      minDistance = dist;
      nearestLoc = loc;
    }
  });

  const isOutside = !nearestLoc || minDistance > nearestLoc.radiusMeter;

  // Liveness photo constraint if outside geofence
  if (isOutside && !livenessPhoto) {
    return res.status(400).json({
      outsideGeofence: true,
      error: 'Anda berada di luar koordinat Gudang/Kantor resmi. Wajib melakukan verifikasi LIVENESS dengan mengambil foto selfie lokasi terkini.'
    });
  }

  // Bind device if not already bound
  if (!user.lastCheckInDevice) {
    user.lastCheckInDevice = device;
  }

  // Update user live position metadata
  user.currentLat = lat;
  user.currentLng = lng;
  user.lastActiveAt = new Date().toISOString();

  // Handle core metrics
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().split(' ')[0]; // HH:MM:SS

  // Check if already checked in today
  const existingRecord = db.attendanceRecords.find((r: any) => r.userId === userId && r.date === dateStr);
  if (existingRecord) {
    return res.status(400).json({ error: 'Anda sudah melakukan Check-In hari ini.' });
  }

  // Late calculation (e.g., after 08:00 AM is late)
  const [hours, minutes] = timeStr.split(':').map(Number);
  const isLate = (hours > 8) || (hours === 8 && minutes > 0);

  let fineAmount = 0;
  let bonusAmount = 0;
  if (isLate) {
    fineAmount = db.config.dendaTelat;
    // Decrement late quota
    if (user.leaveQuota.telat > 0) {
      user.leaveQuota.telat -= 1;
    }
  } else {
    bonusAmount = db.config.bonusTepatWaktu;
  }

  const newRecord = {
    id: 'att_' + Math.random().toString(36).substr(2, 9),
    userId,
    username: user.username,
    division: user.division,
    date: dateStr,
    checkInTime: timeStr,
    checkInLat: lat,
    checkInLng: lng,
    checkInLocationName: isOutside ? 'Di Luar Area Geofence' : nearestLoc.name,
    isLate,
    isEarlyOut: false,
    isOutsideGeofence: isOutside,
    livenessPhotoUrl: livenessPhoto || null,
    status: isOutside ? 'pending' : 'approved', // outside geofence check-ins remain pending for review
    fineAmount,
    bonusAmount,
    note: isOutside ? 'Absen luar kantor, menunggu tinjauan liveness.' : (isLate ? 'Terlambat masuk.' : 'Tepat waktu.')
  };

  db.attendanceRecords.push(newRecord);
  writeDB(db);

  res.json({
    success: true,
    record: newRecord,
    outside: isOutside,
    message: isOutside
      ? 'Check-in berhasil diajukan (Menunggu Persetujuan Admin karena berada di luar area geofence).'
      : 'Check-in sukses! Kehadiran Anda dicatat dalam area geofence.'
  });
});

app.post('/api/attendance/check-out', (req, res) => {
  const { userId, lat, lng } = req.body;
  const db = readDB();

  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().split(' ')[0];

  const recordIdx = db.attendanceRecords.findIndex((r: any) => r.userId === userId && r.date === dateStr);
  if (recordIdx === -1) {
    return res.status(400).json({ error: 'Anda belum melakukan Check-In hari ini.' });
  }

  if (db.attendanceRecords[recordIdx].checkOutTime) {
    return res.status(400).json({ error: 'Anda sudah melakukan Check-Out hari ini.' });
  }

  // Find nearest location name
  const locations = db.locations;
  let nearestLoc: any = null;
  let minDistance = Infinity;

  locations.forEach((loc: any) => {
    const dist = getDistance(lat, lng, loc.lat, loc.lng);
    if (dist < minDistance) {
      minDistance = dist;
      nearestLoc = loc;
    }
  });

  const isOutside = !nearestLoc || minDistance > nearestLoc.radiusMeter;

  // Early out check (e.g. before 05:00 PM / 17:00 is early)
  const [hours] = timeStr.split(':').map(Number);
  const isEarlyOut = hours < 17;

  // Update record
  db.attendanceRecords[recordIdx].checkOutTime = timeStr;
  db.attendanceRecords[recordIdx].checkOutLat = lat;
  db.attendanceRecords[recordIdx].checkOutLng = lng;
  db.attendanceRecords[recordIdx].checkOutLocationName = isOutside ? 'Di Luar Area Geofence' : nearestLoc.name;
  db.attendanceRecords[recordIdx].isEarlyOut = isEarlyOut;

  // Deduct early out quota if applicable
  if (isEarlyOut) {
    const user = db.users.find((u: any) => u.id === userId);
    if (user && user.leaveQuota.pulangCepat > 0) {
      user.leaveQuota.pulangCepat -= 1;
    }
  }

  writeDB(db);
  res.json({ success: true, record: db.attendanceRecords[recordIdx] });
});

// Admin approves a pending check-in (outside office)
app.post('/api/attendance/approve-pending', (req, res) => {
  const { recordId, action } = req.body; // action: 'approve' | 'reject'
  const db = readDB();

  const recordIdx = db.attendanceRecords.findIndex((r: any) => r.id === recordId);
  if (recordIdx === -1) {
    return res.status(404).json({ error: 'Catatan absensi tidak ditemukan.' });
  }

  if (action === 'approve') {
    db.attendanceRecords[recordIdx].status = 'approved';
    db.attendanceRecords[recordIdx].note = 'Absen luar kantor DISETUJUI oleh Admin/Supervisor.';
  } else {
    db.attendanceRecords[recordIdx].status = 'rejected';
    db.attendanceRecords[recordIdx].note = 'Absen luar kantor DITOLAK karena liveness tidak valid.';
  }

  writeDB(db);
  res.json({ success: true, record: db.attendanceRecords[recordIdx] });
});

app.get('/api/attendance/history', (req, res) => {
  const db = readDB();
  res.json(db.attendanceRecords);
});

// 6. Leave / Holiday Requests (Pengajuan Libur dengan Kalender)
app.get('/api/leaves', (req, res) => {
  const db = readDB();
  res.json(db.leaveRequests);
});

app.post('/api/leaves/apply', (req, res) => {
  const { userId, date, dates, notes } = req.body;
  const db = readDB();

  const user = db.users.find((u: any) => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: 'User tidak ditemukan.' });
  }

  // Support both single "date" and array "dates"
  const targetDates: string[] = Array.isArray(dates) ? dates : (date ? [date] : []);
  if (targetDates.length === 0) {
    return res.status(400).json({ error: 'Harap pilih tanggal pengajuan libur.' });
  }

  const todayStr = new Date().toISOString().split('T')[0];

  // Calculate current pending requests for quota checking
  const pendingCount = db.leaveRequests.filter(
    (l: any) => l.userId === userId && l.status === 'pending'
  ).length;

  const currentAvailableQuota = user.leaveQuota.libur - pendingCount;
  if (targetDates.length > currentAvailableQuota) {
    return res.status(400).json({ 
      error: `Jatah libur Anda tidak mencukupi. Sisa jatah (setelah dikurangi pending): ${currentAvailableQuota} hari. Anda mencoba mengajukan ${targetDates.length} hari.` 
    });
  }

  // Process all dates
  const results = [];
  let successfulSubmissions = 0;

  for (const tDate of targetDates) {
    // 1. Prevent retroactive
    if (tDate < todayStr) {
      results.push({ date: tDate, success: false, error: 'Tanggal libur yang sudah lewat tidak dapat dipilih.' });
      continue;
    }

    // 2. Check if duplicate
    const duplicate = db.leaveRequests.find(
      (l: any) => l.userId === userId && l.date === tDate && l.status !== 'rejected'
    );
    if (duplicate) {
      results.push({ date: tDate, success: false, error: 'Anda sudah mengajukan libur/cuti pada tanggal ini.' });
      continue;
    }

    // 3. Check division conflict
    const existingBookings = db.leaveRequests.filter(
      (l: any) => l.date === tDate && l.status === 'approved'
    );
    const sameDivisionConflict = existingBookings.some((booking: any) => {
      const bUser = db.users.find((u: any) => u.id === booking.userId);
      return bUser && bUser.division === user.division;
    });

    const newRequest = {
      id: 'leave_' + Math.random().toString(36).substr(2, 9),
      userId,
      username: user.username,
      division: user.division,
      date: tDate,
      status: sameDivisionConflict ? 'pending' : 'approved',
      notes: notes || ''
    };

    db.leaveRequests.push(newRequest);

    if (newRequest.status === 'approved') {
      user.leaveQuota.libur -= 1;
    }

    successfulSubmissions++;
    results.push({
      date: tDate,
      success: true,
      conflict: sameDivisionConflict,
      request: newRequest
    });
  }

  writeDB(db);

  if (successfulSubmissions === 0) {
    return res.status(400).json({ error: 'Gagal memproses tanggal yang dipilih.', details: results });
  }

  const conflicts = results.filter(r => r.success && r.conflict);
  const approved = results.filter(r => r.success && !r.conflict);

  let responseMessage = '';
  if (targetDates.length === 1) {
    const singleRes = results[0];
    if (singleRes.success) {
      if (singleRes.conflict) {
        responseMessage = `Tanggal ini sudah di-lock/dibooking oleh rekan kerja se-divisi. Pengajuan dikirim ke admin untuk ditinjau.`;
      } else {
        responseMessage = `Pengajuan libur berhasil disetujui dan dikunci.`;
      }
    } else {
      return res.status(400).json({ error: singleRes.error });
    }
  } else {
    responseMessage = `Berhasil mengajukan ${successfulSubmissions} hari libur. (${approved.length} langsung disetujui, ${conflicts.length} perlu persetujuan manual karena konflik divisi).`;
  }

  res.json({
    success: true,
    conflict: conflicts.length > 0,
    message: responseMessage,
    results
  });
});

app.post('/api/leaves/approve', (req, res) => {
  const { requestId, adminRemarks } = req.body;
  const db = readDB();

  const reqIdx = db.leaveRequests.findIndex((r: any) => r.id === requestId);
  if (reqIdx === -1) {
    return res.status(404).json({ error: 'Pengajuan tidak ditemukan.' });
  }

  const request = db.leaveRequests[reqIdx];
  request.status = 'approved';
  request.adminRemarks = adminRemarks || '';

  // Deduct quota from the user
  const user = db.users.find((u: any) => u.id === request.userId);
  if (user) {
    user.leaveQuota.libur = Math.max(0, user.leaveQuota.libur - 1);
  }

  // Automatically reject other pending leave requests for the SAME division on the SAME date
  db.leaveRequests.forEach((r: any) => {
    if (r.id !== requestId && r.date === request.date && r.division === request.division && r.status === 'pending') {
      r.status = 'rejected';
      r.adminRemarks = 'Ditolak sistem karena pengajuan lain pada divisi & tanggal sama telah disetujui.';
    }
  });

  writeDB(db);
  res.json({ success: true });
});

app.post('/api/leaves/reject', (req, res) => {
  const { requestId, adminRemarks } = req.body;
  const db = readDB();

  const reqIdx = db.leaveRequests.findIndex((r: any) => r.id === requestId);
  if (reqIdx === -1) {
    return res.status(404).json({ error: 'Pengajuan tidak ditemukan.' });
  }

  db.leaveRequests[reqIdx].status = 'rejected';
  db.leaveRequests[reqIdx].adminRemarks = adminRemarks || '';
  writeDB(db);
  res.json({ success: true });
});

// 7. Dynamic Work Locations
app.get('/api/locations', (req, res) => {
  const db = readDB();
  res.json(db.locations);
});

app.post('/api/locations/add', (req, res) => {
  const { name, lat, lng, radiusMeter } = req.body;
  const db = readDB();

  const newLoc = {
    id: 'loc_' + Math.random().toString(36).substr(2, 9),
    name,
    lat: Number(lat),
    lng: Number(lng),
    radiusMeter: Number(radiusMeter) || 100
  };

  db.locations.push(newLoc);
  writeDB(db);
  res.json({ success: true, location: newLoc });
});

app.post('/api/locations/edit', (req, res) => {
  const { id, name, lat, lng, radiusMeter } = req.body;
  const db = readDB();

  const idx = db.locations.findIndex((l: any) => l.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Lokasi tidak ditemukan.' });
  }

  db.locations[idx] = {
    id,
    name,
    lat: Number(lat),
    lng: Number(lng),
    radiusMeter: Number(radiusMeter) || 100
  };

  writeDB(db);
  res.json({ success: true, location: db.locations[idx] });
});

app.post('/api/locations/delete', (req, res) => {
  const { id } = req.body;
  const db = readDB();

  db.locations = db.locations.filter((l: any) => l.id !== id);
  writeDB(db);
  res.json({ success: true });
});

// 8. Announcements (Pengumuman)
app.get('/api/announcements', (req, res) => {
  const db = readDB();
  res.json(db.announcements);
});

app.post('/api/announcements/add', (req, res) => {
  const { title, content, startDate, endDate, createdBy } = req.body;
  const db = readDB();

  const newAnn = {
    id: 'ann_' + Math.random().toString(36).substr(2, 9),
    title,
    content,
    startDate,
    endDate,
    createdBy: createdBy || 'admin'
  };

  db.announcements.push(newAnn);
  writeDB(db);
  res.json({ success: true, announcement: newAnn });
});

app.post('/api/announcements/delete', (req, res) => {
  const { id } = req.body;
  const db = readDB();

  db.announcements = db.announcements.filter((a: any) => a.id !== id);
  writeDB(db);
  res.json({ success: true });
});

// 9. Profile Settings
app.post('/api/users/change-password', (req, res) => {
  const { userId, newPassword } = req.body;
  const db = readDB();

  const idx = db.users.findIndex((u: any) => u.id === userId);
  if (idx === -1) {
    return res.status(404).json({ error: 'User tidak ditemukan.' });
  }

  db.users[idx].password = newPassword;
  writeDB(db);
  res.json({ success: true });
});

app.post('/api/users/update-profile', (req, res) => {
  const { userId, photoUrl } = req.body;
  const db = readDB();

  const idx = db.users.findIndex((u: any) => u.id === userId);
  if (idx === -1) {
    return res.status(404).json({ error: 'User tidak ditemukan.' });
  }

  db.users[idx].photoUrl = photoUrl;
  writeDB(db);
  res.json({ success: true, user: db.users[idx] });
});

// 10. Admin Unbind Device
app.post('/api/admin/unbind-device', (req, res) => {
  const { userId } = req.body;
  const db = readDB();

  const idx = db.users.findIndex((u: any) => u.id === userId);
  if (idx === -1) {
    return res.status(404).json({ error: 'User tidak ditemukan.' });
  }

  delete db.users[idx].lastCheckInDevice;
  writeDB(db);
  res.json({ success: true, user: db.users[idx] });
});

// 11. Factory Reset (Reset ke pengaturan pabrik/awal)
app.post('/api/admin/factory-reset', (req, res) => {
  const initialData = {
    users: [
      {
        id: "u1",
        username: "admin",
        email: "admin@absensi.com",
        password: "admin",
        role: "admin",
        status: "approved",
        division: "Management",
        position: "Director",
        photoUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
        leaveQuota: { libur: 12, telat: 5, telatDarurat: 3, pulangCepat: 5 },
        lastCheckInDevice: "PC-Admin-Device",
        currentLat: -6.2088,
        currentLng: 106.8456,
        lastActiveAt: new Date().toISOString()
      },
      {
        id: "u2",
        username: "supervisor",
        email: "spv@absensi.com",
        password: "password",
        role: "supervisor",
        status: "approved",
        division: "Operations",
        position: "Supervisor Gudang",
        photoUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
        leaveQuota: { libur: 12, telat: 5, telatDarurat: 3, pulangCepat: 5 },
        lastCheckInDevice: "Android-Device-SPV",
        currentLat: -6.2349,
        currentLng: 106.9896,
        lastActiveAt: new Date().toISOString()
      },
      {
        id: "u3",
        username: "budi",
        email: "budi@absensi.com",
        password: "password",
        role: "worker",
        status: "approved",
        division: "Logistics",
        position: "Kurir Delivery",
        photoUrl: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150",
        leaveQuota: { libur: 10, telat: 4, telatDarurat: 2, pulangCepat: 3 },
        lastCheckInDevice: "Android-Budi-S21",
        currentLat: -6.2091,
        currentLng: 106.8461,
        lastActiveAt: new Date().toISOString()
      },
      {
        id: "u4",
        username: "siti",
        email: "siti@absensi.com",
        password: "password",
        role: "worker",
        status: "pending",
        division: "Operations",
        position: "Staff Gudang",
        photoUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150",
        leaveQuota: { libur: 12, telat: 5, telatDarurat: 3, pulangCepat: 5 }
      }
    ],
    attendanceRecords: [
      {
        id: "r1",
        userId: "u3",
        username: "budi",
        division: "Logistics",
        date: "2026-07-08",
        checkInTime: "07:45:12",
        checkInLat: -6.2089,
        checkInLng: 106.8458,
        checkInLocationName: "Kantor Pusat Jakarta",
        checkOutTime: "17:05:30",
        checkOutLat: -6.2088,
        checkOutLng: 106.8456,
        checkOutLocationName: "Kantor Pusat Jakarta",
        isLate: false,
        isEarlyOut: false,
        isOutsideGeofence: false,
        status: "approved",
        fineAmount: 0,
        bonusAmount: 25000,
        note: "Hadir tepat waktu di area kantor"
      },
      {
        id: "r2",
        userId: "u3",
        username: "budi",
        division: "Logistics",
        date: "2026-07-09",
        checkInTime: "08:15:44",
        checkInLat: -6.2088,
        checkInLng: 106.8456,
        checkInLocationName: "Kantor Pusat Jakarta",
        checkOutTime: "17:01:10",
        checkOutLat: -6.2088,
        checkOutLng: 106.8456,
        checkOutLocationName: "Kantor Pusat Jakarta",
        isLate: true,
        isEarlyOut: false,
        isOutsideGeofence: false,
        status: "approved",
        fineAmount: 50000,
        bonusAmount: 0,
        note: "Terlambat masuk 15 menit"
      }
    ],
    leaveRequests: [
      {
        id: "l1",
        userId: "u3",
        username: "budi",
        division: "Logistics",
        date: "2026-07-15",
        status: "approved",
        notes: "Menghadiri pernikahan keluarga"
      },
      {
        id: "l2",
        userId: "u3",
        username: "budi",
        division: "Logistics",
        date: "2026-07-20",
        status: "pending",
        notes: "Pemeriksaan kesehatan rutin"
      }
    ],
    locations: [
      {
        id: "loc1",
        name: "Kantor Pusat Jakarta",
        lat: -6.2088,
        lng: 106.8456,
        radiusMeter: 150
      },
      {
        id: "loc2",
        name: "Gudang Bekasi Timur",
        lat: -6.2349,
        lng: 106.9896,
        radiusMeter: 200
      }
    ],
    announcements: [
      {
        id: "a1",
        title: "Sosialisasi Disiplin Kerja & Aturan Absensi",
        content: "Diberitahukan kepada seluruh pekerja untuk selalu melakukan check-in tepat waktu sebelum jam 08:00 pagi. Jika berada di luar wilayah geofence kantor/gudang, harap melakukan liveness check berupa foto lokasi terkini untuk verifikasi admin.",
        startDate: "2026-07-01",
        endDate: "2026-07-31",
        createdBy: "admin"
      }
    ],
    config: {
      branding: {
        name: "AbsenPro Nusantara",
        logoUrl: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=100&h=100&fit=crop&q=80"
      },
      dendaTelat: 50000,
      bonusTepatWaktu: 25000,
      bonusDisiplinBulanan: 200000,
      divisions: [
        "Management",
        "Operations",
        "Logistics",
        "Finance",
        "Security"
      ],
      positions: [
        "Director",
        "Supervisor Gudang",
        "Kurir Delivery",
        "Staff Gudang",
        "Admin Operasional",
        "Security Guard"
      ]
    }
  };
  writeDB(initialData);
  res.json({ success: true, config: initialData.config });
});

/* ==========================================================================
   VITE DEV MIDDLEWARE AND STATIC SERVING
   ========================================================================== */

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer();
