import express from 'express';
import path from 'path';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { analyzeTextLocally, applyAllCorrections } from './src/utils/nlpEngine';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(express.json({ limit: '2mb' }));

// Lazy-initialized Gemini AI client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// Health endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
  });
});

// Deep AI Proofreading & Correction Endpoint
app.post('/api/check', async (req, res) => {
  try {
    const { text, mode } = req.body;
    if (!text || typeof text !== 'string' || !text.trim()) {
      res.status(400).json({ error: 'Text is required.' });
      return;
    }

    const ai = getGeminiClient();

    // If Gemini key is absent or mode is purely rules, use local NLP engine
    if (!ai || mode === 'rules' || mode === 'local') {
      const localErrors = analyzeTextLocally(text);
      const corrected = applyAllCorrections(text, localErrors);
      res.json({
        engineUsed: 'local',
        correctedText: corrected,
        summary: 'Analysis completed using algorithmic Levenshtein distance, Soundex, and grammar rules.',
        errors: localErrors,
      });
      return;
    }

    try {
      const prompt = `Analyze this English passage for:
1. "non-word" spelling errors (invalid English words, e.g. "sientist" -> "scientist", "medcine" -> "medicine", "cleer" -> "clear", "resluts" -> "results").
2. "real-word" misuse errors (valid English words used erroneously in context, e.g. homophones like "sea" -> "see", "there/their", "weather/whether", "lead/led", "affect/effect").
3. "grammar" errors (subject-verb agreement like "He want" -> "He wants", verb tense, article misuse "a/an", duplicate words).
4. "style" errors (awkward phrasing, punctuation spacing).

Return the exact start and end character offsets in the input text for each error, with replacement suggestions and a concise grammatical reason.

Input text:
"""${text}"""`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              correctedText: {
                type: Type.STRING,
                description: 'The completely corrected, polished version of the entire input text.',
              },
              summary: {
                type: Type.STRING,
                description: 'A brief 1-2 sentence overview of errors found.',
              },
              errors: {
                type: Type.ARRAY,
                description: 'List of specific detected errors.',
                items: {
                  type: Type.OBJECT,
                  properties: {
                    word: {
                      type: Type.STRING,
                      description: 'The erroneous word or substring exactly as it appears in text.',
                    },
                    startIndex: {
                      type: Type.INTEGER,
                      description: '0-based character index where the erroneous word starts in the original text.',
                    },
                    endIndex: {
                      type: Type.INTEGER,
                      description: '0-based character index where the erroneous word ends in the original text.',
                    },
                    type: {
                      type: Type.STRING,
                      description: 'One of: "non-word", "real-word", "grammar", "style"',
                    },
                    suggestions: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                      description: 'Suggested replacement words or phrases.',
                    },
                    explanation: {
                      type: Type.STRING,
                      description: 'Short explanation of why this is incorrect and how to fix it.',
                    },
                    rule: {
                      type: Type.STRING,
                      description: 'Name of the grammar or spelling principle (e.g. Subject-Verb Agreement, Homophone Confusion).',
                    },
                  },
                  required: ['word', 'startIndex', 'endIndex', 'type', 'suggestions', 'explanation'],
                },
              },
            },
            required: ['correctedText', 'errors'],
          },
        },
      });

      const parsed = JSON.parse(response.text || '{}');

      // Validate and sanitize offsets
      const validatedErrors = (parsed.errors || []).map((err: any, idx: number) => {
        let start = err.startIndex;
        let end = err.endIndex;

        if (typeof start === 'number' && typeof end === 'number') {
          const slice = text.substring(start, end);
          if (slice.toLowerCase() !== err.word.toLowerCase()) {
            const foundIndex = text.toLowerCase().indexOf(err.word.toLowerCase());
            if (foundIndex !== -1) {
              start = foundIndex;
              end = foundIndex + err.word.length;
            }
          }
        } else {
          const foundIndex = text.toLowerCase().indexOf(err.word.toLowerCase());
          start = foundIndex !== -1 ? foundIndex : 0;
          end = start + err.word.length;
        }

        return {
          id: `ai-err-${idx}-${start}`,
          word: err.word,
          originalText: err.word,
          startIndex: start,
          endIndex: end,
          type: ['non-word', 'real-word', 'grammar', 'style'].includes(err.type) ? err.type : 'non-word',
          suggestions: err.suggestions || [],
          explanation: err.explanation || 'Correction suggested',
          rule: err.rule || 'Grammar & Spelling',
          context: text.substring(Math.max(0, start - 15), Math.min(text.length, end + 15)),
        };
      });

      res.json({
        engineUsed: 'gemini',
        correctedText: parsed.correctedText || text,
        summary: parsed.summary || 'Analysis complete.',
        errors: validatedErrors,
      });
    } catch (modelErr: any) {
      console.warn('Gemini request failed (e.g., temporary 503), serving local NLP engine results:', modelErr.message);
      const localErrors = analyzeTextLocally(text);
      const corrected = applyAllCorrections(text, localErrors);
      res.json({
        engineUsed: 'local',
        useFallback: true,
        correctedText: corrected,
        summary: 'Analysis completed with fast local NLP engine (Levenshtein, Soundex & Trigram heuristics).',
        errors: localErrors,
      });
    }
  } catch (error: any) {
    console.error('Error in /api/check:', error);
    const localErrors = analyzeTextLocally(req.body?.text || '');
    res.status(200).json({
      engineUsed: 'local',
      useFallback: true,
      errors: localErrors,
      correctedText: applyAllCorrections(req.body?.text || '', localErrors),
    });
  }
});

