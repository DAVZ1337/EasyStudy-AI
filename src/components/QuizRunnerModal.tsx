import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  XCircle,
  Sparkles,
  RotateCcw,
  Trophy,
  ArrowRight,
  ArrowLeft,
  Layers,
  HelpCircle,
  Eye,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { QuizItem } from '../types';

interface QuizRunnerModalProps {
  quiz: QuizItem | null;
  onClose: () => void;
  onSaveScore?: (quizId: string, score: number, total: number) => void;
}

export const QuizRunnerModal: React.FC<QuizRunnerModalProps> = ({
  quiz,
  onClose,
  onSaveScore,
}) => {
  const [mode, setMode] = useState<'quiz' | 'flashcards'>('quiz');
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [revealedAnswers, setRevealedAnswers] = useState<Record<number, boolean>>({});
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);

  // Flashcards state
  const [flashcardIndex, setFlashcardIndex] = useState<number>(0);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);

  if (!quiz) return null;

  const questions = quiz.questions || [];
  const flashcards = quiz.flashcards || [];
  const currentQuestion = questions[currentIndex];

  const handleSelectOption = (optionIndex: number) => {
    if (revealedAnswers[currentIndex]) return; // already answered

    const isCorrect = optionIndex === currentQuestion.correctIndex;
    const newAnswers = { ...selectedAnswers, [currentIndex]: optionIndex };
    const newRevealed = { ...revealedAnswers, [currentIndex]: true };

    setSelectedAnswers(newAnswers);
    setRevealedAnswers(newRevealed);

    if (isCorrect) {
      setScore((prev) => prev + 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      // Calculate final score
      let calculatedScore = 0;
      questions.forEach((q, idx) => {
        if (selectedAnswers[idx] === q.correctIndex) {
          calculatedScore += 1;
        }
      });
      setIsFinished(true);
      if (onSaveScore) {
        onSaveScore(quiz.id, calculatedScore, questions.length);
      }
      // Trigger confetti celebration if scored > 60%
      if (calculatedScore / questions.length >= 0.6) {
        try {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 },
          });
        } catch (e) {
          console.warn('Confetti error:', e);
        }
      }
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setSelectedAnswers({});
    setRevealedAnswers({});
    setIsFinished(false);
    setScore(0);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white text-base">
                {quiz.quizTitle}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Dificultad: <span className="capitalize font-medium">{quiz.difficulty}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Mode switch */}
            <div className="bg-slate-200/80 dark:bg-slate-800 p-0.5 rounded-xl text-xs font-medium flex">
              <button
                onClick={() => setMode('quiz')}
                className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1 ${
                  mode === 'quiz'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Test ({questions.length})</span>
              </button>
              {flashcards.length > 0 && (
                <button
                  onClick={() => setMode('flashcards')}
                  className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1 ${
                    mode === 'flashcards'
                      ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Flashcards ({flashcards.length})</span>
                </button>
              )}
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30 dark:bg-slate-950/30">
          {mode === 'quiz' ? (
            !isFinished && currentQuestion ? (
              <div className="space-y-6">
                {/* Progress bar */}
                <div>
                  <div className="flex justify-between items-center text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
                    <span>
                      Pregunta {currentIndex + 1} de {questions.length}
                    </span>
                    <span className="text-indigo-600 dark:text-indigo-400">
                      {Math.round(((currentIndex + 1) / questions.length) * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                      style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Question Text */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
                  <h4 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-snug">
                    {currentQuestion.question}
                  </h4>
                </div>

                {/* Options List */}
                <div className="space-y-2.5">
                  {currentQuestion.options.map((option, optIdx) => {
                    const isSelected = selectedAnswers[currentIndex] === optIdx;
                    const isRevealed = Boolean(revealedAnswers[currentIndex]);
                    const isCorrect = optIdx === currentQuestion.correctIndex;

                    let btnStyle =
                      'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500 text-slate-800 dark:text-slate-200';

                    if (isRevealed) {
                      if (isCorrect) {
                        btnStyle =
                          'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-900 dark:text-emerald-100 font-semibold';
                      } else if (isSelected && !isCorrect) {
                        btnStyle =
                          'bg-rose-50 dark:bg-rose-950/60 border-rose-500 text-rose-900 dark:text-rose-100';
                      } else {
                        btnStyle = 'opacity-60 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800';
                      }
                    }

                    return (
                      <button
                        key={optIdx}
                        onClick={() => handleSelectOption(optIdx)}
                        disabled={isRevealed}
                        className={`w-full text-left p-4 rounded-xl border text-sm flex items-center justify-between transition-all shadow-xs ${btnStyle}`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-xs shrink-0 text-slate-700 dark:text-slate-300">
                            {String.fromCharCode(65 + optIdx)}
                          </span>
                          <span className="leading-snug">{option}</span>
                        </div>
                        {isRevealed && isCorrect && (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 ml-2" />
                        )}
                        {isRevealed && isSelected && !isCorrect && (
                          <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 ml-2" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Explanation feedback */}
                {revealedAnswers[currentIndex] && (
                  <div className="p-4 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 space-y-1.5 animate-in fade-in">
                    <p className="text-xs font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4" />
                      Explicación del tutor:
                    </p>
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                      {currentQuestion.explanation}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              /* Finish Screen */
              <div className="text-center py-8 space-y-6">
                <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-amber-400 to-amber-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-amber-500/20">
                  <Trophy className="w-10 h-10 animate-bounce" />
                </div>
                <div>
                  <h4 className="text-2xl font-extrabold text-slate-900 dark:text-white">
                    ¡Cuestionario Completado!
                  </h4>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Has acertado{' '}
                    <span className="font-bold text-indigo-600 dark:text-indigo-400 text-base">
                      {score}
                    </span>{' '}
                    de <span className="font-bold text-base">{questions.length}</span> preguntas.
                  </p>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mt-2">
                    {score / questions.length >= 0.8
                      ? '🌟 ¡Dominio excelente del tema!'
                      : score / questions.length >= 0.5
                      ? '👍 ¡Buen trabajo, un repaso más y lo clavas!'
                      : '📚 Conviene repasar los apuntes y resúmenes'}
                  </p>
                </div>

                <div className="flex justify-center gap-3 pt-4">
                  <button
                    onClick={handleRestart}
                    className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Repetir Cuestionario</span>
                  </button>
                  {flashcards.length > 0 && (
                    <button
                      onClick={() => setMode('flashcards')}
                      className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs flex items-center gap-2 shadow-md shadow-purple-500/20 transition-all"
                    >
                      <Layers className="w-4 h-4" />
                      <span>Ver Flashcards</span>
                    </button>
                  )}
                  <button
                    onClick={onClose}
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md shadow-indigo-500/20 transition-all"
                  >
                    Guardar y Cerrar
                  </button>
                </div>
              </div>
            )
          ) : (
            /* Flashcards Mode */
            <div className="space-y-6">
              <div className="flex justify-between items-center text-xs font-semibold text-slate-500 dark:text-slate-400">
                <span>
                  Tarjeta {flashcardIndex + 1} de {flashcards.length}
                </span>
                <span className="text-purple-600 dark:text-purple-400 flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5" /> Haz click en la tarjeta para girar
                </span>
              </div>

              {/* Card */}
              <div
                onClick={() => setIsFlipped(!isFlipped)}
                className="w-full min-h-[260px] bg-white dark:bg-slate-900 border-2 border-indigo-200 dark:border-indigo-900/60 rounded-3xl p-8 flex flex-col justify-center items-center text-center shadow-lg hover:shadow-xl cursor-pointer transition-all duration-300 transform active:scale-[0.98]"
              >
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-500 mb-4 px-3 py-1 bg-indigo-50 dark:bg-indigo-950 rounded-full">
                  {isFlipped ? '💡 Definición / Respuesta' : '❓ Concepto Clave'}
                </span>
                <p className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white leading-relaxed">
                  {isFlipped
                    ? flashcards[flashcardIndex]?.back
                    : flashcards[flashcardIndex]?.front}
                </p>
                <p className="text-xs text-slate-400 mt-6 flex items-center gap-1">
                  <RotateCcw className="w-3.5 h-3.5" /> Toca para voltear
                </p>
              </div>

              {/* Navigation controls */}
              <div className="flex justify-between items-center pt-2">
                <button
                  onClick={() => {
                    setIsFlipped(false);
                    setFlashcardIndex((prev) => Math.max(0, prev - 1));
                  }}
                  disabled={flashcardIndex === 0}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 disabled:opacity-30 text-xs font-semibold flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" /> Anterior
                </button>

                <button
                  onClick={() => setIsFlipped(!isFlipped)}
                  className="px-5 py-2.5 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-semibold text-xs"
                >
                  Girar Tarjeta
                </button>

                <button
                  onClick={() => {
                    setIsFlipped(false);
                    setFlashcardIndex((prev) => Math.min(flashcards.length - 1, prev + 1));
                  }}
                  disabled={flashcardIndex === flashcards.length - 1}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 disabled:opacity-30 text-xs font-semibold flex items-center gap-1.5"
                >
                  Siguiente <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer for Quiz mode */}
        {mode === 'quiz' && !isFinished && (
          <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/60 dark:bg-slate-900/60">
            <button
              onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
              disabled={currentIndex === 0}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 flex items-center gap-1"
            >
              <ArrowLeft className="w-4 h-4" /> Anterior
            </button>

            <button
              onClick={handleNext}
              disabled={!revealedAnswers[currentIndex]}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-indigo-500/20 transition-all"
            >
              <span>{currentIndex === questions.length - 1 ? 'Ver Resultados' : 'Siguiente'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
