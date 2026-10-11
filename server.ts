import express, { Request, Response } from 'express';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Support larger payloads for base64 file uploads (PDFs, images)
app.use(express.json({ limit: '35mb' }));
app.use(express.urlencoded({ extended: true, limit: '35mb' }));

function getGenAIClient(req: Request): GoogleGenAI | null {
  const customKey = (req.headers['x-gemini-api-key'] as string)?.trim();
  const apiKey = customKey || process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }

  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function getHttpErrorCode(error: any): number {
  if (typeof error?.status === 'number' && error.status >= 400 && error.status <= 599) {
    return error.status;
  }
  if (typeof error?.statusCode === 'number' && error.statusCode >= 400 && error.statusCode <= 599) {
    return error.statusCode;
  }
  if (typeof error?.code === 'number' && error.code >= 400 && error.code <= 599) {
    return error.code;
  }

  const str = String(error?.message || error?.status || '');
  if (str.includes('403') || str.includes('PERMISSION_DENIED') || str.includes('SERVICE_DISABLED')) {
    return 403;
  }
  if (str.includes('401') || str.includes('UNAUTHENTICATED') || str.includes('API_KEY_INVALID')) {
    return 401;
  }
  if (str.includes('429') || str.includes('RESOURCE_EXHAUSTED')) {
    return 429;
  }
  if (str.includes('400') || str.includes('INVALID_ARGUMENT')) {
    return 400;
  }
  return 500;
}

function parseGeminiError(error: any): {
  error: string;
  message: string;
  activationUrl?: string;
  projectId?: string;
} {
  let errStr = '';
  try {
    if (typeof error === 'string') {
      errStr = error;
    } else if (error?.message) {
      errStr = error.message;
    } else {
      errStr = JSON.stringify(error || {});
    }
  } catch {
    errStr = String(error);
  }

  // Check if errStr contains embedded JSON from Google RPC error
  let parsedJson: any = null;
  try {
    const jsonMatch = errStr.match(/\{[\s\S]*"error"[\s\S]*\}/);
    if (jsonMatch) {
      parsedJson = JSON.parse(jsonMatch[0]);
    }
  } catch {
    // ignore
  }

  // Detect 403 / SERVICE_DISABLED or disabled Gemini API in user's GCP project
  if (
    errStr.includes('SERVICE_DISABLED') ||
    errStr.includes('has not been used in project') ||
    errStr.includes('is disabled') ||
    errStr.includes('generativelanguage.googleapis.com') ||
    parsedJson?.error?.status === 'PERMISSION_DENIED'
  ) {
    let projectId = '';
    let activationUrl = '';

    // Check parsedJson details
    if (parsedJson?.error?.details && Array.isArray(parsedJson.error.details)) {
      for (const d of parsedJson.error.details) {
        if (d?.metadata?.activationUrl) {
          activationUrl = d.metadata.activationUrl;
        }
        if (d?.metadata?.containerInfo) {
          projectId = d.metadata.containerInfo;
        }
      }
    }

    if (!activationUrl) {
      const urlMatch = errStr.match(/https:\/\/console\.developers\.google\.com\/[^\s"'\\]+/);
      if (urlMatch) {
        activationUrl = urlMatch[0];
      }
    }

    if (!projectId) {
      const projectMatch = errStr.match(/project[s\/:\s]+(\d+)/i) || errStr.match(/project\s*=?\s*(\d+)/i);
      projectId = projectMatch ? projectMatch[1] : '';
    }

    if (!activationUrl && projectId) {
      activationUrl = `https://console.developers.google.com/apis/api/generativelanguage.googleapis.com/overview?project=${projectId}`;
    }

    return {
      error: 'API_NOT_ENABLED',
      projectId: projectId || '814573056493',
      activationUrl:
        activationUrl ||
        'https://console.developers.google.com/apis/api/generativelanguage.googleapis.com/overview?project=814573056493',
      message: `La API de Gemini (Generative Language API) aún no está habilitada en tu proyecto de Google Cloud (${
        projectId || '814573056493'
      }). Pulsa en el botón de abajo para activarla en 1 clic gratis en Google Cloud.`,
    };
  }

  // Detect invalid API key
  if (
    errStr.includes('API_KEY_INVALID') ||
    errStr.includes('API key not valid') ||
    errStr.includes('Invalid API key')
  ) {
    return {
      error: 'INVALID_API_KEY',
      message: 'La clave de API de Gemini no es válida. Asegúrate de copiarla completa desde Google AI Studio (aistudio.google.com).',
    };
  }

  // Detect Quota exceeded
  if (errStr.includes('RESOURCE_EXHAUSTED') || errStr.includes('quota')) {
    return {
      error: 'QUOTA_EXCEEDED',
      message: 'Se ha agotado temporalmente la cuota de peticiones por minuto. Espera unos segundos e inténtalo de nuevo.',
    };
  }

  return {
    error: 'GEMINI_ERROR',
    message: parsedJson?.error?.message || error?.message || 'Error al comunicarse con la IA de Gemini.',
  };
}

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    hasEnvApiKey: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'),
  });
});

