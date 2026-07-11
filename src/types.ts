export type UserRole = 'admin' | 'supervisor' | 'worker';
export type UserStatus = 'pending' | 'approved' | 'rejected';

export interface AppBranding {
  name: string;
  logoUrl: string;
}

export interface UserLeaveQuota {
  libur: number;
  telat: number;
  telatDarurat: number;
  pulangCepat: number;
}

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  division: string;
  position: string;
  photoUrl: string;
  lastCheckInDevice?: string;
  currentLat?: number;
  currentLng?: number;
  lastActiveAt?: string;
  leaveQuota: UserLeaveQuota;
  todayStatus?: 'working' | 'out_of_area' | 'offline';
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  username: string;
  division: string;
  date: string; // YYYY-MM-DD
  checkInTime: string; // HH:MM:SS
  checkInLat: number;
  checkInLng: number;
  checkInLocationName: string;
  checkOutTime?: string; // HH:MM:SS
  checkOutLat?: number;
  checkOutLng?: number;
  checkOutLocationName?: string;
  isLate: boolean;
  isEarlyOut: boolean;
  isOutsideGeofence: boolean;
  livenessPhotoUrl?: string; // Base64 string of liveness photo
  status: 'approved' | 'pending' | 'rejected';
  fineAmount: number;
  bonusAmount: number;
  note?: string;
  isManualCheckIn?: boolean;
  manualCheckInTime?: string | null;
  arrivalTimeAtWarehouse?: string | null;
  isConfirmedToBoss?: boolean;
  isEarlyOutViolation?: boolean;
  isManualViolation?: boolean;
  usedQuotaType?: 'telat' | 'telatDarurat' | 'libur' | null;
}

export interface LeaveRequest {
  id: string;
  userId: string;
  username: string;
  division: string;
  date: string; // YYYY-MM-DD
  status: 'pending' | 'approved' | 'rejected';
  notes: string;
  adminRemarks?: string;
}

export interface OfficeLocation {
  id: string;
  name: string;
  lat: number;
  lng: number;
  radiusMeter: number;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  createdBy: string;
}

export interface AppConfig {
  branding: AppBranding;
  dendaTelat: number;
  bonusTepatWaktu: number;
  bonusDisiplinBulanan: number;
  divisions: string[];
  positions: string[];
}
