import express from 'express';
import path from 'path';
import fs from 'fs';
import http from 'http';
import cors from 'cors';
import { Server as SocketIOServer } from 'socket.io';
import { createServer as createViteServer } from 'vite';


const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

io.on('connection', (socket) => {
  // When a worker sends their live location
  socket.on('workerLocationUpdate', (data) => {
    // Broadcast this location update to all other connected clients (like admins)
    socket.broadcast.emit('radarUpdate', data);
  });
});

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
          leaveQuota: { libur: 4, telat: 2, telatDarurat: 2, pulangCepat: 3 },
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
          leaveQuota: { libur: 4, telat: 2, telatDarurat: 2, pulangCepat: 3 },
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
          leaveQuota: { libur: 4, telat: 2, telatDarurat: 2, pulangCepat: 3 },
          lastCheckInDevice: "Android-Budi-S21",
          currentLat: -6.2091,
          currentLng: 106.8461,
          lastActiveAt: new Date().toISOString()
        }
    ],
      attendanceRecords: [],
      leaveRequests: [],
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
      announcements: [],
      config: {
        branding: {
          name: "AbsenPro Nusantara",
          logoUrl: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=100&h=100&fit=crop&q=80"
        },
        dendaTelat: 50000,
      rules: [
        {"id": "r1", "name": "Bonus Tepat Waktu (Pagi)", "startTime": "00:00", "endTime": "10:00", "type": "bonus", "amount": 10000},
        {"id": "r2", "name": "Denda Telat Ringan", "startTime": "10:01", "endTime": "10:30", "type": "denda", "amount": 5000},
        {"id": "r3", "name": "Denda Telat Sedang", "startTime": "10:31", "endTime": "11:00", "type": "denda", "amount": 50000},
        {"id": "r4", "name": "Denda Telat Berat", "startTime": "11:01", "endTime": "23:59", "type": "denda", "amount": 100000},
        {"id": "r5", "name": "Lembur Jam ke-1", "startTime": "20:01", "endTime": "21:00", "type": "lembur", "amount": 20000}
      ],
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
  } else {
    try {
      const data = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
      let modified = false;
      if (data && Array.isArray(data.users)) {
        data.users.forEach((u: any) => {
          if (!u.leaveQuota || u.leaveQuota.libur !== 4 || u.leaveQuota.telat !== 2 || u.leaveQuota.telatDarurat !== 2) {
            u.leaveQuota = { libur: 4, telat: 2, telatDarurat: 2, pulangCepat: 3 };
            modified = true;
          }
        });
      }
      if (modified) {
        fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
      }
    } catch (e) {
      console.error("Failed to self-heal existing db.json file", e);
    }
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


// Helper to parse HH:MM to minutes since midnight
function timeStrToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.split(':').map(Number);
  const h = parts[0] || 0;
  const m = parts[1] || 0;
  const s = parts[2] || 0;
  return h * 60 + m + s / 60;
}

