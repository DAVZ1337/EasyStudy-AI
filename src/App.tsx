/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
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
import {
  Subject,
  ScheduleSlot,
  CalendarEvent,
  AppSettings,
  StudyFile,
  QuizItem,
  UserProfile,
} from './types';
import {
  loadSubjects,
  saveSubjects,
  loadSchedule,
  saveSchedule,
  loadCalendarEvents,
  saveCalendarEvents,
  loadSettings,
  saveSettings,
  INITIAL_SUBJECTS,
  INITIAL_SCHEDULE,
  INITIAL_CALENDAR,
  getStoredApiKey,
  getActiveProfile,
  setActiveProfileId,
} from './utils/storage';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('subjects');

  // Active student profile (100% local, multi-user isolated storage)
  const [activeProfile, setActiveProfile] = useState<UserProfile>(() => getActiveProfile());
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [isProfileManagerOpen, setIsProfileManagerOpen] = useState<boolean>(false);

  // Core data states loaded from persistent storage for active profile
  const [subjects, setSubjects] = useState<Subject[]>(() => loadSubjects(activeProfile.id));
  const [schedule, setSchedule] = useState<ScheduleSlot[]>(() => loadSchedule(activeProfile.id));
  const [calendar, setCalendar] = useState<CalendarEvent[]>(() => loadCalendarEvents(activeProfile.id));
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings(activeProfile.id));

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
    setSubjects(loadedSubs);
    setSchedule(loadedSched);
    setCalendar(loadedCal);
    setSettings(loadedSett);
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

  // Save changes for current profile
  const handleUpdateSubjects = (newSubjects: Subject[]) => {
    setSubjects(newSubjects);
    saveSubjects(newSubjects, activeProfile.id);
  };

  const handleUpdateSchedule = (newSchedule: ScheduleSlot[]) => {
    setSchedule(newSchedule);
    saveSchedule(newSchedule, activeProfile.id);
  };

  const handleUpdateCalendar = (newCalendar: CalendarEvent[]) => {
    setCalendar(newCalendar);
    saveCalendarEvents(newCalendar, activeProfile.id);
  };

  const handleUpdateSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    saveSettings(newSettings, activeProfile.id);
  };

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
    }
  };

  // Restore backup
  const handleRestoreBackup = (backup: {
    subjects?: Subject[];
    schedule?: ScheduleSlot[];
    calendar?: CalendarEvent[];
    studentName?: string;
    educationLevel?: string;
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
            initialSubjectId={tutorContext.subjectId}
            studentName={activeProfile.name || settings.studentName}
            educationLevel={activeProfile.educationLevel || settings.educationLevel}
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
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            subjects={subjects}
            schedule={schedule}
            calendar={calendar}
            activeProfile={activeProfile}
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
    </div>
  );
}
