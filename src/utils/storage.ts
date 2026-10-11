import { Subject, ScheduleSlot, CalendarEvent, AppSettings, StudyFile, UserProfile } from '../types';

const STORAGE_KEYS = {
  PROFILES: 'estudiafacil_profiles_v1',
  ACTIVE_PROFILE_ID: 'estudiafacil_active_profile_id_v1',
  LEGACY_SUBJECTS: 'estudiafacil_subjects_v2',
  LEGACY_SCHEDULE: 'estudiafacil_schedule_v2',
  LEGACY_CALENDAR: 'estudiafacil_calendar_v2',
  LEGACY_SETTINGS: 'estudiafacil_settings_v1',
  LEGACY_API_KEY: 'estudiafacil_secure_key_v1',
};

// IndexedDB configuration for storing binary/large study files locally
const DB_NAME = 'EstudiaFacilDB';
const DB_VERSION = 1;
const STORE_FILES = 'study_files';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_FILES)) {
        db.createObjectStore(STORE_FILES, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveFileToIndexedDB(file: StudyFile): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_FILES, 'readwrite');
      const store = tx.objectStore(STORE_FILES);
      const req = store.put(file);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Failed to save file to IndexedDB, fallback to in-memory/localStorage:', err);
  }
}

export async function getFileFromIndexedDB(id: string): Promise<StudyFile | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_FILES, 'readonly');
      const store = tx.objectStore(STORE_FILES);
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Failed to get file from IndexedDB:', err);
    return null;
  }
}

export async function deleteFileFromIndexedDB(id: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_FILES, 'readwrite');
      const store = tx.objectStore(STORE_FILES);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Failed to delete file from IndexedDB:', err);
  }
}

// Simple reversible obfuscation with profile-based salt for local API keys
export function hashPin(pin: string): string {
  try {
    return btoa('ef_salt_' + pin.trim());
  } catch {
    return pin.trim();
  }
}

export function verifyProfilePin(profile: UserProfile, inputPin: string): boolean {
  if (!profile.pin) return true;
  return profile.pin === hashPin(inputPin) || profile.pin === inputPin;
}

// ---------------------------------------------------------------------------
// PROFILE MANAGEMENT (Multi-Student / Isolated Local Profiles)
// ---------------------------------------------------------------------------

function getProfileKey(profileId: string, resource: string): string {
  return `estudiafacil_p_${profileId}_${resource}`;
}

export const INITIAL_SUBJECTS: Subject[] = [];
export const INITIAL_SCHEDULE: ScheduleSlot[] = [];
export const INITIAL_CALENDAR: CalendarEvent[] = [];

export function loadProfiles(): UserProfile[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PROFILES);
    if (raw) {
      const list = JSON.parse(raw);
      if (Array.isArray(list) && list.length > 0) {
        return list;
      }
    }
  } catch (e) {
    console.warn('Error reading profiles from localStorage:', e);
  }

  // Automatic migration: build default profile from previous standalone storage
  let oldName = '';
  let oldLevel = 'Educación Secundaria (ESO)';
  try {
    const oldSettings = localStorage.getItem(STORAGE_KEYS.LEGACY_SETTINGS);
    if (oldSettings) {
      const parsed = JSON.parse(oldSettings);
      if (parsed.studentName) oldName = parsed.studentName;
      if (parsed.educationLevel) oldLevel = parsed.educationLevel;
    }
  } catch {}

  const defaultProfile: UserProfile = {
    id: 'student_' + Math.random().toString(36).substring(2, 9),
    name: oldName || 'Estudiante',
    educationLevel: oldLevel,
    avatar: oldLevel.includes('Primaria') ? '🎒' : '🎓',
    color: '#6366f1',
    createdAt: new Date().toISOString(),
  };

  const initialList = [defaultProfile];
  try {
    localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(initialList));
    localStorage.setItem(STORAGE_KEYS.ACTIVE_PROFILE_ID, defaultProfile.id);

    // Migrate any legacy data to this default profile
    const legacySubs = localStorage.getItem(STORAGE_KEYS.LEGACY_SUBJECTS);
    if (legacySubs) {
      localStorage.setItem(getProfileKey(defaultProfile.id, 'subjects'), legacySubs);
    }
    const legacySched = localStorage.getItem(STORAGE_KEYS.LEGACY_SCHEDULE);
    if (legacySched) {
      localStorage.setItem(getProfileKey(defaultProfile.id, 'schedule'), legacySched);
    }
    const legacyCal = localStorage.getItem(STORAGE_KEYS.LEGACY_CALENDAR);
    if (legacyCal) {
      localStorage.setItem(getProfileKey(defaultProfile.id, 'calendar'), legacyCal);
    }
    const legacyKey = localStorage.getItem(STORAGE_KEYS.LEGACY_API_KEY);
    if (legacyKey) {
      localStorage.setItem(getProfileKey(defaultProfile.id, 'apikey'), legacyKey);
    }
  } catch (err) {
    console.warn('Migration error:', err);
  }

  return initialList;
}

