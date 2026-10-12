import React from 'react';
import {
  BookOpen,
  Calendar,
  Clock,
  Sparkles,
  Settings,
  Sun,
  Moon,
  ShieldCheck,
  Key,
  User,
  Lock,
  Users,
  Layers,
} from 'lucide-react';
import { UserProfile } from '../types';

export type NavTab = 'subjects' | 'flashcards' | 'schedule' | 'calendar' | 'tutor' | 'settings';

interface NavbarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  isDark: boolean;
  toggleTheme: () => void;
  hasCustomKey: boolean;
  activeProfile?: UserProfile;
  studentName?: string;
  onOpenNameModal?: () => void;
  onLockProfile?: () => void;
  saveNotification?: string | null;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  isDark,
  toggleTheme,
  hasCustomKey,
  activeProfile,
  studentName,
  onOpenNameModal,
  onLockProfile,
  saveNotification,
}) => {
  const displayName = activeProfile?.name || studentName || '';
  const displayAvatar = activeProfile?.avatar || (activeProfile?.educationLevel?.includes('Primaria') ? '🎒' : '🎓');

  return (
    <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div
            onClick={() => setActiveTab('subjects')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-lg bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-300 bg-clip-text text-transparent">
                  EstudiaFácil
                </span>
                <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  AI
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
                Tu campus inteligente personal
              </p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            <button
              onClick={() => setActiveTab('subjects')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'subjects'
                  ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Asignaturas</span>
            </button>

            <button
              onClick={() => setActiveTab('flashcards')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'flashcards'
                  ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <Layers className="w-4 h-4 text-indigo-500" />
              <span>Flashcards</span>
            </button>

            <button
              onClick={() => setActiveTab('schedule')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'schedule'
                  ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Horario Escolar</span>
            </button>

            <button
              onClick={() => setActiveTab('calendar')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'calendar'
                  ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Calendario</span>
            </button>

            <button
              onClick={() => setActiveTab('tutor')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'tutor'
                  ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-300 hover:bg-purple-50/50 dark:hover:bg-slate-800/60'
              }`}
            >
              <Sparkles className="w-4 h-4 text-purple-500" />
              <span>Tutor IA Gemini</span>
            </button>
          </nav>

          {/* Right Action Controls */}
          <div className="flex items-center gap-2">
            {/* Student Profile Pill & Switcher */}
            {displayName ? (
              <div className="flex items-center gap-1">
                <button
                  onClick={onOpenNameModal}
                  title="Gestionar o cambiar perfiles de estudiante"
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 text-xs font-bold text-indigo-700 dark:text-indigo-300 transition-all max-w-[170px] truncate group shadow-2xs"
                >
                  <span className="text-base leading-none shrink-0">{displayAvatar}</span>
                  <span className="truncate">{displayName}</span>
                  <Users className="w-3 h-3 text-indigo-400 group-hover:text-indigo-600 shrink-0 ml-0.5" />
                </button>

                {/* Instant Lock Button if profile has PIN */}
                {activeProfile?.pin && onLockProfile && (
                  <button
                    onClick={onLockProfile}
                    title="Bloquear perfil con PIN ahora"
                    className="p-1.5 rounded-xl bg-slate-100 hover:bg-amber-100 dark:bg-slate-800 dark:hover:bg-amber-950/60 text-slate-500 hover:text-amber-600 dark:text-slate-400 dark:hover:text-amber-400 transition-colors"
                  >
                    <Lock className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ) : (
              <button
                onClick={onOpenNameModal}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 border border-purple-200 dark:border-purple-800 text-xs font-bold text-purple-700 dark:text-purple-300 transition-all"
              >
                <User className="w-3.5 h-3.5 text-purple-500" />
                <span>Perfil</span>
              </button>
            )}

            {/* Auto-Save Status Indicator */}
            {saveNotification ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 animate-in fade-in duration-200 shadow-2xs">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="hidden sm:inline">{saveNotification}</span>
                <span className="sm:hidden">Guardado ✓</span>
              </div>
            ) : (
              <div
                title="Autoguardado activado: todo lo que escribes se guarda al instante y también automáticamente al salir o recargar la web"
                className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/80"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Autoguardado al salir</span>
              </div>
            )}

            {/* API Status Pill */}
            <button
              onClick={() => setActiveTab('settings')}
              title={hasCustomKey ? 'API Key de Gemini configurada' : 'Configura tu API Key en Ajustes'}
              className={`hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                hasCustomKey
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                  : 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
              }`}
            >
              {hasCustomKey ? (
                <>
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>IA Lista</span>
                </>
              ) : (
                <>
                  <Key className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>Ajustar API Key</span>
                </>
              )}
            </button>

            {/* Dark Mode Toggle */}
            <button
              onClick={toggleTheme}
              aria-label="Cambiar tema de color"
              className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              {isDark ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-slate-600" />}
            </button>

            {/* Settings Tab Button */}
            <button
              onClick={() => setActiveTab('settings')}
              aria-label="Ajustes y configuración"
              className={`p-2 rounded-xl transition-colors ${
                activeTab === 'settings'
                  ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-300'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 px-2 py-1.5 flex justify-around items-center">
        <button
          onClick={() => setActiveTab('subjects')}
          className={`flex flex-col items-center py-1 px-2.5 rounded-lg text-[11px] font-medium transition-colors ${
            activeTab === 'subjects'
              ? 'text-indigo-600 dark:text-indigo-400'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <BookOpen className="w-5 h-5 mb-0.5" />
          <span>Materias</span>
        </button>

        <button
          onClick={() => setActiveTab('flashcards')}
          className={`flex flex-col items-center py-1 px-2.5 rounded-lg text-[11px] font-medium transition-colors ${
            activeTab === 'flashcards'
              ? 'text-indigo-600 dark:text-indigo-400'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <Layers className="w-5 h-5 mb-0.5 text-indigo-500" />
          <span>Tarjetas</span>
        </button>

        <button
          onClick={() => setActiveTab('schedule')}
          className={`flex flex-col items-center py-1 px-3 rounded-lg text-[11px] font-medium transition-colors ${
            activeTab === 'schedule'
              ? 'text-indigo-600 dark:text-indigo-400'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <Clock className="w-5 h-5 mb-0.5" />
          <span>Horario</span>
        </button>

        <button
          onClick={() => setActiveTab('calendar')}
          className={`flex flex-col items-center py-1 px-3 rounded-lg text-[11px] font-medium transition-colors ${
            activeTab === 'calendar'
              ? 'text-indigo-600 dark:text-indigo-400'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <Calendar className="w-5 h-5 mb-0.5" />
          <span>Calendario</span>
        </button>

        <button
          onClick={() => setActiveTab('tutor')}
          className={`flex flex-col items-center py-1 px-3 rounded-lg text-[11px] font-medium transition-colors ${
            activeTab === 'tutor'
              ? 'text-purple-600 dark:text-purple-400'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <Sparkles className="w-5 h-5 mb-0.5 text-purple-500" />
          <span>Tutor IA</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`flex flex-col items-center py-1 px-3 rounded-lg text-[11px] font-medium transition-colors ${
            activeTab === 'settings'
              ? 'text-indigo-600 dark:text-indigo-400'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <Settings className="w-5 h-5 mb-0.5" />
          <span>Ajustes</span>
        </button>
      </div>
    </header>
  );
};
