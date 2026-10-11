export interface RoadmapFeature {
  id: string;
  title: string;
  description: string;
  isActive: boolean;
}

export interface Profile {
  id: string;
  name: string | null;
  email: string | null;
  total_proposals: number;
  created_at?: string;
}

export interface ProposalRow {
  id: string;
  user_id: string;
  username: string;
  title: string;
  description: string;
  pages: number;
  original_proposal_text: string;
  auto_improved_proposal_text: string | null;
  score: number;
  key_highlights: string[];
  weaknesses: string[];
  risk_flags: string[];
  ner_entities: string[];
  competitor_mentions: string[];
  success_probability: string;
  improvement_suggestions: string[];
  created_at: string;
}

export interface UploadedProposalRow {
  id: string;
  user_id: string;
  description: string;
  chunk_count: number;
  uploaded_by: string;
  created_at: string;
}

export interface ProposalChunkRow {
  uploaded_proposal_id: string;
  index: number;
  text: string;
}

export type DocumentCategory =
  | 'proposal'
  | 'research'
  | 'manual'
  | 'contract'
  | 'report'
  | 'general';

export interface ExtractedPage {
  pageNumber: number;
  text: string;
  characterCount: number;
}

export interface PdfExtractionResult {
  fileName: string;
  fileSize: number;
  pageCount: number;
  pages: ExtractedPage[];
  fullText: string;
  totalCharacters: number;
  isScannedOnly: boolean;
  isEncrypted?: boolean;
}

export interface FindingItem {
  topic: string;
  finding: string;
  pageRef?: number | string;
}

export interface DetailedSection {
  sectionTitle: string;
  content: string;
  keyPoints: string[];
}

export interface PdfAnalysisResult {
  documentTitle: string;
  detectedCategory: DocumentCategory | string;
  executiveSummary: string;
  mainFindings: FindingItem[];
  detailedAnalysis: DetailedSection[];
  strengthsAndWeaknesses?: {
    strengths: string[];
    weaknesses: string[];
  };
  risksAndGaps: string[];
  actionableRecommendations: string[];
  limitations: string[];
  analyzedAt: string;
  pageCount: number;
  fileName: string;
}