// Calculate late fine or bonus based on dynamic config rules
function calculateDynamicIncentives(timeStr: string, rules: any[]): { fineAmount: number, bonusAmount: number } {
  const checkInMinutes = timeStrToMinutes(timeStr);
  let fineAmount = 0;
  let bonusAmount = 0;

  if (rules && Array.isArray(rules) && rules.length > 0) {
    for (const rule of rules) {
      if (!rule || !rule.startTime || !rule.endTime) continue;
      const startMin = timeStrToMinutes(rule.startTime);
      const endMin = timeStrToMinutes(rule.endTime);

      if (checkInMinutes >= startMin && checkInMinutes <= endMin) {
        if (rule.type === 'denda') {
          fineAmount = Math.max(fineAmount, Number(rule.amount) || 0); // Take highest applicable fine
        } else if (rule.type === 'bonus') {
          bonusAmount += (Number(rule.amount) || 0); // Accumulate bonuses
        }
      }
    }
  } else {
    // Legacy fallback to SOP 2026 hardcoded logic if no dynamic rules
    const startMinutes = 10 * 60; // 10:00 WIB
    const diffMinutes = checkInMinutes - startMinutes;

    if (diffMinutes > 10 && diffMinutes <= 30) fineAmount = 5000;
    else if (diffMinutes > 30 && diffMinutes <= 60) fineAmount = 50000;
    else if (diffMinutes > 60) fineAmount = 100000;
    else bonusAmount = 25000; // Legacy bonusTepatWaktu
  }

  return { fineAmount, bonusAmount };
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

app.post('/api/config/rules', (req, res) => {
  const db = readDB();
  db.config.rules = req.body.rules;
  writeDB(db);
  res.json({ success: true, rules: db.config.rules });
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
      libur: 4,
      telat: 2,
      telatDarurat: 2,
      pulangCepat: 3
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
    if (user && user.disabled) {
        return res.status(403).json({ error: 'Akun dinonaktifkan (Disabled).' });
    }
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
        leaveQuota: { libur: 4, telat: 2, telatDarurat: 2, pulangCepat: 3 }
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

app.post('/api/users/delete', (req, res) => {
  const { userId } = req.body;
  const db = readDB();
  const initialLength = db.users.length;
  db.users = db.users.filter((u: any) => u.id !== userId);
  if (db.users.length < initialLength) {
    writeDB(db);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'User tidak ditemukan.' });
  }
});

app.post('/api/users/disable', (req, res) => {
  const { userId, disabled } = req.body;
  const db = readDB();
  const userIdx = db.users.findIndex((u: any) => u.id === userId);
  if (userIdx !== -1) {
    db.users[userIdx].disabled = disabled;
    writeDB(db);
    res.json({ success: true, user: db.users[userIdx] });
  } else {
    res.status(404).json({ error: 'User tidak ditemukan.' });
  }
});

app.get('/api/users/pending', (req, res) => {
  const db = readDB();
  const pendingUsers = db.users.filter((u: any) => u.status === 'pending');
  res.json(pendingUsers);
});

app.get('/api/users', (req, res) => {
  const db = readDB();
  res.json(db.users);
});

app.post('/api/users/update-quota', (req, res) => {
  const { userId, libur } = req.body;
  const db = readDB();
  const user = db.users.find((u: any) => u.id === userId);
  if (user) {
    if (libur !== undefined) user.leaveQuota.libur = libur;
    writeDB(db);
    res.json({ success: true, user });
  } else {
    res.status(404).json({ error: 'User tidak ditemukan.' });
  }
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
  const { userId, lat, lng, device, livenessPhoto, isManualCheckIn, isEmergencyLate, emergencyLateReason } = req.body;
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

  // Liveness photo constraint if outside geofence (manual check-in is usually outside geofence)
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

  // Working Hours (SOP 1 Juli 2026: Jam masuk 10:00 WIB, telat mulai 10:11 WIB)
  const [hours, minutes, seconds = 0] = timeStr.split(':').map(Number);
  const totalCheckInMinutes = hours * 60 + minutes + seconds / 60;
  // Use dynamic rules to determine base fine/bonus amounts and late status
  const { fineAmount: baseFine, bonusAmount: baseBonus } = calculateDynamicIncentives(timeStr, db.config.rules);
  const isLate = baseFine > 0 || (totalCheckInMinutes >= 10 * 60 + 11); // Fallback to 10:11 for legacy support

  let fineAmount = baseFine;
  let bonusAmount = baseBonus;
  let usedQuotaType: 'telat' | 'telatDarurat' | 'libur' | null = null;
  let note = '';

  if (isManualCheckIn) {
    note = 'Absen manual khusus darurat dimulai. Pekerja wajib sampai gudang maks 2 jam.';
  } else if (isLate) {
    // Standard Late Check-In
    let quotaProcessed = false;

    if (isEmergencyLate) {
      // Worker claims Personal Emergency Quota
      if (user.leaveQuota.telatDarurat > 0) {
        user.leaveQuota.telatDarurat -= 1;
        fineAmount = 0;
        usedQuotaType = 'telatDarurat';
        note = `Terlambat menggunakan Jatah Darurat Pribadi: ${emergencyLateReason || 'Masalah teknis/jalan'}.`;
        quotaProcessed = true;
      }
    }

    if (!quotaProcessed) {
      const currentMonthStr = dateStr.substring(0, 7);
      // Count previous late check-ins for the current month
      const monthlyLateRecords = db.attendanceRecords.filter((r: any) => 
        r.userId === userId && 
        r.date.startsWith(currentMonthStr) && 
        r.isLate && 
        !r.isManualCheckIn && 
        r.usedQuotaType !== 'telatDarurat'
      );
      const previousLateCount = monthlyLateRecords.length;

      if (previousLateCount < 2) {
        // Late #1 or #2: late quota available
        if (totalCheckInMinutes <= 13 * 60) {
          // Arrived before/at 13:00 WIB
          fineAmount = 0;
          usedQuotaType = 'telat';
          if (user.leaveQuota.telat > 0) {
            user.leaveQuota.telat -= 1;
          }
          note = `Terlambat masuk ke-${previousLateCount + 1} (Dalam jatah & tiba sebelum 13:00, Bebas Denda).`;
        } else {
          // Arrived after 13:00 WIB
          fineAmount = calculateLateFine(timeStr);
          usedQuotaType = 'telat';
          if (user.leaveQuota.telat > 0) {
            user.leaveQuota.telat -= 1;
          }
          note = `Terlambat masuk ke-${previousLateCount + 1} tiba setelah 13:00. Denda dihitung sejak 10:00.`;
        }
      } else if (previousLateCount === 2) {
        // Late #3: can be substituted with 1 leave day if available
        if (user.leaveQuota.libur > 0) {
          user.leaveQuota.libur -= 1;
          fineAmount = 0;
          usedQuotaType = 'libur';
          note = `Terlambat masuk ke-3 diganti potong jatah libur (Tanpa denda).`;
        } else {
          // No leave quota left
          note = `Terlambat masuk ke-3. Jatah libur habis untuk pengganti denda. Denda dihitung sesuai aturan dinamis.`;
        }
      } else {
        // Late #4 onwards: standard denda from 10:00
        note = `Terlambat masuk ke-${previousLateCount + 1} (Jatah jatah telat habis). Denda dihitung sesuai aturan dinamis.`;
      }
    }

    // Telat setelah jam 14.00: Wajib potong jatah libur
    if (totalCheckInMinutes > 14 * 60) {
      user.leaveQuota.libur = Math.max(0, user.leaveQuota.libur - 1);
      note += ' Wajib potong jatah libur karena telat masuk setelah jam 14:00.';
    }
  } else {
    // On-time check-in handled dynamically
    if (bonusAmount > 0) {
      note = 'Tepat waktu (Bonus didapatkan).';
    } else {
      note = 'Tepat waktu.';
    }
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
    note: isOutside && !isManualCheckIn ? 'Absen luar kantor, menunggu tinjauan liveness.' : note,
    isManualCheckIn: !!isManualCheckIn,
    manualCheckInTime: isManualCheckIn ? timeStr : null,
    arrivalTimeAtWarehouse: null,
    isConfirmedToBoss: false,
    usedQuotaType
  };

  db.attendanceRecords.push(newRecord);
  writeDB(db);

  res.json({
    success: true,
    record: newRecord,
    outside: isOutside,
    message: isManualCheckIn
      ? 'Check-In Manual Berhasil Diaktifkan! Anda memiliki waktu maksimal 2 jam untuk sampai di gudang.'
      : isOutside
        ? 'Check-in berhasil diajukan (Menunggu Persetujuan Admin karena berada di luar area geofence).'
        : `Check-in sukses! ${note}`
  });
});

app.post('/api/attendance/check-out', (req, res) => {
  const { userId, lat, lng, device } = req.body;
  const db = readDB();

  const user = db.users.find((u: any) => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: 'User tidak ditemukan.' });
  }

  // Device binding check for checkout
  if (user.lastCheckInDevice && user.lastCheckInDevice !== device) {
    return res.status(400).json({
      error: `Perangkat terdeteksi berbeda (${device}). Perangkat Anda dikunci ke '${user.lastCheckInDevice}'. Hubungi Administrator untuk melakukan UNBIND DEVICE.`
    });
  }

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

  // Jam Pulang: 20.00 WIB. Early out if hours < 20
  const [hours, minutes] = timeStr.split(':').map(Number);
  const isEarlyOut = hours < 20;

  let isEarlyOutViolation = false;
  let checkoutNote = '';

  if (isEarlyOut) {
    const currentMonthStr = dateStr.substring(0, 7);
    const previousEarlyOuts = db.attendanceRecords.filter((r: any) => 
      r.userId === userId && 
      r.date.startsWith(currentMonthStr) && 
      r.isEarlyOut
    );
    const previousEarlyOutCount = previousEarlyOuts.length;

    // SOP: Pulang cepat max jam 17:00, max 3x sebulan. Lebih dari itu potong jatah libur & bonus.
    if (hours < 17 || previousEarlyOutCount >= 3) {
      isEarlyOutViolation = true;
      if (user) {
        user.leaveQuota.libur = Math.max(0, user.leaveQuota.libur - 1);
      }
      checkoutNote = `Pulang cepat melanggar ketentuan (Pukul ${timeStr}, ke-${previousEarlyOutCount + 1} bulan ini). Bonus hari ini dibatalkan & jatah libur dipotong 1 hari.`;
      db.attendanceRecords[recordIdx].bonusAmount = 0; // Cancel on-time bonus
    } else {
      checkoutNote = `Pulang cepat dalam toleransi (Pukul ${timeStr}, ke-${previousEarlyOutCount + 1} bulan ini).`;
    }

    if (user && user.leaveQuota.pulangCepat > 0) {
      user.leaveQuota.pulangCepat -= 1;
    }
  } else {
    checkoutNote = 'Pulang kerja tepat waktu.';
  }

  // Update record
  db.attendanceRecords[recordIdx].checkOutTime = timeStr;
  db.attendanceRecords[recordIdx].checkOutLat = lat;
  db.attendanceRecords[recordIdx].checkOutLng = lng;
  db.attendanceRecords[recordIdx].checkOutLocationName = isOutside ? 'Di Luar Area Geofence' : nearestLoc.name;
  db.attendanceRecords[recordIdx].isEarlyOut = isEarlyOut;
  db.attendanceRecords[recordIdx].isEarlyOutViolation = isEarlyOutViolation;
  db.attendanceRecords[recordIdx].note = db.attendanceRecords[recordIdx].note
    ? `${db.attendanceRecords[recordIdx].note} | ${checkoutNote}`
    : checkoutNote;

  writeDB(db);
  res.json({ success: true, record: db.attendanceRecords[recordIdx] });
});

// Confirm arrival at warehouse for Manual Check-In
app.post('/api/attendance/manual-arrive', (req, res) => {
  const { userId, isConfirmedToBoss } = req.body;
  const db = readDB();

  const user = db.users.find((u: any) => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: 'User tidak ditemukan.' });
  }

  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().split(' ')[0];

  const recordIdx = db.attendanceRecords.findIndex((r: any) => r.userId === userId && r.date === dateStr);
  if (recordIdx === -1) {
    return res.status(400).json({ error: 'Anda belum melakukan Check-In hari ini.' });
  }

  const record = db.attendanceRecords[recordIdx];
  if (!record.isManualCheckIn) {
    return res.status(400).json({ error: 'Hari ini Anda tidak melakukan Check-In Manual.' });
  }

  if (record.arrivalTimeAtWarehouse) {
    return res.status(400).json({ error: 'Anda sudah melakukan konfirmasi kedatangan di gudang hari ini.' });
  }

  // Record arrival
  record.arrivalTimeAtWarehouse = timeStr;
  record.isConfirmedToBoss = !!isConfirmedToBoss;

  // Calculate delay from check-in time to arrival time
  const [ciH, ciM, ciS = 0] = record.checkInTime.split(':').map(Number);
  const checkInTotalMinutes = ciH * 60 + ciM + ciS / 60;

  const [arrH, arrM, arrS = 0] = timeStr.split(':').map(Number);
  const arrivalTotalMinutes = arrH * 60 + arrM + arrS / 60;

  const delayMinutes = arrivalTotalMinutes - checkInTotalMinutes;
  let fineAmount = 0;
  let leaveDeducted = false;

  // Limits: 2 hours (120 minutes) limit to arrive
  if (delayMinutes > 120) {
    const minutesPastL = delayMinutes - 120;
    const isAfter14 = arrivalTotalMinutes > 14 * 60; // Arriving after 14:00

    if (!isConfirmedToBoss || isAfter14) {
      // Calculate Courier manual fine scale (SOP Section 7)
      if (minutesPastL <= 30) {
        fineAmount = 30000;
      } else if (minutesPastL <= 60) {
        fineAmount = 40000;
      } else if (minutesPastL <= 90) {
        fineAmount = 50000;
      } else {
        const extraIntervals = Math.ceil((minutesPastL - 90) / 30);
        fineAmount = 50000 + extraIntervals * 10000;
      }

      // Deduct leave quota
      user.leaveQuota.libur = Math.max(0, user.leaveQuota.libur - 1);
      leaveDeducted = true;
      record.note = `Telat sampai gudang selama ${Math.round(delayMinutes)} menit tanpa konfirmasi atau tiba setelah 14:00. Denda Rp${fineAmount.toLocaleString('id-ID')} & jatah libur dipotong 1 hari.`;
    } else {
      record.note = `Terlambat sampai gudang (${Math.round(delayMinutes)} menit) tetapi ditoleransi karena telah konfirmasi ke atasan sebelum jam 14:00.`;
    }
  } else {
    record.note = `Sampai di gudang tepat waktu (${Math.round(delayMinutes)} menit setelah absen manual).`;
  }

  record.fineAmount = fineAmount;
  record.isManualViolation = leaveDeducted;

  // Update status from pending to approved since they confirmed physical arrival in the warehouse!
  record.status = 'approved';

  writeDB(db);
  res.json({ success: true, record });
});


