import express from 'express';
import path from 'path';
import fs from 'fs';
import http from 'http';
import cors from 'cors';
import { Server as SocketIOServer } from 'socket.io';
import { createServer as createViteServer } from 'vite';



import { EventEmitter } from 'events';
EventEmitter.defaultMaxListeners = 50;

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

// Memory Buffer for System Logs
let unifiedSystemLogs = [];
const MAX_LOGS = 2000;

function addUnifiedLog(source, level, message) {
    const time = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const logStr = `[${time}] [${source}] [${level}] ${message}`;
    unifiedSystemLogs.unshift(logStr);
    if (unifiedSystemLogs.length > MAX_LOGS) {
        unifiedSystemLogs.pop();
    }
}

const safeStringify = (obj) => {
    try {
        return JSON.stringify(obj);
    } catch (e) {
        return '[Unserializable/Circular Object]';
    }
};

const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalConsoleInfo = console.info;

console.log = (...args) => {
    originalConsoleLog(...args);
    addUnifiedLog('SERVER', 'INFO', args.map(a => typeof a === 'object' ? safeStringify(a) : String(a)).join(' '));
};
console.error = (...args) => {
    originalConsoleError(...args);
    addUnifiedLog('SERVER', 'ERROR', args.map(a => (a instanceof Error ? a.toString() : (typeof a === 'object' ? safeStringify(a) : String(a)))).join(' '));
};
console.warn = (...args) => {
    originalConsoleWarn(...args);
    addUnifiedLog('SERVER', 'WARN', args.map(a => typeof a === 'object' ? safeStringify(a) : String(a)).join(' '));
};
console.info = (...args) => {
    originalConsoleInfo(...args);
    addUnifiedLog('SERVER', 'INFO', args.map(a => typeof a === 'object' ? safeStringify(a) : String(a)).join(' '));
};




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

// ===== ADVANCED DEVICE BINDING & ACTIVITY LOGGING SYSTEM =====

/**
 * Register or update device in registry
 * Returns: { deviceId, isNewDevice, existingUser }
 */
function registerDevice(fingerprint: string, userId: string, lat: number, lng: number) {
  const db = readDB();
  if (!db.deviceRegistry) db.deviceRegistry = [];
  if (!db.activityLogs) db.activityLogs = [];
  
  const existingDevice = db.deviceRegistry.find((d: any) => d.fingerprint === fingerprint);
  const now = new Date().toISOString();
  
  if (existingDevice) {
    // Device already registered - update last seen
    const previousUser = existingDevice.userId;
    const userChanged = previousUser !== userId;
    
    existingDevice.lastSeen = now;
    existingDevice.lastLat = lat;
    existingDevice.lastLng = lng;
    existingDevice.accessCount = (existingDevice.accessCount || 0) + 1;
    existingDevice.boundUsers = existingDevice.boundUsers || [previousUser];
    
    if (userChanged && !existingDevice.boundUsers.includes(userId)) {
      existingDevice.boundUsers.push(userId);
    }
    
    // Log device reuse from different user
    if (userChanged) {
      logActivity('DEVICE_REUSE', userId, {
        deviceFingerprint: fingerprint,
        previousUser,
        action: 'device_accessed_by_different_user'
      });
    }
    
    return { deviceId: existingDevice.id, isNewDevice: false, previousUser, userChanged };
  } else {
    // New device - register it
    const newDevice = {
      id: `dev_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      fingerprint,
      userId,
      boundUsers: [userId],
      firstSeen: now,
      lastSeen: now,
      lastLat: lat,
      lastLng: lng,
      accessCount: 1,
      approved: false, // Requires admin approval
      blocked: false,
      metadata: {
        registeredAt: now,
        registrationLat: lat,
        registrationLng: lng
      }
    };
    
    db.deviceRegistry.push(newDevice);
    logActivity('DEVICE_REGISTER', userId, {
      deviceFingerprint: fingerprint,
      action: 'new_device_registered',
      lat, lng
    });
    
    return { deviceId: newDevice.id, isNewDevice: true, previousUser: null, userChanged: false };
  }
}

/**
 * Check if device is authorized for user
 * Returns: { authorized: boolean, reason: string }
 */
function validateDeviceBinding(fingerprint: string, userId: string) {
  const db = readDB();
  if (!db.deviceRegistry) db.deviceRegistry = [];
  
  const user = db.users.find((u: any) => u.id === userId);
  if (!user) return { authorized: false, reason: 'User not found' };
  
  const device = db.deviceRegistry.find((d: any) => d.fingerprint === fingerprint);
  
  // If no device registered yet, allow first check-in
  if (!device && !user.lastCheckInDevice) {
    return { authorized: true, reason: 'First time registration allowed', isFirstTime: true };
  }
  
  // If device is blocked, reject
  if (device && device.blocked) {
    return { authorized: false, reason: 'Device is blocked by admin' };
  }
  
  // Check if user's lastCheckInDevice matches
  if (user.lastCheckInDevice) {
    if (user.lastCheckInDevice !== fingerprint) {
      return { 
        authorized: false, 
        reason: `Device mismatch. Registered: ${user.lastCheckInDevice}, Current: ${fingerprint}` 
      };
    }
  }
  
  return { authorized: true, reason: 'Device authorized' };
}

/**
 * Log all system activities
 */
function logActivity(category: string, userId: string, details: any) {
  const db = readDB();
  if (!db.activityLogs) db.activityLogs = [];
  
  const logEntry = {
    id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    category, // AUTH, CHECK_IN, CHECK_OUT, APPROVAL, QUOTA, DEVICE_*, LEAVE_*, ADMIN_*
    userId,
    details,
    severity: ['ERROR', 'DEVICE_REUSE'].includes(category) ? 'warning' : 'info'
  };
  
  db.activityLogs.unshift(logEntry);
  if (db.activityLogs.length > 5000) {
    db.activityLogs = db.activityLogs.slice(0, 5000);
  }
  
  writeDB(db);
  return logEntry;
}

/**
 * Get filtered activity logs with advanced filtering
 */
function getActivityLogs(filters: any) {
  const db = readDB();
  if (!db.activityLogs) return [];
  
  let logs = [...db.activityLogs];
  
  if (filters.category) logs = logs.filter((l: any) => l.category === filters.category);
  if (filters.userId) logs = logs.filter((l: any) => l.userId === filters.userId);
  if (filters.severity) logs = logs.filter((l: any) => l.severity === filters.severity);
  if (filters.startTime) logs = logs.filter((l: any) => new Date(l.timestamp) >= new Date(filters.startTime));
  if (filters.endTime) logs = logs.filter((l: any) => new Date(l.timestamp) <= new Date(filters.endTime));
  if (filters.limit) logs = logs.slice(0, filters.limit);
  
  return logs;
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

// Unified System Logs API
app.get('/api/admin/logs', (req, res) => {
  res.json({ success: true, logs: unifiedSystemLogs });
});

app.post('/api/admin/logs/client', express.json(), (req, res) => {
  const { logs } = req.body;
  if (Array.isArray(logs)) {
      logs.forEach(log => {
          unifiedSystemLogs.unshift(log);
      });
      if (unifiedSystemLogs.length > MAX_LOGS) {
          unifiedSystemLogs = unifiedSystemLogs.slice(0, MAX_LOGS);
      }
  }
  res.json({ success: true });
});

app.post('/api/admin/logs/clear', (req, res) => {
    unifiedSystemLogs = [];
    res.json({ success: true });
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
  try {
  const { userId, lat, lng, device, livenessPhoto, isManualCheckIn, isEmergencyLate, emergencyLateReason } = req.body;
  const db = readDB();

  const user = db.users.find((u: any) => u.id === userId);
  if (!user) {
    logActivity('CHECK_IN', userId || 'unknown', { error: 'User not found' });
    return res.status(404).json({ error: 'User tidak ditemukan.' });
  }

  // ===== ENHANCED DEVICE BINDING VALIDATION =====
  const deviceValidation = validateDeviceBinding(device, userId);
  if (!deviceValidation.authorized) {
    logActivity('CHECK_IN', userId, { 
      error: deviceValidation.reason,
      device,
      lat, lng
    });
    return res.status(400).json({
      error: deviceValidation.reason,
      requiresUnbind: true
    });
  }

  // Register device access
  const deviceReg = registerDevice(device, userId, lat, lng);
  if (deviceReg.isNewDevice) {
    logActivity('CHECK_IN', userId, { 
      message: 'New device registered',
      device,
      deviceId: deviceReg.deviceId
    });
  }

  // Update user's device binding
  user.lastCheckInDevice = device;

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

  // Track latest device info but do not hard lock
  user.lastCheckInDevice = device;

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
          fineAmount = calculateDynamicIncentives(timeStr, db.config.rules).fineAmount;
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
  } catch (err) {
    console.error("Checkin Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post('/api/attendance/check-out', (req, res) => {
  try {
  const { userId, lat, lng, device } = req.body;
  const db = readDB();

  const user = db.users.find((u: any) => u.id === userId);
  if (!user) {
    logActivity('CHECK_OUT', userId || 'unknown', { error: 'User not found' });
    return res.status(404).json({ error: 'User tidak ditemukan.' });
  }

  // ===== ENHANCED DEVICE BINDING VALIDATION FOR CHECKOUT =====
  const deviceValidation = validateDeviceBinding(device, userId);
  if (!deviceValidation.authorized) {
    logActivity('CHECK_OUT', userId, { 
      error: deviceValidation.reason,
      device,
      lat, lng
    });
    return res.status(400).json({
      error: deviceValidation.reason,
      requiresUnbind: true
    });
  }

  // Register device access
  registerDevice(device, userId, lat, lng);

  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().split(' ')[0];

  const recordIdx = db.attendanceRecords.findIndex((r: any) => r.userId === userId && r.date === dateStr);
  if (recordIdx === -1) {
    logActivity('CHECK_OUT', userId, { error: 'No check-in record found for today' });
    return res.status(400).json({ error: 'Anda belum melakukan Check-In hari ini.' });
  }

  if (db.attendanceRecords[recordIdx].checkOutTime) {
    logActivity('CHECK_OUT', userId, { error: 'Already checked out today' });
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
  } catch (err) {
    console.error("Checkout Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
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
  if (!record.isManualCheckIn && !record.isOutsideGeofence) {
    return res.status(400).json({ error: 'Hari ini Anda tidak melakukan Check-In Manual atau Check-In di luar geofence.' });
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
      record.fineAmount = calculateDynamicIncentives(record.checkInTime, db.config.rules).fineAmount;
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
    
    // Log quota deduction activity
    if (quotaDeduction !== 'none' && user) {
      logActivity('QUOTA_DEDUCTED', record.userId, {
        quotaType: quotaDeduction,
        reason: 'Approval of pending attendance',
        recordId,
        newQuota: user.leaveQuota[quotaDeduction as any],
        fineAmount: record.fineAmount
      });
    }
  } else {
    record.status = 'rejected';
    record.note = 'Absen ditolak oleh Admin/Supervisor karena liveness tidak valid atau melanggar batas geofence.';
    logActivity('ATTENDANCE_REJECTED', record.userId, {
      recordId,
      reason: record.note
    });
  }

  logActivity('ATTENDANCE_APPROVAL', record.userId, {
    recordId,
    action,
    classification,
    quotaDeduction,
    fineAmount: record.fineAmount
  });

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

// Delete user
app.delete('/api/admin/users/:id', (req, res) => {
    const db = readDB();
    const id = req.params.id;
    const userIndex = db.users.findIndex((u: any) => u.id === id);
    if (userIndex === -1) {
        return res.status(404).json({ error: 'User tidak ditemukan' });
    }
    if (db.users[userIndex].role === 'admin') {
         return res.status(400).json({ error: 'Tidak dapat menghapus admin utama' });
    }
    db.users.splice(userIndex, 1);

    // Also remove their records
    db.attendanceRecords = db.attendanceRecords.filter((r: any) => r.userId !== id);
    db.leaveRequests = db.leaveRequests.filter((l: any) => l.userId !== id);

    writeDB(db);
    res.json({ success: true });
});

// Toggle Disable
app.post('/api/admin/users/:id/toggle-disable', (req, res) => {
    const db = readDB();
    const id = req.params.id;
    const userIndex = db.users.findIndex((u: any) => u.id === id);
    if (userIndex === -1) {
        return res.status(404).json({ error: 'User tidak ditemukan' });
    }
    if (db.users[userIndex].role === 'admin') {
         return res.status(400).json({ error: 'Tidak dapat menonaktifkan admin utama' });
    }

    db.users[userIndex].disabled = !db.users[userIndex].disabled;
    writeDB(db);
    res.json({ success: true, disabled: db.users[userIndex].disabled });
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
  logActivity('ADMIN_UNBIND_DEVICE', userId, { 
    unboundBy: 'admin',
    targetUser: userId
  });
  
  writeDB(db);
  res.json({ success: true, user: db.users[idx] });
});

// ===== ADVANCED DEVICE MANAGEMENT ENDPOINTS =====

// Get all registered devices
app.get('/api/admin/devices', (req, res) => {
  const db = readDB();
  const devices = (db.deviceRegistry || []).map((d: any) => ({
    ...d,
    userName: db.users.find((u: any) => u.id === d.userId)?.username || 'Unknown',
    status: d.blocked ? 'blocked' : d.approved ? 'approved' : 'pending'
  }));
  res.json(devices);
});

// Get device details and history
app.get('/api/admin/devices/:deviceId', (req, res) => {
  const { deviceId } = req.params;
  const db = readDB();
  
  const device = (db.deviceRegistry || []).find((d: any) => d.id === deviceId);
  if (!device) return res.status(404).json({ error: 'Device not found' });
  
  const userDeviceLogs = getActivityLogs({ 
    category: 'DEVICE_*',
    limit: 100
  }).filter((l: any) => l.details?.deviceFingerprint === device.fingerprint || 
                        l.userId === device.userId);
  
  res.json({ device, logs: userDeviceLogs });
});

// Approve new device
app.post('/api/admin/devices/:deviceId/approve', (req, res) => {
  const { deviceId } = req.params;
  const db = readDB();
  
  const device = (db.deviceRegistry || []).find((d: any) => d.id === deviceId);
  if (!device) return res.status(404).json({ error: 'Device not found' });
  
  device.approved = true;
  logActivity('ADMIN_APPROVE_DEVICE', device.userId, {
    deviceId,
    fingerprint: device.fingerprint
  });
  
  writeDB(db);
  res.json({ success: true, device });
});

// Block/flag suspicious device
app.post('/api/admin/devices/:deviceId/block', (req, res) => {
  const { deviceId } = req.params;
  const { reason } = req.body;
  const db = readDB();
  
  const device = (db.deviceRegistry || []).find((d: any) => d.id === deviceId);
  if (!device) return res.status(404).json({ error: 'Device not found' });
  
  device.blocked = true;
  device.blockedReason = reason;
  device.blockedAt = new Date().toISOString();
  
  logActivity('ADMIN_BLOCK_DEVICE', device.userId, {
    deviceId,
    fingerprint: device.fingerprint,
    reason
  });
  
  writeDB(db);
  res.json({ success: true, device });
});

// ===== ADVANCED ACTIVITY LOGS ENDPOINTS =====

// Get filtered activity logs
app.get('/api/admin/activity-logs', (req, res) => {
  const { category, userId, severity, startTime, endTime, limit } = req.query;
  
  const logs = getActivityLogs({
    category: category as string,
    userId: userId as string,
    severity: severity as string,
    startTime: startTime as string,
    endTime: endTime as string,
    limit: limit ? parseInt(limit as string) : 500
  });
  
  res.json(logs);
});

// Export activity logs as JSON
app.get('/api/admin/activity-logs/export', (req, res) => {
  const db = readDB();
  const logs = db.activityLogs || [];
  
  res.setHeader('Content-Disposition', 'attachment; filename="activity-logs.json"');
  res.setHeader('Content-Type', 'application/json');
  res.json(logs);
});

// Get activity summary/statistics
app.get('/api/admin/activity-stats', (req, res) => {
  const db = readDB();
  const logs = db.activityLogs || [];
  
  const stats = {
    totalLogs: logs.length,
    byCategory: {} as any,
    byUser: {} as any,
    warnings: logs.filter((l: any) => l.severity === 'warning').length,
    lastHourCount: logs.filter((l: any) => {
      const logTime = new Date(l.timestamp).getTime();
      const oneHourAgo = Date.now() - 3600000;
      return logTime > oneHourAgo;
    }).length
  };
  
  logs.forEach((log: any) => {
    stats.byCategory[log.category] = (stats.byCategory[log.category] || 0) + 1;
    stats.byUser[log.userId] = (stats.byUser[log.userId] || 0) + 1;
  });
  
  res.json(stats);
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
