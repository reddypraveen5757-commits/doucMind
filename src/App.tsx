import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Sparkles,
  CheckCircle2,
  ListChecks,
  Tag,
  MessageSquare,
  GitCompare,
  BookOpen,
  Copy,
  Check,
  UploadCloud,
  AlertCircle,
  Trash2,
  Send,
  RefreshCw,
  Clock,
  Layers,
  ArrowRight,
  ChevronRight,
  HelpCircle,
  Split,
  PlusCircle,
  MinusCircle,
  FileQuestion,
  FileSearch,
} from 'lucide-react';
import { SAMPLE_DOCUMENTS, SampleDocument } from './sampleDocuments';

interface KeyPoint {
  title: string;
  description: string;
  category?: string;
}

interface Keyword {
  word: string;
  relevance?: string;
}

interface ActionItem {
  task: string;
  owner?: string;
  priority?: string;
}

interface AnalysisResult {
  quickTakeaway: string;
  summary: string;
  category?: string;
  keyPoints: KeyPoint[];
  keywords: Keyword[];
  actionItems: ActionItem[];
}

interface DocumentAnalysisPayload {
  success: boolean;
  documentId: string;
  filename: string;
  fileSizeKb: number;
  wordCount: number;
  readingTimeMinutes: number;
  analysis: AnalysisResult;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface ComparisonResult {
  executiveSummary: string;
  similarities: string[];
  differences: string[];
  addedInformation: string[];
  removedInformation: string[];
  modifiedInformation: Array<{
    topic: string;
    doc1Version: string;
    doc2Version: string;
  }>;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'analyze' | 'compare' | 'guide'>('analyze');

  // Single Document Analysis State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [sampleDocText, setSampleDocText] = useState<{ name: string; text: string } | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState<string>('');
  const [analysisData, setAnalysisData] = useState<DocumentAnalysisPayload | null>(null);
  const [completedActions, setCompletedActions] = useState<Record<number, boolean>>({});
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [inputQuestion, setInputQuestion] = useState('');
  const [isChatThinking, setIsChatThinking] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Comparison State
  const [compareDoc1, setCompareDoc1] = useState<{ file?: File; sample?: SampleDocument } | null>(null);
  const [compareDoc2, setCompareDoc2] = useState<{ file?: File; sample?: SampleDocument } | null>(null);
  const [isComparing, setIsComparing] = useState(false);
  const [comparisonData, setComparisonData] = useState<{
    doc1Name: string;
    doc2Name: string;
    comparison: ComparisonResult;
  } | null>(null);
  const [compareError, setCompareError] = useState<string | null>(null);

  // General Notification
  const [copiedNotification, setCopiedNotification] = useState<string | null>(null);

  // Drag and drop states
  const [isDragOverSingle, setIsDragOverSingle] = useState(false);
  const singleFileInputRef = useRef<HTMLInputElement>(null);
  const cmpFile1InputRef = useRef<HTMLInputElement>(null);
  const cmpFile2InputRef = useRef<HTMLInputElement>(null);

  // Scroll chat to bottom when messages update
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isChatThinking]);

  // Copy helper
  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedNotification(label);
    setTimeout(() => setCopiedNotification(null), 2500);
  };

  // ---------------------------------------------------------------------------
  // Single Document Analysis Handler
  // ---------------------------------------------------------------------------
  const handleSelectFile = (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['pdf', 'docx', 'txt'].includes(ext || '')) {
      setAnalysisError('Unsupported format. Please select a .pdf, .docx, or .txt file.');
      return;
    }
    setSelectedFile(file);
    setSampleDocText(null);
    setAnalysisError(null);
  };

  const handleSelectSample = (sample: SampleDocument) => {
    setSelectedFile(null);
    setSampleDocText({ name: sample.name, text: sample.text });
    setAnalysisError(null);
  };

  const clearSingleDocument = () => {
    setSelectedFile(null);
    setSampleDocText(null);
    setAnalysisData(null);
    setChatMessages([]);
    setAnalysisError(null);
    setCompletedActions({});
    if (singleFileInputRef.current) singleFileInputRef.current.value = '';
  };

  const handleRunAnalysis = async () => {
    if (!selectedFile && !sampleDocText) {
      setAnalysisError('Please choose a document or pick a sample document first.');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError(null);
    setAnalysisStep('Reading document content & extracting text...');

    try {
      let response: Response;
      if (selectedFile) {
        const formData = new FormData();
        formData.append('document', selectedFile);
        setTimeout(() => setAnalysisStep('Synthesizing with Gemini 3.8 Flash AI...'), 1200);
        response = await fetch('/api/analyze', {
          method: 'POST',
          body: formData,
        });
      } else {
        setTimeout(() => setAnalysisStep('Analyzing structure, key points & action items...'), 800);
        response = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: sampleDocText?.name,
            text: sampleDocText?.text,
          }),
        });
      }

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Document analysis failed.');
      }

      setAnalysisData(data);
      setCompletedActions({});
      // Initialize chat with warm welcome
      setChatMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content: `Hi there! I have finished analyzing **${data.filename}**. You can ask me any question about this document, request simplified explanations, or drill into specific sections!`,
        },
      ]);
    } catch (err: any) {
      setAnalysisError(err.message || 'An unexpected error occurred during analysis.');
    } finally {
      setIsAnalyzing(false);
      setAnalysisStep('');
    }
  };

  // ---------------------------------------------------------------------------
  // Interactive Chat Handler
  // ---------------------------------------------------------------------------
  const handleSendMessage = async (customPrompt?: string) => {
    const question = (customPrompt || inputQuestion).trim();
    if (!question || !analysisData || isChatThinking) return;

    const userMsg: ChatMessage = {
      id: `usr_${Date.now()}`,
      role: 'user',
      content: question,
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setInputQuestion('');
    setIsChatThinking(true);

    try {
      const historyPayload = chatMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: analysisData.documentId,
          question,
          history: historyPayload,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to get answer.');
      }

      const assistantMsg: ChatMessage = {
        id: `asst_${Date.now()}`,
        role: 'assistant',
        content: data.answer,
      };
      setChatMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      setChatMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: 'assistant',
          content: `⚠️ Sorry, I could not process your question: ${err.message}`,
        },
      ]);
    } finally {
      setIsChatThinking(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Document Comparison Handler
  // ---------------------------------------------------------------------------
  const handleRunComparison = async () => {
    if (!compareDoc1 || !compareDoc2) {
      setCompareError('Please select both Document 1 and Document 2 for comparison.');
      return;
    }

    setIsComparing(true);
    setCompareError(null);

    try {
      const formData = new FormData();
      let isForm = false;

      if (compareDoc1.file) {
        formData.append('document1', compareDoc1.file);
        isForm = true;
      }
      if (compareDoc2.file) {
        formData.append('document2', compareDoc2.file);
        isForm = true;
      }

      let res: Response;
      if (isForm) {
        if (!compareDoc1.file && compareDoc1.sample) {
          formData.append('text1', compareDoc1.sample.text);
          formData.append('doc1Name', compareDoc1.sample.name);
        }
        if (!compareDoc2.file && compareDoc2.sample) {
          formData.append('text2', compareDoc2.sample.text);
          formData.append('doc2Name', compareDoc2.sample.name);
        }
        res = await fetch('/api/compare', {
          method: 'POST',
          body: formData,
        });
      } else {
        res = await fetch('/api/compare', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            doc1Name: compareDoc1.sample?.name,
            text1: compareDoc1.sample?.text,
            doc2Name: compareDoc2.sample?.name,
            text2: compareDoc2.sample?.text,
          }),
        });
      }

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Comparison failed.');
      }

      setComparisonData(data);
    } catch (err: any) {
      setCompareError(err.message || 'Comparison failed.');
    } finally {
      setIsComparing(false);
    }
  };

  const loadPolicyComparisonSample = () => {
    const v1 = SAMPLE_DOCUMENTS.find((d) => d.id === 'cybersecurity-policy-v1')!;
    const v2 = SAMPLE_DOCUMENTS.find((d) => d.id === 'cybersecurity-policy-v2')!;
    setCompareDoc1({ sample: v1 });
    setCompareDoc2({ sample: v2 });
    setComparisonData(null);
    setCompareError(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      {/* ===================================================================== */}
      {/* Navigation Header */}
      {/* ===================================================================== */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Identity */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm shadow-blue-500/20">
              <FileSearch className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-xl tracking-tight text-slate-900">DocuMind</span>
                <span className="bg-blue-50 text-blue-700 border border-blue-200 text-xs px-2 py-0.5 rounded-full font-semibold">
                  Gemini 3.8 Flash
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">AI Document Analysis Assistant</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex space-x-1 sm:space-x-2">
            <button
              onClick={() => setActiveTab('analyze')}
              className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all flex items-center space-x-2 ${
                activeTab === 'analyze'
                  ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Analyze Document</span>
            </button>

            <button
              onClick={() => setActiveTab('compare')}
              className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all flex items-center space-x-2 ${
                activeTab === 'compare'
                  ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <GitCompare className="w-4 h-4" />
              <span>Compare Documents</span>
            </button>

            <button
              onClick={() => setActiveTab('guide')}
              className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all flex items-center space-x-2 ${
                activeTab === 'guide'
                  ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>User Guide</span>
            </button>
          </nav>
        </div>
      </header>

      {/* Toast Notification */}
      {copiedNotification && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-lg flex items-center space-x-2 text-sm font-medium animate-fade-in">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{copiedNotification}</span>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* =================================================================== */}
        {/* TAB 1: SINGLE DOCUMENT ANALYSIS */}
        {/* =================================================================== */}
        {activeTab === 'analyze' && (
          <div className="space-y-8">
            {/* Hero / Intro Banner */}
            <div className="bg-gradient-to-br from-white via-blue-50/40 to-indigo-50/30 rounded-2xl p-6 sm:p-8 border border-blue-100 shadow-xs">
              <div className="max-w-3xl">
                <span className="inline-flex items-center space-x-1.5 text-xs font-bold text-blue-700 uppercase tracking-wider bg-blue-100/70 px-2.5 py-1 rounded-full mb-3">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Beginner-Friendly AI Assistant</span>
                </span>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  Understand any document in seconds with AI
                </h1>
                <p className="mt-2 text-slate-600 text-base leading-relaxed">
                  Upload lecture notes, syllabi, contracts, reports, or research papers. DocuMind extracts the executive
                  summary, key takeaways, keywords, and action items, and allows you to chat with the text.
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-semibold text-slate-500 mr-1">Supported File Formats:</span>
                  <span className="bg-white border border-slate-200 text-slate-700 px-2.5 py-1 rounded-lg font-medium shadow-2xs">
                    .PDF (PyMuPDF)
                  </span>
                  <span className="bg-white border border-slate-200 text-slate-700 px-2.5 py-1 rounded-lg font-medium shadow-2xs">
                    .DOCX (Word)
                  </span>
                  <span className="bg-white border border-slate-200 text-slate-700 px-2.5 py-1 rounded-lg font-medium shadow-2xs">
                    .TXT (Plain Text)
                  </span>
                </div>
              </div>
            </div>

            {/* Upload & Document Selector Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                    <UploadCloud className="w-5 h-5 text-blue-600" />
                    <span>Upload or Select Document</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">Drag and drop your file or test with ready-made sample documents</p>
                </div>

                {/* 1-Click Sample Pill Buttons */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-semibold text-slate-500">Try sample:</span>
                  {SAMPLE_DOCUMENTS.slice(0, 3).map((sample) => (
                    <button
                      key={sample.id}
                      onClick={() => handleSelectSample(sample)}
                      className={`text-xs px-2.5 py-1 rounded-lg font-semibold border transition-all ${
                        sampleDocText?.name === sample.name
                          ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                          : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                      }`}
                    >
                      {sample.category.split(' ')[0]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dropzone Container */}
              {!selectedFile && !sampleDocText ? (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragOverSingle(true);
                  }}
                  onDragLeave={() => setIsDragOverSingle(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragOverSingle(false);
                    if (e.dataTransfer.files?.[0]) {
                      handleSelectFile(e.dataTransfer.files[0]);
                    }
                  }}
                  onClick={() => singleFileInputRef.current?.click()}
                  className={`mt-6 border-2 border-dashed rounded-xl p-8 sm:p-12 text-center cursor-pointer transition-all ${
                    isDragOverSingle
                      ? 'border-blue-500 bg-blue-50/50'
                      : 'border-slate-300 hover:border-blue-400 bg-slate-50/50 hover:bg-blue-50/20'
                  }`}
                >
                  <input
                    ref={singleFileInputRef}
                    type="file"
                    accept=".pdf,.docx,.txt"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) handleSelectFile(e.target.files[0]);
                    }}
                  />
                  <div className="w-14 h-14 bg-white border border-slate-200 rounded-2xl flex items-center justify-center mx-auto text-blue-600 shadow-xs mb-3">
                    <FileUpIcon className="w-7 h-7" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">Drag & drop your document here</h3>
                  <p className="text-sm text-slate-500 mt-1">or click to browse from your computer (.pdf, .docx, .txt)</p>
                  <p className="text-xs text-slate-400 mt-2">Maximum file size: 25 MB</p>
                </div>
              ) : (
                /* Selected File Preview Strip */
                <div className="mt-6 bg-blue-50/60 border border-blue-200/80 rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center space-x-3.5">
                    <div className="w-11 h-11 bg-white rounded-lg border border-blue-200 flex items-center justify-center text-blue-600 shadow-2xs font-bold text-sm">
                      {selectedFile ? selectedFile.name.split('.').pop()?.toUpperCase() : 'TXT'}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">
                        {selectedFile ? selectedFile.name : sampleDocText?.name}
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {selectedFile
                          ? `${(selectedFile.size / 1024).toFixed(1)} KB • Uploaded File`
                          : `${sampleDocText?.text.split(/\s+/).length} words • Sample Document`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={clearSingleDocument}
                      className="text-xs font-semibold text-rose-600 hover:text-rose-700 bg-white hover:bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-lg transition-all flex items-center space-x-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Error Alert */}
              {analysisError && (
                <div className="mt-4 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-start space-x-2.5">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-500 mt-0.5" />
                  <div>
                    <strong className="font-bold">Error: </strong>
                    <span>{analysisError}</span>
                  </div>
                </div>
              )}

              {/* Action Trigger */}
              <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100">
                <p className="text-xs text-slate-500">
                  ⚡ Powered by Google GenAI SDK (Model: <code className="bg-slate-100 px-1 py-0.5 rounded">gemini-3.8-flash</code>)
                </p>

                <button
                  onClick={handleRunAnalysis}
                  disabled={(!selectedFile && !sampleDocText) || isAnalyzing}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-sm shadow-sm shadow-blue-500/20 transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:cursor-not-allowed"
                >
                  {isAnalyzing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>{analysisStep || 'Analyzing Document...'}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Analyze Document with AI</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* ================================================================= */}
            {/* Analysis Results Display */}
            {/* ================================================================= */}
            {analysisData && (
              <div className="space-y-6 animate-fade-in">
                {/* Stats Ribbon */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Document</span>
                    <strong className="text-sm font-bold text-slate-900 truncate block mt-0.5" title={analysisData.filename}>
                      {analysisData.filename}
                    </strong>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Word Count</span>
                    <strong className="text-sm font-bold text-slate-900 block mt-0.5">
                      {analysisData.wordCount.toLocaleString()} words
                    </strong>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Reading Time</span>
                    <strong className="text-sm font-bold text-slate-900 block mt-0.5">
                      ~{analysisData.readingTimeMinutes} min read
                    </strong>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Category</span>
                    <strong className="text-sm font-bold text-blue-700 block mt-0.5">
                      {analysisData.analysis.category || 'General'}
                    </strong>
                  </div>
                </div>

                {/* 1. Core Takeaway Banner */}
                <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-5 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Core Takeaway</span>
                      <p className="text-sm sm:text-base font-semibold text-emerald-950 mt-0.5 leading-snug">
                        {analysisData.analysis.quickTakeaway}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleCopy(analysisData.analysis.quickTakeaway, 'Takeaway copied!')}
                    className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 bg-white border border-emerald-200 px-3 py-1.5 rounded-lg transition-all flex items-center space-x-1 flex-shrink-0"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </button>
                </div>

                {/* 2. Grid of Cards (Summary, Key Points, Keywords, Action Items) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Card 1: Document Summary */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col">
                    <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 mb-4">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                          <FileText className="w-4 h-4" />
                        </div>
                        <h3 className="text-base font-bold text-slate-900">Document Summary</h3>
                      </div>
                      <button
                        onClick={() => handleCopy(analysisData.analysis.summary, 'Summary copied!')}
                        className="text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg transition-all flex items-center space-x-1"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </button>
                    </div>

                    <div className="prose prose-slate text-sm leading-relaxed text-slate-700 space-y-3 flex-1">
                      {analysisData.analysis.summary.split('\n\n').map((paragraph, idx) => (
                        <p key={idx}>{paragraph}</p>
                      ))}
                    </div>
                  </div>

                  {/* Card 2: Key Points */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col">
                    <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 mb-4">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                          <ListChecks className="w-4 h-4" />
                        </div>
                        <h3 className="text-base font-bold text-slate-900">Key Points</h3>
                      </div>
                      <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                        {analysisData.analysis.keyPoints.length} Points
                      </span>
                    </div>

                    <div className="space-y-3 flex-1 overflow-y-auto max-h-[420px] pr-1">
                      {analysisData.analysis.keyPoints.map((kp, idx) => (
                        <div key={idx} className="bg-slate-50 border-l-3 border-indigo-600 rounded-r-xl p-3.5 border border-slate-200/80">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <h4 className="text-sm font-bold text-slate-900">{kp.title}</h4>
                            {kp.category && (
                              <span className="text-[10px] font-bold text-indigo-700 bg-white border border-indigo-200 px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                                {kp.category}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-600 leading-relaxed">{kp.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Card 3: Keywords & Concepts */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col">
                    <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 mb-4">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
                          <Tag className="w-4 h-4" />
                        </div>
                        <h3 className="text-base font-bold text-slate-900">Important Keywords</h3>
                      </div>
                      <span className="text-xs font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full">
                        {analysisData.analysis.keywords.length} Terms
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2 flex-1 items-start content-start">
                      {analysisData.analysis.keywords.map((kw, idx) => (
                        <div
                          key={idx}
                          className="bg-purple-50/70 border border-purple-200/80 rounded-xl px-3 py-1.5 text-xs font-medium text-purple-900 flex items-center space-x-1.5 hover:bg-purple-100 transition-colors"
                          title={kw.relevance || ''}
                        >
                          <span className="font-bold">{kw.word}</span>
                          {kw.relevance && <span className="text-purple-600 text-[11px] truncate max-w-[160px]">({kw.relevance})</span>}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Card 4: Action Items */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col">
                    <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 mb-4">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                        <h3 className="text-base font-bold text-slate-900">Action Items & Next Steps</h3>
                      </div>
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                        {Object.values(completedActions).filter(Boolean).length} / {analysisData.analysis.actionItems.length} Done
                      </span>
                    </div>

                    <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[420px] pr-1">
                      {analysisData.analysis.actionItems.map((action, idx) => {
                        const isDone = completedActions[idx] || false;
                        const pLower = (action.priority || 'medium').toLowerCase();
                        const priorityClass =
                          pLower === 'high'
                            ? 'bg-rose-100 text-rose-700 border-rose-200'
                            : pLower === 'low'
                            ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                            : 'bg-amber-100 text-amber-700 border-amber-200';

                        return (
                          <div
                            key={idx}
                            onClick={() => setCompletedActions((prev) => ({ ...prev, [idx]: !prev[idx] }))}
                            className={`p-3 rounded-xl border transition-all flex items-start space-x-3 cursor-pointer ${
                              isDone ? 'bg-slate-50 border-slate-200 opacity-60' : 'bg-white border-slate-200 hover:border-emerald-300'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isDone}
                              onChange={() => {}}
                              className="mt-0.5 w-4 h-4 rounded text-emerald-600 accent-emerald-600 cursor-pointer"
                            />
                            <div className="flex-1">
                              <p className={`text-xs sm:text-sm font-semibold ${isDone ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                                {action.task}
                              </p>
                              <div className="flex items-center space-x-2 mt-1">
                                {action.owner && (
                                  <span className="text-[11px] text-slate-500 font-medium">👤 {action.owner}</span>
                                )}
                                {action.priority && (
                                  <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full border ${priorityClass}`}>
                                    {action.priority}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* ============================================================= */}
                {/* 💬 Chat with Document Section */}
                {/* ============================================================= */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 shadow-xs">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                        <MessageSquare className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-900">Chat with Document</h3>
                        <p className="text-xs text-slate-500">Ask any question and Gemini AI will answer grounded directly in this document.</p>
                      </div>
                    </div>
                  </div>

                  {/* Quick Starter Chips */}
                  <div className="flex items-center gap-1.5 flex-wrap mb-4 pb-3 border-b border-slate-100">
                    <span className="text-xs font-semibold text-slate-400 mr-1">Suggested:</span>
                    <button
                      onClick={() => handleSendMessage('What is this document about?')}
                      className="text-xs bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 text-slate-700 px-3 py-1.5 rounded-full transition-all font-medium"
                    >
                      “What is this document about?”
                    </button>
                    <button
                      onClick={() => handleSendMessage('What are the main objectives?')}
                      className="text-xs bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 text-slate-700 px-3 py-1.5 rounded-full transition-all font-medium"
                    >
                      “What are the main objectives?”
                    </button>
                    <button
                      onClick={() => handleSendMessage('What are the important dates and deadlines?')}
                      className="text-xs bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 text-slate-700 px-3 py-1.5 rounded-full transition-all font-medium"
                    >
                      “What are the important dates?”
                    </button>
                    <button
                      onClick={() => handleSendMessage('Explain this document in simple words.')}
                      className="text-xs bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 text-slate-700 px-3 py-1.5 rounded-full transition-all font-medium"
                    >
                      “Explain this in simple words.”
                    </button>
                  </div>

                  {/* Messages Scroll Box */}
                  <div className="bg-slate-50/70 rounded-xl p-4 min-h-[220px] max-h-[380px] overflow-y-auto space-y-3.5 border border-slate-200/80 mb-4">
                    {chatMessages.map((msg) => (
                      <div key={msg.id} className={`flex items-start gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                            msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {msg.role === 'user' ? 'You' : 'AI'}
                        </div>
                        <div
                          className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed ${
                            msg.role === 'user'
                              ? 'bg-blue-600 text-white rounded-tr-xs'
                              : 'bg-white border border-slate-200 text-slate-800 rounded-tl-xs shadow-2xs'
                          }`}
                        >
                          {msg.content}
                        </div>
                      </div>
                    ))}

                    {isChatThinking && (
                      <div className="flex items-start gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                          AI
                        </div>
                        <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-xs px-4 py-2 text-xs text-slate-500 shadow-2xs flex items-center space-x-2">
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
                          <span>DocuMind is reading the document and thinking...</span>
                        </div>
                      </div>
                    )}
                    <div ref={chatBottomRef} />
                  </div>

                  {/* Input Form */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendMessage();
                    }}
                    className="flex gap-2"
                  >
                    <input
                      type="text"
                      value={inputQuestion}
                      onChange={(e) => setInputQuestion(e.target.value)}
                      placeholder="Ask any question about this document..."
                      className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
                    />
                    <button
                      type="submit"
                      disabled={!inputQuestion.trim() || isChatThinking}
                      className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-all flex items-center space-x-1.5 shadow-xs cursor-pointer"
                    >
                      <span>Send</span>
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 2: DOCUMENT COMPARISON */}
        {/* =================================================================== */}
        {activeTab === 'compare' && (
          <div className="space-y-8">
            {/* Intro Card */}
            <div className="bg-gradient-to-br from-white via-indigo-50/40 to-blue-50/30 rounded-2xl p-6 sm:p-8 border border-indigo-100 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="inline-flex items-center space-x-1.5 text-xs font-bold text-indigo-700 uppercase tracking-wider bg-indigo-100/70 px-2.5 py-1 rounded-full mb-3">
                    <GitCompare className="w-3.5 h-3.5" />
                    <span>Cross-Document Diff Engine</span>
                  </span>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                    Compare Two Documents with AI
                  </h1>
                  <p className="mt-2 text-slate-600 text-base max-w-2xl leading-relaxed">
                    Compare two versions of an assignment, company policy, contract, or report. DocuMind highlights
                    similarities, differences, added clauses, removed clauses, and modified provisions.
                  </p>
                </div>

                <button
                  onClick={loadPolicyComparisonSample}
                  className="bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold px-4 py-2.5 rounded-xl text-xs sm:text-sm shadow-2xs transition-all flex items-center space-x-2 flex-shrink-0"
                >
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <span>Load Sample: Remote Policy v1 vs v2</span>
                </button>
              </div>
            </div>

            {/* Document Selection Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Slot 1: Document 1 */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                      <span className="w-6 h-6 rounded-md bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">1</span>
                      <span>Document 1 (Original / Baseline)</span>
                    </h3>
                    {compareDoc1 && (
                      <button
                        onClick={() => setCompareDoc1(null)}
                        className="text-xs text-rose-600 hover:text-rose-700 font-semibold"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  {!compareDoc1 ? (
                    <div
                      onClick={() => cmpFile1InputRef.current?.click()}
                      className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-xl p-8 text-center cursor-pointer bg-slate-50/50 hover:bg-blue-50/30 transition-all"
                    >
                      <input
                        ref={cmpFile1InputRef}
                        type="file"
                        accept=".pdf,.docx,.txt"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files?.[0]) setCompareDoc1({ file: e.target.files[0] });
                        }}
                      />
                      <FileUpIcon className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                      <p className="text-sm font-bold text-slate-700">Choose First Document</p>
                      <p className="text-xs text-slate-400 mt-1">.pdf, .docx, or .txt</p>
                    </div>
                  ) : (
                    <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-lg bg-white border border-blue-200 flex items-center justify-center font-bold text-blue-700 text-xs">
                        DOC 1
                      </div>
                      <div className="flex-1">
                        <strong className="text-sm font-bold text-slate-900 block truncate">
                          {compareDoc1.file?.name || compareDoc1.sample?.name}
                        </strong>
                        <span className="text-xs text-slate-500">
                          {compareDoc1.file ? `${(compareDoc1.file.size / 1024).toFixed(1)} KB` : 'Ready for comparison'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Slot 2: Document 2 */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                      <span className="w-6 h-6 rounded-md bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">2</span>
                      <span>Document 2 (Revised / Comparison)</span>
                    </h3>
                    {compareDoc2 && (
                      <button
                        onClick={() => setCompareDoc2(null)}
                        className="text-xs text-rose-600 hover:text-rose-700 font-semibold"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  {!compareDoc2 ? (
                    <div
                      onClick={() => cmpFile2InputRef.current?.click()}
                      className="border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-xl p-8 text-center cursor-pointer bg-slate-50/50 hover:bg-indigo-50/30 transition-all"
                    >
                      <input
                        ref={cmpFile2InputRef}
                        type="file"
                        accept=".pdf,.docx,.txt"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files?.[0]) setCompareDoc2({ file: e.target.files[0] });
                        }}
                      />
                      <FileUpIcon className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                      <p className="text-sm font-bold text-slate-700">Choose Second Document</p>
                      <p className="text-xs text-slate-400 mt-1">.pdf, .docx, or .txt</p>
                    </div>
                  ) : (
                    <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-4 flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-lg bg-white border border-indigo-200 flex items-center justify-center font-bold text-indigo-700 text-xs">
                        DOC 2
                      </div>
                      <div className="flex-1">
                        <strong className="text-sm font-bold text-slate-900 block truncate">
                          {compareDoc2.file?.name || compareDoc2.sample?.name}
                        </strong>
                        <span className="text-xs text-slate-500">
                          {compareDoc2.file ? `${(compareDoc2.file.size / 1024).toFixed(1)} KB` : 'Ready for comparison'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Error in Comparison */}
            {compareError && (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-start space-x-2.5">
                <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-500 mt-0.5" />
                <div>
                  <strong className="font-bold">Error: </strong>
                  <span>{compareError}</span>
                </div>
              </div>
            )}

            {/* Trigger Button */}
            <div className="flex justify-center">
              <button
                onClick={handleRunComparison}
                disabled={!compareDoc1 || !compareDoc2 || isComparing}
                className="px-8 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-sm shadow-sm shadow-indigo-500/20 transition-all flex items-center space-x-2 cursor-pointer disabled:cursor-not-allowed"
              >
                {isComparing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Cross-examining documents with AI...</span>
                  </>
                ) : (
                  <>
                    <GitCompare className="w-4 h-4" />
                    <span>Compare Documents with AI</span>
                  </>
                )}
              </button>
            </div>

            {/* ============================================================= */}
            {/* Comparison Results Cards */}
            {/* ============================================================= */}
            {comparisonData && (
              <div className="space-y-6 animate-fade-in">
                {/* Executive Overview */}
                <div className="bg-indigo-50/70 border border-indigo-200 rounded-2xl p-6 shadow-2xs">
                  <div className="flex items-center space-x-2 text-indigo-800 text-xs font-bold uppercase tracking-wider mb-1">
                    <Sparkles className="w-4 h-4" />
                    <span>Executive Comparison Overview</span>
                  </div>
                  <p className="text-sm sm:text-base font-semibold text-indigo-950 leading-relaxed">
                    {comparisonData.comparison.executiveSummary}
                  </p>
                </div>

                {/* 4 Quadrants (Similarities, Differences, Added, Removed) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* 1. Similarities */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
                    <h3 className="text-sm font-bold text-emerald-800 flex items-center space-x-2 pb-3 border-b border-slate-100 mb-4">
                      <span className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs">🤝</span>
                      <span>Similarities (Shared Concepts)</span>
                    </h3>
                    <ul className="space-y-2.5">
                      {comparisonData.comparison.similarities.map((item, idx) => (
                        <li key={idx} className="bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-3 text-xs sm:text-sm text-emerald-950 leading-relaxed">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* 2. Key Differences */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
                    <h3 className="text-sm font-bold text-amber-800 flex items-center space-x-2 pb-3 border-b border-slate-100 mb-4">
                      <span className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center text-xs">⚡</span>
                      <span>Key Differences</span>
                    </h3>
                    <ul className="space-y-2.5">
                      {comparisonData.comparison.differences.map((item, idx) => (
                        <li key={idx} className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-3 text-xs sm:text-sm text-amber-950 leading-relaxed">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* 3. Added in Document 2 */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
                    <h3 className="text-sm font-bold text-blue-800 flex items-center space-x-2 pb-3 border-b border-slate-100 mb-4">
                      <span className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-xs">➕</span>
                      <span>Added in Document 2 (New Content)</span>
                    </h3>
                    <ul className="space-y-2.5">
                      {comparisonData.comparison.addedInformation.map((item, idx) => (
                        <li key={idx} className="bg-blue-50/60 border border-blue-200/80 rounded-xl p-3 text-xs sm:text-sm text-blue-950 leading-relaxed">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* 4. Removed from Document 1 */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
                    <h3 className="text-sm font-bold text-rose-800 flex items-center space-x-2 pb-3 border-b border-slate-100 mb-4">
                      <span className="w-7 h-7 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center text-xs">➖</span>
                      <span>Removed from Document 1 (Omitted)</span>
                    </h3>
                    <ul className="space-y-2.5">
                      {comparisonData.comparison.removedInformation.map((item, idx) => (
                        <li key={idx} className="bg-rose-50/60 border border-rose-200/80 rounded-xl p-3 text-xs sm:text-sm text-rose-950 leading-relaxed">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* 5. Modified Clauses / Details */}
                {comparisonData.comparison.modifiedInformation.length > 0 && (
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
                    <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2 pb-3.5 border-b border-slate-100 mb-4">
                      <Split className="w-5 h-5 text-indigo-600" />
                      <span>Modified Clauses & Direct Policy Updates</span>
                    </h3>

                    <div className="space-y-3.5">
                      {comparisonData.comparison.modifiedInformation.map((mod, idx) => (
                        <div key={idx} className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
                          <h4 className="text-xs sm:text-sm font-bold text-slate-900 mb-2.5 flex items-center space-x-1.5">
                            <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                            <span>{mod.topic}</span>
                          </h4>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                            <div className="bg-rose-50/70 border border-rose-200/80 rounded-lg p-3 text-rose-950">
                              <span className="font-bold text-rose-700 text-[10px] uppercase tracking-wider block mb-1">
                                Document 1
                              </span>
                              <p className="leading-relaxed">{mod.doc1Version}</p>
                            </div>

                            <div className="bg-blue-50/70 border border-blue-200/80 rounded-lg p-3 text-blue-950">
                              <span className="font-bold text-blue-700 text-[10px] uppercase tracking-wider block mb-1">
                                Document 2 (Updated)
                              </span>
                              <p className="leading-relaxed">{mod.doc2Version}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 3: USER & FEATURE GUIDE */}
        {/* =================================================================== */}
        {activeTab === 'guide' && (
          <div className="space-y-8">
            <div className="bg-gradient-to-br from-white via-blue-50/30 to-purple-50/20 rounded-2xl p-6 sm:p-8 border border-blue-100 shadow-xs">
              <span className="inline-flex items-center space-x-1.5 text-xs font-bold text-blue-700 uppercase tracking-wider bg-blue-100/70 px-2.5 py-1 rounded-full mb-3">
                <BookOpen className="w-3.5 h-3.5" />
                <span>Feature Guide</span>
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                How to Get the Most Out of DocuMind
              </h1>
              <p className="mt-2 text-slate-600 text-base max-w-3xl leading-relaxed">
                DocuMind uses Google Gemini 3.8 Flash to transform complex multi-page documents into structured,
                actionable insights in seconds.
              </p>
            </div>

            {/* Core Capabilities */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
              <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                <Layers className="w-5 h-5 text-blue-600" />
                <span>Core Capabilities & Workflow</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                  <div className="flex items-center space-x-2 text-blue-700 font-bold text-sm mb-1">
                    <span className="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center text-xs">📄</span>
                    <h4>Multi-Format Document Parsing</h4>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Upload PDFs, Word (.docx) files, or Plain Text (.txt) files up to 25MB. The system extracts headings,
                    paragraphs, and tabular data automatically.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                  <div className="flex items-center space-x-2 text-blue-700 font-bold text-sm mb-1">
                    <span className="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center text-xs">💡</span>
                    <h4>Executive Synthesis & Takeaways</h4>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Receive a one-sentence core takeaway alongside structured multi-paragraph summaries covering background,
                    objectives, findings, and conclusions.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                  <div className="flex items-center space-x-2 text-blue-700 font-bold text-sm mb-1">
                    <span className="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center text-xs">🔑</span>
                    <h4>Key Points & Topic Tagging</h4>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Identifies pivotal insights categorized by Objective, Policy, Milestone, or Finding, with explanations
                    of their significance.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                  <div className="flex items-center space-x-2 text-blue-700 font-bold text-sm mb-1">
                    <span className="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center text-xs">✅</span>
                    <h4>Interactive Action Items Checklist</h4>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Automatically extracts deadlines, assigned roles, and tasks prioritized as High, Medium, or Low.
                    Check items off interactively as you review.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                  <div className="flex items-center space-x-2 text-blue-700 font-bold text-sm mb-1">
                    <span className="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center text-xs">💬</span>
                    <h4>Grounded Conversational Q&A</h4>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Chat with your document in natural language. Ask for simple explanations, specific dates, or citations.
                    Answers are strictly verified against the text.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                  <div className="flex items-center space-x-2 text-blue-700 font-bold text-sm mb-1">
                    <span className="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center text-xs">⚖️</span>
                    <h4>Cross-Document Comparison</h4>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Upload two documents to pinpoint similarities, differences, added provisions, omitted rules, and modified
                    clauses side-by-side.
                  </p>
                </div>
              </div>
            </div>

            {/* Pro Tips for Better Analysis */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-4">
              <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <span>Tips for Best Results</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-700">
                <div className="border border-slate-200 bg-slate-50/50 p-4 rounded-xl">
                  <strong className="text-slate-900 font-bold text-sm block mb-1">Selectable Text PDFs</strong>
                  <p className="text-slate-600">
                    Ensure PDF files contain selectable digital text rather than flat image scans for highest accuracy and speed.
                  </p>
                </div>
                <div className="border border-slate-200 bg-slate-50/50 p-4 rounded-xl">
                  <strong className="text-slate-900 font-bold text-sm block mb-1">Chat Prompting</strong>
                  <p className="text-slate-600">
                    Use prompt modifiers like <em>"in simple terms"</em>, <em>"as a bulleted timeline"</em>, or <em>"for a non-technical audience"</em>.
                  </p>
                </div>
                <div className="border border-slate-200 bg-slate-50/50 p-4 rounded-xl">
                  <strong className="text-slate-900 font-bold text-sm block mb-1">Version Control Diffs</strong>
                  <p className="text-slate-600">
                    Use Document Comparison for policy revisions, contract amendments, or draft iterations to detect subtle clause modifications.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 mt-12 text-center text-xs text-slate-500">
        <p>DocuMind – AI-Powered Document Analysis Assistant • Powered by Google Gemini AI</p>
      </footer>
    </div>
  );
}

function FileUpIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="M12 12v6" />
      <path d="m15 15-3-3-3 3" />
    </svg>
  );
}
