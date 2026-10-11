import React, { useState, useEffect, useCallback, useMemo } from 'react';
import ProposalDetails from './ProposalDetails';
import { supabase } from '../supabase';

interface ProposalHistoryProps {
  onBack: () => void;
  auth?: any;
  db?: any;
}

export interface ProposalItem {
  id: string;
  title: string;
  description?: string;
  date: string;
  score: number;
  originalProposalText: string;
  autoImprovedProposalText: string | null;
  keyHighlights: string[];
  weaknesses: string[];
  riskFlags: string[];
  nerEntities: string[];
  competitorMentions: string[];
  successProbability: string;
  improvementSuggestions: string[];
  createdAt: any;
  chunkCount?: number;
  isPdfIntelligence?: boolean;
  documentCategory?: string;
}

const ProposalHistory: React.FC<ProposalHistoryProps> = ({ onBack, auth, db }) => {
  const [proposals, setProposals] = useState<ProposalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'generated' | 'uploaded' | 'pdf'>('all');
  const [showDetails, setShowDetails] = useState(false);
  const [selectedProposalData, setSelectedProposalData] = useState<ProposalItem | null>(null);

  const fetchProposals = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Query proposals and uploaded_proposals strictly scoped to authenticated user
      const [proposalsRes, uploadedRes] = await Promise.all([
        supabase
          .from('proposals')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('uploaded_proposals')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
      ]);

      if (proposalsRes.error) {
        throw proposalsRes.error;
      }
      if (uploadedRes.error) {
        throw uploadedRes.error;
      }

      const generatedItems: ProposalItem[] = (proposalsRes.data || []).map((row: any) => ({
        id: row.id,
        title: row.title || 'Untitled Proposal',
        description: row.description || '',
        date: row.created_at ? new Date(row.created_at).toLocaleDateString() : 'Unknown Date',
        score: typeof row.score === 'number' ? row.score : 0,
        originalProposalText: row.original_proposal_text || '',
        autoImprovedProposalText: row.auto_improved_proposal_text || null,
        keyHighlights: Array.isArray(row.key_highlights) ? row.key_highlights : [],
        weaknesses: Array.isArray(row.weaknesses) ? row.weaknesses : [],
        riskFlags: Array.isArray(row.risk_flags) ? row.risk_flags : [],
        nerEntities: Array.isArray(row.ner_entities) ? row.ner_entities : [],
        competitorMentions: Array.isArray(row.competitor_mentions) ? row.competitor_mentions : [],
        successProbability: row.success_probability || 'Not estimated',
        improvementSuggestions: Array.isArray(row.improvement_suggestions) ? row.improvement_suggestions : [],
        createdAt: row.created_at,
        isPdfIntelligence: false,
      }));

      const uploadedItems: ProposalItem[] = (uploadedRes.data || []).map((row: any) => {
        const desc = row.description || '';
        const pdfMatch = desc.match(/^\[PDF_INTELLIGENCE:([^\]]+)\]:\s*(.*)$/);
        const isPdf = !!pdfMatch;
        const category = pdfMatch ? pdfMatch[1] : undefined;
        const cleanTitle = pdfMatch ? pdfMatch[2] : (desc || 'Uploaded Document');

        return {
          id: row.id,
          title: cleanTitle,
          description: isPdf ? `PDF Intelligence • ${category?.toUpperCase()}` : desc,
          date: row.created_at ? new Date(row.created_at).toLocaleDateString() : 'Unknown Date',
          score: 0,
          originalProposalText: '',
          autoImprovedProposalText: null,
          keyHighlights: [],
          weaknesses: [],
          riskFlags: [],
          nerEntities: [],
          competitorMentions: [],
          successProbability: 'N/A',
          improvementSuggestions: [],
          createdAt: row.created_at,
          chunkCount: row.chunk_count,
          isPdfIntelligence: isPdf,
          documentCategory: category,
        };
      });

      // Merge and sort in descending order of creation date
      const combined = [...generatedItems, ...uploadedItems].sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      });

      setProposals(combined);
    } catch (err: any) {
      console.error("Error fetching proposals:", err);
      setError(`Failed to load proposals: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProposals();
  }, [fetchProposals]);

  const filteredProposals = useMemo(() => {
    return proposals.filter((p) => {
      // Type filter
      if (filterType === 'generated' && p.chunkCount !== undefined) return false;
      if (filterType === 'uploaded' && (p.chunkCount === undefined || p.isPdfIntelligence)) return false;
      if (filterType === 'pdf' && !p.isPdfIntelligence) return false;

      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchTitle = p.title.toLowerCase().includes(term);
        const matchDesc = p.description?.toLowerCase().includes(term);
        return matchTitle || matchDesc;
      }
      return true;
    });
  }, [proposals, filterType, searchTerm]);

  const handleViewDetails = (proposal: ProposalItem) => {
    setSelectedProposalData(proposal);
    setShowDetails(true);
  };

  const handleBackToHistory = () => {
    setShowDetails(false);
    setSelectedProposalData(null);
    fetchProposals();
  };

  if (showDetails && selectedProposalData) {
    return <ProposalDetails proposal={selectedProposalData} onBack={handleBackToHistory} auth={auth} db={db} />;
  }

  return (
    <div className="space-y-6">
      {/* Header and Action Controls */}
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
            Proposal History & Archive
          </h1>
          <p className="text-xs sm:text-sm text-[#A7ADBD] mt-0.5">
            Access your previously generated proposals, evaluations, and uploaded document chunks.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => fetchProposals()}
            className="p-2.5 rounded-xl bg-[#151823] border border-white/[0.08] hover:border-white/[0.15] text-[#A7ADBD] hover:text-white transition-colors"
            title="Refresh list"
            aria-label="Refresh proposal list"
          >
            <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 rounded-2xl bg-[#151823] border border-white/[0.08]">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <svg className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search proposals by title or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#0B0D14] border border-white/[0.08] focus:border-[#8B5CF6] focus:ring-1 focus:ring-[#8B5CF6] focus:outline-none text-xs sm:text-sm text-[#F8FAFC] placeholder-[#64748B] transition-all"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#0B0D14] border border-white/[0.06] text-xs flex-wrap">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              filterType === 'all'
                ? 'bg-[#1B1F2C] text-white shadow-sm'
                : 'text-[#A7ADBD] hover:text-white'
            }`}
          >
            All ({proposals.length})
          </button>
          <button
            onClick={() => setFilterType('pdf')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              filterType === 'pdf'
                ? 'bg-[#1B1F2C] text-white shadow-sm'
                : 'text-[#A7ADBD] hover:text-white'
            }`}
          >
            PDF Intelligence ({proposals.filter(p => p.isPdfIntelligence).length})
          </button>
          <button
            onClick={() => setFilterType('generated')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              filterType === 'generated'
                ? 'bg-[#1B1F2C] text-white shadow-sm'
                : 'text-[#A7ADBD] hover:text-white'
            }`}
          >
            Generated ({proposals.filter(p => !p.isPdfIntelligence && p.chunkCount === undefined).length})
          </button>
          <button
            onClick={() => setFilterType('uploaded')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              filterType === 'uploaded'
                ? 'bg-[#1B1F2C] text-white shadow-sm'
                : 'text-[#A7ADBD] hover:text-white'
            }`}
          >
            Uploaded ({proposals.filter(p => !p.isPdfIntelligence && p.chunkCount !== undefined).length})
          </button>
        </div>
      </div>

      {/* Main Content Feed */}
      {loading ? (
        <div className="py-16 text-center space-y-3">
          <div className="w-10 h-10 border-2 border-[#8B5CF6] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs text-[#A7ADBD]">Loading your proposal records from Supabase...</p>
        </div>
      ) : error ? (
        <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm">
          <div className="font-semibold mb-1">Failed to Load History</div>
          <p className="text-xs text-rose-200/80">{error}</p>
        </div>
      ) : filteredProposals.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-[#151823] border border-white/[0.08] space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/[0.08] text-[#64748B] flex items-center justify-center mx-auto">
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-bold text-white">No proposals match your criteria</h3>
            <p className="text-xs text-[#A7ADBD] mt-1 max-w-sm mx-auto">
              {searchTerm
                ? 'Try adjusting your search query or switching filters.'
                : 'Generate your first AI business proposal or upload an existing text document.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredProposals.map((proposal) => {
            const isUploaded = proposal.chunkCount !== undefined;
            return (
              <div
                key={proposal.id}
                className="p-5 rounded-2xl bg-[#151823] border border-white/[0.08] hover:border-white/[0.15] hover:bg-[#1B1F2C]/60 transition-all duration-200 flex flex-col md:flex-row md:items-center justify-between gap-4 group"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    {proposal.isPdfIntelligence ? (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#8B5CF6]/15 text-[#A78BFA] border border-[#8B5CF6]/30 flex items-center gap-1">
                        <span>📄 PDF Intelligence</span>
                        {proposal.documentCategory && <span>• {proposal.documentCategory}</span>}
                      </span>
                    ) : isUploaded ? (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-500/15 text-blue-300 border border-blue-500/30">
                        Uploaded Document ({proposal.chunkCount} {proposal.chunkCount === 1 ? 'chunk' : 'chunks'})
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#8B5CF6]/15 text-[#A78BFA] border border-[#8B5CF6]/30">
                        AI Proposal
                      </span>
                    )}
                    <span className="text-[11px] text-[#64748B]">Date: {proposal.date}</span>
                  </div>

                  <h3 className="text-base font-bold text-white group-hover:text-[#A78BFA] transition-colors truncate">
                    {proposal.title}
                  </h3>

                  {proposal.description && (
                    <p className="text-xs text-[#A7ADBD] line-clamp-2 mt-1">
                      {proposal.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center space-x-3 shrink-0 self-end md:self-center">
                  {!isUploaded && (
                    <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                      proposal.score >= 75
                        ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                        : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                    }`}>
                      Score: {proposal.score}%
                    </div>
                  )}

                  <button
                    onClick={() => handleViewDetails(proposal)}
                    className="py-2 px-4 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white font-semibold text-xs rounded-xl shadow-sm shadow-[#8B5CF6]/20 transition-all flex items-center space-x-1.5"
                    aria-label={`View details for ${proposal.title}`}
                  >
                    <span>View Analysis</span>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ProposalHistory;