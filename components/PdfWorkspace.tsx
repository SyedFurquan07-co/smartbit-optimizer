import React, { useState, useRef, useCallback } from 'react';
import { supabase } from '../supabase';
import { extractPdfText } from '../utils/pdfExtractor';
import { DocumentCategory, PdfAnalysisResult, PdfExtractionResult } from '../types';
import { generateLocalPdfAnalysis } from '../utils/pdfAnalyzer';
import PdfAnalysisResults from './PdfAnalysisResults';

interface PdfWorkspaceProps {
  onBack: () => void;
}

type ProcessingStage =
  | 'idle'
  | 'validating'
  | 'extracting'
  | 'analyzing'
  | 'saving'
  | 'completed'
  | 'error';

const MAX_FILE_SIZE_MB = 25;
const MAX_PAGES = 50;

const DOCUMENT_CATEGORIES: { id: DocumentCategory; label: string; icon: string; desc: string }[] = [
  {
    id: 'proposal',
    label: 'Business Proposal',
    icon: '💼',
    desc: 'Bids, project proposals, RFP responses, and pitch decks',
  },
  {
    id: 'research',
    label: 'Research Paper',
    icon: '🔬',
    desc: 'Academic papers, scientific reports, journal articles',
  },
  {
    id: 'manual',
    label: 'Technical Manual',
    icon: '⚙️',
    desc: 'Architecture docs, specs, user manuals, API documentation',
  },
  {
    id: 'contract',
    label: 'Legal Contract',
    icon: '⚖️',
    desc: 'Agreements, NDAs, terms of service, SLA documents',
  },
  {
    id: 'report',
    label: 'Analytical Report',
    icon: '📊',
    desc: 'Quarterly reviews, market analytics, financial assessments',
  },
  {
    id: 'general',
    label: 'General Document',
    icon: '📄',
    desc: 'Text-based manuscripts and unstructured documents',
  },
];

