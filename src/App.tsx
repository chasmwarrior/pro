import React, { useEffect, useState, useRef } from 'react';
import {
  Clock, User as UserIcon, Calendar as CalendarIcon, MapPin, Users, LogOut, Settings,
  CheckCircle2, AlertTriangle, Camera, ShieldAlert, FileText, RefreshCw, Bell, Plus,
  Trash2, Unlock, Globe, Building2, Upload, Lock, ShieldCheck, CreditCard, ChevronRight, ChevronLeft,
  Filter, Eye, HelpCircle, Activity, Landmark, Compass, Download, X, Palette
} from 'lucide-react';
import { User, AttendanceRecord, LeaveRequest, OfficeLocation, Announcement, AppConfig } from './types';
import MapLibreView from './components/MapLibreView';
import CalendarView from './components/CalendarView';
import ReportExport from './components/ReportExport';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

export default function App() {
  // 1. App State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'calendar' | 'profile' | 'admin' | 'inbox'>('dashboard');
  const [adminSubTab, setAdminSubTab] = useState<'radar' | 'approvals' | 'locations' | 'unbind' | 'announcements' | 'settings' | 'export' | 'reset'>('radar');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

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
  const [showPermissionPromptModal, setShowPermissionPromptModal] = useState(false);
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type: 'success' | 'error' | 'info' }>>([]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
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
  const [isAnnouncementDismissed, setIsAnnouncementDismissed] = useState<boolean>(false);
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
  useEffect(() => {
    fetchConfig();
    fetchLocations();
    fetchAnnouncements();
    syncServerTime();
    generateDeviceFingerprint();

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

  // Periodic automatic refresh of worker locations every 30 seconds
  useEffect(() => {
    if (adminSubTab !== 'radar' || !isAutoRefreshRadar) return;

    const interval = setInterval(() => {
      fetchAllWorkers();
    }, 30000);

    return () => clearInterval(interval);
  }, [adminSubTab, isAutoRefreshRadar]);

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
    // Generate simple readable mockup browser fingerprint for device binding
    const userAgent = navigator.userAgent;
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    const platform = navigator.platform || 'Unknown';
    const screenWidth = window.screen.width;
    const fingerprint = `${isMobile ? 'Mobile' : 'Desktop'}-${platform.split(' ')[0]}-${screenWidth}px`;
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

  const trackDeviceLocation = () => {
    if (!navigator.geolocation) {
      setPermissionStates(prev => ({ ...prev, gps: 'denied' }));
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setDeviceLat(pos.coords.latitude);
        setDeviceLng(pos.coords.longitude);
        setPermissionStates(prev => ({ ...prev, gps: 'granted' }));
        setIsLocating(false);
      },
      (err) => {
        // Fallback to coordinates
        setDeviceLat(-6.2088);
        setDeviceLng(106.8456);
        setPermissionStates(prev => ({ ...prev, gps: 'denied' }));
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
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
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 320;
      canvas.height = video.videoHeight || 240;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const base64Img = canvas.toDataURL('image/jpeg');
        setLivenessPhoto(base64Img);
        stopCamera();
      }
    } else {
      // Automatic fallback simulated photo using Dicebear
      const simulatedSeed = Math.random().toString(36).substring(7);
      setLivenessPhoto(`https://api.dicebear.com/7.x/identicon/svg?seed=${simulatedSeed}`);
      setShowCamera(false);
    }
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
  const handleCheckIn = async () => {
    if (!currentUser || deviceLat === null || deviceLng === null) {
      alert("GPS Anda belum terdeteksi. Silakan muat ulang halaman atau izinkan GPS.");
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
          livenessPhoto: livenessPhoto,
          isManualCheckIn,
          isEmergencyLate,
          emergencyLateReason
        })
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.outsideGeofence) {
          setIsOutsideGeofence(true);
          alert(data.error);
          startCamera();
        } else {
          alert(data.error);
        }
        return;
      }

      alert(data.message);
      setLivenessPhoto(null);
      setIsOutsideGeofence(false);
      setIsManualCheckIn(false);
      setIsEmergencyLate(false);
      setEmergencyLateReason('');
      fetchAttendanceHistory();
    } catch (e) {
      alert("Proses Check-In gagal.");
    }
  };

  const handleCheckOut = async () => {
    if (!currentUser || deviceLat === null || deviceLng === null) {
      alert("GPS Anda belum terdeteksi.");
      return;
    }

    try {
      const res = await fetch('/api/attendance/check-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          lat: deviceLat,
          lng: deviceLng
        })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error);
        return;
      }
      alert("Berhasil melakukan Check-Out untuk hari ini.");
      fetchAttendanceHistory();
    } catch (e) {
      alert("Proses Check-Out gagal.");
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
        alert(data.error);
        return;
      }
      alert(data.record?.note || "Kedatangan berhasil dikonfirmasi!");
      setIsConfirmedToBoss(false);
      fetchAttendanceHistory();
    } catch (e) {
      alert("Gagal melakukan konfirmasi kedatangan.");
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
      alert("Pekerja berhasil disetujui, ditempatkan, dan aktif.");
      setApprovalUserForm(null);
      fetchPendingWorkers();
      fetchAllWorkers();
    } else {
      alert("Gagal menyetujui pekerja.");
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

    alert(`Penyetujuan Massal Selesai: ${successCount} dari ${selectedPendingWorkerIds.length} pendaftar berhasil disetujui.`);
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
      alert("Pekerja berhasil ditolak.");
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
        showToast("Absensi berhasil disahkan!", "success");
      } else {
        showToast("Absensi berhasil ditolak.", "info");
      }
      fetchAttendanceHistory();
      fetchAllWorkers(); // Refresh quotas on admin dashboard too!
    } else {
      showToast("Gagal memproses persetujuan absensi.", "error");
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

    alert(`Persetujuan Massal Selesai: ${successCount} dari ${selectedPendingAttendanceIds.length} rekor absensi berhasil disahkan.`);
    setSelectedPendingAttendanceIds([]);
    setIsBulkApprovingAttendance(false);
    fetchAttendanceHistory();
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
      alert(editingLocationId ? "Lokasi berhasil diubah." : "Lokasi berhasil ditambahkan.");
      setNewLocationName('');
      setNewLocationLat('');
      setNewLocationLng('');
      setNewLocationRadius('150');
      setEditingLocationId(null);
      fetchLocations();
    } else {
      alert("Gagal memproses lokasi kerja.");
    }
  };

  const handleUseCurrentLocationForGeofence = () => {
    if (deviceLat !== null && deviceLng !== null) {
      setNewLocationLat(deviceLat.toString());
      setNewLocationLng(deviceLng.toString());
    } else {
      alert("GPS belum mendeteksi lokasi saat ini.");
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
        }
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
      alert("Tidak ada log riwayat kehadiran untuk diekspor.");
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
         HEADER BAR
         -------------------------------------------------------------------------- */}
      <header className="border-b border-slate-200 bg-white px-4 py-1.5 flex flex-col md:flex-row md:items-center md:justify-between gap-3 sticky top-0 z-40 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg overflow-hidden bg-blue-500/10 border border-blue-500/20 flex items-center justify-center p-1 shadow-inner">
            {config?.branding.logoUrl ? (
              <img src={config.branding.logoUrl} alt="Logo App" className="w-full h-full object-contain rounded-md" referrerPolicy="no-referrer" />
            ) : (
              <Landmark className="w-full h-full text-blue-600" />
            )}
          </div>
          <div>
            <h1 className="font-display font-bold text-sm text-slate-900 tracking-tight flex items-center gap-1">
              <span>{config?.branding.name || 'AbsenPro Nusantara'}</span>
              <span className="text-[8px] bg-blue-50 text-blue-700 border border-blue-100 font-mono py-0.2 px-1 rounded-full font-bold">PROFESIONAL</span>
            </h1>
            <p className="text-[10px] text-slate-400 font-mono leading-none">Sistem Kehadiran Geofence & Liveness Terenkripsi</p>
          </div>
        </div>

        {currentUser && (
          <div className="flex flex-wrap items-center gap-3 text-slate-800">
            {/* Server synchronized real-time ticking clock */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-0.5 flex items-center gap-2 shadow-inner">
              <Clock className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
              <div className="text-right">
                <span className="font-mono font-bold text-xs text-blue-600 block leading-tight">
                  {serverTime.toTimeString().split(' ')[0]}
                </span>
                <span className="text-[8px] text-slate-400 block leading-none">
                  {serverTime.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })} (WIB)
                </span>
              </div>
            </div>

            {/* Theme Selector Widget */}
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg p-1 shrink-0 shadow-inner">
              <Palette className="w-3.5 h-3.5 text-blue-600 ml-1 shrink-0" />
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value as any)}
                className="bg-transparent border-none text-[10px] font-bold text-slate-700 outline-none pr-1 cursor-pointer"
                title="Pilih Tema Tampilan"
              >
                <option value="blue">🔵 Biru</option>
                <option value="emerald">🟢 Hijau</option>
                <option value="rose">🔴 Mawar</option>
                <option value="dark">⚫ Slate</option>
              </select>
            </div>

            {/* Profile Dropdown Badge */}
            <div className="flex items-center gap-2 bg-slate-50 p-1 pr-3 border border-slate-200 rounded-full">
              <img
                src={currentUser.photoUrl}
                alt={currentUser.username}
                className="w-7 h-7 rounded-full object-cover border border-slate-200 bg-white"
                referrerPolicy="no-referrer"
              />
              <div className="text-left">
                <p className="text-xs font-bold text-slate-800 capitalize leading-tight">{currentUser.username}</p>
                <span className="text-[8px] font-mono text-blue-600 uppercase tracking-wide px-1 py-0.2 rounded bg-blue-50 border border-blue-100/50">
                  {currentUser.role}
                </span>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="ml-2 p-1 hover:bg-rose-50 rounded-full text-slate-400 hover:text-rose-500 transition cursor-pointer"
                title="Keluar dari Akun"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </header>

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

            {/* Predefined Accounts Assistance Card */}
            <div className="mt-8 border-t border-slate-200 pt-5 text-left bg-slate-50 -mx-8 -mb-8 p-6">
              <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
                <span>Akun Uji Coba Demo (Instan):</span>
              </h5>
              <div className="grid grid-cols-2 gap-3 text-[10px] font-mono text-slate-600">
                <div className="p-2 border border-slate-200 bg-white rounded-lg">
                  <span className="text-blue-600 font-semibold font-sans block">⚙️ Akun Admin</span>
                  <p className="mt-1">ID: <b className="text-slate-800">admin@absensi.com</b></p>
                  <p>Pass: <b className="text-slate-800">admin</b></p>
                </div>
                <div className="p-2 border border-slate-200 bg-white rounded-lg">
                  <span className="text-blue-600 font-semibold font-sans block">👤 Akun Worker (Budi)</span>
                  <p className="mt-1">ID: <b className="text-slate-800">budi@absensi.com</b></p>
                  <p>Pass: <b className="text-slate-800">password</b></p>
                </div>
              </div>
            </div>
          </div>
        </main>
      )}

      {/* --------------------------------------------------------------------------
         MAIN LAYOUT (LOGGED IN USER CONSOLE)
         -------------------------------------------------------------------------- */}
      {currentUser && (
        <div className="flex-1 flex flex-col md:flex-row">
          
          {/* --------------------------------------------------------------------------
             NAVIGATION SIDEBAR
             -------------------------------------------------------------------------- */}
          <nav className={`w-full ${isSidebarCollapsed ? 'md:w-16 md:p-1.5' : 'md:w-16 lg:w-56 md:p-1.5 lg:p-3'} border-b md:border-b-0 md:border-r border-slate-800 bg-slate-900 flex flex-row md:flex-col gap-1.5 shrink-0 md:h-[calc(100vh-57px)] sticky top-[57px] z-30 overflow-x-auto md:overflow-x-visible custom-scrollbar transition-all duration-300 ease-in-out`}>
            
            {/* Sidebar Collapse Toggle Button */}
            <div className="hidden md:flex justify-end p-1">
              <button
                type="button"
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-slate-800/80 transition cursor-pointer"
                title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
              >
                {isSidebarCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Sidebar headers */}
            <div className={`${isSidebarCollapsed ? 'hidden' : 'hidden lg:block'} px-3 py-1 text-[9px] font-bold text-slate-500 uppercase tracking-widest font-mono`}>
              Panel Navigasi
            </div>

            <button
              type="button"
              onClick={() => setActiveTab('dashboard')}
              title="Dashboard Kerja"
              className={`w-full ${isSidebarCollapsed ? 'justify-center px-2 py-2' : 'justify-center lg:justify-start px-2 lg:px-3 py-2'} rounded-lg text-xs font-semibold flex items-center gap-2.5 transition cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/10'
                  : 'hover:bg-slate-800/80 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Activity className="w-4 h-4 shrink-0" />
              <span className={isSidebarCollapsed ? 'hidden' : 'inline md:hidden lg:inline'}>Dashboard Kerja</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('calendar')}
              title="Pengajuan Libur"
              className={`w-full ${isSidebarCollapsed ? 'justify-center px-2 py-2' : 'justify-center lg:justify-start px-2 lg:px-3 py-2'} rounded-lg text-xs font-semibold flex items-center gap-2.5 transition cursor-pointer ${
                activeTab === 'calendar'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/10'
                  : 'hover:bg-slate-800/80 text-slate-400 hover:text-slate-200'
              }`}
            >
              <CalendarIcon className="w-4 h-4 shrink-0" />
              <span className={isSidebarCollapsed ? 'hidden' : 'inline md:hidden lg:inline'}>Pengajuan Libur</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('inbox')}
              title="Inbox Pengumuman"
              className={`w-full ${isSidebarCollapsed ? 'justify-center px-2 py-2' : 'justify-center lg:justify-start px-2 lg:px-3 py-2'} rounded-lg text-xs font-semibold flex items-center justify-between transition cursor-pointer ${
                activeTab === 'inbox'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/10'
                  : 'hover:bg-slate-800/80 text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Bell className="w-4 h-4 shrink-0" />
                <span className={isSidebarCollapsed ? 'hidden' : 'inline md:hidden lg:inline'}>Inbox Pengumuman</span>
              </div>
              {activeAnnouncements.length > 0 && (
                <span className="bg-rose-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 leading-none">
                  {activeAnnouncements.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              title="Profil & Password"
              className={`w-full ${isSidebarCollapsed ? 'justify-center px-2 py-2' : 'justify-center lg:justify-start px-2 lg:px-3 py-2'} rounded-lg text-xs font-semibold flex items-center gap-2.5 transition cursor-pointer ${
                activeTab === 'profile'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/10'
                  : 'hover:bg-slate-800/80 text-slate-400 hover:text-slate-200'
              }`}
            >
              <UserIcon className="w-4 h-4 shrink-0" />
              <span className={isSidebarCollapsed ? 'hidden' : 'inline md:hidden lg:inline'}>Profil & Password</span>
            </button>

            {/* Privileged Admin Menu options */}
            {(currentUser.role === 'admin' || currentUser.role === 'supervisor') && (
              <>
                <div className="hidden md:block border-t border-slate-800 my-2"></div>
                <div className={`${isSidebarCollapsed ? 'hidden' : 'hidden lg:block'} px-3 py-1 text-[9px] font-bold text-slate-500 uppercase tracking-widest font-mono`}>
                  Sistem Admin
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('admin');
                    setAdminSubTab('radar');
                  }}
                  title="Konsol Admin"
                  className={`w-full ${isSidebarCollapsed ? 'justify-center px-2 py-2' : 'justify-center lg:justify-start px-2 lg:px-3 py-2'} rounded-lg text-xs font-semibold flex items-center gap-2.5 transition cursor-pointer ${
                    activeTab === 'admin'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'hover:bg-slate-800/80 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Settings className="w-4 h-4 shrink-0" />
                  <span className={isSidebarCollapsed ? 'hidden' : 'inline md:hidden lg:inline'}>Konsol Admin</span>
                </button>
              </>
            )}

            {/* Quick user details inside sidebar */}
            <div className={`${isSidebarCollapsed ? 'hidden' : 'hidden lg:block'} mt-auto bg-slate-950/40 border border-slate-800/60 p-2.5 rounded-lg text-xs font-mono`}>
              <span className="text-[8px] text-slate-500 font-bold block mb-0.5">BOUND DEVICE ID:</span>
              <p className="text-slate-400 truncate text-[10px]" title={deviceFingerprint}>{deviceFingerprint}</p>
            </div>
          </nav>

          {/* --------------------------------------------------------------------------
             MAIN SCROLLABLE CONTENT CANVAS
             -------------------------------------------------------------------------- */}
          <main className="flex-1 p-4 overflow-y-auto max-w-full">
            
            {/* =========================================================================
               TAB: WORKER DASHBOARD
               ========================================================================= */}
            {activeTab === 'dashboard' && (
              <div className="space-y-6 animate-fade-in">

                {/* ----------------------------------------------------------------------
                   DEVICE PERMISSIONS BANNER / COMPONENT
                   ---------------------------------------------------------------------- */}
                <div className="bg-gradient-to-r from-slate-50 to-blue-50/30 border border-slate-200 rounded-xl p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
                  <div className="space-y-1">
                    <h4 className="font-display font-bold text-xs text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span>Manajer Hak Akses & Keamanan Perangkat</span>
                    </h4>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Aplikasi ini memerlukan beberapa izin perangkat agar fitur absensi geofence, deteksi liveness wajah, dan unggahan foto profil dapat berfungsi secara legal dan aman.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2.5 items-center">
                    {/* GPS Permission Pill */}
                    <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-[11px] shadow-sm">
                      <MapPin className={`w-3.5 h-3.5 ${permissionStates.gps === 'granted' ? 'text-emerald-500' : 'text-slate-400'}`} />
                      <span className="font-medium text-slate-600">GPS/Lokasi:</span>
                      {permissionStates.gps === 'granted' ? (
                        <span className="text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded text-[10px]">Aktif</span>
                      ) : (
                        <button
                          type="button"
                          onClick={requestGPSPermission}
                          className="text-blue-600 hover:text-blue-700 font-bold hover:underline cursor-pointer transition text-[10px]"
                        >
                          Minta Izin
                        </button>
                      )}
                    </div>

                    {/* Camera Permission Pill */}
                    <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-[11px] shadow-sm">
                      <Camera className={`w-3.5 h-3.5 ${permissionStates.camera === 'granted' ? 'text-emerald-500' : 'text-slate-400'}`} />
                      <span className="font-medium text-slate-600">Kamera:</span>
                      {permissionStates.camera === 'granted' ? (
                        <span className="text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded text-[10px]">Aktif</span>
                      ) : (
                        <button
                          type="button"
                          onClick={requestCameraPermission}
                          className="text-blue-600 hover:text-blue-700 font-bold hover:underline cursor-pointer transition text-[10px]"
                        >
                          Minta Izin
                        </button>
                      )}
                    </div>

                    {/* Storage / Gallery Pill */}
                    <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-[11px] shadow-sm">
                      <Upload className={`w-3.5 h-3.5 text-emerald-500`} />
                      <span className="font-medium text-slate-600">Galeri/File:</span>
                      <span className="text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded text-[10px]">Tersedia</span>
                    </div>
                  </div>
                </div>
                
                {/* Geofence / Check-In Live Module */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Left Column: Tracking Status / Controls */}
                  <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between space-y-6 shadow-sm text-slate-800">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-mono">Pencatatan Presensi</span>
                      <h3 className="font-display font-bold text-lg text-slate-900 mt-1">Presensi Hari Ini</h3>
                      <p className="text-xs text-slate-500 mt-1 leading-normal">
                        Geofence membatasi radius absensi masuk ke kantor/gudang. GPS live perangkat digunakan untuk validasi.
                      </p>
                    </div>

                    {/* Geolocation Loading Indicator */}
                    {isLocating && (
                      <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-center gap-3 text-xs text-blue-600">
                        <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                        <span>Sedang melacak koordinat GPS perangkat...</span>
                      </div>
                    )}

                    {/* Coordinates details */}
                    {!isLocating && (
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3.5 font-mono text-xs text-slate-600">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">Koordinat Anda:</span>
                          <span className="text-blue-600 font-bold">
                            {deviceLat ? `${deviceLat.toFixed(5)}, ${deviceLng?.toFixed(5)}` : 'Sinyal Tidak Terdeteksi'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center border-t border-slate-200/50 pt-2.5">
                          <span className="text-slate-400">Penempatan Kerja:</span>
                          <span className="text-slate-700 font-semibold">
                            {currentUser.division} ({currentUser.position})
                          </span>
                        </div>
                        <div className="flex justify-between items-center border-t border-slate-200/50 pt-2.5">
                          <span className="text-slate-400">Kunci Perangkat:</span>
                          <span className="text-slate-700 font-semibold">
                            {currentUser.lastCheckInDevice ? '🔒 Terkunci' : '🔓 Belum Dikunci'}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Geolocation Denied / Emulated Fallback */}
                    {permissionStates.gps === 'denied' && (
                      <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-3 text-xs text-amber-800 animate-fade-in">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <div className="space-y-1">
                            <span className="font-bold text-amber-900 block">Izin Lokasi (GPS) Terbatas / Ditolak</span>
                            <p className="text-[10px] text-amber-700 leading-relaxed font-sans">
                              Sistem gagal melacak lokasi asli Anda karena izin GPS ditolak browser. Untuk pengujian presensi geofence, silakan masukkan koordinat kustom Anda secara manual di bawah ini.
                            </p>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2.5 pt-1">
                          <div className="space-y-1">
                            <label className="block text-[9px] text-slate-500 font-bold font-sans uppercase tracking-wider">Latitude</label>
                            <input
                              type="number"
                              step="0.000001"
                              value={deviceLat !== null ? deviceLat : -6.2088}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                setDeviceLat(isNaN(val) ? null : val);
                              }}
                              className="w-full text-xs font-mono px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800"
                              placeholder="-6.2088"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="block text-[9px] text-slate-500 font-bold font-sans uppercase tracking-wider">Longitude</label>
                            <input
                              type="number"
                              step="0.000001"
                              value={deviceLng !== null ? deviceLng : 106.8456}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                setDeviceLng(isNaN(val) ? null : val);
                              }}
                              className="w-full text-xs font-mono px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800"
                              placeholder="106.8456"
                            />
                          </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setDeviceLat(-6.2088);
                              setDeviceLng(106.8456);
                            }}
                            className="px-2.5 py-1 bg-white hover:bg-slate-50 text-[10px] font-semibold text-slate-600 border border-slate-200 rounded-md transition cursor-pointer shadow-xs"
                          >
                            Reset ke Jakarta
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Check In / Out Main Buttons */}
                    <div className="space-y-4">
                      {!todayRecord ? (
                        <button
                          type="button"
                          onClick={handleCheckIn}
                          id="btn-check-in"
                          disabled={isLocating || deviceLat === null}
                          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-3.5 rounded-xl shadow-sm transition flex items-center justify-center gap-2.5 text-xs cursor-pointer"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Mulai Check-In Kerja</span>
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
                          onClick={handleCheckOut}
                          id="btn-check-out"
                          disabled={isLocating}
                          className="w-full bg-rose-600 hover:bg-rose-700 text-white font-semibold py-3 rounded-xl shadow-sm transition flex items-center justify-center gap-2.5 text-xs cursor-pointer"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>Lakukan Check-Out (Pulang)</span>
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

                      {/* Force tracking refresh */}
                      <button
                        type="button"
                        onClick={trackDeviceLocation}
                        className="w-full border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold py-2 rounded-xl transition text-[11px] flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Gunakan Lokasi Saat Ini (Segarkan GPS)</span>
                      </button>
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

                  {/* Right Column: Live GPS Maplibre View */}
                  <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm min-h-[350px] flex flex-col">
                    <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                      <span className="text-xs font-bold text-blue-600 font-display flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-blue-500" />
                        <span>Peta Koordinat Geofence Karyawan</span>
                      </span>
                      <span className="bg-white border border-slate-200 px-3 py-1 rounded-full text-[10px] text-slate-500 font-mono">
                        Active Tracker: MapLibre GL live
                      </span>
                    </div>
                    <div className="flex-1 h-full min-h-[300px]">
                      <MapLibreView
                        userLat={deviceLat}
                        userLng={deviceLng}
                        locations={locations}
                      />
                    </div>
                  </div>
                </div>

                {/* Dashboard Metrics (Quotas/Sisa jatah) */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  
                  {/* QUOTA LIBUR */}
                  <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center shadow-sm">
                      <CalendarIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Sisa Jatah Libur</span>
                      <p className="font-display font-bold text-lg text-slate-800 mt-0.5">{currentUser.leaveQuota.libur} Hari</p>
                    </div>
                  </div>

                  {/* QUOTA TELAT */}
                  <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shadow-sm">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Toleransi Telat</span>
                      <p className="font-display font-bold text-lg text-slate-800 mt-0.5">{currentUser.leaveQuota.telat} Kali</p>
                    </div>
                  </div>

                  {/* TELAT DARURAT */}
                  <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center shadow-sm">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Telat Darurat</span>
                      <p className="font-display font-bold text-lg text-slate-800 mt-0.5">{currentUser.leaveQuota.telatDarurat} Kali</p>
                    </div>
                  </div>

                  {/* PULANG CEPAT */}
                  <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center shadow-sm">
                      <LogOut className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Pulang Cepat</span>
                      <p className="font-display font-bold text-lg text-slate-800 mt-0.5">{currentUser.leaveQuota.pulangCepat} Kali</p>
                    </div>
                  </div>
                </div>

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
               TAB: CALENDAR LEAVE REQUEST SYSTEM
               ========================================================================= */}
            {activeTab === 'calendar' && (
              <div className="space-y-6 animate-fade-in">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider font-mono">Penjadwalan Libur</span>
                    <h2 className="font-display font-bold text-2xl text-slate-900 mt-1">Sistem Manajemen Cuti & Jatah Libur</h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Kunci tanggal libur Anda untuk mengunci slot jadwal kerja tim. Pengajuan konflik otomatis masuk antrean Supervisor.
                    </p>
                  </div>
                </div>

                <CalendarView
                  currentUser={currentUser}
                  leaveRequests={leaveRequests}
                  onApplyLeave={handleApplyLeave}
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
               TAB: ADMINISTRATIVE CONSOLE (ADMIN/SUPERVISOR GATES)
               ========================================================================= */}
            {activeTab === 'admin' && (
              <div className="space-y-6 animate-fade-in">
                <div className="bg-gradient-to-r from-blue-500/10 via-slate-50 to-blue-500/5 border border-blue-100 rounded-xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 text-slate-800">
                  <div>
                    <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest block font-mono">Administrative Control Panel</span>
                    <h2 className="font-display font-bold text-2xl text-slate-900 mt-1">Konsol Manajemen Platform</h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Otorisasi persetujuan, pemantauan radar pekerja realtime, konfigurasi geofence, dan ekspor pelaporan resmi.
                    </p>
                  </div>
                  <span className="bg-blue-100 text-blue-700 border border-blue-200 font-mono text-[11px] font-bold py-1 px-3.5 rounded-full uppercase">
                    ROLE: {currentUser.role}
                  </span>
                </div>

                {/* Sub-navigation Controls tabs */}
                <div className="flex flex-wrap border border-slate-200 gap-1.5 p-1 bg-slate-100 rounded-xl">
                  
                  <button
                    type="button"
                    onClick={() => setAdminSubTab('radar')}
                    className={`py-2 px-4 rounded-lg text-xs font-semibold transition flex items-center gap-2 cursor-pointer ${
                      adminSubTab === 'radar' ? 'bg-blue-600 text-white shadow-sm' : 'hover:bg-slate-200/60 text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Compass className="w-4 h-4" />
                    <span>Radar GPS Realtime</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAdminSubTab('approvals')}
                    className={`py-2 px-4 rounded-lg text-xs font-semibold transition flex items-center gap-2 relative cursor-pointer ${
                      adminSubTab === 'approvals' ? 'bg-blue-600 text-white shadow-sm' : 'hover:bg-slate-200/60 text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <ShieldAlert className="w-4 h-4" />
                    <span>Persetujuan</span>
                    {(pendingWorkers.length > 0 || attendanceRecords.filter(r => r.status === 'pending').length > 0) && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 border border-white rounded-full"></span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setAdminSubTab('locations')}
                    className={`py-2 px-4 rounded-lg text-xs font-semibold transition flex items-center gap-2 cursor-pointer ${
                      adminSubTab === 'locations' ? 'bg-blue-600 text-white shadow-sm' : 'hover:bg-slate-200/60 text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Building2 className="w-4 h-4" />
                    <span>Kelola Geofence Kantor</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAdminSubTab('unbind')}
                    className={`py-2 px-4 rounded-lg text-xs font-semibold transition flex items-center gap-2 cursor-pointer ${
                      adminSubTab === 'unbind' ? 'bg-blue-600 text-white shadow-sm' : 'hover:bg-slate-200/60 text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Unlock className="w-4 h-4" />
                    <span>Unbind Perangkat</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAdminSubTab('announcements')}
                    className={`py-2 px-4 rounded-lg text-xs font-semibold transition flex items-center gap-2 cursor-pointer ${
                      adminSubTab === 'announcements' ? 'bg-blue-600 text-white shadow-sm' : 'hover:bg-slate-200/60 text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Bell className="w-4 h-4" />
                    <span>Pengumuman</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAdminSubTab('settings')}
                    className={`py-2 px-4 rounded-lg text-xs font-semibold transition flex items-center gap-2 cursor-pointer ${
                      adminSubTab === 'settings' ? 'bg-blue-600 text-white shadow-sm' : 'hover:bg-slate-200/60 text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Settings className="w-4 h-4" />
                    <span>Branding & Denda</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAdminSubTab('export')}
                    className={`py-2 px-4 rounded-lg text-xs font-semibold transition flex items-center gap-2 cursor-pointer ${
                      adminSubTab === 'export' ? 'bg-blue-600 text-white shadow-sm' : 'hover:bg-slate-200/60 text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    <span>Ekspor Laporan</span>
                  </button>

                  {/* Factory Reset only available for true Admins */}
                  {currentUser.role === 'admin' && (
                    <button
                      type="button"
                      onClick={() => setAdminSubTab('reset')}
                      className={`py-2 px-4 rounded-lg text-xs font-semibold transition flex items-center gap-2 cursor-pointer ${
                        adminSubTab === 'reset' ? 'bg-rose-50 text-rose-700 border border-rose-200 shadow-sm' : 'hover:bg-slate-200/60 text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Reset Pabrik</span>
                    </button>
                  )}
                </div>

                {/* ----------------------------------------------------------------------
                   SUBTAB: RADAR REALTIME MAP TRACKER
                   ---------------------------------------------------------------------- */}
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
                        {/* Auto-Refresh Toggle */}
                        <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 shadow-xs">
                          <div className="flex flex-col">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-mono leading-none">Auto Refresh</span>
                            <span className="text-xs font-bold text-slate-700 mt-1">{isAutoRefreshRadar ? "Aktif (30s)" : "Nonaktif"}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setIsAutoRefreshRadar(!isAutoRefreshRadar)}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                              isAutoRefreshRadar ? 'bg-blue-600' : 'bg-slate-300'
                            }`}
                            aria-label="Toggle Auto Refresh Radar"
                          >
                            <span
                              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                                isAutoRefreshRadar ? 'translate-x-5' : 'translate-x-0'
                              }`}
                            />
                          </button>
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

                    <div className="h-[450px] rounded-2xl overflow-hidden border border-slate-200">
                      <MapLibreView
                        userLat={null}
                        userLng={null}
                        locations={locations}
                        radarMode={true}
                        workers={allWorkers}
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
                        {attendanceRecords.filter(r => r.status === 'pending').length > 0 && (
                          <div className="flex items-center gap-2.5">
                            <button
                              type="button"
                              onClick={() => {
                                const pendingRecs = attendanceRecords.filter(r => r.status === 'pending');
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
                        <h4 className="font-display font-bold text-sm text-slate-800">Antrean Persetujuan Libur / Cuti</h4>
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

                      {/* Section: Fines & Bonuses */}
                      <div className="space-y-4">
                        <h5 className="text-xs font-bold text-blue-600 uppercase tracking-widest font-mono flex items-center gap-1.5">
                          <Landmark className="w-4 h-4" />
                          <span>Parameter Keuangan Absensi</span>
                        </h5>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-1.5">
                            <label htmlFor="set-fines" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Denda Telat (IDR)</label>
                            <input
                              id="set-fines"
                              required
                              type="number"
                              value={settingsDenda}
                              onChange={(e) => setSettingsDenda(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-mono font-bold"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label htmlFor="set-bonus-tepat" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Bonus Tepat Waktu (IDR)</label>
                            <input
                              id="set-bonus-tepat"
                              required
                              type="number"
                              value={settingsBonusTepat}
                              onChange={(e) => setSettingsBonusTepat(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-mono font-bold"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label htmlFor="set-bonus-disiplin" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Disiplin Bulanan (IDR)</label>
                            <input
                              id="set-bonus-disiplin"
                              required
                              type="number"
                              value={settingsBonusDisiplin}
                              onChange={(e) => setSettingsBonusDisiplin(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-mono font-bold"
                            />
                          </div>
                        </div>

                        {/* Section: Dynamic Overtime Settings */}
                        <div className="pt-2">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Parameter Lemburan Berjenjang (IDR / Jam)</label>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <label htmlFor="set-lembur-h1" className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Lemburan Jam Ke-1 (IDR/jam)</label>
                              <input
                                id="set-lembur-h1"
                                required
                                type="number"
                                value={settingsLemburHour1}
                                onChange={(e) => setSettingsLemburHour1(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-mono font-bold"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label htmlFor="set-lembur-h2" className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Lemburan Jam Ke-2 dst (IDR/jam)</label>
                              <input
                                id="set-lembur-h2"
                                required
                                type="number"
                                value={settingsLemburHour2Onwards}
                                onChange={(e) => setSettingsLemburHour2Onwards(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-mono font-bold"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Dynamic Late Fine Tiers Documentation for SOP 2026 */}
                        <div className="mt-4 p-4 bg-slate-50 border border-slate-100 rounded-lg space-y-2">
                          <h6 className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Ketentuan Denda & Jatah Berjenjang (SOP 2026)</h6>
                          <div className="text-[11px] text-slate-500 space-y-1 font-mono leading-relaxed">
                            <div className="flex justify-between border-b border-slate-100 pb-1">
                              <span>⏱️ Telat 1 - 10 menit (10:01 - 10:10 WIB):</span>
                              <span className="font-semibold text-emerald-600">Dispensasi Rp 0</span>
                            </div>
                            <div className="flex justify-between border-b border-slate-100 pb-1">
                              <span>⏱️ Telat 11 - 30 menit (10:11 - 10:30 WIB):</span>
                              <span className="font-semibold text-amber-600">Denda Rp 5.000 / Kejadian</span>
                            </div>
                            <div className="flex justify-between border-b border-slate-100 pb-1">
                              <span>⏱️ Telat 31 - 60 menit (10:31 - 11:00 WIB):</span>
                              <span className="font-semibold text-amber-700">Denda Rp 50.000 atau Potong 0.5 Libur</span>
                            </div>
                            <div className="flex justify-between">
                              <span>⏱️ Telat &gt; 60 menit (&gt; 11:00 WIB):</span>
                              <span className="font-semibold text-rose-600">Denda Rp 100.000 atau Potong 1 Libur</span>
                            </div>
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
        </div>
      )}

      {/* Custom Dialog Overlay */}
      {customDialog.isOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-[9999] animate-fade-in text-slate-800">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full overflow-hidden p-6 space-y-4">
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
                : 'bg-slate-50 text-slate-800 border-slate-200 shadow-slate-100/40'
            }`}
          >
            <div className={`w-1.5 h-1.5 rounded-full ${
              toast.type === 'success' ? 'bg-emerald-500' : toast.type === 'error' ? 'bg-rose-500' : 'bg-slate-400'
            }`} />
            <span className="flex-1 text-slate-800">{toast.message}</span>
            <button
              onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
              className="text-slate-400 hover:text-slate-600 font-bold ml-2 text-sm pointer-events-auto cursor-pointer"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {/* Non-blocking Permission Modal Overlay */}
      {showPermissionPromptModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-[9998] animate-fade-in text-slate-800">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full overflow-hidden p-6 space-y-5">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                  <ShieldCheck className="w-5 h-5" />
                </span>
                <h3 className="font-display font-bold text-slate-900 text-sm">
                  Izin Diperlukan (SOP Absensi 2026)
                </h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Untuk mematuhi kebijakan absensi berjenjang yang ketat di bawah SOP per 1 Juli 2026, sistem memerlukan verifikasi liveness foto dan validasi koordinat GPS geofence Anda.
              </p>
            </div>

            <div className="space-y-3">
              {/* GPS Status Card */}
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`p-2 rounded-lg ${permissionStates.gps === 'granted' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                    <MapPin className="w-4 h-4" />
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">Akses Lokasi (GPS)</h4>
                    <p className="text-[10px] text-slate-500">Mencegah manipulasi geofence</p>
                  </div>
                </div>
                {permissionStates.gps === 'granted' ? (
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">Diaktifkan</span>
                ) : (
                  <button
                    type="button"
                    onClick={requestGPSPermission}
                    className="text-[10px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-md transition cursor-pointer"
                  >
                    Izinkan
                  </button>
                )}
              </div>

              {/* Camera Status Card */}
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`p-2 rounded-lg ${permissionStates.camera === 'granted' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                    <Camera className="w-4 h-4" />
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">Akses Kamera</h4>
                    <p className="text-[10px] text-slate-500">Untuk Verifikasi Liveness Lulus</p>
                  </div>
                </div>
                {permissionStates.camera === 'granted' ? (
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">Diaktifkan</span>
                ) : (
                  <button
                    type="button"
                    onClick={requestCameraPermission}
                    className="text-[10px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-md transition cursor-pointer"
                  >
                    Izinkan
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <p className="text-[10px] text-rose-500 font-semibold leading-relaxed max-w-[200px]">
                *Fitur absen masuk akan terkunci sepenuhnya jika Anda menolak izin ini.
              </p>
              <button
                type="button"
                onClick={() => setShowPermissionPromptModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition cursor-pointer"
              >
                Nanti Saja
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
