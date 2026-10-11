import React, { useState } from 'react';
import {
  Calendar as CalendarIcon,
  Plus,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Circle,
  Clock,
  Sparkles,
  X,
  AlertTriangle,
  FileCheck,
  Brain,
  Trash2,
  Loader2,
} from 'lucide-react';
import { CalendarEvent, Subject } from '../types';
import { askGeminiTutor } from '../services/geminiService';

interface AcademicCalendarProps {
  events: CalendarEvent[];
  subjects: Subject[];
  onAddEvent: (event: CalendarEvent) => void;
  onToggleEvent: (eventId: string) => void;
  onDeleteEvent: (eventId: string) => void;
  studentName?: string;
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const DAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export const AcademicCalendar: React.FC<AcademicCalendarProps> = ({
  events,
  subjects,
  onAddEvent,
  onToggleEvent,
  onDeleteEvent,
  studentName,
}) => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [isPlanningWithAI, setIsPlanningWithAI] = useState<boolean>(false);
  const [aiStudyPlan, setAiStudyPlan] = useState<string | null>(null);

  // Form states
  const [title, setTitle] = useState<string>('');
  const [date, setDate] = useState<string>(selectedDateStr);
  const [time, setTime] = useState<string>('09:00');
  const [subjectId, setSubjectId] = useState<string>(subjects[0]?.id || '');
  const [type, setType] = useState<CalendarEvent['type']>('exam');
  const [description, setDescription] = useState<string>('');

  const subjectMap = new Map(subjects.map((s) => [s.id, s]));

