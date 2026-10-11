import React, { useState } from 'react';
import {
  X,
  Plus,
  Lock,
  Unlock,
  ShieldCheck,
  Check,
  Trash2,
  Edit2,
  GraduationCap,
  Sparkles,
  AlertCircle,
  KeyRound,
  UserCheck,
} from 'lucide-react';
import { UserProfile } from '../types';
import {
  loadProfiles,
  saveProfiles,
  createProfile,
  updateProfile,
  deleteProfile,
  hashPin,
  verifyProfilePin,
} from '../utils/storage';

interface ProfileManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeProfile: UserProfile;
  onSelectProfile: (profile: UserProfile) => void;
  onProfileUpdated: (updatedProfile: UserProfile) => void;
  onLockCurrentProfile: () => void;
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

const AVATAR_OPTIONS = ['🎒', '🎓', '🔬', '📚', '🎨', '🚀', '💡', '🦁', '🐬', '🌟', '⚡', '⚽'];
const COLOR_OPTIONS = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

export const ProfileManagerModal: React.FC<ProfileManagerModalProps> = ({
  isOpen,
  onClose,
  activeProfile,
  onSelectProfile,
  onProfileUpdated,
  onLockCurrentProfile,
}) => {
  const [profiles, setProfiles] = useState<UserProfile[]>(() => loadProfiles());
  const [viewMode, setViewMode] = useState<'list' | 'create' | 'edit'>('list');

  // Form states for create / edit
  const [formName, setFormName] = useState('');
  const [formLevel, setFormLevel] = useState('Educación Primaria (6-12 años)');
  const [formAvatar, setFormAvatar] = useState('🎒');
  const [formColor, setFormColor] = useState('#6366f1');
  const [formPin, setFormPin] = useState('');
  const [formConfirmPin, setFormConfirmPin] = useState('');
  const [enablePin, setEnablePin] = useState(false);
  const [editingTargetId, setEditingTargetId] = useState<string | null>(null);
  const [formError, setFormError] = useState('');

  // Switch PIN prompt state
  const [pinPromptProfile, setPinPromptProfile] = useState<UserProfile | null>(null);
  const [promptPinInput, setPromptPinInput] = useState('');
  const [promptPinError, setPromptPinError] = useState('');

  // Delete confirm state
  const [profileToDelete, setProfileToDelete] = useState<UserProfile | null>(null);

  if (!isOpen) return null;

  const refreshList = () => {
    setProfiles(loadProfiles());
  };

  const openCreateForm = () => {
    setFormName('');
    setFormLevel('Educación Primaria (6-12 años)');
    setFormAvatar('🎒');
    setFormColor('#6366f1');
    setFormPin('');
    setFormConfirmPin('');
    setEnablePin(false);
    setFormError('');
    setEditingTargetId(null);
    setViewMode('create');
  };

  const openEditForm = (profile: UserProfile) => {
    setFormName(profile.name);
    setFormLevel(profile.educationLevel);
    setFormAvatar(profile.avatar);
    setFormColor(profile.color);
    setEnablePin(Boolean(profile.pin));
    setFormPin('');
    setFormConfirmPin('');
    setFormError('');
    setEditingTargetId(profile.id);
    setViewMode('edit');
  };

  const handleSaveProfileForm = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formName.trim()) {
      setFormError('Por favor introduce el nombre del estudiante.');
      return;
    }

    if (enablePin) {
      if (formPin.length !== 4 || !/^\d{4}$/.test(formPin)) {
        setFormError('El PIN debe tener exactamente 4 números.');
        return;
      }
      if (formPin !== formConfirmPin) {
        setFormError('Los dos PIN introducidos no coinciden.');
        return;
      }
    }

    if (viewMode === 'create') {
      const created = createProfile({
        name: formName.trim(),
        educationLevel: formLevel,
        avatar: formAvatar,
        color: formColor,
        pin: enablePin ? formPin : undefined,
      });
      refreshList();
      onSelectProfile(created);
      setViewMode('list');
      onClose();
    } else if (viewMode === 'edit' && editingTargetId) {
      const existing = profiles.find((p) => p.id === editingTargetId);
      if (existing) {
        const updated: UserProfile = {
          ...existing,
          name: formName.trim(),
          educationLevel: formLevel,
          avatar: formAvatar,
          color: formColor,
          pin: enablePin ? (formPin ? hashPin(formPin) : existing.pin) : undefined,
        };
        updateProfile(updated);
        refreshList();
        if (existing.id === activeProfile.id) {
          onProfileUpdated(updated);
        }
        setViewMode('list');
      }
    }
  };

  const handleAttemptSwitch = (target: UserProfile) => {
    if (target.id === activeProfile.id) return;

    if (target.pin) {
      setPinPromptProfile(target);
      setPromptPinInput('');
      setPromptPinError('');
    } else {
      onSelectProfile(target);
      onClose();
    }
  };

  const handleVerifySwitchPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinPromptProfile) return;

    if (verifyProfilePin(pinPromptProfile, promptPinInput)) {
      onSelectProfile(pinPromptProfile);
      setPinPromptProfile(null);
      onClose();
    } else {
      setPromptPinError('PIN incorrecto. Inténtalo de nuevo.');
      setPromptPinInput('');
    }
  };

  const handleConfirmDelete = () => {
    if (!profileToDelete) return;
    try {
      const remaining = deleteProfile(profileToDelete.id);
      setProfiles(remaining);
      if (profileToDelete.id === activeProfile.id) {
        onSelectProfile(remaining[0]);
      }
      setProfileToDelete(null);
    } catch (err: any) {
      alert(err.message || 'No se pudo eliminar el perfil');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-7 space-y-5 animate-in zoom-in-95 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-xs">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-slate-900 dark:text-white text-lg">
                {viewMode === 'list' && 'Perfiles de Estudiante'}
                {viewMode === 'create' && 'Añadir Nuevo Estudiante'}
                {viewMode === 'edit' && 'Editar Perfil'}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                100% privado en este equipo • Sin servidores externos
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Cerrar modal"
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* VIEW: LIST OF PROFILES */}
        {viewMode === 'list' && (
          <div className="space-y-4 overflow-y-auto flex-1 pr-1">
            <div className="space-y-2.5">
              {profiles.map((profile) => {
                const isActive = profile.id === activeProfile.id;
                return (
                  <div
                    key={profile.id}
                    className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                      isActive
                        ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                    }`}
                  >
                    <div
                      onClick={() => handleAttemptSwitch(profile)}
                      className="flex items-center gap-3 flex-1 cursor-pointer min-w-0"
                    >
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0 shadow-xs border border-white dark:border-slate-800"
                        style={{ backgroundColor: profile.color || '#6366f1' }}
                      >
                        <span>{profile.avatar || '🎓'}</span>
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-900 dark:text-white truncate">
                            {profile.name}
                          </span>
                          {isActive && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-600 text-white shrink-0">
                              Activo
                            </span>
                          )}
                          {profile.pin && (
                            <span
                              title="Protegido con PIN"
                              className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-0.5 shrink-0"
                            >
                              <Lock className="w-3 h-3" />
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {profile.educationLevel}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => openEditForm(profile)}
                        title="Editar perfil"
                        className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      {profiles.length > 1 && (
                        <button
                          onClick={() => setProfileToDelete(profile)}
                          title="Eliminar perfil"
                          className="p-2 rounded-xl text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quick Action: Add student profile */}
            <button
              onClick={openCreateForm}
              className="w-full py-3 px-4 rounded-2xl border-2 border-dashed border-indigo-200 dark:border-indigo-900/60 hover:border-indigo-500 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Añadir Otro Estudiante / Hermano</span>
            </button>

            {/* Lock Active Profile Button if has PIN */}
            {activeProfile.pin && (
              <div className="pt-2">
                <button
                  onClick={() => {
                    onClose();
                    onLockCurrentProfile();
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 dark:hover:bg-amber-900/50 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs font-bold flex items-center justify-center gap-2 transition-colors"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Bloquear Perfil Ahora (Protección con PIN)</span>
                </button>
              </div>
            )}

            {/* Privacy & Anti-Hacking Reassurance */}
            <div className="p-3.5 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-200 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Datos 100% Blindados y Locales</span>
              </div>
              <p className="text-[11px] text-emerald-800 dark:text-emerald-300 leading-relaxed">
                Cada estudiante tiene sus propias asignaturas, horarios y temas completamente separados. No se envían a ningún servidor externo. Si activas un PIN, nadie más que use este ordenador podrá ver tus cosas.
              </p>
            </div>
          </div>
        )}

        {/* VIEW: CREATE OR EDIT PROFILE */}
        {(viewMode === 'create' || viewMode === 'edit') && (
          <form onSubmit={handleSaveProfileForm} className="space-y-4 overflow-y-auto flex-1 pr-1">
            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Nombre del Estudiante:
              </label>
              <input
                type="text"
                autoFocus
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Ej: Lucas, Elena, Mateo..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            {/* Education Level */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Etapa Educativa:
              </label>
              <select
                value={formLevel}
                onChange={(e) => {
                  setFormLevel(e.target.value);
                  if (e.target.value.includes('Primaria') && formAvatar === '🎓') {
                    setFormAvatar('🎒');
                  }
                }}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              >
                {EDUCATION_LEVELS.map((lvl) => (
                  <option key={lvl} value={lvl} className="dark:bg-slate-900">
                    {lvl}
                  </option>
                ))}
              </select>
              {formLevel.includes('Primaria') && (
                <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1.5">
                  <span>🎒</span>
                  <span>Modo Primaria: Explicaciones sencillas, amables y divertidas para niños de 6 a 12 años.</span>
                </p>
              )}
            </div>

            {/* Avatar & Color Pickers */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Icono de Avatar:
              </label>
              <div className="flex gap-2 flex-wrap">
                {AVATAR_OPTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setFormAvatar(emoji)}
                    className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg transition-transform ${
                      formAvatar === emoji
                        ? 'ring-2 ring-indigo-500 scale-110 bg-indigo-50 dark:bg-indigo-950/80 shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 hover:scale-105'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Color identificativo:
              </label>
              <div className="flex gap-2 flex-wrap items-center">
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setFormColor(c)}
                    className={`w-7 h-7 rounded-full transition-transform ${
                      formColor === c ? 'ring-2 ring-offset-2 ring-indigo-500 scale-110' : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            {/* Optional PIN Protection */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3">
              <label className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    Bloqueo de Perfil con PIN (4 dígitos)
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={enablePin}
                  onChange={(e) => setEnablePin(e.target.checked)}
                  className="w-4 h-4 rounded-sm text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
              </label>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Evita que hermanos, amigos u otras personas vean tus temas, horarios o apuntes en este dispositivo.
              </p>

              {enablePin && (
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                      {viewMode === 'edit' && !formPin ? 'Nuevo PIN (4 dígitos):' : 'PIN (4 dígitos):'}
                    </label>
                    <input
                      type="password"
                      maxLength={4}
                      pattern="[0-9]*"
                      inputMode="numeric"
                      value={formPin}
                      onChange={(e) => setFormPin(e.target.value.replace(/\D/g, ''))}
                      placeholder="••••"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-center font-mono text-base tracking-widest text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                      Confirmar PIN:
                    </label>
                    <input
                      type="password"
                      maxLength={4}
                      pattern="[0-9]*"
                      inputMode="numeric"
                      value={formConfirmPin}
                      onChange={(e) => setFormConfirmPin(e.target.value.replace(/\D/g, ''))}
                      placeholder="••••"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-center font-mono text-base tracking-widest text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition-colors"
              >
                Volver
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Guardar Perfil</span>
              </button>
            </div>
          </form>
        )}

        {/* PROMPT: SWITCH PIN PROMPT MODAL */}
        {pinPromptProfile && (
          <div className="absolute inset-0 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs rounded-3xl p-6 flex flex-col items-center justify-center text-center space-y-4 animate-in zoom-in-95">
            <div
              className="w-16 h-16 rounded-3xl flex items-center justify-center text-3xl shadow-md border-2 border-white dark:border-slate-800"
              style={{ backgroundColor: pinPromptProfile.color || '#6366f1' }}
            >
              <span>{pinPromptProfile.avatar}</span>
            </div>

            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                Perfil de {pinPromptProfile.name}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Este perfil está protegido con PIN de 4 dígitos.
              </p>
            </div>

            <form onSubmit={handleVerifySwitchPin} className="space-y-3 w-full max-w-[200px]">
              <input
                type="password"
                maxLength={4}
                autoFocus
                pattern="[0-9]*"
                inputMode="numeric"
                value={promptPinInput}
                onChange={(e) => {
                  setPromptPinInput(e.target.value.replace(/\D/g, ''));
                  setPromptPinError('');
                }}
                placeholder="••••"
                className="w-full px-4 py-3 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-center font-mono text-xl tracking-widest text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />

              {promptPinError && (
                <p className="text-xs font-bold text-rose-500 animate-in fade-in">
                  {promptPinError}
                </p>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPinPromptProfile(null)}
                  className="flex-1 py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold"
                >
                  Entrar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* PROMPT: DELETE CONFIRMATION */}
        {profileToDelete && (
          <div className="absolute inset-0 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs rounded-3xl p-6 flex flex-col items-center justify-center text-center space-y-4 animate-in zoom-in-95">
            <div className="w-14 h-14 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <Trash2 className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                ¿Eliminar el perfil de {profileToDelete.name}?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs leading-relaxed">
                Se borrarán todas sus asignaturas, horarios escolares y temas asociados en este dispositivo.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2 w-full max-w-xs">
              <button
                type="button"
                onClick={() => setProfileToDelete(null)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Sí, Eliminar</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
