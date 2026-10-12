/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Navbar, NavTab } from './components/Navbar';
import { SubjectsExplorer } from './components/SubjectsExplorer';
import { SchoolSchedule } from './components/SchoolSchedule';
import { AcademicCalendar } from './components/AcademicCalendar';
import { AITutorChat } from './components/AITutorChat';
import { SettingsView } from './components/SettingsView';
import { FileViewerModal } from './components/FileViewerModal';
import { QuizRunnerModal } from './components/QuizRunnerModal';
import { StudentNameModal } from './components/StudentNameModal';
import { ProfileManagerModal } from './components/ProfileManagerModal';
import { PinLockScreen } from './components/PinLockScreen';
import { FlashcardsView } from './components/FlashcardsView';
import { AuthModal } from './components/AuthModal';
import {
  Subject,
  ScheduleSlot,
  CalendarEvent,
  AppSettings,
  StudyFile,
  QuizItem,
  UserProfile,
  UserFlashcard,
} from './types';
import {
  subscribeToAuth,
  pullAllUserDataFromCloud,
  syncAllLocalDataToCloud,
  saveCloudSubject,
  deleteCloudSubject,
  saveCloudFlashcard,
  deleteCloudFlashcard,
  saveCloudScheduleSlot,
  deleteCloudScheduleSlot,
  saveCloudCalendarEvent,
  deleteCloudCalendarEvent,
  FullCloudData,
} from './services/firebase';
import { User as FirebaseUser } from 'firebase/auth';
import {
  loadSubjects,
  saveSubjects,
  loadSchedule,
  saveSchedule,
  loadCalendarEvents,
  saveCalendarEvents,
  loadSettings,
  saveSettings,
  loadFlashcards,
  saveFlashcards,
  INITIAL_SUBJECTS,
  INITIAL_SCHEDULE,
  INITIAL_CALENDAR,
  INITIAL_FLASHCARDS,
  getStoredApiKey,
  getActiveProfile,
  setActiveProfileId,
  flushAllData,
} from './utils/storage';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('subjects');

  // Active student profile (100% local, multi-user isolated storage)
  const [activeProfile, setActiveProfile] = useState<UserProfile>(() => getActiveProfile());
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [isProfileManagerOpen, setIsProfileManagerOpen] = useState<boolean>(false);

  // Firebase Auth and Cloud Sync states
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  // Auto-save visual indicator state
  const [saveNotification, setSaveNotification] = useState<string | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const triggerSaveFeedback = (msg = 'Guardado automáticamente ✓') => {
    setSaveNotification(msg);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      setSaveNotification(null);
    }, 2200);
  };

  // Core data states loaded from persistent storage for active profile
  const [subjects, setSubjects] = useState<Subject[]>(() => loadSubjects(activeProfile.id));
  const [schedule, setSchedule] = useState<ScheduleSlot[]>(() => loadSchedule(activeProfile.id));
  const [calendar, setCalendar] = useState<CalendarEvent[]>(() => loadCalendarEvents(activeProfile.id));
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings(activeProfile.id));
  const [flashcards, setFlashcards] = useState<UserFlashcard[]>(() => loadFlashcards(activeProfile.id));

  // Firebase auth state change listener
  useEffect(() => {
    const unsubscribe = subscribeToAuth(async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const cloudData = await pullAllUserDataFromCloud(user.uid);
          if (
            cloudData.subjects.length > 0 ||
            cloudData.flashcards.length > 0 ||
            cloudData.schedule.length > 0 ||
            cloudData.calendar.length > 0
          ) {
            handleApplyCloudData(cloudData);
          }
        } catch (err) {
          console.warn('Error reading initial cloud data on auth state:', err);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const handleApplyCloudData = (cloudData: FullCloudData) => {
    if (cloudData.subjects && cloudData.subjects.length > 0) {
      setSubjects(cloudData.subjects);
      saveSubjects(cloudData.subjects, activeProfile.id);
    }
    if (cloudData.flashcards && cloudData.flashcards.length > 0) {
      setFlashcards(cloudData.flashcards);
      saveFlashcards(cloudData.flashcards, activeProfile.id);
    }
    if (cloudData.schedule && cloudData.schedule.length > 0) {
      setSchedule(cloudData.schedule);
      saveSchedule(cloudData.schedule, activeProfile.id);
    }
    if (cloudData.calendar && cloudData.calendar.length > 0) {
      setCalendar(cloudData.calendar);
      saveCalendarEvents(cloudData.calendar, activeProfile.id);
    }
    if (cloudData.userProfile) {
      const updatedProfile: UserProfile = {
        ...activeProfile,
        name: cloudData.userProfile.name || activeProfile.name,
        educationLevel: cloudData.userProfile.educationLevel || activeProfile.educationLevel,
        avatar: cloudData.userProfile.avatar || activeProfile.avatar,
      };
      setActiveProfile(updatedProfile);
    }
    triggerSaveFeedback('Datos sincronizados desde la nube ☁️✓');
  };

  // Student name prompt modal (initial setup if completely blank)
  const [isNameModalOpen, setIsNameModalOpen] = useState<boolean>(() => {
    const p = getActiveProfile();
    return !p.name || p.name === 'Estudiante';
  });
  const [isInitialSetup, setIsInitialSetup] = useState<boolean>(() => {
    const p = getActiveProfile();
    return !p.name || p.name === 'Estudiante';
  });

  // Modals state
  const [viewingFile, setViewingFile] = useState<StudyFile | null>(null);
  const [activeQuiz, setActiveQuiz] = useState<QuizItem | null>(null);

  // Cross-tab interaction context
  const [tutorContext, setTutorContext] = useState<{ subjectId?: string; topicId?: string }>({});
  const [flashcardContext, setFlashcardContext] = useState<{ subjectId?: string; topicId?: string }>({});

  // Sync dark theme with document root & body
  useEffect(() => {
    const isDark = settings.theme === 'dark';
    if (isDark) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
    }
  }, [settings.theme]);

  // Handle switching to another student profile
  const handleSwitchProfile = (newProfile: UserProfile) => {
    setActiveProfileId(newProfile.id);
    setActiveProfile(newProfile);
    const loadedSubs = loadSubjects(newProfile.id);
    const loadedSched = loadSchedule(newProfile.id);
    const loadedCal = loadCalendarEvents(newProfile.id);
    const loadedSett = loadSettings(newProfile.id);
    const loadedFlash = loadFlashcards(newProfile.id);
    setSubjects(loadedSubs);
    setSchedule(loadedSched);
    setCalendar(loadedCal);
    setSettings(loadedSett);
    setFlashcards(loadedFlash);
    setIsLocked(false);
  };

  const handleProfileUpdated = (updated: UserProfile) => {
    setActiveProfile(updated);
    handleUpdateSettings({
      ...settings,
      studentName: updated.name,
      educationLevel: updated.educationLevel,
    });
  };

  // Save changes for current profile with instant auto-save feedback & cloud sync
  const handleUpdateSubjects = (newSubjects: Subject[]) => {
    setSubjects(newSubjects);
    saveSubjects(newSubjects, activeProfile.id);
    triggerSaveFeedback('Asignaturas y temas guardados ✓');
    if (currentUser) {
      for (const s of newSubjects) {
        saveCloudSubject(currentUser.uid, s).catch((err) =>
          console.warn('Background cloud sync subject notice:', err)
        );
      }
    }
  };

  const handleUpdateSchedule = (newSchedule: ScheduleSlot[]) => {
    setSchedule(newSchedule);
    saveSchedule(newSchedule, activeProfile.id);
    triggerSaveFeedback('Horario escolar guardado ✓');
    if (currentUser) {
      for (const slot of newSchedule) {
        saveCloudScheduleSlot(currentUser.uid, slot).catch((err) =>
          console.warn('Background cloud sync slot notice:', err)
        );
      }
    }
  };

  const handleUpdateCalendar = (newCalendar: CalendarEvent[]) => {
    setCalendar(newCalendar);
    saveCalendarEvents(newCalendar, activeProfile.id);
    triggerSaveFeedback('Calendario escolar guardado ✓');
    if (currentUser) {
      for (const event of newCalendar) {
        saveCloudCalendarEvent(currentUser.uid, event).catch((err) =>
          console.warn('Background cloud sync event notice:', err)
        );
      }
    }
  };

  const handleUpdateSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    saveSettings(newSettings, activeProfile.id);
    triggerSaveFeedback('Ajustes guardados ✓');
  };

  const handleUpdateFlashcards = (newCards: UserFlashcard[]) => {
    setFlashcards(newCards);
    saveFlashcards(newCards, activeProfile.id);
    triggerSaveFeedback('Tarjetas flashcards guardadas ✓');
    if (currentUser) {
      for (const card of newCards) {
        saveCloudFlashcard(currentUser.uid, card).catch((err) =>
          console.warn('Background cloud sync flashcard notice:', err)
        );
      }
    }
  };

  // Guaranteed Automatic Save on Web Exit, Refresh, Tab Close or App Switch
  useEffect(() => {
    const handleEmergencySave = () => {
      flushAllData({
        profileId: activeProfile.id,
        subjects,
        schedule,
        calendar,
        settings,
        flashcards,
      });
    };

    // Trigger on closing tab / leaving web
    window.addEventListener('beforeunload', handleEmergencySave);
    window.addEventListener('pagehide', handleEmergencySave);

    // Trigger on mobile switching tabs / home screen
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        handleEmergencySave();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('beforeunload', handleEmergencySave);
      window.removeEventListener('pagehide', handleEmergencySave);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [activeProfile.id, subjects, schedule, calendar, settings, flashcards]);

  const handleSaveStudentName = (name: string, level: string) => {
    const updatedProfile: UserProfile = {
      ...activeProfile,
      name,
      educationLevel: level,
      avatar: level.includes('Primaria') ? '🎒' : activeProfile.avatar || '🎓',
    };
    handleProfileUpdated(updatedProfile);
  };

  // Toggle theme
  const toggleTheme = () => {
    const nextTheme = settings.theme === 'dark' ? 'light' : 'dark';
    handleUpdateSettings({ ...settings, theme: nextTheme });
  };

  // Reset all data to empty slate
  const handleResetAllData = () => {
    if (confirm('¿Deseas borrar todas las asignaturas, horarios y notas para empezar completamente de cero?')) {
      setSubjects(INITIAL_SUBJECTS);
      saveSubjects(INITIAL_SUBJECTS);
      setSchedule(INITIAL_SCHEDULE);
      saveSchedule(INITIAL_SCHEDULE);
      setCalendar(INITIAL_CALENDAR);
      saveCalendarEvents(INITIAL_CALENDAR);
      setFlashcards(INITIAL_FLASHCARDS);
      saveFlashcards(INITIAL_FLASHCARDS, activeProfile.id);
    }
  };

  // Restore backup
  const handleRestoreBackup = (backup: {
    subjects?: Subject[];
    schedule?: ScheduleSlot[];
    calendar?: CalendarEvent[];
    studentName?: string;
    educationLevel?: string;
    flashcards?: UserFlashcard[];
  }) => {
    if (backup.subjects && Array.isArray(backup.subjects)) {
      handleUpdateSubjects(backup.subjects);
    }
    if (backup.schedule && Array.isArray(backup.schedule)) {
      handleUpdateSchedule(backup.schedule);
    }
    if (backup.calendar && Array.isArray(backup.calendar)) {
      handleUpdateCalendar(backup.calendar);
    }
    if (backup.flashcards && Array.isArray(backup.flashcards)) {
      handleUpdateFlashcards(backup.flashcards);
    }
    if (backup.studentName || backup.educationLevel) {
      handleUpdateSettings({
        ...settings,
        studentName: backup.studentName || settings.studentName,
        educationLevel: backup.educationLevel || settings.educationLevel,
      });
    }
  };

  // Schedule slot actions
  const handleAddSlot = (slot: ScheduleSlot) => {
    const updated = [...schedule, slot];
    handleUpdateSchedule(updated);
  };

  const handleDeleteSlot = (slotId: string) => {
    const updated = schedule.filter((s) => s.id !== slotId);
    handleUpdateSchedule(updated);
    if (currentUser) {
      deleteCloudScheduleSlot(currentUser.uid, slotId).catch((err) =>
        console.warn('Cloud delete slot notice:', err)
      );
    }
  };

  // Calendar event actions
  const handleAddCalendarEvent = (event: CalendarEvent) => {
    const updated = [...calendar, event];
    handleUpdateCalendar(updated);
  };

  const handleToggleCalendarEvent = (eventId: string) => {
    const updated = calendar.map((ev) =>
      ev.id === eventId ? { ...ev, completed: !ev.completed } : ev
    );
    handleUpdateCalendar(updated);
  };

  const handleDeleteCalendarEvent = (eventId: string) => {
    const updated = calendar.filter((ev) => ev.id !== eventId);
    handleUpdateCalendar(updated);
    if (currentUser) {
      deleteCloudCalendarEvent(currentUser.uid, eventId).catch((err) =>
        console.warn('Cloud delete event notice:', err)
      );
    }
  };

  // Switch to Tutor with specific topic context
  const handleOpenTutorWithContext = (subjectId: string, topicId: string) => {
    setTutorContext({ subjectId, topicId });
    setActiveTab('tutor');
  };

  // Save Quiz score back to topic
  const handleSaveQuizScore = (quizId: string, score: number, total: number) => {
    const updated = subjects.map((sub) => ({
      ...sub,
      topics: sub.topics.map((top) => ({
        ...top,
        quizzes: top.quizzes.map((q) => {
          if (q.id === quizId) {
            return {
              ...q,
              bestScore: {
                score,
                total,
                date: new Date().toLocaleDateString(),
              },
            };
          }
          return q;
        }),
      })),
    }));
    handleUpdateSubjects(updated);
  };

  const hasCustomKey = Boolean(getStoredApiKey() || settings.geminiApiKey);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors selection:bg-indigo-500 selection:text-white pb-16 md:pb-0">
      {/* Navigation Bar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isDark={settings.theme === 'dark'}
        toggleTheme={toggleTheme}
        hasCustomKey={hasCustomKey}
        activeProfile={activeProfile}
        studentName={activeProfile.name || settings.studentName}
        onOpenNameModal={() => setIsProfileManagerOpen(true)}
        onLockProfile={() => setIsLocked(true)}
        saveNotification={saveNotification}
        firebaseUser={currentUser}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
      />

      {/* Main Tab Views */}
      <main className="flex-1">
        {activeTab === 'subjects' && (
          <SubjectsExplorer
            subjects={subjects}
            onUpdateSubjects={handleUpdateSubjects}
            onOpenViewer={(file) => setViewingFile(file)}
            onLaunchQuiz={(quiz) => setActiveQuiz(quiz)}
            onOpenTutorWithContext={handleOpenTutorWithContext}
            onOpenFlashcards={(subId, topId) => {
              setFlashcardContext({ subjectId: subId, topicId: topId });
              setActiveTab('flashcards');
            }}
            initialSubjectId={tutorContext.subjectId}
            studentName={activeProfile.name || settings.studentName}
            educationLevel={activeProfile.educationLevel || settings.educationLevel}
          />
        )}

        {activeTab === 'flashcards' && (
          <FlashcardsView
            subjects={subjects}
            flashcards={flashcards}
            onUpdateFlashcards={handleUpdateFlashcards}
            initialSubjectId={flashcardContext.subjectId}
            initialTopicId={flashcardContext.topicId}
            studentName={activeProfile.name || settings.studentName}
            educationLevel={activeProfile.educationLevel || settings.educationLevel}
            activeProfileId={activeProfile.id}
          />
        )}

        {activeTab === 'schedule' && (
          <SchoolSchedule
            schedule={schedule}
            subjects={subjects}
            onAddSlot={handleAddSlot}
            onDeleteSlot={handleDeleteSlot}
            onSelectSubject={(subId) => {
              setTutorContext({ subjectId: subId });
              setActiveTab('subjects');
            }}
            studentName={activeProfile.name || settings.studentName}
          />
        )}

        {activeTab === 'calendar' && (
          <AcademicCalendar
            events={calendar}
            subjects={subjects}
            onAddEvent={handleAddCalendarEvent}
            onToggleEvent={handleToggleCalendarEvent}
            onDeleteEvent={handleDeleteCalendarEvent}
            studentName={activeProfile.name || settings.studentName}
          />
        )}

        {activeTab === 'tutor' && (
          <AITutorChat
            subjects={subjects}
            initialSubjectId={tutorContext.subjectId}
            initialTopicId={tutorContext.topicId}
            studentName={activeProfile.name || settings.studentName}
            educationLevel={activeProfile.educationLevel || settings.educationLevel}
            activeProfileId={activeProfile.id}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            subjects={subjects}
            schedule={schedule}
            calendar={calendar}
            flashcards={flashcards}
            activeProfile={activeProfile}
            firebaseUser={currentUser}
            onOpenAuthModal={() => setIsAuthModalOpen(true)}
            onOpenProfileManager={() => setIsProfileManagerOpen(true)}
            onLockProfile={() => setIsLocked(true)}
            onResetAllData={handleResetAllData}
            onRestoreBackup={handleRestoreBackup}
          />
        )}
      </main>

      {/* Multi-Student Profile Manager Modal */}
      <ProfileManagerModal
        isOpen={isProfileManagerOpen}
        onClose={() => setIsProfileManagerOpen(false)}
        activeProfile={activeProfile}
        onSelectProfile={handleSwitchProfile}
        onProfileUpdated={handleProfileUpdated}
        onLockCurrentProfile={() => setIsLocked(true)}
      />

      {/* PIN Lock Screen for local privacy */}
      {isLocked && activeProfile?.pin && (
        <PinLockScreen
          profile={activeProfile}
          onUnlock={() => setIsLocked(false)}
          onSwitchProfile={() => {
            setIsLocked(false);
            setIsProfileManagerOpen(true);
          }}
        />
      )}

      {/* Student Name Modal (Welcome Setup / Edit) */}
      <StudentNameModal
        isOpen={isNameModalOpen}
        onClose={() => setIsNameModalOpen(false)}
        currentName={settings.studentName || ''}
        currentLevel={settings.educationLevel}
        onSave={handleSaveStudentName}
        isInitialSetup={isInitialSetup}
      />

      {/* File Viewer Modal */}
      {viewingFile && (
        <FileViewerModal
          file={viewingFile}
          onClose={() => setViewingFile(null)}
          onGenerateSummaryFromFile={(_file) => {
            setViewingFile(null);
            setActiveTab('subjects');
          }}
          onGenerateQuizFromFile={(_file) => {
            setViewingFile(null);
            setActiveTab('subjects');
          }}
        />
      )}

      {/* Interactive Quiz Runner Modal */}
      {activeQuiz && (
        <QuizRunnerModal
          quiz={activeQuiz}
          onClose={() => setActiveQuiz(null)}
          onSaveScore={handleSaveQuizScore}
        />
      )}

      {/* Firebase Cloud Sync & Multidevice Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={currentUser}
        activeProfile={activeProfile}
        subjects={subjects}
        flashcards={flashcards}
        schedule={schedule}
        calendar={calendar}
        onApplyCloudData={handleApplyCloudData}
        onSyncComplete={(msg) => triggerSaveFeedback(msg)}
      />
    </div>
  );
}