  // Month navigation
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDateStr(today.toISOString().split('T')[0]);
  };

  // Calendar days calculation
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  // Day of week for 1st of month: 0=Sun, 1=Mon, ..., 6=Sat
  // Transform so Mon=0, Sun=6
  let firstDayIndex = firstDayOfMonth.getDay() - 1;
  if (firstDayIndex === -1) firstDayIndex = 6;

  const totalDays = lastDayOfMonth.getDate();

  const daysArray: (number | null)[] = [];
  for (let i = 0; i < firstDayIndex; i++) {
    daysArray.push(null);
  }
  for (let d = 1; d <= totalDays; d++) {
    daysArray.push(d);
  }

  // Filter events for selected date
  const eventsForSelectedDate = events.filter((e) => e.date === selectedDateStr);

  // Sorted upcoming events
  const todayStr = new Date().toISOString().split('T')[0];
  const upcomingEvents = [...events]
    .filter((e) => e.date >= todayStr)
    .sort((a, b) => a.date.localeCompare(b.date));

  const handleSaveEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newEv: CalendarEvent = {
      id: 'cal-' + Date.now(),
      title: title.trim(),
      date,
      time: time || undefined,
      subjectId: subjectId || undefined,
      type,
      description: description.trim() || undefined,
      completed: false,
    };

    onAddEvent(newEv);
    setShowAddModal(false);
    setTitle('');
    setDescription('');
  };

  // Ask AI for study plan
  const handleGenerateStudyPlan = async () => {
    setIsPlanningWithAI(true);
    try {
      const examList = events
        .filter((e) => e.type === 'exam')
        .map((e) => {
          const sub = subjectMap.get(e.subjectId || '');
          return `- ${e.title} (${sub?.name || 'Materia'}) el día ${e.date}`;
        })
        .join('\n');

      const prompt = `Actúa como un orientador de técnicas de estudio y productividad académica.
Aquí están mis próximos exámenes y fechas importantes:
${examList || 'Tengo varios exámenes en las próximas semanas.'}

Genera un plan de estudio y repaso optimizado (método de repetición espaciada y bloques Pomodoro) dividido por días y horas recomendadas. Sé motivador, conciso y muy estructurado.`;

      const response = await askGeminiTutor({ message: prompt });
      setAiStudyPlan(response);
    } catch (err: any) {
      alert(err.message || 'Error al generar el plan de estudio con Gemini.');
    } finally {
      setIsPlanningWithAI(false);
    }
  };

  const getDaysDiffLabel = (targetDate: string) => {
    const diff = Math.ceil(
      (new Date(targetDate).getTime() - new Date(todayStr).getTime()) / (1000 * 3600 * 24)
    );
    if (diff === 0) return '¡Hoy!';
    if (diff === 1) return 'Mañana';
    if (diff > 1) return `En ${diff} días`;
    return 'Pasado';
  };

  const getTypeBadge = (eventType: CalendarEvent['type']) => {
    switch (eventType) {
      case 'exam':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
            Examen
          </span>
        );
      case 'assignment':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            Entrega
          </span>
        );
      case 'homework':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            Tarea
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            Recordatorio
          </span>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {studentName ? `Calendario y Exámenes de ${studentName}` : 'Calendario Académico y Exámenes'}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Controla las fechas de tus pruebas, entregas de trabajos y planes de repaso.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleGenerateStudyPlan}
            disabled={isPlanningWithAI}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/60 text-xs font-semibold transition-all border border-purple-200 dark:border-purple-800 shadow-xs"
          >
            {isPlanningWithAI ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            )}
            <span>Plan de Estudio IA</span>
          </button>

          <button
            onClick={() => {
              setDate(selectedDateStr);
              setShowAddModal(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-500/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Evento</span>
          </button>
        </div>
      </div>

      {/* AI Generated Study Plan Modal / Banner */}
      {aiStudyPlan && (
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30 border border-purple-200 dark:border-purple-900 rounded-2xl p-6 shadow-sm space-y-3 relative">
          <button
            onClick={() => setAiStudyPlan(null)}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 dark:hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300 font-bold text-sm">
            <Brain className="w-5 h-5" />
            <span>Plan de Repaso Recomendado por Gemini</span>
          </div>
          <div className="prose prose-sm dark:prose-invert max-w-none text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
            {aiStudyPlan}
          </div>
        </div>
      )}

      {/* Main Grid: Calendar on Left, Upcoming on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Month Calendar Card */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-6">
          {/* Calendar Header Navigation */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {MONTH_NAMES[month]} {year}
              </h2>
              <button
                onClick={handleToday}
                className="px-2.5 py-1 text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 transition-colors"
              >
                Hoy
              </button>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handlePrevMonth}
                className="p-2 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={handleNextMonth}
                className="p-2 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Day Names Grid */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {DAY_NAMES.map((name) => (
              <span
                key={name}
                className="text-xs font-bold uppercase tracking-wider text-slate-400 py-1"
              >
                {name}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {daysArray.map((dayNum, idx) => {
              if (dayNum === null) {
                return <div key={`empty-${idx}`} className="h-14 sm:h-20 rounded-2xl" />;
              }

              const formattedDay = String(dayNum).padStart(2, '0');
              const formattedMonth = String(month + 1).padStart(2, '0');
              const dayDateStr = `${year}-${formattedMonth}-${formattedDay}`;

              const isSelected = selectedDateStr === dayDateStr;
              const isToday = todayStr === dayDateStr;
              const dayEvents = events.filter((e) => e.date === dayDateStr);

              const hasExam = dayEvents.some((e) => e.type === 'exam');
              const hasAssignment = dayEvents.some((e) => e.type === 'assignment');

              return (
                <button
                  key={dayDateStr}
                  onClick={() => setSelectedDateStr(dayDateStr)}
                  className={`h-14 sm:h-20 p-1.5 rounded-2xl border text-left flex flex-col justify-between transition-all relative ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/50 shadow-xs ring-2 ring-indigo-500/20'
                      : isToday
                      ? 'border-indigo-300 dark:border-indigo-800 bg-white dark:bg-slate-900'
                      : 'border-slate-100 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                        isToday
                          ? 'bg-indigo-600 text-white'
                          : isSelected
                          ? 'text-indigo-600 dark:text-indigo-400'
                          : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {dayNum}
                    </span>
                    {dayEvents.length > 0 && (
                      <span className="text-[10px] font-bold text-slate-400 hidden sm:inline">
                        {dayEvents.length}
                      </span>
                    )}
                  </div>

                  {/* Indicator Dots */}
                  <div className="flex items-center gap-1 overflow-hidden">
                    {hasExam && <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />}
                    {hasAssignment && (
                      <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                    )}
                    {dayEvents.length > 0 && !hasExam && !hasAssignment && (
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    )}
                    {dayEvents.length > 0 && (
                      <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 truncate hidden sm:block">
                        {dayEvents[0].title}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Events for Selected Day Details */}
          <div className="border-t border-slate-100 dark:border-slate-800 pt-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                Eventos del {new Date(selectedDateStr + 'T00:00:00').toLocaleDateString('es-ES', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}
              </h3>
              <button
                onClick={() => {
                  setDate(selectedDateStr);
                  setShowAddModal(true);
                }}
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Añadir para este día
              </button>
            </div>

            {eventsForSelectedDate.length > 0 ? (
              <div className="space-y-2">
                {eventsForSelectedDate.map((ev) => {
                  const sub = subjectMap.get(ev.subjectId || '');
                  return (
                    <div
                      key={ev.id}
                      className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => onToggleEvent(ev.id)}
                          className="text-slate-400 hover:text-indigo-600 transition-colors"
                        >
                          {ev.completed ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                          ) : (
                            <Circle className="w-5 h-5" />
                          )}
                        </button>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4
                              className={`font-bold text-sm ${
                                ev.completed
                                  ? 'line-through text-slate-400'
                                  : 'text-slate-900 dark:text-white'
                              }`}
                            >
                              {ev.title}
                            </h4>
                            {getTypeBadge(ev.type)}
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2">
                            {sub && <span>{sub.name}</span>}
                            {ev.time && <span>• 🕒 {ev.time}</span>}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => onDeleteEvent(ev.id)}
                        className="text-slate-400 hover:text-rose-500 p-1.5 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">
                No hay exámenes o tareas programadas para esta fecha.
              </p>
            )}
          </div>
        </div>

        {/* Upcoming Deadlines & Exams Sidecard */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs flex flex-col space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h2 className="font-bold text-slate-900 dark:text-white text-base">
                Próximas Fechas Clave
              </h2>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
              {upcomingEvents.length} pendientes
            </span>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto max-h-[500px]">
            {upcomingEvents.map((ev) => {
              const sub = subjectMap.get(ev.subjectId || '');
              const diffLabel = getDaysDiffLabel(ev.date);

              return (
                <div
                  key={ev.id}
                  className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all flex items-start justify-between gap-3 shadow-xs"
                >
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => onToggleEvent(ev.id)}
                      className="mt-0.5 text-slate-400 hover:text-indigo-600 transition-colors"
                    >
                      {ev.completed ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      ) : (
                        <Circle className="w-5 h-5" />
                      )}
                    </button>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4
                          className={`font-bold text-xs sm:text-sm ${
                            ev.completed
                              ? 'line-through text-slate-400'
                              : 'text-slate-900 dark:text-white'
                          }`}
                        >
                          {ev.title}
                        </h4>
                        {getTypeBadge(ev.type)}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {sub?.name || 'General'} • {new Date(ev.date + 'T00:00:00').toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-lg shrink-0 ${
                      diffLabel === '¡Hoy!'
                        ? 'bg-rose-100 text-rose-700 font-extrabold animate-pulse'
                        : diffLabel === 'Mañana'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {diffLabel}
                  </span>
                </div>
              );
            })}

            {upcomingEvents.length === 0 && (
              <div className="text-center py-12 text-slate-400">
                <FileCheck className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-xs">No tienes fechas pendientes próximas.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Event Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Añadir al Calendario
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEvent} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Título del Evento / Examen:
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ej: Examen Parcial Tema 1 y 2"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Tipo:
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as CalendarEvent['type'])}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white"
                  >
                    <option value="exam">Examen</option>
                    <option value="assignment">Entrega de Trabajo</option>
                    <option value="homework">Tarea / Ejercicios</option>
                    <option value="reminder">Recordatorio</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Asignatura:
                  </label>
                  <select
                    value={subjectId}
                    onChange={(e) => setSubjectId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white"
                  >
                    <option value="">General</option>
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Fecha:
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Hora (opcional):
                  </label>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Notas / Temario:
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detalles sobre lo que entra en el examen o cómo se entrega..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white placeholder:text-slate-400"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs"
                >
                  Guardar en Calendario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