// Tutor Chat / Question Resolver
app.post('/api/gemini/chat', async (req: Request, res: Response) => {
  try {
    const ai = getGenAIClient(req);
    if (!ai) {
      return res.status(401).json({
        error: 'NO_API_KEY',
        message: 'No se ha configurado ninguna API Key de Gemini. Añade tu API Key en Ajustes o configúrala en el entorno.',
      });
    }

    const { message, history, context, fileAttachment } = req.body;
    if (!message && !fileAttachment) {
      return res.status(400).json({ error: 'INVALID_REQUEST', message: 'El mensaje o archivo no puede estar vacío.' });
    }

    const systemInstruction = `Eres "EstudiaFácil AI", un tutor académico pedagógico, claro, motivador y sumamente estructurado.
Tu objetivo es ayudar al estudiante a entender profundamente sus temas de estudio, asignaturas y archivos.
Pautas:
- Explica de forma concisa pero completa, con analogías y ejemplos prácticos cotidianos cuando sea útil.
- Usa formato Markdown impecable con negritas, listas ordenadas y bloques destacados (💡 Consejo, ⚠️ Atención, 📌 Clave).
- Si hay fórmulas o ecuaciones, escríbelas de forma clara.
- Si el usuario adjunta apuntes, un archivo o contexto de un tema, responde directamente basándote en ellos y cita las ideas clave.
- Responde siempre en español, con un tono cercano, respetuoso y alentador.`;

    // Build contents
    const contents: any[] = [];

    // Prior chat messages if provided
    if (Array.isArray(history) && history.length > 0) {
      for (const item of history.slice(-6)) {
        contents.push({
          role: item.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: item.content }],
        });
      }
    }

    // Current turn parts
    const currentParts: any[] = [];
    if (context) {
      currentParts.push({
        text: `[Contexto de estudio del estudiante]\nAsignatura/Tema: ${context.subject || 'General'}${context.topic ? ' - ' + context.topic : ''}\n${context.text ? 'Notas / Contenido del tema:\n' + context.text : ''}\n---`,
      });
    }

    if (fileAttachment && fileAttachment.data && fileAttachment.mimeType) {
      currentParts.push({
        inlineData: {
          mimeType: fileAttachment.mimeType,
          data: fileAttachment.data,
        },
      });
      if (fileAttachment.name) {
        currentParts.push({
          text: `[Archivo adjunto del estudiante: ${fileAttachment.name}]`,
        });
      }
    }

    if (message) {
      currentParts.push({ text: message });
    }

    contents.push({
      role: 'user',
      parts: currentParts,
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    return res.json({
      reply: response.text || 'No se pudo generar una respuesta. Inténtalo de nuevo.',
    });
  } catch (error: any) {
    console.error('Error in /api/gemini/chat:', error);
    const parsed = parseGeminiError(error);
    const statusCode = getHttpErrorCode(error);
    return res.status(statusCode).json(parsed);
  }
});

// Automatic Structured Summary Generator
app.post('/api/gemini/summarize', async (req: Request, res: Response) => {
  try {
    const ai = getGenAIClient(req);
    if (!ai) {
      return res.status(401).json({
        error: 'NO_API_KEY',
        message: 'No se ha configurado ninguna API Key de Gemini. Configúrala en la pestaña Ajustes.',
      });
    }

    const { title, subject, content, fileAttachment, summaryStyle } = req.body;

    const parts: any[] = [];
    let promptIntro = `Genera un RESUMEN ACADÉMICO EXCELENTE Y ESTRUCTURADO para estudiar.
Asignatura: ${subject || 'General'}
Tema: ${title || 'Sin título'}
Estilo solicitado: ${summaryStyle || 'Completo y visual'}.

El resumen DEBE estructurarse con las siguientes secciones en Markdown:
1. 🎯 **Objetivo / Idea Central**: 2-3 líneas explicando de qué trata y por qué es importante.
2. 🔑 **Conceptos Clave y Definiciones**: Lista con los términos indispensables explicados con claridad.
3. 📋 **Desarrollo Esquemático de Puntos Clave**: Explicación ordenada de los contenidos fundamentales.
4. ⚠️ **Errores Frecuentes en Exámenes / Trampas**: Qué suele confundir a los alumnos y cómo evitarlo.
5. 💡 **Reglas Mnemotécnicas / Consejos de Memoria**: Truco o analogía para recordar el tema fácilmente.
6. 📝 **Preguntas Rápidas de Autocomprobación**: 3 preguntas cortas para comprobar si se ha entendido.`;

    parts.push({ text: promptIntro });

    if (fileAttachment && fileAttachment.data && fileAttachment.mimeType) {
      parts.push({
        inlineData: {
          mimeType: fileAttachment.mimeType,
          data: fileAttachment.data,
        },
      });
    }

    if (content) {
      parts.push({
        text: `\n\n[Material de estudio / Apuntes originales]:\n${content}`,
      });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: { parts },
      config: {
        temperature: 0.4,
      },
    });

    return res.json({
      summary: response.text || '',
    });
  } catch (error: any) {
    console.error('Error in /api/gemini/summarize:', error);
    const parsed = parseGeminiError(error);
    const statusCode = getHttpErrorCode(error);
    return res.status(statusCode).json(parsed);
  }
});

