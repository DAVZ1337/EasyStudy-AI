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
} from 'lucide-react';
import { ChatMessage, Subject, StudyFile } from '../types';
import { askGeminiTutor, FileAttachmentPayload } from '../services/geminiService';
import { extractBase64Data } from '../utils/fileHelpers';

interface AITutorChatProps {
  subjects: Subject[];
  initialSubjectId?: string;
  initialTopicId?: string;
  studentName?: string;
  educationLevel?: string;
}

export const AITutorChat: React.FC<AITutorChatProps> = ({
  subjects,
  initialSubjectId,
  initialTopicId,
  studentName,
  educationLevel,
}) => {
  const isPrimary = Boolean(educationLevel?.includes('Primaria'));

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'm-intro',
      role: 'assistant',
      content: isPrimary
        ? `¡Hola${studentName ? `, ${studentName}` : ''}! Soy tu **Tutor de Estudio con IA**. 🎒🌟\n\n¡Estoy aquí para ayudarte a aprender y hacer tus tareas del cole súper divertidas!\n- 🧮 **Matemáticas fáciles**: sumas, restas, problemas y trucos geniales.\n- 📖 **Lengua y Lectura**: ortografía, cuentos y explicaciones paso a paso.\n- 🌿 **Ciencias y Naturaleza**: animales, plantas, el planeta y experimentos.\n- 📸 **Fotos de tus deberes**: pulsa el clip para mandarme una foto de tu cuaderno y lo resolvemos juntos.\n\n¿Qué materia o ejercicio estás haciendo hoy?`
        : `¡Hola${studentName ? `, ${studentName}` : ''}! Soy tu **Tutor Académico con IA Gemini**. 🎓✨\n\nPuedo ayudarte con:\n- **Explicarte temas difíciles** con analogías claras y paso a paso.\n- **Resolver ejercicios** matemáticos, de ciencias, historia o lengua.\n- **Analizar tus apuntes en fotos o PDFs**: adjunta cualquier imagen de tu cuaderno o documento y te explicaré el contenido.\n- **Preparar exámenes**: preguntarme qué preguntas suelen caer o ponerme a prueba.\n\n¿En qué materia o tema quieres que trabajemos hoy?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [inputMessage, setInputMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(initialSubjectId || '');
  const [selectedTopicId, setSelectedTopicId] = useState<string>(initialTopicId || '');
  const [attachedFile, setAttachedFile] = useState<FileAttachmentPayload | null>(null);
  const [attachedFileName, setAttachedFileName] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

          <button
            onClick={() =>
              setMessages([
                {
                  id: 'm-fresh',
                  role: 'assistant',
                  content: 'Conversación reiniciada. ¿En qué tema o duda puedo ayudarte ahora?',
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                },
              ])
            }
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Limpiar chat"
          >
            <Trash2 className="w-4 h-4" />
          </button>
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
            onClick={() => fileInputRef.current?.click()}
            title="Adjuntar PDF, imagen de apuntes o texto"
            className="p-2.5 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Paperclip className="w-5 h-5" />
          </button>

          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder={
              selectedTopic
                ? `Pregunta sobre "${selectedTopic.title}"...`
                : 'Escribe tu duda, pide un resumen o adjunta tus apuntes...'
            }
            className="flex-1 bg-transparent border-0 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden"
          />

          <button
            onClick={() => handleSendMessage()}
            disabled={isLoading || (!inputMessage.trim() && !attachedFile)}
            className="p-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl shadow-xs transition-colors shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
