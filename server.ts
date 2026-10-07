import express from 'express';
import multer from 'multer';
import mammoth from 'mammoth';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Google GenAI client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

const app = express();
const port = parseInt(process.env.PORT || '3000', 10);

// Use memory storage for uploaded files so no disk clutter
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB max
});

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

/**
 * Text extraction helper function for PDF, DOCX, and TXT files
 */
async function extractTextFromFile(file: Express.Multer.File): Promise<{ text: string; wordCount: number; isPdfInline?: boolean; base64?: string }> {
  const ext = path.extname(file.originalname).toLowerCase();
  let extractedText = '';

  if (ext === '.txt') {
    extractedText = file.buffer.toString('utf-8');
  } else if (ext === '.docx') {
    const result = await mammoth.extractRawText({ buffer: file.buffer });
    extractedText = result.value || '';
  } else if (ext === '.pdf') {
    try {
      const pdfModule = await import('pdf-parse');
      if (pdfModule.PDFParse) {
        const parser = new pdfModule.PDFParse({ data: file.buffer });
        if (typeof parser.getText === 'function') {
          const textResult = await parser.getText();
          if (typeof textResult === 'string') {
            extractedText = textResult;
          } else if (textResult && typeof textResult.text === 'string') {
            extractedText = textResult.text;
          }
        }
      }
    } catch (err) {
      console.warn('PDF text extraction fallback:', err);
    }

    // If PDF text extraction is empty or short, we also attach base64 so Gemini can read the PDF directly!
    const base64Data = file.buffer.toString('base64');
    const wordCount = extractedText ? extractedText.trim().split(/\s+/).length : 500;
    return {
      text: extractedText,
      wordCount,
      isPdfInline: true,
      base64: base64Data,
    };
  } else {
    throw new Error(`Unsupported file type: ${ext}. Please upload a .pdf, .docx, or .txt file.`);
  }

  const wordCount = extractedText.trim().split(/\s+/).filter(Boolean).length;
  return { text: extractedText, wordCount };
}

