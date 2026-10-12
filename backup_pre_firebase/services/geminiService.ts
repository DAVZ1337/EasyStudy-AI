import { getStoredApiKey } from '../utils/storage';

export interface FileAttachmentPayload {
  name: string;
  mimeType: string;
  data: string; // base64 without prefix data:...;base64,
}

export class GeminiApiError extends Error {
  code: string;
  activationUrl?: string;
  projectId?: string;

  constructor(message: string, code: string = 'GEMINI_ERROR', activationUrl?: string, projectId?: string) {
    super(message);
    this.name = 'GeminiApiError';
    this.code = code;
    this.activationUrl = activationUrl;
    this.projectId = projectId;
  }
}

function handleResponseError(data: any): never {
  if (data.error === 'NO_API_KEY') {
    throw new GeminiApiError(
      'Configura tu clave de API de Gemini en la pestaña Ajustes para poder usar la IA.',
      'NO_API_KEY'
    );
  }
  if (data.error === 'API_NOT_ENABLED') {
    throw new GeminiApiError(
      data.message || 'La API de Gemini (Generative Language API) no está activada en tu proyecto de Google Cloud.',
      'API_NOT_ENABLED',
      data.activationUrl,
      data.projectId
    );
  }
  if (data.error === 'INVALID_API_KEY') {
    throw new GeminiApiError(
      data.message || 'La clave de API de Gemini no es válida.',
      'INVALID_API_KEY'
    );
  }
  if (data.error === 'QUOTA_EXCEEDED') {
    throw new GeminiApiError(
      data.message || 'Límite de cuota alcanzado. Espera unos segundos e inténtalo de nuevo.',
      'QUOTA_EXCEEDED'
    );
  }
  throw new GeminiApiError(
    data.message || 'Error al comunicarse con la IA de Gemini.',
    data.error || 'GEMINI_ERROR'
  );
}

async function parseJsonResponse(res: Response): Promise<any> {
  const text = await res.text();
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    throw new GeminiApiError(
      `El servidor respondió con un error no estructurado (${res.status}).`,
      'SERVER_ERROR'
    );
  }

  if (!res.ok) {
    handleResponseError(data);
  }

  return data;
}

function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const key = getStoredApiKey();
  if (key) {
    headers['x-gemini-api-key'] = key;
  }
  return headers;
}

export async function askGeminiTutor(params: {
  message: string;
  history?: { role: 'user' | 'assistant'; content: string }[];
  context?: { subject?: string; topic?: string; text?: string };
  fileAttachment?: FileAttachmentPayload;
}): Promise<string> {
  const res = await fetch('/api/gemini/chat', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(params),
  });

  const data = await parseJsonResponse(res);
  return data.reply;
}

export async function generateGeminiSummary(params: {
  title: string;
  subject: string;
  content?: string;
  fileAttachment?: FileAttachmentPayload;
  summaryStyle?: string;
}): Promise<string> {
  const res = await fetch('/api/gemini/summarize', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(params),
  });

  const data = await parseJsonResponse(res);
  return data.summary;
}

export async function generateGeminiQuiz(params: {
  title: string;
  subject: string;
  content?: string;
  numQuestions?: number;
  difficulty?: string;
  fileAttachment?: FileAttachmentPayload;
}): Promise<{
  quizTitle: string;
  difficulty: string;
  questions: any[];
  flashcards: any[];
}> {
  const res = await fetch('/api/gemini/quiz', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(params),
  });

  const data = await parseJsonResponse(res);
  return data;
}

export async function explainFileWithGemini(params: {
  file: FileAttachmentPayload;
  question?: string;
}): Promise<string> {
  const res = await fetch('/api/gemini/explain-file', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(params),
  });

  const data = await parseJsonResponse(res);
  return data.explanation;
}

export async function checkBackendHealth(): Promise<{ status: string; hasEnvApiKey: boolean }> {
  try {
    const res = await fetch('/api/health');
    return await res.json();
  } catch {
    return { status: 'error', hasEnvApiKey: false };
  }
}