// User cancels their own leave request
app.post('/api/leaves/cancel', (req, res) => {
  const { leaveId, userId } = req.body;
  const db = readDB();

  const leaveIndex = db.leaveRequests.findIndex((l: any) => l.id === leaveId && l.userId === userId);

  if (leaveIndex === -1) {
    return res.status(404).json({ error: 'Pengajuan libur tidak ditemukan atau Anda tidak memiliki akses.' });
  }

  const leave = db.leaveRequests[leaveIndex];

  // Calculate if it's at least 1 day before
  const leaveDate = new Date(leave.date);
  const today = new Date();

  // Reset times to midnight for accurate date comparison
  leaveDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  // Time difference in milliseconds
  const diffTime = leaveDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 1) {
    return res.status(400).json({ error: 'Libur hanya dapat dibatalkan maksimal 1 hari sebelum tanggal berlaku.' });
  }

  // Restore quota if it was already approved
  if (leave.status === 'approved') {
    const user = db.users.find((u: any) => u.id === userId);
    if (user) {
      user.leaveQuota.libur += 1;
    }
  }

  db.leaveRequests.splice(leaveIndex, 1);
  writeDB(db);

  res.json({ success: true, message: 'Pengajuan libur berhasil dibatalkan.' });
});

// Admin approves a pending check-in (outside office or late)

