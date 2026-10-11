import React, { useState } from 'react';
import { Sparkles, User, GraduationCap, ArrowRight, X } from 'lucide-react';

interface NamePromptModalProps {
  currentName?: string;
  currentLevel?: string;
  isOpen: boolean;
  onSave: (name: string, level?: string) => void;
  onClose?: () => void;
  canDismiss?: boolean;
}

export const NamePromptModal: React.FC<NamePromptModalProps> = ({
  currentName = '',
  currentLevel = 'Secundaria / Bachillerato',
  isOpen,
  onSave,
  onClose,
  canDismiss = false,
}) => {
  const [name, setName] = useState<string>(currentName);
  const [level, setLevel] = useState<string>(currentLevel);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave(name.trim(), level);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-indigo-500/10 dark:bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />

        {canDismiss && onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25">
            <Sparkles className="w-8 h-8 animate-pulse" />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              ¡Bienvenido a EstudiaFácil AI!
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              ¿Cómo te llamas? Personalizaremos tu espacio de estudio, horario y el trato del tutor con IA.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="w-full space-y-4 pt-2 text-left">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-indigo-500" />
                <span>Tu nombre o cómo te gusta que te llamen:</span>
              </label>
              <input
                type="text"
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Marcos, Laura, Carlos..."
                className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition-all shadow-xs"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5 flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-purple-500" />
                <span>Nivel de estudios (opcional):</span>
              </label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-medium text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition-all"
              >
                <option value="ESO / Secundaria">ESO / Secundaria</option>
                <option value="Bachillerato">Bachillerato</option>
                <option value="Universidad / Grado">Universidad / Grado</option>
                <option value="Formación Profesional (FP)">Formación Profesional (FP)</option>
                <option value="Oposiciones / Otro">Oposiciones / Otro</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={!name.trim()}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white font-bold text-xs sm:text-sm shadow-md shadow-indigo-500/20 flex items-center justify-center gap-2 transition-all mt-4"
            >
              <span>Entrar a mi Espacio de Estudio</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
