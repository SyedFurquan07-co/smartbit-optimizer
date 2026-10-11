import React, { useEffect, useState } from 'react';
import { ProposalItem } from './ProposalHistory';
import { supabase } from '../supabase';
import { PdfAnalysisResult } from '../types';
import PdfAnalysisResults from './PdfAnalysisResults';

interface ProposalDetailsProps {
  proposal: ProposalItem;
  onBack: () => void;
  auth?: any;
  db?: any;
}

const ProposalDetails: React.FC<ProposalDetailsProps> = ({ proposal, onBack }) => {
  const [fullText, setFullText] = useState<string>(proposal.originalProposalText || '');
  const [pdfAnalysis, setPdfAnalysis] = useState<PdfAnalysisResult | null>(null);
  const [loadingText, setLoadingText] = useState(false);
  const [activeTab, setActiveTab] = useState<'original' | 'improved' | 'analytics'>('original');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const loadChunkedText = async () => {
      if (proposal.chunkCount && proposal.chunkCount > 0) {
        setLoadingText(true);
        try {
          // Reconstruct chunks ordered by index ASC from Supabase
          const { data: chunks, error } = await supabase
            .from('proposal_chunks')
            .select('text, index')
            .eq('uploaded_proposal_id', proposal.id)
            .order('index', { ascending: true });

          if (error) {
            throw error;
          }

          let reconstructed = '';
          let loadedAnalysis: PdfAnalysisResult | null = null;
          if (chunks) {
            chunks.forEach((chunk) => {
              if (chunk.text && chunk.text.startsWith('__PDF_ANALYSIS_JSON__:')) {
                try {
                  loadedAnalysis = JSON.parse(chunk.text.replace('__PDF_ANALYSIS_JSON__:', ''));
                } catch (e) {
                  console.warn("Failed to parse PDF analysis JSON from chunk:", e);
                }
              } else {
                reconstructed += chunk.text || '';
              }
            });
          }
          if (loadedAnalysis) {
            setPdfAnalysis(loadedAnalysis);
          }
          setFullText(reconstructed);
        } catch (e) {
          console.error("Error loading chunks:", e);
          setFullText("Error loading proposal text.");
        } finally {
          setLoadingText(false);
        }
      } else if (!fullText && proposal.id) {
        try {
          const { data, error } = await supabase
            .from('proposals')
            .select('original_proposal_text')
            .eq('id', proposal.id)
            .single();

          if (!error && data?.original_proposal_text) {
            setFullText(data.original_proposal_text);
          }
        } catch (e) {
          console.error("Error retrieving proposal:", e);
        }
      }
    };

    loadChunkedText();
  }, [proposal]);

  const handleCopy = () => {
    const textToCopy = activeTab === 'improved' && proposal.autoImprovedProposalText
      ? proposal.autoImprovedProposalText
      : fullText;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportPDF = () => {
    try {
      // jsPDF is available globally via UMD
      const { jsPDF } = (window as any).jspdf || {};
      if (!jsPDF) {
        alert("PDF generator not initialized. Please try again.");
        return;
      }

      const doc = new jsPDF({
        unit: 'pt',
        format: 'letter'
      });

      const title = proposal.title || 'Proposal Document';
      const textToExport = activeTab === 'improved' && proposal.autoImprovedProposalText
        ? proposal.autoImprovedProposalText
        : fullText;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.text(title, 40, 50);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Generated: ${proposal.date} | Score: ${proposal.score}%`, 40, 70);

      doc.setFontSize(10);
      doc.setTextColor(30);
      const splitText = doc.splitTextToSize(textToExport, 530);
      doc.text(splitText, 40, 95);

      doc.save(`${title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
    } catch (err: any) {
      console.error("Failed to generate PDF:", err);
      alert("Failed to export PDF: " + err.message);
    }
  };

  const isUploaded = proposal.chunkCount !== undefined;

  if (pdfAnalysis) {
    return (
      <PdfAnalysisResults
        analysis={pdfAnalysis}
        extractedText={fullText}
        onBack={onBack}
        onAnalyzeAnother={onBack}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
        <div>
          <button
            onClick={onBack}
            className="inline-flex items-center space-x-1.5 text-xs text-[#A7ADBD] hover:text-white transition-colors mb-1.5"
            aria-label="Return to History"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>Return to History</span>
          </button>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl font-extrabold text-[#F8FAFC] tracking-tight">
              {proposal.title}
            </h1>
            {!isUploaded && (
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                proposal.score >= 75
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                  : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
              }`}>
                Score: {proposal.score}%
              </span>
            )}
            {isUploaded && (
              <span className="px-2.5 py-0.5 rounded-md text-xs font-medium bg-blue-500/15 text-blue-300 border border-blue-500/30">
                Uploaded Document ({proposal.chunkCount} chunks)
              </span>
            )}
          </div>
          <p className="text-xs text-[#64748B] mt-1">
            Archived on {proposal.date}
            {proposal.description && ` • ${proposal.description}`}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2.5 shrink-0 self-start sm:self-auto">
          <button
            onClick={handleCopy}
            className="px-3.5 py-2 rounded-xl bg-[#151823] hover:bg-[#1B1F2C] text-xs font-semibold text-[#A7ADBD] hover:text-white border border-white/[0.08] transition-colors flex items-center space-x-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
          <button
            onClick={handleExportPDF}
            className="px-4 py-2 rounded-xl bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-xs font-semibold shadow-sm shadow-[#8B5CF6]/25 transition-all flex items-center space-x-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs (Document View / Improved View / Analytics View) */}
      {!isUploaded && (
        <div className="flex border-b border-white/[0.08] space-x-6 text-sm">
          <button
            onClick={() => setActiveTab('original')}
            className={`pb-3 font-semibold transition-all relative ${
              activeTab === 'original'
                ? 'text-white border-b-2 border-[#8B5CF6]'
                : 'text-[#A7ADBD] hover:text-white'
            }`}
          >
            Original Proposal
          </button>
          {proposal.autoImprovedProposalText && (
            <button
              onClick={() => setActiveTab('improved')}
              className={`pb-3 font-semibold transition-all relative ${
                activeTab === 'improved'
                  ? 'text-white border-b-2 border-[#8B5CF6]'
                  : 'text-[#A7ADBD] hover:text-white'
              }`}
            >
              Optimized Revision
            </button>
          )}
          <button
            onClick={() => setActiveTab('analytics')}
            className={`pb-3 font-semibold transition-all relative ${
              activeTab === 'analytics'
                ? 'text-white border-b-2 border-[#8B5CF6]'
                : 'text-[#A7ADBD] hover:text-white'
            }`}
          >
            Deep Analytics & Score
          </button>
        </div>
      )}

      {/* Document View: Original Proposal */}
      {(isUploaded || activeTab === 'original') && (
        <div className="p-6 sm:p-8 rounded-2xl bg-[#151823] border border-white/[0.08] shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
            <h2 className="text-base font-bold text-white tracking-tight">
              {isUploaded ? 'Reconstructed Document Text' : 'Full Proposal Text'}
            </h2>
            <span className="text-xs text-[#64748B]">
              {loadingText ? 'Reconstructing chunks...' : `${fullText.length} characters`}
            </span>
          </div>

          <div className="p-5 rounded-xl bg-[#0B0D14] border border-white/[0.06] text-[#F8FAFC] text-sm leading-relaxed whitespace-pre-wrap font-sans min-h-[350px] max-h-[650px] overflow-y-auto selection:bg-[#8B5CF6]/30">
            {loadingText ? (
              <div className="py-12 text-center text-[#A7ADBD] flex items-center justify-center space-x-2">
                <div className="w-4 h-4 border-2 border-[#8B5CF6] border-t-transparent rounded-full animate-spin"></div>
                <span>Loading full reconstructed text...</span>
              </div>
            ) : (
              fullText || 'No proposal text content available.'
            )}
          </div>
        </div>
      )}

      {/* Document View: Auto-Improved Proposal */}
      {!isUploaded && activeTab === 'improved' && proposal.autoImprovedProposalText && (
        <div className="p-6 sm:p-8 rounded-2xl bg-[#151823] border border-[#8B5CF6]/30 shadow-xl space-y-4 animate-fade-in">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
            <div>
              <h2 className="text-base font-bold text-[#A78BFA] tracking-tight">
                AI Auto-Improved Revision
              </h2>
              <p className="text-xs text-[#A7ADBD]">
                Optimized by Smartbit AI to address weak points and elevate evaluation score.
              </p>
            </div>
          </div>

          <div className="p-5 rounded-xl bg-[#0E1119] border border-[#8B5CF6]/20 text-[#F8FAFC] text-sm leading-relaxed whitespace-pre-wrap font-sans min-h-[350px] max-h-[650px] overflow-y-auto selection:bg-[#8B5CF6]/30">
            {proposal.autoImprovedProposalText}
          </div>
        </div>
      )}

      {/* Analytics View */}
      {!isUploaded && activeTab === 'analytics' && (
        <div className="space-y-6 animate-fade-in">
          {/* Score Card */}
          <div className="p-6 rounded-2xl bg-[#151823] border border-white/[0.08] shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-white">Overall Assessment Score</h3>
                <p className="text-xs text-[#A7ADBD]">Algorithmic index based on enterprise proposal requirements</p>
              </div>
              <div className={`px-4 py-2 rounded-xl text-xl font-extrabold ${
                proposal.score >= 75
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                  : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
              }`}>
                {proposal.score}%
              </div>
            </div>

            {/* Score Bar */}
            <div className="w-full bg-[#0B0D14] h-2.5 rounded-full overflow-hidden border border-white/[0.06]">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  proposal.score >= 75 ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
                style={{ width: `${Math.min(100, Math.max(0, proposal.score))}%` }}
              />
            </div>
          </div>

          {/* Highlights & Weaknesses */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-[#151823] border border-white/[0.08]">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span>Key Highlights</span>
              </h3>
              <ul className="space-y-2 text-xs sm:text-sm text-[#A7ADBD]">
                {proposal.keyHighlights.length > 0 ? (
                  proposal.keyHighlights.map((highlight, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <span className="text-emerald-400 font-bold">•</span>
                      <span>{highlight}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-[#64748B]">No key highlights recorded.</li>
                )}
              </ul>
            </div>

            <div className="p-6 rounded-2xl bg-[#151823] border border-white/[0.08]">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                <span>Identified Weaknesses</span>
              </h3>
              <ul className="space-y-2 text-xs sm:text-sm text-[#A7ADBD]">
                {proposal.weaknesses.length > 0 ? (
                  proposal.weaknesses.map((weakness, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <span className="text-amber-400 font-bold">•</span>
                      <span>{weakness}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-[#64748B]">No significant weaknesses identified.</li>
                )}
              </ul>
            </div>
          </div>

          {/* Risks & Suggestions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-[#151823] border border-white/[0.08]">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                <span>Risk Flags</span>
              </h3>
              <ul className="space-y-2 text-xs sm:text-sm text-[#A7ADBD]">
                {proposal.riskFlags.length > 0 ? (
                  proposal.riskFlags.map((risk, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <span className="text-rose-400 font-bold">•</span>
                      <span>{risk}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-[#64748B]">No risk flags detected.</li>
                )}
              </ul>
            </div>

            <div className="p-6 rounded-2xl bg-[#151823] border border-white/[0.08]">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#8B5CF6]"></span>
                <span>Improvement Recommendations</span>
              </h3>
              <ul className="space-y-2 text-xs sm:text-sm text-[#A7ADBD]">
                {proposal.improvementSuggestions.length > 0 ? (
                  proposal.improvementSuggestions.map((suggestion, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <span className="text-[#8B5CF6] font-bold">•</span>
                      <span>{suggestion}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-[#64748B]">No recommendations provided.</li>
                )}
              </ul>
            </div>
          </div>

          {/* Entities & Competitors telemetry */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="p-5 rounded-xl bg-[#151823] border border-white/[0.08]">
              <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-2">
                NER Entities Extracted
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {proposal.nerEntities.length > 0 ? (
                  proposal.nerEntities.map((entity, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-md text-xs bg-[#10131C] text-[#A7ADBD] border border-white/[0.06]">
                      {entity}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-[#64748B]">No entities extracted.</span>
                )}
              </div>
            </div>

            <div className="p-5 rounded-xl bg-[#151823] border border-white/[0.08]">
              <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-2">
                Competitor Mentions
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {proposal.competitorMentions.length > 0 ? (
                  proposal.competitorMentions.map((comp, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-md text-xs bg-[#10131C] text-amber-300 border border-amber-500/20">
                      {comp}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-[#64748B]">No competitor mentions identified.</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProposalDetails;