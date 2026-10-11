import React, { useState, useRef } from 'react';
import {
  BookOpen,
  Folder,
  FolderOpen,
  Plus,
  FileText,
  Image as ImageIcon,
  FileUp,
  Sparkles,
  Brain,
  HelpCircle,
  Eye,
  Trash2,
  ChevronDown,
  ChevronRight,
  Search,
  UploadCloud,
  CheckCircle2,
  Copy,
  Clock,
  MessageSquare,
  AlertCircle,
  Loader2,
  Layers,
  Edit3,
  ExternalLink,
  X,
} from 'lucide-react';
import { Subject, Topic, StudyFile, Summary, QuizItem } from '../types';
import { processUploadedFile, formatFileSize, getFileCategory, extractBase64Data } from '../utils/fileHelpers';
import { generateGeminiSummary, generateGeminiQuiz } from '../services/geminiService';
import { deleteFileFromIndexedDB } from '../utils/storage';

interface SubjectsExplorerProps {
  subjects: Subject[];
  onUpdateSubjects: (subjects: Subject[]) => void;
  onOpenViewer: (file: StudyFile) => void;
  onLaunchQuiz: (quiz: QuizItem) => void;
  onOpenTutorWithContext: (subjectId: string, topicId: string) => void;
  initialSubjectId?: string;
  studentName?: string;
  educationLevel?: string;
}

