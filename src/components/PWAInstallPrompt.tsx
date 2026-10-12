import React, { useState } from 'react';
import { Download, Smartphone, Share, PlusSquare, CheckCircle, X, HelpCircle, Monitor } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallPromptProps {
  variant?: 'navbar' | 'settings' | 'banner';
}

export const PWAInstallPrompt: React.FC<PWAInstallPromptProps> = ({ variant = 'navbar' }) => {
  const { isInstallable, isInstalled, isIOS, isAndroid, install } = usePWAInstall();
  const [showModal, setShowModal] = useState<boolean>(false);
  const [installSuccess, setInstallSuccess] = useState<boolean>(false);

  const handleInstallClick = async () => {
    if (isInstallable) {
      const success = await install();
      if (success) {
        setInstallSuccess(true);
        setTimeout(() => setInstallSuccess(false), 4000);
      }
    } else {
      setShowModal(true);
    }
  };

  // If already running in standalone / home screen shortcut mode
  if (isInstalled) {
    if (variant === 'settings') {
      return (
        <section className="bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-6 shadow-xs space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                Acceso Directo Activo
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200">
                  Modo App Pantalla Completa
                </span>
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                EstudiaFácil AI está ejecutándose como acceso directo independiente en tu dispositivo. La barra del navegador está oculta para brindarte el máximo espacio de estudio.
              </p>
            </div>
          </div>
        </section>
      );
    }
    // If in navbar or banner, do not clutter the UI when already standalone
    return null;
  }

  // Variant: Settings section
  if (variant === 'settings') {
    return (
      <>
        <section className="bg-gradient-to-br from-indigo-50/80 via-white to-purple-50/60 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/40 border border-indigo-100 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-xs shrink-0 mt-0.5">
                <Smartphone className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-bold text-slate-900 dark:text-white text-base">
                    Acceso Directo para Android e iOS
                  </h2>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                    Sin barra de navegador
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl">
                  Añade EstudiaFácil AI a la pantalla de inicio de tu móvil o tablet. Se abrirá a pantalla completa exactamente igual que una app descargada, sin que aparezca la barra superior ni los controles del navegador.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {isInstallable ? (
                <button
                  type="button"
                  onClick={handleInstallClick}
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Instalar Acceso Directo</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowModal(true)}
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-colors"
                >
                  <Smartphone className="w-4 h-4" />
                  <span>Cómo Añadir a Inicio</span>
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            <div className="p-3.5 rounded-xl bg-white/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 text-xs space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                <span className="text-base">📱</span>
                <span>En iPhone / iPad (Safari)</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                Pulsa el botón de <strong>Compartir (icono con flecha ↑)</strong> en Safari y selecciona <strong>«Añadir a la pantalla de inicio»</strong>.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-white/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 text-xs space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                <span className="text-base">🤖</span>
                <span>En Android (Chrome / Samsung)</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                Pulsa el botón de arriba o el menú de <strong>tres puntos (⋮)</strong> y toca <strong>«Añadir a la pantalla de inicio»</strong> o <strong>«Instalar aplicación»</strong>.
              </p>
            </div>
          </div>
        </section>

        {showModal && (
          <InstallModal
            isIOS={isIOS}
            isAndroid={isAndroid}
            isInstallable={isInstallable}
            onInstall={install}
            onClose={() => setShowModal(false)}
          />
        )}
      </>
    );
  }

  // Variant: Navbar quick button
  return (
    <>
      <button
        onClick={handleInstallClick}
        title="Añadir a pantalla de inicio (Android / iOS sin barra de navegador)"
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 transition-colors shadow-2xs"
      >
        <Smartphone className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
        <span className="hidden sm:inline">App Móvil</span>
      </button>

      {showModal && (
        <InstallModal
          isIOS={isIOS}
          isAndroid={isAndroid}
          isInstallable={isInstallable}
          onInstall={install}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
};

interface InstallModalProps {
  isIOS: boolean;
  isAndroid: boolean;
  isInstallable: boolean;
  onInstall: () => Promise<boolean>;
  onClose: () => void;
}

const InstallModal: React.FC<InstallModalProps> = ({
  isIOS,
  isAndroid,
  isInstallable,
  onInstall,
  onClose,
}) => {
  const [tab, setTab] = useState<'ios' | 'android'>(isIOS ? 'ios' : 'android');

  const handleDirectInstall = async () => {
    const success = await onInstall();
    if (success) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-md">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Añadir Acceso Directo
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Abre EstudiaFácil AI sin barra de navegador
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="px-6 pt-4 flex gap-2">
          <button
            onClick={() => setTab('android')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border ${
              tab === 'android'
                ? 'bg-indigo-50 dark:bg-indigo-950/70 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300'
                : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <span>🤖 Android</span>
          </button>
          <button
            onClick={() => setTab('ios')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border ${
              tab === 'ios'
                ? 'bg-indigo-50 dark:bg-indigo-950/70 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300'
                : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <span>🍎 iPhone / iPad</span>
          </button>
        </div>

        {/* Instructions Body */}
        <div className="p-6 space-y-4 text-xs">
          {tab === 'ios' ? (
            <div className="space-y-3.5">
              <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 rounded-2xl text-indigo-900 dark:text-indigo-200">
                <p className="font-semibold text-xs mb-1">
                  En iOS Safari (pantalla completa):
                </p>
                <p className="text-[11px] leading-relaxed text-indigo-800 dark:text-indigo-300">
                  Apple requiere activar el acceso directo desde el botón oficial de Compartir de Safari:
                </p>
              </div>

              <ol className="space-y-3 text-slate-700 dark:text-slate-300">
                <li className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                    1
                  </span>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">
                      Toca el botón Compartir
                    </p>
                    <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5 flex items-center gap-1.5">
                      En la barra inferior de Safari, pulsa el icono cuadrado con una flecha hacia arriba <Share className="w-3.5 h-3.5 inline text-indigo-500" />.
                    </p>
                  </div>
                </li>

                <li className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                    2
                  </span>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">
                      Selecciona «Añadir a la pantalla de inicio»
                    </p>
                    <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5 flex items-center gap-1.5">
                      Desliza el menú de opciones y toca <PlusSquare className="w-3.5 h-3.5 inline text-indigo-500" /> <em>Añadir a inicio</em>.
                    </p>
                  </div>
                </li>

                <li className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                    3
                  </span>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">
                      Pulsa «Añadir» arriba a la derecha
                    </p>
                    <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                      ¡Listo! El icono se guardará en tu pantalla de inicio. Cuando lo pulses, <strong>no aparecerá la barra de direcciones ni la barra inferior de navegación</strong>.
                    </p>
                  </div>
                </li>
              </ol>
            </div>
          ) : (
            <div className="space-y-3.5">
              {isInstallable && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl">
                  <p className="font-bold text-emerald-800 dark:text-emerald-300 mb-2">
                    ¡Tu navegador admite instalación directa!
                  </p>
                  <button
                    onClick={handleDirectInstall}
                    className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center justify-center gap-2 shadow-xs transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span>Instalar en 1 Clic</span>
                  </button>
                </div>
              )}

              <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 rounded-2xl text-indigo-900 dark:text-indigo-200">
                <p className="font-semibold text-xs mb-1">
                  O desde el menú de tu navegador:
                </p>
                <ol className="space-y-2.5 mt-2 text-slate-700 dark:text-slate-300">
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                      1
                    </span>
                    <p className="text-[11px]">
                      Abre el menú de <strong>tres puntos (⋮)</strong> en la esquina superior derecha de Google Chrome o navegador Samsung.
                    </p>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                      2
                    </span>
                    <p className="text-[11px]">
                      Toca en <strong>«Añadir a la pantalla de inicio»</strong> o <strong>«Instalar aplicación»</strong>.
                    </p>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                      3
                    </span>
                    <p className="text-[11px]">
                      Confirma la adición. Se creará el acceso directo que se ejecutará <strong>completamente sin barra de navegador</strong>.
                    </p>
                  </li>
                </ol>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-bold text-xs transition-colors"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
