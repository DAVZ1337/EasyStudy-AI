import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  getDocFromServer,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
  writeBatch,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import {
  Subject,
  ScheduleSlot,
  CalendarEvent,
  UserFlashcard,
  UserProfile,
  StudyFile,
} from '../types';

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// CRITICAL: The app will break without providing the database ID
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

export const googleProvider = new GoogleAuthProvider();

// ---------------------------------------------------------------------------
// CONNECTION TEST (MANDATORY IN SKILL)
// ---------------------------------------------------------------------------
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is currently offline or unreachable.');
    }
    return false;
  }
}

// Automatically test connection on boot
testFirestoreConnection();

// ---------------------------------------------------------------------------
// ERROR HANDLING (MANDATORY IN SKILL)
// ---------------------------------------------------------------------------
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// ---------------------------------------------------------------------------
// AUTHENTICATION HELPERS
// ---------------------------------------------------------------------------
export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (err: unknown) {
    console.error('Error in signInWithGoogle:', err);
    throw err;
  }
}

export async function registerWithEmail(email: string, pass: string, name: string) {
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    if (name.trim()) {
      await updateProfile(cred.user, { displayName: name.trim() });
    }
    return cred.user;
  } catch (err: unknown) {
    console.error('Error in registerWithEmail:', err);
    throw err;
  }
}

export async function loginWithEmail(email: string, pass: string) {
  try {
    const cred = await signInWithEmailAndPassword(auth, email, pass);
    return cred.user;
  } catch (err: unknown) {
    console.error('Error in loginWithEmail:', err);
    throw err;
  }
}

export async function logoutFirebase() {
  try {
    await signOut(auth);
  } catch (err: unknown) {
    console.error('Error in logoutFirebase:', err);
    throw err;
  }
}

export function subscribeToAuth(callback: (user: FirebaseUser | null) => void) {
  return onAuthStateChanged(auth, callback);
}

// ---------------------------------------------------------------------------
// USER PROFILE & PREFERENCES SYNC
// ---------------------------------------------------------------------------
export interface CloudUserData {
  uid: string;
  email?: string;
  name: string;
  educationLevel?: string;
  avatar?: string;
  theme?: 'light' | 'dark';
  defaultDifficulty?: 'facil' | 'medio' | 'dificil';
  updatedAt: string;
}

export async function fetchCloudUserProfile(uid: string): Promise<CloudUserData | null> {
  const p = `users/${uid}`;
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (snap.exists()) {
      return snap.data() as CloudUserData;
    }
    return null;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, p);
  }
}

export async function saveCloudUserProfile(uid: string, data: Partial<CloudUserData>): Promise<void> {
  const p = `users/${uid}`;
  try {
    const payload: CloudUserData = {
      uid,
      email: auth.currentUser?.email || undefined,
      name: data.name || auth.currentUser?.displayName || 'Estudiante',
      educationLevel: data.educationLevel || 'Educación Secundaria (ESO)',
      avatar: data.avatar || '🎒',
      theme: data.theme || 'light',
      defaultDifficulty: data.defaultDifficulty || 'medio',
      updatedAt: new Date().toISOString(),
    };
    await setDoc(doc(db, 'users', uid), payload, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, p);
  }
}

// ---------------------------------------------------------------------------
// SUBJECTS SYNC
// ---------------------------------------------------------------------------
export async function fetchCloudSubjects(uid: string): Promise<Subject[]> {
  const p = `users/${uid}/subjects`;
  try {
    const snap = await getDocs(collection(db, 'users', uid, 'subjects'));
    const list: Subject[] = [];
    snap.forEach((d) => {
      const data = d.data();
      list.push({
        id: data.id || d.id,
        name: data.name,
        code: data.code,
        color: data.color,
        icon: data.icon,
        teacher: data.teacher,
        classroom: data.classroom,
        topics: data.topics || [],
      });
    });
    return list;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, p);
  }
}

export async function saveCloudSubject(uid: string, subject: Subject): Promise<void> {
  const p = `users/${uid}/subjects/${subject.id}`;
  try {
    // Sanitize topics to ensure no gigantic base64 payloads blow the 1MB Firestore doc limit
    const cleanTopics = (subject.topics || []).map((t) => ({
      ...t,
      files: (t.files || []).map((f) => ({
        id: f.id,
        topicId: f.topicId,
        subjectId: f.subjectId,
        name: f.name,
        size: f.size,
        mimeType: f.mimeType,
        uploadedAt: f.uploadedAt,
        extractedText: f.extractedText ? f.extractedText.slice(0, 50000) : '',
        // If dataUrl is <= 300KB we can sync it, otherwise keep local in IndexedDB
        dataUrl: f.dataUrl && f.dataUrl.length <= 400000 ? f.dataUrl : undefined,
      })),
    }));

    const payload = {
      id: subject.id,
      ownerId: uid,
      name: subject.name,
      code: subject.code || '',
      color: subject.color,
      icon: subject.icon,
      teacher: subject.teacher || '',
      classroom: subject.classroom || '',
      topics: cleanTopics,
      updatedAt: new Date().toISOString(),
    };
    await setDoc(doc(db, 'users', uid, 'subjects', subject.id), payload);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, p);
  }
}