app.post('/api/attendance/approve-pending', (req, res) => {
  const {
    recordId,
    action,
    classification = 'standard',
    quotaDeduction = 'none',
    fineMode = 'auto',
    customFineValue = 0
  } = req.body; // action: 'approve' | 'reject'
  const db = readDB();

  const recordIdx = db.attendanceRecords.findIndex((r: any) => r.id === recordId);
  if (recordIdx === -1) {
    return res.status(404).json({ error: 'Catatan absensi tidak ditemukan.' });
  }

  const record = db.attendanceRecords[recordIdx];
  const user = db.users.find((u: any) => u.id === record.userId);

  if (action === 'approve') {
    record.status = 'approved';
    record.isManualCheckIn = (classification === 'manual');
    if (classification === 'manual') {
      record.manualCheckInTime = record.checkInTime;
    }

    // Deduct selected quota from user
    record.usedQuotaType = (quotaDeduction === 'none' ? null : quotaDeduction);
    if (user) {
      if (quotaDeduction === 'telat') {
        user.leaveQuota.telat = Math.max(0, user.leaveQuota.telat - 1);
      } else if (quotaDeduction === 'telatDarurat') {
        user.leaveQuota.telatDarurat = Math.max(0, user.leaveQuota.telatDarurat - 1);
      } else if (quotaDeduction === 'libur') {
        user.leaveQuota.libur = Math.max(0, user.leaveQuota.libur - 1);
      }
    }

    // Fine management
    if (fineMode === 'free') {
      record.fineAmount = 0;
    } else if (fineMode === 'custom') {
      record.fineAmount = Number(customFineValue || 0);
    } else {
      // 'auto' calculation
      record.fineAmount = calculateLateFine(record.checkInTime);
    }

    // Construct a detailed log/note
    const classificationNames: Record<string, string> = {
      standard: 'Absen Biasa',
      manual: 'Absen Manual / Tugas Luar',
      emergency: 'Absen Darurat Pribadi'
    };
    const quotaNames: Record<string, string> = {
      none: 'Tanpa Potong Jatah (Dispensasi)',
      telat: 'Potong Jatah Telat',
      telatDarurat: 'Potong Jatah Telat Darurat',
      libur: 'Potong Jatah Libur'
    };

    record.note = `Absen DISETUJUI oleh Admin/Supervisor. [Klasifikasi: ${classificationNames[classification] || classification}] [Sanksi: Rp ${record.fineAmount.toLocaleString('id-ID')}] [Jatah: ${quotaNames[quotaDeduction] || quotaDeduction}].`;
  } else {
    record.status = 'rejected';
    record.note = 'Absen ditolak oleh Admin/Supervisor karena liveness tidak valid atau melanggar batas geofence.';
  }

  writeDB(db);
  res.json({ success: true, record });
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
        leaveQuota: { libur: 4, telat: 2, telatDarurat: 2, pulangCepat: 3 },
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
        leaveQuota: { libur: 4, telat: 2, telatDarurat: 2, pulangCepat: 3 },
        lastCheckInDevice: "Android-Device-SPV",
        currentLat: -6.2349,
        currentLng: 106.9896,
        lastActiveAt: new Date().toISOString(),
        disabled: true
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
        leaveQuota: { libur: 4, telat: 2, telatDarurat: 2, pulangCepat: 3 },
        lastCheckInDevice: "Android-Budi-S21",
        currentLat: -6.2091,
        currentLng: 106.8461,
        lastActiveAt: new Date().toISOString(),
        disabled: true
      }
    ],
    attendanceRecords: [],
    leaveRequests: [],
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
    announcements: [],
    config: {
      branding: {
        name: "AbsenPro Nusantara",
        logoUrl: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=100&h=100&fit=crop&q=80"
      },
      dendaTelat: 50000,
      rules: [
        {"id": "r1", "name": "Bonus Tepat Waktu (Pagi)", "startTime": "00:00", "endTime": "10:00", "type": "bonus", "amount": 10000},
        {"id": "r2", "name": "Denda Telat Ringan", "startTime": "10:01", "endTime": "10:30", "type": "denda", "amount": 5000},
        {"id": "r3", "name": "Denda Telat Sedang", "startTime": "10:31", "endTime": "11:00", "type": "denda", "amount": 50000},
        {"id": "r4", "name": "Denda Telat Berat", "startTime": "11:01", "endTime": "23:59", "type": "denda", "amount": 100000},
        {"id": "r5", "name": "Lembur Jam ke-1", "startTime": "20:01", "endTime": "21:00", "type": "lembur", "amount": 20000}
      ],
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

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer();
