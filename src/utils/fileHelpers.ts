import { StudyFile } from '../types';
import { saveFileToIndexedDB } from './storage';

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function getFileCategory(mimeType: string, name: string): 'pdf' | 'image' | 'text' | 'other' {
  if (mimeType.includes('pdf') || name.toLowerCase().endsWith('.pdf')) return 'pdf';
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('text/') || name.endsWith('.txt') || name.endsWith('.md')) return 'text';
  return 'other';
}

export function extractBase64Data(dataUrl: string): string {
  const commaIndex = dataUrl.indexOf(',');
  if (commaIndex !== -1) {
    return dataUrl.slice(commaIndex + 1);
  }
  return dataUrl;
}

export async function processUploadedFile(
  file: File,
  subjectId: string,
  topicId: string
): Promise<StudyFile> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async () => {
      const dataUrl = reader.result as string;
      let extractedText: string | undefined = undefined;

      // If it's a text file, read text directly
      if (file.type.startsWith('text/') || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
        try {
          const textReader = new FileReader();
          textReader.onload = async () => {
            extractedText = textReader.result as string;
            const studyFile: StudyFile = {
              id: 'file-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
              topicId,
              subjectId,
              name: file.name,
              size: file.size,
              mimeType: file.type || 'text/plain',
              dataUrl,
              extractedText,
              uploadedAt: new Date().toISOString(),
            };
            await saveFileToIndexedDB(studyFile);
            resolve(studyFile);
          };
          textReader.readAsText(file);
          return;
        } catch (e) {
          console.warn('Could not read as plain text:', e);
        }
      }

      const studyFile: StudyFile = {
        id: 'file-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
        topicId,
        subjectId,
        name: file.name,
        size: file.size,
        mimeType: file.type || (file.name.endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream'),
        dataUrl,
        extractedText,
        uploadedAt: new Date().toISOString(),
      };

      await saveFileToIndexedDB(studyFile);
      resolve(studyFile);
    };

    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}
