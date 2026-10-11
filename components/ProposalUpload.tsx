import React, { useState } from 'react';
import { supabase } from '../supabase';

interface ProposalUploadProps {
  onBack: () => void;
}

const ProposalUpload: React.FC<ProposalUploadProps> = ({ onBack }) => {
  const [proposalText, setProposalText] = useState<string>('');
  const [uploadDescription, setUploadDescription] = useState<string>('');
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadSuccessMessage, setUploadSuccessMessage] = useState<string | null>(null);
  const [uploadErrorMessage, setUploadErrorMessage] = useState<string | null>(null);

  const CHUNK_SIZE = 900 * 1024; // 900KB safe chunk limit
  const estimatedChunks = Math.max(1, Math.ceil(proposalText.length / CHUNK_SIZE));

  const handleUploadProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadLoading(true);
    setUploadErrorMessage(null);
    setUploadSuccessMessage(null);

    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      setUploadErrorMessage("You must be logged in to upload a proposal.");
      setUploadLoading(false);
      return;
    }

    if (!proposalText.trim()) {
      setUploadErrorMessage("Please enter or paste the proposal text.");
      setUploadLoading(false);
      return;
    }

    if (!uploadDescription.trim()) {
      setUploadErrorMessage("Please provide a short description for this upload.");
      setUploadLoading(false);
      return;
    }

    try {
      const totalChunks = Math.ceil(proposalText.length / CHUNK_SIZE);
      const uploaderName =
        (authUser.user_metadata?.name as string) ||
        (authUser.user_metadata?.full_name as string) ||
        authUser.email ||
        'Anonymous';

      // 1. Insert row into uploaded_proposals
      const { data: uploadedRow, error: uploadErr } = await supabase
        .from('uploaded_proposals')
        .insert({
          user_id: authUser.id,
          description: uploadDescription.trim(),
          chunk_count: totalChunks,
          uploaded_by: uploaderName,
          created_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (uploadErr || !uploadedRow) {
        throw new Error(uploadErr?.message || 'Failed to create uploaded proposal entry');
      }

      const uploadedProposalId = uploadedRow.id;

      // 2. Prepare chunks
      const chunkRows = [];
      for (let i = 0; i < totalChunks; i++) {
        const chunkContent = proposalText.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
        chunkRows.push({
          uploaded_proposal_id: uploadedProposalId,
          index: i,
          text: chunkContent,
        });
      }

      // 3. Insert chunks into proposal_chunks
      const { error: chunkErr } = await supabase
        .from('proposal_chunks')
        .insert(chunkRows);

      if (chunkErr) {
        throw chunkErr;
      }

      // 4. Atomically update total_proposals in profiles using secure no-arg RPC
      const { error: counterErr } = await supabase.rpc('increment_user_proposals');
      if (counterErr) {
        console.warn("RPC increment_user_proposals fallback triggered in upload:", counterErr.message);
        // Fallback update strictly for verified authUser.id if RPC is not yet registered in schema cache
        const { data: profile } = await supabase
          .from('profiles')
          .select('total_proposals')
          .eq('id', authUser.id)
          .single();

        if (profile) {
          const { error: updateErr } = await supabase
            .from('profiles')
            .update({ total_proposals: (profile.total_proposals ?? 0) + 1 })
            .eq('id', authUser.id);
          if (updateErr) {
            throw new Error(`Proposal uploaded, but failed to update counter: ${updateErr.message}`);
          }
        } else {
          const { error: upsertErr } = await supabase
            .from('profiles')
            .upsert({
              id: authUser.id,
              email: authUser.email,
              name: uploaderName,
              total_proposals: 1,
              created_at: new Date().toISOString(),
            });
          if (upsertErr) {
            throw new Error(`Proposal uploaded, but failed to initialize profile counter: ${upsertErr.message}`);
          }
        }
      }

      setUploadSuccessMessage(
        `Proposal text uploaded successfully! Stored in ${totalChunks} ${totalChunks === 1 ? 'chunk' : 'chunks'} with profile counter updated.`
      );
      setProposalText('');
      setUploadDescription('');
    } catch (err: any) {
      console.error("Error uploading proposal:", err);
      setUploadErrorMessage(`Failed to upload proposal: ${err.message || 'Unknown error'}`);
    } finally {
      setUploadLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
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
            Manual Proposal Text Archive
          </h1>
          <p className="text-xs sm:text-sm text-[#A7ADBD] mt-0.5">
            Archive large, unformatted proposal manuscripts. Documents are automatically partitioned into 900KB cloud chunks for high-throughput resilience.
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto">
        <div className="bg-[#151823] rounded-2xl border border-white/[0.08] p-6 sm:p-8 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#8B5CF6] to-transparent opacity-80" />

          {/* Feedback messages */}
          {uploadErrorMessage && (
            <div role="alert" className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs sm:text-sm flex items-start space-x-2.5">
              <svg className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{uploadErrorMessage}</span>
            </div>
          )}

          {uploadSuccessMessage && (
            <div role="status" className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs sm:text-sm flex items-start space-x-2.5">
              <svg className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>{uploadSuccessMessage}</span>
            </div>
          )}

          <form onSubmit={handleUploadProposal} className="space-y-5">
            {/* Short Description */}
            <div>
              <label htmlFor="uploadDescription" className="block text-xs font-semibold uppercase tracking-wider text-[#A7ADBD] mb-1.5">
                Proposal Title or Short Description
              </label>
              <input
                type="text"
                id="uploadDescription"
                className="w-full px-4 py-2.5 rounded-xl bg-[#0B0D14] border border-white/[0.08] focus:border-[#8B5CF6] focus:ring-1 focus:ring-[#8B5CF6] focus:outline-none text-[#F8FAFC] placeholder-[#64748B] text-sm transition-all"
                placeholder="e.g., Q3 Energy Optimization Proposal for Client X"
                value={uploadDescription}
                onChange={(e) => setUploadDescription(e.target.value)}
                required
                disabled={uploadLoading}
              />
            </div>

            {/* Proposal Text */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="proposalText" className="block text-xs font-semibold uppercase tracking-wider text-[#A7ADBD]">
                  Paste Full Proposal Content
                </label>
                <div className="flex items-center space-x-2 text-[11px] text-[#64748B]">
                  <span>{proposalText.length.toLocaleString()} characters</span>
                  <span>•</span>
                  <span className="text-[#A78BFA]">{estimatedChunks} {estimatedChunks === 1 ? 'chunk' : 'chunks'}</span>
                </div>
              </div>
              <textarea
                id="proposalText"
                rows={12}
                className="w-full p-4 rounded-xl bg-[#0B0D14] border border-white/[0.08] focus:border-[#8B5CF6] focus:ring-1 focus:ring-[#8B5CF6] focus:outline-none text-[#F8FAFC] placeholder-[#64748B] text-sm leading-relaxed transition-all font-sans resize-y"
                placeholder="Paste the full text of your existing business proposal here. Unlimited document length supported through automated chunking..."
                value={proposalText}
                onChange={(e) => setProposalText(e.target.value)}
                required
                disabled={uploadLoading}
              />
            </div>

            {/* Architecture Explainer Pill */}
            <div className="p-3.5 rounded-xl bg-[#10131C] border border-white/[0.06] flex items-center space-x-3 text-xs text-[#A7ADBD]">
              <svg className="w-5 h-5 text-[#8B5CF6] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>
                Texts exceeding 900KB are partitioned into sequential chunks in <code className="text-[#A78BFA]">proposal_chunks</code> and seamlessly reconstructed when viewed.
              </span>
            </div>

            {/* Submit Action */}
            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-3.5 px-6 bg-[#8B5CF6] hover:bg-[#7C3AED] active:scale-[0.99] text-white font-semibold text-sm rounded-xl shadow-lg shadow-[#8B5CF6]/25 focus:outline-none focus:ring-2 focus:ring-[#8B5CF6] focus:ring-offset-2 focus:ring-offset-[#151823] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2.5"
                disabled={uploadLoading}
              >
                {uploadLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                    </svg>
                    <span>Partitioning & Uploading Chunks...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    <span>Save & Archive Proposal</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProposalUpload;
