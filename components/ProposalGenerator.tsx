import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';

interface ProposalGeneratorProps {
  onBack: () => void;
  auth?: any;
  db?: any;
}

const ProposalGenerator: React.FC<ProposalGeneratorProps> = ({ onBack, auth }) => {
  const [username, setUsername] = useState('');
  const [description, setDescription] = useState('');
  const [pages, setPages] = useState<number>(1);
  const [generatedData, setGeneratedData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedOriginal, setCopiedOriginal] = useState(false);
  const [copiedImproved, setCopiedImproved] = useState(false);

  // Auto-populate username from Supabase user session if available
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        const defaultName =
          (user.user_metadata?.name as string) ||
          (user.user_metadata?.full_name as string) ||
          user.email?.split('@')[0] ||
          '';
        setUsername((prev) => (prev ? prev : defaultName));
      }
    });
  }, []);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (loading) return; // Prevent duplicate submissions

    // Authenticate user directly via Supabase session
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("You must be logged in to generate a proposal.");
      return;
    }

    const currentUserName =
      (user.user_metadata?.name as string) ||
      (user.user_metadata?.full_name as string) ||
      username ||
      user.email ||
      'User';

    setLoading(true);
    setError(null);
    setGeneratedData(null);

    try {
      const { data, error: functionError } = await supabase.functions.invoke('generate-proposal', {
        body: {
          description,
          pages,
          username: username || currentUserName,
        },
      });

      if (functionError) {
        let message = functionError.message;
        try {
          const errorContext = (functionError as any).context;
          if (errorContext && typeof errorContext.json === 'function') {
            const errorBody = await errorContext.json();
            if (errorBody?.error) {
              message = errorBody.error;
            }
          }
        } catch {
          // Use default error message if body json cannot be extracted
        }
        throw new Error(message || "Failed to generate proposal.");
      }

      if (!data || !data.aiOutput) {
        throw new Error("Invalid response received from proposal service.");
      }

      setGeneratedData(data.aiOutput);
    } catch (err: any) {
      console.error("Error generating proposal:", err);
      setError(err.message || "Failed to generate proposal. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, isOriginal: boolean) => {
    navigator.clipboard.writeText(text);
    if (isOriginal) {
      setCopiedOriginal(true);
      setTimeout(() => setCopiedOriginal(false), 2000);
    } else {
      setCopiedImproved(true);
      setTimeout(() => setCopiedImproved(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header / Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
        <div>
          <button
            onClick={onBack}
            className="inline-flex items-center space-x-1.5 text-xs text-[#A7ADBD] hover:text-white transition-colors mb-1.5"
            aria-label="Back to Dashboard"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>Back to Dashboard</span>
          </button>
          <h1 className="text-2xl font-extrabold text-[#F8FAFC] tracking-tight">
            Proposal Intelligence Generator
          </h1>
          <p className="text-xs sm:text-sm text-[#A7ADBD] mt-0.5">
            Configure parameters to synthesize an enterprise-ready proposal with automated scoring and optimization.
          </p>
        </div>

        {generatedData && (
          <button
            onClick={() => {
              setGeneratedData(null);
              setDescription('');
            }}
            className="px-4 py-2 rounded-xl bg-[#1B1F2C] hover:bg-[#252A3C] text-xs font-semibold text-[#A7ADBD] hover:text-white border border-white/[0.08] transition-colors self-start sm:self-auto"
          >
            New Draft
          </button>
        )}
      </div>

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Configuration Form (Full width or left column if generated) */}
        <div className={`space-y-6 ${generatedData ? 'lg:col-span-5' : 'lg:col-span-8 lg:col-start-3'}`}>
          <div className="bg-[#151823] rounded-2xl border border-white/[0.08] p-6 sm:p-8 shadow-xl relative overflow-hidden">
            {/* Top violet highlight */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#8B5CF6] to-transparent opacity-80" />

            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-base font-bold text-white tracking-tight">
                  Project Specification
                </h2>
                <p className="text-xs text-[#A7ADBD]">
                  Describe the proposal objectives, constraints, and scope.
                </p>
              </div>
              <span className="p-2 rounded-xl bg-[#8B5CF6]/15 text-[#A78BFA] border border-[#8B5CF6]/30">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </span>
            </div>

            {error && (
              <div role="alert" className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs sm:text-sm flex items-start space-x-2.5">
                <svg className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div className="flex-1">
                  <div className="font-semibold">Generation Failed</div>
                  <div className="text-xs text-rose-200/90 mt-0.5">{error}</div>
                </div>
              </div>
            )}

            <form onSubmit={handleGenerate} className="space-y-5">
              {/* Username Field */}
              <div>
                <label htmlFor="username" className="block text-xs font-semibold uppercase tracking-wider text-[#A7ADBD] mb-1.5">
                  Author / Organization Name
                </label>
                <input
                  type="text"
                  id="username"
                  className="w-full px-4 py-2.5 rounded-xl bg-[#0B0D14] border border-white/[0.08] focus:border-[#8B5CF6] focus:ring-1 focus:ring-[#8B5CF6] focus:outline-none text-[#F8FAFC] placeholder-[#64748B] text-sm transition-all"
                  placeholder="e.g., Alex Rivers or Acme Corp"
                  aria-label="Author or Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              {/* Number of Pages Field */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="pages" className="block text-xs font-semibold uppercase tracking-wider text-[#A7ADBD]">
                    Target Document Length
                  </label>
                  <span className="text-xs font-semibold text-[#8B5CF6] bg-[#8B5CF6]/15 px-2 py-0.5 rounded-md">
                    {pages} {pages === 1 ? 'Page' : 'Pages'}
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <input
                    type="range"
                    min="1"
                    max="20"
                    value={pages}
                    onChange={(e) => setPages(parseInt(e.target.value, 10))}
                    disabled={loading}
                    className="flex-1 accent-[#8B5CF6] h-2 bg-[#0B0D14] rounded-lg cursor-pointer"
                  />
                  <input
                    type="number"
                    id="pages"
                    min="1"
                    max="50"
                    className="w-16 px-2.5 py-1.5 rounded-xl bg-[#0B0D14] border border-white/[0.08] focus:border-[#8B5CF6] focus:ring-1 focus:ring-[#8B5CF6] focus:outline-none text-[#F8FAFC] text-center text-sm"
                    value={pages}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      setPages(isNaN(val) ? 1 : Math.max(1, Math.min(val, 50)));
                    }}
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Project Description Field */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="description" className="block text-xs font-semibold uppercase tracking-wider text-[#A7ADBD]">
                    Project Description & Deliverables
                  </label>
                  <span className={`text-[11px] ${description.length > 9500 ? 'text-amber-400' : 'text-[#64748B]'}`}>
                    {description.length} / 10,000 chars
                  </span>
                </div>
                <textarea
                  id="description"
                  rows={generatedData ? 6 : 9}
                  className="w-full p-4 rounded-xl bg-[#0B0D14] border border-white/[0.08] focus:border-[#8B5CF6] focus:ring-1 focus:ring-[#8B5CF6] focus:outline-none text-[#F8FAFC] placeholder-[#64748B] text-sm leading-relaxed transition-all resize-y"
                  placeholder="Provide comprehensive context: client goals, problem statement, core deliverables, expected timelines, budget constraints, technical stack, or special criteria..."
                  aria-label="Project Description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={10000}
                  required
                  disabled={loading}
                />
              </div>

              {/* Generate Action Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3.5 px-6 bg-[#8B5CF6] hover:bg-[#7C3AED] active:scale-[0.99] text-white font-semibold text-sm rounded-xl shadow-lg shadow-[#8B5CF6]/25 focus:outline-none focus:ring-2 focus:ring-[#8B5CF6] focus:ring-offset-2 focus:ring-offset-[#151823] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2.5"
                  aria-label="Generate Proposal"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                      </svg>
                      <span>Generating Proposal & AI Analysis...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <span>{generatedData ? 'Re-generate Proposal' : 'Generate Proposal'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: AI Output & Document Workspace */}
        {generatedData && (
          <div className="lg:col-span-7 space-y-6 animate-fade-in">
            {/* Score & Summary Card */}
            <div className="p-6 rounded-2xl bg-[#151823] border border-white/[0.08] shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.07]">
                <div>
                  <div className="text-xs uppercase tracking-wider text-[#A7ADBD] font-semibold">
                    Proposal Quality Score
                  </div>
                  <div className="text-sm text-white font-medium mt-0.5">
                    Evaluated across clarity, feasibility, and market fit
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <div className={`px-4 py-1.5 rounded-full text-base font-extrabold flex items-center space-x-1.5 shadow-sm ${
                    generatedData.score >= 75
                      ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                      : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                  }`}>
                    <span>{generatedData.score}</span>
                    <span className="text-xs font-normal opacity-80">/ 100</span>
                  </div>
                  {generatedData.score < 75 && (
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-[#8B5CF6]/15 text-[#A78BFA] border border-[#8B5CF6]/30">
                      Auto-improved Available
                    </span>
                  )}
                </div>
              </div>

              {/* Success Probability Pill if provided */}
              {generatedData.successProbability && (
                <div className="mt-4 pt-3 flex items-center justify-between text-xs text-[#A7ADBD]">
                  <span>Estimated Acceptance Probability:</span>
                  <span className="font-semibold text-white px-2 py-0.5 rounded bg-[#10131C] border border-white/[0.06]">
                    {generatedData.successProbability}
                  </span>
                </div>
              )}
            </div>

            {/* Generated Proposal Document Viewer */}
            <div className="p-6 sm:p-8 rounded-2xl bg-[#151823] border border-white/[0.08] shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.07]">
                <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                  <svg className="w-4 h-4 text-[#8B5CF6]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Generated Proposal Document</span>
                </h3>

                <button
                  onClick={() => copyToClipboard(generatedData.originalProposalText, true)}
                  className="px-3 py-1.5 rounded-lg bg-[#1B1F2C] hover:bg-[#252A3C] text-xs font-medium text-[#A7ADBD] hover:text-white border border-white/[0.08] transition-colors flex items-center space-x-1.5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span>{copiedOriginal ? 'Copied!' : 'Copy Text'}</span>
                </button>
              </div>

              <div className="p-5 rounded-xl bg-[#0B0D14] border border-white/[0.06] text-[#F8FAFC] text-sm leading-relaxed whitespace-pre-wrap font-sans max-h-[500px] overflow-y-auto selection:bg-[#8B5CF6]/30">
                {generatedData.originalProposalText}
              </div>
            </div>

            {/* Auto-Improved Proposal (if score was < 75) */}
            {generatedData.score < 75 && generatedData.autoImprovedProposalText && (
              <div className="p-6 sm:p-8 rounded-2xl bg-[#151823] border border-[#8B5CF6]/30 shadow-xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-white/[0.07]">
                  <h3 className="text-base font-bold text-[#A78BFA] tracking-tight flex items-center gap-2">
                    <svg className="w-4 h-4 text-[#8B5CF6]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span>Auto-Optimized Revision</span>
                  </h3>

                  <button
                    onClick={() => copyToClipboard(generatedData.autoImprovedProposalText, false)}
                    className="px-3 py-1.5 rounded-lg bg-[#8B5CF6]/15 hover:bg-[#8B5CF6]/25 text-xs font-semibold text-[#A78BFA] border border-[#8B5CF6]/30 transition-colors flex items-center space-x-1.5"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <span>{copiedImproved ? 'Copied!' : 'Copy Revision'}</span>
                  </button>
                </div>

                <div className="p-5 rounded-xl bg-[#0E1119] border border-[#8B5CF6]/20 text-[#F8FAFC] text-sm leading-relaxed whitespace-pre-wrap font-sans max-h-[500px] overflow-y-auto selection:bg-[#8B5CF6]/30">
                  {generatedData.autoImprovedProposalText}
                </div>
              </div>
            )}

            {/* AI Insights & Diagnostics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Key Highlights */}
              <div className="p-5 rounded-xl bg-[#151823] border border-white/[0.07]">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2.5 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <span>Key Highlights</span>
                </h4>
                <ul className="space-y-1.5 text-xs text-[#A7ADBD]">
                  {generatedData.keyHighlights?.length > 0 ? (
                    generatedData.keyHighlights.map((item: string, i: number) => (
                      <li key={i} className="flex items-start space-x-2">
                        <span className="text-emerald-400 font-bold">•</span>
                        <span>{item}</span>
                      </li>
                    ))
                  ) : (
                    <li className="text-[#64748B]">No specific highlights listed.</li>
                  )}
                </ul>
              </div>

              {/* Improvement Suggestions */}
              <div className="p-5 rounded-xl bg-[#151823] border border-white/[0.07]">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2.5 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#8B5CF6]"></span>
                  <span>Improvement Suggestions</span>
                </h4>
                <ul className="space-y-1.5 text-xs text-[#A7ADBD]">
                  {generatedData.improvementSuggestions?.length > 0 ? (
                    generatedData.improvementSuggestions.map((item: string, i: number) => (
                      <li key={i} className="flex items-start space-x-2">
                        <span className="text-[#8B5CF6] font-bold">•</span>
                        <span>{item}</span>
                      </li>
                    ))
                  ) : (
                    <li className="text-[#64748B]">No suggestions required.</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProposalGenerator;