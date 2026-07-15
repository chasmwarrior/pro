import React, { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';





import {
  Clock, User as UserIcon, Calendar as CalendarIcon, MapPin, Users, LogOut, Settings,
  CheckCircle2, AlertTriangle, Camera, ShieldAlert, FileText, RefreshCw, Bell, Plus,
  Trash2, Unlock, Globe, Building2, Upload, Lock, ShieldCheck, CreditCard, ChevronRight, ChevronLeft,
  Filter, Eye, HelpCircle, Activity, Landmark, Compass, Download, X, Palette, History, TrendingUp,
  Menu, ClipboardList, Megaphone, Map, Terminal
} from 'lucide-react';
import { User, AttendanceRecord, LeaveRequest, OfficeLocation, Announcement, AppConfig } from './types';
import MapView from './components/MapView';
import CalendarView from './components/CalendarView';
import ReportExport from './components/ReportExport';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

// API Helper for Capacitor
const getApiBaseUrl = () => {
  // Use ts-ignore to bypass Vite specific types in standard TS config
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL) {
    // @ts-ignore
    return import.meta.env.VITE_API_BASE_URL;
  }
  // If we are in Capacitor and loading natively, use the live domain
  // @ts-ignore
  if (window?.Capacitor?.isNativePlatform?.() || window.location.protocol === 'capacitor:' || window.location.protocol === 'file:') {
    return 'https://warriorcarl.my.id';
  }
  // Default to relative (for standard web)
  return '';
};
const apiBaseUrl = getApiBaseUrl();

// Wrap fetch to automatically prepend the base URL for /api routes
const originalFetch = window.fetch;
window.fetch = async (...args) => {
  if (typeof args[0] === 'string' && args[0].startsWith('/api')) {
    args[0] = apiBaseUrl + args[0];
  }
  return originalFetch(...args);
};


export default function App() {
  // 1. App State
  const [currentUser, _setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('currentUser');
    if (saved) {
      try { return JSON.parse(saved); } catch(e) {}
    }
    return null;
  });
  const setCurrentUser = (user: User | null | ((prev: User | null) => User | null)) => {
    _setCurrentUser((prev: User | null) => {
        const nextUser = typeof user === 'function' ? (user as any)(prev) : user;
        if (nextUser) {
           localStorage.setItem('currentUser', JSON.stringify(nextUser));
        } else {
           localStorage.removeItem('currentUser');
        }
        return nextUser;
    });
  };
  const [radarLiveUpdates, setRadarLiveUpdates] = useState<Record<string, { lat: number, lng: number }>>({});
  const [activeTab, setActiveTab] = useState<'dashboard' | 'calendar' | 'profile' | 'admin' | 'inbox' | 'history' | 'stats' | 'logs'>('dashboard');
  const [adminSubTab, setAdminSubTab] = useState<'radar' | 'approvals' | 'locations' | 'unbind' | 'announcements' | 'settings' | 'export' | 'reset' | 'users' | 'demo' | 'logs'>('radar');
  const [radarFilterDivision, setRadarFilterDivision] = useState<string>('all');
  const [radarFilterStatus, setRadarFilterStatus] = useState<string>('all');

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Custom Dialog Overlay State
  const [customDialog, setCustomDialog] = useState<{
    isOpen: boolean;
    type: 'alert' | 'confirm';
    title: string;
    message: string;
    onConfirm?: () => void;
    onCancel?: () => void;
  }>({
    isOpen: false,
    type: 'alert',
    title: '',
    message: ''
  });

  const showCustomAlert = (message: string, title = "Pemberitahuan") => {
    setCustomDialog({
      isOpen: true,
      type: 'alert',
      title,
      message,
      onConfirm: () => setCustomDialog(prev => ({ ...prev, isOpen: false }))
    });
    setTimeout(() => {
        setCustomDialog(prev => {
            if (prev.isOpen && prev.type === 'alert' && prev.message === message) return { ...prev, isOpen: false };
            return prev;
        });
    }, 3500);
  };

  const showCustomConfirm = (message: string, onConfirm: () => void, title = "Konfirmasi") => {
    setCustomDialog({
      isOpen: true,
      type: 'confirm',
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setCustomDialog(prev => ({ ...prev, isOpen: false }));
      },
      onCancel: () => {
        setCustomDialog(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // Live Permission Statuses
  const [permissionStates, setPermissionStates] = useState({
    gps: 'prompt', // 'granted' | 'denied' | 'prompt'
    camera: 'prompt', // 'granted' | 'denied' | 'prompt'
    storage: 'granted' // simulated default
  });

  // 2. Data State
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [locations, setLocations] = useState<OfficeLocation[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [pendingWorkers, setPendingWorkers] = useState<User[]>([]);
  const [allWorkers, setAllWorkers] = useState<User[]>([]);

  // 3. Clock & Server Time Synchronization
  const [serverTime, setServerTime] = useState<Date>(new Date());
  const [timeOffset, setTimeOffset] = useState<number>(0); // offset between client and server time in ms

  // 4. Geolocation & Check-In State
  const [deviceLat, setDeviceLat] = useState<number | null>(null);
  const [deviceLng, setDeviceLng] = useState<number | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [currentGeofenceStatus, setCurrentGeofenceStatus] = useState<'inside' | 'outside' | 'unknown'>('unknown');
  const [deviceFingerprint, setDeviceFingerprint] = useState('');
  const [isOutsideGeofence, setIsOutsideGeofence] = useState(false);
  const [livenessPhoto, setLivenessPhoto] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // States for SOP 1 Juli 2026 Manual Check-in and Emergency Check-in
  const [isManualCheckIn, setIsManualCheckIn] = useState(false);
  const [isEmergencyLate, setIsEmergencyLate] = useState(false);
  const [emergencyLateReason, setEmergencyLateReason] = useState('');
  const [isConfirmedToBoss, setIsConfirmedToBoss] = useState(false);
  const [isSubmittingManualArrive, setIsSubmittingManualArrive] = useState(false);

  // Admin approval forms state for customizing each record
  const [approvalForms, setApprovalForms] = useState<Record<string, {
    classification: 'standard' | 'manual' | 'emergency';
    quotaDeduction: 'none' | 'telat' | 'telatDarurat' | 'libur';
    fineMode: 'auto' | 'free' | 'custom';
    customFineValue: number;
  }>>({});

  const getApprovalForm = (recordId: string) => {
    return approvalForms[recordId] || {
      classification: 'standard',
      quotaDeduction: 'none',
      fineMode: 'auto',
      customFineValue: 0
    };
  };

  const updateApprovalForm = (recordId: string, fields: Partial<typeof approvalForms[string]>) => {
    setApprovalForms(prev => ({
      ...prev,
      [recordId]: {
        ...getApprovalForm(recordId),
        ...fields
      }
    }));
  };

  // Auth Forms
  const [isLogin, setIsLogin] = useState(true);
  // Modal state remains for potential future use or manual triggering but we remove the auto-popup
  const [showPermissionPromptModal, setShowPermissionPromptModal] = useState(false);
  const [showCheckInMapModal, setShowCheckInMapModal] = useState(false);
  const [mapModalAction, setMapModalAction] = useState<'checkin' | 'checkout' | null>(null);
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type: 'success' | 'error' | 'info' | 'warning'; persistent?: boolean }>>([]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'success', persistent: boolean = false) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message, type, persistent }]);
    
    // Auto-dismiss after 4 seconds only if not persistent
    if (!persistent) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 4000);
    }
  };
  
  const dismissToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };
  const [authCredential, setAuthCredential] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authRegUsername, setAuthRegUsername] = useState('');
  const [authRegEmail, setAuthRegEmail] = useState('');
  const [authRegPassword, setAuthRegPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [regSuccess, setRegSuccess] = useState(false);
  const [pendingApprovalUser, setPendingApprovalUser] = useState<User | null>(null);

  // Profile Settings
  const [profileNewPassword, setProfileNewPassword] = useState('');
  const [profilePhotoUrl, setProfilePhotoUrl] = useState('');
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Admin Editors Form State
  const [newLocationName, setNewLocationName] = useState('');
  const [newLocationLat, setNewLocationLat] = useState('');
  const [newLocationLng, setNewLocationLng] = useState('');
  const [newLocationRadius, setNewLocationRadius] = useState('150');
  const [editingLocationId, setEditingLocationId] = useState<string | null>(null);

  const [newAnnTitle, setNewAnnTitle] = useState('');
  const [newAnnContent, setNewAnnContent] = useState('');
  const [newAnnStartDate, setNewAnnStartDate] = useState('');
  const [newAnnEndDate, setNewAnnEndDate] = useState('');

  const [settingsDenda, setSettingsDenda] = useState('');
  const [settingsBonusTepat, setSettingsBonusTepat] = useState('');
  const [settingsBonusDisiplin, setSettingsBonusDisiplin] = useState('');
  const [settingsAppName, setSettingsAppName] = useState('');
  const [settingsAppLogo, setSettingsAppLogo] = useState('');
  const [settingsLemburHour1, setSettingsLemburHour1] = useState('20000');
  const [settingsLemburHour2Onwards, setSettingsLemburHour2Onwards] = useState('30000');

  const [approvalUserForm, setApprovalUserForm] = useState<{
    userId: string;
    role: 'worker' | 'supervisor';
    division: string;
    position: string;
    locationId: string;
  } | null>(null);

  const [selectedPendingWorkerIds, setSelectedPendingWorkerIds] = useState<string[]>([]);
  const [selectedPendingAttendanceIds, setSelectedPendingAttendanceIds] = useState<string[]>([]);
  const [isBulkApprovingWorkers, setIsBulkApprovingWorkers] = useState(false);
  const [isBulkApprovingAttendance, setIsBulkApprovingAttendance] = useState(false);
  const [leaveRemarks, setLeaveRemarks] = useState<Record<string, string>>({});
  const [isAutoRefreshRadar, setIsAutoRefreshRadar] = useState<boolean>(true);
  const [radarRefreshInterval, setRadarRefreshInterval] = useState<number>(30000);
  const [isAnnouncementDismissed, setIsAnnouncementDismissed] = useState<boolean>(false);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [isDebugMode, setIsDebugMode] = useState<boolean>(false);

  // Ref-based log capture to prevent infinite loops
  const logsRef = useRef<string[]>([]);
  useEffect(() => {
    if (!isDebugMode) return;

    // Clear old logs when activated
    logsRef.current = [];
    setDebugLogs([]);

    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;

    const originalDebug = console.debug;
    const originalInfo = console.info;

    const addLog = (level: string, ...args: any[]) => {
      try {
        const msg = args.map(a => {
            if (a instanceof Error) return a.toString();
            if (typeof a === 'object') {
                try { return JSON.stringify(a); } catch(e) { return '[Unserializable Object]'; }
            }
            return String(a);
        }).join(' ');
        const time = new Date().toLocaleTimeString();
        logsRef.current = [`[${time}] [${level}] ${msg}`, ...logsRef.current].slice(0, 50);
        // We only trigger state updates on explicit user interaction or interval, not synchronously
      } catch(e) {}
    };

    console.log = (...args) => { originalLog(...args); addLog('LOG', ...args); };
    console.error = (...args) => { originalError(...args); addLog('ERROR', ...args); };
    console.warn = (...args) => { originalWarn(...args); addLog('WARN', ...args); };
    console.debug = (...args) => { originalDebug(...args); addLog('DEBUG', ...args); };
    console.info = (...args) => { originalInfo(...args); addLog('INFO', ...args); };

    // Update the visual logs state fast (only if we aren't looking at the unified server logs tab)
    const interval = setInterval(() => {
        setDebugLogs(prev => {
           // Hack to access current state context within the interval
           const isViewingServerLogs = window.location.hash === '#admin-logs';
           if (!isViewingServerLogs) {
              return [...logsRef.current];
           }
           return prev;
        });
    }, 500);

    return () => {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
      console.debug = originalDebug;
      console.info = originalInfo;
      clearInterval(interval);
    };
  }, [isDebugMode]);
  const [theme, setTheme] = useState<'blue' | 'emerald' | 'dark' | 'rose'>(() => {
    return (localStorage.getItem('app-theme') as 'blue' | 'emerald' | 'dark' | 'rose') || 'blue';
  });

  // Apply theme dynamically using root CSS variables overriding Tailwind classes
  useEffect(() => {
    localStorage.setItem('app-theme', theme);
    const root = document.documentElement;
    if (theme === 'emerald') {
      root.style.setProperty('--color-blue-50', '#f0fdf4');
      root.style.setProperty('--color-blue-100', '#dcfce7');
      root.style.setProperty('--color-blue-200', '#bbf7d0');
      root.style.setProperty('--color-blue-500', '#10b981');
      root.style.setProperty('--color-blue-600', '#059669');
      root.style.setProperty('--color-blue-700', '#047857');
      root.style.setProperty('--color-blue-800', '#065f46');
    } else if (theme === 'rose') {
      root.style.setProperty('--color-blue-50', '#fff1f2');
      root.style.setProperty('--color-blue-100', '#ffe4e6');
      root.style.setProperty('--color-blue-200', '#fecdd3');
      root.style.setProperty('--color-blue-500', '#f43f5e');
      root.style.setProperty('--color-blue-600', '#e11d48');
      root.style.setProperty('--color-blue-700', '#be123c');
      root.style.setProperty('--color-blue-800', '#9f1239');
    } else if (theme === 'dark') {
      root.style.setProperty('--color-blue-50', '#f1f5f9');
      root.style.setProperty('--color-blue-100', '#e2e8f0');
      root.style.setProperty('--color-blue-200', '#cbd5e1');
      root.style.setProperty('--color-blue-500', '#64748b');
      root.style.setProperty('--color-blue-600', '#475569');
      root.style.setProperty('--color-blue-700', '#334155');
      root.style.setProperty('--color-blue-800', '#1e293b');
    } else {
      root.style.removeProperty('--color-blue-50');
      root.style.removeProperty('--color-blue-100');
      root.style.removeProperty('--color-blue-200');
      root.style.removeProperty('--color-blue-500');
      root.style.removeProperty('--color-blue-600');
      root.style.removeProperty('--color-blue-700');
      root.style.removeProperty('--color-blue-800');
    }
  }, [theme]);

  // Auto dismiss active announcement banner after 10 seconds
  useEffect(() => {
    if (announcements.length > 0) {
      setIsAnnouncementDismissed(false);
      const timer = setTimeout(() => {
        setIsAnnouncementDismissed(true);
      }, 10000); // 10 seconds
      return () => clearTimeout(timer);
    }
  }, [announcements]);

  // Filter for employee's history tab
  const [historyFilterStatus, setHistoryFilterStatus] = useState<'all' | 'approved' | 'pending' | 'rejected'>('all');

  // Trigger permission modal overlay at app launch if permissions are prompt
  useEffect(() => {
    const timer = setTimeout(() => {
      if (permissionStates.gps === 'prompt' || permissionStates.camera === 'prompt') {
        setShowPermissionPromptModal(true);
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [permissionStates.gps, permissionStates.camera]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // --------------------------------------------------------------------------
  // INITS & LIFECYCLE
  // --------------------------------------------------------------------------

  // Geofence status change tracker for toast notification
  useEffect(() => {
    if (activeTab === 'dashboard' && deviceLat !== null && deviceLng !== null && locations.length > 0) {
      let isInside = false;
      locations.forEach(loc => {
        const R = 6371e3;
        const dLat = ((loc.lat - deviceLat) * Math.PI) / 180;
        const dLon = ((loc.lng - deviceLng) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos((deviceLat * Math.PI) / 180) *
            Math.cos((loc.lat * Math.PI) / 180) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;
        if (distance <= loc.radiusMeter) isInside = true;
      });
      
      const newStatus = isInside ? 'inside' : 'outside';
      if (currentGeofenceStatus !== 'unknown' && currentGeofenceStatus !== newStatus) {
        if (newStatus === 'outside') {
          showToast('Anda telah keluar dari area kantor', 'error');
        } else {
          showToast('Anda telah memasuki area kantor', 'success');
        }
      }
      setCurrentGeofenceStatus(newStatus);
    }
  }, [deviceLat, deviceLng, locations, activeTab, currentGeofenceStatus]);

  useEffect(() => {
    // Initialize device fingerprint only once on app mount
    generateDeviceFingerprint();
  }, []);

  useEffect(() => {
    fetchConfig();
    fetchLocations();
    fetchAnnouncements();
    syncServerTime();

    // Constant synchronized clock ticker
    const interval = setInterval(() => {
      setServerTime(new Date(Date.now() + timeOffset));
    }, 1000);

    return () => clearInterval(interval);
  }, [timeOffset]);

  useEffect(() => {
    if (currentUser) {
      fetchAttendanceHistory();
      fetchLeaveRequests();
      if (currentUser.role === 'admin' || currentUser.role === 'supervisor') {
        fetchPendingWorkers();
        fetchAllWorkers();
      }
    }
  }, [currentUser]);


  // Broadcast location if worker is actively checked in
  useEffect(() => {
    if (!currentUser || currentUser.role === 'admin' || currentUser.role === 'supervisor') return;

    // Check if worker is active
    const todayDateStr = new Date().toLocaleDateString('en-CA');
    const record = attendanceRecords.find(r => r.userId === currentUser.id && r.date === todayDateStr);

    // Only track if they checked in, but have not checked out
    if (record && !record.checkOutTime) {
      const socket = io(apiBaseUrl || window.location.origin);
      socket.emit('authenticate', { userId: currentUser.id });

      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          socket.emit('workerLocationUpdate', {
            userId: currentUser.id,
            lat: latitude,
            lng: longitude
          });
        },
        (err) => console.error("Socket GPS Error:", err),
        { enableHighAccuracy: true, maximumAge: 0 }
      );

      return () => {
        navigator.geolocation.clearWatch(watchId);
        socket.disconnect();
      };
    }
  }, [currentUser, attendanceRecords]);

  // Admin Radar Socket Listener
  useEffect(() => {
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'supervisor')) return;
    if (adminSubTab !== 'radar') return;

    const socket = io(apiBaseUrl || window.location.origin);
    socket.emit('authenticate', { userId: currentUser.id });
    socket.on('radarUpdate', (data: { userId: string, lat: number, lng: number }) => {
      setRadarLiveUpdates(prev => ({
        ...prev,
        [data.userId]: { lat: data.lat, lng: data.lng }
      }));
    });

    return () => {
      socket.disconnect();
    };
  }, [currentUser, adminSubTab]);

  // Periodic automatic refresh of worker locations
  useEffect(() => {
    if (adminSubTab !== 'radar' || !isAutoRefreshRadar) return;

    const interval = setInterval(() => {
      fetchAllWorkers();
    }, radarRefreshInterval);

    return () => clearInterval(interval);
  }, [adminSubTab, isAutoRefreshRadar, radarRefreshInterval]);

  useEffect(() => {
    if (activeTab === 'admin' && adminSubTab === 'logs') {
        fetchAdminLogs();
        const interval = setInterval(fetchAdminLogs, 2000);
        return () => clearInterval(interval);
    }
  }, [activeTab, adminSubTab]);

  // Track coordinates in background and manage global events
  useEffect(() => {
    trackDeviceLocation();

    // Query initial permission statuses if browser supports it
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'geolocation' as PermissionName }).then((status) => {
        setPermissionStates(prev => ({ ...prev, gps: status.state }));
        status.onchange = () => {
          setPermissionStates(prev => ({ ...prev, gps: status.state }));
        };
      }).catch(() => {});

      navigator.permissions.query({ name: 'camera' as PermissionName }).then((status) => {
        setPermissionStates(prev => ({ ...prev, camera: status.state }));
        status.onchange = () => {
          setPermissionStates(prev => ({ ...prev, camera: status.state }));
        };
      }).catch(() => {});
    }

    // Intercept benign WebSocket / Vite HMR unhandled promise rejections
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const msg = event.reason?.message || event.reason?.toString() || '';
      if (
        msg.includes('WebSocket') || 
        msg.includes('websocket') || 
        msg.includes('vite') || 
        msg.includes('HMR')
      ) {
        event.preventDefault();
        console.log('Intercepted and prevented benign websocket/HMR rejection:', msg);
      }
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  const generateDeviceFingerprint = () => {
    let fingerprint = localStorage.getItem('device_fingerprint');
    if (!fingerprint) {
       const match = document.cookie.match(new RegExp('(^| )device_fingerprint=([^;]+)'));
       if (match) fingerprint = match[2];
    }
    if (!fingerprint) {
      // Create a super stable identifier fallback
      const randomId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      fingerprint = `DEVICE-${randomId}`;
      localStorage.setItem('device_fingerprint', fingerprint);
      document.cookie = `device_fingerprint=${fingerprint}; expires=Fri, 31 Dec 9999 23:59:59 GMT; path=/`;
    } else {
      // Force rewrite to ensure it stays pinned
      localStorage.setItem('device_fingerprint', fingerprint);
      document.cookie = `device_fingerprint=${fingerprint}; expires=Fri, 31 Dec 9999 23:59:59 GMT; path=/`;
    }
    setDeviceFingerprint(fingerprint);
  };

  const syncServerTime = async () => {
    try {
      const start = Date.now();
      const res = await fetch('/api/time');
      const data = await res.json();
      const end = Date.now();
      const latency = (end - start) / 2; // half-trip time
      const serverDate = new Date(data.serverTime);
      const offset = (serverDate.getTime() + latency) - Date.now();
      setTimeOffset(offset);
      setServerTime(new Date(Date.now() + offset));
    } catch (err) {
      console.warn("Failed to sync server time, using local device clock.");
    }
  };

  const trackDeviceLocation = (silent = false) => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        setPermissionStates(prev => ({ ...prev, gps: 'denied' }));
        resolve(false);
        return;
      }
      if (!silent) setIsLocating(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setDeviceLat(pos.coords.latitude);
          setDeviceLng(pos.coords.longitude);
          setPermissionStates(prev => ({ ...prev, gps: 'granted' }));
          if (!silent) setIsLocating(false);
          resolve(true);
        },
        (err) => {
          // Fallback to coordinates
          setDeviceLat(-6.2088);
          setDeviceLng(106.8456);
          setPermissionStates(prev => ({ ...prev, gps: 'denied' }));
          if (!silent) setIsLocating(false);
          resolve(false);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  };

  const requestGPSPermission = () => {
    if (!navigator.geolocation) {
      setPermissionStates(prev => ({ ...prev, gps: 'denied' }));
      showCustomAlert("Browser Anda tidak mendukung layanan lokasi/GPS.", "Tidak Didukung");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setDeviceLat(pos.coords.latitude);
        setDeviceLng(pos.coords.longitude);
        setPermissionStates(prev => ({ ...prev, gps: 'granted' }));
        setIsLocating(false);
        showCustomAlert("Akses lokasi (GPS) berhasil diizinkan secara penuh. Sistem sekarang dapat memvalidasi presensi geofence Anda.", "Izin GPS Aktif");
      },
      (err) => {
        setPermissionStates(prev => ({ ...prev, gps: 'denied' }));
        setIsLocating(false);
        showCustomAlert("Akses lokasi ditolak atau gagal didapatkan. Pastikan fitur lokasi perangkat Anda aktif dan izinkan akses di browser Anda.", "Izin GPS Ditolak");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const requestCameraPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      stream.getTracks().forEach(track => track.stop());
      setPermissionStates(prev => ({ ...prev, camera: 'granted' }));
      showCustomAlert("Izin kamera berhasil diberikan! Anda sekarang siap melakukan verifikasi liveness foto.", "Izin Kamera Aktif");
    } catch (err) {
      setPermissionStates(prev => ({ ...prev, camera: 'denied' }));
      showCustomAlert("Gagal mengakses kamera. Silakan periksa izin kamera pada pengaturan browser atau sistem operasi Anda.", "Izin Kamera Ditolak");
    }
  };

  // --------------------------------------------------------------------------
  // FETCHES
  // --------------------------------------------------------------------------
  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/config');
      const data = await res.json();
      setConfig(data);
      // Prefill settings form
      setSettingsDenda(data.dendaTelat.toString());
      setSettingsBonusTepat(data.bonusTepatWaktu.toString());
      setSettingsBonusDisiplin(data.bonusDisiplinBulanan.toString());
      setSettingsAppName(data.branding.name);
      setSettingsAppLogo(data.branding.logoUrl);
      setSettingsLemburHour1(data.overtimeConfig?.rateHour1?.toString() || '20000');
      setSettingsLemburHour2Onwards(data.overtimeConfig?.rateHour2Onwards?.toString() || '30000');
    } catch (e) {
      console.error(e);
    }
  };

  const fetchLocations = async () => {
    try {
      const res = await fetch('/api/locations');
      const data = await res.json();
      setLocations(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAnnouncements = async () => {
    try {
      const res = await fetch('/api/announcements');
      const data = await res.json();
      setAnnouncements(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAdminLogs = async () => {
    try {
        const res = await fetch('/api/admin/logs');
        const data = await res.json();
        if (data.success && Array.isArray(data.logs)) {
             setDebugLogs(data.logs);
        }
    } catch (e) {}
  };

  // Periodically fetch unified server logs if active
  useEffect(() => {
    if (activeTab === 'admin' && adminSubTab === 'logs') {
        window.location.hash = '#admin-logs';
        fetchAdminLogs();
        const t = setInterval(fetchAdminLogs, 2000);
        return () => clearInterval(t);
    } else {
        window.location.hash = '';
    }
  }, [activeTab, adminSubTab]);

  const fetchAttendanceHistory = async () => {
    try {
      const res = await fetch('/api/attendance/history');
      const data = await res.json();
      setAttendanceRecords(data);

      // Auto-populate SOP 2026 suggestions for pending records
      const initialForms: Record<string, {
        classification: 'standard' | 'manual' | 'emergency';
        quotaDeduction: 'none' | 'telat' | 'telatDarurat' | 'libur';
        fineMode: 'auto' | 'free' | 'custom';
        customFineValue: number;
      }> = {};

      data.forEach((rec: any) => {
        if (rec.status === 'pending') {
          const [hours, minutes, seconds = 0] = rec.checkInTime.split(':').map(Number);
          const totalMinutes = hours * 60 + minutes + seconds / 60;
          const startMinutes = 10 * 60; // 10:00 WIB
          const diffMinutes = totalMinutes - startMinutes;

          let classification: 'standard' | 'manual' | 'emergency' = 'standard';
          let quotaDeduction: 'none' | 'telat' | 'telatDarurat' | 'libur' = 'none';
          let fineMode: 'auto' | 'free' | 'custom' = 'auto';
          let customFineValue = 0;

          if (rec.isManualCheckIn) {
            classification = 'manual';
          }

          if (diffMinutes <= 10) {
            // Telat 1 - 10 menit (10:01 - 10:10 WIB): Dispensasi Rp 0
            quotaDeduction = 'none';
            fineMode = 'free';
            customFineValue = 0;
          } else if (diffMinutes > 10 && diffMinutes <= 30) {
            // Telat 11 - 30 menit (10:11 - 10:30 WIB): Denda Rp 5.000 / Kejadian
            quotaDeduction = 'telat';
            fineMode = 'custom';
            customFineValue = 5000;
          } else if (diffMinutes > 30 && diffMinutes <= 60) {
            // Telat 31 - 60 menit (10:31 - 11:00 WIB): Denda Rp 50.000 atau Potong 0.5 Libur
            // Default suggest Potong 0.5 Libur (as a quota, or Rp 50,000 fine)
            quotaDeduction = 'none';
            fineMode = 'custom';
            customFineValue = 50000;
          } else {
            // Telat > 60 menit (> 11:00 WIB): Denda Rp 100.000 atau Potong 1 Libur
            // Default suggest Rp 100,000 fine or potong libur
            quotaDeduction = 'none';
            fineMode = 'custom';
            customFineValue = 100000;
          }

          initialForms[rec.id] = {
            classification,
            quotaDeduction,
            fineMode,
            customFineValue
          };
        }
      });

      setApprovalForms(prev => ({
        ...initialForms,
        ...prev // Preserve any user inputs
      }));
    } catch (e) {
      console.error(e);
    }
  };

  const fetchLeaveRequests = async () => {
    try {
      const res = await fetch('/api/leaves');
      const data = await res.json();
      setLeaveRequests(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchPendingWorkers = async () => {
    try {
      const res = await fetch('/api/users/pending');
      const data = await res.json();
      setPendingWorkers(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAllWorkers = async () => {
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      setAllWorkers(data);
    } catch (e) {
      console.error(e);
    }
  };

  const syncCurrentUser = async () => {
    if (!currentUser) return;
    try {
        const res = await fetch('/api/users');
        const data = await res.json();
        const me = data.find((u: any) => u.id === currentUser.id);
        if (me) {
            setCurrentUser(me);
        }
    } catch(e){}
  };

  // --------------------------------------------------------------------------
  // AUTHENTICATION
  // --------------------------------------------------------------------------
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setPendingApprovalUser(null);

    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
    const payload = isLogin
      ? { credential: authCredential, password: authPassword }
      : { username: authRegUsername, email: authRegEmail, password: authRegPassword };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 403 && data.user) {
          // Awaiting approval
          setPendingApprovalUser(data.user);
        } else {
          setAuthError(data.error || 'Terjadi kesalahan otentikasi.');
        }
        return;
      }

      if (isLogin) {
        setCurrentUser(data.user);
        setProfilePhotoUrl(data.user.photoUrl);
        setAuthCredential('');
        setAuthPassword('');
      } else {
        setRegSuccess(true);
        setIsLogin(true);
        setAuthRegUsername('');
        setAuthRegEmail('');
        setAuthRegPassword('');
      }
    } catch (err) {
      setAuthError('Koneksi server gagal.');
    }
  };

  // Simulated Google Auth Workflow
  const handleGoogleAuth = async () => {
    setAuthError(null);
    setPendingApprovalUser(null);
    const mockGoogleEmails = [
      'budi.santoso@gmail.com',
      'siti.aminah@gmail.com',
      'pekerja.baru@gmail.com',
      'admin.absensi@gmail.com'
    ];
    // Ask for a mock email
    const emailInput = prompt(
      "SIMULASI GOOGLE AUTH:\nPilih atau ketik email Akun Google Anda untuk masuk:",
      mockGoogleEmails[Math.floor(Math.random() * mockGoogleEmails.length)]
    );

    if (!emailInput || !emailInput.includes('@')) {
      setAuthError('Email Google tidak valid.');
      return;
    }

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credential: emailInput,
          isGoogleAuth: true,
          googlePhoto: `https://api.dicebear.com/7.x/adventurer/svg?seed=${emailInput}`
        })
      });
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 403 && data.user) {
          setPendingApprovalUser(data.user);
        } else {
          setAuthError(data.error);
        }
        return;
      }

      setCurrentUser(data.user);
      setProfilePhotoUrl(data.user.photoUrl);
    } catch (err) {
      setAuthError('Simulasi Google Auth gagal disambungkan ke server.');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setActiveTab('dashboard');
  };

  // --------------------------------------------------------------------------
  // WEBCAM LIVENESS PHOTO
  // --------------------------------------------------------------------------
  const startCamera = async () => {
    if (permissionStates.camera === 'denied') {
        showCustomAlert("Izin kamera ditolak. Silakan izinkan di pengaturan perangkat sidebar terlebih dahulu.", "Kamera Diblokir");
        return;
    }
    setShowCamera(true);
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.warn("Failed to lock media devices, enabling fallback selfie upload simulation.");
      setCameraError("Kamera media tidak dapat diakses secara otomatis. Gunakan simulasi foto selfie otomatis.");
    }
  };

  const capturePhoto = () => {
    let photoData = null;
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 320;
      canvas.height = video.videoHeight || 240;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        photoData = canvas.toDataURL('image/jpeg');
      }
    } else {
      const simulatedSeed = Math.random().toString(36).substring(7);
      photoData = `https://api.dicebear.com/7.x/identicon/svg?seed=${simulatedSeed}`;
    }
    
    setLivenessPhoto(photoData);
    stopCamera();
    
    if (mapModalAction === 'checkin') handleCheckIn(photoData);
    if (mapModalAction === 'checkout') handleCheckOut(photoData);
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setShowCamera(false);
  };

  // --------------------------------------------------------------------------
  // WORKER ACTIONS: CHECK IN / OUT & LEAVES
  // --------------------------------------------------------------------------
  const handleCheckIn = async (photoOverride?: string | null) => {
    const finalPhoto = photoOverride !== undefined ? photoOverride : livenessPhoto;
    if (!currentUser || deviceLat === null || deviceLng === null) {
      showCustomAlert("GPS Anda belum terdeteksi. Silakan muat ulang halaman atau izinkan GPS.", "Error");
      return;
    }

    try {
      const res = await fetch('/api/attendance/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          lat: deviceLat,
          lng: deviceLng,
          device: deviceFingerprint,
          livenessPhoto: finalPhoto,
          isManualCheckIn,
          isEmergencyLate,
          emergencyLateReason
        })
      });

      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (err) {
        throw new Error("Invalid server response: " + text.substring(0, 50));
      }

      if (!res.ok) {
        if (data.outsideGeofence) {
          setIsOutsideGeofence(true);
          showCustomAlert(data.error || "Terjadi kesalahan.", "Error");
          startCamera();
        } else {
          showCustomAlert(data.error || "Terjadi kesalahan.", "Error");
        }
        return;
      }

      showCustomAlert(data.message, "Sukses");
      setLivenessPhoto(null);
      setIsOutsideGeofence(false);
      setIsManualCheckIn(false);
      setIsEmergencyLate(false);
      setEmergencyLateReason('');
      fetchAttendanceHistory();
      syncCurrentUser();
    } catch (e) {
      console.error("Proses Check-In Error:", e);
      showCustomAlert("Proses Check-In gagal. Cek logs untuk detail.", "Error");
    }
  };

  const handleCheckOut = async (photoOverride?: string | null) => {
    const finalPhoto = photoOverride !== undefined ? photoOverride : livenessPhoto;
    if (!currentUser || deviceLat === null || deviceLng === null) {
      showCustomAlert("GPS Anda belum terdeteksi.", "Error");
      return;
    }
    const currentHour = serverTime.getHours();
    let isOvertimePending = false;
    if (currentHour < 20) {
        if (!window.confirm("Peringatan: Anda akan di kenakan status pulang cepat jika checkout saat ini. Apakah Anda yakin?")) return;
    } else if (currentHour >= 20) {
        if (window.confirm("Jam kerja berakhir. Apakah Anda ingin mengajukan LEMBUR? Jika Batal, sistem mencatat pulang normal (20:00).")) isOvertimePending = true;
    }

    try {
      const res = await fetch('/api/attendance/check-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          lat: deviceLat,
          lng: deviceLng,
          isOvertimePending
        })
      });
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (err) {
        throw new Error("Invalid server response: " + text.substring(0, 50));
      }
      if (!res.ok) {
        showCustomAlert(data.error || "Terjadi kesalahan.", "Error");
        return;
      }
      showCustomAlert("Berhasil melakukan Check-Out untuk hari ini.", "Sukses");
      fetchAttendanceHistory();
      syncCurrentUser();
    } catch (e) {
      showCustomAlert("Proses Check-Out gagal.", "Error");
    }
  };

  const handleManualArrive = async () => {
    if (!currentUser) return;
    setIsSubmittingManualArrive(true);
    try {
      const res = await fetch('/api/attendance/manual-arrive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          isConfirmedToBoss
        })
      });
      const data = await res.json();
      if (!res.ok) {
        showCustomAlert(data.error || "Terjadi kesalahan.", "Error");
        return;
      }
      showCustomAlert(data.record?.note || "Kedatangan berhasil dikonfirmasi!", "Sukses");
      setIsConfirmedToBoss(false);
      fetchAttendanceHistory();
    } catch (e) {
      showCustomAlert("Gagal melakukan konfirmasi kedatangan.", "Error");
    } finally {
      setIsSubmittingManualArrive(false);
    }
  };

  const handleApplyLeave = async (dates: string[], notes: string) => {
    if (!currentUser) return { success: false, message: 'Tidak diijinkan', conflict: false };

    const res = await fetch('/api/leaves/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUser.id, dates, notes: notes || '' })
    });
    const data = await res.json();
    fetchLeaveRequests();
    
    if (res.ok) {
      // Refresh current user info so that remaining leave quotas are updated instantly in the UI
      const usersRes = await fetch('/api/users');
      if (usersRes.ok) {
        const users = await usersRes.json();
        const updatedMe = users.find((u: any) => u.id === currentUser.id);
        if (updatedMe) {
          setCurrentUser(updatedMe);
        }
      }
      if (currentUser.role === 'admin' || currentUser.role === 'supervisor') {
        fetchAllWorkers();
      }
    }
    return { success: res.ok, message: data.message || data.error || 'Gagal mengajukan libur', conflict: !!data.conflict };
  };

  const handleCancelLeave = async (leaveId: string) => {
    if (!currentUser) return { success: false, message: 'Tidak diijinkan' };

    const res = await fetch('/api/leaves/cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUser.id, leaveId })
    });
    const data = await res.json();
    fetchLeaveRequests();

    if (res.ok) {
      // Refresh current user info
      const usersRes = await fetch('/api/users');
      if (usersRes.ok) {
        const users = await usersRes.json();
        const updatedMe = users.find((u: any) => u.id === currentUser.id);
        if (updatedMe) {
          setCurrentUser(updatedMe);
        }
      }
    }
    return { success: res.ok, message: data.message || data.error || 'Gagal membatalkan libur' };
  };

  // --------------------------------------------------------------------------
  // USER PROFILE ACTIONS
  // --------------------------------------------------------------------------
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setProfileMessage(null);

    const res = await fetch('/api/users/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUser.id, newPassword: profileNewPassword })
    });

    if (res.ok) {
      setProfileMessage({ type: 'success', text: 'Password berhasil diubah.' });
      setProfileNewPassword('');
    } else {
      setProfileMessage({ type: 'error', text: 'Gagal mengubah password.' });
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setProfileMessage({ type: 'error', text: 'Ukuran file gambar maksimal 5MB.' });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setProfilePhotoUrl(reader.result);
          setProfileMessage({ type: 'success', text: 'Gambar berhasil dimuat dari perangkat. Klik "Simpan" untuk memperbarui foto profil.' });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdateProfilePhoto = async () => {
    if (!currentUser) return;
    setProfileMessage(null);

    const res = await fetch('/api/users/update-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUser.id, photoUrl: profilePhotoUrl })
    });

    if (res.ok) {
      const data = await res.json();
      setCurrentUser(data.user);
      setProfileMessage({ type: 'success', text: 'Foto profil berhasil diperbarui.' });
    } else {
      setProfileMessage({ type: 'error', text: 'Gagal memperbarui foto profil.' });
    }
  };

  // --------------------------------------------------------------------------
  // ADMIN PANEL OPERATIONS
  // --------------------------------------------------------------------------

  // Approving Workers Signup
  const handleApproveWorker = async () => {
    if (!approvalUserForm) return;

    const res = await fetch('/api/users/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(approvalUserForm)
    });

    if (res.ok) {
      showCustomAlert("Pekerja berhasil disetujui, ditempatkan, dan aktif.", "Sukses");
      setApprovalUserForm(null);
      fetchPendingWorkers();
      fetchAllWorkers();
    } else {
      showCustomAlert("Gagal menyetujui pekerja.", "Error");
    }
  };

  const handleBulkApproveWorkers = async () => {
    if (selectedPendingWorkerIds.length === 0) return;
    if (!confirm(`Apakah Anda yakin ingin menyetujui secara massal ${selectedPendingWorkerIds.length} pendaftar baru dengan konfigurasi default?`)) return;

    setIsBulkApprovingWorkers(true);
    let successCount = 0;
    
    // Default values
    const defaultRole = 'worker';
    const defaultDivision = config?.divisions[1] || config?.divisions[0] || 'Operations';
    const defaultPosition = config?.positions[3] || config?.positions[0] || 'Staff Gudang';
    const defaultLocationId = locations[0]?.id || 'loc1';

    for (const userId of selectedPendingWorkerIds) {
      try {
        const res = await fetch('/api/users/approve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            role: defaultRole,
            division: defaultDivision,
            position: defaultPosition,
            locationId: defaultLocationId
          })
        });
        if (res.ok) successCount++;
      } catch (err) {
        console.error("Gagal menyetujui user " + userId, err);
      }
    }

    showCustomAlert(`Penyetujuan Massal Selesai: ${successCount} dari ${selectedPendingWorkerIds.length} pendaftar berhasil disetujui.`, "Sukses");
    setSelectedPendingWorkerIds([]);
    setIsBulkApprovingWorkers(false);
    fetchPendingWorkers();
    fetchAllWorkers();
  };

  const handleRejectWorker = async (userId: string) => {
    if (!confirm("Apakah Anda yakin ingin menolak pendaftaran pekerja ini?")) return;

    const res = await fetch('/api/users/reject', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });

    if (res.ok) {
      showCustomAlert("Pekerja berhasil ditolak.", "Sukses");
      fetchPendingWorkers();
      fetchAllWorkers();
    }
  };

  // Approving Outside Geofence Attendance & leaves
  const handleApproveAttendance = async (
    recordId: string,
    action: 'approve' | 'reject',
    classification?: string,
    quotaDeduction?: string,
    fineMode?: string,
    customFineValue?: number
  ) => {
    const res = await fetch('/api/attendance/approve-pending', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recordId,
        action,
        classification,
        quotaDeduction,
        fineMode,
        customFineValue
      })
    });
    if (res.ok) {
      if (action === 'approve') {
        showToast("✓ Absensi berhasil disahkan! Jatah telah diperbarui.", "success", true);
      } else {
        showToast("Absensi berhasil ditolak.", "info", true);
      }
      fetchAttendanceHistory();
      fetchAllWorkers(); // Refresh quotas on admin dashboard too!
      syncCurrentUser(); // Refresh current user's quota if they are viewing
    } else {
      showToast("Gagal memproses persetujuan absensi.", "error", true);
    }
  };

  const handleBulkApproveAttendance = async () => {
    if (selectedPendingAttendanceIds.length === 0) return;
    if (!confirm(`Apakah Anda yakin ingin mengesahkan secara massal ${selectedPendingAttendanceIds.length} rekor absensi terpilih?`)) return;

    setIsBulkApprovingAttendance(true);
    let successCount = 0;

    for (const recordId of selectedPendingAttendanceIds) {
      try {
        const res = await fetch('/api/attendance/approve-pending', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ recordId, action: 'approve' })
        });
        if (res.ok) successCount++;
      } catch (err) {
        console.error("Gagal mengesahkan absensi " + recordId, err);
      }
    }

    showCustomAlert(`Persetujuan Massal Selesai: ${successCount} dari ${selectedPendingAttendanceIds.length} rekor absensi berhasil disahkan.`, "Sukses");
    setSelectedPendingAttendanceIds([]);
    setIsBulkApprovingAttendance(false);
    fetchAttendanceHistory();
    fetchAllWorkers();
    syncCurrentUser(); // Refresh current user's quota
  };

  const handleApproveLeaveRequest = async (requestId: string, approve: boolean, adminRemarks?: string) => {
    const endpoint = approve ? '/api/leaves/approve' : '/api/leaves/reject';
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId, adminRemarks })
    });
    if (res.ok) {
      fetchLeaveRequests();
      syncCurrentUser();
      fetchAllWorkers();
      setLeaveRemarks((prev) => {
        const next = { ...prev };
        delete next[requestId];
        return next;
      });
    }
  };

  // Workspace Geofence Locations (CRUD)
  const handleAddLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    const endpoint = editingLocationId ? '/api/locations/edit' : '/api/locations/add';
    const payload = editingLocationId
      ? { id: editingLocationId, name: newLocationName, lat: newLocationLat, lng: newLocationLng, radiusMeter: newLocationRadius }
      : { name: newLocationName, lat: newLocationLat, lng: newLocationLng, radiusMeter: newLocationRadius };

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      showCustomAlert(editingLocationId ? "Lokasi berhasil diubah." : "Lokasi berhasil ditambahkan.", "Sukses");
      setNewLocationName('');
      setNewLocationLat('');
      setNewLocationLng('');
      setNewLocationRadius('150');
      setEditingLocationId(null);
      fetchLocations();
    } else {
      showCustomAlert("Gagal memproses lokasi kerja.", "Error");
    }
  };

  const handleUseCurrentLocationForGeofence = () => {
    if (deviceLat !== null && deviceLng !== null) {
      setNewLocationLat(deviceLat.toString());
      setNewLocationLng(deviceLng.toString());
    } else {
      showCustomAlert("GPS belum mendeteksi lokasi saat ini.", "Error");
    }
  };

  const handleEditLocationSelect = (loc: OfficeLocation) => {
    setEditingLocationId(loc.id);
    setNewLocationName(loc.name);
    setNewLocationLat(loc.lat.toString());
    setNewLocationLng(loc.lng.toString());
    setNewLocationRadius(loc.radiusMeter.toString());
  };

  const handleDeleteLocation = async (id: string) => {
    showCustomConfirm("Hapus lokasi kerja ini dari geofence?", async () => {
      const res = await fetch('/api/locations/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      if (res.ok) {
        showCustomAlert("Lokasi berhasil dihapus.", "Sukses");
        fetchLocations();
      } else {
        showCustomAlert("Gagal menghapus lokasi.", "Gagal");
      }
    });
  };

  // announcements CRUD
  const handleAddAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/announcements/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: newAnnTitle,
        content: newAnnContent,
        startDate: newAnnStartDate,
        endDate: newAnnEndDate,
        createdBy: currentUser?.username || 'admin'
      })
    });

    if (res.ok) {
      showCustomAlert("Pengumuman berhasil disiarkan.", "Sukses");
      setNewAnnTitle('');
      setNewAnnContent('');
      setNewAnnStartDate('');
      setNewAnnEndDate('');
      fetchAnnouncements();
    }
  };

  const handleDeleteAnnouncement = (id: string) => {
    showCustomConfirm("Hapus pengumuman ini?", async () => {
      try {
        const res = await fetch('/api/announcements/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id })
        });
        if (res.ok) {
          showCustomAlert("Pengumuman berhasil dihapus.", "Sukses");
          setAnnouncements(prev => prev.filter(a => a.id !== id));
          fetchAnnouncements();
        } else {
          const err = await res.json().catch(() => ({}));
          showCustomAlert("Gagal menghapus pengumuman: " + (err.error || "Kesalahan server."), "Gagal");
        }
      } catch (e) {
        showCustomAlert("Terjadi kesalahan jaringan saat menghapus pengumuman.", "Gagal");
      }
    });
  };

  // Device unbinding
  const handleUnbindUserDevice = (userId: string) => {
    showCustomConfirm("Unbind perangkat karyawan ini agar mereka bisa check-in menggunakan perangkat baru?", async () => {
      try {
        const res = await fetch('/api/admin/unbind-device', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId })
        });
        if (res.ok) {
          showCustomAlert("Perangkat berhasil di-unbind.", "Sukses");
          fetchAllWorkers();
          if (currentUser && currentUser.id === userId) {
            setCurrentUser(prev => {
              if (!prev) return null;
              const updated = { ...prev };
              delete updated.lastCheckInDevice;
              return updated;
            });
          }
        } else {
          const err = await res.json().catch(() => ({}));
          showCustomAlert("Gagal melakukan unbind device: " + (err.error || "Kesalahan server."), "Gagal");
        }
      } catch (e) {
        showCustomAlert("Terjadi kesalahan jaringan saat melakukan unbind.", "Gagal");
      }
    });
  };

  // Dynamic Fines & Brand Configurations updates
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dendaTelat: Number(settingsDenda),
        bonusTepatWaktu: Number(settingsBonusTepat),
        bonusDisiplinBulanan: Number(settingsBonusDisiplin),
        branding: {
          name: settingsAppName,
          logoUrl: settingsAppLogo
        },
        overtimeConfig: {
          normalEndTime: "20:00:00",
          rateHour1: Number(settingsLemburHour1),
          rateHour2Onwards: Number(settingsLemburHour2Onwards)
        },
        rules: config?.rules || []
      })
    });

    if (res.ok) {
      showCustomAlert("Pengaturan platform berhasil disimpan.", "Sukses");
      fetchConfig();
    }
  };

  // Factory reset database
  const handleFactoryReset = () => {
    showCustomConfirm("PERINGATAN KRITIS:\nApakah Anda yakin ingin melakukan RESET PABRIK? Semua rekap absensi karyawan, pengajuan libur, akun pekerja baru, dan pengaturan kustom akan dihapus permanen!", async () => {
      const res = await fetch('/api/admin/factory-reset', {
        method: 'POST'
      });

      if (res.ok) {
        showCustomAlert("Platform berhasil di-reset ke data bawaan pabrik. Halaman akan dimuat ulang.", "Sukses");
        setTimeout(() => {
          handleLogout();
          window.location.reload();
        }, 1500);
      }
    }, "Peringatan Kritis");
  };

  // Helpers
  const formatIDRCurrency = (amount: number) => {
    return 'Rp ' + amount.toLocaleString('id-ID');
  };

  // Active user records & leaves filters
  const userRecords = attendanceRecords.filter(r => r.userId === currentUser?.id);
  const filteredUserRecords = userRecords.filter(r => {
    if (historyFilterStatus === 'all') return true;
    return r.status === historyFilterStatus;
  });

  const totalFinesForUser = userRecords.reduce((acc, r) => acc + (r.fineAmount || 0), 0);
  const totalBonusesForUser = userRecords.reduce((acc, r) => acc + (r.bonusAmount || 0), 0);

  const handleExportUserLogsCSV = () => {
    if (filteredUserRecords.length === 0) {
      showCustomAlert("Tidak ada log riwayat kehadiran untuk diekspor.", "Error");
      return;
    }

    const headers = [
      "Tanggal",
      "Jam Masuk",
      "Lokasi Masuk",
      "Jam Keluar",
      "Lokasi Keluar",
      "Status Geofence",
      "Denda (Rupiah)",
      "Bonus (Rupiah)",
      "Status Persetujuan",
      "Keterangan"
    ];

    const rows = filteredUserRecords.map(r => [
      r.date,
      r.checkInTime || "-",
      r.checkInLocationName || "-",
      r.checkOutTime || "-",
      r.checkOutLocationName || "-",
      r.isOutsideGeofence ? "Luar Area" : "Dalam Area",
      r.fineAmount,
      r.bonusAmount,
      r.status,
      r.note || "-"
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `riwayat_kehadiran_${currentUser?.username || 'user'}_${historyFilterStatus}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Active announcement for workers (filtered by today's date range)
  const todayDateStr = serverTime.toISOString().split('T')[0];
  const activeAnnouncements = announcements.filter(a => todayDateStr >= a.startDate && todayDateStr <= a.endDate);

  // Check today's check-in status of current user
  const todayRecord = attendanceRecords.find(r => r.userId === currentUser?.id && r.date === todayDateStr);

  // Prepare monthly KPI data for Recharts
  
  const radarWorkersWithStatus = React.useMemo(() => {
    return allWorkers.map(w => {
      let status: 'working' | 'out_of_area' | 'offline' = 'offline';
      
      const record = attendanceRecords.find(r => r.userId === w.id && r.date === todayDateStr);

      // We only allow tracking if they are actively working (checked in but not out).
      if (record && !record.checkOutTime) {
        status = 'working';

        // Map over radarLiveUpdates (Socket.io) instead of mocking check-in or static positions
        const livePos = radarLiveUpdates[w.id];
        if (livePos) {
          w.currentLat = livePos.lat;
          w.currentLng = livePos.lng;
        } else {
          // Explicitly clear location if there's no live socket data to ensure accurate tracking
          // The user explicitly requested to NOT use data from check-in.
          w.currentLat = undefined;
          w.currentLng = undefined;
        }

        if (w.currentLat && w.currentLng) {
          let isInside = false;
          locations.forEach(loc => {
            const R = 6371e3;
            const dLat = ((loc.lat - w.currentLat) * Math.PI) / 180;
            const dLon = ((loc.lng - w.currentLng) * Math.PI) / 180;
            const a =
              Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos((w.currentLat * Math.PI) / 180) *
                Math.cos((loc.lat * Math.PI) / 180) *
                Math.sin(dLon / 2) *
                Math.sin(dLon / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            const distance = R * c;
            if (distance <= loc.radiusMeter) isInside = true;
          });
          if (!isInside) status = 'out_of_area';
        } else {
           status = 'offline';
        }
      } else {
        // Not actively working, wipe location to prevent tracking out of hours
        w.currentLat = undefined;
        w.currentLng = undefined;
      }
      return { ...w, todayStatus: status };
    });
  }, [allWorkers, attendanceRecords, locations, todayDateStr, radarLiveUpdates]);

  const filteredRadarWorkers = React.useMemo(() => {
    return radarWorkersWithStatus.filter(w => {
      if (radarFilterDivision !== 'all' && w.division !== radarFilterDivision) return false;
      if (radarFilterStatus !== 'all' && w.todayStatus !== radarFilterStatus) return false;
      return true;
    });
  }, [radarWorkersWithStatus, radarFilterDivision, radarFilterStatus]);

const monthlyKPIData = React.useMemo(() => {
    const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];
    const grouped: Record<string, { month: string; present: number; late: number }> = {};
    
    userRecords.forEach((record) => {
      const parts = record.date.split('-');
      if (parts.length === 3) {
        const monthIndex = parseInt(parts[1], 10) - 1;
        const monthName = months[monthIndex] || 'Unk';
        const year = parts[0];
        const key = `${monthName} ${year}`;
        
        if (!grouped[key]) {
          grouped[key] = { month: key, present: 0, late: 0 };
        }
        
        grouped[key].present += 1;
        if (record.isLate) {
          grouped[key].late += 1;
        }
      }
    });

    const chartData = Object.values(grouped);
    if (chartData.length === 0) {
      // Return illustrative mock historical months if employee is new
      return [
        { month: 'Apr 2026', present: 18, late: 2 },
        { month: 'Mei 2026', present: 22, late: 3 },
        { month: 'Jun 2026', present: 20, late: 1 },
        { month: 'Jul 2026', present: 15, late: 2 },
      ];
    }

    return chartData.sort((a, b) => {
      const [mA, yA] = a.month.split(' ');
      const [mB, yB] = b.month.split(' ');
      const idxA = months.indexOf(mA) + parseInt(yA) * 12;
      const idxB = months.indexOf(mB) + parseInt(yB) * 12;
      return idxA - idxB;
    });
  }, [userRecords]);

  // Prepare monthly Financial Performance data for Recharts (Fines vs Bonuses)
  const monthlyFinancialData = React.useMemo(() => {
    const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];
    const grouped: Record<string, { month: string; fines: number; bonuses: number }> = {};
    
    const isPrivileged = currentUser?.role === 'admin' || currentUser?.role === 'supervisor';
    const targetRecords = isPrivileged ? attendanceRecords : userRecords;

    targetRecords.forEach((record) => {
      const parts = record.date.split('-');
      if (parts.length === 3) {
        const monthIndex = parseInt(parts[1], 10) - 1;
        const monthName = months[monthIndex] || 'Unk';
        const year = parts[0];
        const key = `${monthName} ${year}`;
        
        if (!grouped[key]) {
          grouped[key] = { month: key, fines: 0, bonuses: 0 };
        }
        
        grouped[key].fines += (record.fineAmount || 0);
        grouped[key].bonuses += (record.bonusAmount || 0);
      }
    });

    const chartData = Object.values(grouped);
    if (chartData.length === 0) {
      // Fallback/illustrative months to show impact of SOP 2026
      return [
        { month: 'Apr 2026', fines: 15000, bonuses: 50000 },
        { month: 'Mei 2026', fines: 25000, bonuses: 75000 },
        { month: 'Jun 2026', fines: 10000, bonuses: 60000 },
        { month: 'Jul 2026', fines: 35000, bonuses: 45000 },
      ];
    }

    return chartData.sort((a, b) => {
      const [mA, yA] = a.month.split(' ');
      const [mB, yB] = b.month.split(' ');
      const idxA = months.indexOf(mA) + parseInt(yA) * 12;
      const idxB = months.indexOf(mB) + parseInt(yB) * 12;
      return idxA - idxB;
    });
  }, [attendanceRecords, userRecords, currentUser]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      


      {/* --------------------------------------------------------------------------
         ANNOUNCEMENT BAR FOR WORKERS
         -------------------------------------------------------------------------- */}
      {currentUser && activeAnnouncements.length > 0 && !isAnnouncementDismissed && (
        <div className="bg-amber-50 border-b border-amber-100 px-6 py-2.5 flex items-center gap-3 animate-fade-in text-slate-700 text-xs">
          <Bell className="w-4 h-4 text-amber-600 shrink-0 animate-bounce" />
          <div className="overflow-hidden flex-1">
            <p className="font-semibold text-amber-700 inline">INFORMASI: </p>
            <span className="font-medium">
              {activeAnnouncements[0].title} — {activeAnnouncements[0].content}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono shrink-0 mr-1">Baku s/d {activeAnnouncements[0].endDate}</span>
          <button
            type="button"
            onClick={() => setIsAnnouncementDismissed(true)}
            className="p-1 hover:bg-amber-100 rounded-full text-amber-500 hover:text-amber-800 transition cursor-pointer shrink-0"
            title="Tutup Pengumuman"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* --------------------------------------------------------------------------
         AUTH MODULE (LOGIN & REGISTRATION SCREENS)
         -------------------------------------------------------------------------- */}
      {!currentUser && (
        <main className="flex-1 flex items-center justify-center p-6 bg-slate-100">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xl p-8">
            <div className="text-center mb-8">
              <div className="w-14 h-14 bg-blue-50 border border-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-3 p-2.5">
                {config?.branding.logoUrl ? (
                  <img src={config.branding.logoUrl} alt="App Logo" className="w-full h-full object-contain rounded-lg" referrerPolicy="no-referrer" />
                ) : (
                  <ShieldCheck className="w-full h-full text-blue-600" />
                )}
              </div>
              <h2 className="font-display font-bold text-2xl text-slate-900">{isLogin ? 'Masuk ke Platform' : 'Daftar Karyawan Baru'}</h2>
              <p className="text-xs text-slate-400 mt-1">
                {isLogin ? 'Masukkan kredensial Anda yang terverifikasi' : 'Seluruh pendaftar baru wajib disetujui Admin sebelum aktif'}
              </p>
            </div>

            {/* Simulated registration state message */}
            {regSuccess && (
              <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 p-4 rounded-xl text-xs mb-6 flex gap-3">
                <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
                <div>
                  <p className="font-semibold">Pendaftaran Sukses!</p>
                  <p className="mt-0.5 leading-relaxed text-slate-600">
                    Akun Anda berada dalam status **PENDING**. Silakan login untuk melihat antrean persetujuan.
                  </p>
                </div>
              </div>
            )}

            {/* Approvals waiting splash inside login view */}
            {pendingApprovalUser && (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 p-5 rounded-xl text-xs mb-6">
                <div className="flex gap-2.5 mb-2.5">
                  <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600" />
                  <p className="font-semibold text-sm">Pendaftaran Menunggu Persetujuan</p>
                </div>
                <div className="space-y-1.5 font-mono text-[11px] text-slate-600 border-t border-slate-200 pt-2.5 mb-2.5">
                  <p>👤 Username: <b className="text-slate-800">{pendingApprovalUser.username}</b></p>
                  <p>📧 Email: <b className="text-slate-800">{pendingApprovalUser.email}</b></p>
                  <p>⏳ Status: <span className="bg-amber-100 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded font-bold font-sans">PENDING VERIFIKASI</span></p>
                </div>
                <p className="text-[10px] text-slate-500 leading-normal">
                  Karyawan belum diijinkan menggunakan platform sampai Administrator atau Supervisor mengesahkan lokasi penempatan kerja, divisi, dan jabatan di tab persetujuan pendaftar.
                </p>
                <button
                  type="button"
                  onClick={() => setPendingApprovalUser(null)}
                  className="w-full mt-3.5 border border-slate-200 hover:bg-slate-50 bg-white text-slate-700 py-1.5 rounded-lg text-[11px] transition font-semibold"
                >
                  Kembali ke Formulir
                </button>
              </div>
            )}

            {/* Standard Login / Signup Forms */}
            {!pendingApprovalUser && (
              <form onSubmit={handleAuthSubmit} className="space-y-4">
                {isLogin ? (
                  <>
                    <div className="space-y-1.5">
                      <label htmlFor="auth-cred-input" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Username atau Email</label>
                      <input
                        id="auth-cred-input"
                        required
                        type="text"
                        value={authCredential}
                        onChange={(e) => setAuthCredential(e.target.value)}
                        placeholder="Ketik username / email"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-blue-500 text-slate-800 placeholder-slate-400"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="auth-pass-input" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Password</label>
                      <input
                        id="auth-pass-input"
                        required
                        type="password"
                        value={authPassword}
                        onChange={(e) => setAuthPassword(e.target.value)}
                        placeholder="Ketik password"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-blue-500 text-slate-800 placeholder-slate-400"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-1.5">
                      <label htmlFor="reg-user-input" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Username</label>
                      <input
                        id="reg-user-input"
                        required
                        type="text"
                        value={authRegUsername}
                        onChange={(e) => setAuthRegUsername(e.target.value)}
                        placeholder="budi_santoso"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-blue-500 text-slate-800 placeholder-slate-400"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="reg-email-input" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email Pribadi</label>
                      <input
                        id="reg-email-input"
                        required
                        type="email"
                        value={authRegEmail}
                        onChange={(e) => setAuthRegEmail(e.target.value)}
                        placeholder="budi@email.com"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-blue-500 text-slate-800 placeholder-slate-400"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="reg-pass-input" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Password Akun</label>
                      <input
                        id="reg-pass-input"
                        required
                        type="password"
                        value={authRegPassword}
                        onChange={(e) => setAuthRegPassword(e.target.value)}
                        placeholder="Min 6 karakter"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-blue-500 text-slate-800 placeholder-slate-400"
                      />
                    </div>
                  </>
                )}

                {authError && (
                  <div className="bg-rose-50 border border-rose-100 text-rose-700 p-3.5 rounded-xl text-[11px] leading-relaxed">
                    ⚠️ {authError}
                  </div>
                )}

                <button
                  type="submit"
                  id="btn-auth-submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs py-3 rounded-xl shadow-sm transition mt-2 cursor-pointer"
                >
                  {isLogin ? 'Masuk Sekarang' : 'Kirim Berkas Pendaftaran'}
                </button>

                {/* Divider */}
                <div className="relative my-6 text-center">
                  <div className="absolute inset-y-1/2 left-0 right-0 h-px bg-slate-200"></div>
                  <span className="relative z-10 bg-white px-3 text-[10px] text-slate-400 font-bold uppercase tracking-widest">Atau Gunakan</span>
                </div>

                {/* Google Auth simulated button */}
                <button
                  type="button"
                  onClick={handleGoogleAuth}
                  id="btn-google-auth"
                  className="w-full bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-medium text-xs py-3 rounded-xl transition flex items-center justify-center gap-2.5 cursor-pointer"
                >
                  <Globe className="w-4 h-4 text-sky-500 animate-spin" style={{ animationDuration: '12s' }} />
                  <span>{isLogin ? 'Masuk dengan Akun Google' : 'Daftar dengan Akun Google'}</span>
                </button>

                <div className="text-center pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setIsLogin(!isLogin);
                      setAuthError(null);
                      setRegSuccess(false);
                    }}
                    className="text-xs text-blue-600 hover:text-blue-700 font-semibold cursor-pointer"
                  >
                    {isLogin ? 'Belum terdaftar? Ajukan akun Karyawan Baru' : 'Sudah memiliki akun? Masuk'}
                  </button>
                </div>
              </form>
            )}

          </div>
        </main>
      )}


      {/* --------------------------------------------------------------------------
         MAIN LAYOUT (LOGGED IN USER CONSOLE)
         -------------------------------------------------------------------------- */}
      {currentUser && (
        <div className="flex-1 flex flex-col h-[calc(100vh)] overflow-hidden relative">

          {/* MOBILE TOP HEADER */}
          <header className="md:hidden flex items-center justify-between bg-slate-900 border-b border-slate-800 p-3 z-40 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg overflow-hidden bg-blue-500/10 border border-blue-500/20 flex items-center justify-center p-1 shadow-inner shrink-0">
                {config?.branding.logoUrl ? (
                  <img src={config.branding.logoUrl} alt="Logo App" className="w-full h-full object-contain rounded-md" referrerPolicy="no-referrer" />
                ) : (
                  <Landmark className="w-full h-full text-blue-500" />
                )}
              </div>
              <div>
                <h1 className="font-display font-bold text-sm text-white tracking-tight leading-tight">
                  {config?.branding.name || 'AbsenPro'}
                </h1>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(true)}
              className="p-2 text-slate-400 hover:text-white transition rounded-lg hover:bg-slate-800 focus:outline-none"
            >
              <Menu className="w-5 h-5" />
            </button>
            <button onClick={() => window.location.reload()} className="p-2 text-slate-400 hover:text-white transition rounded-lg hover:bg-slate-800 focus:outline-none ml-auto"><RefreshCw className="w-5 h-5" /></button>
          </header>

          <div className="flex-1 flex overflow-hidden relative">

          {/* MOBILE SIDEBAR BACKDROP */}
          {isMobileSidebarOpen && (
            <div
              className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm transition-opacity"
              onClick={() => setIsMobileSidebarOpen(false)}
            />
          )}

          {/* --------------------------------------------------------------------------
             LEFT NAVIGATION SIDEBAR
             -------------------------------------------------------------------------- */}
          <nav
            className={`
              fixed md:static inset-y-0 left-0 transform ${
                isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
              } md:translate-x-0 transition-transform duration-300 ease-in-out
              ${isSidebarCollapsed ? 'md:w-16' : 'md:w-64'}
              w-[280px] bg-slate-900 border-r border-slate-800 flex flex-col p-3 shrink-0 text-slate-300 z-50 overflow-y-auto shadow-2xl md:shadow-none
            `}
          >
            {/* Header info inside sidebar */}
            <div className="flex flex-col gap-4 mb-6">
               <div className="flex items-center gap-3">
                 <div className={`${isSidebarCollapsed ? 'mx-auto' : ''} w-8 h-8 rounded-lg overflow-hidden bg-blue-500/10 border border-blue-500/20 flex items-center justify-center p-1 shadow-inner shrink-0 hidden md:flex`}>
                   {config?.branding.logoUrl ? (
                     <img src={config.branding.logoUrl} alt="Logo App" className="w-full h-full object-contain rounded-md" referrerPolicy="no-referrer" />
                   ) : (
                     <Landmark className="w-full h-full text-blue-500" />
                   )}
                 </div>
                 <div className={`${isSidebarCollapsed ? 'hidden' : 'hidden md:block'} flex-1 overflow-hidden`}>
                   <h1 className="font-display font-bold text-sm text-white tracking-tight flex items-center gap-1 truncate">
                     <span>{config?.branding.name || 'AbsenPro'}</span>
                   </h1>
                   <p className="text-[9px] text-slate-400 font-mono leading-none truncate">Geofence & Liveness</p>
                 </div>

                 {/* Mobile Close Button */}
                 <button
                    type="button"
                    onClick={() => setIsMobileSidebarOpen(false)}
                    className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition md:hidden shrink-0 ml-auto"
                  >
                    <X className="w-5 h-5" />
                  </button>

                 <button
                    type="button"
                    onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                    className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition hidden md:block shrink-0 ml-auto"
                  >
                    <Menu className="w-4 h-4" />
                  </button>
               </div>

               <div className={`${isSidebarCollapsed ? 'hidden' : 'flex'} bg-slate-800/50 p-2.5 rounded-xl border border-slate-700/50 items-center gap-3`}>
                  <img
                    src={currentUser.photoUrl}
                    alt={currentUser.username}
                    className="w-10 h-10 rounded-full object-cover border-2 border-slate-600 bg-slate-800 shrink-0"
                    referrerPolicy="no-referrer"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white capitalize leading-tight truncate">{currentUser.username}</p>
                    <span className="text-[9px] font-mono text-blue-400 uppercase tracking-wide inline-block mt-1">
                      {currentUser.role}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="p-2 hover:bg-rose-500/20 rounded-full text-slate-400 hover:text-rose-400 transition cursor-pointer shrink-0"
                    title="Keluar dari Akun"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
               </div>
            </div>

            {/* Time widget removed from sidebar */}
            <div className="space-y-1.5 flex-1 overflow-y-auto custom-scrollbar">
<button
              type="button"
              onClick={() => { setActiveTab('dashboard'); setIsMobileSidebarOpen(false); }}
              title="Dashboard Kerja"
              className={`w-full ${isSidebarCollapsed ? 'justify-center px-2 py-2' : 'justify-start px-3 py-2'} rounded-lg text-xs font-semibold flex items-center gap-2.5 transition cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/10'
                  : 'hover:bg-slate-800/80 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Activity className="w-4 h-4 shrink-0" />
              <span className={isSidebarCollapsed ? 'hidden' : 'inline'}>Dashboard Kerja</span>
            </button>

            <button
              type="button"
              onClick={() => { setActiveTab('history'); setIsMobileSidebarOpen(false); }}
              title="Riwayat"
              className={`w-full ${isSidebarCollapsed ? 'justify-center px-2 py-2' : 'justify-start px-3 py-2'} rounded-lg text-xs font-semibold flex items-center gap-2.5 transition cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/10'
                  : 'hover:bg-slate-800/80 text-slate-400 hover:text-slate-200'
              }`}
            >
              <History className="w-4 h-4 shrink-0" />
              <span className={isSidebarCollapsed ? 'hidden' : 'inline'}>Riwayat</span>
            </button>

            <button
              type="button"
              onClick={() => { setActiveTab('stats'); setIsMobileSidebarOpen(false); }}
              title="Statistik"
              className={`w-full ${isSidebarCollapsed ? 'justify-center px-2 py-2' : 'justify-start px-3 py-2'} rounded-lg text-xs font-semibold flex items-center gap-2.5 transition cursor-pointer ${
                activeTab === 'stats'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/10'
                  : 'hover:bg-slate-800/80 text-slate-400 hover:text-slate-200'
              }`}
            >
              <TrendingUp className="w-4 h-4 shrink-0" />
              <span className={isSidebarCollapsed ? 'hidden' : 'inline'}>Statistik</span>
            </button>

            <button
              type="button"
              onClick={() => { setActiveTab('calendar'); setIsMobileSidebarOpen(false); }}
              title="Pengajuan Libur"
              className={`w-full ${isSidebarCollapsed ? 'justify-center px-2 py-2' : 'justify-start px-3 py-2'} rounded-lg text-xs font-semibold flex items-center gap-2.5 transition cursor-pointer ${
                activeTab === 'calendar'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/10'
                  : 'hover:bg-slate-800/80 text-slate-400 hover:text-slate-200'
              }`}
            >
              <CalendarIcon className="w-4 h-4 shrink-0" />
              <span className={isSidebarCollapsed ? 'hidden' : 'inline'}>Pengajuan Libur</span>
            </button>

            <button
              type="button"
              onClick={() => { setActiveTab('inbox'); setIsMobileSidebarOpen(false); }}
              title="Inbox Pengumuman"
              className={`w-full ${isSidebarCollapsed ? 'justify-center px-2 py-2' : 'justify-start px-3 py-2'} rounded-lg text-xs font-semibold flex items-center justify-between transition cursor-pointer ${
                activeTab === 'inbox'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/10'
                  : 'hover:bg-slate-800/80 text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Bell className="w-4 h-4 shrink-0" />
                <span className={isSidebarCollapsed ? 'hidden' : 'inline'}>Inbox Pengumuman</span>
              </div>
              {activeAnnouncements.length > 0 && (
                <span className="bg-rose-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 leading-none">
                  {activeAnnouncements.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => { setActiveTab('profile'); setIsMobileSidebarOpen(false); }}
              title="Profil & Password"
              className={`w-full ${isSidebarCollapsed ? 'justify-center px-2 py-2' : 'justify-start px-3 py-2'} rounded-lg text-xs font-semibold flex items-center gap-2.5 transition cursor-pointer ${
                activeTab === 'profile'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/10'
                  : 'hover:bg-slate-800/80 text-slate-400 hover:text-slate-200'
              }`}
            >
              <UserIcon className="w-4 h-4 shrink-0" />
              <span className={isSidebarCollapsed ? 'hidden' : 'inline'}>Profil & Password</span>
            </button>


            {/* Privileged Admin Menu options */}
            {(currentUser.role === 'admin' || currentUser.role === 'supervisor') && (
              <>
                <div className="border-t border-slate-800 my-2"></div>
                <div className={`${isSidebarCollapsed ? 'hidden' : 'block'} px-3 py-1 text-[9px] font-bold text-slate-500 uppercase tracking-widest font-mono`}>
                  Sistem Admin
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('admin');
                    setAdminSubTab('users');
                    setIsMobileSidebarOpen(false);
                  }}
                  title="Kelola Pegawai"
                  className={`w-full ${isSidebarCollapsed ? 'justify-center px-2 py-2' : 'justify-start px-3 py-2'} rounded-lg text-xs font-semibold flex items-center gap-2.5 transition cursor-pointer ${
                    activeTab === 'admin' && adminSubTab === 'users'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'hover:bg-slate-800/80 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Users className="w-4 h-4 shrink-0" />
                  <span className={isSidebarCollapsed ? 'hidden' : 'inline'}>Kelola Pegawai</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('admin');
                    setAdminSubTab('demo');
                    setIsMobileSidebarOpen(false);
                  }}
                  title="Info Akun Demo"
                  className={`w-full ${isSidebarCollapsed ? 'justify-center px-2 py-2' : 'justify-start px-3 py-2'} rounded-lg text-xs font-semibold flex items-center gap-2.5 transition cursor-pointer ${
                    activeTab === 'admin' && adminSubTab === 'demo'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'hover:bg-slate-800/80 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <HelpCircle className="w-4 h-4 shrink-0" />
                  <span className={isSidebarCollapsed ? 'hidden' : 'inline'}>Info Akun Demo</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('admin');
                    setAdminSubTab('radar');
                    setIsMobileSidebarOpen(false);
                  }}
                  title="Radar Pekerja"
                  className={`w-full ${isSidebarCollapsed ? 'justify-center px-2 py-2' : 'justify-start px-3 py-2'} rounded-lg text-xs font-semibold flex items-center gap-2.5 transition cursor-pointer ${
                    activeTab === 'admin' && adminSubTab === 'radar'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'hover:bg-slate-800/80 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Map className="w-4 h-4 shrink-0" />
                  <span className={isSidebarCollapsed ? 'hidden' : 'inline'}>Radar Pekerja</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('admin');
                    setAdminSubTab('approvals');
                    setIsMobileSidebarOpen(false);
                  }}
                  title="Persetujuan"
                  className={`w-full ${isSidebarCollapsed ? 'justify-center px-2 py-2' : 'justify-start px-3 py-2'} rounded-lg text-xs font-semibold flex items-center gap-2.5 transition cursor-pointer ${
                    activeTab === 'admin' && adminSubTab === 'approvals'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'hover:bg-slate-800/80 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span className={isSidebarCollapsed ? 'hidden' : 'inline'}>Persetujuan</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    window.location.hash = '#admin-logs';
                    setActiveTab('admin');
                    setAdminSubTab('logs');
                    setIsMobileSidebarOpen(false);
                  }}
                  title="Sistem Log"
                  className={`w-full ${isSidebarCollapsed ? 'justify-center px-2 py-2' : 'justify-start px-3 py-2'} rounded-lg text-xs font-semibold flex items-center gap-2.5 transition cursor-pointer ${
                    activeTab === 'admin' && adminSubTab === 'logs'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'hover:bg-slate-800/80 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Terminal className="w-4 h-4 shrink-0" />
                  <span className={isSidebarCollapsed ? 'hidden' : 'inline'}>Sistem Log</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('admin');
                    setAdminSubTab('export');
                    setIsMobileSidebarOpen(false);
                  }}
                  title="Laporan Absensi"
                  className={`w-full ${isSidebarCollapsed ? 'justify-center px-2 py-2' : 'justify-start px-3 py-2'} rounded-lg text-xs font-semibold flex items-center gap-2.5 transition cursor-pointer ${
                    activeTab === 'admin' && adminSubTab === 'export'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'hover:bg-slate-800/80 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <ClipboardList className="w-4 h-4 shrink-0" />
                  <span className={isSidebarCollapsed ? 'hidden' : 'inline'}>Laporan Absensi</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('admin');
                    setAdminSubTab('locations');
                    setIsMobileSidebarOpen(false);
                  }}
                  title="Kelola Geofence"
                  className={`w-full ${isSidebarCollapsed ? 'justify-center px-2 py-2' : 'justify-start px-3 py-2'} rounded-lg text-xs font-semibold flex items-center gap-2.5 transition cursor-pointer ${
                    activeTab === 'admin' && adminSubTab === 'locations'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'hover:bg-slate-800/80 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Building2 className="w-4 h-4 shrink-0" />
                  <span className={isSidebarCollapsed ? 'hidden' : 'inline'}>Kelola Geofence</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('admin');
                    setAdminSubTab('announcements');
                    setIsMobileSidebarOpen(false);
                  }}
                  title="Pengumuman"
                  className={`w-full ${isSidebarCollapsed ? 'justify-center px-2 py-2' : 'justify-start px-3 py-2'} rounded-lg text-xs font-semibold flex items-center gap-2.5 transition cursor-pointer ${
                    activeTab === 'admin' && adminSubTab === 'announcements'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'hover:bg-slate-800/80 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Megaphone className="w-4 h-4 shrink-0" />
                  <span className={isSidebarCollapsed ? 'hidden' : 'inline'}>Pengumuman</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('admin');
                    setAdminSubTab('unbind');
                    setIsMobileSidebarOpen(false);
                  }}
                  title="Unbind Perangkat"
                  className={`w-full ${isSidebarCollapsed ? 'justify-center px-2 py-2' : 'justify-start px-3 py-2'} rounded-lg text-xs font-semibold flex items-center gap-2.5 transition cursor-pointer ${
                    activeTab === 'admin' && adminSubTab === 'unbind'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'hover:bg-slate-800/80 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Unlock className="w-4 h-4 shrink-0" />
                  <span className={isSidebarCollapsed ? 'hidden' : 'inline'}>Unbind Perangkat</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('admin');
                    setAdminSubTab('settings');
                    setIsMobileSidebarOpen(false);
                  }}
                  title="Branding & Denda"
                  className={`w-full ${isSidebarCollapsed ? 'justify-center px-2 py-2' : 'justify-start px-3 py-2'} rounded-lg text-xs font-semibold flex items-center gap-2.5 transition cursor-pointer ${
                    activeTab === 'admin' && adminSubTab === 'settings'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'hover:bg-slate-800/80 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Settings className="w-4 h-4 shrink-0" />
                  <span className={isSidebarCollapsed ? 'hidden' : 'inline'}>Branding & Denda</span>
                </button>

                                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('admin');
                    setAdminSubTab('reset');
                    setIsMobileSidebarOpen(false);
                  }}
                  title="Reset Pabrik"
                  className={`w-full ${isSidebarCollapsed ? 'justify-center px-2 py-2' : 'justify-start px-3 py-2'} rounded-lg text-xs font-semibold flex items-center gap-2.5 transition cursor-pointer text-rose-500 hover:bg-rose-500/20 hover:text-rose-400 ${
                    activeTab === 'admin' && adminSubTab === 'reset'
                      ? 'bg-rose-600 text-white shadow-md hover:text-white'
                      : ''
                  }`}
                >
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span className={isSidebarCollapsed ? 'hidden' : 'inline'}>Reset Pabrik</span>
                </button>


              </>
            )}


            </div>


                {isDebugMode && (
                  <>
                    <div className="border-t border-slate-800 my-2"></div>
                    <button
                      type="button"
                      onClick={() => { setActiveTab('logs'); setIsMobileSidebarOpen(false); }}
                      title="Sistem Log"
                      className={`w-full ${isSidebarCollapsed ? 'justify-center px-2 py-2' : 'justify-start px-3 py-2'} rounded-lg text-xs font-semibold flex items-center gap-2.5 transition cursor-pointer ${
                        activeTab === 'logs'
                          ? 'bg-amber-600 text-white shadow-md shadow-amber-600/10'
                          : 'hover:bg-slate-800/80 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <FileText className="w-4 h-4 shrink-0 text-amber-500" />
                      <span className={isSidebarCollapsed ? 'hidden' : 'inline'}>Sistem Log (Debug)</span>
                    </button>
                  </>
                )}
            <div className="border-t border-slate-800 my-2"></div>
            <div className={`${isSidebarCollapsed ? 'hidden' : 'block'} px-3 py-1 text-[9px] font-bold text-slate-500 uppercase tracking-widest font-mono`}>
              Akses Perangkat
            </div>

            {/* Sidebar Toggle Permissions */}
            <div className={`${isSidebarCollapsed ? 'hidden' : 'block'} px-3 py-2 bg-slate-800/30 rounded-lg border border-slate-700/50 space-y-3`}>
              <div className="flex justify-between items-center text-[10px]">
                <div className="flex items-center gap-1.5 text-slate-300">
                  <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                  <span>GPS / Lokasi</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
    if (permissionStates.gps === 'granted') {
      setPermissionStates(prev => ({ ...prev, gps: 'denied' }));
      setDeviceLat(null);
      setDeviceLng(null);
      setCurrentGeofenceStatus('unknown');
    } else {
      requestGPSPermission();
    }
  }}
                  className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    permissionStates.gps === 'granted' ? 'bg-emerald-500' : 'bg-slate-600'
                  }`}
                >
                  <span className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    permissionStates.gps === 'granted' ? 'translate-x-3' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              <div className="flex justify-between items-center text-[10px]">
                <div className="flex items-center gap-1.5 text-slate-300">
                  <Camera className="w-3.5 h-3.5 text-blue-500" />
                  <span>Kamera</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
    if (permissionStates.camera === 'granted') {
      setPermissionStates(prev => ({ ...prev, camera: 'denied' }));
      if (videoRef.current && videoRef.current.srcObject) {
         const tracks = videoRef.current.srcObject.getTracks();
         tracks.forEach(track => track.stop());
         videoRef.current.srcObject = null;
      }
    } else {
      requestCameraPermission();
    }
  }}
                  className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    permissionStates.camera === 'granted' ? 'bg-blue-500' : 'bg-slate-600'
                  }`}
                >
                  <span className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    permissionStates.camera === 'granted' ? 'translate-x-3' : 'translate-x-0'
                  }`} />
                </button>
              </div>
            </div>
            {/* Quick user details inside sidebar */}
            <div className={`${isSidebarCollapsed ? 'hidden' : 'block'} mt-auto bg-slate-950/40 border border-slate-800/60 p-2.5 rounded-lg text-xs font-mono`}>
              <span className="text-[8px] text-slate-500 font-bold block mb-0.5">BOUND DEVICE ID:</span>
              <p className="text-slate-400 truncate text-[10px]" title={deviceFingerprint}>{deviceFingerprint}</p>
            </div>
          </nav>

          {/* --------------------------------------------------------------------------
             MAIN SCROLLABLE CONTENT CANVAS
             -------------------------------------------------------------------------- */}
          <main className="flex-1 p-4 overflow-y-auto max-w-full relative w-full">
            
            {/* =========================================================================
               TAB: WORKER DASHBOARD
               ========================================================================= */}
            {activeTab === 'dashboard' && (
              <div className="space-y-6 animate-fade-in">

                {/* Clock on Dashboard */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center gap-4 text-slate-800">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                    <Clock className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block font-mono">Waktu Sistem Server</span>
                    <p className="font-display font-bold text-2xl text-slate-900 mt-0.5 leading-tight">
                      {serverTime.toTimeString().split(' ')[0]}
                    </p>
                    <p className="text-xs text-slate-500">
                      {serverTime.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                </div>

                {/* Quota Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                    {/* QUOTA LIBUR */}
                    <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center shadow-sm">
                        <CalendarIcon className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono line-clamp-1">Sisa Libur</span>
                        <p className="font-display font-bold text-sm text-slate-800 mt-0.5">{currentUser.leaveQuota.libur} <span className="text-xs font-medium text-slate-400">/ 4</span></p>
                      </div>
                    </div>

                    {/* QUOTA TELAT */}
                    <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shadow-sm">
                        <Clock className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono line-clamp-1">Tol. Telat</span>
                        <p className="font-display font-bold text-sm text-slate-800 mt-0.5">{currentUser.leaveQuota.telat} <span className="text-xs font-medium text-slate-400">/ 2</span></p>
                      </div>
                    </div>

                    {/* TELAT DARURAT */}
                    <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center shadow-sm">
                        <AlertTriangle className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono line-clamp-1">Telat Darurat</span>
                        <p className="font-display font-bold text-sm text-slate-800 mt-0.5">{currentUser.leaveQuota.telatDarurat} <span className="text-xs font-medium text-slate-400">/ 2</span></p>
                      </div>
                    </div>

                    {/* PULANG CEPAT */}
                    <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center shadow-sm">
                        <LogOut className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono line-clamp-1">Pulang Cepat</span>
                        <p className="font-display font-bold text-sm text-slate-800 mt-0.5">{currentUser.leaveQuota.pulangCepat} <span className="text-xs font-medium text-slate-400">/ 3</span></p>
                      </div>
                    </div>
                </div>

                                {/* Geofence / Check-In Live Module */}
                <div className="flex flex-col gap-6">
                  


                  {/* Left Column: Tracking Status / Controls */}
                  <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between space-y-6 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 -mt-10 -mr-10 opacity-10 blur-xl">
                       <MapPin className="w-64 h-64 text-indigo-400" />
                    </div>

                    <div className="relative z-10">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full uppercase tracking-widest font-mono border border-indigo-500/20">Modul Presensi</span>
                        <div className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.8)]"></div>
                      </div>
                      <h3 className="font-display font-black text-2xl text-white tracking-tight mt-4">Presensi Hari Ini</h3>
                      <p className="text-xs text-slate-400 mt-1.5 leading-relaxed max-w-[85%]">
                        Radius absensi masuk ke kantor/gudang dibatasi oleh Geofence. GPS live perangkat & liveness wajah digunakan untuk validasi ganda.
                      </p>
                    </div>

                    {isLocating && (
                      <div className="bg-indigo-500/20 border border-indigo-400/30 p-4 rounded-2xl flex items-center gap-3 text-xs text-indigo-200 shadow-inner relative z-10 backdrop-blur-md">
                        <RefreshCw className="w-5 h-5 animate-spin text-indigo-400 shrink-0" />
                        <span className="font-medium">Menyinkronkan satelit GPS perangkat...</span>
                      </div>
                    )}

                    {!isLocating && (
                      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 space-y-4 font-mono text-xs shadow-xl relative z-10">

                        <div className="flex justify-between items-center group">
                          <span className="text-slate-400 flex items-center gap-2 group-hover:text-slate-300 transition-colors"><MapPin className="w-4 h-4 text-indigo-400" /> Koordinat Anda:</span>
                          <span className="text-indigo-300 font-bold bg-indigo-500/10 px-2 py-1 rounded-lg border border-indigo-500/20 shadow-sm">
                            {deviceLat ? `${deviceLat.toFixed(5)}, ${deviceLng?.toFixed(5)}` : 'Sinyal Hilang'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center border-t border-white/5 pt-4 group">
                          <span className="text-slate-400 flex items-center gap-2 group-hover:text-slate-300 transition-colors"><Building2 className="w-4 h-4 text-emerald-400" /> Penempatan Kerja:</span>
                          <span className="text-slate-200 font-semibold text-right flex flex-col items-end">
                            {currentUser.division} <span className="text-[10px] text-slate-400">{currentUser.position}</span>
                          </span>
                        </div>
                        <div className="flex justify-between items-center border-t border-white/5 pt-4 group">
                          <span className="text-slate-400 flex items-center gap-2 group-hover:text-slate-300 transition-colors"><Lock className="w-4 h-4 text-amber-400" /> Kunci Perangkat:</span>
                          <span className="text-slate-200 font-semibold">
                            {currentUser.lastCheckInDevice ? (
                               <span className="flex items-center gap-1.5 text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20"><ShieldCheck className="w-4 h-4"/> Terkunci</span>
                            ) : (
                               <span className="flex items-center gap-1.5 text-amber-400 bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/20"><Unlock className="w-4 h-4"/> Belum Dikunci</span>
                            )}
                          </span>
                        </div>
                      </div>
                    )}



                    {/* Check In / Out Main Buttons */}
                    <div className="space-y-4">
                      {!todayRecord ? (
                        <button
                          type="button"
                          onClick={() => {
                            if (deviceLat === null) {
                              showCustomAlert("GPS Anda belum terdeteksi atau izin belum diberikan.", "Error");
                              return;
                            }
                            setMapModalAction('checkin'); 
                            setShowCheckInMapModal(true); 
                          }}
                          id="btn-check-in"
                          disabled={isLocating}
                          className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold text-sm py-4 rounded-2xl shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:shadow-[0_0_25px_rgba(37,99,235,0.5)] transition-all duration-300 transform hover:-translate-y-1 active:scale-[0.98] flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Mulai Masuk Kerja</span>
                        </button>
                      ) : todayRecord.isManualCheckIn && !todayRecord.arrivalTimeAtWarehouse ? (
                        /* Manual Check-In but not yet confirmed arrival at Warehouse */
                        <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl space-y-3 text-slate-800">
                          <div className="flex items-start gap-2.5">
                            <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 animate-pulse" />
                            <div>
                              <h4 className="font-bold text-xs text-amber-900">Menunggu Konfirmasi Kedatangan Gudang</h4>
                              <p className="text-[10px] text-amber-700 leading-normal mt-0.5">
                                Anda telah melakukan Absen Manual kerja pada jam <b>{todayRecord.checkInTime}</b>. Sesuai SOP, Anda wajib sampai di gudang fisik dalam waktu 2 jam.
                              </p>
                            </div>
                          </div>

                          <div className="bg-white border border-amber-100 p-2.5 rounded-lg space-y-2 text-slate-700 text-[10px]">
                            <div className="flex justify-between border-b border-slate-100 pb-1">
                              <span>Waktu Mulai:</span>
                              <span className="font-mono font-bold">{todayRecord.checkInTime}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Batas Kedatangan:</span>
                              <span className="font-mono font-bold text-amber-700">
                                {(() => {
                                  const [h, m] = todayRecord.checkInTime.split(':').map(Number);
                                  const targetMin = h * 60 + m + 120;
                                  const targetH = Math.floor(targetMin / 60) % 24;
                                  const targetM = targetMin % 60;
                                  return `${String(targetH).padStart(2, '0')}:${String(targetM).padStart(2, '0')}`;
                                })()} WIB
                              </span>
                            </div>
                          </div>

                          <label className="flex items-start gap-2.5 cursor-pointer bg-white p-2.5 rounded-lg border border-amber-100 shadow-xs">
                            <input
                              type="checkbox"
                              checked={isConfirmedToBoss}
                              onChange={(e) => setIsConfirmedToBoss(e.target.checked)}
                              className="mt-0.5 rounded border-slate-300 text-amber-600 focus:ring-amber-500 w-4 h-4"
                            />
                            <div>
                              <span className="font-semibold text-[11px] text-amber-950 block">Sudah Konfirmasi Atasan</span>
                              <span className="text-[9px] text-amber-700 leading-normal block">
                                Centang ini jika terlambat lebih dari 2 jam dan sudah mengonfirmasi atasan sebelum jam 14:00 (mencegah denda).
                              </span>
                            </div>
                          </label>

                          <button
                            type="button"
                            onClick={handleManualArrive}
                            disabled={isSubmittingManualArrive}
                            className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold py-2.5 rounded-xl shadow-sm transition flex items-center justify-center gap-1.5 text-xs cursor-pointer"
                          >
                            <Building2 className="w-4 h-4" />
                            <span>Konfirmasi Sampai di Gudang</span>
                          </button>
                        </div>
                      ) : !todayRecord.checkOutTime ? (
                        <button
                          type="button"
                          onClick={() => {
                            if (deviceLat === null) {
                              showCustomAlert("GPS Anda belum terdeteksi atau izin belum diberikan.", "Error");
                              return;
                            }
                            setMapModalAction('checkout'); 
                            setShowCheckInMapModal(true); 
                          }}
                          id="btn-check-out"
                          disabled={isLocating}
                          className="w-full bg-rose-600 hover:bg-rose-700 text-white font-semibold py-3 rounded-xl shadow-sm transition flex items-center justify-center gap-2.5 text-xs cursor-pointer"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>Selesai Kerja (Check-Out)</span>
                        </button>
                      ) : (
                        <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 p-4 rounded-xl text-center text-xs space-y-1">
                          <CheckCircle2 className="w-5 h-5 mx-auto text-emerald-600" />
                          <p className="font-semibold">Kehadiran Selesai Hari Ini</p>
                          <p className="text-[10px] text-slate-500 font-mono">
                            Masuk: {todayRecord.checkInTime} {todayRecord.isManualCheckIn && `(Manual, Sampai Gudang: ${todayRecord.arrivalTimeAtWarehouse || '-'})`} | Pulang: {todayRecord.checkOutTime}
                          </p>
                        </div>
                      )}

                    </div>

                    {/* Liveness Camera Capture view */}
                    {showCamera && (
                      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
                        <div className="bg-white border border-slate-200 max-w-md w-full rounded-2xl overflow-hidden p-6 shadow-xl relative text-slate-800">
                          <h4 className="font-display font-bold text-sm text-amber-700 mb-2 flex items-center gap-1.5">
                            <Camera className="w-4 h-4 text-amber-600" />
                            <span>Verifikasi Liveness Check (Luar Kantor)</span>
                          </h4>
                          <p className="text-xs text-slate-500 mb-4">
                            Sistem mendeteksi Anda di luar geofence resmi. Silakan ambil foto selfie untuk diajukan ke Admin.
                          </p>

                          <div className="aspect-video bg-black rounded-xl overflow-hidden relative border border-slate-200 mb-4 flex items-center justify-center">
                            {cameraError ? (
                              <div className="text-center p-4 text-slate-400 text-xs">
                                <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2 animate-bounce" />
                                <p className="font-semibold">{cameraError}</p>
                              </div>
                            ) : (
                              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover scale-x-[-1]" />
                            )}
                          </div>

                          <canvas ref={canvasRef} className="hidden" />

                          <div className="flex gap-3">
                            <button
                              type="button"
                              onClick={capturePhoto}
                              className="flex-1 bg-amber-600 hover:bg-amber-700 text-white py-2.5 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <Camera className="w-4 h-4" />
                              <span>Ambil Gambar</span>
                            </button>
                            <button
                              type="button"
                              onClick={stopCamera}
                              className="flex-1 border border-slate-200 text-slate-500 hover:bg-slate-50 py-2.5 rounded-xl text-xs transition cursor-pointer"
                            >
                              Batalkan
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  </div>

                {/* Dashboard Metrics (Quotas/Sisa jatah) */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  

                </div>

                              {/* ----------------------------------------------------------------------
                   DEVICE PERMISSIONS BANNER / COMPONENT
                   ---------------------------------------------------------------------- */}

              </div>
            )}

            {/* =========================================================================
               TAB: HISTORY
               ========================================================================= */}
            {activeTab === 'history' && (
              <div className="space-y-6 animate-fade-in">
                {/* Worker Attendance Logs History & statistics */}
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm text-slate-800">
                  <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-blue-500" />
                      <h3 className="font-display font-semibold text-slate-800">Log Riwayat Kehadiran Anda</h3>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Quick Export Button */}
                      <button
                        type="button"
                        onClick={handleExportUserLogsCSV}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs py-1.5 px-3 rounded-lg transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                        title="Ekspor CSV riwayat saat ini"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Ekspor CSV</span>
                      </button>

                      {/* Cumulated statistics */}
                      <div className="hidden md:flex gap-4 text-xs font-semibold">
                        <span className="text-emerald-600">Bonus: <span>{formatIDRCurrency(totalBonusesForUser)}</span></span>
                        <span className="text-rose-600">Denda: <span>{formatIDRCurrency(totalFinesForUser)}</span></span>
                      </div>

                      {/* Filter trigger */}
                      <select
                        value={historyFilterStatus}
                        onChange={(e) => setHistoryFilterStatus(e.target.value as any)}
                        className="bg-white border border-slate-200 rounded-lg text-xs py-1.5 px-3 focus:outline-none text-slate-700"
                      >
                        <option value="all">Semua Log</option>
                        <option value="approved">Disetujui (Approved)</option>
                        <option value="pending">Tertunda (Pending)</option>
                        <option value="rejected">Ditolak (Rejected)</option>
                      </select>
                    </div>
                  </div>

                  <div className="overflow-x-auto custom-scrollbar border border-slate-100 rounded-lg">
                    <table className="w-full text-left border-collapse text-[11px]">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 font-mono text-[10px] uppercase tracking-wider">
                          <th className="py-1.5 px-3">Tanggal</th>
                          <th className="py-1.5 px-3">Jam Masuk (Geofence)</th>
                          <th className="py-1.5 px-3">Jam Keluar (Geofence)</th>
                          <th className="py-1.5 px-3">Geofence Status</th>
                          <th className="py-1.5 px-3">Denda (Telat)</th>
                          <th className="py-1.5 px-3">Bonus (Disiplin)</th>
                          <th className="py-1.5 px-3">Status</th>
                          <th className="py-1.5 px-3">Keterangan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredUserRecords.length > 0 ? (
                          filteredUserRecords.map((record) => (
                            <tr key={record.id} className="hover:bg-blue-50/40 text-slate-600 transition-colors duration-150">
                              <td className="py-1.5 px-3 font-mono font-medium text-slate-500">{record.date}</td>
                              <td className="py-1.5 px-3">
                                <p className="font-bold text-slate-800">{record.checkInTime}</p>
                                <span className="text-[9px] text-slate-400 font-mono">{record.checkInLocationName}</span>
                              </td>
                              <td className="py-1.5 px-3">
                                {record.checkOutTime ? (
                                  <>
                                    <p className="font-bold text-slate-800">{record.checkOutTime}</p>
                                    <span className="text-[9px] text-slate-400 font-mono">{record.checkOutLocationName}</span>
                                  </>
                                ) : (
                                  <span className="text-slate-300 font-mono">-</span>
                                )}
                              </td>
                              <td className="py-1.5 px-3">
                                {record.isOutsideGeofence ? (
                                  <span className="text-amber-700 bg-amber-50 border border-amber-200/60 py-0.2 px-1.5 rounded-full font-bold text-[9px]">Luar Area</span>
                                ) : (
                                  <span className="text-emerald-700 bg-emerald-50 border border-emerald-200/60 py-0.2 px-1.5 rounded-full font-bold text-[9px]">Dalam Area</span>
                                )}
                              </td>
                              <td className="py-1.5 px-3 font-mono text-rose-600 font-semibold">{formatIDRCurrency(record.fineAmount)}</td>
                              <td className="py-1.5 px-3 font-mono text-emerald-600 font-semibold">{formatIDRCurrency(record.bonusAmount)}</td>
                              <td className="py-1.5 px-3">
                                <span className={`font-semibold py-0.2 px-2 rounded-full text-[9px] uppercase ${
                                  record.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' :
                                  record.status === 'pending' ? 'bg-amber-50 text-amber-700 border border-amber-200/60' :
                                  'bg-rose-50 text-rose-700 border border-rose-200/60'
                                }`}>
                                  {record.status}
                                </span>
                              </td>
                              <td className="py-1.5 px-3 text-slate-400 italic text-[10px] max-w-xs truncate">{record.note || '-'}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={8} className="p-8 text-center text-slate-400 italic">
                              Tidak ada log kehadiran yang sesuai dengan kriteria filter.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* =========================================================================
               TAB: STATS
               ========================================================================= */}
            {activeTab === 'stats' && (
              <div className="space-y-6 animate-fade-in">
                {/* KPI Overview Chart using Recharts */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm text-slate-800 animate-fade-in">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 mb-4 border-b border-slate-100 gap-3">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-mono">Analisis Kinerja Kehadiran</span>
                      <h3 className="font-display font-bold text-sm text-slate-800 mt-0.5 flex items-center gap-2">
                        <Activity className="w-4 h-4 text-indigo-500 animate-pulse" />
                        <span>KPI Overview Bulanan</span>
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        Memantau tingkat disiplin dan kehadiran tepat waktu vs terlambat Anda tiap bulannya.
                      </p>
                    </div>
                    
                    {/* Quick legend indicators with computed totals */}
                    <div className="flex items-center gap-4 text-xs font-mono font-bold bg-slate-50 border border-slate-200 p-2.5 rounded-lg shrink-0">
                      <div>
                        <span className="text-slate-400 block text-[8px] uppercase">TOTAL PRESENSI</span>
                        <span className="text-slate-800">{monthlyKPIData.reduce((acc, d) => acc + d.present, 0)} Hari</span>
                      </div>
                      <div className="border-l border-slate-200 pl-3">
                        <span className="text-slate-400 block text-[8px] uppercase">TERLAMBAT</span>
                        <span className="text-rose-600">{monthlyKPIData.reduce((acc, d) => acc + d.late, 0)} Hari</span>
                      </div>
                      <div className="border-l border-slate-200 pl-3">
                        <span className="text-slate-400 block text-[8px] uppercase">TINGKAT DISIPLIN</span>
                        <span className="text-emerald-600">
                          {monthlyKPIData.reduce((acc, d) => acc + d.present, 0) > 0
                            ? Math.round(((monthlyKPIData.reduce((acc, d) => acc + d.present, 0) - monthlyKPIData.reduce((acc, d) => acc + d.late, 0)) / monthlyKPIData.reduce((acc, d) => acc + d.present, 0)) * 100)
                            : 100}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Recharts Bar Chart Visualizer */}
                  <div className="w-full h-56 font-sans text-xs">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={monthlyKPIData}
                        margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis 
                          dataKey="month" 
                          stroke="#64748b" 
                          fontSize={10}
                          tickLine={false}
                        />
                        <YAxis 
                          stroke="#64748b" 
                          fontSize={10}
                          tickLine={false}
                        />
                        <Tooltip
                          contentStyle={{ 
                            backgroundColor: '#0f172a', 
                            border: 'none', 
                            borderRadius: '8px',
                            color: '#fff',
                            fontSize: '11px',
                            fontFamily: 'monospace'
                          }}
                        />
                        <Legend 
                          verticalAlign="top" 
                          height={36} 
                          iconType="circle"
                          iconSize={8}
                          wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }}
                        />
                        <Bar 
                          name="Hadir (Present)" 
                          dataKey="present" 
                          fill="#4f46e5" 
                          radius={[4, 4, 0, 0]} 
                          maxBarSize={30}
                        />
                        <Bar 
                          name="Terlambat (Late)" 
                          dataKey="late" 
                          fill="#f43f5e" 
                          radius={[4, 4, 0, 0]} 
                          maxBarSize={30}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Financial Performance Chart (Fines vs Bonuses) according to SOP 2026 */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm text-slate-800 animate-fade-in">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 mb-4 border-b border-slate-100 gap-3">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-mono">Dampak Finansial SOP Baru</span>
                      <h3 className="font-display font-bold text-sm text-slate-800 mt-0.5 flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-emerald-500" />
                        <span>Kinerja Keuangan (Fines vs Bonuses)</span>
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        Memantau akumulasi potensi denda keterlambatan berjenjang terhadap insentif denda/bonus yang berhasil dihitung sistem.
                      </p>
                    </div>
                    
                    {/* Computed totals for highlighting */}
                    <div className="flex items-center gap-4 text-xs font-mono font-bold bg-slate-50 border border-slate-200 p-2.5 rounded-lg shrink-0">
                      <div>
                        <span className="text-slate-400 block text-[8px] uppercase">TOTAL POTENSI DENDA</span>
                        <span className="text-rose-600">
                          {formatIDRCurrency(monthlyFinancialData.reduce((acc, d) => acc + d.fines, 0))}
                        </span>
                      </div>
                      <div className="border-l border-slate-200 pl-3">
                        <span className="text-slate-400 block text-[8px] uppercase">TOTAL BONUS DITERIMA</span>
                        <span className="text-emerald-600">
                          {formatIDRCurrency(monthlyFinancialData.reduce((acc, d) => acc + d.bonuses, 0))}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Recharts Bar Chart Visualizer for Financials */}
                  <div className="w-full h-64 font-sans text-xs">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={monthlyFinancialData}
                        margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis 
                          dataKey="month" 
                          stroke="#64748b" 
                          fontSize={10}
                          tickLine={false}
                        />
                        <YAxis 
                          stroke="#64748b" 
                          fontSize={10}
                          tickLine={false}
                          tickFormatter={(val) => `Rp ${(val / 1000).toLocaleString('id-ID')}k`}
                        />
                        <Tooltip
                          formatter={(value: any) => [formatIDRCurrency(Number(value)), '']}
                          contentStyle={{ 
                            backgroundColor: '#0f172a', 
                            border: 'none', 
                            borderRadius: '8px',
                            color: '#fff',
                            fontSize: '11px',
                            fontFamily: 'monospace'
                          }}
                        />
                        <Legend 
                          verticalAlign="top" 
                          height={36} 
                          iconType="circle"
                          iconSize={8}
                          wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }}
                        />
                        <Bar 
                          name="Total Potensi Denda" 
                          dataKey="fines" 
                          fill="#f43f5e" 
                          radius={[4, 4, 0, 0]} 
                          maxBarSize={30}
                        />
                        <Bar 
                          name="Bonus yang Diterima" 
                          dataKey="bonuses" 
                          fill="#10b981" 
                          radius={[4, 4, 0, 0]} 
                          maxBarSize={30}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                              </div>
            )}

            {/* =========================================================================
               TAB: CALENDAR LEAVE REQUEST SYSTEM
               ========================================================================= */}
            {activeTab === 'calendar' && (
              <div className="space-y-6 animate-fade-in">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider font-mono">Penjadwalan Libur</span>
                    <h2 className="font-display font-bold text-2xl text-slate-900 mt-1">Sistem Manajemen Libur & Jatah Libur</h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Kunci tanggal libur Anda untuk mengunci slot jadwal kerja tim. Pengajuan konflik otomatis masuk antrean Supervisor.
                    </p>
                  </div>
                </div>

                <CalendarView
                  currentUser={currentUser}
                  leaveRequests={leaveRequests}
                  onApplyLeave={handleApplyLeave}
                  onCancelLeave={handleCancelLeave}
                />
              </div>
            )}

            {/* =========================================================================
               TAB: ANNOUNCEMENT INBOX ( Kotak Masuk )
               ========================================================================= */}
            {activeTab === 'inbox' && (
              <div className="max-w-4xl mx-auto space-y-6 animate-fade-in text-slate-800">
                <div>
                  <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider font-mono">Arsip Informasi</span>
                  <h2 className="font-display font-bold text-2xl text-slate-900 mt-1">Kotak Masuk & Historis Pengumuman</h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Daftar seluruh informasi dan regulasi resmi perusahaan yang disiarkan oleh jajaran manajemen.
                  </p>
                </div>

                <div className="space-y-4">
                  {announcements.length > 0 ? (
                    announcements.slice().reverse().map((ann) => {
                      const todayStr = serverTime.toISOString().split('T')[0];
                      const isFuture = todayStr < ann.startDate;
                      const isExpired = todayStr > ann.endDate;
                      const isActive = !isFuture && !isExpired;

                      return (
                        <div key={ann.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 p-5">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3 mb-3">
                            <div className="flex items-center gap-2">
                              <span className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                <Bell className="w-4 h-4" />
                              </span>
                              <div>
                                <h4 className="font-bold text-slate-900 text-sm">{ann.title}</h4>
                                <p className="text-[10px] text-slate-400 font-mono mt-0.5">Pembuat: {ann.createdBy}</p>
                              </div>
                            </div>

                            <span className={`px-2.5 py-1 rounded-full text-[9px] uppercase font-bold tracking-wider w-fit border ${
                              isActive
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : isExpired
                                  ? 'bg-slate-100 text-slate-500 border-slate-200'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}>
                              {isActive ? '● Aktif & Valid' : isExpired ? 'Kedaluwarsa / Tidak Valid' : 'Belum Aktif'}
                            </span>
                          </div>

                          <p className="text-slate-600 text-xs leading-relaxed whitespace-pre-wrap">{ann.content}</p>

                          <div className="mt-4 flex items-center justify-between text-[10px] text-slate-400 font-mono border-t border-slate-50 pt-3">
                            <span>📅 Periode Siar: {ann.startDate} s/d {ann.endDate}</span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-500 shadow-sm">
                      <Bell className="w-12 h-12 text-slate-300 mx-auto mb-3 animate-pulse" />
                      <p className="font-bold text-slate-800 text-sm">Kotak Masuk Kosong</p>
                      <p className="text-xs text-slate-400 mt-1">Belum ada pengumuman resmi dari manajemen yang terbit saat ini.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* =========================================================================
               TAB: USER PROFILE SETTINGS
               ========================================================================= */}
            {activeTab === 'profile' && (
              <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm p-8">
                  <div className="flex flex-col items-center text-center pb-6 border-b border-slate-200">
                    <div className="relative">
                      <img
                        src={currentUser.photoUrl}
                        alt="Employee Selfie"
                        className="w-24 h-24 rounded-full object-cover border-2 border-blue-500 bg-slate-100"
                        referrerPolicy="no-referrer"
                      />
                      <span className="absolute bottom-1 right-1 bg-emerald-500 w-4 h-4 rounded-full border-2 border-white animate-pulse"></span>
                    </div>
                    <h3 className="font-display font-bold text-xl text-slate-900 mt-3 capitalize">{currentUser.username}</h3>
                    <p className="text-xs text-blue-600 font-semibold mt-0.5">{currentUser.position} — <span className="text-slate-500 font-normal">{currentUser.division}</span></p>
                    <p className="text-[10px] font-mono text-slate-400 mt-2">Email: {currentUser.email}</p>
                  </div>

                  {profileMessage && (
                    <div className={`mt-6 p-4 rounded-xl text-xs flex gap-3 border ${
                      profileMessage.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-rose-50 border-rose-100 text-rose-700'
                    }`}>
                      <CheckCircle2 className="w-5 h-5 shrink-0" />
                      <span>{profileMessage.text}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 text-slate-800 border-t border-slate-200 pt-6">
                    {/* Debug Toggle */}
                    <div className="space-y-4 col-span-1 md:col-span-2">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-blue-500" />
                        <span>Sistem Debug & Diagnostik</span>
                      </h4>
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex justify-between items-center">
                        <div>
                           <p className="text-[11px] font-bold text-slate-800">Aktifkan Mode Debug</p>
                           <p className="text-[10px] text-slate-500">Merekam log internal aplikasi untuk dianalisa saat terjadi error (akan memunculkan tab Log baru).</p>
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 border border-slate-200 rounded-lg shadow-sm">
                          <input type="checkbox" checked={isDebugMode} onChange={(e) => setIsDebugMode(e.target.checked)} className="w-3.5 h-3.5" />
                          <span className="text-[10px] font-bold text-slate-600">{isDebugMode ? 'ON' : 'OFF'}</span>
                        </label>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 text-slate-800">
                    {/* Change profile Photo URL */}
                    <div className="space-y-4">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Upload className="w-4 h-4 text-blue-500" />
                        <span>Perbarui Foto Profil</span>
                      </h4>
                      <div className="space-y-3">
                        <p className="text-[11px] text-slate-500 leading-normal">
                          Pilih file foto selfie dari galeri perangkat Anda atau gunakan URL foto representatif eksternal untuk mengubah avatar Anda.
                        </p>
                        <div className="space-y-3">
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="https://images.unsplash.com/..."
                              value={profilePhotoUrl}
                              onChange={(e) => setProfilePhotoUrl(e.target.value)}
                              className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-mono"
                            />
                            <button
                              type="button"
                              onClick={handleUpdateProfilePhoto}
                              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs py-2 px-3.5 rounded-lg transition cursor-pointer shrink-0"
                            >
                              Simpan
                            </button>
                          </div>

                          <div className="flex items-center gap-2 border-t border-slate-100 pt-2">
                            <span className="text-[10px] text-slate-400 uppercase font-bold font-mono">Atau:</span>
                            <input
                              type="file"
                              id="profile-upload"
                              accept="image/*"
                              onChange={handleImageUpload}
                              className="hidden"
                            />
                            <label
                              htmlFor="profile-upload"
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg text-[10px] font-bold uppercase cursor-pointer text-slate-700 transition"
                            >
                              <Upload className="w-3.5 h-3.5" />
                              <span>Ambil dari Galeri / Kamera</span>
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Change Password */}
                    <form onSubmit={handleChangePassword} className="space-y-4">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Lock className="w-4 h-4 text-blue-500" />
                        <span>Keamanan Password</span>
                      </h4>
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <label htmlFor="new-pass-profile" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Password Baru</label>
                          <input
                            id="new-pass-profile"
                            required
                            type="password"
                            placeholder="Minimal 6 karakter"
                            value={profileNewPassword}
                            onChange={(e) => setProfileNewPassword(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                          />
                        </div>
                        <button
                          type="submit"
                          className="w-full bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-xs py-2 rounded-lg transition cursor-pointer"
                        >
                          Ubah Password Saya
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            )}

            {/* =========================================================================
               TAB: LOGS (DEBUG)
               ========================================================================= */}
            {activeTab === 'logs' && isDebugMode && (
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm animate-fade-in text-slate-800 flex flex-col h-[500px]">
                <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center shrink-0">
                  <div>
                    <h4 className="font-display font-bold text-sm text-slate-900 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-amber-600" />
                      Log Debugger Sistem
                    </h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">Memantau aktivitas internal aplikasi dan merespons error.</p>
                  </div>

                  <div className="flex gap-2 items-center">
                    <button
                      onClick={() => navigator.clipboard.writeText(debugLogs.join('\n'))}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-bold shadow-sm cursor-pointer"
                    >
                      Copy Logs
                    </button>
                    <button
                      onClick={() => {
                        logsRef.current = [];
                        setDebugLogs([]);
                      }}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 rounded-lg text-[10px] font-bold cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="flex-1 p-4 bg-slate-900 text-emerald-400 font-mono text-[10px] overflow-y-auto custom-scrollbar whitespace-pre-wrap break-all leading-relaxed">
                  {debugLogs.length > 0 ? debugLogs.map((log, i) => (
                    <div key={i} className="mb-1 border-b border-slate-800/50 pb-1">{log}</div>
                  )) : (
                    <p className="text-slate-500 italic text-center mt-10">Menunggu log aktivitas baru...</p>
                  )}
                </div>
              </div>
            )}

            {/* =========================================================================
               TAB: ADMINISTRATIVE CONSOLE (ADMIN/SUPERVISOR GATES)
               ========================================================================= */}
            {activeTab === 'admin' && (
              <div className="space-y-6 animate-fade-in">


                {adminSubTab === 'radar' && (
                  <div className="space-y-6 animate-fade-in">
                    <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h4 className="font-display font-semibold text-sm text-slate-800 flex items-center gap-1.5">
                          <Compass className="w-4 h-4 text-blue-600 animate-spin" style={{ animationDuration: '8s' }} />
                          <span>Radar Satelit Karyawan Aktif</span>
                        </h4>
                        <p className="text-xs text-slate-500 mt-1 leading-normal">
                          Menunjukkan lokasi terakhir saat melakukan absensi untuk seluruh pekerja yang aktif di lapangan.
                        </p>
                      </div>
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 shrink-0">
                        {/* Filters */}
                        <div className="flex items-center gap-2">
                          <select
                            value={radarFilterDivision}
                            onChange={(e) => setRadarFilterDivision(e.target.value)}
                            className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-lg px-2 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="all">Semua Divisi</option>
                            {config?.divisions.map(d => (
                              <option key={d} value={d}>{d}</option>
                            ))}
                          </select>
                          <select
                            value={radarFilterStatus}
                            onChange={(e) => setRadarFilterStatus(e.target.value)}
                            className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-lg px-2 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="all">Semua Status</option>
                            <option value="working">Hadir (Sedang Bekerja)</option>
                            <option value="out_of_area">Luar Area</option>
                            <option value="offline">Off / Offline</option>
                          </select>
                        </div>
                        {/* Auto-Refresh Toggle */}
                        <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 shadow-xs">
                          <div className="flex flex-col gap-1">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-mono leading-none">Auto Refresh</span>
                            <div className="flex items-center gap-2">
                              <select
                                value={radarRefreshInterval}
                                onChange={(e) => setRadarRefreshInterval(Number(e.target.value))}
                                disabled={!isAutoRefreshRadar}
                                className="text-xs bg-white border border-slate-200 rounded px-1 text-slate-700 disabled:opacity-50"
                              >
                                <option value="10000">10s</option>
                                <option value="30000">30s</option>
                                <option value="60000">1m</option>
                                <option value="300000">5m</option>
                                <option value="3600000">1j</option>
                              </select>
                              <button
                                type="button"
                                onClick={() => setIsAutoRefreshRadar(!isAutoRefreshRadar)}
                                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                  isAutoRefreshRadar ? 'bg-blue-600' : 'bg-slate-300'
                                }`}
                                aria-label="Toggle Auto Refresh Radar"
                              >
                                <span
                                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                                    isAutoRefreshRadar ? 'translate-x-4' : 'translate-x-0'
                                  }`}
                                />
                              </button>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={fetchAllWorkers}
                          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs py-2.5 px-4 rounded-xl shadow-sm transition flex items-center gap-1.5 cursor-pointer h-fit"
                        >
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: isAutoRefreshRadar ? '3s' : '0s' }} />
                          <span>Lacak Semua Karyawan Realtime</span>
                        </button>
                      </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-wrap gap-4 text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                        <span className="font-medium text-slate-600">Sedang Bekerja (Dalam Geofence)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"></div>
                        <span className="font-medium text-slate-600">Luar Area</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-slate-400"></div>
                        <span className="font-medium text-slate-600">Off / Offline</span>
                      </div>
                    </div>
                    
                    <div className="h-[450px] rounded-2xl overflow-hidden border border-slate-200 relative">
                      <MapView
                        userLat={null}
                        userLng={null}
                        locations={locations}
                        radarMode={true}
                        workers={filteredRadarWorkers}
                      />
                    </div>
                  </div>
                )}

                {/* ----------------------------------------------------------------------
                   SUBTAB: PENDING APPROVALS LISTINGS
                   ---------------------------------------------------------------------- */}
                {adminSubTab === 'approvals' && (
                  <div className="space-y-6 animate-fade-in text-slate-800">
                    
                    {/* 1. Worker Signups Approvals */}
                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                      <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                          <h4 className="font-display font-bold text-sm text-slate-800">Antrean Pendaftar Baru (Pending Verifikasi)</h4>
                          <p className="text-xs text-slate-500 mt-0.5">Tentukan jabatan, divisi, dan penempatan geofence kerja saat melakukan persetujuan.</p>
                        </div>
                        {pendingWorkers.length > 0 && (
                          <div className="flex items-center gap-2.5">
                            <button
                              type="button"
                              onClick={() => {
                                if (selectedPendingWorkerIds.length === pendingWorkers.length) {
                                  setSelectedPendingWorkerIds([]);
                                } else {
                                  setSelectedPendingWorkerIds(pendingWorkers.map(w => w.id));
                                }
                              }}
                              className="text-xs bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 font-semibold py-1.5 px-3 rounded-lg transition cursor-pointer"
                            >
                              {selectedPendingWorkerIds.length === pendingWorkers.length ? 'Batal Pilih Semua' : 'Pilih Semua'}
                            </button>
                            {selectedPendingWorkerIds.length > 0 && (
                              <button
                                type="button"
                                onClick={handleBulkApproveWorkers}
                                disabled={isBulkApprovingWorkers}
                                className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 px-4 rounded-lg shadow-sm transition flex items-center gap-1 cursor-pointer animate-pulse"
                              >
                                {isBulkApprovingWorkers ? 'Memproses...' : `Setujui Massal (${selectedPendingWorkerIds.length})`}
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="p-5 space-y-4">
                        {pendingWorkers.length > 0 ? (
                          pendingWorkers.map((pending) => (
                            <div key={pending.id} className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-6">
                              <div className="flex items-center gap-3">
                                <input
                                  type="checkbox"
                                  checked={selectedPendingWorkerIds.includes(pending.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedPendingWorkerIds([...selectedPendingWorkerIds, pending.id]);
                                    } else {
                                      setSelectedPendingWorkerIds(selectedPendingWorkerIds.filter(id => id !== pending.id));
                                    }
                                  }}
                                  className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer shrink-0"
                                />
                                <img src={pending.photoUrl} alt="Signup Portrait" className="w-12 h-12 rounded-full object-cover border border-slate-200 bg-slate-100" referrerPolicy="no-referrer" />
                                <div>
                                  <h5 className="font-bold text-slate-800 text-sm capitalize">{pending.username}</h5>
                                  <p className="text-xs text-slate-400 font-mono">{pending.email}</p>
                                </div>
                              </div>

                              {/* Trigger configuration form modal/box */}
                              {approvalUserForm?.userId === pending.id ? (
                                <div className="flex-1 max-w-xl grid grid-cols-1 md:grid-cols-4 gap-3 bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
                                  {/* Role selector */}
                                  <div className="space-y-1">
                                    <label htmlFor="approve-role" className="text-[9px] font-bold text-slate-400 uppercase">Akses</label>
                                    <select
                                      id="approve-role"
                                      value={approvalUserForm.role}
                                      onChange={(e) => setApprovalUserForm({ ...approvalUserForm, role: e.target.value as any })}
                                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded py-1 px-1.5 text-slate-700 focus:outline-none focus:border-blue-500"
                                    >
                                      <option value="worker">Worker</option>
                                      <option value="supervisor">Supervisor</option>
                                    </select>
                                  </div>

                                  {/* Division Selector */}
                                  <div className="space-y-1">
                                    <label htmlFor="approve-div" className="text-[9px] font-bold text-slate-400 uppercase">Divisi</label>
                                    <select
                                      id="approve-div"
                                      value={approvalUserForm.division}
                                      onChange={(e) => setApprovalUserForm({ ...approvalUserForm, division: e.target.value })}
                                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded py-1 px-1.5 text-slate-700 focus:outline-none focus:border-blue-500"
                                    >
                                      {config?.divisions.map(d => <option key={d} value={d}>{d}</option>)}
                                    </select>
                                  </div>

                                  {/* Position Selector */}
                                  <div className="space-y-1">
                                    <label htmlFor="approve-pos" className="text-[9px] font-bold text-slate-400 uppercase">Jabatan</label>
                                    <select
                                      id="approve-pos"
                                      value={approvalUserForm.position}
                                      onChange={(e) => setApprovalUserForm({ ...approvalUserForm, position: e.target.value })}
                                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded py-1 px-1.5 text-slate-700 focus:outline-none focus:border-blue-500"
                                    >
                                      {config?.positions.map(p => <option key={p} value={p}>{p}</option>)}
                                    </select>
                                  </div>

                                  {/* Geofence target selector */}
                                  <div className="space-y-1">
                                    <label htmlFor="approve-loc" className="text-[9px] font-bold text-slate-400 uppercase">Penempatan</label>
                                    <select
                                      id="approve-loc"
                                      value={approvalUserForm.locationId}
                                      onChange={(e) => setApprovalUserForm({ ...approvalUserForm, locationId: e.target.value })}
                                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded py-1 px-1.5 text-slate-700 focus:outline-none focus:border-blue-500"
                                    >
                                      {locations.map(loc => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
                                    </select>
                                  </div>

                                  <div className="md:col-span-4 flex justify-end gap-2 mt-2">
                                    <button
                                      type="button"
                                      onClick={handleApproveWorker}
                                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] py-1.5 px-3.5 rounded transition cursor-pointer"
                                    >
                                      Sahkan Persetujuan
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setApprovalUserForm(null)}
                                      className="border border-slate-200 hover:bg-slate-50 text-slate-500 text-[10px] py-1.5 px-2.5 rounded transition cursor-pointer"
                                    >
                                      Batalkan
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex gap-2 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => setApprovalUserForm({
                                      userId: pending.id,
                                      role: 'worker',
                                      division: config?.divisions[1] || 'Operations',
                                      position: config?.positions[3] || 'Staff Gudang',
                                      locationId: locations[0]?.id || 'loc1'
                                    })}
                                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs py-2 px-3.5 rounded-lg transition cursor-pointer"
                                  >
                                    Atur & Setujui
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRejectWorker(pending.id)}
                                    className="border border-rose-200 hover:bg-rose-50 text-rose-600 font-semibold text-xs py-2 px-3.5 rounded-lg transition cursor-pointer"
                                  >
                                    Tolak
                                  </button>
                                </div>
                              )}
                            </div>
                          ))
                        ) : (
                          <p className="text-slate-400 text-center py-6 text-xs italic">Tidak ada pendaftar baru dalam antrean persetujuan.</p>
                        )}
                      </div>
                    </div>

                    {/* 2. Outside Geofence checkins with liveness selfie uploads */}
                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                      <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                          <h4 className="font-display font-bold text-sm text-slate-800">Antrean Verifikasi Liveness (Absen Luar Area)</h4>
                          <p className="text-xs text-slate-500 mt-0.5">Melihat unggahan foto lokasi selfie liveness check milik pekerja di luar wilayah geofence.</p>
                        </div>
                        {attendanceRecords.filter(r => r.status === 'pending' || r.isOvertimePending).length > 0 && (
                          <div className="flex items-center gap-2.5">
                            <button
                              type="button"
                              onClick={() => {
                                const pendingRecs = attendanceRecords.filter(r => r.status === 'pending' || r.isOvertimePending);
                                if (selectedPendingAttendanceIds.length === pendingRecs.length) {
                                  setSelectedPendingAttendanceIds([]);
                                } else {
                                  setSelectedPendingAttendanceIds(pendingRecs.map(r => r.id));
                                }
                              }}
                              className="text-xs bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 font-semibold py-1.5 px-3 rounded-lg transition cursor-pointer"
                            >
                              {selectedPendingAttendanceIds.length === attendanceRecords.filter(r => r.status === 'pending').length ? 'Batal Pilih Semua' : 'Pilih Semua'}
                            </button>
                            {selectedPendingAttendanceIds.length > 0 && (
                              <button
                                type="button"
                                onClick={handleBulkApproveAttendance}
                                disabled={isBulkApprovingAttendance}
                                className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 px-4 rounded-lg shadow-sm transition flex items-center gap-1 cursor-pointer animate-pulse"
                              >
                                {isBulkApprovingAttendance ? 'Memproses...' : `Sahkan Massal (${selectedPendingAttendanceIds.length})`}
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="p-5 space-y-4">
                        {attendanceRecords.filter(r => r.status === 'pending').length > 0 ? (
                          attendanceRecords.filter(r => r.status === 'pending').map((rec) => (
                            <div key={rec.id} className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 flex flex-col gap-4">
                              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                <div className="flex gap-4 items-center">
                                  <input
                                    type="checkbox"
                                    checked={selectedPendingAttendanceIds.includes(rec.id)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedPendingAttendanceIds([...selectedPendingAttendanceIds, rec.id]);
                                      } else {
                                        setSelectedPendingAttendanceIds(selectedPendingAttendanceIds.filter(id => id !== rec.id));
                                      }
                                    }}
                                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer shrink-0"
                                  />
                                  {/* Captured Selfie Preview */}
                                  <div className="w-16 h-16 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 flex items-center justify-center shrink-0">
                                    {rec.livenessPhotoUrl ? (
                                      <img src={rec.livenessPhotoUrl} alt="Liveness Selfie" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                    ) : (
                                      <Camera className="w-6 h-6 text-slate-400 animate-pulse" />
                                    )}
                                  </div>

                                  <div>
                                    <h5 className="font-bold text-slate-800 text-sm capitalize">{rec.username} <span className="text-[10px] text-slate-400 font-normal">({rec.division})</span></h5>
                                    <p className="text-xs text-amber-600 font-semibold font-mono mt-0.5">{rec.date} @ {rec.checkInTime}</p>
                                    <div className="flex gap-3 text-[10px] text-slate-400 mt-2 font-mono">
                                      <span>🌐 Lat/Lng: {rec.checkInLat.toFixed(4)}, {rec.checkInLng.toFixed(4)}</span>
                                    </div>
                                    {/* SOP 2026 Auto-recommendation badge */}
                                    <div className="mt-2.5 flex items-center gap-1.5 text-[10px] bg-blue-50 text-blue-800 border border-blue-100 rounded-lg px-2.5 py-1 max-w-md">
                                      <span className="font-bold">✨ Sistem Auto-isi SOP:</span>
                                      <span>
                                        Denda: <b className="font-mono">{getApprovalForm(rec.id).fineMode === 'free' ? 'Rp 0' : formatIDRCurrency(getApprovalForm(rec.id).customFineValue || 0)}</b>
                                        {getApprovalForm(rec.id).quotaDeduction !== 'none' && (
                                          <> | Potong Jatah: <b className="font-mono">{getApprovalForm(rec.id).quotaDeduction}</b></>
                                        )}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex gap-2 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const form = getApprovalForm(rec.id);
                                      handleApproveAttendance(rec.id, 'approve', form.classification, form.quotaDeduction, form.fineMode, form.customFineValue);
                                    }}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs py-2 px-3.5 rounded-lg transition flex items-center gap-1 cursor-pointer animate-fade-in"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>Sah kan</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleApproveAttendance(rec.id, 'reject')}
                                    className="border border-rose-200 hover:bg-rose-50 text-rose-600 font-semibold text-xs py-2 px-3.5 rounded-lg transition cursor-pointer"
                                  >
                                    Tolak
                                  </button>
                                </div>
                              </div>

                              {/* CONFIGURATION SUB-PANEL (SOP 2026 Admin Decision Logic) */}
                              <div className="border-t border-slate-200/60 pt-3 space-y-3">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                  {/* Classification */}
                                  <div className="space-y-1 animate-fade-in">
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Klasifikasi Absensi</label>
                                    <select
                                      value={getApprovalForm(rec.id).classification}
                                      onChange={(e) => updateApprovalForm(rec.id, { classification: e.target.value as any })}
                                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-medium cursor-pointer"
                                    >
                                      <option value="standard">Absen Biasa (Geofence)</option>
                                      <option value="manual">Absen Manual / Tugas Luar</option>
                                      <option value="emergency">Absen Darurat (Ban bocor/mogok/hujan)</option>
                                    </select>
                                  </div>

                                  {/* Quota Deduction */}
                                  <div className="space-y-1 animate-fade-in">
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Pemotongan Jatah akibat Telat / Diluar Area</label>
                                    <select
                                      value={getApprovalForm(rec.id).quotaDeduction}
                                      onChange={(e) => updateApprovalForm(rec.id, { quotaDeduction: e.target.value as any })}
                                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-medium cursor-pointer"
                                    >
                                      <option value="none">Tanpa Potong Jatah (Dispensasi / Bebas)</option>
                                      <option value="telat">Potong Jatah Telat</option>
                                      <option value="telatDarurat">Potong Jatah Telat Darurat</option>
                                      <option value="libur">Potong Jatah Libur (1 Hari)</option>
                                    </select>
                                  </div>

                                  {/* Fine Mode */}
                                  <div className="space-y-1 animate-fade-in">
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Sanksi Denda</label>
                                    <select
                                      value={getApprovalForm(rec.id).fineMode}
                                      onChange={(e) => updateApprovalForm(rec.id, { fineMode: e.target.value as any })}
                                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-medium cursor-pointer"
                                    >
                                      <option value="auto">Denda Otomatis Berjenjang (SOP 2026)</option>
                                      <option value="free">Bebas Sanksi Denda (Rp 0)</option>
                                      <option value="custom">Nominal Denda Kustom</option>
                                    </select>
                                  </div>
                                </div>

                                {getApprovalForm(rec.id).fineMode === 'custom' && (
                                  <div className="space-y-1 max-w-[200px] animate-fade-in">
                                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Nominal Denda Kustom (IDR)</label>
                                    <input
                                      type="number"
                                      value={getApprovalForm(rec.id).customFineValue}
                                      onChange={(e) => updateApprovalForm(rec.id, { customFineValue: Number(e.target.value || 0) })}
                                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-mono font-bold"
                                      placeholder="Rp 50.000"
                                    />
                                  </div>
                                )}
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-slate-400 text-center py-6 text-xs italic">Tidak ada verifikasi liveness tertunda.</p>
                        )}
                      </div>
                    </div>

                    {/* 3. Leave Requests Approvals with conflict indicator */}
                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                      <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                        <h4 className="font-display font-bold text-sm text-slate-800">Antrean Persetujuan Libur / Libur</h4>
                        <p className="text-xs text-slate-500 mt-0.5">Memantau libur terjadwal. Konflik divisi yang sama ditandai otomatis untuk tinjauan administrator.</p>
                      </div>

                      <div className="p-5 space-y-4">
                        {leaveRequests.filter(l => l.status === 'pending').length > 0 ? (
                          leaveRequests.filter(l => l.status === 'pending').map((leave) => {
                            // Find conflict indicators
                            const conflict = leaveRequests.some(
                              (approved) => approved.id !== leave.id && approved.date === leave.date && approved.division === leave.division && approved.status === 'approved'
                            );

                            return (
                              <div key={leave.id} className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-6">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <h5 className="font-bold text-slate-800 text-sm capitalize">{leave.username}</h5>
                                    <span className="bg-blue-50 text-blue-600 font-semibold px-2 py-0.5 rounded text-[9px]">{leave.division}</span>
                                  </div>
                                  <p className="text-xs text-slate-500">Pengajuan Tanggal: <b className="text-blue-600 font-mono">{leave.date}</b></p>
                                  <p className="text-xs text-slate-400 italic">" {leave.notes} "</p>

                                  {conflict && (
                                    <div className="mt-2.5 flex items-center gap-1.5 text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg max-w-sm">
                                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                      <span>Konflik: Tanggal ini sudah dikunci oleh pekerja lain sedivisi.</span>
                                    </div>
                                  )}
                                </div>

                                <div className="flex flex-col gap-3 w-full md:w-auto md:items-end">
                                  {/* Optional Admin Remarks input */}
                                  <div className="w-full md:w-64">
                                    <label htmlFor={`remarks-${leave.id}`} className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Catatan Admin / Remarks (Opsional)</label>
                                    <input
                                      id={`remarks-${leave.id}`}
                                      type="text"
                                      placeholder="Umpan balik / alasan..."
                                      value={leaveRemarks[leave.id] || ''}
                                      onChange={(e) => setLeaveRemarks({ ...leaveRemarks, [leave.id]: e.target.value })}
                                      className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                                    />
                                  </div>

                                  <div className="flex gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleApproveLeaveRequest(leave.id, true, leaveRemarks[leave.id])}
                                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs py-2 px-3.5 rounded-lg transition cursor-pointer"
                                    >
                                      Izinkan Libur
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleApproveLeaveRequest(leave.id, false, leaveRemarks[leave.id])}
                                      className="border border-slate-200 hover:bg-slate-50 text-slate-500 font-semibold text-xs py-2 px-3.5 rounded-lg transition cursor-pointer"
                                    >
                                      Tolak
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <p className="text-slate-400 text-center py-6 text-xs italic">Tidak ada pengajuan libur tertunda.</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* ----------------------------------------------------------------------
                   SUBTAB: WORKSPACE LOCATION MANAGER (GEOFENCES CRUD)
                   ---------------------------------------------------------------------- */}
                {adminSubTab === 'locations' && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-slate-800 animate-fade-in">
                    
                    {/* Add / Edit Location form */}
                    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm h-fit">
                      <h4 className="font-display font-semibold text-sm text-slate-900 mb-4 flex items-center gap-1.5">
                        <Building2 className="w-4 h-4 text-blue-500" />
                        <span>{editingLocationId ? 'Ubah Koordinat Kantor' : 'Tambah Koordinat Kantor Baru'}</span>
                      </h4>

                      <form onSubmit={handleAddLocation} className="space-y-4">
                        <div className="space-y-1">
                          <label htmlFor="loc-name-input" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nama Kantor / Gudang</label>
                          <input
                            id="loc-name-input"
                            required
                            type="text"
                            placeholder="Gudang Bekasi Hub"
                            value={newLocationName}
                            onChange={(e) => setNewLocationName(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-sans"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label htmlFor="loc-lat-input" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Latitude GPS</label>
                            <input
                              id="loc-lat-input"
                              required
                              type="number"
                              step="any"
                              placeholder="-6.2349"
                              value={newLocationLat}
                              onChange={(e) => setNewLocationLat(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-mono"
                            />
                          </div>
                          <div className="space-y-1">
                            <label htmlFor="loc-lng-input" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Longitude GPS</label>
                            <input
                              id="loc-lng-input"
                              required
                              type="number"
                              step="any"
                              placeholder="106.9896"
                              value={newLocationLng}
                              onChange={(e) => setNewLocationLng(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-mono"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label htmlFor="loc-radius-input" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Radius Geofence (Meter)</label>
                          <input
                            id="loc-radius-input"
                            required
                            type="number"
                            placeholder="150"
                            value={newLocationRadius}
                            onChange={(e) => setNewLocationRadius(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-mono"
                          />
                        </div>

                        <div className="pt-2 space-y-2">
                          <button
                            type="button"
                            onClick={handleUseCurrentLocationForGeofence}
                            className="w-full border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs py-2 rounded-lg font-medium transition flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <MapPin className="w-3.5 h-3.5 text-blue-500" />
                            <span>Ambil Koordinat Saya Saat Ini</span>
                          </button>

                          <div className="flex gap-2">
                            <button
                              type="submit"
                              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2 rounded-lg shadow-sm transition cursor-pointer"
                            >
                              {editingLocationId ? 'Simpan' : 'Tambahkan'}
                            </button>
                            {editingLocationId && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingLocationId(null);
                                  setNewLocationName('');
                                  setNewLocationLat('');
                                  setNewLocationLng('');
                                  setNewLocationRadius('150');
                                }}
                                className="border border-slate-200 text-slate-500 py-2 px-3 rounded-lg text-xs cursor-pointer"
                              >
                                Batal
                              </button>
                            )}
                          </div>
                        </div>
                      </form>
                    </div>

                    {/* Locations Grid */}
                    <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between space-y-6 shadow-sm">
                      <div>
                        <h4 className="font-display font-semibold text-sm text-slate-900 mb-1">Daftar Wilayah Kerja Terdaftar</h4>
                        <p className="text-xs text-slate-500">Berikut adalah daftar cabang / gudang tempat presensi geofence diaktifkan.</p>
                      </div>

                      <div className="space-y-3.5 max-h-[350px] overflow-y-auto custom-scrollbar pr-1">
                        {locations.length > 0 ? (
                          locations.map(loc => (
                            <div key={loc.id} className="border border-slate-200 bg-slate-50/50 p-4 rounded-xl flex items-center justify-between gap-4 hover:border-slate-300 transition">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center">
                                  <Building2 className="w-4 h-4" />
                                </div>
                                <div>
                                  <p className="text-xs font-bold text-slate-800">{loc.name}</p>
                                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                                    Lat: {loc.lat} | Lng: {loc.lng} | R: {loc.radiusMeter}m
                                  </p>
                                </div>
                              </div>

                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleEditLocationSelect(loc)}
                                  className="p-1.5 hover:bg-blue-50 rounded text-slate-400 hover:text-blue-600 transition cursor-pointer"
                                  title="Ubah Koordinat"
                                >
                                  <Settings className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteLocation(loc.id)}
                                  className="p-1.5 hover:bg-rose-50 rounded text-slate-400 hover:text-rose-600 transition cursor-pointer"
                                  title="Hapus Lokasi"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-slate-400 text-center py-6 text-xs italic">Belum ada wilayah kerja terdaftar.</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* ----------------------------------------------------------------------
                   SUBTAB: DEVICE LOCKS MANAGEMENT (UNBIND CODES)
                   ---------------------------------------------------------------------- */}
                {adminSubTab === 'unbind' && (
                  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm animate-fade-in text-slate-800">
                    <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                      <h4 className="font-display font-bold text-sm text-slate-900">Kunci Keamanan Perangkat Karyawan</h4>
                      <p className="text-xs text-slate-500 mt-0.5">Mencegah manipulasi absen dengan mengunci absensi pekerja ke 1 ID perangkat fisik (fingerprint browser).</p>
                    </div>

                    <div className="p-3 overflow-x-auto custom-scrollbar border border-slate-100 rounded-lg">
                      <table className="w-full text-left border-collapse text-[11px]">
                        <thead>
                          <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 font-mono text-[10px] uppercase tracking-wider">
                            <th className="py-1.5 px-3">Karyawan</th>
                            <th className="py-1.5 px-3">Divisi / Posisi</th>
                            <th className="py-1.5 px-3">Locked Device Fingerprint</th>
                            <th className="py-1.5 px-3">Tindakan</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {allWorkers.map((worker) => (
                            <tr key={worker.id} className="hover:bg-blue-50/40 text-slate-700 transition-colors duration-150">
                              <td className="py-1.5 px-3 font-bold capitalize text-slate-800">{worker.username}</td>
                              <td className="py-1.5 px-3 text-slate-600">{worker.division} / <span className="text-slate-400">{worker.position}</span></td>
                              <td className="py-1.5 px-3 font-mono text-[10px] text-slate-500">
                                {worker.lastCheckInDevice ? (
                                  <span className="text-blue-600 font-semibold bg-blue-50 border border-blue-100 py-0.5 px-1.5 rounded">
                                    {worker.lastCheckInDevice}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 italic">Belum terikat perangkat</span>
                                )}
                              </td>
                              <td className="py-1.5 px-3">
                                {worker.lastCheckInDevice ? (
                                  <button
                                    type="button"
                                    onClick={() => handleUnbindUserDevice(worker.id)}
                                    className="bg-rose-50 hover:bg-rose-100/50 text-rose-600 border border-rose-200 font-semibold text-[9px] py-0.5 px-2 rounded transition flex items-center gap-1 cursor-pointer"
                                  >
                                    <Unlock className="w-2.5 h-2.5" />
                                    <span>Unbind Device</span>
                                  </button>
                                ) : (
                                  <span className="text-slate-400 font-semibold">-</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* ----------------------------------------------------------------------
                   SUBTAB: BROADCAST ANNOUNCEMENTS MANAGER
                   ---------------------------------------------------------------------- */}
                {adminSubTab === 'announcements' && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-slate-800 animate-fade-in">
                    
                    {/* Add announcement */}
                    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm h-fit">
                      <h4 className="font-display font-semibold text-sm text-slate-900 mb-4 flex items-center gap-1.5">
                        <Bell className="w-4 h-4 text-blue-500" />
                        <span>Kirim Siaran Pengumuman</span>
                      </h4>

                      <form onSubmit={handleAddAnnouncement} className="space-y-4">
                        <div className="space-y-1">
                          <label htmlFor="ann-title-input" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Judul Informasi</label>
                          <input
                            id="ann-title-input"
                            required
                            type="text"
                            placeholder="Aturan Libur Bersama"
                            value={newAnnTitle}
                            onChange={(e) => setNewAnnTitle(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                          />
                        </div>

                        <div className="space-y-1">
                          <label htmlFor="ann-content-input" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Isi Pengumuman</label>
                          <textarea
                            id="ann-content-input"
                            required
                            rows={3}
                            placeholder="Ketik pengumuman penting bagi seluruh pekerja..."
                            value={newAnnContent}
                            onChange={(e) => setNewAnnContent(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label htmlFor="ann-start-input" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Berlaku Mulai</label>
                            <input
                              id="ann-start-input"
                              required
                              type="date"
                              value={newAnnStartDate}
                              onChange={(e) => setNewAnnStartDate(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                            />
                          </div>
                          <div className="space-y-1">
                            <label htmlFor="ann-end-input" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Selesai Siaran</label>
                            <input
                              id="ann-end-input"
                              required
                              type="date"
                              value={newAnnEndDate}
                              onChange={(e) => setNewAnnEndDate(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                            />
                          </div>
                        </div>

                        <button
                          type="submit"
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2 rounded-lg transition cursor-pointer"
                        >
                          Siarkan ke Seluruh Pekerja
                        </button>
                      </form>
                    </div>

                    {/* Announcements list */}
                    <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between space-y-6 shadow-sm">
                      <div>
                        <h4 className="font-display font-semibold text-sm text-slate-900 mb-1">Riwayat Siaran Pengumuman</h4>
                        <p className="text-xs text-slate-500">Pengumuman aktif akan muncul sebagai banner diatas halaman dashboard karyawan.</p>
                      </div>

                      <div className="space-y-4 max-h-[350px] overflow-y-auto custom-scrollbar pr-1">
                        {announcements.length > 0 ? (
                          announcements.map(ann => (
                            <div key={ann.id} className="border border-slate-200 bg-slate-50/50 p-4 rounded-xl flex items-start justify-between gap-4">
                              <div className="space-y-1 flex-1">
                                <div className="flex items-center gap-2">
                                  <h5 className="font-bold text-slate-800 text-xs">{ann.title}</h5>
                                </div>
                                <p className="text-[11px] text-slate-500 leading-normal">{ann.content}</p>
                                <p className="text-[9px] text-slate-400 font-mono pt-1">
                                  📅 Aktif: {ann.startDate} s/d {ann.endDate} | Pembuat: {ann.createdBy}
                                </p>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleDeleteAnnouncement(ann.id)}
                                className="p-1.5 hover:bg-rose-50 rounded text-slate-400 hover:text-rose-600 transition shrink-0 cursor-pointer"
                                title="Hapus Pengumuman"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))
                        ) : (
                          <p className="text-slate-400 text-center py-6 text-xs italic">Belum ada pengumuman disiarkan.</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* ----------------------------------------------------------------------
                   SUBTAB: DYNAMIC SETTINGS (FINES & APP CUSTOMIZATION)
                   ---------------------------------------------------------------------- */}
                {adminSubTab === 'settings' && (
                  <div className="max-w-2xl mx-auto bg-white border border-slate-200 rounded-xl p-8 shadow-sm animate-fade-in text-slate-800">
                    <h4 className="font-display font-bold text-base text-slate-900 mb-6 flex items-center gap-1.5">
                      <Settings className="w-5 h-5 text-blue-500" />
                      <span>Atur Branding & Parameter Keuangan</span>
                    </h4>

                    <form onSubmit={handleSaveConfig} className="space-y-6">
                      
                      {/* Section: Branding */}
                      <div className="space-y-4 border-b border-slate-200 pb-5">
                        <h5 className="text-xs font-bold text-blue-600 uppercase tracking-widest font-mono">Branding Kustomisasi</h5>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label htmlFor="set-app-name" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nama Aplikasi</label>
                            <input
                              id="set-app-name"
                              required
                              type="text"
                              value={settingsAppName}
                              onChange={(e) => setSettingsAppName(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label htmlFor="set-app-logo" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Logo URL Aplikasi</label>
                            <input
                              id="set-app-logo"
                              required
                              type="text"
                              value={settingsAppLogo}
                              onChange={(e) => setSettingsAppLogo(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-mono"
                            />
                          </div>
                        </div>
                      </div>

                                              {/* Section: Fines & Bonuses (Removed legacy inputs) */}
                        <div className="space-y-4">
                          <h5 className="text-xs font-bold text-blue-600 uppercase tracking-widest font-mono flex items-center gap-1.5">
                            <Landmark className="w-4 h-4" />
                            <span>Parameter Keuangan Absensi (Aturan Dinamis)</span>
                          </h5>

                          <p className="text-[11px] text-slate-500">Gunakan Aturan Dinamis di bawah ini untuk mengatur denda, bonus, dan lembur secara fleksibel berdasarkan jam.</p>

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
                                    <option value="denda">Denda (-)</option>
                                    <option value="bonus">Bonus (+)</option>
                                    <option value="lembur">Lembur (+)</option>
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
                              }} className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-1.5 px-3 rounded flex items-center gap-1 cursor-pointer">
                                <Plus className="w-3 h-3" /> Tambah Aturan Kustom
                              </button>
                            </div>
                          </div>
                        </div>

                      <button
                        type="submit"
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2.5 rounded-lg transition cursor-pointer"
                      >
                        Simpan Semua Pengaturan Platform
                      </button>
                    </form>
                  </div>
                )}

                {adminSubTab === 'logs' && (
                  <div className="space-y-6 animate-fade-in text-slate-800">
                    <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-xl flex flex-col h-[600px]">
                      <div className="p-4 border-b border-slate-700 bg-slate-800/80 flex items-center justify-between">
                        <div>
                          <h4 className="font-display font-bold text-sm text-slate-200 flex items-center gap-2">
                            <Terminal className="w-4 h-4 text-blue-400" /> Unified Server & Client Logs
                          </h4>
                          <p className="text-[10px] text-slate-400 mt-1">Real-time combined logs from the PM2 Node Server and active Web/APK clients.</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(debugLogs.join('\n'));
                              showCustomAlert("Logs copied to clipboard.", "Copied");
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-mono text-[10px] px-3 py-1.5 rounded transition"
                          >
                            Copy Logs
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              await fetch('/api/admin/logs/clear', { method: 'POST' });
                              setDebugLogs([]);
                            }}
                            className="bg-rose-600/20 hover:bg-rose-600/40 text-rose-400 font-mono text-[10px] px-3 py-1.5 rounded transition"
                          >
                            Clear Logs
                          </button>
                        </div>
                      </div>

                      <div className="flex-1 p-4 overflow-y-auto font-mono text-[10px] sm:text-xs text-slate-300 space-y-1 bg-slate-950 custom-scrollbar">
                        {debugLogs.length > 0 ? (
                          debugLogs.map((log, i) => (
                            <div key={i} className={`whitespace-pre-wrap break-words ${
                              log.includes('[ERROR]') ? 'text-rose-400' :
                              log.includes('[WARN]') ? 'text-amber-400' :
                              log.includes('[CLIENT]') ? 'text-blue-300' : 'text-slate-300'
                            }`}>
                              {log}
                            </div>
                          ))
                        ) : (
                          <div className="text-slate-600 text-center h-full flex flex-col items-center justify-center">
                            <Terminal className="w-8 h-8 mb-2 opacity-50" />
                            <p>No system logs recorded yet.</p>
                            <p className="text-[9px] mt-1">Waiting for incoming server or client dispatches...</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* ----------------------------------------------------------------------
                   SUBTAB: REPORTS DATA EXPORT
                   ---------------------------------------------------------------------- */}
                {adminSubTab === 'export' && (
                  <div className="space-y-6 animate-fade-in">
                    <ReportExport
                      records={attendanceRecords}
                      workers={allWorkers}
                    />
                  </div>
                )}

                {/* ----------------------------------------------------------------------
                   SUBTAB: KELOLA PEGAWAI
                   ---------------------------------------------------------------------- */}
                {adminSubTab === 'users' && (
                  <div className="space-y-6 animate-fade-in text-slate-800">
                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                      <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                        <h4 className="font-display font-bold text-sm text-slate-800">Kelola Pegawai Aktif</h4>
                        <p className="text-xs text-slate-500 mt-0.5">Atur detail pegawai, termasuk jatah libur dan bonus bulanan yang spesifik.</p>
                      </div>

                      <div className="p-3 overflow-x-auto custom-scrollbar border border-slate-100 rounded-lg">
                        <table className="w-full text-left border-collapse text-[11px]">
                          <thead>
                            <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 font-mono text-[10px] uppercase tracking-wider">
                              <th className="py-1.5 px-3">Pegawai</th>
                              <th className="py-1.5 px-3">Posisi</th>
                              <th className="py-1.5 px-3">Jatah Libur / Bulan</th>
                              <th className="py-1.5 px-3">Tindakan</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {allWorkers.map((worker) => (
                              <tr key={worker.id} className="hover:bg-blue-50/40 text-slate-700 transition-colors duration-150">
                                <td className="py-1.5 px-3">
                                  <div className="flex items-center gap-2">
                                    <img src={worker.photoUrl} alt="Avatar" className="w-6 h-6 rounded-full" />
                                    <span className="font-bold capitalize text-slate-800">{worker.username}</span>
                                  </div>
                                </td>
                                <td className="py-1.5 px-3 text-slate-600">{worker.division} <br/><span className="text-[9px] text-slate-400">{worker.position}</span></td>
                                <td className="py-1.5 px-3 font-mono text-[10px]">
                                  {worker.leaveQuota.libur} Hari
                                </td>
                                <td className="py-1.5 px-3 flex gap-1">
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      const newLibur = prompt("Masukkan jumlah jatah libur baru untuk " + worker.username, String(worker.leaveQuota.libur));
                                      if (newLibur !== null) {
                                        const res = await fetch('/api/users/update-quota', {
                                          method: 'POST',
                                          headers: { 'Content-Type': 'application/json' },
                                          body: JSON.stringify({ userId: worker.id, libur: Number(newLibur) })
                                        });
                                        if (res.ok) {
                                          showCustomAlert("Pengaturan jatah libur khusus untuk " + worker.username + " berhasil disimpan: " + newLibur + " hari.", "Sukses");
                                          fetchAllWorkers();
                                          syncCurrentUser();
                                        }
                                      }
                                    }}
                                    className="bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 font-semibold text-[9px] py-0.5 px-2 rounded transition cursor-pointer"
                                  >
                                    Atur Jatah Libur
                                  </button>
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      if (confirm(`Apakah Anda yakin ingin menghapus akun ${worker.username}?`)) {
                                        const res = await fetch('/api/users/delete', {
                                          method: 'POST',
                                          headers: { 'Content-Type': 'application/json' },
                                          body: JSON.stringify({ userId: worker.id })
                                        });
                                        if (res.ok) {
                                          showCustomAlert("Akun berhasil dihapus.", "Sukses");
                                          fetchAllWorkers();
                                        }
                                      }
                                    }}
                                    className="bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 font-semibold text-[9px] py-0.5 px-2 rounded transition cursor-pointer"
                                  >
                                    Hapus
                                  </button>
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      const time = prompt("Jam Pulang Cepat (HH:MM):", "16:00");
                                      if (!time) return;
                                      const note = prompt("Keterangan Pulang Cepat:", "Pulang karena sakit");
                                      if (note === null) return;
                                      try {
                                        const res = await fetch('/api/admin/manual-checkout', {
                                          method: 'POST',
                                          headers: { 'Content-Type': 'application/json' },
                                          body: JSON.stringify({ userId: worker.id, timeStr: time, note })
                                        });
                                        if (res.ok) { showCustomAlert("Berhasil.", "Sukses"); fetchAllWorkers(); fetchAttendanceHistory(); syncCurrentUser(); }
                                      } catch (e) {}
                                    }}
                                    className="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-200 font-semibold text-[9px] py-0.5 px-2 rounded transition cursor-pointer"
                                  >
                                    Pulang Cepat (Manual)
                                  </button>
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      if (worker.role === 'admin') return showCustomAlert("Tidak dapat menghapus admin utama.", "Error");
                                      if (window.confirm(`Yakin ingin ${worker.disabled ? 'mengaktifkan' : 'menonaktifkan'} ${worker.username}?`)) {
                                          try {
                                              const res = await fetch(`/api/admin/users/${worker.id}/toggle-disable`, { method: 'POST' });
                                              const data = await res.json();
                                              if (res.ok) { showCustomAlert(`Akun berhasil ${data.disabled ? 'dinonaktifkan' : 'diaktifkan'}.`, "Sukses"); fetchAllWorkers(); }
                                              else showCustomAlert(data.error || "Gagal.", "Error");
                                          } catch(e) {}
                                      }
                                    }}
                                    className={`${worker.disabled ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border-emerald-200' : 'bg-amber-50 hover:bg-amber-100 text-amber-600 border-amber-200'} border font-semibold text-[9px] py-0.5 px-2 rounded transition cursor-pointer`}
                                  >
                                    {worker.disabled ? 'Aktifkan' : 'Nonaktifkan'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      if (worker.role === 'admin') return showCustomAlert("Tidak dapat menghapus admin utama.", "Error");
                                      if (window.confirm(`Yakin ingin MENGHAPUS ${worker.username} secara permanen?`)) {
                                          try {
                                              const res = await fetch(`/api/admin/users/${worker.id}`, { method: 'DELETE' });
                                              if (res.ok) { showCustomAlert("Akun berhasil dihapus.", "Sukses"); fetchAllWorkers(); }
                                              else { const data = await res.json(); showCustomAlert(data.error || "Gagal menghapus.", "Error"); }
                                          } catch(e) {}
                                      }
                                    }}
                                    className="bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 font-semibold text-[9px] py-0.5 px-2 rounded transition cursor-pointer"
                                  >
                                    Hapus
                                  </button>
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      const disabled = !worker.disabled;
                                      const res = await fetch('/api/users/disable', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ userId: worker.id, disabled })
                                      });
                                      if (res.ok) {
                                        showCustomAlert(`Akun berhasil ${disabled ? 'dinonaktifkan' : 'diaktifkan'}.`, "Sukses");
                                        fetchAllWorkers();
                                      }
                                    }}
                                    className="bg-amber-50 hover:bg-amber-100 text-amber-600 border border-amber-200 font-semibold text-[9px] py-0.5 px-2 rounded transition cursor-pointer"
                                  >
                                    {worker.disabled ? 'Aktifkan' : 'Nonaktifkan'}
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* ----------------------------------------------------------------------
                   SUBTAB: INFO AKUN DEMO
                   ---------------------------------------------------------------------- */}
                {adminSubTab === 'demo' && (
                  <div className="space-y-6 animate-fade-in text-slate-800">
                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm p-6">
                      <h4 className="font-display font-bold text-sm text-slate-800 flex items-center gap-2 mb-4">
                        <HelpCircle className="w-4 h-4 text-blue-600" />
                        Info Akun Uji Coba Demo
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[11px] font-mono">
                        <div className="p-3 border border-slate-200 bg-slate-50 rounded-lg">
                          <span className="text-blue-600 font-semibold font-sans block mb-1">⚙️ Akun Admin</span>
                          <p>ID: <b className="text-slate-800">admin@absensi.com</b></p>
                          <p>Pass: <b className="text-slate-800">admin</b></p>
                        </div>
                        <div className="p-3 border border-slate-200 bg-slate-50 rounded-lg">
                          <span className="text-blue-600 font-semibold font-sans block mb-1">👤 Akun Worker (Budi)</span>
                          <p>ID: <b className="text-slate-800">budi@absensi.com</b></p>
                          <p>Pass: <b className="text-slate-800">password</b></p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}



                {/* ----------------------------------------------------------------------
                   SUBTAB: DESTRUCTIVE SYSTEM RESET (FACTORY RESET)
                   ---------------------------------------------------------------------- */}
                {adminSubTab === 'reset' && (
                  <div className="max-w-md mx-auto bg-white border border-rose-200 rounded-xl p-8 shadow-sm text-center space-y-5 animate-fade-in">
                    <div className="w-14 h-14 bg-rose-50 text-rose-600 border border-rose-100 rounded-2xl flex items-center justify-center mx-auto p-3">
                      <Trash2 className="w-full h-full" />
                    </div>
                    
                    <h4 className="font-display font-bold text-lg text-rose-700">Proses Kembalikan ke Bawaan Pabrik</h4>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Langkah ini akan mereset database, menghapus semua catatan login, pendaftaran baru, log absensi, wilayah geofence kustom, dan mengembalikan setelan default seed ke aplikasi. Tindakan ini **tidak dapat dibatalkan**.
                    </p>

                    <button
                      type="button"
                      onClick={handleFactoryReset}
                      className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs py-3 rounded-xl transition shadow-sm cursor-pointer"
                    >
                      Konfirmasi Reset Pabrik (Factory Reset)
                    </button>
                  </div>
                )}
              </div>
            )}
          </main>

          </div> {/* End inner flex wrap */}
        </div>
      )}

      {/* Custom Dialog Overlay */}
      {customDialog.isOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-[9999] animate-fade-in text-slate-800">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full overflow-hidden p-6 space-y-4 relative">
            <button onClick={() => setCustomDialog(prev => ({ ...prev, isOpen: false }))} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            <div className="flex items-start gap-3.5">
              <div className={`p-2.5 rounded-xl shrink-0 ${
                customDialog.type === 'confirm' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'
              }`}>
                {customDialog.type === 'confirm' ? (
                  <HelpCircle className="w-5 h-5 animate-pulse" />
                ) : (
                  <Bell className="w-5 h-5" />
                )}
              </div>
              <div className="space-y-1.5 flex-1">
                <h4 className="font-display font-bold text-slate-900 text-sm">{customDialog.title}</h4>
                <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">{customDialog.message}</p>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
              {customDialog.type === 'confirm' && (
                <button
                  type="button"
                  onClick={customDialog.onCancel}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition cursor-pointer"
                >
                  Batal
                </button>
              )}
              <button
                type="button"
                onClick={customDialog.onConfirm}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition cursor-pointer shadow-sm"
              >
                {customDialog.type === 'confirm' ? 'Ya, Lanjutkan' : 'Ok'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      <div className="fixed bottom-5 right-5 flex flex-col gap-2 z-[9999] pointer-events-none max-w-sm w-full">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-xs font-semibold animate-fade-in transition-all duration-300 ${
              toast.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 shadow-emerald-100/40'
                : toast.type === 'error'
                ? 'bg-rose-50 text-rose-800 border-rose-200 shadow-rose-100/40'
                : toast.type === 'warning'
                ? 'bg-amber-50 text-amber-800 border-amber-200 shadow-amber-100/40'
                : 'bg-slate-50 text-slate-800 border-slate-200 shadow-slate-100/40'
            } ${toast.persistent ? 'ring-2 ring-offset-1 ring-slate-300' : ''}`}
          >
            <div className={`w-1.5 h-1.5 rounded-full ${
              toast.type === 'success' ? 'bg-emerald-500' : toast.type === 'error' ? 'bg-rose-500' : toast.type === 'warning' ? 'bg-amber-500' : 'bg-slate-400'
            }`} />
            <span className="flex-1 text-slate-800">{toast.message}</span>
            {toast.persistent && <span className="text-xs text-slate-500 ml-1">●</span>}
            <button
              onClick={() => dismissToast(toast.id)}
              className="text-slate-400 hover:text-slate-600 font-bold ml-2 text-sm pointer-events-auto cursor-pointer"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {/* Check In Map Modal */}
      {showCheckInMapModal && (
        <div className="fixed inset-0 z-[9997] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-display font-bold text-slate-800 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-blue-600" />
                Peta Koordinat Geofence
              </h3>
              <button onClick={() => setShowCheckInMapModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="w-full relative bg-slate-100" style={{ height: "400px", minHeight: "400px" }}>
              <MapView
                userLat={deviceLat}
                userLng={deviceLng}
                locations={locations}
              />
            </div>
            <div className="p-5 border-t border-slate-100 bg-white space-y-4">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Status Geofence:</span>
                <span className={`font-bold ${currentGeofenceStatus === 'inside' ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {currentGeofenceStatus === 'inside' ? 'Dalam Area Kantor' : 'Luar Area Kantor'}
                </span>
              </div>
              {/* Force tracking refresh */}
              <button
                type="button"
                onClick={async () => {
                   const btn = document.getElementById('btn-refresh-gps');
                   if (btn) btn.classList.add('animate-spin');
                   await trackDeviceLocation();
                   setTimeout(() => {
                     if (btn) btn.classList.remove('animate-spin');
                   }, 800);
                }}
                className="w-full border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold py-2 rounded-xl transition text-[11px] flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw id="btn-refresh-gps" className="w-4 h-4" />
                <span>Gunakan Lokasi Saat Ini (Segarkan GPS)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCheckInMapModal(false);
                  if (currentGeofenceStatus !== 'inside') {
                    startCamera();
                  } else {
                    if (mapModalAction === 'checkin') handleCheckIn(null);
                    if (mapModalAction === 'checkout') handleCheckOut(null);
                  }
                }}
                className={`w-full text-white font-semibold py-3.5 rounded-xl shadow-sm transition flex items-center justify-center gap-2.5 text-xs cursor-pointer ${mapModalAction === 'checkin' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-rose-600 hover:bg-rose-700'}`}
              >
                {mapModalAction === 'checkin' ? <CheckCircle2 className="w-4 h-4" /> : <LogOut className="w-4 h-4" />}
                <span>{currentGeofenceStatus !== 'inside' ? 'Lanjut Verifikasi Wajah (Luar Area)' : (mapModalAction === 'checkin' ? 'Konfirmasi Check-In' : 'Konfirmasi Check-Out')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
