import React, { useState } from 'react';
import {
  X,
  Cloud,
  CloudUpload,
  CloudDownload,
  Lock,
  Mail,
  KeyRound,
  User,
  LogOut,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  Shield,
  Layers,
  BookOpen,
  Calendar,
  Clock,
  RefreshCw,
} from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';
import {
  signInWithGoogle,
  loginWithEmail,
  registerWithEmail,
  logoutFirebase,
  pullAllUserDataFromCloud,
  syncAllLocalDataToCloud,
  FullCloudData,
} from '../services/firebase';
import { Subject, ScheduleSlot, CalendarEvent, UserFlashcard, UserProfile } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: FirebaseUser | null;
  activeProfile?: UserProfile;
  subjects: Subject[];
  flashcards: UserFlashcard[];
  schedule: ScheduleSlot[];
  calendar: CalendarEvent[];
  onApplyCloudData: (data: FullCloudData) => void;
  onSyncComplete?: (message: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  activeProfile,
  subjects,
  flashcards,
  schedule,
  calendar,
  onApplyCloudData,
  onSyncComplete,
}) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState(activeProfile?.name || '');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const user = await signInWithGoogle();
      setSuccessMsg(`¡Bienvenido de nuevo, ${user.displayName || user.email}!`);
      // Automatically pull or prompt sync
      try {
        const cloudData = await pullAllUserDataFromCloud(user.uid);
        if (
          cloudData.subjects.length > 0 ||
          cloudData.flashcards.length > 0 ||
          cloudData.schedule.length > 0 ||
          cloudData.calendar.length > 0
        ) {
          onApplyCloudData(cloudData);
          onSyncComplete?.('Datos sincronizados desde la nube de Firebase');
        } else if (subjects.length > 0 || flashcards.length > 0) {
          // Push initial local data to cloud
          await syncAllLocalDataToCloud(user.uid, {
            userProfile: activeProfile,
            subjects,
            flashcards,
            schedule,
            calendar,
          });
          onSyncComplete?.('Tus datos locales se han subido a Firebase');
        }
      } catch (syncErr) {
        console.warn('Sync notice:', syncErr);
      }
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: unknown) {
      console.error(err);
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Error al iniciar sesión con Google. Comprueba tu conexión.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!email || !password) {
      setErrorMsg('Por favor introduce tu correo electrónico y contraseña.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    try {
      setLoading(true);
      let user: FirebaseUser;
      if (mode === 'register') {
        user = await registerWithEmail(email, password, displayName);
        setSuccessMsg('¡Cuenta creada exitosamente en Firebase!');
        // Push local data up to newly registered account
        await syncAllLocalDataToCloud(user.uid, {
          userProfile: activeProfile,
          subjects,
          flashcards,
          schedule,
          calendar,
        });
        onSyncComplete?.('Tus datos actuales se han vinculado a tu nueva cuenta');
      } else {
        user = await loginWithEmail(email, password);
        setSuccessMsg('¡Sesión iniciada con éxito!');
        // Pull cloud data
        const cloudData = await pullAllUserDataFromCloud(user.uid);
        if (
          cloudData.subjects.length > 0 ||
          cloudData.flashcards.length > 0 ||
          cloudData.schedule.length > 0 ||
          cloudData.calendar.length > 0
        ) {
          onApplyCloudData(cloudData);
          onSyncComplete?.('Tus datos se han recuperado de la nube');
        }
      }
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: unknown) {
      console.error(err);
      let message = 'Error en la autenticación.';
      if (err instanceof Error) {
        if (err.message.includes('auth/invalid-credential') || err.message.includes('auth/wrong-password')) {
          message = 'Correo electrónico o contraseña incorrectos.';
        } else if (err.message.includes('auth/email-already-in-use')) {
          message = 'Este correo ya está registrado. Por favor inicia sesión.';
        } else if (err.message.includes('auth/invalid-email')) {
          message = 'El formato del correo electrónico no es válido.';
        } else {
          message = err.message;
        }
      }
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncToCloud = async () => {
    if (!currentUser) return;
    try {
      setSyncing(true);
      setErrorMsg(null);
      const res = await syncAllLocalDataToCloud(currentUser.uid, {
        userProfile: activeProfile,
        subjects,
        flashcards,
        schedule,
        calendar,
      });
      setSuccessMsg(`¡Sincronizado! Se han guardado ${res.count} elementos en Cloud Firestore.`);
      onSyncComplete?.('Sincronización completada con Cloud Firestore');
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Error al sincronizar con la nube de Firebase.'
      );
    } finally {
      setSyncing(false);
    }
  };

  const handleRestoreFromCloud = async () => {
    if (!currentUser) return;
    try {
      setSyncing(true);
      setErrorMsg(null);
      const cloudData = await pullAllUserDataFromCloud(currentUser.uid);
      onApplyCloudData(cloudData);
      setSuccessMsg(
        `¡Recuperado! Se cargaron ${cloudData.subjects.length} asignaturas, ${cloudData.flashcards.length} flashcards, ${cloudData.schedule.length} horarios y ${cloudData.calendar.length} eventos.`
      );
      onSyncComplete?.('Datos restaurados desde la nube');
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Error al recuperar los datos desde la nube.'
      );
    } finally {
      setSyncing(false);
    }
  };

  const handleLogout = async () => {
    try {
      setLoading(true);
      await logoutFirebase();
      setSuccessMsg('Has cerrado sesión. Puedes continuar usando la app en modo local.');
      setTimeout(() => {
        setSuccessMsg(null);
      }, 1500);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error al cerrar sesión.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-white/15 backdrop-blur-md">
                <Cloud className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Sincronización en la Nube</h3>
                <p className="text-xs text-white/80">
                  Firebase Authentication & Cloud Firestore (Plan Spark Gratuito)
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-slate-800 dark:text-slate-200">
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/70 border border-rose-200 dark:border-rose-800 flex items-start gap-3 text-rose-800 dark:text-rose-200 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800 flex items-start gap-3 text-emerald-800 dark:text-emerald-200 text-xs">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {currentUser ? (
            /* Logged in state */
            <div className="space-y-5">
              <div className="p-4 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                    {currentUser.displayName ? currentUser.displayName.charAt(0).toUpperCase() : '👤'}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {currentUser.displayName || 'Estudiante'}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {currentUser.email || 'Cuenta de Firebase'}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                      <Shield className="w-3 h-3" />
                      <span>Sesión activa & Reglas de seguridad personales</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleLogout}
                  disabled={loading}
                  className="px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-800 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 flex items-center gap-1.5 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Salir</span>
                </button>
              </div>

              {/* Data Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-center">
                  <BookOpen className="w-4 h-4 text-indigo-500 mx-auto mb-1" />
                  <span className="block text-base font-bold">{subjects.length}</span>
                  <span className="text-[11px] text-slate-500">Asignaturas</span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-center">
                  <Layers className="w-4 h-4 text-purple-500 mx-auto mb-1" />
                  <span className="block text-base font-bold">{flashcards.length}</span>
                  <span className="text-[11px] text-slate-500">Flashcards</span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-center">
                  <Clock className="w-4 h-4 text-amber-500 mx-auto mb-1" />
                  <span className="block text-base font-bold">{schedule.length}</span>
                  <span className="text-[11px] text-slate-500">Horarios</span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-center">
                  <Calendar className="w-4 h-4 text-emerald-500 mx-auto mb-1" />
                  <span className="block text-base font-bold">{calendar.length}</span>
                  <span className="text-[11px] text-slate-500">Exámenes</span>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2.5">
                <button
                  onClick={handleSyncToCloud}
                  disabled={syncing}
                  className="w-full py-3 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
                >
                  {syncing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CloudUpload className="w-4 h-4" />
                  )}
                  <span>Guardar todo en la nube (Sincronizar ahora)</span>
                </button>

                <button
                  onClick={handleRestoreFromCloud}
                  disabled={syncing}
                  className="w-full py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition-all border border-slate-200 dark:border-slate-700"
                >
                  {syncing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CloudDownload className="w-4 h-4" />
                  )}
                  <span>Recuperar datos de la nube en este dispositivo</span>
                </button>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300">
                  <Shield className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Seguridad y Privacidad Spark:</span>
                </div>
                <p>
                  Tus datos en Cloud Firestore están aislados en tu propia colección privada. Nadie más puede leer ni modificar tus apuntes o flashcards.
                </p>
              </div>
            </div>
          ) : (
            /* Not logged in: Show Login / Register form + Google Auth */
            <div className="space-y-4">
              {/* Google Fast Sign-in */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full py-3 px-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 font-bold text-xs flex items-center justify-center gap-3 shadow-2xs transition-all text-slate-800 dark:text-slate-100"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                )}
                <span>Continuar con Google</span>
              </button>

              <div className="relative flex items-center justify-center">
                <div className="border-t border-slate-200 dark:border-slate-800 w-full" />
                <span className="bg-white dark:bg-slate-900 px-3 text-[11px] uppercase tracking-wider text-slate-400 font-semibold absolute">
                  o con correo
                </span>
              </div>

              {/* Mode switch */}
              <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all ${
                    mode === 'login'
                      ? 'bg-white dark:bg-slate-900 shadow-xs text-indigo-600 dark:text-indigo-400'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Iniciar Sesión
                </button>
                <button
                  type="button"
                  onClick={() => setMode('register')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all ${
                    mode === 'register'
                      ? 'bg-white dark:bg-slate-900 shadow-xs text-indigo-600 dark:text-indigo-400'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Registrarse
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleEmailAuth} className="space-y-3">
                {mode === 'register' && (
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Nombre o apodo del estudiante
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Ej. Lucas, Sofía..."
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Correo electrónico
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="estudiante@ejemplo.com"
                      required
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Contraseña
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      required
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <span>{mode === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta'}</span>
                  )}
                </button>
              </form>

              {/* Local Storage fallback notice */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-xs text-slate-500 space-y-1">
                <div className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Modo Local Disponible:</span>
                </div>
                <p>
                  Si no quieres iniciar sesión, tus datos se seguirán guardando en el almacenamiento local de este dispositivo con autoguardado automático.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Firebase Spark Gratuito</span>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 font-medium"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
