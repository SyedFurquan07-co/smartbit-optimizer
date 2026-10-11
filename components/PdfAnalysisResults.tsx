import React, { useState } from 'react';
import { PdfAnalysisResult } from '../types';

interface PdfAnalysisResultsProps {
  analysis: PdfAnalysisResult;
  extractedText: string;
  onBack: () => void;
  onAnalyzeAnother: () => void;
}

const PdfAnalysisResults: React.FC<PdfAnalysisResultsProps> = ({
  analysis,
  extractedText,
  onBack,
  onAnalyzeAnother,
}) => {
  const [activeTab, setActiveTab] = useState<'summary' | 'findings' | 'sections' | 'risks' | 'text'>('summary');
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);

  const getCategoryBadge = (category: string) => {
    switch (category.toLowerCase()) {
      case 'proposal':
        return { label: 'Business Proposal', bg: 'bg-[#8B5CF6]/15 text-[#A78BFA] border-[#8B5CF6]/30' };
      case 'research':
        return { label: 'Research Paper', bg: 'bg-sky-500/15 text-sky-300 border-sky-500/30' };
      case 'manual':
        return { label: 'Technical Manual', bg: 'bg-amber-500/15 text-amber-300 border-amber-500/30' };
      case 'contract':
        return { label: 'Commercial Contract', bg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' };
      case 'report':
        return { label: 'Analytical Report', bg: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30' };
      default:
        return { label: 'General Document', bg: 'bg-white/[0.08] text-[#A7ADBD] border-white/[0.12]' };
    }
  };

  const badge = getCategoryBadge(analysis.detectedCategory);

  const handleCopySummary = () => {
    navigator.clipboard.writeText(analysis.executiveSummary);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2000);
  };

  const handleCopyAll = () => {
    const fullAnalysisReport = `# ${analysis.documentTitle}
Category: ${analysis.detectedCategory}
File: ${analysis.fileName} (${analysis.pageCount} pages)
Analyzed At: ${new Date(analysis.analyzedAt).toLocaleString()}

## Executive Summary
${analysis.executiveSummary}

## Main Findings
${analysis.mainFindings.map((f, i) => `${i + 1}. [${f.topic}] ${f.finding} ${f.pageRef ? `(${f.pageRef})` : ''}`).join('\n')}

## Detailed Analysis
${analysis.detailedAnalysis.map((s) => `### ${s.sectionTitle}\n${s.content}\n${s.keyPoints.map((k) => `- ${k}`).join('\n')}`).join('\n\n')}

## Risks & Gaps
${analysis.risksAndGaps.map((r) => `- ${r}`).join('\n')}

## Actionable Recommendations
${analysis.actionableRecommendations.map((rec) => `- ${rec}`).join('\n')}

## Limitations & Assumptions
${analysis.limitations.map((l) => `- ${l}`).join('\n')}
`;
    navigator.clipboard.writeText(fullAnalysisReport);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const handleExportPdf = () => {
    try {
      const { jsPDF } = (window as any).jspdf || {};
      if (!jsPDF) {
        alert('PDF generator library is initializing. Please try again.');
        return;
      }

      const doc = new jsPDF({ unit: 'pt', format: 'letter' });
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text(analysis.documentTitle, 40, 50);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Category: ${badge.label} | File: ${analysis.fileName} | Pages: ${analysis.pageCount}`, 40, 70);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(30);
      doc.text('Executive Summary', 40, 95);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(50);
      const summaryLines = doc.splitTextToSize(analysis.executiveSummary, 530);
      doc.text(summaryLines, 40, 115);

      doc.save(`${analysis.documentTitle.replace(/[^a-zA-Z0-9]/g, '_')}_Intelligence_Report.pdf`);
    } catch (err: any) {
      console.error('PDF export failed:', err);
      alert('Failed to export PDF report: ' + err.message);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header & Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
        <div>
          <button
            onClick={onBack}
            className="inline-flex items-center space-x-1.5 text-xs text-[#A7ADBD] hover:text-white transition-colors mb-1.5"
            aria-label="Return to Workspace"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>Return to PDF Workspace</span>
          </button>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl font-extrabold text-[#F8FAFC] tracking-tight">
              {analysis.documentTitle}
            </h1>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badge.bg}`}>
              {badge.label}
            </span>
          </div>
          <p className="text-xs text-[#64748B] mt-1">
            File: <span className="text-[#A7ADBD] font-mono">{analysis.fileName}</span> • {analysis.pageCount} {analysis.pageCount === 1 ? 'Page' : 'Pages'} • Analyzed on {new Date(analysis.analyzedAt).toLocaleDateString()}
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center space-x-2 shrink-0 self-start sm:self-auto flex-wrap gap-y-2">
          <button
            onClick={handleCopySummary}
            className="px-3.5 py-2 rounded-xl bg-[#151823] hover:bg-[#1B1F2C] text-xs font-semibold text-[#A7ADBD] hover:text-white border border-white/[0.08] transition-colors flex items-center space-x-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <span>{copiedSummary ? 'Copied Summary!' : 'Copy Summary'}</span>
          </button>

          <button
            onClick={handleCopyAll}
            className="px-3.5 py-2 rounded-xl bg-[#151823] hover:bg-[#1B1F2C] text-xs font-semibold text-[#A7ADBD] hover:text-white border border-white/[0.08] transition-colors flex items-center space-x-1.5"
          >
            <span>{copiedAll ? 'Copied Full Report!' : 'Copy Full Analysis'}</span>
          </button>

          <button
            onClick={handleExportPdf}
            className="px-3.5 py-2 rounded-xl bg-[#1B1F2C] hover:bg-[#252A3C] text-xs font-semibold text-white border border-white/[0.1] transition-colors flex items-center space-x-1.5"
          >
            <svg className="w-3.5 h-3.5 text-[#8B5CF6]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Export Report</span>
          </button>

          <button
            onClick={onAnalyzeAnother}
            className="px-4 py-2 rounded-xl bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-xs font-semibold shadow-sm shadow-[#8B5CF6]/25 transition-all flex items-center space-x-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Analyze New PDF</span>
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-white/[0.08] space-x-6 text-xs sm:text-sm overflow-x-auto pb-0.5">
        <button
          onClick={() => setActiveTab('summary')}
          className={`pb-3 font-semibold whitespace-nowrap transition-all ${
            activeTab === 'summary' ? 'text-white border-b-2 border-[#8B5CF6]' : 'text-[#A7ADBD] hover:text-white'
          }`}
        >
          Executive Summary
        </button>
        <button
          onClick={() => setActiveTab('findings')}
          className={`pb-3 font-semibold whitespace-nowrap transition-all ${
            activeTab === 'findings' ? 'text-white border-b-2 border-[#8B5CF6]' : 'text-[#A7ADBD] hover:text-white'
          }`}
        >
          Key Findings ({analysis.mainFindings.length})
        </button>
        <button
          onClick={() => setActiveTab('sections')}
          className={`pb-3 font-semibold whitespace-nowrap transition-all ${
            activeTab === 'sections' ? 'text-white border-b-2 border-[#8B5CF6]' : 'text-[#A7ADBD] hover:text-white'
          }`}
        >
          Detailed Sections ({analysis.detailedAnalysis.length})
        </button>
        <button
          onClick={() => setActiveTab('risks')}
          className={`pb-3 font-semibold whitespace-nowrap transition-all ${
            activeTab === 'risks' ? 'text-white border-b-2 border-[#8B5CF6]' : 'text-[#A7ADBD] hover:text-white'
          }`}
        >
          Risks, Gaps & Recommendations
        </button>
        <button
          onClick={() => setActiveTab('text')}
          className={`pb-3 font-semibold whitespace-nowrap transition-all ${
            activeTab === 'text' ? 'text-white border-b-2 border-[#8B5CF6]' : 'text-[#A7ADBD] hover:text-white'
          }`}
        >
          Extracted Text
        </button>
      </div>

      {/* TAB 1: Executive Summary */}
      {activeTab === 'summary' && (
        <div className="space-y-6">
          <div className="p-6 sm:p-8 rounded-2xl bg-[#151823] border border-white/[0.08] shadow-xl space-y-4">
            <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#8B5CF6]"></span>
              <span>Executive Synthesis</span>
            </h2>
            <div className="p-5 rounded-xl bg-[#0B0D14] border border-white/[0.06] text-[#F8FAFC] text-sm leading-relaxed whitespace-pre-wrap font-sans selection:bg-[#8B5CF6]/30">
              {analysis.executiveSummary}
            </div>
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-xl bg-[#151823] border border-white/[0.07]">
              <div className="text-xs text-[#64748B] uppercase tracking-wider mb-1">Document Type</div>
              <div className="text-sm font-bold text-white capitalize">{badge.label}</div>
            </div>
            <div className="p-5 rounded-xl bg-[#151823] border border-white/[0.07]">
              <div className="text-xs text-[#64748B] uppercase tracking-wider mb-1">Key Findings Extracted</div>
              <div className="text-sm font-bold text-white">{analysis.mainFindings.length} Insights Identified</div>
            </div>
            <div className="p-5 rounded-xl bg-[#151823] border border-white/[0.07]">
              <div className="text-xs text-[#64748B] uppercase tracking-wider mb-1">Action Items</div>
              <div className="text-sm font-bold text-white">{analysis.actionableRecommendations.length} Recommendations</div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Key Findings */}
      {activeTab === 'findings' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {analysis.mainFindings.map((finding, idx) => (
              <div key={idx} className="p-5 rounded-2xl bg-[#151823] border border-white/[0.08] hover:border-white/[0.15] transition-all">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-[#8B5CF6]/15 text-[#A78BFA] border border-[#8B5CF6]/30">
                    {finding.topic}
                  </span>
                  {finding.pageRef && (
                    <span className="text-[11px] font-mono text-[#64748B] bg-[#10131C] px-2 py-0.5 rounded border border-white/[0.06]">
                      {finding.pageRef}
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-[#F8FAFC] leading-relaxed">
                  {finding.finding}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: Detailed Sections */}
      {activeTab === 'sections' && (
        <div className="space-y-6">
          {analysis.detailedAnalysis.map((section, idx) => (
            <div key={idx} className="p-6 rounded-2xl bg-[#151823] border border-white/[0.08] shadow-lg space-y-3">
              <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span>{section.sectionTitle}</span>
              </h3>
              <p className="text-xs sm:text-sm text-[#A7ADBD] leading-relaxed">
                {section.content}
              </p>
              {section.keyPoints && section.keyPoints.length > 0 && (
                <div className="mt-3 pt-3 border-t border-white/[0.06]">
                  <div className="text-xs font-semibold text-white mb-2">Critical Takeaways:</div>
                  <ul className="space-y-1.5 text-xs text-[#A7ADBD]">
                    {section.keyPoints.map((kp, kIdx) => (
                      <li key={kIdx} className="flex items-start space-x-2">
                        <span className="text-[#8B5CF6] font-bold">•</span>
                        <span>{kp}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* TAB 4: Risks, Gaps & Recommendations */}
      {activeTab === 'risks' && (
        <div className="space-y-6">
          {/* Strengths & Weaknesses (if applicable) */}
          {analysis.strengthsAndWeaknesses && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 rounded-2xl bg-[#151823] border border-white/[0.08]">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <span>Document Strengths</span>
                </h3>
                <ul className="space-y-2 text-xs sm:text-sm text-[#A7ADBD]">
                  {analysis.strengthsAndWeaknesses.strengths?.length > 0 ? (
                    analysis.strengthsAndWeaknesses.strengths.map((str, i) => (
                      <li key={i} className="flex items-start space-x-2">
                        <span className="text-emerald-400 font-bold">•</span>
                        <span>{str}</span>
                      </li>
                    ))
                  ) : (
                    <li className="text-[#64748B]">No specific strengths recorded.</li>
                  )}
                </ul>
              </div>

              <div className="p-6 rounded-2xl bg-[#151823] border border-white/[0.08]">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  <span>Document Weaknesses</span>
                </h3>
                <ul className="space-y-2 text-xs sm:text-sm text-[#A7ADBD]">
                  {analysis.strengthsAndWeaknesses.weaknesses?.length > 0 ? (
                    analysis.strengthsAndWeaknesses.weaknesses.map((wk, i) => (
                      <li key={i} className="flex items-start space-x-2">
                        <span className="text-amber-400 font-bold">•</span>
                        <span>{wk}</span>
                      </li>
                    ))
                  ) : (
                    <li className="text-[#64748B]">No prominent weaknesses detected.</li>
                  )}
                </ul>
              </div>
            </div>
          )}

          {/* Risks & Gaps */}
          <div className="p-6 rounded-2xl bg-[#151823] border border-white/[0.08]">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-400"></span>
              <span>Identified Risks & Information Gaps</span>
            </h3>
            <ul className="space-y-2 text-xs sm:text-sm text-[#A7ADBD]">
              {analysis.risksAndGaps.length > 0 ? (
                analysis.risksAndGaps.map((risk, i) => (
                  <li key={i} className="flex items-start space-x-2">
                    <span className="text-rose-400 font-bold">•</span>
                    <span>{risk}</span>
                  </li>
                ))
              ) : (
                <li className="text-[#64748B]">No critical risks or missing information detected.</li>
              )}
            </ul>
          </div>

          {/* Actionable Recommendations */}
          <div className="p-6 rounded-2xl bg-[#151823] border border-white/[0.08]">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#8B5CF6]"></span>
              <span>Actionable Recommendations</span>
            </h3>
            <ul className="space-y-2 text-xs sm:text-sm text-[#A7ADBD]">
              {analysis.actionableRecommendations.length > 0 ? (
                analysis.actionableRecommendations.map((rec, i) => (
                  <li key={i} className="flex items-start space-x-2">
                    <span className="text-[#8B5CF6] font-bold">•</span>
                    <span>{rec}</span>
                  </li>
                ))
              ) : (
                <li className="text-[#64748B]">No specific recommendations required.</li>
              )}
            </ul>
          </div>

          {/* Limitations & Uncertainties */}
          {analysis.limitations && analysis.limitations.length > 0 && (
            <div className="p-5 rounded-xl bg-[#10131C] border border-white/[0.06] text-xs text-[#64748B] space-y-1.5">
              <div className="font-semibold text-[#A7ADBD]">Analysis Limitations & Caveats:</div>
              <ul className="list-disc list-inside space-y-0.5">
                {analysis.limitations.map((lim, i) => (
                  <li key={i}>{lim}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: Safe Extracted Text Preview */}
      {activeTab === 'text' && (
        <div className="p-6 sm:p-8 rounded-2xl bg-[#151823] border border-white/[0.08] shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
            <h2 className="text-base font-bold text-white tracking-tight">
              Extracted Raw Document Text
            </h2>
            <span className="text-xs font-mono text-[#64748B]">
              {extractedText.length.toLocaleString()} characters extracted
            </span>
          </div>

          <div className="p-5 rounded-xl bg-[#0B0D14] border border-white/[0.06] text-[#F8FAFC] text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-sans max-h-[600px] overflow-y-auto selection:bg-[#8B5CF6]/30">
            {extractedText || 'No text extracted.'}
          </div>
        </div>
      )}
    </div>
  );
};

export default PdfAnalysisResults;
