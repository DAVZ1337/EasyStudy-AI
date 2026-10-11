export interface StudyFile {
  id: string;
  topicId: string;
  subjectId: string;
  name: string;
  size: number;
  mimeType: string;
  dataUrl?: string;
  extractedText?: string;
  uploadedAt: string;
}

export interface Summary {
  id: string;
  topicId: string;
  title: string;
  content: string; // Markdown
  createdAt: string;
}

export interface Question {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface Flashcard {
  front: string;
  back: string;
}

export interface QuizItem {
  id: string;
  topicId: string;
  quizTitle: string;
  difficulty: 'facil' | 'medio' | 'dificil' | string;
  questions: Question[];
  flashcards: Flashcard[];
  createdAt: string;
  bestScore?: {
    score: number;
    total: number;
    date: string;
  };
}

export interface Topic {
  id: string;
  subjectId: string;
  title: string;
  description?: string;
  notesText?: string;
  files: StudyFile[];
  summaries: Summary[];
  quizzes: QuizItem[];
  createdAt: string;
}

export interface Subject {
  id: string;
  name: string;
  code?: string;
  color: string; // hex or tailwind class
  icon: string;
  teacher?: string;
  classroom?: string;
  topics: Topic[];
}

export interface ScheduleSlot {
  id: string;
  dayOfWeek: number; // 1 (Mon) to 6 (Sat)
  startTime: string; // "08:30"
  endTime: string;   // "10:00"
  subjectId: string;
  room?: string;
  teacher?: string;
  note?: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // "YYYY-MM-DD"
  time?: string; // "10:00"
  subjectId?: string;
  topicId?: string;
  type: 'exam' | 'assignment' | 'homework' | 'reminder' | 'holiday';
  description?: string;
  completed: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  educationLevel: string;
  avatar: string; // emoji icon e.g. 🎒, 🎓, 🔬, 📚, 🎨, 🚀, 🦁, 🐬
  color: string;
  pin?: string; // Optional 4-digit PIN
  createdAt: string;
}

export interface AppSettings {
  theme: 'light' | 'dark';
  geminiApiKey: string;
  defaultDifficulty: 'facil' | 'medio' | 'dificil';
  studentName?: string;
  educationLevel?: string;
  activeProfileId?: string;
  isLocked?: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  attachedFileName?: string;
}
