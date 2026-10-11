import React, { useState } from 'react';
import {
  X,
  FileText,
  Image as ImageIcon,
  Sparkles,
  Download,
  Brain,
  HelpCircle,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { StudyFile } from '../types';
import { formatFileSize, getFileCategory, extractBase64Data } from '../utils/fileHelpers';
import { explainFileWithGemini } from '../services/geminiService';

interface FileViewerModalProps {
  file: StudyFile | null;
  onClose: () => void;
  onGenerateSummaryFromFile?: (file: StudyFile) => void;
  onGenerateQuizFromFile?: (file: StudyFile) => void;
}

export const FileViewerModal: React.FC<FileViewerModalProps> = ({
  file,
  onClose,
  onGenerateSummaryFromFile,
  onGenerateQuizFromFile,
}) => {
  const [activeTab, setActiveTab] = useState<'preview' | 'aiExplanation'>('preview');
  const [explanation, setExplanation] = useState<string>('');
  const [isExplaining, setIsExplaining] = useState<boolean>(false);
  const [explainError, setExplainError] = useState<{ message: string; activationUrl?: string } | null>(null);
  const [customQuestion, setCustomQuestion] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  if (!file) return null;

  const category = getFileCategory(file.mimeType, file.name);

  const handleAskAI = async (questionText?: string) => {
    if (!file.dataUrl) {
      setExplainError({ message: 'El archivo no tiene datos binarios cargados.' });
      return;
    }
    setActiveTab('aiExplanation');
    setIsExplaining(true);
    setExplainError(null);

    try {
      const base64Data = extractBase64Data(file.dataUrl);
      const res = await explainFileWithGemini({
        file: {
          name: file.name,
          mimeType: file.mimeType,
          data: base64Data,
        },
        question: questionText || customQuestion || undefined,
      });
      setExplanation(res);
    } catch (err: any) {
      setExplainError({
        message: err.message || 'Error al analizar el documento con Gemini.',
        activationUrl: err.activationUrl,
      });
    } finally {
      setIsExplaining(false);
    }
  };

  const handleCopy = () => {
    if (!explanation) return;
    navigator.clipboard.writeText(explanation);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 shrink-0">
              {category === 'image' ? (
                <ImageIcon className="w-5 h-5" />
              ) : (
                <FileText className="w-5 h-5" />
              )}
            </div>
            <div className="truncate">
              <h3 className="font-semibold text-slate-900 dark:text-white truncate text-base">
                {file.name}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <span>{formatFileSize(file.size)}</span>
                <span>•</span>
                <span>Subido el {new Date(file.uploadedAt).toLocaleDateString()}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {file.dataUrl && (
              <a
                href={file.dataUrl}
                download={file.name}
                className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                title="Descargar archivo"
              >
                <Download className="w-5 h-5" />
              </a>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action Bar with AI Buttons */}
        <div className="px-5 py-2.5 bg-indigo-50/50 dark:bg-indigo-950/30 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
          {/* Tabs */}
          <div className="flex items-center gap-1 bg-slate-200/70 dark:bg-slate-800/80 p-0.5 rounded-xl text-xs font-medium">
            <button
              onClick={() => setActiveTab('preview')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'preview'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Vista Previa
            </button>
            <button
              onClick={() => setActiveTab('aiExplanation')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                activeTab === 'aiExplanation'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Explicación con IA</span>
            </button>
          </div>

          {/* Quick AI Shortcuts */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleAskAI()}
              disabled={isExplaining}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs disabled:opacity-50 transition-all"
            >
              {isExplaining ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              <span>{explanation ? 'Volver a Explicar' : 'Explicar con Gemini'}</span>
            </button>

            {onGenerateSummaryFromFile && (
              <button
                onClick={() => {
                  onClose();
                  onGenerateSummaryFromFile(file);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/80 text-xs font-semibold transition-all"
              >
                <Brain className="w-3.5 h-3.5" />
                <span>Crear Resumen</span>
              </button>
            )}

            {onGenerateQuizFromFile && (
              <button
                onClick={() => {
                  onClose();
                  onGenerateQuizFromFile(file);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-900/80 text-xs font-semibold transition-all"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Crear Quiz</span>
              </button>
            )}
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50 dark:bg-slate-950/40">
          {activeTab === 'preview' ? (
            <div className="flex flex-col items-center justify-center min-h-[360px] w-full">
              {/* Image Preview */}
              {category === 'image' && file.dataUrl && (
                <div className="max-w-full max-h-[65vh] rounded-xl overflow-hidden shadow-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-center p-2">
                  <img
                    src={file.dataUrl}
                    alt={file.name}
                    className="max-h-[60vh] max-w-full object-contain rounded-lg"
                  />
                </div>
              )}

              {/* Text File Preview */}
              {category === 'text' && (
                <div className="w-full max-w-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs">
                  <pre className="font-mono text-xs sm:text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed max-h-[60vh] overflow-y-auto">
                    {file.extractedText || 'Archivo de texto listo para ser procesado por la IA.'}
                  </pre>
                </div>
              )}

              {/* PDF Preview */}
              {category === 'pdf' && (
                <div className="w-full h-[65vh] flex flex-col bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
                  {file.dataUrl ? (
                    <iframe
                      src={file.dataUrl}
                      title={file.name}
                      className="w-full h-full border-0"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                      <FileText className="w-16 h-16 text-indigo-500 mb-3" />
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Documento PDF ({formatFileSize(file.size)})
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 max-w-sm">
                        La IA de Gemini puede leer, resumir y generar cuestionarios directamente a partir de este PDF.
                      </p>
                      <button
                        onClick={() => handleAskAI()}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-xs"
                      >
                        Explicar contenido del PDF con Gemini
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Other file types */}
              {category === 'other' && (
                <div className="text-center p-12 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs max-w-md">
                  <FileText className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                  <p className="font-medium text-slate-800 dark:text-slate-200 text-sm mb-1">{file.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                    Formato: {file.mimeType} ({formatFileSize(file.size)})
                  </p>
                  <button
                    onClick={() => handleAskAI()}
                    className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold shadow-xs"
                  >
                    Analizar con Gemini
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* AI Explanation Tab */
            <div className="w-full max-w-3xl mx-auto space-y-4">
              {/* Custom question bar */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customQuestion}
                  onChange={(e) => setCustomQuestion(e.target.value)}
                  placeholder="Pregúntale a Gemini algo específico sobre este archivo..."
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAskAI();
                  }}
                />
                <button
                  onClick={() => handleAskAI()}
                  disabled={isExplaining}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors shrink-0"
                >
                  {isExplaining ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  <span>Consultar</span>
                </button>
              </div>

              {/* Status / Output */}
              {isExplaining && (
                <div className="p-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-center space-y-3">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto" />
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Gemini 3.8 Flash está examinando tu archivo...
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Extrayendo conceptos clave, fórmulas y explicaciones paso a paso.
                  </p>
                </div>
              )}

              {explainError && (
                <div className="p-4 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded-xl flex items-start gap-3 text-red-700 dark:text-red-300 text-sm">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <div className="space-y-1 flex-1">
                    <p className="font-semibold">No se pudo completar el análisis</p>
                    <p className="text-xs">{explainError.message}</p>
                    {explainError.activationUrl && (
                      <div className="pt-2">
                        <a
                          href={explainError.activationUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Habilitar Gemini en Google Cloud (1 clic)</span>
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {!isExplaining && explanation && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4" />
                      Análisis Pedagógico con Gemini 3.8 Flash
                    </span>
                    <button
                      onClick={handleCopy}
                      className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Copiado' : 'Copiar'}</span>
                    </button>
                  </div>

                  <div className="prose prose-sm dark:prose-invert max-w-none text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                    {explanation}
                  </div>
                </div>
              )}

              {!isExplaining && !explanation && !explainError && (
                <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
                  <Brain className="w-12 h-12 text-indigo-500 mx-auto mb-3" />
                  <h4 className="font-semibold text-slate-800 dark:text-white text-base mb-1">
                    ¿Quieres que la IA te explique este tema?
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-5">
                    Gemini analizará el texto, fotos de pizarras o apuntes en PDF para desglosar cada concepto como un tutor privado.
                  </p>
                  <button
                    onClick={() => handleAskAI()}
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-500/20"
                  >
                    Comenzar Explicación
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
