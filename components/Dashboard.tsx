import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '../supabase';

interface DashboardProps {
  onLogout: () => void;
  auth?: any;
  db?: any;
  user?: any;
  setCurrentPage: (page: 'dashboard' | 'proposal' | 'history' | 'upload') => void;
}

interface RecentProposalSummary {
  id: string;
  title: string;
  score: number;
  date: string;
  type: 'generated' | 'uploaded';
}

const Dashboard: React.FC<DashboardProps> = ({ onLogout, auth, user, setCurrentPage }) => {
  const currentUser = user || auth?.currentUser;
  const displayName = currentUser?.displayName || currentUser?.email?.split('@')[0] || 'User';

  const [loadingStats, setLoadingStats] = useState(true);
  const [totalProposals, setTotalProposals] = useState<number>(0);
  const [generatedCount, setGeneratedCount] = useState<number>(0);
  const [uploadedCount, setUploadedCount] = useState<number>(0);
  const [averageScore, setAverageScore] = useState<number | null>(null);
  const [recentProposals, setRecentProposals] = useState<RecentProposalSummary[]>([]);

  // Load real data from Supabase for authenticated user
  useEffect(() => {
    let isMounted = true;

    const fetchRealDashboardMetrics = async () => {
      setLoadingStats(true);
      try {
        const { data: authData } = await supabase.auth.getUser();
        const activeUserId = authData?.user?.id || currentUser?.id;

        if (!activeUserId) {
          setLoadingStats(false);
          return;
        }

        // 1. Fetch user's profile counter
        const { data: profile } = await supabase
          .from('profiles')
          .select('total_proposals')
          .eq('id', activeUserId)
          .single();

        // 2. Fetch user's generated proposals
        const { data: genList } = await supabase
          .from('proposals')
          .select('id, title, score, created_at')
          .eq('user_id', activeUserId)
          .order('created_at', { ascending: false })
          .limit(5);

        // 3. Fetch user's uploaded proposals
        const { data: upList } = await supabase
          .from('uploaded_proposals')
          .select('id, description, created_at')
          .eq('user_id', activeUserId)
          .order('created_at', { ascending: false })
          .limit(5);

        if (!isMounted) return;

        const genProposals = genList || [];
        const upProposals = upList || [];

        const totalGen = genProposals.length;
        const totalUp = upProposals.length;
        setGeneratedCount(totalGen);
        setUploadedCount(totalUp);

        // Profile counter from database
        const profileCount = profile?.total_proposals ?? (totalGen + totalUp);
        setTotalProposals(profileCount);

        // Average score from real proposals
        if (genProposals.length > 0) {
          const sumScore = genProposals.reduce((acc, p) => acc + (typeof p.score === 'number' ? p.score : 0), 0);
          setAverageScore(Math.round(sumScore / genProposals.length));
        } else {
          setAverageScore(null);
        }

        // Merge and sort real recent items
        const formattedGen: RecentProposalSummary[] = genProposals.map((p) => ({
          id: p.id,
          title: p.title || 'Untitled Proposal',
          score: typeof p.score === 'number' ? p.score : 0,
          date: p.created_at ? new Date(p.created_at).toLocaleDateString() : 'Recent',
          type: 'generated',
        }));

        const formattedUp: RecentProposalSummary[] = upProposals.map((p) => ({
          id: p.id,
          title: p.description || 'Uploaded Document',
          score: 0,
          date: p.created_at ? new Date(p.created_at).toLocaleDateString() : 'Recent',
          type: 'uploaded',
        }));

        const mergedRecent = [...formattedGen, ...formattedUp]
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, 4);

        setRecentProposals(mergedRecent);
      } catch (err) {
        console.error('Error fetching dashboard statistics:', err);
      } finally {
        if (isMounted) setLoadingStats(false);
      }
    };

    fetchRealDashboardMetrics();

    return () => {
      isMounted = false;
    };
  }, [currentUser?.id]);

  const handleStartNewProposal = useCallback(() => {
    setCurrentPage('proposal');
  }, [setCurrentPage]);

  const handleViewProposalHistory = useCallback(() => {
    setCurrentPage('history');
  }, [setCurrentPage]);

  const handleUploadProposalClick = useCallback(() => {
    setCurrentPage('upload');
  }, [setCurrentPage]);

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#151823] via-[#1B1F2C] to-[#151823] border border-white/[0.08] p-6 sm:p-8 shadow-xl">
        {/* Glow Accent */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-[#8B5CF6]/15 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#8B5CF6]/15 border border-[#8B5CF6]/30 text-xs font-semibold text-[#A78BFA] mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              <span>Enterprise AI Workspace Active</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#F8FAFC] tracking-tight">
              Welcome, <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-[#A78BFA]">{displayName}</span>
            </h1>
            <p className="mt-2 text-sm text-[#A7ADBD] leading-relaxed">
              Your real-time operations overview. Generate AI-powered proposals, archive unstructured docs, and review scoring performance with instant cloud persistence.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleStartNewProposal}
              className="px-5 py-2.5 rounded-xl bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-xs sm:text-sm font-semibold shadow-lg shadow-[#8B5CF6]/25 transition-all duration-150 flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Create Proposal</span>
            </button>
            <button
              onClick={handleUploadProposalClick}
              className="px-4 py-2.5 rounded-xl bg-[#1B1F2C] hover:bg-[#252A3C] text-[#A7ADBD] hover:text-white border border-white/[0.08] text-xs sm:text-sm font-semibold transition-all duration-150 flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              <span>Upload Text</span>
            </button>
          </div>
        </div>
      </div>

      {/* Real KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* KPI 1: Total Proposals */}
        <div className="p-5 rounded-2xl bg-[#151823] border border-white/[0.07] hover:border-white/[0.12] transition-all">
          <div className="flex items-center justify-between text-[#A7ADBD] text-xs font-semibold uppercase tracking-wider mb-3">
            <span>Total Proposals</span>
            <div className="p-2 rounded-lg bg-[#8B5CF6]/10 text-[#A78BFA]">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
          <div className="text-3xl font-extrabold text-[#F8FAFC]">
            {loadingStats ? <span className="text-sm text-[#64748B]">Loading...</span> : totalProposals}
          </div>
          <div className="mt-2 text-[11px] text-[#A7ADBD] flex items-center gap-1.5">
            <span className="text-emerald-400 font-medium">Atomic counter</span>
            <span>in Supabase profile</span>
          </div>
        </div>

        {/* KPI 2: AI Generated */}
        <div className="p-5 rounded-2xl bg-[#151823] border border-white/[0.07] hover:border-white/[0.12] transition-all">
          <div className="flex items-center justify-between text-[#A7ADBD] text-xs font-semibold uppercase tracking-wider mb-3">
            <span>AI Generated</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
          <div className="text-3xl font-extrabold text-[#F8FAFC]">
            {loadingStats ? <span className="text-sm text-[#64748B]">Loading...</span> : generatedCount}
          </div>
          <div className="mt-2 text-[11px] text-[#A7ADBD]">
            Stored in proposals table
          </div>
        </div>

        {/* KPI 3: Uploaded Documents */}
        <div className="p-5 rounded-2xl bg-[#151823] border border-white/[0.07] hover:border-white/[0.12] transition-all">
          <div className="flex items-center justify-between text-[#A7ADBD] text-xs font-semibold uppercase tracking-wider mb-3">
            <span>Archived Uploads</span>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
          </div>
          <div className="text-3xl font-extrabold text-[#F8FAFC]">
            {loadingStats ? <span className="text-sm text-[#64748B]">Loading...</span> : uploadedCount}
          </div>
          <div className="mt-2 text-[11px] text-[#A7ADBD]">
            Chunked text & reconstruction
          </div>
        </div>

        {/* KPI 4: Average Score */}
        <div className="p-5 rounded-2xl bg-[#151823] border border-white/[0.07] hover:border-white/[0.12] transition-all">
          <div className="flex items-center justify-between text-[#A7ADBD] text-xs font-semibold uppercase tracking-wider mb-3">
            <span>Average Score</span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
              </svg>
            </div>
          </div>
          <div className="text-3xl font-extrabold text-[#F8FAFC]">
            {loadingStats ? (
              <span className="text-sm text-[#64748B]">Loading...</span>
            ) : averageScore !== null ? (
              `${averageScore}%`
            ) : (
              <span className="text-lg text-[#64748B]">—</span>
            )}
          </div>
          <div className="mt-2 text-[11px] text-[#A7ADBD]">
            {averageScore !== null ? (
              averageScore >= 75 ? (
                <span className="text-emerald-400">High efficiency average</span>
              ) : (
                <span className="text-amber-400">Optimization recommended</span>
              )
            ) : (
              'No scores recorded yet'
            )}
          </div>
        </div>
      </div>

      {/* Main Section: Quick Workflows + Recent History */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Interactive Quick Action Cards (2 cols on desktop) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <svg className="w-4 h-4 text-[#8B5CF6]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
              </svg>
              <span>Operational Workspaces</span>
            </h2>
            <span className="text-xs text-[#A7ADBD]">Select a workflow to begin</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Action 1: Proposal Generator */}
            <div
              onClick={handleStartNewProposal}
              className="p-6 rounded-2xl bg-[#151823] border border-white/[0.08] hover:border-[#8B5CF6]/50 hover:bg-[#1B1F2C] transition-all duration-200 cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#8B5CF6] to-[#6D28D9] flex items-center justify-center text-white mb-4 group-hover:scale-105 transition-transform shadow-md shadow-[#8B5CF6]/20">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-base font-semibold text-white group-hover:text-[#A78BFA] transition-colors">
                  Generate New Proposal
                </h3>
                <p className="mt-1.5 text-xs text-[#A7ADBD] leading-relaxed">
                  Provide project requirements to generate an AI proposal complete with scoring, risk analysis, and entity extraction.
                </p>
              </div>
              <div className="mt-5 pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs font-semibold text-[#8B5CF6] group-hover:text-[#A78BFA]">
                <span>Launch Generator</span>
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>

            {/* Action 2: PDF Intelligence Workspace */}
            <div
              id="launch-pdf-workspace-card"
              onClick={handleUploadProposalClick}
              className="p-6 rounded-2xl bg-[#151823] border border-white/[0.08] hover:border-[#8B5CF6]/50 hover:bg-[#1B1F2C] transition-all duration-200 cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-[#1B1F2C] border border-white/[0.1] flex items-center justify-center text-[#8B5CF6] group-hover:text-white group-hover:bg-[#8B5CF6]/20 group-hover:border-[#8B5CF6]/40 transition-all mb-4 shadow-sm">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-base font-semibold text-white group-hover:text-[#A78BFA] transition-colors">
                  PDF Intelligence Workspace
                </h3>
                <p className="mt-1.5 text-xs text-[#A7ADBD] leading-relaxed">
                  Upload PDF documents (proposals, papers, manuals, contracts) for instant text extraction, executive summary, and deep AI analysis.
                </p>
              </div>
              <div className="mt-5 pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs font-semibold text-[#8B5CF6] group-hover:text-[#A78BFA]">
                <span>Launch PDF Workspace</span>
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </div>

          {/* System Performance Status */}
          <div className="p-6 rounded-2xl bg-[#151823] border border-white/[0.07]">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>Platform Health & Security Summary</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-3.5 rounded-xl bg-[#10131C] border border-white/[0.06]">
                <div className="text-[#64748B] mb-1">Database Layer</div>
                <div className="text-white font-medium">PostgreSQL via Supabase</div>
                <div className="text-emerald-400 text-[11px] mt-1">RLS Active</div>
              </div>
              <div className="p-3.5 rounded-xl bg-[#10131C] border border-white/[0.06]">
                <div className="text-[#64748B] mb-1">Inference Engine</div>
                <div className="text-white font-medium">Edge Function V1</div>
                <div className="text-emerald-400 text-[11px] mt-1">Bearer Auth Gated</div>
              </div>
              <div className="p-3.5 rounded-xl bg-[#10131C] border border-white/[0.06]">
                <div className="text-[#64748B] mb-1">Counter Protocol</div>
                <div className="text-white font-medium">Atomic RPC System</div>
                <div className="text-emerald-400 text-[11px] mt-1">Caller Scoped</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Real Recent Proposals Feed */}
        <div className="p-6 rounded-2xl bg-[#151823] border border-white/[0.08] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.07] mb-4">
              <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                <svg className="w-4 h-4 text-[#8B5CF6]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Recent Archive</span>
              </h3>
              <button
                onClick={handleViewProposalHistory}
                className="text-xs text-[#8B5CF6] hover:text-[#A78BFA] font-semibold"
              >
                View All
              </button>
            </div>

            {loadingStats ? (
              <div className="py-8 text-center text-xs text-[#64748B]">
                Loading real proposal archive...
              </div>
            ) : recentProposals.length === 0 ? (
              <div className="py-10 text-center space-y-3">
                <div className="w-10 h-10 rounded-full bg-white/[0.04] text-[#64748B] flex items-center justify-center mx-auto">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-xs text-[#A7ADBD]">No proposals generated yet.</p>
                <button
                  onClick={handleStartNewProposal}
                  className="px-3 py-1.5 rounded-lg bg-[#8B5CF6]/15 hover:bg-[#8B5CF6]/25 text-[#A78BFA] text-xs font-semibold border border-[#8B5CF6]/30 transition-colors"
                >
                  Create Your First
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {recentProposals.map((item) => (
                  <div
                    key={item.id}
                    onClick={handleViewProposalHistory}
                    className="p-3.5 rounded-xl bg-[#10131C] border border-white/[0.05] hover:border-white/[0.12] transition-colors cursor-pointer group flex items-start justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-white group-hover:text-[#A78BFA] transition-colors truncate">
                        {item.title}
                      </div>
                      <div className="text-[11px] text-[#64748B] mt-0.5 flex items-center gap-2">
                        <span>{item.date}</span>
                        <span>•</span>
                        <span className="capitalize">{item.type}</span>
                      </div>
                    </div>
                    {item.type === 'generated' ? (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        item.score >= 75
                          ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                          : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                      }`}>
                        {item.score}%
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/[0.06] text-[#A7ADBD]">
                        Text
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-white/[0.06]">
            <button
              onClick={handleViewProposalHistory}
              className="w-full py-2.5 rounded-xl bg-[#1B1F2C] hover:bg-[#252A3C] text-[#A7ADBD] hover:text-white text-xs font-semibold transition-colors flex items-center justify-center space-x-2"
            >
              <span>Explore Proposal Archive</span>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;