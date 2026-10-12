import React, { useState } from 'react';
import { Lock, Unlock, ShieldCheck, AlertCircle, Users } from 'lucide-react';
import { UserProfile } from '../types';
import { verifyProfilePin } from '../utils/storage';

interface PinLockScreenProps {
  profile: UserProfile;
  onUnlock: () => void;
  onSwitchProfile: () => void;
}

export const PinLockScreen: React.FC<PinLockScreenProps> = ({
  profile,
  onUnlock,
  onSwitchProfile,
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleDigit = (digit: string) => {
    if (pin.length >= 4) return;
    const newPin = pin + digit;
    setPin(newPin);
    setError(false);
    setErrorMessage('');

    if (newPin.length === 4) {
      // Validate
      setTimeout(() => {
        if (verifyProfilePin(profile, newPin)) {
          onUnlock();
        } else {
          setError(true);
          setErrorMessage('PIN incorrecto. Inténtalo de nuevo.');
          setPin('');
        }
      }, 150);
    }
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
    setError(false);
    setErrorMessage('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-6 animate-in zoom-in-95">
        {/* Profile Avatar & Lock Status */}
        <div className="space-y-3">
          <div className="relative inline-block">
            <div
              className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl shadow-lg border-2 border-white dark:border-slate-800 mx-auto"
              style={{ backgroundColor: profile.color || '#6366f1' }}
            >
              <span>{profile.avatar || '🎓'}</span>
            </div>
            <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-slate-900 text-amber-400 border-2 border-white dark:border-slate-800 flex items-center justify-center shadow-md">
              <Lock className="w-4 h-4" />
            </div>
          </div>

          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white">
              Perfil Protegido
            </h2>
            <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
              {profile.name}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {profile.educationLevel}
            </p>
          </div>
        </div>

        {/* PIN Dots Display */}
        <div className="space-y-2">
          <p className="text-xs text-slate-600 dark:text-slate-300">
            Introduce tu PIN de 4 dígitos para acceder a tus asignaturas y horarios:
          </p>

          <div className="flex items-center justify-center gap-3 py-2">
            {[0, 1, 2, 3].map((index) => {
              const isFilled = index < pin.length;
              return (
                <div
                  key={index}
                  className={`w-4 h-4 rounded-full transition-all duration-200 ${
                    isFilled
                      ? 'bg-indigo-600 dark:bg-indigo-400 scale-110 shadow-xs'
                      : 'border-2 border-slate-300 dark:border-slate-700 bg-transparent'
                  } ${error ? 'bg-rose-500 border-rose-500 animate-shake' : ''}`}
                />
              );
            })}
          </div>

          {errorMessage && (
            <p className="text-xs font-semibold text-rose-500 flex items-center justify-center gap-1 animate-in fade-in">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{errorMessage}</span>
            </p>
          )}
        </div>

        {/* Numeric Keypad */}
        <div className="grid grid-cols-3 gap-2.5 max-w-[240px] mx-auto">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => handleDigit(num)}
              className="h-12 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-bold text-lg transition-transform active:scale-95 shadow-2xs"
            >
              {num}
            </button>
          ))}
          <button
            type="button"
            onClick={onSwitchProfile}
            title="Cambiar a otro perfil de estudiante"
            className="h-12 rounded-2xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 text-xs font-semibold flex items-center justify-center transition-colors"
          >
            <Users className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => handleDigit('0')}
            className="h-12 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-bold text-lg transition-transform active:scale-95 shadow-2xs"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleDelete}
            title="Borrar dígito"
            className="h-12 rounded-2xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 text-xs font-bold flex items-center justify-center transition-colors"
          >
            ⌫
          </button>
        </div>

        {/* Security Reassurance Footer */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
            <ShieldCheck className="w-3.5 h-3.5" />
            100% Privado en tu PC
          </span>

          <button
            type="button"
            onClick={onSwitchProfile}
            className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            Cambiar de perfil
          </button>
        </div>
      </div>
    </div>
  );
};