// Linguistic rule explanation endpoint
app.post('/api/explain', async (req, res) => {
  try {
    const { word, suggestion, type, context } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      res.json({
        explanation: `Changing '${word}' to '${suggestion}' fixes a ${type} error in context.`,
      });
      return;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `Provide an engaging, educational, 2-3 sentence linguistic explanation of why "${word}" should be corrected to "${suggestion}" in this context: "${context || ''}".
Mention the grammar rule, etymology, or phonetic confusion if relevant.`,
    });

    res.json({
      explanation: response.text?.trim() || 'No additional explanation available.',
    });
  } catch (err: any) {
    res.json({
      explanation: `Correction from '${req.body.word}' to '${req.body.suggestion}'.`,
    });
  }
});

// Word definition & phonetic lookup
app.get('/api/dictionary/lookup', async (req, res) => {
  try {
    const word = String(req.query.word || '').trim();
    if (!word) {
      res.status(400).json({ error: 'Word parameter required.' });
      return;
    }

    const ai = getGeminiClient();
    if (!ai) {
      res.json({
        word,
        phonetic: `/${word.toLowerCase()}/`,
        partOfSpeech: 'noun / verb',
        definition: `Standard English dictionary entry for "${word}".`,
      });
      return;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `Provide a dictionary entry for the English word "${word}". Return JSON with:
- "word": string
- "phonetic": string (IPA format e.g. "/saɪ.ən.tɪst/")
- "partOfSpeech": string (e.g. "noun", "verb", "adjective")
- "definition": string (concise 1-sentence definition)
- "example": string (1 natural example sentence)`,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json(parsed);
  } catch (err) {
    const word = String(req.query.word || '');
    res.json({
      word,
      definition: `Dictionary entry for ${word}`,
      partOfSpeech: 'word',
    });
  }
});

// Mount Vite middleware in development or static serve in production
async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const listenOnPort = (port: number) => {
    const server = app.listen(port, '0.0.0.0', () => {
      console.log(`Spelling Correction System running on port ${port}`);
    });

    server.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        const nextPort = port + 1;
        console.warn(`Port ${port} is busy, retrying on ${nextPort}`);
        listenOnPort(nextPort);
        return;
      }

      console.error('Server startup error:', err);
      process.exit(1);
    });
  };

  listenOnPort(PORT);
}

start();