export const SubjectsExplorer: React.FC<SubjectsExplorerProps> = ({
  subjects,
  onUpdateSubjects,
  onOpenViewer,
  onLaunchQuiz,
  onOpenTutorWithContext,
  initialSubjectId,
  studentName,
  educationLevel,
}) => {
  // Navigation & Selection states
  const [expandedSubjects, setExpandedSubjects] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    if (subjects.length > 0) {
      initial[subjects[0].id] = true; // expand first by default
    }
    if (initialSubjectId) {
      initial[initialSubjectId] = true;
    }
    return initial;
  });

  const [activeSubjectId, setActiveSubjectId] = useState<string>(
    initialSubjectId || subjects[0]?.id || ''
  );
  const [activeTopicId, setActiveTopicId] = useState<string>(() => {
    const sub = subjects.find((s) => s.id === (initialSubjectId || subjects[0]?.id));
    return sub?.topics[0]?.id || '';
  });

  const [activeTopicTab, setActiveTopicTab] = useState<'files' | 'notes' | 'summaries' | 'quizzes'>('files');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals state
  const [showAddSubjectModal, setShowAddSubjectModal] = useState<boolean>(false);
  const [showAddTopicModal, setShowAddTopicModal] = useState<boolean>(false);
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState<boolean>(false);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState<boolean>(false);
  const [aiError, setAiError] = useState<{ message: string; activationUrl?: string } | null>(null);

  // Edit & Delete Subject states
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [editSubName, setEditSubName] = useState<string>('');
  const [editSubCode, setEditSubCode] = useState<string>('');
  const [editSubColor, setEditSubColor] = useState<string>('#6366f1');
  const [editSubTeacher, setEditSubTeacher] = useState<string>('');
  const [editSubRoom, setEditSubRoom] = useState<string>('');
  const [subjectToDelete, setSubjectToDelete] = useState<Subject | null>(null);

  // Edit & Delete Topic states
  const [editingTopic, setEditingTopic] = useState<{ subjectId: string; topic: Topic } | null>(null);
  const [editTopicTitle, setEditTopicTitle] = useState<string>('');
  const [editTopicDesc, setEditTopicDesc] = useState<string>('');
  const [topicToDelete, setTopicToDelete] = useState<{ subjectId: string; topic: Topic } | null>(null);

  // New Subject form
  const [newSubName, setNewSubName] = useState<string>('');
  const [newSubCode, setNewSubCode] = useState<string>('');
  const [newSubColor, setNewSubColor] = useState<string>('#6366f1');
  const [newSubTeacher, setNewSubTeacher] = useState<string>('');
  const [newSubRoom, setNewSubRoom] = useState<string>('');

  // New Topic form
  const [newTopicTitle, setNewTopicTitle] = useState<string>('');
  const [newTopicDesc, setNewTopicDesc] = useState<string>('');

  // Upload modal state
  const [uploadTargetSub, setUploadTargetSub] = useState<string>(activeSubjectId);
  const [uploadTargetTopic, setUploadTargetTopic] = useState<string>(activeTopicId);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  // Summary generation options
  const [summaryStyle, setSummaryStyle] = useState<string>('Completo con puntos clave y preguntas');

  // Quiz generation options
  const [quizDifficulty, setQuizDifficulty] = useState<string>('medio');
  const [quizNumQuestions, setQuizNumQuestions] = useState<number>(5);

  const fileDropRef = useRef<HTMLInputElement>(null);

  const currentSubject = subjects.find((s) => s.id === activeSubjectId);
  const currentTopic = currentSubject?.topics.find((t) => t.id === activeTopicId);

  // Toggle subject accordion in sidebar
  const toggleSubjectExpand = (subId: string) => {
    setExpandedSubjects((prev) => ({
      ...prev,
      [subId]: !prev[subId],
    }));
  };

  // Select a subject
  const handleSelectSubject = (sub: Subject) => {
    setActiveSubjectId(sub.id);
    setExpandedSubjects((prev) => ({ ...prev, [sub.id]: true }));
    if (sub.topics.length > 0) {
      setActiveTopicId(sub.topics[0].id);
    } else {
      setActiveTopicId('');
    }
  };

  // Select a topic
  const handleSelectTopic = (subId: string, topicId: string) => {
    setActiveSubjectId(subId);
    setActiveTopicId(topicId);
  };

  // Create Subject
  const handleCreateSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubName.trim()) return;

    const newSub: Subject = {
      id: 'sub-' + Date.now(),
      name: newSubName.trim(),
      code: newSubCode.trim() || undefined,
      color: newSubColor,
      icon: 'book',
      teacher: newSubTeacher.trim() || undefined,
      classroom: newSubRoom.trim() || undefined,
      topics: [],
    };

    const updated = [...subjects, newSub];
    onUpdateSubjects(updated);
    setActiveSubjectId(newSub.id);
    setExpandedSubjects((prev) => ({ ...prev, [newSub.id]: true }));
    setShowAddSubjectModal(false);
    setNewSubName('');
    setNewSubCode('');
  };

  // Create Topic
  const handleCreateTopic = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTopicTitle.trim() || !activeSubjectId) return;

    const newTop: Topic = {
      id: 'top-' + Date.now(),
      subjectId: activeSubjectId,
      title: newTopicTitle.trim(),
      description: newTopicDesc.trim() || undefined,
      notesText: '',
      files: [],
      summaries: [],
      quizzes: [],
      createdAt: new Date().toISOString(),
    };

    const updated = subjects.map((s) => {
      if (s.id === activeSubjectId) {
        return { ...s, topics: [...s.topics, newTop] };
      }
      return s;
    });

    onUpdateSubjects(updated);
    setActiveTopicId(newTop.id);
    setShowAddTopicModal(false);
    setNewTopicTitle('');
    setNewTopicDesc('');
  };

  // Open Edit Subject
  const handleOpenEditSubject = (sub: Subject) => {
    setEditingSubject(sub);
    setEditSubName(sub.name);
    setEditSubCode(sub.code || '');
    setEditSubColor(sub.color || '#6366f1');
    setEditSubTeacher(sub.teacher || '');
    setEditSubRoom(sub.classroom || '');
  };

  // Save Edit Subject
  const handleSaveEditSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSubject || !editSubName.trim()) return;

    const updated = subjects.map((s) => {
      if (s.id === editingSubject.id) {
        return {
          ...s,
          name: editSubName.trim(),
          code: editSubCode.trim() || undefined,
          color: editSubColor,
          teacher: editSubTeacher.trim() || undefined,
          classroom: editSubRoom.trim() || undefined,
        };
      }
      return s;
    });

    onUpdateSubjects(updated);
    setEditingSubject(null);
  };

  // Confirm Delete Subject
  const handleConfirmDeleteSubject = async () => {
    if (!subjectToDelete) return;

    // Delete IndexedDB files for all topics in this subject
    for (const top of subjectToDelete.topics) {
      for (const file of top.files) {
        try {
          await deleteFileFromIndexedDB(file.id);
        } catch {
          // ignore error if file not found in db
        }
      }
    }

    const updated = subjects.filter((s) => s.id !== subjectToDelete.id);
    onUpdateSubjects(updated);

    if (activeSubjectId === subjectToDelete.id) {
      if (updated.length > 0) {
        setActiveSubjectId(updated[0].id);
        setActiveTopicId(updated[0].topics[0]?.id || '');
      } else {
        setActiveSubjectId('');
        setActiveTopicId('');
      }
    }

    setSubjectToDelete(null);
  };

  // Open Edit Topic
  const handleOpenEditTopic = (subjectId: string, topic: Topic) => {
    setEditingTopic({ subjectId, topic });
    setEditTopicTitle(topic.title);
    setEditTopicDesc(topic.description || '');
  };

  // Save Edit Topic
  const handleSaveEditTopic = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTopic || !editTopicTitle.trim()) return;

    const { subjectId, topic } = editingTopic;
    const updated = subjects.map((sub) => {
      if (sub.id === subjectId) {
        return {
          ...sub,
          topics: sub.topics.map((t) => {
            if (t.id === topic.id) {
              return {
                ...t,
                title: editTopicTitle.trim(),
                description: editTopicDesc.trim() || undefined,
              };
            }
            return t;
          }),
        };
      }
      return sub;
    });

    onUpdateSubjects(updated);
    setEditingTopic(null);
  };

  // Confirm Delete Topic
  const handleConfirmDeleteTopic = async () => {
    if (!topicToDelete) return;

    const { subjectId, topic } = topicToDelete;

    // Delete files from IndexedDB
    for (const file of topic.files) {
      try {
        await deleteFileFromIndexedDB(file.id);
      } catch {
        // ignore
      }
    }

    const updated = subjects.map((sub) => {
      if (sub.id === subjectId) {
        const remainingTopics = sub.topics.filter((t) => t.id !== topic.id);
        return {
          ...sub,
          topics: remainingTopics,
        };
      }
      return sub;
    });

    onUpdateSubjects(updated);

    if (activeTopicId === topic.id) {
      const parentSub = updated.find((s) => s.id === subjectId);
      setActiveTopicId(parentSub?.topics[0]?.id || '');
    }

    setTopicToDelete(null);
  };

  // Add quick recommended subject (great for Primary or quick setup)
  const handleAddQuickPrimarySubject = (name: string, color: string) => {
    const newSub: Subject = {
      id: 'sub-' + Date.now() + Math.random().toString(36).substring(2, 6),
      name,
      color,
      icon: 'book',
      topics: [
        {
          id: 'top-' + Date.now(),
          subjectId: '',
          title: 'Tema 1: Primeros Pasos',
          description: 'Conceptos iniciales y actividades',
          notesText: '',
          files: [],
          summaries: [],
          quizzes: [],
          createdAt: new Date().toISOString(),
        },
      ],
    };
    newSub.topics[0].subjectId = newSub.id;
    const updated = [...subjects, newSub];
    onUpdateSubjects(updated);
    setActiveSubjectId(newSub.id);
    setActiveTopicId(newSub.topics[0].id);
    setExpandedSubjects((prev) => ({ ...prev, [newSub.id]: true }));
  };

  // Direct file drop / upload into current topic
  const handleFilesChosen = async (fileList: FileList | null, targetSubId?: string, targetTopId?: string) => {
    if (!fileList || fileList.length === 0) return;

    const sId = targetSubId || activeSubjectId;
    const tId = targetTopId || activeTopicId;

    if (!sId || !tId) {
      alert('Por favor selecciona o crea una asignatura y tema para asignar los archivos.');
      return;
    }

    setIsUploading(true);
    try {
      const processedList: StudyFile[] = [];
      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        const studyFile = await processUploadedFile(file, sId, tId);
        processedList.push(studyFile);
      }

      // Update state
      const updated = subjects.map((sub) => {
        if (sub.id === sId) {
          return {
            ...sub,
            topics: sub.topics.map((top) => {
              if (top.id === tId) {
                return { ...top, files: [...top.files, ...processedList] };
              }
              return top;
            }),
          };
        }
        return sub;
      });

      onUpdateSubjects(updated);
      setShowUploadModal(false);
    } catch (err: any) {
      alert('Error al procesar el archivo: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  // Delete file
  const handleDeleteFile = async (fileId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este archivo?')) return;
    await deleteFileFromIndexedDB(fileId);

    const updated = subjects.map((sub) => {
      if (sub.id === activeSubjectId) {
        return {
          ...sub,
          topics: sub.topics.map((top) => {
            if (top.id === activeTopicId) {
              return { ...top, files: top.files.filter((f) => f.id !== fileId) };
            }
            return top;
          }),
        };
      }
      return sub;
    });

    onUpdateSubjects(updated);
  };

  // Update Notes
  const handleUpdateNotes = (text: string) => {
    const updated = subjects.map((sub) => {
      if (sub.id === activeSubjectId) {
        return {
          ...sub,
          topics: sub.topics.map((top) => {
            if (top.id === activeTopicId) {
              return { ...top, notesText: text };
            }
            return top;
          }),
        };
      }
      return sub;
    });

    onUpdateSubjects(updated);
  };

  // Generate Summary with Gemini
  const handleGenerateSummary = async (targetFile?: StudyFile) => {
    if (!currentTopic || !currentSubject) return;
    setIsGeneratingSummary(true);
    setAiError(null);

    try {
      let fileAttachmentPayload = undefined;
      if (targetFile?.dataUrl) {
        fileAttachmentPayload = {
          name: targetFile.name,
          mimeType: targetFile.mimeType,
          data: extractBase64Data(targetFile.dataUrl),
        };
      }

      const summaryText = await generateGeminiSummary({
        title: currentTopic.title,
        subject: currentSubject.name,
        content: currentTopic.notesText,
        fileAttachment: fileAttachmentPayload,
        summaryStyle,
      });

      const newSummary: Summary = {
        id: 'sum-' + Date.now(),
        topicId: currentTopic.id,
        title: targetFile ? `Resumen de: ${targetFile.name}` : `Resumen: ${currentTopic.title}`,
        content: summaryText,
        createdAt: new Date().toISOString(),
      };

      const updated = subjects.map((sub) => {
        if (sub.id === activeSubjectId) {
          return {
            ...sub,
            topics: sub.topics.map((top) => {
              if (top.id === activeTopicId) {
                return { ...top, summaries: [newSummary, ...top.summaries] };
              }
              return top;
            }),
          };
        }
        return sub;
      });

      onUpdateSubjects(updated);
      setActiveTopicTab('summaries');
    } catch (err: any) {
      setAiError({
        message: err.message || 'Error al generar el resumen.',
        activationUrl: err.activationUrl,
      });
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  // Generate Quiz with Gemini
  const handleGenerateQuiz = async (targetFile?: StudyFile) => {
    if (!currentTopic || !currentSubject) return;
    setIsGeneratingQuiz(true);
    setAiError(null);

    try {
      let fileAttachmentPayload = undefined;
      if (targetFile?.dataUrl) {
        fileAttachmentPayload = {
          name: targetFile.name,
          mimeType: targetFile.mimeType,
          data: extractBase64Data(targetFile.dataUrl),
        };
      }

      const quizData = await generateGeminiQuiz({
        title: currentTopic.title,
        subject: currentSubject.name,
        content: currentTopic.notesText,
        numQuestions: quizNumQuestions,
        difficulty: quizDifficulty,
        fileAttachment: fileAttachmentPayload,
      });

      const newQuiz: QuizItem = {
        id: 'quiz-' + Date.now(),
        topicId: currentTopic.id,
        quizTitle: quizData.quizTitle || `Test: ${currentTopic.title}`,
        difficulty: quizDifficulty,
        questions: quizData.questions || [],
        flashcards: quizData.flashcards || [],
        createdAt: new Date().toISOString(),
      };

      const updated = subjects.map((sub) => {
        if (sub.id === activeSubjectId) {
          return {
            ...sub,
            topics: sub.topics.map((top) => {
              if (top.id === activeTopicId) {
                return { ...top, quizzes: [newQuiz, ...top.quizzes] };
              }
              return top;
            }),
          };
        }
        return sub;
      });

      onUpdateSubjects(updated);
      setActiveTopicTab('quizzes');
    } catch (err: any) {
      setAiError({
        message: err.message || 'Error al generar el cuestionario con Gemini.',
        activationUrl: err.activationUrl,
      });
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  // Filter subjects / topics if search query
  const filteredSubjects = subjects.filter((s) => {
    if (!searchQuery) return true;
    const matchSub = s.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchTop = s.topics.some((t) =>
      t.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return matchSub || matchTop;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 animate-in fade-in duration-200">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[calc(100vh-8rem)]">
        {/* ============================================================== */}
        {/* LEFT SIDEBAR: ASIGNATURAS Y TEMAS DESPLEGABLES                 */}
        {/* ============================================================== */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xs flex flex-col space-y-4">
          {/* Header & New Subject Action */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h2 className="font-bold text-slate-900 dark:text-white text-base">
                {studentName ? `Asignaturas de ${studentName}` : 'Mis Asignaturas'}
              </h2>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  setUploadTargetSub(activeSubjectId);
                  setUploadTargetTopic(activeTopicId);
                  setShowUploadModal(true);
                }}
                className="p-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 transition-colors"
                title="Importar archivos (PDF, fotos, txt)"
              >
                <FileUp className="w-4 h-4" />
              </button>

              <button
                onClick={() => setShowAddSubjectModal(true)}
                className="p-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs transition-colors"
                title="Nueva Asignatura"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar materia o tema..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Subjects Accordion List */}
          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
            {filteredSubjects.map((subject) => {
              const isExpanded = Boolean(expandedSubjects[subject.id]);
              const isSelectedSubject = subject.id === activeSubjectId;
              const totalFiles = subject.topics.reduce((acc, t) => acc + t.files.length, 0);

              return (
                <div
                  key={subject.id}
                  className={`rounded-2xl border transition-all overflow-hidden ${
                    isSelectedSubject
                      ? 'border-indigo-300 dark:border-indigo-800 bg-slate-50/50 dark:bg-slate-900/40'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                  }`}
                >
                  {/* Subject Item Header */}
                  <div
                    onClick={() => handleSelectSubject(subject)}
                    className="p-3 flex items-center justify-between cursor-pointer hover:bg-slate-100/50 dark:hover:bg-slate-800/40 transition-colors group"
                  >
                    <div className="flex items-center gap-2.5 truncate min-w-0 flex-1">
                      <span
                        className="w-3.5 h-3.5 rounded-full shrink-0"
                        style={{ backgroundColor: subject.color || '#6366f1' }}
                      />
                      <div className="truncate">
                        <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                          {subject.name}
                        </h4>
                        <p className="text-[11px] text-slate-400">
                          {subject.topics.length} temas • {totalFiles} archivos
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 ml-1.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEditSubject(subject);
                        }}
                        className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 transition-colors"
                        title={`Editar o renombrar ${subject.name}`}
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSubjectToDelete(subject);
                        }}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-colors"
                        title={`Eliminar ${subject.name}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSubjectExpand(subject.id);
                        }}
                        className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                        title={isExpanded ? 'Contraer temas' : 'Desplegar temas'}
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Topics List ("abriendo la pestaña salgan tambien los temas de las asignaturas") */}
                  {isExpanded && (
                    <div className="px-3 pb-3 pt-1 space-y-1.5 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/80 dark:bg-slate-950/40">
                      {subject.topics.map((topic) => {
                        const isSelectedTopic =
                          topic.id === activeTopicId && subject.id === activeSubjectId;

                        return (
                          <div
                            key={topic.id}
                            onClick={() => handleSelectTopic(subject.id, topic.id)}
                            className={`p-2.5 rounded-xl text-xs flex items-center justify-between cursor-pointer transition-all group/topic ${
                              isSelectedTopic
                                ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                                : 'text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800'
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate min-w-0 flex-1">
                              <Folder
                                className={`w-3.5 h-3.5 shrink-0 ${
                                  isSelectedTopic ? 'text-white' : 'text-indigo-500'
                                }`}
                              />
                              <span className="truncate">{topic.title}</span>
                            </div>

                            <div className="flex items-center gap-1 text-[10px] shrink-0 ml-1.5">
                              {/* Quick Edit Topic */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenEditTopic(subject.id, topic);
                                }}
                                className={`p-1 rounded-md transition-colors ${
                                  isSelectedTopic
                                    ? 'text-indigo-200 hover:text-white hover:bg-indigo-700'
                                    : 'text-slate-400 hover:text-indigo-600 hover:bg-slate-200 dark:hover:bg-slate-700'
                                }`}
                                title="Editar o renombrar tema"
                              >
                                <Edit3 className="w-3 h-3" />
                              </button>

                              {/* Quick Delete Topic */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setTopicToDelete({ subjectId: subject.id, topic });
                                }}
                                className={`p-1 rounded-md transition-colors ${
                                  isSelectedTopic
                                    ? 'text-indigo-200 hover:text-rose-200 hover:bg-rose-700'
                                    : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60'
                                }`}
                                title="Eliminar tema"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>

                              {topic.files.length > 0 && (
                                <span
                                  className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono ${
                                    isSelectedTopic
                                      ? 'bg-indigo-700 text-white'
                                      : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                                  }`}
                                >
                                  {topic.files.length} doc
                                </span>
                              )}
                              {topic.quizzes.length > 0 && (
                                <span
                                  className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono ${
                                    isSelectedTopic
                                      ? 'bg-indigo-700 text-white'
                                      : 'bg-purple-100 dark:bg-purple-950 text-purple-600'
                                  }`}
                                >
                                  {topic.quizzes.length} quiz
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}

                      {/* Add Topic button inside subject */}
                      <button
                        onClick={() => {
                          setActiveSubjectId(subject.id);
                          setShowAddTopicModal(true);
                        }}
                        className="w-full py-2 px-3 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-xl flex items-center justify-center gap-1.5 transition-colors border border-dashed border-indigo-200 dark:border-indigo-900 mt-2"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Añadir Tema a {subject.name}</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {filteredSubjects.length === 0 && (
              <div className="text-center py-6 px-4 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl space-y-2.5">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {subjects.length === 0
                    ? 'Aún no tienes asignaturas'
                    : 'No se encontraron resultados'}
                </p>
                <p className="text-[11px] text-slate-400">
                  {subjects.length === 0
                    ? 'Crea tu primera asignatura para ir añadiendo temas poco a poco.'
                    : 'Prueba con otro término de búsqueda.'}
                </p>
                {subjects.length === 0 && (
                  <button
                    onClick={() => setShowAddSubjectModal(true)}
                    className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
                  >
                    + Crear Asignatura
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ============================================================== */}
        {/* MAIN TOPIC WORKSPACE PANEL                                     */}
        {/* ============================================================== */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col space-y-6">
          {currentTopic && currentSubject ? (
            <>
              {/* Workspace Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="space-y-1">
                  {/* Subject meta row with edit & delete subject */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className="px-2.5 py-0.5 rounded-full text-xs font-bold text-white shadow-2xs"
                      style={{ backgroundColor: currentSubject.color || '#6366f1' }}
                    >
                      {currentSubject.name}
                    </span>
                    {currentSubject.classroom && (
                      <span className="text-[11px] text-slate-400">
                        {currentSubject.classroom}
                      </span>
                    )}

                    <div className="flex items-center gap-1 ml-1 text-slate-400">
                      <button
                        onClick={() => handleOpenEditSubject(currentSubject)}
                        className="px-2 py-0.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 text-[11px] font-medium flex items-center gap-1 transition-colors"
                        title="Editar o renombrar asignatura"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Editar Asignatura</span>
                      </button>
                      <button
                        onClick={() => setSubjectToDelete(currentSubject)}
                        className="px-2 py-0.5 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/60 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 text-[11px] font-medium flex items-center gap-1 transition-colors"
                        title="Eliminar asignatura"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Eliminar</span>
                      </button>
                    </div>
                  </div>

                  {/* Topic title with edit & delete topic */}
                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                      {currentTopic.title}
                    </h2>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleOpenEditTopic(currentSubject.id, currentTopic)}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 bg-white dark:bg-slate-900 text-xs font-semibold flex items-center gap-1 transition-colors shadow-2xs"
                        title="Renombrar o editar tema"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Renombrar Tema</span>
                      </button>

                      <button
                        onClick={() => setTopicToDelete({ subjectId: currentSubject.id, topic: currentTopic })}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-rose-400 dark:hover:border-rose-600 text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 bg-white dark:bg-slate-900 text-xs font-semibold flex items-center gap-1 transition-colors shadow-2xs"
                        title="Eliminar tema"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Eliminar Tema</span>
                      </button>
                    </div>
                  </div>

                  {currentTopic.description && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {currentTopic.description}
                    </p>
                  )}
                </div>

                {/* Quick AI Tutor Launcher Button */}
                <button
                  onClick={() => onOpenTutorWithContext(currentSubject.id, currentTopic.id)}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-purple-500/20 flex items-center gap-2 self-start sm:self-auto transition-all shrink-0"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Preguntar Dudas con IA</span>
                </button>
              </div>

              {/* Navigation Tabs inside the Topic */}
              <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto pb-1">
                <button
                  onClick={() => setActiveTopicTab('files')}
                  className={`px-3.5 py-2 text-xs font-semibold rounded-xl flex items-center gap-2 transition-all whitespace-nowrap ${
                    activeTopicTab === 'files'
                      ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <FolderOpen className="w-4 h-4" />
                  <span>Archivos & Documentos ({currentTopic.files.length})</span>
                </button>

                <button
                  onClick={() => setActiveTopicTab('notes')}
                  className={`px-3.5 py-2 text-xs font-semibold rounded-xl flex items-center gap-2 transition-all whitespace-nowrap ${
                    activeTopicTab === 'notes'
                      ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <Edit3 className="w-4 h-4" />
                  <span>Apuntes del Tema</span>
                </button>

                <button
                  onClick={() => setActiveTopicTab('summaries')}
                  className={`px-3.5 py-2 text-xs font-semibold rounded-xl flex items-center gap-2 transition-all whitespace-nowrap ${
                    activeTopicTab === 'summaries'
                      ? 'bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <Brain className="w-4 h-4 text-purple-500" />
                  <span>Resúmenes con IA ({currentTopic.summaries.length})</span>
                </button>

                <button
                  onClick={() => setActiveTopicTab('quizzes')}
                  className={`px-3.5 py-2 text-xs font-semibold rounded-xl flex items-center gap-2 transition-all whitespace-nowrap ${
                    activeTopicTab === 'quizzes'
                      ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <HelpCircle className="w-4 h-4 text-emerald-500" />
                  <span>Quizzes & Flashcards ({currentTopic.quizzes.length})</span>
                </button>
              </div>

              {/* Error banner if any */}
              {aiError && (
                <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-2xl text-xs text-rose-800 dark:text-rose-200 space-y-2 animate-in fade-in">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
                    <div className="flex-1 space-y-1">
                      <p className="font-bold text-sm">Aviso de la IA</p>
                      <p className="leading-relaxed">{aiError.message}</p>
                      {aiError.activationUrl && (
                        <div className="pt-2 flex flex-wrap gap-2">
                          <a
                            href={aiError.activationUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Habilitar Gemini en Google Cloud (1 clic)</span>
                          </a>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => setAiError(null)}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 1: FILES & MATERIALS */}
              {activeTopicTab === 'files' && (
                <div className="space-y-4 flex-1">
                  {/* Dropzone Upload */}
                  <div
                    onClick={() => fileDropRef.current?.click()}
                    className="border-2 border-dashed border-indigo-200 dark:border-indigo-900/70 hover:border-indigo-400 dark:hover:border-indigo-600 rounded-2xl p-6 text-center cursor-pointer bg-indigo-50/20 dark:bg-indigo-950/10 hover:bg-indigo-50/40 transition-all flex flex-col items-center justify-center space-y-2"
                  >
                    <input
                      type="file"
                      ref={fileDropRef}
                      onChange={(e) => handleFilesChosen(e.target.files)}
                      multiple
                      accept=".pdf,image/*,.txt,.md"
                      className="hidden"
                    />
                    <div className="p-3 rounded-2xl bg-indigo-100 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400">
                      <UploadCloud className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-white">
                        {isUploading
                          ? 'Procesando archivos...'
                          : 'Haz click o arrastra archivos aquí para importar'}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Soporta <strong>PDFs</strong>, <strong>imágenes de apuntes/pizarra</strong>, y archivos <strong>.txt / .md</strong>
                      </p>
                    </div>
                  </div>

                  {/* Files List / Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    {currentTopic.files.map((file) => {
                      const category = getFileCategory(file.mimeType, file.name);

                      return (
                        <div
                          key={file.id}
                          className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all flex flex-col justify-between shadow-2xs space-y-3"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-3 truncate">
                              <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 shrink-0">
                                {category === 'image' ? (
                                  <ImageIcon className="w-5 h-5 text-indigo-500" />
                                ) : (
                                  <FileText className="w-5 h-5 text-indigo-500" />
                                )}
                              </div>
                              <div className="truncate">
                                <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate">
                                  {file.name}
                                </h4>
                                <p className="text-[10px] text-slate-400">
                                  {formatFileSize(file.size)} •{' '}
                                  {new Date(file.uploadedAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>

                            <button
                              onClick={() => handleDeleteFile(file.id)}
                              className="text-slate-400 hover:text-rose-500 p-1"
                              title="Eliminar archivo"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Quick Actions */}
                          <div className="flex items-center gap-1.5 pt-1">
                            <button
                              onClick={() => onOpenViewer(file)}
                              className="flex-1 py-1.5 px-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors"
                            >
                              <Eye className="w-3 h-3" /> Ver
                            </button>

                            <button
                              onClick={() => onOpenViewer(file)}
                              className="flex-1 py-1.5 px-2 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors"
                            >
                              <Sparkles className="w-3 h-3" /> Explicar IA
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {currentTopic.files.length === 0 && (
                    <div className="text-center py-8 text-slate-400 text-xs">
                      No hay archivos importados en este tema todavía. ¡Arrastra tu primer PDF o foto arriba!
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: NOTES & SUMMARY */}
              {activeTopicTab === 'notes' && (
                <div className="space-y-4 flex-1 flex flex-col">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">
                      Tus notas personales de clase (se guardan automáticamente en tu dispositivo):
                    </span>
                    <button
                      onClick={() => handleGenerateSummary()}
                      disabled={isGeneratingSummary}
                      className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
                    >
                      {isGeneratingSummary ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Brain className="w-3.5 h-3.5" />
                      )}
                      <span>Generar Resumen con IA</span>
                    </button>
                  </div>

                  <textarea
                    value={currentTopic.notesText || ''}
                    onChange={(e) => handleUpdateNotes(e.target.value)}
                    placeholder="Escribe aquí los apuntes del profesor, conceptos importantes, fórmulas..."
                    rows={14}
                    className="w-full flex-1 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 text-slate-900 dark:text-white text-xs sm:text-sm font-mono leading-relaxed focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              )}

              {/* TAB 3: SUMMARIES */}
              {activeTopicTab === 'summaries' && (
                <div className="space-y-5 flex-1">
                  <div className="p-4 rounded-2xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <h4 className="font-bold text-xs sm:text-sm text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-purple-600" />
                        Generador Automático de Resúmenes Académicos
                      </h4>
                      <p className="text-[11px] text-purple-700 dark:text-purple-300 mt-0.5">
                        Gemini sintetiza tus apuntes y archivos con objetivos, conceptos clave y trampas de examen.
                      </p>
                    </div>

                    <button
                      onClick={() => handleGenerateSummary()}
                      disabled={isGeneratingSummary}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-xs flex items-center gap-1.5 shrink-0 transition-colors"
                    >
                      {isGeneratingSummary ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Brain className="w-3.5 h-3.5" />
                      )}
                      <span>{isGeneratingSummary ? 'Sintetizando...' : 'Generar Resumen'}</span>
                    </button>
                  </div>

                  <div className="space-y-4">
                    {currentTopic.summaries.map((summary) => (
                      <div
                        key={summary.id}
                        className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-3"
                      >
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                          <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                            {summary.title}
                          </h4>
                          <span className="text-[10px] text-slate-400">
                            {new Date(summary.createdAt).toLocaleDateString()}
                          </span>
                        </div>

                        <div className="prose prose-xs sm:prose-sm dark:prose-invert max-w-none text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                          {summary.content}
                        </div>
                      </div>
                    ))}

                    {currentTopic.summaries.length === 0 && (
                      <div className="text-center py-10 text-slate-400 text-xs">
                        Aún no hay resúmenes generados. Pulsa en "Generar Resumen" arriba para que Gemini 3.8 Flash sintetice este tema.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: QUIZZES & FLASHCARDS */}
              {activeTopicTab === 'quizzes' && (
                <div className="space-y-5 flex-1">
                  <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <h4 className="font-bold text-xs sm:text-sm text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                        <HelpCircle className="w-4 h-4 text-emerald-600" />
                        Cuestionarios Tipo Test y Flashcards
                      </h4>
                      <p className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-0.5">
                        Prueba tus conocimientos con preguntas interactivas y tarjetas nemotécnicas de memoria.
                      </p>
                    </div>

                    <button
                      onClick={() => handleGenerateQuiz()}
                      disabled={isGeneratingQuiz}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-xs flex items-center gap-1.5 shrink-0 transition-colors"
                    >
                      {isGeneratingQuiz ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5" />
                      )}
                      <span>{isGeneratingQuiz ? 'Creando preguntas...' : 'Crear Quiz con IA'}</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {currentTopic.quizzes.map((quiz) => (
                      <div
                        key={quiz.id}
                        className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs flex flex-col justify-between space-y-4"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-full">
                              {quiz.difficulty}
                            </span>
                            {quiz.bestScore && (
                              <span className="text-[10px] font-semibold text-slate-500">
                                Mejor nota: {quiz.bestScore.score}/{quiz.bestScore.total}
                              </span>
                            )}
                          </div>
                          <h4 className="font-bold text-sm text-slate-900 dark:text-white mt-1">
                            {quiz.quizTitle}
                          </h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            {quiz.questions.length} preguntas de test • {quiz.flashcards.length} flashcards
                          </p>
                        </div>

                        <div className="flex items-center gap-2 pt-2">
                          <button
                            onClick={() => onLaunchQuiz(quiz)}
                            className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-colors"
                          >
                            <HelpCircle className="w-3.5 h-3.5" />
                            <span>Hacer Test</span>
                          </button>
                          {quiz.flashcards.length > 0 && (
                            <button
                              onClick={() => onLaunchQuiz(quiz)}
                              className="py-2 px-3 bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-semibold text-xs rounded-xl hover:bg-purple-100 transition-colors flex items-center gap-1"
                            >
                              <Layers className="w-3.5 h-3.5" />
                              <span>Tarjetas</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {currentTopic.quizzes.length === 0 && (
                    <div className="text-center py-10 text-slate-400 text-xs">
                      No hay cuestionarios todavía. Pulsa en "Crear Quiz con IA" para que Gemini genere preguntas interactivas.
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 sm:p-10 space-y-5">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 border border-indigo-200 dark:border-indigo-900 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-xs">
                <BookOpen className="w-8 h-8" />
              </div>

              {subjects.length === 0 ? (
                /* Caso 1: Cero asignaturas */
                <div className="max-w-md space-y-3">
                  <h3 className="font-extrabold text-lg sm:text-xl text-slate-900 dark:text-white">
                    {studentName ? `¡Hola ${studentName}, tu espacio está listo!` : '¡Tu espacio de estudio está listo!'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Comienza creando tus asignaturas o materias. Podrás ir añadiendo los temas que estés dando en clase e importar tus fotos de apuntes, resúmenes y hacer tests interactivos.
                  </p>

                  {/* Sugerencias rápidas para Primaria y estudiantes */}
                  <div className="pt-2 text-left bg-slate-50 dark:bg-slate-950/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                    <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <span>{educationLevel?.includes('Primaria') ? '🎒 Asignaturas habituales de Primaria (1 clic):' : '⚡ Añadir con 1 clic para empezar:'}</span>
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        onClick={() => handleAddQuickPrimarySubject('Matemáticas', '#3b82f6')}
                        className="px-2.5 py-1 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900 text-xs font-semibold hover:bg-blue-100 transition-colors"
                      >
                        + 🎒 Matemáticas
                      </button>
                      <button
                        onClick={() => handleAddQuickPrimarySubject('Lengua Castellana', '#f59e0b')}
                        className="px-2.5 py-1 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900 text-xs font-semibold hover:bg-amber-100 transition-colors"
                      >
                        + 📖 Lengua Castellana
                      </button>
                      <button
                        onClick={() => handleAddQuickPrimarySubject('Ciencias de la Naturaleza', '#10b981')}
                        className="px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900 text-xs font-semibold hover:bg-emerald-100 transition-colors"
                      >
                        + 🌿 Ciencias Naturales
                      </button>
                      <button
                        onClick={() => handleAddQuickPrimarySubject('Ciencias Sociales', '#8b5cf6')}
                        className="px-2.5 py-1 rounded-xl bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-900 text-xs font-semibold hover:bg-purple-100 transition-colors"
                      >
                        + 🌍 Ciencias Sociales
                      </button>
                      <button
                        onClick={() => handleAddQuickPrimarySubject('Inglés', '#6366f1')}
                        className="px-2.5 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900 text-xs font-semibold hover:bg-indigo-100 transition-colors"
                      >
                        + 🇬🇧 Inglés
                      </button>
                      <button
                        onClick={() => handleAddQuickPrimarySubject('Educación Artística', '#ec4899')}
                        className="px-2.5 py-1 rounded-xl bg-pink-50 dark:bg-pink-950 text-pink-700 dark:text-pink-300 border border-pink-200 dark:border-pink-900 text-xs font-semibold hover:bg-pink-100 transition-colors"
                      >
                        + 🎨 Educación Artística
                      </button>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={() => setShowAddSubjectModal(true)}
                      className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition-all flex items-center gap-2 mx-auto"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Crear Asignatura Personalizada</span>
                    </button>
                  </div>
                </div>
              ) : currentSubject && currentSubject.topics.length === 0 ? (
                /* Caso 2: Asignatura seleccionada pero sin temas */
                <div className="max-w-md space-y-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold text-white shadow-2xs" style={{ backgroundColor: currentSubject.color || '#6366f1' }}>
                    <span>{currentSubject.name}</span>
                  </div>
                  <h3 className="font-extrabold text-lg sm:text-xl text-slate-900 dark:text-white">
                    Esta asignatura aún no tiene temas
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Crea tu primer tema para {currentSubject.name} (por ejemplo: "Tema 1: Conceptos básicos") para empezar a tomar notas, subir archivos y hacer resúmenes con IA.
                  </p>

                  <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
                    <button
                      onClick={() => {
                        setActiveSubjectId(currentSubject.id);
                        setShowAddTopicModal(true);
                      }}
                      className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition-all flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Añadir Primer Tema</span>
                    </button>

                    <button
                      onClick={() => handleOpenEditSubject(currentSubject)}
                      className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-400 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors flex items-center gap-1.5"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Editar Asignatura</span>
                    </button>

                    <button
                      onClick={() => setSubjectToDelete(currentSubject)}
                      className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-rose-400 text-slate-600 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 text-xs font-semibold transition-colors flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Eliminar Asignatura</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Caso 3: Asignatura con temas pero ninguno seleccionado */
                <div className="max-w-md space-y-3">
                  <h3 className="font-extrabold text-lg sm:text-xl text-slate-900 dark:text-white">
                    Selecciona o añade un tema para empezar
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Haz clic en cualquier tema de la barra lateral izquierda o añade uno nuevo a {currentSubject?.name || 'tus asignaturas'}.
                  </p>

                  <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
                    {currentSubject && (
                      <button
                        onClick={() => {
                          setActiveSubjectId(currentSubject.id);
                          setShowAddTopicModal(true);
                        }}
                        className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition-all flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Añadir Tema a {currentSubject.name}</span>
                      </button>
                    )}

                    {currentSubject && (
                      <button
                        onClick={() => handleOpenEditSubject(currentSubject)}
                        className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-400 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors flex items-center gap-1.5"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Editar Asignatura</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* MODAL: Nueva Asignatura */}
      {showAddSubjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              Crear Nueva Asignatura
            </h3>

            <form onSubmit={handleCreateSubject} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Nombre de la Asignatura:
                </label>
                <input
                  type="text"
                  value={newSubName}
                  onChange={(e) => setNewSubName(e.target.value)}
                  placeholder="Ej: Química Orgánica, Literatura Universal"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Código (opcional):
                  </label>
                  <input
                    type="text"
                    value={newSubCode}
                    onChange={(e) => setNewSubCode(e.target.value)}
                    placeholder="Ej: QUI-101"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Color:
                  </label>
                  <input
                    type="color"
                    value={newSubColor}
                    onChange={(e) => setNewSubColor(e.target.value)}
                    className="w-full h-10 p-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 cursor-pointer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Profesor:
                  </label>
                  <input
                    type="text"
                    value={newSubTeacher}
                    onChange={(e) => setNewSubTeacher(e.target.value)}
                    placeholder="Ej: Dr. Pérez"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Aula:
                  </label>
                  <input
                    type="text"
                    value={newSubRoom}
                    onChange={(e) => setNewSubRoom(e.target.value)}
                    placeholder="Ej: Aula 102"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddSubjectModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs"
                >
                  Crear Asignatura
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Nuevo Tema */}
      {showAddTopicModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              Añadir Nuevo Tema a {currentSubject?.name}
            </h3>

            <form onSubmit={handleCreateTopic} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Título del Tema:
                </label>
                <input
                  type="text"
                  value={newTopicTitle}
                  onChange={(e) => setNewTopicTitle(e.target.value)}
                  placeholder="Ej: Tema 3: Reacciones Redox y Equilibrio"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Descripción o Temario breve:
                </label>
                <input
                  type="text"
                  value={newTopicDesc}
                  onChange={(e) => setNewTopicDesc(e.target.value)}
                  placeholder="Ej: Ajuste por método ion-electrón, pilas galvánicas..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddTopicModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs"
                >
                  Añadir Tema
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Importar / Subir Archivos a Tema */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              Importar Archivos de Estudio
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Asignatura destino:
                </label>
                <select
                  value={uploadTargetSub}
                  onChange={(e) => {
                    setUploadTargetSub(e.target.value);
                    const sub = subjects.find((s) => s.id === e.target.value);
                    if (sub?.topics.length) setUploadTargetTopic(sub.topics[0].id);
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white"
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Tema destino:
                </label>
                <select
                  value={uploadTargetTopic}
                  onChange={(e) => setUploadTargetTopic(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white"
                >
                  {subjects
                    .find((s) => s.id === uploadTargetSub)
                    ?.topics.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Seleccionar archivos (PDFs, imágenes de apuntes, textos):
                </label>
                <input
                  type="file"
                  multiple
                  accept=".pdf,image/*,.txt,.md"
                  onChange={(e) => handleFilesChosen(e.target.files, uploadTargetSub, uploadTargetTopic)}
                  className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Editar / Renombrar Asignatura */}
      {editingSubject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span
                  className="w-4 h-4 rounded-full shrink-0"
                  style={{ backgroundColor: editSubColor }}
                />
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  Editar / Renombrar Asignatura
                </h3>
              </div>
              <button
                onClick={() => setEditingSubject(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditSubject} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Nombre de la Asignatura:
                </label>
                <input
                  type="text"
                  value={editSubName}
                  onChange={(e) => setEditSubName(e.target.value)}
                  placeholder="Ej: Matemáticas, Lengua, Física..."
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  required
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Código (opcional):
                  </label>
                  <input
                    type="text"
                    value={editSubCode}
                    onChange={(e) => setEditSubCode(e.target.value)}
                    placeholder="Ej: MAT-01"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Color identificativo:
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={editSubColor}
                      onChange={(e) => setEditSubColor(e.target.value)}
                      className="w-12 h-9 p-0.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 cursor-pointer shrink-0"
                    />
                    <div className="flex gap-1 flex-wrap">
                      {['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'].map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setEditSubColor(c)}
                          className="w-5 h-5 rounded-full border border-white dark:border-slate-800 shadow-2xs hover:scale-110 transition-transform"
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Profesor / Maestro:
                  </label>
                  <input
                    type="text"
                    value={editSubTeacher}
                    onChange={(e) => setEditSubTeacher(e.target.value)}
                    placeholder="Ej: Dña. Carmen"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Aula / Clase:
                  </label>
                  <input
                    type="text"
                    value={editSubRoom}
                    onChange={(e) => setEditSubRoom(e.target.value)}
                    placeholder="Ej: Aula 3B"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    const toDel = editingSubject;
                    setEditingSubject(null);
                    setSubjectToDelete(toDel);
                  }}
                  className="px-3 py-2 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl transition-colors flex items-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Eliminar Asignatura</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingSubject(null)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-xs transition-colors"
                  >
                    Guardar Cambios
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Confirmar Eliminar Asignatura */}
      {subjectToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="font-extrabold text-slate-900 dark:text-white text-lg">
                ¿Eliminar {subjectToDelete.name}?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Esta acción eliminará la asignatura y sus{' '}
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {subjectToDelete.topics.length} temas
                </span>
                , junto con sus apuntes, archivos guardados y cuestionarios. Esta acción no se puede deshacer.
              </p>
            </div>

            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setSubjectToDelete(null)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteSubject}
                className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Sí, Eliminar Asignatura</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Editar / Renombrar Tema */}
      {editingTopic && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Folder className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  Editar / Renombrar Tema
                </h3>
              </div>
              <button
                onClick={() => setEditingTopic(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditTopic} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Título del Tema:
                </label>
                <input
                  type="text"
                  value={editTopicTitle}
                  onChange={(e) => setEditTopicTitle(e.target.value)}
                  placeholder="Ej: Tema 2: Fracciones y Decimales"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Descripción o Temario breve (opcional):
                </label>
                <textarea
                  value={editTopicDesc}
                  onChange={(e) => setEditTopicDesc(e.target.value)}
                  placeholder="Ej: Suma y resta de fracciones, denominador común, ejercicios de clase..."
                  rows={3}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    const toDel = editingTopic;
                    setEditingTopic(null);
                    setTopicToDelete(toDel);
                  }}
                  className="px-3 py-2 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl transition-colors flex items-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Eliminar Tema</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingTopic(null)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-xs transition-colors"
                  >
                    Guardar Cambios
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Confirmar Eliminar Tema */}
      {topicToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="font-extrabold text-slate-900 dark:text-white text-lg">
                ¿Eliminar {topicToDelete.topic.title}?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Esta acción eliminará el tema junto con sus apuntes, resúmenes con IA y quizzes generados. Esta acción no se puede deshacer.
              </p>
            </div>

            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setTopicToDelete(null)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteTopic}
                className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Sí, Eliminar Tema</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