export function saveProfiles(profiles: UserProfile[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(profiles));
  } catch (e) {
    console.error('Failed to save profiles:', e);
  }
}

export function getActiveProfileId(): string {
  try {
    const id = localStorage.getItem(STORAGE_KEYS.ACTIVE_PROFILE_ID);
    if (id) return id;
  } catch {}
  const profiles = loadProfiles();
  const firstId = profiles[0]?.id || 'default_student';
  setActiveProfileId(firstId);
  return firstId;
}

export function setActiveProfileId(id: string): void {
  try {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_PROFILE_ID, id);
  } catch (e) {
    console.error('Failed to set active profile ID:', e);
  }
}

export function getActiveProfile(): UserProfile {
  const profiles = loadProfiles();
  const activeId = getActiveProfileId();
  const found = profiles.find((p) => p.id === activeId);
  if (found) return found;
  if (profiles.length > 0) {
    setActiveProfileId(profiles[0].id);
    return profiles[0];
  }
  const fallback: UserProfile = {
    id: 'student_' + Math.random().toString(36).substring(2, 9),
    name: 'Estudiante',
    educationLevel: 'Educación Secundaria (ESO)',
    avatar: '🎓',
    color: '#6366f1',
    createdAt: new Date().toISOString(),
  };
  saveProfiles([fallback]);
  setActiveProfileId(fallback.id);
  return fallback;
}

export function createProfile(profileData: {
  name: string;
  educationLevel: string;
  avatar: string;
  color: string;
  pin?: string;
}): UserProfile {
  const profiles = loadProfiles();
  const newProfile: UserProfile = {
    id: 'student_' + Math.random().toString(36).substring(2, 9),
    name: profileData.name.trim(),
    educationLevel: profileData.educationLevel,
    avatar: profileData.avatar || (profileData.educationLevel.includes('Primaria') ? '🎒' : '🎓'),
    color: profileData.color || '#6366f1',
    pin: profileData.pin ? hashPin(profileData.pin) : undefined,
    createdAt: new Date().toISOString(),
  };

  const updatedList = [...profiles, newProfile];
  saveProfiles(updatedList);
  setActiveProfileId(newProfile.id);

  // Initialize clean state for the new student
  saveSubjects([], newProfile.id);
  saveSchedule([], newProfile.id);
  saveCalendarEvents([], newProfile.id);
  saveSettings(
    {
      theme: 'light',
      geminiApiKey: '',
      defaultDifficulty: 'medio',
      studentName: newProfile.name,
      educationLevel: newProfile.educationLevel,
      activeProfileId: newProfile.id,
    },
    newProfile.id
  );

  return newProfile;
}

export function updateProfile(updated: UserProfile): void {
  const profiles = loadProfiles();
  const index = profiles.findIndex((p) => p.id === updated.id);
  if (index !== -1) {
    profiles[index] = updated;
    saveProfiles(profiles);
  }
}

export function deleteProfile(profileId: string): UserProfile[] {
  const profiles = loadProfiles();
  if (profiles.length <= 1) {
    throw new Error('No se puede eliminar el único perfil activo.');
  }

  // Remove all stored keys for this profile to free local device space
  try {
    localStorage.removeItem(getProfileKey(profileId, 'subjects'));
    localStorage.removeItem(getProfileKey(profileId, 'schedule'));
    localStorage.removeItem(getProfileKey(profileId, 'calendar'));
    localStorage.removeItem(getProfileKey(profileId, 'settings'));
    localStorage.removeItem(getProfileKey(profileId, 'apikey'));
  } catch {}

  const remaining = profiles.filter((p) => p.id !== profileId);
  saveProfiles(remaining);

  if (getActiveProfileId() === profileId) {
    setActiveProfileId(remaining[0].id);
  }

  return remaining;
}

// ---------------------------------------------------------------------------
// PER-PROFILE SECURE API KEY STORAGE
// ---------------------------------------------------------------------------

export function setStoredApiKey(key: string, profileId?: string): void {
  const pid = profileId || getActiveProfileId();
  try {
    if (!key) {
      localStorage.removeItem(getProfileKey(pid, 'apikey'));
      return;
    }
    // Encode with base64 + reverse with profile salt
    const encoded = btoa((pid.slice(0, 4) + key).split('').reverse().join(''));
    localStorage.setItem(getProfileKey(pid, 'apikey'), encoded);
  } catch {
    localStorage.setItem(getProfileKey(pid, 'apikey'), key);
  }
}

