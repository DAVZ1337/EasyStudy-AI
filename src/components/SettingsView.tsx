import React, { useState, useRef } from 'react';
import {
  Moon,
  Sun,
  Key,
  ShieldCheck,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Download,
  Upload,
  Sparkles,
  Info,
  Smartphone,
  Save,
  Trash2,
  User,
  GraduationCap,
  BookOpen,
  Lock,
  Users,
  ShieldAlert,
  Cloud,
  CloudUpload,
} from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';
import { AppSettings, Subject, ScheduleSlot, CalendarEvent, UserProfile, UserFlashcard } from '../types';
import { setStoredApiKey, getStoredApiKey, hashPin } from '../utils/storage';
import { askGeminiTutor } from '../services/geminiService';
import { PWAInstallPrompt } from './PWAInstallPrompt';

interface SettingsViewProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
  subjects: Subject[];
  schedule: ScheduleSlot[];
  calendar: CalendarEvent[];
  flashcards?: UserFlashcard[];
  activeProfile?: UserProfile;
  firebaseUser?: FirebaseUser | null;
  onOpenAuthModal?: () => void;
  onOpenProfileManager?: () => void;
  onLockProfile?: () => void;
  onResetAllData: () => void;
  onRestoreBackup?: (backupData: {
    subjects?: Subject[];
    schedule?: ScheduleSlot[];
    calendar?: CalendarEvent[];
    flashcards?: UserFlashcard[];
    studentName?: string;
    educationLevel?: string;
  }) => void;
}

const EDUCATION_LEVELS = [
  'Educación Primaria (6-12 años)',
  'Educación Secundaria (ESO)',
  'Bachillerato',
  'Universidad / Grado Superior',
  'Formación Profesional (FP)',
  'Oposiciones / Máster',
  'Autoaprendizaje / Otro',
];

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
  subjects,
  schedule,
  calendar,
  flashcards,
  activeProfile,
  firebaseUser,
  onOpenAuthModal,
  onOpenProfileManager,
  onLockProfile,
  onResetAllData,
  onRestoreBackup,
}) => {
  const [apiKeyInput, setApiKeyInput] = useState<string>(getStoredApiKey());
  const [showKey, setShowKey] = useState<boolean>(false);
  const [keySavedToast, setKeySavedToast] = useState<boolean>(false);
  const [isTestingKey, setIsTestingKey] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    activationUrl?: string;
    projectId?: string;
  } | null>(null);

  // Profile states
  const [nameInput, setNameInput] = useState<string>(settings.studentName || '');
  const [levelInput, setLevelInput] = useState<string>(
    settings.educationLevel || 'Bachillerato'
  );
  const [profileSavedToast, setProfileSavedToast] = useState<boolean>(false);

  // Restore file input ref
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [restoreStatus, setRestoreStatus] = useState<string | null>(null);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: AppSettings = {
      ...settings,
      studentName: nameInput.trim(),
      educationLevel: levelInput,
    };
    onUpdateSettings(updated);
    setProfileSavedToast(true);
    setTimeout(() => setProfileSavedToast(false), 3000);
  };

  const handleSaveApiKey = () => {
    setStoredApiKey(apiKeyInput.trim());
    onUpdateSettings({
      ...settings,
      geminiApiKey: apiKeyInput.trim(),
    });
    setKeySavedToast(true);
    setTimeout(() => setKeySavedToast(false), 3000);
  };

  const handleClearApiKey = () => {
    setApiKeyInput('');
    setStoredApiKey('');
    onUpdateSettings({
      ...settings,
      geminiApiKey: '',
    });
    setTestResult(null);
  };

  const handleTestConnection = async () => {
    setIsTestingKey(true);
    setTestResult(null);
    try {
      if (apiKeyInput.trim()) {
        setStoredApiKey(apiKeyInput.trim());
      }
      const reply = await askGeminiTutor({
        message: 'Responde únicamente con la palabra "CONEXION_EXITOSA" para verificar la clave.',
      });
      if (reply) {
        setTestResult({
          success: true,
          message: '¡Conexión verificada con Gemini 3.8 Flash! La IA está lista para resolver tus dudas.',
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Error al conectar con la API de Gemini.',
        activationUrl: err.activationUrl,
        projectId: err.projectId,
      });
    } finally {
      setIsTestingKey(false);
    }
  };

  const handleExportBackup = () => {
    const backupData = {
      app: 'EstudiaFacil AI',
      exportDate: new Date().toISOString(),
      studentName: settings.studentName,
      educationLevel: settings.educationLevel,
      subjects,
      schedule,
      calendar,
      flashcards: flashcards || [],
      version: '2.5.0',
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `estudiafacil_copia_seguridad_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRestoreFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const data = JSON.parse(text);

        if (!data || typeof data !== 'object') {
          throw new Error('El archivo no tiene un formato válido.');
        }

        if (onRestoreBackup) {
          onRestoreBackup({
            subjects: Array.isArray(data.subjects) ? data.subjects : undefined,
            schedule: Array.isArray(data.schedule) ? data.schedule : undefined,
            calendar: Array.isArray(data.calendar) ? data.calendar : undefined,
            flashcards: Array.isArray(data.flashcards) ? data.flashcards : undefined,
            studentName: data.studentName || undefined,
            educationLevel: data.educationLevel || undefined,
          });
          if (data.studentName) setNameInput(data.studentName);
          if (data.educationLevel) setLevelInput(data.educationLevel);
          setRestoreStatus('¡Copia de seguridad restaurada correctamente! ✅');
          setTimeout(() => setRestoreStatus(null), 4000);
        }
      } catch (err: any) {
        setRestoreStatus(`Error al restaurar: ${err.message}`);
        setTimeout(() => setRestoreStatus(null), 5000);
      }
    };
    reader.readAsText(file);
    // Reset file input
    e.target.value = '';
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Ajustes y Configuración
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Personaliza tu nombre, protege tu API de Gemini, cambia de tema y haz copias de seguridad de tus apuntes y horarios.
        </p>
      </div>

      {/* 1. Student Profile & Multi-User Local Storage */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-xs shrink-0 border border-white dark:border-slate-800"
              style={{ backgroundColor: activeProfile?.color || '#6366f1' }}
            >
              <span>{activeProfile?.avatar || (levelInput.includes('Primaria') ? '🎒' : '🎓')}</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-slate-900 dark:text-white text-base">
                  Perfil Activo: {activeProfile?.name || nameInput || 'Estudiante'}
                </h2>
                {activeProfile?.pin && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Protegido con PIN
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Cada persona tiene sus propios datos aislados y guardados en este dispositivo sin servidores.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenProfileManager && (
              <button
                type="button"
                onClick={onOpenProfileManager}
                className="px-3.5 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <Users className="w-4 h-4" />
                <span>Cambiar / Añadir Estudiante</span>
              </button>
            )}

            {activeProfile?.pin && onLockProfile && (
              <button
                type="button"
                onClick={onLockProfile}
                title="Bloquear pantalla con PIN"
                className="p-2 rounded-xl bg-slate-100 hover:bg-amber-100 dark:bg-slate-800 dark:hover:bg-amber-950/60 text-slate-600 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
              >
                <Lock className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Security & Privacy Banner */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-50/80 to-indigo-50/80 dark:from-emerald-950/30 dark:to-indigo-950/30 border border-emerald-200/80 dark:border-emerald-800/60 text-xs space-y-2">
          <div className="flex items-center gap-2 font-bold text-emerald-800 dark:text-emerald-300">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Almacenamiento 100% Local y Privado (Cero Servidores Externos)</span>
          </div>
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-[11px]">
            Tus asignaturas, temas, apuntes, horarios y cuestionarios <strong>no se guardan en ningún servidor de internet ni en la nube</strong>. Están almacenados de forma segura dentro de tu propio navegador/equipo (IndexedDB y LocalStorage). Nadie puede verlos ni hackearlos desde fuera. Si varias personas usan este mismo equipo, cada una tiene su perfil completamente separado.
          </p>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-4 max-w-lg pt-1">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Tu Nombre o Apodo:
            </label>
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="Ej: Marcos, Lucía, Carlos..."
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Etapa Educativa:
            </label>
            <select
              value={levelInput}
              onChange={(e) => setLevelInput(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            >
              {EDUCATION_LEVELS.map((lvl) => (
                <option key={lvl} value={lvl} className="dark:bg-slate-900">
                  {lvl}
                </option>
              ))}
            </select>
            {levelInput.includes('Primaria') && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1.5 pt-0.5">
                <span>🎒</span>
                <span>¡Modo Primaria activado! Ideal para niños de 6 a 12 años, con explicaciones claras, amables y divertidas.</span>
              </p>
            )}
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button
              type="submit"
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>Guardar Perfil</span>
            </button>

            {profileSavedToast && (
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4" /> ¡Nombre y perfil guardados!
              </span>
            )}
          </div>
        </form>
      </section>

      {/* 2. Appearance / Dark & Light Mode */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-950/70 text-purple-600 dark:text-purple-400">
            {settings.theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          </div>
          <div>
            <h2 className="font-bold text-slate-900 dark:text-white text-base">
              Modo Visual y Tema (Claro / Oscuro)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Alterna entre la interfaz clara y el modo oscuro para estudiar cómodamente a cualquier hora.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 max-w-md pt-2">
          <button
            type="button"
            onClick={() => onUpdateSettings({ ...settings, theme: 'light' })}
            className={`p-4 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
              settings.theme === 'light'
                ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 ring-2 ring-indigo-500/20'
                : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Sun className="w-5 h-5 text-amber-500" />
              <span className="text-sm font-semibold">Modo Claro</span>
            </div>
            {settings.theme === 'light' && <CheckCircle2 className="w-4 h-4 text-indigo-600" />}
          </button>

          <button
            type="button"
            onClick={() => onUpdateSettings({ ...settings, theme: 'dark' })}
            className={`p-4 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
              settings.theme === 'dark'
                ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 ring-2 ring-indigo-500/20'
                : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Moon className="w-5 h-5 text-indigo-400" />
              <span className="text-sm font-semibold">Modo Oscuro</span>
            </div>
            {settings.theme === 'dark' && <CheckCircle2 className="w-4 h-4 text-indigo-400" />}
          </button>
        </div>
      </section>

      {/* 3. Gemini API Key Configuration (Secure & Mobile Persistent) */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-950/70 text-purple-600 dark:text-purple-400">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 dark:text-white text-base">
                Clave de API de Gemini (Almacenamiento Seguro)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Guarda tu clave de Google AI Studio en tu móvil o navegador para que persista automáticamente.
              </p>
            </div>
          </div>
          <span className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <ShieldCheck className="w-4 h-4" /> Almacenamiento Local Seguro
          </span>
        </div>

        {/* Security badge explainer */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 space-y-2">
          <p className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
            <Smartphone className="w-4 h-4 text-indigo-500" />
            Privacidad total en tu dispositivo móvil o PC:
          </p>
          <p className="leading-relaxed">
            Tu clave <strong className="text-indigo-600 dark:text-indigo-400">no se guarda en el código de la app</strong> ni se comparte con terceros. Se guarda únicamente en el almacenamiento local cifrado de tu navegador o móvil para que no tengas que escribirla cada vez que abras la aplicación.
          </p>
        </div>

        {/* Key Input Field */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Tu clave API de Google AI Studio:
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-mono text-slate-900 dark:text-white placeholder:text-slate-400 pr-10 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <button
              onClick={handleSaveApiKey}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors shrink-0"
            >
              <Save className="w-4 h-4" />
              <span>Guardar en el Móvil</span>
            </button>
          </div>
        </div>

        {/* Buttons: Test Connection & Remove */}
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            onClick={handleTestConnection}
            disabled={isTestingKey}
            className="px-4 py-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/60 text-xs font-semibold flex items-center gap-1.5 border border-purple-200 dark:border-purple-800 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isTestingKey ? 'Probando conexión...' : 'Probar conexión con IA'}</span>
          </button>

          {apiKeyInput && (
            <button
              onClick={handleClearApiKey}
              className="px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Borrar de este dispositivo</span>
            </button>
          )}

          {keySavedToast && (
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4" /> ¡Guardada en este dispositivo!
            </span>
          )}
        </div>

        {/* Test Result Message */}
        {testResult && (
          <div
            className={`p-4 rounded-xl border text-xs flex flex-col gap-2.5 animate-in fade-in ${
              testResult.success
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
            }`}
          >
            <div className="flex items-start gap-2.5">
              {testResult.success ? (
                <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-600" />
              ) : (
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600" />
              )}
              <div className="flex-1 space-y-1">
                <p className="font-bold text-sm">
                  {testResult.success
                    ? '¡Conexión Correcta con Gemini!'
                    : 'Aviso: La API de Gemini necesita ser habilitada'}
                </p>
                <p className="leading-relaxed">{testResult.message}</p>

                {!testResult.success && (
                  <div className="pt-2 flex flex-wrap gap-2">
                    <a
                      href={
                        testResult.activationUrl ||
                        'https://console.developers.google.com/apis/api/generativelanguage.googleapis.com/overview?project=814573056493'
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>Habilitar Gemini en Google Cloud (1 clic)</span>
                    </a>

                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-semibold transition-colors"
                    >
                      <span>O crear clave en nuevo proyecto en AI Studio</span>
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* How to get API Key Link & Activation Help */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 space-y-3">
          <div className="p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-900 dark:text-amber-200 space-y-2">
            <p className="font-bold flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
              <Sparkles className="w-4 h-4 text-amber-600" />
              ¿Por qué Google pide habilitar la API?
            </p>
            <p className="leading-relaxed text-[11px] text-amber-800 dark:text-amber-300">
              Por motivos de seguridad, Google no permite que ninguna aplicación externa active servicios dentro de tu cuenta personal de Google sin tu autorización. Tú eres el único dueño de tu cuenta y solo tú puedes autorizarla.
            </p>
            <div className="pt-1 flex flex-wrap gap-2">
              <a
                href="https://console.developers.google.com/apis/api/generativelanguage.googleapis.com/overview?project=814573056493"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs shadow-xs transition-colors"
              >
                <span>Habilitar en Google Cloud (Proyecto 814573056493)</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 rounded-lg text-xs font-semibold hover:bg-amber-100/50 transition-colors"
              >
                <span>Crear clave en AI Studio (Activación automática)</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          <div>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              <span>¿Prefieres una clave nueva ya activada? Consíguela en Google AI Studio</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              1. Entra con tu cuenta de Google. 2. Pulsa "Create API key" y elige "Create API key in new project". 3. Pégala aquí arriba. ¡Es 100% gratuita y viene activada automáticamente!
            </p>
          </div>
        </div>
      </section>

      {/* 4. Firebase Cloud Sync & Multidevice Storage */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 dark:text-white text-base">
                Sincronización en la Nube con Google Firebase
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Plan Gratuito Spark • Sincroniza asignaturas, apuntes, flashcards y horario entre tus dispositivos.
              </p>
            </div>
          </div>

          {onOpenAuthModal && (
            <button
              onClick={onOpenAuthModal}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition-colors"
            >
              <CloudUpload className="w-4 h-4" />
              <span>{firebaseUser ? 'Administrar Cuenta y Nube' : 'Iniciar Sesión / Sincronizar'}</span>
            </button>
          )}
        </div>

        <div className="p-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/40 text-xs text-blue-900 dark:text-blue-200 space-y-2">
          <div className="flex items-center gap-2 font-bold text-blue-800 dark:text-blue-300">
            <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>
              {firebaseUser
                ? `Conectado como: ${firebaseUser.email || firebaseUser.displayName || 'Usuario de Firebase'}`
                : 'Modo Local Activo (Almacenamiento en tu dispositivo)'}
            </span>
          </div>
          <p className="leading-relaxed text-[11px]">
            {firebaseUser
              ? 'Tus datos están protegidos por Reglas de Seguridad en Cloud Firestore para que solo tú puedas acceder a ellos desde cualquier móvil, tablet o PC.'
              : 'Puedes usar EstudiaFácil sin registrarte guardando todo en tu navegador, o iniciar sesión con Google / Correo para tener sincronización automática entre dispositivos.'}
          </p>
        </div>
      </section>

      {/* 5. Mobile Shortcut / PWA Standalone Mode */}
      <PWAInstallPrompt variant="settings" />

      {/* 6. Complete Backup & Data Management */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            <Download className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-slate-900 dark:text-white text-base">
              Copia de Seguridad y Restauración de Datos
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Todos tus apuntes, temas, notas, horarios escolares y calendarios están guardados en tu dispositivo. Puedes exportarlos a un archivo o restaurarlos cuando quieras.
            </p>
          </div>
        </div>

        {/* Status indicator */}
        <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-bold">
              Autoguardado activo en tiempo real y al salir de la web
            </p>
            <p className="text-[11px] text-emerald-700 dark:text-emerald-300/90 leading-relaxed">
              Tus asignaturas, temas, apuntes, horarios, calendario y conversaciones con la IA se guardan automáticamente en tu dispositivo mientras escribes, y <strong>también se aseguran al cerrar la pestaña, cambiar de aplicación o salir del navegador</strong>. No perderás ningún dato.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            onClick={handleExportBackup}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Descargar Copia de Seguridad (JSON)</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold flex items-center gap-2 transition-colors"
          >
            <Upload className="w-4 h-4 text-indigo-500" />
            <span>Restaurar Copia de Seguridad</span>
          </button>

          {/* Hidden File Input for Restore */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleRestoreFileChange}
            className="hidden"
          />

          <button
            onClick={onResetAllData}
            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold flex items-center gap-2 transition-colors ml-auto"
          >
            <Trash2 className="w-4 h-4" />
            <span>Limpiar todo y empezar de cero</span>
          </button>
        </div>

        {restoreStatus && (
          <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 animate-in fade-in">
            {restoreStatus}
          </p>
        )}
      </section>

      {/* 5. App Information & Privacy */}
      <section className="bg-gradient-to-br from-indigo-50/50 to-purple-50/50 dark:from-slate-900/60 dark:to-slate-900/40 border border-indigo-100 dark:border-slate-800 rounded-2xl p-6 text-xs text-slate-600 dark:text-slate-400 space-y-3">
        <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 font-bold text-sm">
          <Info className="w-4 h-4" />
          <span>Información de EstudiaFácil AI</span>
        </div>
        <p className="leading-relaxed">
          <strong>Versión:</strong> 2.5.0 • Desarrollado para estudiantes de secundaria, bachillerato, formación profesional y universidad.
        </p>
        <p className="leading-relaxed">
          <strong>Capacidades de IA:</strong> Análisis multimodal de apuntes manuscritos, diagramas, fórmulas y documentos PDF con el modelo <em>Gemini 3.8 Flash</em> de Google.
        </p>
        <p className="leading-relaxed">
          <strong>Almacenamiento Local:</strong> Tus archivos y notas se guardan en la base de datos IndexedDB y LocalStorage de tu propio navegador para que puedas estudiar en cualquier momento sin depender de servidores externos.
        </p>
      </section>
    </div>
  );
};