// Helper function to call Gemini with retry on transient 503 spikes and fallback to gemini-3.1-flash-lite
async function callGeminiWithRetry(params: { contents: any; config?: any; preferredModel?: string }) {
  const modelsToTry = [params.preferredModel || 'gemini-3.8-flash', 'gemini-3.1-flash-lite'];

  for (const model of modelsToTry) {
    let delay = 1000;
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        return await ai.models.generateContent({
          model,
          contents: params.contents,
          config: params.config,
        });
      } catch (err: any) {
        const isTransient =
          err?.status === 503 ||
          err?.message?.includes('503') ||
          err?.message?.includes('high demand') ||
          err?.status === 429;
        if (isTransient && attempt < 2) {
          console.warn(`Model ${model} spike (attempt ${attempt}/2). Retrying in ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay *= 1.5;
          continue;
        }
        if (isTransient && model !== modelsToTry[modelsToTry.length - 1]) {
          console.warn(`Model ${model} unavailable. Trying fallback model ${modelsToTry[1]}...`);
          break; // break inner loop to try next model
        }
        throw err;
      }
    }
  }
}
interface StoredDoc {
  id: string;
  filename: string;
  text: string;
  wordCount: number;
  pdfBase64?: string;
  summary: string;
  quickTakeaway: string;
  createdAt: number;
}
const documentStore = new Map<string, StoredDoc>();

// -----------------------------------------------------------------------------
// API Route: Health & Configuration Status
// -----------------------------------------------------------------------------
app.get('/api/health', (req, res) => {
  const hasKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY');
  res.json({
    status: 'online',
    app: 'DocuMind',
    model: 'gemini-3.8-flash',
    apiKeyConfigured: hasKey,
  });
});

// -----------------------------------------------------------------------------
// API Route: Document Analysis (Upload file OR Raw Text)
// -----------------------------------------------------------------------------
app.post('/api/analyze', upload.single('document'), async (req, res) => {
  try {
    let filename = 'document.txt';
    let text = '';
    let wordCount = 0;
    let pdfBase64: string | undefined;

    if (req.file) {
      filename = req.file.originalname;
      const extracted = await extractTextFromFile(req.file);
      text = extracted.text;
      wordCount = extracted.wordCount;
      if (extracted.isPdfInline && extracted.base64) {
        pdfBase64 = extracted.base64;
      }
    } else if (req.body.text) {
      text = req.body.text;
      filename = req.body.filename || 'Sample Document.txt';
      wordCount = text.trim().split(/\s+/).filter(Boolean).length;
    } else {
      return res.status(400).json({ error: 'No document file or text provided for analysis.' });
    }

    if (!text && !pdfBase64) {
      return res.status(400).json({ error: 'Could not extract readable text from the document.' });
    }

    const docId = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // Prepare content parts for Gemini
    const contents: any[] = [];

    if (pdfBase64 && (!text || text.length < 100)) {
      // Send as native PDF document part
      contents.push({
        inlineData: {
          mimeType: 'application/pdf',
          data: pdfBase64,
        },
      });
    }

    const textPrompt = `You are DocuMind, an expert AI document analysis assistant.
Analyze this document thoroughly and return a well-structured JSON response.

Document Name: "${filename}"
Document Text Excerpt:
"""
${text.slice(0, 45000)}
"""

Return a JSON object matching this schema:
{
  "quickTakeaway": "1-2 sentence core message or conclusion of the document",
  "summary": "Comprehensive 2-4 paragraph summary explaining context, main objectives, key findings, and final recommendations",
  "category": "Academic / Business / Legal / Technical / Policy / General",
  "keyPoints": [
    {
      "title": "Short title",
      "description": "Clear explanation of the point",
      "category": "Objective / Finding / Rule / Insight / Milestone"
    }
  ],
  "keywords": [
    {
      "word": "Keyword or Concept",
      "relevance": "Why this term matters in this context"
    }
  ],
  "actionItems": [
    {
      "task": "Actionable task or recommended next step",
      "owner": "Responsible party (Student, Manager, Team, or General)",
      "priority": "High / Medium / Low"
    }
  ]
}

Provide 4-8 key points, 6-12 keywords, and 3-6 action items. Ensure the analysis is beginner-friendly and actionable. Respond ONLY with valid JSON.`;

    contents.push({ text: textPrompt });

    const response = await callGeminiWithRetry({
      contents,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const analysis = JSON.parse(response?.text || '{}');

    // Store in memory for interactive chat
    documentStore.set(docId, {
      id: docId,
      filename,
      text: text || 'PDF Content Analyzed',
      wordCount: wordCount || 500,
      pdfBase64,
      summary: analysis.summary || '',
      quickTakeaway: analysis.quickTakeaway || '',
      createdAt: Date.now(),
    });

    res.json({
      success: true,
      documentId: docId,
      filename,
      fileSizeKb: req.file ? Math.round(req.file.size / 1024) : Math.round(text.length / 1024),
      wordCount: wordCount || text.split(/\s+/).length,
      readingTimeMinutes: Math.max(1, Math.round((wordCount || 300) / 200)),
      analysis,
    });
  } catch (error: any) {
    console.error('Analysis error:', error);
    res.status(500).json({ error: error.message || 'Failed to analyze document.' });
  }
});

// -----------------------------------------------------------------------------
// API Route: Chat with Document
// -----------------------------------------------------------------------------
app.post('/api/chat', async (req, res) => {
  try {
    const { documentId, question, history = [] } = req.body;

    if (!documentId || !documentStore.has(documentId)) {
      return res.status(404).json({ error: 'Document session not found. Please analyze a document first.' });
    }

    if (!question || typeof question !== 'string') {
      return res.status(400).json({ error: 'Question is required.' });
    }

    const doc = documentStore.get(documentId)!;

    const historyPrompt = history
      .slice(-6)
      .map((m: any) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n');

    const prompt = `You are DocuMind AI, an intelligent document Q&A assistant.
You are helping the user understand the document named "${doc.filename}".

Document Content Excerpt:
"""
${doc.text.slice(0, 45000)}
"""

Conversation History:
${historyPrompt}

User Question: "${question}"

Guidelines:
1. Answer clearly, accurately, and grounded directly in the document.
2. If the user asks for a simple explanation ("in simple words"), use plain language and intuitive metaphors.
3. If the document does not contain the answer, politely state that it is not mentioned in this document and offer relevant context if available.
4. Use bullet points or short paragraphs where appropriate.`;

    const contents: any[] = [];
    if (doc.pdfBase64 && (!doc.text || doc.text.length < 100)) {
      contents.push({
        inlineData: {
          mimeType: 'application/pdf',
          data: doc.pdfBase64,
        },
      });
    }
    contents.push({ text: prompt });

    const response = await callGeminiWithRetry({
      contents,
    });

    res.json({
      success: true,
      answer: response?.text?.trim() || 'No answer generated.',
      documentName: doc.filename,
    });
  } catch (error: any) {
    console.error('Chat error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate chat response.' });
  }
});

// -----------------------------------------------------------------------------
// API Route: Compare Two Documents
// -----------------------------------------------------------------------------
app.post(
  '/api/compare',
  upload.fields([
    { name: 'document1', maxCount: 1 },
    { name: 'document2', maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      let doc1Name = 'Document 1';
      let doc2Name = 'Document 2';
      let text1 = '';
      let text2 = '';

      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;

      if (files?.document1?.[0]) {
        doc1Name = files.document1[0].originalname;
        const ext = await extractTextFromFile(files.document1[0]);
        text1 = ext.text;
      } else if (req.body.text1) {
        text1 = req.body.text1;
        doc1Name = req.body.doc1Name || 'Document 1';
      }

      if (files?.document2?.[0]) {
        doc2Name = files.document2[0].originalname;
        const ext = await extractTextFromFile(files.document2[0]);
        text2 = ext.text;
      } else if (req.body.text2) {
        text2 = req.body.text2;
        doc2Name = req.body.doc2Name || 'Document 2';
      }

      if (!text1.trim() || !text2.trim()) {
        return res.status(400).json({ error: 'Please provide readable text or files for both documents.' });
      }

      const prompt = `You are DocuMind's document comparison engine.
Compare Document 1 and Document 2 thoroughly.

Document 1 ("${doc1Name}"):
"""
${text1.slice(0, 30000)}
"""

Document 2 ("${doc2Name}"):
"""
${text2.slice(0, 30000)}
"""

Generate a structured comparison JSON object with this exact structure:
{
  "executiveSummary": "2-3 sentences explaining the overarching differences and relationship between the two documents.",
  "similarities": [
    "Core concept, goal, or policy present in both documents"
  ],
  "differences": [
    "Key divergence in rules, scope, dates, or terms"
  ],
  "addedInformation": [
    "Items or details present in Document 2 that are missing in Document 1"
  ],
  "removedInformation": [
    "Items or clauses in Document 1 that were eliminated or omitted in Document 2"
  ],
  "modifiedInformation": [
    {
      "topic": "Specific section, requirement, or clause modified",
      "doc1Version": "What Document 1 says",
      "doc2Version": "What Document 2 says (the update)"
    }
  ]
}

Ensure clear, specific bullet points. Respond ONLY with valid JSON.`;

      const response = await callGeminiWithRetry({
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });

      const comparison = JSON.parse(response?.text || '{}');

      res.json({
        success: true,
        doc1Name,
        doc2Name,
        doc1Words: text1.split(/\s+/).length,
        doc2Words: text2.split(/\s+/).length,
        comparison,
      });
    } catch (error: any) {
      console.error('Comparison error:', error);
      res.status(500).json({ error: error.message || 'Failed to compare documents.' });
    }
  }
);

// -----------------------------------------------------------------------------
// Vite Middleware / Static Server setup
// -----------------------------------------------------------------------------
async function setupServer() {
  if (process.env.NODE_ENV === 'production' && fs.existsSync(path.join(__dirname, 'dist'))) {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    // In dev mode, mount Vite middleware
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`DocuMind server listening at http://localhost:${port}`);
  });
}

setupServer();