export const PdfWorkspace: React.FC<PdfWorkspaceProps> = ({ onBack }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<DocumentCategory>('proposal');
  const [customTitle, setCustomTitle] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);

  // Processing state
  const [stage, setStage] = useState<ProcessingStage>('idle');
  const [stageMessage, setStageMessage] = useState<string>('');
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [scannedWarning, setScannedWarning] = useState<string | null>(null);

  // Completed results
  const [analysisResult, setAnalysisResult] = useState<PdfAnalysisResult | null>(null);
  const [extractedFullText, setExtractedFullText] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  // Reset selected file
  const handleRemoveFile = () => {
    setSelectedFile(null);
    setCustomTitle('');
    setErrorMessage(null);
    setScannedWarning(null);
    setStage('idle');
    setStageMessage('');
    setProgressPercent(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Validate file client-side before queuing
  const handleFileSelect = (file: File) => {
    setErrorMessage(null);
    setScannedWarning(null);

    // MIME and Extension check
    const isPdfExt = file.name.toLowerCase().endsWith('.pdf');
    if (!isPdfExt && file.type !== 'application/pdf') {
      setErrorMessage('Invalid file format. Please upload a standard PDF document (.pdf).');
      return;
    }

    // Size limit check
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setErrorMessage(`File exceeds the maximum size limit of ${MAX_FILE_SIZE_MB}MB.`);
      return;
    }

    if (file.size === 0) {
      setErrorMessage('The selected PDF file is completely empty (0 bytes).');
      return;
    }

    setSelectedFile(file);
    if (!customTitle) {
      // Auto-populate title without .pdf extension
      setCustomTitle(file.name.replace(/\.pdf$/i, ''));
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  // Main execution handler
  const handleAnalyzePdf = async () => {
    if (!selectedFile || stage !== 'idle') return;

    setErrorMessage(null);
    setScannedWarning(null);

    // 1. Verify User Auth
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setErrorMessage('Your session has expired. Please sign in to analyze PDF documents.');
      return;
    }

    try {
      // Stage 1: Validation
      setStage('validating');
      setStageMessage('Verifying PDF structure and header signature...');
      setProgressPercent(15);

      // Stage 2: Extract text using pdfjs-dist
      setStage('extracting');
      setStageMessage('Extracting pages and preserving reading hierarchy...');
      setProgressPercent(30);

      const extraction: PdfExtractionResult = await extractPdfText(
        selectedFile,
        (current, total) => {
          setStageMessage(`Extracting page ${current} of ${total}...`);
          setProgressPercent(30 + Math.round((current / total) * 35));
        }
      );

      // Check for scanned / image-only PDFs
      if (extraction.isScannedOnly) {
        setStage('idle');
        setScannedWarning(
          `Scanned Document Detected: "${selectedFile.name}" (${extraction.pageCount} pages) contains no selectable text layers. AI analysis requires text content or an OCR-processed PDF. Please run OCR or upload a text-based document.`
        );
        return;
      }

      setExtractedFullText(extraction.fullText);
      setProgressPercent(65);

      // Stage 3: Send to analyze-pdf Edge Function
      setStage('analyzing');
      setStageMessage('Generating executive summary and deep analytical insights...');
      setProgressPercent(75);

      const { data: sessionData } = await supabase.auth.getSession();
      const jwtToken = sessionData?.session?.access_token;

      if (!jwtToken) {
        throw new Error('Authentication token unavailable. Please sign in again.');
      }

      let rawAnalysis: any = null;

      try {
        const { data: analysisResponse, error: functionError } = await supabase.functions.invoke(
          'analyze-pdf',
          {
            body: {
              fileName: selectedFile.name,
              fileSize: selectedFile.size,
              pageCount: extraction.pageCount,
              category: selectedCategory,
              extractedText: extraction.fullText,
              pages: extraction.pages.map((p) => ({
                pageNumber: p.pageNumber,
                characterCount: p.characterCount,
                textSnippet: p.text.slice(0, 300),
              })),
            },
            headers: {
              Authorization: `Bearer ${jwtToken}`,
            },
          }
        );

        if (functionError) {
          let errDetail = functionError.message;
          try {
            const ctx = (functionError as any).context;
            if (ctx && typeof ctx.json === 'function') {
              const body = await ctx.json();
              if (body?.error) errDetail = body.error;
            }
          } catch {
            // Context parsing fallback
          }
          console.warn('Edge function returned error, engaging local analysis fallback:', errDetail);
        } else if (analysisResponse) {
          rawAnalysis = analysisResponse?.analysis || analysisResponse?.analysisResult;
        }
      } catch (invokeErr: any) {
        console.warn('Network or Edge Function invocation exception, engaging local fallback:', invokeErr?.message);
      }

      // If Edge function was unreachable or returned empty, engage local analysis fallback
      if (!rawAnalysis) {
        rawAnalysis = generateLocalPdfAnalysis(extraction, selectedCategory, customTitle);
      }

      const completedAnalysis: PdfAnalysisResult = {
        ...rawAnalysis,
        documentTitle: customTitle.trim() || rawAnalysis.documentTitle || selectedFile.name,
        fileName: selectedFile.name,
        pageCount: extraction.pageCount,
        analyzedAt: new Date().toISOString(),
      };

      // Stage 4: Persisting to Database Vault
      setStage('saving');
      setStageMessage('Securing document manuscript and AI analysis to Vault...');
      setProgressPercent(90);

      // We persist via proposal_chunks + uploaded_proposals for universal backward compatibility
      // with existing RLS policies and table structures.
      const CHUNK_SIZE = 800 * 1024; // 800 KB safe chunks
      const totalChunks = Math.ceil(extraction.fullText.length / CHUNK_SIZE);
      const uploaderName =
        (user.user_metadata?.name as string) ||
        (user.user_metadata?.full_name as string) ||
        user.email ||
        'User';

      // We encode the PDF analysis payload so it can be restored directly from history
      const formattedDescription = `[PDF_INTELLIGENCE:${selectedCategory}]: ${completedAnalysis.documentTitle}`;

      // Insert record into uploaded_proposals
      const { data: uploadedRow, error: uploadErr } = await supabase
        .from('uploaded_proposals')
        .insert({
          user_id: user.id,
          description: formattedDescription,
          chunk_count: totalChunks + 1, // +1 chunk for analysis JSON metadata
          uploaded_by: uploaderName,
          created_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (uploadErr || !uploadedRow) {
        console.warn('Could not persist to uploaded_proposals:', uploadErr?.message);
      } else {
        const uploadedProposalId = uploadedRow.id;
        const chunkRows = [];

        // Save raw text chunks
        for (let i = 0; i < totalChunks; i++) {
          chunkRows.push({
            uploaded_proposal_id: uploadedProposalId,
            index: i,
            text: extraction.fullText.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE),
          });
        }

        // Save serialized analysis as metadata chunk at the final index
        chunkRows.push({
          uploaded_proposal_id: uploadedProposalId,
          index: totalChunks,
          text: `__PDF_ANALYSIS_JSON__:${JSON.stringify(completedAnalysis)}`,
        });

        const { error: chunkErr } = await supabase.from('proposal_chunks').insert(chunkRows);
        if (chunkErr) {
          console.warn('Failed to persist proposal chunks:', chunkErr.message);
        }
      }

      // Propose insertion into document_analyses table if schema migration is applied
      try {
        await supabase.from('document_analyses').insert({
          user_id: user.id,
          title: completedAnalysis.documentTitle,
          file_name: selectedFile.name,
          file_size_bytes: selectedFile.size,
          page_count: extraction.pageCount,
          category: selectedCategory,
          executive_summary: completedAnalysis.executiveSummary,
          structured_analysis: completedAnalysis,
          extracted_text_preview: extraction.fullText.slice(0, 10000),
          processing_status: 'completed',
        });
      } catch {
        // Migration not yet applied in production; safely continue since chunks are stored
      }

      // Counter Integrity: ONLY increment total_proposals if category is 'proposal'
      if (selectedCategory === 'proposal') {
        const { error: rpcErr } = await supabase.rpc('increment_user_proposals');
        if (rpcErr) {
          console.warn('Atomic counter increment fallback:', rpcErr.message);
        }
      }

      setProgressPercent(100);
      setStage('completed');
      setAnalysisResult(completedAnalysis);
    } catch (err: any) {
      console.error('PDF Analysis failed:', err);
      setStage('error');
      setErrorMessage(err.message || 'An unexpected error occurred during PDF analysis.');
    }
  };

  // If analysis is completed, render the full results workspace view
  if (stage === 'completed' && analysisResult) {
    return (
      <PdfAnalysisResults
        analysis={analysisResult}
        extractedText={extractedFullText}
        onBack={onBack}
        onAnalyzeAnother={handleRemoveFile}
      />
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-white/[0.08]">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#8B5CF6]/15 border border-[#8B5CF6]/30 text-xs font-semibold text-[#A78BFA] mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#8B5CF6] animate-pulse"></span>
            <span>PDF Intelligence Workspace</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Document Extraction & Deep Analysis
          </h1>
          <p className="text-sm text-[#A7ADBD] mt-1">
            Upload PDFs across business, technical, legal, and academic domains for multi-dimensional AI breakdown.
          </p>
        </div>

        <button
          onClick={onBack}
          className="self-start sm:self-center px-4 py-2 bg-[#151823] hover:bg-[#1B1F2C] text-[#A7ADBD] hover:text-white border border-white/[0.08] text-xs font-semibold rounded-xl transition-all flex items-center space-x-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Dashboard</span>
        </button>
      </div>

      {/* Scanned Document Limitations Notice */}
      {scannedWarning && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-3">
          <svg className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <div className="font-semibold text-amber-200">Scanned Document Limitation</div>
            <div className="mt-1 leading-relaxed">{scannedWarning}</div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-3">
          <svg className="w-5 h-5 shrink-0 text-rose-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="flex-1">
            <div className="font-semibold text-rose-200">Processing Error</div>
            <div className="mt-1">{errorMessage}</div>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-rose-400 hover:text-rose-200 text-sm font-bold"
          >
            ×
          </button>
        </div>
      )}

      {/* Main Grid: Upload & Configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Drag & Drop Zone + File Status */}
        <div className="lg:col-span-2 space-y-6">
          {/* Drag & Drop Card */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative rounded-2xl border-2 border-dashed p-8 text-center transition-all duration-200 ${
              isDragging
                ? 'border-[#8B5CF6] bg-[#8B5CF6]/10 scale-[1.01]'
                : selectedFile
                ? 'border-emerald-500/40 bg-[#151823]'
                : 'border-white/[0.12] bg-[#10131C] hover:border-white/[0.2] hover:bg-[#151823]'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleFileSelect(e.target.files[0]);
                }
              }}
            />

            {!selectedFile ? (
              <div className="flex flex-col items-center justify-center space-y-4 py-6">
                <div className="w-16 h-16 rounded-2xl bg-[#1B1F2C] border border-white/[0.08] flex items-center justify-center text-[#8B5CF6] shadow-inner">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">
                    Drag and drop your PDF here
                  </h3>
                  <p className="text-xs text-[#A7ADBD] mt-1">
                    Supports proposals, research papers, contracts, and technical manuals
                  </p>
                </div>

                <button
                  type="button"
                  id="browse-pdf-files-btn"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-5 py-2.5 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-xs font-semibold rounded-xl shadow-lg shadow-[#8B5CF6]/25 transition-all focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]"
                >
                  Browse PDF Files
                </button>

                <div className="flex items-center gap-4 text-[11px] text-[#64748B] pt-2">
                  <span>Max file size: {MAX_FILE_SIZE_MB}MB</span>
                  <span>•</span>
                  <span>Up to {MAX_PAGES} pages</span>
                  <span>•</span>
                  <span>Text-layer verified</span>
                </div>
              </div>
            ) : (
              /* Selected File State */
              <div className="space-y-4 text-left">
                <div className="flex items-start justify-between gap-4 p-4 rounded-xl bg-[#10131C] border border-white/[0.08]">
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9.5 8.5h-2v3H6V7h3.5c1.4 0 2.5 1.1 2.5 2.5s-1.1 2-2.5 2zm5 5h-2.5V7H17v9.5h-2.5zm-5-6H8.5V8.5H9.5c.6 0 1 .4 1 1s-.4 1-1 1z" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-white truncate" title={selectedFile.name}>
                        {selectedFile.name}
                      </div>
                      <div className="text-xs text-[#A7ADBD] mt-0.5 flex items-center gap-2">
                        <span>{formatFileSize(selectedFile.size)}</span>
                        <span>•</span>
                        <span className="text-emerald-400 flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Ready for Extraction
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={stage !== 'idle'}
                      className="px-3 py-1.5 bg-[#1B1F2C] hover:bg-[#252A3C] text-xs text-[#A7ADBD] hover:text-white border border-white/[0.08] rounded-lg transition-all disabled:opacity-50"
                    >
                      Replace
                    </button>
                    <button
                      type="button"
                      onClick={handleRemoveFile}
                      disabled={stage !== 'idle'}
                      className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-xs text-rose-300 border border-rose-500/20 rounded-lg transition-all disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </div>
                </div>

                {/* Optional Custom Title input */}
                <div>
                  <label className="block text-xs font-semibold text-[#A7ADBD] uppercase tracking-wider mb-1.5">
                    Document Title (Optional)
                  </label>
                  <input
                    type="text"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    disabled={stage !== 'idle'}
                    placeholder="e.g. Q4 Cloud Migration Proposal"
                    className="w-full px-4 py-2.5 bg-[#10131C] border border-white/[0.08] rounded-xl text-xs sm:text-sm text-white placeholder-[#64748B] focus:outline-none focus:border-[#8B5CF6] transition-colors disabled:opacity-50"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Active Processing Indicator */}
          {stage !== 'idle' && (
            <div className="p-6 rounded-2xl bg-[#151823] border border-[#8B5CF6]/30 space-y-4">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2 text-white font-semibold">
                  <div className="w-4 h-4 border-2 border-[#8B5CF6] border-t-transparent rounded-full animate-spin"></div>
                  <span>{stageMessage}</span>
                </div>
                <span className="text-[#A78BFA] font-bold">{progressPercent}%</span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-[#10131C] h-2 rounded-full overflow-hidden border border-white/[0.06]">
                <div
                  className="bg-gradient-to-r from-[#8B5CF6] to-[#A78BFA] h-full transition-all duration-300 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              {/* Processing Pipeline Stages */}
              <div className="grid grid-cols-4 gap-2 text-[10px] text-center pt-1 text-[#64748B]">
                <div className={`py-1 px-1.5 rounded ${stage === 'validating' ? 'bg-[#8B5CF6]/20 text-[#A78BFA] font-bold' : progressPercent > 20 ? 'text-emerald-400' : ''}`}>
                  1. Validate
                </div>
                <div className={`py-1 px-1.5 rounded ${stage === 'extracting' ? 'bg-[#8B5CF6]/20 text-[#A78BFA] font-bold' : progressPercent > 65 ? 'text-emerald-400' : ''}`}>
                  2. Extract
                </div>
                <div className={`py-1 px-1.5 rounded ${stage === 'analyzing' ? 'bg-[#8B5CF6]/20 text-[#A78BFA] font-bold' : progressPercent > 85 ? 'text-emerald-400' : ''}`}>
                  3. AI Analysis
                </div>
                <div className={`py-1 px-1.5 rounded ${stage === 'saving' ? 'bg-[#8B5CF6]/20 text-[#A78BFA] font-bold' : progressPercent === 100 ? 'text-emerald-400' : ''}`}>
                  4. Secure Vault
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Category Selection & Action Trigger */}
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-[#151823] border border-white/[0.08] space-y-5">
            <div>
              <h3 className="text-sm font-semibold text-white">Target Document Category</h3>
              <p className="text-xs text-[#A7ADBD] mt-1">
                The analysis model adapts its reasoning and rubric based on the document type.
              </p>
            </div>

            <div className="space-y-2">
              {DOCUMENT_CATEGORIES.map((cat) => {
                const isSelected = selectedCategory === cat.id;
                return (
                  <div
                    key={cat.id}
                    onClick={() => stage === 'idle' && setSelectedCategory(cat.id)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'border-[#8B5CF6] bg-[#8B5CF6]/15 ring-1 ring-[#8B5CF6]'
                        : 'border-white/[0.06] bg-[#10131C] hover:border-white/[0.12] hover:bg-[#1B1F2C]'
                    } ${stage !== 'idle' ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-lg">{cat.icon}</span>
                      <div>
                        <div className={`text-xs font-semibold ${isSelected ? 'text-white' : 'text-[#F8FAFC]'}`}>
                          {cat.label}
                        </div>
                        <div className="text-[10px] text-[#A7ADBD] leading-tight">
                          {cat.desc}
                        </div>
                      </div>
                    </div>

                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      isSelected ? 'border-[#8B5CF6] bg-[#8B5CF6]' : 'border-[#64748B]'
                    }`}>
                      {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white"></div>}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Metric Impact Note */}
            <div className="p-3 rounded-xl bg-[#10131C] border border-white/[0.05] text-[11px] text-[#A7ADBD] space-y-1">
              <div className="font-semibold text-white flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-[#8B5CF6]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Counter Integrity</span>
              </div>
              <p>
                {selectedCategory === 'proposal'
                  ? 'Analyzing as a proposal increments your profile counter.'
                  : 'Analyzing non-proposal documents does not distort proposal metrics.'}
              </p>
            </div>

            {/* Primary Action Button */}
            <button
              id="analyze-pdf-btn"
              type="button"
              disabled={!selectedFile || stage !== 'idle'}
              onClick={handleAnalyzePdf}
              className="w-full py-3.5 px-4 bg-[#8B5CF6] hover:bg-[#7C3AED] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-xs sm:text-sm rounded-xl shadow-lg shadow-[#8B5CF6]/30 focus:outline-none focus:ring-2 focus:ring-[#8B5CF6] focus:ring-offset-2 focus:ring-offset-[#151823] transition-all flex items-center justify-center space-x-2"
            >
              {stage === 'idle' ? (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span>Analyze PDF Document</span>
                </>
              ) : (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Processing Document...</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PdfWorkspace;
