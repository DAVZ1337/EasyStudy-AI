import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Layers,
  Plus,
  Play,
  RotateCcw,
  Sparkles,
  Search,
  BookOpen,
  Filter,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Edit3,
  Trash2,
  ChevronRight,
  Shuffle,
  Lightbulb,
  Award,
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  X,
  Check,
  Flame,
  Clock,
  ThumbsUp,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { Subject, UserFlashcard } from '../types';

interface FlashcardsViewProps {
  subjects: Subject[];
  flashcards: UserFlashcard[];
  onUpdateFlashcards: (cards: UserFlashcard[]) => void;
  initialSubjectId?: string;
  initialTopicId?: string;
  studentName?: string;
  educationLevel?: string;
  activeProfileId?: string;
}

export const FlashcardsView: React.FC<FlashcardsViewProps> = ({
  subjects,
  flashcards,
  onUpdateFlashcards,
  initialSubjectId,
  initialTopicId,
  studentName,
  educationLevel,
  activeProfileId,
}) => {
  const isPrimary = Boolean(educationLevel?.includes('Primaria'));

  // Filtering states
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(initialSubjectId || '');
  const [selectedTopicId, setSelectedTopicId] = useState<string>(initialTopicId || '');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('todas');

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [editingCard, setEditingCard] = useState<UserFlashcard | null>(null);
  const [cardToDelete, setCardToDelete] = useState<UserFlashcard | null>(null);

  // Form states
  const [formSubjectId, setFormSubjectId] = useState<string>('');
  const [formTopicId, setFormTopicId] = useState<string>('');
  const [formCustomTopic, setFormCustomTopic] = useState<string>('');
  const [formFront, setFormFront] = useState<string>('');
  const [formBack, setFormBack] = useState<string>('');
  const [formHint, setFormHint] = useState<string>('');
  const [formDifficulty, setFormDifficulty] = useState<'facil' | 'medio' | 'dificil'>('medio');
  const [formError, setFormError] = useState<string>('');

  // Study / Practice mode state
  const [isStudyMode, setIsStudyMode] = useState<boolean>(false);
  const [studyDeck, setStudyDeck] = useState<UserFlashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [showHint, setShowHint] = useState<boolean>(false);
  const [studyResults, setStudyResults] = useState<{
    correctIds: string[];
    incorrectIds: string[];
    doubtfulIds: string[];
  }>({ correctIds: [], incorrectIds: [], doubtfulIds: [] });
  const [isFinished, setIsFinished] = useState<boolean>(false);

  // Quick peek preview on card list
  const [revealedCardIds, setRevealedCardIds] = useState<Record<string, boolean>>({});

  // Reset form when opening create modal
  const openCreateModal = (preSubjectId?: string, preTopicId?: string) => {
    const subId = preSubjectId || selectedSubjectId || (subjects.length > 0 ? subjects[0].id : '');
    setFormSubjectId(subId);
    setFormTopicId(preTopicId || selectedTopicId || '');
    setFormCustomTopic('');
    setFormFront('');
    setFormBack('');
    setFormHint('');
    setFormDifficulty('medio');
    setFormError('');
    setEditingCard(null);
    setIsCreateModalOpen(true);
  };

  const openEditModal = (card: UserFlashcard) => {
    setEditingCard(card);
    setFormSubjectId(card.subjectId);
    setFormTopicId(card.topicId || '');
    setFormCustomTopic(card.topicName || '');
    setFormFront(card.front);
    setFormBack(card.back);
    setFormHint(card.hint || '');
    setFormDifficulty(card.difficulty || 'medio');
    setFormError('');
    setIsCreateModalOpen(true);
  };

  // Selected subject helper
  const formSelectedSubject = subjects.find((s) => s.id === formSubjectId);

  // Save Card Handler
  const handleSaveCard = (andCreateAnother: boolean = false) => {
    if (!formFront.trim()) {
      setFormError('Por favor, escribe la pregunta o anverso de la tarjeta.');
      return;
    }
    if (!formBack.trim()) {
      setFormError('Por favor, escribe la respuesta o reverso de la tarjeta.');
      return;
    }
    if (!formSubjectId && subjects.length > 0) {
      setFormError('Selecciona una asignatura para clasificar la tarjeta.');
      return;
    }

    // Determine topic name
    let topicName = formCustomTopic.trim();
    if (formTopicId && formSelectedSubject) {
      const foundTopic = formSelectedSubject.topics.find((t) => t.id === formTopicId);
      if (foundTopic) {
        topicName = foundTopic.title;
      }
    }

    if (editingCard) {
      // Update existing
      const updatedList = flashcards.map((c) =>
        c.id === editingCard.id
          ? {
              ...c,
              subjectId: formSubjectId,
              topicId: formTopicId || undefined,
              topicName: topicName || undefined,
              front: formFront.trim(),
              back: formBack.trim(),
              hint: formHint.trim() || undefined,
              difficulty: formDifficulty,
            }
          : c
      );
      onUpdateFlashcards(updatedList);
      setIsCreateModalOpen(false);
      setEditingCard(null);
    } else {
      // Create new card
      const newCard: UserFlashcard = {
        id: 'fc-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        subjectId: formSubjectId || (subjects[0]?.id ?? 'general'),
        topicId: formTopicId || undefined,
        topicName: topicName || undefined,
        front: formFront.trim(),
        back: formBack.trim(),
        hint: formHint.trim() || undefined,
        difficulty: formDifficulty,
        createdAt: new Date().toISOString(),
        reviewCount: 0,
        correctCount: 0,
        incorrectCount: 0,
      };

      const updatedList = [newCard, ...flashcards];
      onUpdateFlashcards(updatedList);

      if (andCreateAnother) {
        // Clear question & answer for fast repetitive creation
        setFormFront('');
        setFormBack('');
        setFormHint('');
        setFormError('');
      } else {
        setIsCreateModalOpen(false);
      }
    }
  };

  // Delete Card Handler
  const handleDeleteCard = () => {
    if (!cardToDelete) return;
    const updated = flashcards.filter((c) => c.id !== cardToDelete.id);
    onUpdateFlashcards(updated);
    setCardToDelete(null);
  };

  // Filtered flashcards list
  const filteredFlashcards = useMemo(() => {
    return flashcards.filter((card) => {
      if (selectedSubjectId && card.subjectId !== selectedSubjectId) return false;
      if (selectedTopicId && card.topicId !== selectedTopicId) return false;
      if (selectedDifficulty !== 'todas' && card.difficulty !== selectedDifficulty) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesFront = card.front.toLowerCase().includes(q);
        const matchesBack = card.back.toLowerCase().includes(q);
        const matchesHint = card.hint?.toLowerCase().includes(q);
        const matchesTopic = card.topicName?.toLowerCase().includes(q);
        if (!matchesFront && !matchesBack && !matchesHint && !matchesTopic) return false;
      }
      return true;
    });
  }, [flashcards, selectedSubjectId, selectedTopicId, selectedDifficulty, searchQuery]);

  // Start study session
  const startStudySession = (deckToStudy: UserFlashcard[] = filteredFlashcards) => {
    if (deckToStudy.length === 0) return;
    setStudyDeck(deckToStudy);
    setCurrentIndex(0);
    setIsFlipped(false);
    setShowHint(false);
    setStudyResults({ correctIds: [], incorrectIds: [], doubtfulIds: [] });
    setIsFinished(false);
    setIsStudyMode(true);
  };

  // Shuffle deck
  const handleShuffleDeck = () => {
    const shuffled = [...studyDeck].sort(() => Math.random() - 0.5);
    setStudyDeck(shuffled);
    setCurrentIndex(0);
    setIsFlipped(false);
    setShowHint(false);
    setStudyResults({ correctIds: [], incorrectIds: [], doubtfulIds: [] });
    setIsFinished(false);
  };

  // Restart practice session completely
  const handleRestartPractice = () => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setShowHint(false);
    setStudyResults({ correctIds: [], incorrectIds: [], doubtfulIds: [] });
    setIsFinished(false);
  };

  // Practice only missed / failed cards
  const handleRestartOnlyFailed = () => {
    const failedCards = studyDeck.filter(
      (c) => studyResults.incorrectIds.includes(c.id) || studyResults.doubtfulIds.includes(c.id)
    );
    if (failedCards.length > 0) {
      setStudyDeck(failedCards);
      setCurrentIndex(0);
      setIsFlipped(false);
      setShowHint(false);
      setStudyResults({ correctIds: [], incorrectIds: [], doubtfulIds: [] });
      setIsFinished(false);
    } else {
      handleRestartPractice();
    }
  };

  // Handle rating a card
  const handleRateCard = (rating: 'correct' | 'doubtful' | 'incorrect') => {
    const currentCard = studyDeck[currentIndex];
    if (!currentCard) return;

    // Record results
    const newResults = {
      correctIds: rating === 'correct' ? [...studyResults.correctIds, currentCard.id] : studyResults.correctIds,
      incorrectIds: rating === 'incorrect' ? [...studyResults.incorrectIds, currentCard.id] : studyResults.incorrectIds,
      doubtfulIds: rating === 'doubtful' ? [...studyResults.doubtfulIds, currentCard.id] : studyResults.doubtfulIds,
    };
    setStudyResults(newResults);

    // Update global card stats
    const updatedFlashcards = flashcards.map((c) => {
      if (c.id === currentCard.id) {
        return {
          ...c,
          reviewCount: (c.reviewCount || 0) + 1,
          correctCount: rating === 'correct' ? (c.correctCount || 0) + 1 : (c.correctCount || 0),
          incorrectCount: rating === 'incorrect' ? (c.incorrectCount || 0) + 1 : (c.incorrectCount || 0),
          lastReviewedAt: new Date().toISOString(),
        };
      }
      return c;
    });
    onUpdateFlashcards(updatedFlashcards);

    // Advance to next card or finish
    if (currentIndex + 1 < studyDeck.length) {
      setCurrentIndex((prev) => prev + 1);
      setIsFlipped(false);
      setShowHint(false);
    } else {
      setIsFinished(true);
    }
  };

  // Keyboard navigation for study mode
  useEffect(() => {
    if (!isStudyMode || isFinished) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === 'Space') {
        e.preventDefault();
        setIsFlipped((prev) => !prev);
      } else if (isFlipped) {
        if (e.key === '1') {
          e.preventDefault();
          handleRateCard('incorrect');
        } else if (e.key === '2') {
          e.preventDefault();
          handleRateCard('doubtful');
        } else if (e.key === '3') {
          e.preventDefault();
          handleRateCard('correct');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isStudyMode, isFinished, isFlipped, currentIndex, studyDeck]);

  // Current studying card
  const currentStudyCard = studyDeck[currentIndex];
  const currentStudySubject = subjects.find((s) => s.id === currentStudyCard?.subjectId);

  // Score computation
  const totalCardsStudied = studyDeck.length;
  const correctCount = studyResults.correctIds.length;
  const scorePercent = totalCardsStudied > 0 ? Math.round((correctCount / totalCardsStudied) * 100) : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 animate-in fade-in duration-200 space-y-6">
      {/* ============================================================== */}
      {/* STUDY / PRACTICE MODE OVERLAY                                  */}
      {/* ============================================================== */}
      {isStudyMode && currentStudyCard && (
        <div className="fixed inset-0 z-50 bg-slate-900/90 backdrop-blur-md flex flex-col items-center justify-between p-4 sm:p-6 overflow-y-auto">
          {/* Top Bar */}
          <div className="w-full max-w-3xl flex items-center justify-between text-white pb-4 shrink-0">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsStudyMode(false)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors flex items-center gap-1.5 text-xs font-semibold"
                title="Salir del modo estudio"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Volver a la biblioteca</span>
              </button>

              <div>
                <h3 className="font-bold text-sm sm:text-base text-white flex items-center gap-2">
                  <span>Modo Estudio: {currentStudySubject?.name || 'General'}</span>
                  {currentStudyCard.topicName && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-white/15 text-indigo-200">
                      {currentStudyCard.topicName}
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-300">
                  Tarjeta {currentIndex + 1} de {studyDeck.length}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleShuffleDeck}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
                title="Barajar tarjetas"
              >
                <Shuffle className="w-4 h-4" />
              </button>
              <button
                onClick={handleRestartPractice}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
                title="Reiniciar práctica desde el principio"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsStudyMode(false)}
                className="p-2 rounded-xl bg-white/10 hover:bg-rose-600/80 text-white transition-colors"
                title="Cerrar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full max-w-3xl h-2 bg-white/15 rounded-full overflow-hidden shrink-0 mb-4">
            <div
              className="h-full bg-gradient-to-r from-indigo-400 to-purple-400 transition-all duration-300 rounded-full"
              style={{ width: `${((currentIndex + 1) / studyDeck.length) * 100}%` }}
            />
          </div>

          {/* Main Card Arena or Finish Screen */}
          {!isFinished ? (
            <div className="w-full max-w-2xl flex-1 flex flex-col justify-center items-center my-auto py-2">
              {/* Interactive Flip Card */}
              <div
                onClick={() => setIsFlipped((prev) => !prev)}
                className={`w-full min-h-[340px] sm:min-h-[380px] bg-white dark:bg-slate-900 border-2 rounded-3xl p-6 sm:p-10 shadow-2xl cursor-pointer flex flex-col justify-between transition-all duration-300 transform select-none ${
                  isFlipped
                    ? 'border-purple-400 dark:border-purple-600 ring-4 ring-purple-500/20'
                    : 'border-indigo-400 dark:border-indigo-600 hover:scale-[1.01]'
                }`}
              >
                {/* Card Top Pill Badge */}
                <div className="flex items-center justify-between gap-2 pb-4 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className="text-xs font-bold px-2.5 py-1 rounded-lg text-white shadow-2xs flex items-center gap-1.5"
                      style={{ backgroundColor: currentStudySubject?.color || '#6366f1' }}
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>{currentStudySubject?.name || 'Materia'}</span>
                    </span>

                    {currentStudyCard.topicName && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {currentStudyCard.topicName}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        currentStudyCard.difficulty === 'facil'
                          ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                          : currentStudyCard.difficulty === 'dificil'
                          ? 'bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                          : 'bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                      }`}
                    >
                      {currentStudyCard.difficulty === 'facil'
                        ? 'Fácil 🟢'
                        : currentStudyCard.difficulty === 'dificil'
                        ? 'Difícil 🔴'
                        : 'Medio 🟡'}
                    </span>

                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      {isFlipped ? 'Reverso / Respuesta' : 'Anverso / Pregunta'}
                    </span>
                  </div>
                </div>

                {/* Card Body (Front or Back) */}
                <div className="py-8 my-auto flex flex-col justify-center items-center text-center">
                  {!isFlipped ? (
                    // FRONT: Question
                    <div className="space-y-4 animate-in fade-in duration-200">
                      <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
                        PREGUNTA / CONCEPTO
                      </p>
                      <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white leading-relaxed">
                        {currentStudyCard.front}
                      </h2>

                      {/* Hint Toggle */}
                      {currentStudyCard.hint && (
                        <div className="pt-4" onClick={(e) => e.stopPropagation()}>
                          {!showHint ? (
                            <button
                              onClick={() => setShowHint(true)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-xs font-semibold hover:bg-amber-100 transition-colors"
                            >
                              <Lightbulb className="w-3.5 h-3.5" />
                              <span>Ver pista para recordar</span>
                            </button>
                          ) : (
                            <div className="p-3 bg-amber-50/90 dark:bg-amber-950/80 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-900 dark:text-amber-200 text-left max-w-md mx-auto animate-in fade-in">
                              <span className="font-bold flex items-center gap-1 mb-1 text-amber-800 dark:text-amber-300">
                                <Lightbulb className="w-3.5 h-3.5 shrink-0" />
                                Pista:
                              </span>
                              <span>{currentStudyCard.hint}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    // BACK: Answer
                    <div className="space-y-4 animate-in fade-in duration-200">
                      <p className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-widest">
                        RESPUESTA / EXPLICACIÓN
                      </p>
                      <div className="text-base sm:text-lg font-medium text-slate-800 dark:text-slate-100 leading-relaxed whitespace-pre-line max-w-xl">
                        {currentStudyCard.back}
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Footer prompt */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                    <span>
                      {isFlipped
                        ? 'Ahora evalúa cómo te ha ido abajo 👇'
                        : 'Haz clic o pulsa [Espacio] para dar la vuelta'}
                    </span>
                  </span>

                  <span className="hidden sm:inline font-mono text-[11px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                    Espacio = Girar
                  </span>
                </div>
              </div>

              {/* Assessment Buttons when card is flipped */}
              {isFlipped ? (
                <div className="w-full max-w-2xl mt-5 grid grid-cols-3 gap-2.5 sm:gap-4 animate-in slide-in-from-bottom-2 duration-200">
                  <button
                    onClick={() => handleRateCard('incorrect')}
                    className="p-3 sm:p-4 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs sm:text-sm flex flex-col items-center justify-center gap-1 shadow-lg shadow-rose-600/30 transition-all hover:scale-105 active:scale-95"
                  >
                    <XCircle className="w-5 h-5 sm:w-6 sm:h-6" />
                    <span>Fallada</span>
                    <span className="text-[10px] text-rose-200 font-mono hidden sm:inline">[Tecla 1]</span>
                  </button>

                  <button
                    onClick={() => handleRateCard('doubtful')}
                    className="p-3 sm:p-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-white font-bold text-xs sm:text-sm flex flex-col items-center justify-center gap-1 shadow-lg shadow-amber-500/30 transition-all hover:scale-105 active:scale-95"
                  >
                    <HelpCircle className="w-5 h-5 sm:w-6 sm:h-6" />
                    <span>Con dudas</span>
                    <span className="text-[10px] text-amber-200 font-mono hidden sm:inline">[Tecla 2]</span>
                  </button>

                  <button
                    onClick={() => handleRateCard('correct')}
                    className="p-3 sm:p-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm flex flex-col items-center justify-center gap-1 shadow-lg shadow-emerald-600/30 transition-all hover:scale-105 active:scale-95"
                  >
                    <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" />
                    <span>¡Acertada!</span>
                    <span className="text-[10px] text-emerald-200 font-mono hidden sm:inline">[Tecla 3]</span>
                  </button>
                </div>
              ) : (
                <div className="mt-5 text-center">
                  <button
                    onClick={() => setIsFlipped(true)}
                    className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 transition-all hover:scale-105 active:scale-95 flex items-center gap-2 mx-auto"
                  >
                    <Eye className="w-4 h-4" />
                    <span>Ver Respuesta (o pulsa Espacio)</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            // FINISH / RESULTS SUMMARY SCREEN
            <div className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-6 my-auto animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-indigo-600/30">
                <Award className="w-8 h-8" />
              </div>

              <div>
                <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">
                  {scorePercent >= 80
                    ? '¡Excelente trabajo! 🎉'
                    : scorePercent >= 50
                    ? '¡Buen repaso! Sigue practicando 💪'
                    : '¡Buen intento! El repaso afianza el aprendizaje 🧠'}
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Has completado las {totalCardsStudied} flashcards de este mazo.
                </p>
              </div>

              {/* Big Score Box */}
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 grid grid-cols-3 gap-3">
                <div className="p-2">
                  <p className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
                    {correctCount}
                  </p>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Acertadas</p>
                </div>
                <div className="p-2 border-x border-slate-200 dark:border-slate-700">
                  <p className="text-2xl sm:text-3xl font-black text-amber-500">
                    {studyResults.doubtfulIds.length}
                  </p>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Con dudas</p>
                </div>
                <div className="p-2">
                  <p className="text-2xl sm:text-3xl font-black text-rose-500">
                    {studyResults.incorrectIds.length}
                  </p>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Para repasar</p>
                </div>
              </div>

              {/* Direct Actions: Volver a hacer todas, o volver a hacer las falladas */}
              <div className="space-y-3 pt-2">
                <button
                  onClick={handleRestartPractice}
                  className="w-full py-3.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-md shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all hover:scale-[1.01]"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>🔄 Volver a hacer todas las tarjetas</span>
                </button>

                {(studyResults.incorrectIds.length > 0 || studyResults.doubtfulIds.length > 0) && (
                  <button
                    onClick={handleRestartOnlyFailed}
                    className="w-full py-3 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm shadow-md shadow-purple-600/30 flex items-center justify-center gap-2 transition-all hover:scale-[1.01]"
                  >
                    <Flame className="w-4 h-4 text-amber-300" />
                    <span>
                      🎯 Volver a hacer solo las que me costaron (
                      {studyResults.incorrectIds.length + studyResults.doubtfulIds.length})
                    </span>
                  </button>
                )}

                <button
                  onClick={() => setIsStudyMode(false)}
                  className="w-full py-2.5 px-4 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs transition-colors"
                >
                  Volver a la biblioteca de tarjetas
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* HEADER & MAIN CONTROLS                                         */}
      {/* ============================================================== */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Tarjetas de Estudio (Flashcards) 🃏
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Crea tus propias preguntas y respuestas, organízalas por materias y temas, y repásalas tantas veces como quieras.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => startStudySession(filteredFlashcards)}
            disabled={filteredFlashcards.length === 0}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-40 text-white font-bold text-xs sm:text-sm shadow-md shadow-indigo-600/20 flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>
              Practicar Mazo ({filteredFlashcards.length})
            </span>
          </button>

          <button
            onClick={() => openCreateModal()}
            className="px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:border-indigo-500 text-slate-800 dark:text-slate-100 font-bold text-xs sm:text-sm shadow-xs flex items-center gap-2 transition-all hover:bg-slate-50 dark:hover:bg-slate-700/60"
          >
            <Plus className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>+ Crear Flashcard</span>
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* FILTER BAR: ASIGNATURA, TEMA, DIFICULTAD Y BÚSQUEDA            */}
      {/* ============================================================== */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Subject Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
              Asignatura
            </label>
            <select
              value={selectedSubjectId}
              onChange={(e) => {
                setSelectedSubjectId(e.target.value);
                setSelectedTopicId('');
              }}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-indigo-500"
            >
              <option value="">Todas las asignaturas ({flashcards.length})</option>
              {subjects.map((sub) => {
                const count = flashcards.filter((c) => c.subjectId === sub.id).length;
                return (
                  <option key={sub.id} value={sub.id}>
                    {sub.name} ({count})
                  </option>
                );
              })}
            </select>
          </div>

          {/* Topic Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
              Tema específico
            </label>
            <select
              value={selectedTopicId}
              onChange={(e) => setSelectedTopicId(e.target.value)}
              disabled={!selectedSubjectId}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 disabled:opacity-50 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-indigo-500"
            >
              <option value="">Todos los temas</option>
              {selectedSubjectId &&
                subjects
                  .find((s) => s.id === selectedSubjectId)
                  ?.topics.map((top) => {
                    const count = flashcards.filter((c) => c.topicId === top.id).length;
                    return (
                      <option key={top.id} value={top.id}>
                        {top.title} ({count})
                      </option>
                    );
                  })}
            </select>
          </div>

          {/* Difficulty Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
              Dificultad
            </label>
            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-indigo-500"
            >
              <option value="todas">Cualquier dificultad</option>
              <option value="facil">Fácil 🟢</option>
              <option value="medio">Medio 🟡</option>
              <option value="dificil">Difícil 🔴</option>
            </select>
          </div>

          {/* Search Input */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
              Buscar tarjeta
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Palabra clave o pregunta..."
                className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-hidden focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Status Count and Active Filter Pills */}
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
          <span>
            Mostrando <strong>{filteredFlashcards.length}</strong> de {flashcards.length} tarjetas
          </span>

          {(selectedSubjectId || selectedTopicId || selectedDifficulty !== 'todas' || searchQuery) && (
            <button
              onClick={() => {
                setSelectedSubjectId('');
                setSelectedTopicId('');
                setSelectedDifficulty('todas');
                setSearchQuery('');
              }}
              className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold text-xs"
            >
              Limpiar todos los filtros
            </button>
          )}
        </div>
      </div>

      {/* ============================================================== */}
      {/* FLASHCARDS GRID VIEW                                           */}
      {/* ============================================================== */}
      {filteredFlashcards.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFlashcards.map((card) => {
            const cardSubject = subjects.find((s) => s.id === card.subjectId);
            const isRevealed = revealedCardIds[card.id];

            return (
              <div
                key={card.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group space-y-4"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span
                      className="text-[11px] font-bold px-2 py-0.5 rounded-md text-white shadow-2xs"
                      style={{ backgroundColor: cardSubject?.color || '#6366f1' }}
                    >
                      {cardSubject?.name || 'Materia'}
                    </span>

                    {card.topicName && (
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 truncate max-w-[140px]">
                        {card.topicName}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEditModal(card)}
                      className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="Editar tarjeta"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setCardToDelete(card)}
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="Eliminar tarjeta"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Question */}
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                    Pregunta
                  </p>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white leading-snug line-clamp-3">
                    {card.front}
                  </h3>
                </div>

                {/* Answer (Accordion or Peek) */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() =>
                      setRevealedCardIds((prev) => ({
                        ...prev,
                        [card.id]: !prev[card.id],
                      }))
                    }
                    className="w-full flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 py-1 transition-colors"
                  >
                    <span>{isRevealed ? 'Ocultar respuesta' : 'Ver respuesta'}</span>
                    {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>

                  {isRevealed && (
                    <div className="mt-2 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs text-slate-800 dark:text-slate-200 whitespace-pre-line border border-slate-200 dark:border-slate-700 animate-in fade-in duration-150">
                      {card.back}
                      {card.hint && (
                        <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700 text-amber-600 dark:text-amber-400 flex items-start gap-1 font-medium">
                          <Lightbulb className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <span>Pista: {card.hint}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Card Stats Footer */}
                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>Repasada {card.reviewCount || 0} veces</span>
                  </span>

                  <button
                    onClick={() => startStudySession([card])}
                    className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                  >
                    <span>Hacer ahora</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-10 text-center space-y-4 max-w-lg mx-auto shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
            <Layers className="w-7 h-7" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-slate-900 dark:text-white">
              No hay flashcards con los filtros seleccionados
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Crea tus propias tarjetas poniendo las preguntas y respuestas tú mismo para estudiar cualquier tema.
            </p>
          </div>
          <button
            onClick={() => openCreateModal()}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/20 inline-flex items-center gap-2 transition-all hover:scale-105"
          >
            <Plus className="w-4 h-4" />
            <span>Crear mi primera Flashcard</span>
          </button>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: CREAR / EDITAR FLASHCARD                                */}
      {/* ============================================================== */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl p-6 sm:p-7 space-y-5 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    {editingCard ? 'Editar Flashcard' : 'Crear Nueva Flashcard'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Pon tu pregunta y respuesta personalizadas
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-xl text-xs font-semibold text-rose-700 dark:text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="space-y-4">
              {/* Subject Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Asignatura <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formSubjectId}
                  onChange={(e) => {
                    setFormSubjectId(e.target.value);
                    setFormTopicId('');
                  }}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-indigo-500"
                >
                  {subjects.length === 0 && <option value="">Sin asignaturas creadas</option>}
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Topic Selector or Custom Topic */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Tema (opcional)
                </label>
                {formSelectedSubject && formSelectedSubject.topics.length > 0 ? (
                  <select
                    value={formTopicId}
                    onChange={(e) => setFormTopicId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-indigo-500 mb-2"
                  >
                    <option value="">Selecciona tema de la asignatura...</option>
                    {formSelectedSubject.topics.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title}
                      </option>
                    ))}
                  </select>
                ) : null}

                <input
                  type="text"
                  value={formCustomTopic}
                  onChange={(e) => setFormCustomTopic(e.target.value)}
                  placeholder="O escribe un nombre de tema libre (Ej: Álgebra, Verbos, Reino Animal...)"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              {/* Question / Front */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Pregunta o Concepto (Anverso de la tarjeta) <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={formFront}
                  onChange={(e) => setFormFront(e.target.value)}
                  placeholder="Ej: ¿Qué es la fotosíntesis y en qué orgánulo ocurre?"
                  className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-hidden focus:border-indigo-500 resize-none"
                />
              </div>

              {/* Answer / Back */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Respuesta o Explicación (Reverso de la tarjeta) <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={formBack}
                  onChange={(e) => setFormBack(e.target.value)}
                  placeholder="Ej: Proceso biológico en cloroplastos donde las plantas convierten luz solar, agua y CO2 en glucosa y oxígeno."
                  className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-hidden focus:border-indigo-500 resize-none"
                />
              </div>

              {/* Hint / Ayuda Opcional */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Pista o regla mnemotécnica (opcional) 💡
                </label>
                <input
                  type="text"
                  value={formHint}
                  onChange={(e) => setFormHint(e.target.value)}
                  placeholder="Ej: Empieza por Cloro... y tiene pigmento verde."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              {/* Difficulty */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Dificultad
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormDifficulty('facil')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-colors ${
                      formDifficulty === 'facil'
                        ? 'bg-emerald-50 dark:bg-emerald-950/70 border-emerald-500 text-emerald-700 dark:text-emerald-300'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Fácil 🟢
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormDifficulty('medio')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-colors ${
                      formDifficulty === 'medio'
                        ? 'bg-amber-50 dark:bg-amber-950/70 border-amber-500 text-amber-700 dark:text-amber-300'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Medio 🟡
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormDifficulty('dificil')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-colors ${
                      formDifficulty === 'dificil'
                        ? 'bg-rose-50 dark:bg-rose-950/70 border-rose-500 text-rose-700 dark:text-rose-300'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Difícil 🔴
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancelar
              </button>

              {!editingCard && (
                <button
                  type="button"
                  onClick={() => handleSaveCard(true)}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl border border-indigo-300 dark:border-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 text-xs font-bold transition-colors"
                >
                  Guardar y añadir otra
                </button>
              )}

              <button
                type="button"
                onClick={() => handleSaveCard(false)}
                className="w-full sm:w-auto px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all hover:scale-105"
              >
                {editingCard ? 'Guardar Cambios' : 'Guardar Flashcard'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: CONFIRMACIÓN ELIMINAR TARJETA                           */}
      {/* ============================================================== */}
      {cardToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-sm shadow-2xl p-6 text-center space-y-4 animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                ¿Eliminar esta flashcard?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                "{cardToDelete.front}"
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setCardToDelete(null)}
                className="flex-1 py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteCard}
                className="flex-1 py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-xs"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
