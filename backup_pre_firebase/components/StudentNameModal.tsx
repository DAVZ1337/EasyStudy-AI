import React, { useState } from 'react';
import {
  GraduationCap,
  Sparkles,
  CheckCircle2,
  ShieldCheck,
  X,
  BookOpen,
} from 'lucide-react';

interface StudentNameModalProps {
  currentName: string;
  currentLevel?: string;
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, level: string) => void;
  isInitialSetup?: boolean;
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

export const StudentNameModal: React.FC<StudentNameModalProps> = ({
  currentName,
  currentLevel,
  isOpen,
  onClose,
  onSave,
  isInitialSetup = false,
}) => {
  const [name, setName] = useState(currentName || '');
  const [level, setLevel] = useState(
    currentLevel || 'Bachillerato'
  );
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Por favor, introduce tu nombre o cómo te gustaría que te llamemos.');
      return;
    }
    setError('');
    onSave(trimmed, level);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 space-y-6 animate-in zoom-in-95 duration-200">
        {/* Close button if not initial setup */}
        {!isInitialSetup && (
          <button
            onClick={onClose}
            aria-label="Cerrar modal"
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Header with Icon */}
        <div className="text-center space-y-2">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
            <GraduationCap className="w-7 h-7" />
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {isInitialSetup ? '¡Bienvenido/a a EstudiaFácil AI!' : 'Tu Perfil de Estudiante'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            {isInitialSetup
              ? 'Personaliza tu espacio de estudio. ¿Cómo te llamas?'
              : 'Actualiza tus datos para personalizar el horario, temas y el tutor de IA.'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <span>Tu Nombre o Apodo</span>
              <span className="text-indigo-600 dark:text-indigo-400">*</span>
            </label>
            <input
              type="text"
              autoFocus
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError('');
              }}
              placeholder="Ej: Marcos, Sofía, Alex..."
              className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white placeholder:text-slate-400 text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-800 transition-all"
            />
            {error && (
              <p className="text-xs text-rose-500 font-medium">{error}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
              <span>Nivel o Etapa de Estudio</span>
            </label>
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            >
              {EDUCATION_LEVELS.map((lvl) => (
                <option key={lvl} value={lvl} className="dark:bg-slate-900">
                  {lvl}
                </option>
              ))}
            </select>
            {level.includes('Primaria') && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1.5 pt-0.5">
                <span>🎒</span>
                <span>¡Modo adaptado para niños y pequeños estudiantes! Lenguaje fácil, divertido y paso a paso.</span>
              </p>
            )}
          </div>

          {/* Privacy & Safety Note */}
          <div className="p-3.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 text-[11px] text-indigo-900 dark:text-indigo-200 space-y-1">
            <div className="flex items-center gap-1.5 font-bold">
              <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span>Guardado Seguro en tu Dispositivo</span>
            </div>
            <p className="leading-relaxed text-slate-600 dark:text-slate-300">
              Todas tus asignaturas, notas, horarios, temas y archivos se guardan localmente para que nunca pierdas nada al salir o apagar el móvil.
            </p>
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center gap-2.5">
            {!isInitialSetup && (
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition-colors"
              >
                Cancelar
              </button>
            )}
            <button
              type="submit"
              className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-md shadow-indigo-500/25 flex items-center justify-center gap-2 transition-all"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isInitialSetup ? 'Comenzar a Estudiar' : 'Guardar Perfil'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
