import React, { useState } from 'react';
import {
  Clock,
  Plus,
  Trash2,
  MapPin,
  User,
  Sparkles,
  CalendarDays,
  X,
  BookOpen,
  ChevronRight,
} from 'lucide-react';
import { ScheduleSlot, Subject } from '../types';

interface SchoolScheduleProps {
  schedule: ScheduleSlot[];
  subjects: Subject[];
  onAddSlot: (slot: ScheduleSlot) => void;
  onDeleteSlot: (slotId: string) => void;
  onSelectSubject?: (subjectId: string) => void;
  studentName?: string;
}

const DAYS = [
  { id: 1, name: 'Lunes', short: 'Lun' },
  { id: 2, name: 'Martes', short: 'Mar' },
  { id: 3, name: 'Miércoles', short: 'Mié' },
  { id: 4, name: 'Jueves', short: 'Jue' },
  { id: 5, name: 'Viernes', short: 'Vie' },
  { id: 6, name: 'Sábado', short: 'Sáb' },
];

export const SchoolSchedule: React.FC<SchoolScheduleProps> = ({
  schedule,
  subjects,
  onAddSlot,
  onDeleteSlot,
  onSelectSubject,
  studentName,
}) => {
  const [selectedDayTab, setSelectedDayTab] = useState<number>(() => {
    const today = new Date().getDay();
    return today >= 1 && today <= 6 ? today : 1;
  });
  const [showAddModal, setShowAddModal] = useState<boolean>(false);

  // New slot form
  const [newDay, setNewDay] = useState<number>(1);
  const [newStart, setNewStart] = useState<string>('09:00');
  const [newEnd, setNewEnd] = useState<string>('10:30');
  const [newSubjectId, setNewSubjectId] = useState<string>(subjects[0]?.id || '');
  const [newRoom, setNewRoom] = useState<string>('');
  const [newNote, setNewNote] = useState<string>('');

  const subjectMap = new Map(subjects.map((s) => [s.id, s]));

  // Find next upcoming class today
  const today = new Date().getDay();
  const currentTime = `${String(new Date().getHours()).padStart(2, '0')}:${String(
    new Date().getMinutes()
  ).padStart(2, '0')}`;

  const todaySlots = schedule
    .filter((s) => s.dayOfWeek === today)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const upcomingClass = todaySlots.find((s) => s.endTime >= currentTime);
  const upcomingSubject = upcomingClass ? subjectMap.get(upcomingClass.subjectId) : null;

  const handleSaveSlot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjectId) return;

    const newSlot: ScheduleSlot = {
      id: 'sch-' + Date.now(),
      dayOfWeek: Number(newDay),
      startTime: newStart,
      endTime: newEnd,
      subjectId: newSubjectId,
      room: newRoom.trim() || undefined,
      note: newNote.trim() || undefined,
    };

    onAddSlot(newSlot);
    setShowAddModal(false);
    setNewRoom('');
    setNewNote('');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {studentName ? `Horario Escolar de ${studentName}` : 'Horario Escolar y Semanal'}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Visualiza tus clases de la semana, aulas y materias asignadas.
          </p>
        </div>

        <button
          onClick={() => {
            if (subjects.length === 0) {
              alert('Primero crea al menos una asignatura en la pestaña "Asignaturas & Temas" para poder asignarla al horario escolar.');
              return;
            }
            if (!newSubjectId && subjects.length > 0) {
              setNewSubjectId(subjects[0].id);
            }
            setShowAddModal(true);
          }}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-500/20 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Añadir Clase</span>
        </button>
      </div>

      {/* Widget: Siguiente Clase de Hoy */}
      {upcomingClass && upcomingSubject && (
        <div className="bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-transparent border border-indigo-200 dark:border-indigo-900/60 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md font-bold text-lg"
              style={{ backgroundColor: upcomingSubject.color || '#6366f1' }}
            >
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> Próxima clase hoy
              </span>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {upcomingSubject.name}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-3 mt-0.5">
                <span>
                  🕒 {upcomingClass.startTime} - {upcomingClass.endTime}
                </span>
                {upcomingClass.room && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-slate-400" /> {upcomingClass.room}
                  </span>
                )}
              </p>
            </div>
          </div>

          {onSelectSubject && (
            <button
              onClick={() => onSelectSubject(upcomingSubject.id)}
              className="px-4 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors self-end sm:self-auto"
            >
              <span>Ver Apuntes del Tema</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Mobile Day Tabs Selector */}
      <div className="md:hidden flex overflow-x-auto gap-2 pb-2">
        {DAYS.map((day) => {
          const count = schedule.filter((s) => s.dayOfWeek === day.id).length;
          return (
            <button
              key={day.id}
              onClick={() => setSelectedDayTab(day.id)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                selectedDayTab === day.id
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              <span>{day.name}</span>
              {count > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    selectedDayTab === day.id
                      ? 'bg-indigo-800 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Mobile Day List View */}
      <div className="md:hidden space-y-3">
        {schedule
          .filter((s) => s.dayOfWeek === selectedDayTab)
          .sort((a, b) => a.startTime.localeCompare(b.startTime))
          .map((slot) => {
            const subject = subjectMap.get(slot.subjectId);
            return (
              <div
                key={slot.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex items-start justify-between relative overflow-hidden"
              >
                <div
                  className="absolute top-0 bottom-0 left-0 w-1.5"
                  style={{ backgroundColor: subject?.color || '#6366f1' }}
                />
                <div className="pl-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                      {slot.startTime} - {slot.endTime}
                    </span>
                    {slot.room && (
                      <span className="text-[11px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md text-slate-600 dark:text-slate-300">
                        {slot.room}
                      </span>
                    )}
                  </div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-base">
                    {subject?.name || 'Materia'}
                  </h4>
                  {slot.note && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{slot.note}</p>
                  )}
                  {subject?.teacher && (
                    <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                      <User className="w-3 h-3" /> {subject.teacher}
                    </p>
                  )}
                </div>

                <button
                  onClick={() => onDeleteSlot(slot.id)}
                  className="text-slate-400 hover:text-rose-500 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}

        {schedule.filter((s) => s.dayOfWeek === selectedDayTab).length === 0 && (
          <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
            <CalendarDays className="w-10 h-10 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              No tienes clases programadas para este día
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Pulsa en "Añadir Clase" para configurar tus horarios.
            </p>
          </div>
        )}
      </div>

      {/* Desktop Weekly Schedule Grid */}
      <div className="hidden md:block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs overflow-hidden">
        <div className="grid grid-cols-6 gap-4">
          {DAYS.map((day) => {
            const daySlots = schedule
              .filter((s) => s.dayOfWeek === day.id)
              .sort((a, b) => a.startTime.localeCompare(b.startTime));

            const isCurrentDay = today === day.id;

            return (
              <div key={day.id} className="flex flex-col space-y-3">
                {/* Column Day Header */}
                <div
                  className={`p-3 rounded-2xl text-center border transition-all ${
                    isCurrentDay
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800'
                      : 'bg-slate-50 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800'
                  }`}
                >
                  <p
                    className={`text-xs font-bold uppercase tracking-wider ${
                      isCurrentDay
                        ? 'text-indigo-600 dark:text-indigo-400'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {day.name}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {daySlots.length} {daySlots.length === 1 ? 'clase' : 'clases'}
                  </p>
                </div>

                {/* Day Slots List */}
                <div className="space-y-3 min-h-[300px]">
                  {daySlots.map((slot) => {
                    const subject = subjectMap.get(slot.subjectId);
                    return (
                      <div
                        key={slot.id}
                        className="group relative p-3 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 bg-white dark:bg-slate-900 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                      >
                        <div
                          className="h-1.5 w-8 rounded-full mb-2"
                          style={{ backgroundColor: subject?.color || '#6366f1' }}
                        />

                        <div className="space-y-1">
                          <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 block">
                            {slot.startTime} - {slot.endTime}
                          </span>
                          <h4 className="font-bold text-xs text-slate-900 dark:text-white leading-tight">
                            {subject?.name || 'Materia'}
                          </h4>
                          {slot.room && (
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                              <MapPin className="w-2.5 h-2.5" /> {slot.room}
                            </p>
                          )}
                          {slot.note && (
                            <p className="text-[10px] text-slate-400 italic line-clamp-2">
                              {slot.note}
                            </p>
                          )}
                        </div>

                        <button
                          onClick={() => onDeleteSlot(slot.id)}
                          className="opacity-0 group-hover:opacity-100 absolute top-2 right-2 text-slate-400 hover:text-rose-500 p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                          title="Eliminar clase"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}

                  {daySlots.length === 0 && (
                    <div className="h-32 border-2 border-dashed border-slate-200 dark:border-slate-800/80 rounded-2xl flex items-center justify-center p-4 text-center">
                      <span className="text-[11px] text-slate-400">Sin clases</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Slot Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Añadir Clase al Horario
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSlot} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Asignatura:
                </label>
                <select
                  value={newSubjectId}
                  onChange={(e) => setNewSubjectId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code || 'Materia'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Día de la semana:
                </label>
                <select
                  value={newDay}
                  onChange={(e) => setNewDay(Number(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                >
                  {DAYS.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Hora Inicio:
                  </label>
                  <input
                    type="time"
                    value={newStart}
                    onChange={(e) => setNewStart(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Hora Fin:
                  </label>
                  <input
                    type="time"
                    value={newEnd}
                    onChange={(e) => setNewEnd(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Aula / Lugar (opcional):
                </label>
                <input
                  type="text"
                  value={newRoom}
                  onChange={(e) => setNewRoom(e.target.value)}
                  placeholder="Ej: Aula 204, Laboratorio B"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white placeholder:text-slate-400"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Notas de la clase (opcional):
                </label>
                <input
                  type="text"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Ej: Traer calculadora, apuntes tema 2"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white placeholder:text-slate-400"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs"
                >
                  Guardar Clase
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