// Interactive Quiz & Flashcards Generator (Structured JSON)
app.post('/api/gemini/quiz', async (req: Request, res: Response) => {
  try {
    const ai = getGenAIClient(req);
    if (!ai) {
      return res.status(401).json({
        error: 'NO_API_KEY',
        message: 'No se ha configurado ninguna API Key de Gemini. Configúrala en la pestaña Ajustes.',
      });
    }

    const { title, subject, content, numQuestions = 5, difficulty = 'medio', fileAttachment } = req.body;

    const parts: any[] = [];
    parts.push({
      text: `Genera un cuestionario tipo test interactivo y un conjunto de flashcards de estudio para el siguiente tema:
Asignatura: ${subject || 'General'}
Tema: ${title || 'General'}
Dificultad: ${difficulty}
Número de preguntas: ${numQuestions}

Crea preguntas tipo test desafiantes pero justas, con 4 opciones (1 correcta y 3 distractores verosímiles), más una explicación pedagógica completa de por qué es la correcta.
Además, genera 4 tarjetas de memoria (flashcards) con un concepto frontal y una explicación concisa en el reverso.`,
    });

    if (fileAttachment && fileAttachment.data && fileAttachment.mimeType) {
      parts.push({
        inlineData: {
          mimeType: fileAttachment.mimeType,
          data: fileAttachment.data,
        },
      });
    }

    if (content) {
      parts.push({
        text: `\n\n[Contenido base]:\n${content}`,
      });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: { parts },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            quizTitle: { type: Type.STRING },
            difficulty: { type: Type.STRING },
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  question: { type: Type.STRING },
                  options: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  correctIndex: { type: Type.INTEGER, description: 'Índice de la respuesta correcta de 0 a 3' },
                  explanation: { type: Type.STRING, description: 'Explicación detallada de por qué es correcta' },
                },
                required: ['id', 'question', 'options', 'correctIndex', 'explanation'],
              },
            },
            flashcards: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  front: { type: Type.STRING, description: 'Pregunta o concepto clave' },
                  back: { type: Type.STRING, description: 'Respuesta o definición clave' },
                },
                required: ['front', 'back'],
              },
            },
          },
          required: ['quizTitle', 'questions', 'flashcards'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed);
  } catch (error: any) {
    console.error('Error in /api/gemini/quiz:', error);
    const parsed = parseGeminiError(error);
    const statusCode = getHttpErrorCode(error);
    return res.status(statusCode).json(parsed);
  }
});

// Explain file / diagram / notes directly
app.post('/api/gemini/explain-file', async (req: Request, res: Response) => {
  try {
    const ai = getGenAIClient(req);
    if (!ai) {
      return res.status(401).json({
        error: 'NO_API_KEY',
        message: 'No se ha configurado ninguna API Key de Gemini. Configúrala en Ajustes.',
      });
    }

    const { file, question } = req.body;
    if (!file || !file.data || !file.mimeType) {
      return res.status(400).json({ error: 'INVALID_FILE', message: 'Datos de archivo no válidos.' });
    }

    const promptText = question || `Analiza en detalle este documento o imagen de apuntes/estudio (${file.name || 'archivo'}).
1. Extrae y describe detalladamente el contenido principal, fórmulas, gráficos o conceptos expuestos.
2. Explica cada punto como un profesor particular experto paso a paso.
3. Destaca 3 conclusiones clave para el examen.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: file.mimeType,
              data: file.data,
            },
          },
          { text: promptText },
        ],
      },
      config: {
        systemInstruction: 'Eres un profesor especialista en análisis de apuntes, documentos académicos, diagramas y resolución de ejercicios.',
      },
    });

    return res.json({
      explanation: response.text || '',
    });
  } catch (error: any) {
    console.error('Error in /api/gemini/explain-file:', error);
    const parsed = parseGeminiError(error);
    const statusCode = getHttpErrorCode(error);
    return res.status(statusCode).json(parsed);
  }
});

// Explicit API 404 and Error Handler to guarantee JSON responses
app.all('/api/*', (req: Request, res: Response) => {
  return res.status(404).json({
    error: 'API_NOT_FOUND',
    message: `Endpoint de API no encontrado: ${req.method} ${req.path}`,
  });
});

app.use('/api', (err: any, _req: Request, res: Response, _next: any) => {
  console.error('Unhandled API Error:', err);
  const parsed = parseGeminiError(err);
  const statusCode = getHttpErrorCode(err);
  return res.status(statusCode).json(parsed);
});

// Vite middleware or Static serving
async function setupServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

setupServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
