import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Send,
  Paperclip,
  X,
  FileText,
  Image as ImageIcon,
  Loader2,
  Trash2,
  Bot,
  User,
  HelpCircle,
  Copy,
  CheckCircle2,
  Lightbulb,
  ShieldCheck,
  Clock,
  AlertTriangle,
  Info,
  Zap,
} from 'lucide-react';
import { ChatMessage, Subject, StudyFile, DailyAiLimitInfo } from '../types';
import { askGeminiTutor, FileAttachmentPayload } from '../services/geminiService';
import { extractBase64Data } from '../utils/fileHelpers';
import {
  loadChatHistory,
  saveChatHistory,
  clearChatHistory,
  getAiDailyLimit,
  incrementAiDailyLimit,
} from '../utils/storage';

interface AITutorChatProps {
  subjects: Subject[];
  initialSubjectId?: string;
  initialTopicId?: string;
  studentName?: string;
  educationLevel?: string;
  activeProfileId?: string;
}

export const AITutorChat: React.FC<AITutorChatProps> = ({
  subjects,
  initialSubjectId,
  initialTopicId,
  studentName,
  educationLevel,
  activeProfileId,
}) => {
  const isPrimary = Boolean(educationLevel?.includes('Primaria'));

  const getIntroMessage = (): ChatMessage => ({
    id: 'm-intro',
    role: 'assistant',
    content: isPrimary
      ? `¡Hola${studentName ? `, ${studentName}` : ''}! Soy tu **Tutor de Estudio con IA**. 🎒🌟\n\n¡Estoy aquí para ayudarte a aprender y hacer tus tareas del cole súper divertidas!\n- 🧮 **Matemáticas fáciles**: sumas, restas, problemas y trucos geniales.\n- 📖 **Lengua y Lectura**: ortografía, cuentos y explicaciones paso a paso.\n- 🌿 **Ciencias y Naturaleza**: animales, plantas, el planeta y experimentos.\n- 📸 **Fotos de tus deberes**: pulsa el clip para mandarme una foto de tu cuaderno y lo resolvemos juntos.\n\n¿Qué materia o ejercicio estás haciendo hoy?`
      : `¡Hola${studentName ? `, ${studentName}` : ''}! Soy tu **Tutor Académico con IA Gemini**. 🎓✨\n\nPuedo ayudarte con:\n- **Explicarte temas difíciles** con analogías claras y paso a paso.\n- **Resolver ejercicios** matemáticos, de ciencias, historia o lengua.\n- **Analizar tus apuntes en fotos o PDFs**: adjunta cualquier imagen de tu cuaderno o documento y te explicaré el contenido.\n- **Preparar exámenes**: preguntarme qué preguntas suelen caer o ponerme a prueba.\n\n¿En qué materia o tema quieres que trabajemos hoy?`,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  });

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = loadChatHistory(activeProfileId);
    return saved.length > 0 ? saved : [getIntroMessage()];
  });

  // Reload history if active profile switches
  useEffect(() => {
    const saved = loadChatHistory(activeProfileId);
    setMessages(saved.length > 0 ? saved : [getIntroMessage()]);
  }, [activeProfileId]);

  // Auto-save chat messages whenever they change
  useEffect(() => {
    if (messages.length > 0) {
      saveChatHistory(messages, activeProfileId);
    }
  }, [messages, activeProfileId]);

  // Emergency save on exit / beforeunload / pagehide
  useEffect(() => {
    const handleExit = () => {
      if (messages.length > 0) {
        saveChatHistory(messages, activeProfileId);
      }
    };
    window.addEventListener('beforeunload', handleExit);
    window.addEventListener('pagehide', handleExit);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') handleExit();
    });
    return () => {
      window.removeEventListener('beforeunload', handleExit);
      window.removeEventListener('pagehide', handleExit);
    };
  }, [messages, activeProfileId]);

  const [inputMessage, setInputMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(initialSubjectId || '');
  const [selectedTopicId, setSelectedTopicId] = useState<string>(initialTopicId || '');
  const [attachedFile, setAttachedFile] = useState<FileAttachmentPayload | null>(null);
  const [attachedFileName, setAttachedFileName] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Daily AI limit state and live countdown
  const [dailyLimit, setDailyLimit] = useState<DailyAiLimitInfo>(() => getAiDailyLimit(activeProfileId));
  const [showLimitModal, setShowLimitModal] = useState<boolean>(false);
  const [countdownText, setCountdownText] = useState<string>('');

  // Refresh limit and countdown every second
  useEffect(() => {
    const updateLimit = () => {
      const info = getAiDailyLimit(activeProfileId);
      setDailyLimit(info);

      const hrs = Math.floor(info.secondsUntilReset / 3600);
      const mins = Math.floor((info.secondsUntilReset % 3600) / 60);
      const secs = info.secondsUntilReset % 60;
      setCountdownText(
        `${hrs}h ${mins.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`
      );
    };

    updateLimit();
    const interval = setInterval(updateLimit, 1000);
    return () => clearInterval(interval);
  }, [activeProfileId]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const selectedSubject = subjects.find((s) => s.id === selectedSubjectId);
  const selectedTopic = selectedSubject?.topics.find((t) => t.id === selectedTopicId);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64Data = extractBase64Data(result);
      setAttachedFile({
        name: file.name,
        mimeType: file.type || 'application/octet-stream',
        data: base64Data,
      });
      setAttachedFileName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const handleSendMessage = async (textToSend?: string) => {
    // Check if daily AI limit is exhausted
    if (dailyLimit.remaining <= 0) {
      setShowLimitModal(true);
      return;
    }

    const query = (textToSend || inputMessage).trim();
    if (!query && !attachedFile) return;

    const userMsg: ChatMessage = {
      id: 'msg-' + Date.now(),
      role: 'user',
      content: query || `[Analiza este archivo adjunto: ${attachedFileName}]`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      attachedFileName: attachedFileName || undefined,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setIsLoading(true);

    const filePayload = attachedFile ? { ...attachedFile } : undefined;
    setAttachedFile(null);
    setAttachedFileName('');

    try {
      // Build context from selected topic if present
      let contextPayload: { subject?: string; topic?: string; text?: string } | undefined = undefined;
      const contextNotes: string[] = [];
      if (educationLevel) {
        contextNotes.push(`Nivel escolar del estudiante: ${educationLevel}.${isPrimary ? ' Por favor, adapta todas tus explicaciones para niños/as de educación primaria: sé muy claro/a, usa ejemplos de la vida diaria, metáforas sencillas, emojis y un tono alegre y motivador.' : ''}`);
      }
      if (studentName) {
        contextNotes.push(`Nombre del estudiante: ${studentName}.`);
      }
      if (selectedTopic?.notesText) {
        contextNotes.push(`Apuntes del tema:\n${selectedTopic.notesText}`);
      }

      if (selectedSubject) {
        contextPayload = {
          subject: selectedSubject.name,
          topic: selectedTopic?.title,
          text: contextNotes.join('\n\n'),
        };
      } else if (contextNotes.length > 0) {
        contextPayload = {
          text: contextNotes.join('\n\n'),
        };
      }

      // History of conversation
      const historyPayload = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const reply = await askGeminiTutor({
        message: query,
        history: historyPayload,
        context: contextPayload,
        fileAttachment: filePayload,
      });

      const assistantMsg: ChatMessage = {
        id: 'msg-' + (Date.now() + 1),
        role: 'assistant',
        content: reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMsg]);

      // Count this successful AI response towards daily usage
      const updatedLimit = incrementAiDailyLimit(activeProfileId);
      setDailyLimit(updatedLimit);
    } catch (err: any) {
      let content = `⚠️ **Aviso del Tutor**: ${err.message || 'No se pudo conectar con la IA de Gemini. Verifica tu clave en Ajustes.'}`;
      if (err.activationUrl) {
        content = `⚠️ **La API de Gemini no está activada en tu proyecto de Google Cloud**:\n\n${err.message}\n\n👉 [Haz clic aquí para activarla en 1 clic en Google Cloud](${err.activationUrl}) o genera una clave nueva en un proyecto nuevo en Google AI Studio.`;
      }
      const errorMsg: ChatMessage = {
        id: 'msg-' + (Date.now() + 1),
        role: 'assistant',
        content,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const promptChips = [
    'Explícame este tema con una analogía sencilla',
    '¿Qué preguntas suelen caer en los exámenes sobre esto?',
    'Dame 3 reglas mnemotécnicas para recordarlo',
    'Hazme una pregunta rápida para comprobar si lo he entendido',
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 h-[calc(100vh-6rem)] flex flex-col space-y-4 animate-in fade-in duration-200">
      {/* Top Controls: Subject & Topic Context Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-950/70 text-purple-600 dark:text-purple-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">
              Tutor Académico Gemini 3.8 Flash
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Contexto inteligente basado en tus temas y apuntes
            </p>
          </div>
        </div>

        {/* Subject and Topic Selectors */}
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={selectedSubjectId}
            onChange={(e) => {
              setSelectedSubjectId(e.target.value);
              setSelectedTopicId('');
            }}
            className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-hidden"
          >
            <option value="">Contexto: General (Todas)</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          {selectedSubject && selectedSubject.topics.length > 0 && (
            <select
              value={selectedTopicId}
              onChange={(e) => setSelectedTopicId(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-hidden max-w-[200px] truncate"
            >
              <option value="">Todos los temas</option>
              {selectedSubject.topics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          )}

          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Circular Daily AI Limit Ring Button */}
            <button
              onClick={() => setShowLimitModal(true)}
              title={`Límite de IA diario: ${dailyLimit.remaining} de ${dailyLimit.limit} consultas restantes hoy. Pulsa para ver cuándo se restablece.`}
              className={`flex items-center gap-2 px-2.5 py-1 rounded-xl border transition-all shadow-2xs group ${
                dailyLimit.remaining === 0
                  ? 'bg-rose-50 dark:bg-rose-950/70 border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300'
                  : 'bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700/80 border-slate-200 dark:border-slate-700'
              }`}
            >
              {/* Circular SVG Ring */}
              <div className="relative w-6 h-6 flex items-center justify-center shrink-0">
                <svg className="w-6 h-6 -rotate-90" viewBox="0 0 36 36">
                  {/* Background Track */}
                  <path
                    className="text-slate-200 dark:text-slate-700"
                    strokeWidth="3.5"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  {/* Animated Progress Ring */}
                  <path
                    className={
                      dailyLimit.remaining === 0
                        ? 'text-rose-500'
                        : dailyLimit.percentRemaining <= 25
                        ? 'text-amber-500'
                        : 'text-indigo-600 dark:text-indigo-400'
                    }
                    strokeDasharray={`${dailyLimit.percentRemaining}, 100`}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                {/* Number inside circle */}
                <span className="absolute text-[9px] font-black leading-none">
                  {dailyLimit.remaining}
                </span>
              </div>

              <div className="text-left hidden sm:block">
                <div className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 leading-none">
                  Límite IA
                </div>
                <div
                  className={`text-[11px] font-bold leading-tight ${
                    dailyLimit.remaining === 0
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {dailyLimit.remaining}/{dailyLimit.limit}
                </div>
              </div>
            </button>

            <span className="hidden lg:inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
              <CheckCircle2 className="w-3 h-3" />
              <span>Autoguardado</span>
            </span>

            <button
              onClick={() => {
                if (confirm('¿Deseas reiniciar y vaciar la conversación con el tutor?')) {
                  clearChatHistory(activeProfileId);
                  setMessages([
                    {
                      id: 'm-fresh',
                      role: 'assistant',
                      content: isPrimary
                        ? '¡Conversación reiniciada! ¿Qué duda o ejercicio del cole resolvemos ahora? 🎒'
                        : 'Conversación reiniciada. ¿En qué materia o duda puedo ayudarte ahora? 🎓',
                      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    },
                  ]);
                }
              }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Limpiar conversación de este perfil"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-6 overflow-y-auto space-y-4 shadow-xs">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-white font-bold text-xs shadow-xs ${
                  isUser
                    ? 'bg-indigo-600'
                    : 'bg-gradient-to-tr from-purple-600 to-indigo-600'
                }`}
              >
                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              <div
                className={`group max-w-[85%] sm:max-w-[78%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed relative ${
                  isUser
                    ? 'bg-indigo-600 text-white rounded-tr-xs'
                    : 'bg-slate-100 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 rounded-tl-xs border border-slate-200 dark:border-slate-800'
                }`}
              >
                {/* Attached file tag if any */}
                {msg.attachedFileName && (
                  <div
                    className={`mb-2 px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 w-fit ${
                      isUser
                        ? 'bg-indigo-700 text-indigo-100'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span className="truncate max-w-[200px]">{msg.attachedFileName}</span>
                  </div>
                )}

                <div className="whitespace-pre-wrap">{msg.content}</div>

                <div className="flex items-center justify-between gap-3 mt-2 pt-1 text-[10px] opacity-75">
                  <span>{msg.timestamp}</span>
                  {!isUser && (
                    <button
                      onClick={() => handleCopy(msg.id, msg.content)}
                      className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-opacity flex items-center gap-1"
                    >
                      {copiedId === msg.id ? (
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                      <span>{copiedId === msg.id ? 'Copiado' : 'Copiar'}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-purple-600 flex items-center justify-center shrink-0 text-white shadow-xs">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-800 rounded-2xl rounded-tl-xs p-4 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
              <span>Gemini está razonando la explicación...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompt Chips */}
      <div className="flex overflow-x-auto gap-2 pb-1 shrink-0 scrollbar-none">
        {promptChips.map((chip, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(chip)}
            disabled={isLoading}
            className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-indigo-400 dark:hover:border-indigo-600 hover:text-indigo-600 dark:hover:text-indigo-400 text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 shadow-2xs"
          >
            <Lightbulb className="w-3 h-3 text-amber-500" />
            <span>{chip}</span>
          </button>
        ))}
      </div>

      {/* Limit Exhausted Banner */}
      {dailyLimit.remaining === 0 && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/80 border border-rose-300 dark:border-rose-800 rounded-2xl flex items-start justify-between gap-3 text-rose-900 dark:text-rose-100 text-xs shadow-md animate-in slide-in-from-bottom-2 shrink-0">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-rose-200 dark:bg-rose-900 text-rose-700 dark:text-rose-200 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-sm text-rose-700 dark:text-rose-300">
                Has alcanzado tu límite de IA diario ({dailyLimit.used}/{dailyLimit.limit} consultas)
              </h4>
              <p className="text-xs text-rose-800 dark:text-rose-200 leading-relaxed">
                El límite se restablecerá automáticamente el <strong>{dailyLimit.resetDateString}</strong> a las <strong>{dailyLimit.resetTimeString}</strong>.
              </p>
              <div className="flex items-center gap-2 pt-1 font-mono text-[11px] text-rose-700 dark:text-rose-300 font-semibold">
                <Clock className="w-3.5 h-3.5 shrink-0" />
                <span>Tiempo restante para reactivar: <strong>{countdownText}</strong></span>
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowLimitModal(true)}
            className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shrink-0 transition-colors shadow-xs"
          >
            Ver Detalles
          </button>
        </div>
      )}

      {/* Input Box & Attachment */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-2.5 shadow-xs space-y-2 shrink-0">
        {/* Attached file chip */}
        {attachedFileName && (
          <div className="flex items-center justify-between px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-900 rounded-xl text-xs text-indigo-700 dark:text-indigo-300">
            <div className="flex items-center gap-2 truncate">
              <FileText className="w-4 h-4 shrink-0" />
              <span className="font-semibold truncate">{attachedFileName}</span>
            </div>
            <button
              onClick={() => {
                setAttachedFile(null);
                setAttachedFileName('');
              }}
              className="text-slate-400 hover:text-rose-500 ml-2"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="flex items-center gap-2">
          {/* File attach button */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".pdf,image/*,.txt,.md"
            className="hidden"
          />
          <button
            onClick={() => {
              if (dailyLimit.remaining <= 0) {
                setShowLimitModal(true);
                return;
              }
              fileInputRef.current?.click();
            }}
            disabled={dailyLimit.remaining <= 0}
            title="Adjuntar PDF, imagen de apuntes o texto"
            className="p-2.5 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors"
          >
            <Paperclip className="w-5 h-5" />
          </button>

          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            disabled={dailyLimit.remaining <= 0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder={
              dailyLimit.remaining <= 0
                ? `⛔ Límite diario alcanzado. Se reactiva a las ${dailyLimit.resetTimeString} (${dailyLimit.resetDateString})`
                : selectedTopic
                ? `Pregunta sobre "${selectedTopic.title}"...`
                : 'Escribe tu duda, pide un resumen o adjunta tus apuntes...'
            }
            className="flex-1 bg-transparent border-0 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden disabled:cursor-not-allowed"
          />

          <button
            onClick={() => handleSendMessage()}
            disabled={dailyLimit.remaining <= 0 || isLoading || (!inputMessage.trim() && !attachedFile)}
            className="p-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl shadow-xs transition-colors shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* MODAL: DETALLES DEL LÍMITE DE IA DIARIO Y RESTABLECIMIENTO     */}
      {/* ============================================================== */}
      {showLimitModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md shadow-2xl p-6 sm:p-7 space-y-6 animate-in zoom-in-95 duration-150 text-center">
            {/* Modal Header Icon with Circular Progress */}
            <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
              <svg className="w-20 h-20 -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-slate-200 dark:text-slate-800"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className={
                    dailyLimit.remaining === 0
                      ? 'text-rose-500'
                      : dailyLimit.percentRemaining <= 25
                      ? 'text-amber-500'
                      : 'text-indigo-600 dark:text-indigo-400'
                  }
                  strokeDasharray={`${dailyLimit.percentRemaining}, 100`}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>

              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-black text-slate-900 dark:text-white leading-none">
                  {dailyLimit.remaining}
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  libres
                </span>
              </div>
            </div>

            <div>
              <h3 className="font-extrabold text-lg sm:text-xl text-slate-900 dark:text-white">
                {dailyLimit.remaining === 0
                  ? 'Límite de IA Diario Agotado'
                  : 'Estado del Límite de IA Diario'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {dailyLimit.remaining === 0
                  ? 'Has consumido tus preguntas del día con el tutor inteligente.'
                  : `Te quedan ${dailyLimit.remaining} de ${dailyLimit.limit} consultas hoy.`}
              </p>
            </div>

            {/* Information Grid Box */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-left space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">Consultas usadas hoy:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {dailyLimit.used} de {dailyLimit.limit} ({100 - dailyLimit.percentRemaining}%)
                </span>
              </div>

              <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    dailyLimit.remaining === 0
                      ? 'bg-rose-500'
                      : dailyLimit.percentRemaining <= 25
                      ? 'bg-amber-500'
                      : 'bg-indigo-600'
                  }`}
                  style={{ width: `${dailyLimit.percentRemaining}%` }}
                />
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-start gap-2 text-xs">
                  <Clock className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200 block">
                      ¿A qué hora y día se restablece?
                    </span>
                    <span className="text-slate-600 dark:text-slate-300 font-semibold">
                      El {dailyLimit.resetDateString} a las {dailyLimit.resetTimeString}
                    </span>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-xs flex items-center justify-between">
                  <span className="font-semibold text-indigo-800 dark:text-indigo-200">
                    Tiempo restante:
                  </span>
                  <span className="font-mono font-bold text-indigo-900 dark:text-indigo-100 text-sm">
                    {countdownText}
                  </span>
                </div>
              </div>
            </div>

            <div className="text-[11px] text-slate-400 dark:text-slate-500 text-left leading-relaxed">
              💡 <strong>¿Por qué hay un límite diario?</strong> Cada medianoche a las 00:00 h se restablece automáticamente tu cupo diario de 30 consultas completas para que puedas resolver dudas cada día gratis.
            </div>

            <button
              onClick={() => setShowLimitModal(false)}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all hover:scale-[1.01]"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