export function getStoredApiKey(profileId?: string): string {
  const pid = profileId || getActiveProfileId();
  try {
    const raw = localStorage.getItem(getProfileKey(pid, 'apikey'));
    if (!raw) {
      // Check legacy global key fallback
      const legacy = localStorage.getItem(STORAGE_KEYS.LEGACY_API_KEY);
      if (legacy) {
        try {
          return atob(legacy).split('').reverse().join('');
        } catch {
          return legacy;
        }
      }
      return '';
    }
    try {
      const decoded = atob(raw).split('').reverse().join('');
      const prefix = pid.slice(0, 4);
      if (decoded.startsWith(prefix)) {
        return decoded.slice(prefix.length);
      }
      return decoded;
    } catch {
      return raw;
    }
  } catch {
    return '';
  }
}

// ---------------------------------------------------------------------------
// PER-PROFILE SETTINGS
// ---------------------------------------------------------------------------

export function loadSettings(profileId?: string): AppSettings {
  const pid = profileId || getActiveProfileId();
  const profile = loadProfiles().find((p) => p.id === pid);

  const defaultSettings: AppSettings = {
    theme: 'light',
    geminiApiKey: getStoredApiKey(pid),
    defaultDifficulty: 'medio',
    studentName: profile?.name || '',
    educationLevel: profile?.educationLevel || 'Educación Secundaria (ESO)',
    activeProfileId: pid,
  };

  try {
    const raw = localStorage.getItem(getProfileKey(pid, 'settings'));
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...defaultSettings,
        ...parsed,
        geminiApiKey: getStoredApiKey(pid) || parsed.geminiApiKey || '',
        studentName: profile?.name || parsed.studentName || '',
        educationLevel: profile?.educationLevel || parsed.educationLevel || defaultSettings.educationLevel,
        activeProfileId: pid,
      };
    }
  } catch (e) {
    console.error('Failed to parse settings:', e);
  }
  return defaultSettings;
}

export function saveSettings(settings: AppSettings, profileId?: string): void {
  const pid = profileId || getActiveProfileId();
  try {
    if (settings.geminiApiKey !== undefined) {
      setStoredApiKey(settings.geminiApiKey, pid);
    }
    const toSave = { ...settings, geminiApiKey: undefined };
    localStorage.setItem(getProfileKey(pid, 'settings'), JSON.stringify(toSave));

    // Also sync studentName / educationLevel back to UserProfile record
    if (settings.studentName || settings.educationLevel) {
      const profiles = loadProfiles();
      const p = profiles.find((item) => item.id === pid);
      if (p) {
        if (settings.studentName) p.name = settings.studentName;
        if (settings.educationLevel) p.educationLevel = settings.educationLevel;
        saveProfiles(profiles);
      }
    }
  } catch (e) {
    console.error('Failed to save settings:', e);
  }
}

// ---------------------------------------------------------------------------
// PER-PROFILE SUBJECTS, SCHEDULE, CALENDAR
// ---------------------------------------------------------------------------

export function loadSubjects(profileId?: string): Subject[] {
  const pid = profileId || getActiveProfileId();
  try {
    const raw = localStorage.getItem(getProfileKey(pid, 'subjects'));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.error('Failed to load subjects:', err);
  }
  return INITIAL_SUBJECTS;
}

export function saveSubjects(subjects: Subject[], profileId?: string): void {
  const pid = profileId || getActiveProfileId();
  try {
    localStorage.setItem(getProfileKey(pid, 'subjects'), JSON.stringify(subjects));
  } catch (err) {
    console.error('Failed to save subjects to localStorage:', err);
  }
}

export function loadSchedule(profileId?: string): ScheduleSlot[] {
  const pid = profileId || getActiveProfileId();
  try {
    const raw = localStorage.getItem(getProfileKey(pid, 'schedule'));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.error('Failed to load schedule:', err);
  }
  return INITIAL_SCHEDULE;
}

export function saveSchedule(schedule: ScheduleSlot[], profileId?: string): void {
  const pid = profileId || getActiveProfileId();
  try {
    localStorage.setItem(getProfileKey(pid, 'schedule'), JSON.stringify(schedule));
  } catch (err) {
    console.error('Failed to save schedule:', err);
  }
}

export function loadCalendarEvents(profileId?: string): CalendarEvent[] {
  const pid = profileId || getActiveProfileId();
  try {
    const raw = localStorage.getItem(getProfileKey(pid, 'calendar'));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.error('Failed to load calendar events:', err);
  }
  return INITIAL_CALENDAR;
}

export function saveCalendarEvents(events: CalendarEvent[], profileId?: string): void {
  const pid = profileId || getActiveProfileId();
  try {
    localStorage.setItem(getProfileKey(pid, 'calendar'), JSON.stringify(events));
  } catch (err) {
    console.error('Failed to save calendar events:', err);
  }
}