export async function deleteCloudSubject(uid: string, subjectId: string): Promise<void> {
  const p = `users/${uid}/subjects/${subjectId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'subjects', subjectId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, p);
  }
}

// ---------------------------------------------------------------------------
// FLASHCARDS SYNC
// ---------------------------------------------------------------------------
export async function fetchCloudFlashcards(uid: string): Promise<UserFlashcard[]> {
  const p = `users/${uid}/flashcards`;
  try {
    const snap = await getDocs(collection(db, 'users', uid, 'flashcards'));
    const list: UserFlashcard[] = [];
    snap.forEach((d) => {
      const data = d.data();
      list.push({
        id: data.id || d.id,
        subjectId: data.subjectId,
        topicId: data.topicId,
        topicName: data.topicName,
        front: data.front,
        back: data.back,
        hint: data.hint,
        difficulty: data.difficulty,
        createdAt: data.createdAt || new Date().toISOString(),
        lastReviewedAt: data.lastReviewedAt,
        reviewCount: data.reviewCount || 0,
        correctCount: data.correctCount || 0,
        incorrectCount: data.incorrectCount || 0,
      });
    });
    return list;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, p);
  }
}

export async function saveCloudFlashcard(uid: string, card: UserFlashcard): Promise<void> {
  const p = `users/${uid}/flashcards/${card.id}`;
  try {
    const payload = {
      id: card.id,
      ownerId: uid,
      subjectId: card.subjectId,
      topicId: card.topicId || '',
      topicName: card.topicName || '',
      front: card.front,
      back: card.back,
      hint: card.hint || '',
      difficulty: card.difficulty,
      createdAt: card.createdAt || new Date().toISOString(),
      lastReviewedAt: card.lastReviewedAt || '',
      reviewCount: card.reviewCount || 0,
      correctCount: card.correctCount || 0,
      incorrectCount: card.incorrectCount || 0,
    };
    await setDoc(doc(db, 'users', uid, 'flashcards', card.id), payload);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, p);
  }
}

export async function deleteCloudFlashcard(uid: string, cardId: string): Promise<void> {
  const p = `users/${uid}/flashcards/${cardId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'flashcards', cardId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, p);
  }
}

// ---------------------------------------------------------------------------
// SCHEDULE SYNC
// ---------------------------------------------------------------------------
export async function fetchCloudSchedule(uid: string): Promise<ScheduleSlot[]> {
  const p = `users/${uid}/schedule`;
  try {
    const snap = await getDocs(collection(db, 'users', uid, 'schedule'));
    const list: ScheduleSlot[] = [];
    snap.forEach((d) => {
      const data = d.data();
      list.push({
        id: data.id || d.id,
        dayOfWeek: data.dayOfWeek,
        startTime: data.startTime,
        endTime: data.endTime,
        subjectId: data.subjectId,
        room: data.room,
        teacher: data.teacher,
        note: data.note,
      });
    });
    return list;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, p);
  }
}

export async function saveCloudScheduleSlot(uid: string, slot: ScheduleSlot): Promise<void> {
  const p = `users/${uid}/schedule/${slot.id}`;
  try {
    const payload = {
      id: slot.id,
      ownerId: uid,
      dayOfWeek: slot.dayOfWeek,
      startTime: slot.startTime,
      endTime: slot.endTime,
      subjectId: slot.subjectId,
      room: slot.room || '',
      teacher: slot.teacher || '',
      note: slot.note || '',
    };
    await setDoc(doc(db, 'users', uid, 'schedule', slot.id), payload);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, p);
  }
}

export async function deleteCloudScheduleSlot(uid: string, slotId: string): Promise<void> {
  const p = `users/${uid}/schedule/${slotId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'schedule', slotId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, p);
  }
}

// ---------------------------------------------------------------------------
// CALENDAR & EXAMS SYNC
// ---------------------------------------------------------------------------
export async function fetchCloudCalendar(uid: string): Promise<CalendarEvent[]> {
  const p = `users/${uid}/calendar`;
  try {
    const snap = await getDocs(collection(db, 'users', uid, 'calendar'));
    const list: CalendarEvent[] = [];
    snap.forEach((d) => {
      const data = d.data();
      list.push({
        id: data.id || d.id,
        title: data.title,
        date: data.date,
        time: data.time,
        subjectId: data.subjectId,
        topicId: data.topicId,
        type: data.type,
        description: data.description,
        completed: Boolean(data.completed),
      });
    });
    return list;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, p);
  }
}

export async function saveCloudCalendarEvent(uid: string, event: CalendarEvent): Promise<void> {
  const p = `users/${uid}/calendar/${event.id}`;
  try {
    const payload = {
      id: event.id,
      ownerId: uid,
      title: event.title,
      date: event.date,
      time: event.time || '',
      subjectId: event.subjectId || '',
      topicId: event.topicId || '',
      type: event.type,
      description: event.description || '',
      completed: Boolean(event.completed),
    };
    await setDoc(doc(db, 'users', uid, 'calendar', event.id), payload);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, p);
  }
}

export async function deleteCloudCalendarEvent(uid: string, eventId: string): Promise<void> {
  const p = `users/${uid}/calendar/${eventId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'calendar', eventId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, p);
  }
}

// ---------------------------------------------------------------------------
// STUDY FILE RECORDS SYNC
// ---------------------------------------------------------------------------
export async function saveCloudStudyFile(uid: string, file: StudyFile): Promise<void> {
  const p = `users/${uid}/studyFiles/${file.id}`;
  try {
    const payload = {
      id: file.id,
      ownerId: uid,
      subjectId: file.subjectId || '',
      topicId: file.topicId || '',
      name: file.name,
      size: file.size,
      mimeType: file.mimeType,
      uploadedAt: file.uploadedAt || new Date().toISOString(),
      extractedText: file.extractedText ? file.extractedText.slice(0, 500000) : '',
      // Only include dataUrl if <= 400KB to respect Firestore Spark 1MB document limit
      dataUrl: file.dataUrl && file.dataUrl.length <= 400000 ? file.dataUrl : '',
    };
    await setDoc(doc(db, 'users', uid, 'studyFiles', file.id), payload);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, p);
  }
}

// ---------------------------------------------------------------------------
// COMPREHENSIVE CLOUD DATA PULL (RESTORE ON ANY DEVICE)
// ---------------------------------------------------------------------------
export interface FullCloudData {
  userProfile: CloudUserData | null;
  subjects: Subject[];
  flashcards: UserFlashcard[];
  schedule: ScheduleSlot[];
  calendar: CalendarEvent[];
}

export async function pullAllUserDataFromCloud(uid: string): Promise<FullCloudData> {
  const [userProfile, subjects, flashcards, schedule, calendar] = await Promise.all([
    fetchCloudUserProfile(uid),
    fetchCloudSubjects(uid),
    fetchCloudFlashcards(uid),
    fetchCloudSchedule(uid),
    fetchCloudCalendar(uid),
  ]);

  return {
    userProfile,
    subjects,
    flashcards,
    schedule,
    calendar,
  };
}

// ---------------------------------------------------------------------------
// COMPREHENSIVE CLOUD DATA PUSH (SYNC ENTIRE LOCAL STATE TO CLOUD)
// ---------------------------------------------------------------------------
export async function syncAllLocalDataToCloud(
  uid: string,
  data: {
    userProfile?: Partial<UserProfile>;
    subjects: Subject[];
    flashcards: UserFlashcard[];
    schedule: ScheduleSlot[];
    calendar: CalendarEvent[];
  }
): Promise<{ success: boolean; count: number }> {
  try {
    // Save user profile
    await saveCloudUserProfile(uid, {
      name: data.userProfile?.name,
      educationLevel: data.userProfile?.educationLevel,
      avatar: data.userProfile?.avatar,
    });

    let totalSaved = 1;

    // Save subjects
    for (const sub of data.subjects) {
      await saveCloudSubject(uid, sub);
      totalSaved++;
    }

    // Save flashcards
    for (const card of data.flashcards) {
      await saveCloudFlashcard(uid, card);
      totalSaved++;
    }

    // Save schedule slots
    for (const slot of data.schedule) {
      await saveCloudScheduleSlot(uid, slot);
      totalSaved++;
    }

    // Save calendar events
    for (const ev of data.calendar) {
      await saveCloudCalendarEvent(uid, ev);
      totalSaved++;
    }

    return { success: true, count: totalSaved };
  } catch (err) {
    console.error('Error during full sync to cloud:', err);
    throw err;
  }
}
