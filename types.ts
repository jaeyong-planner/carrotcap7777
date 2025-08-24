
export enum DocumentStatus {
  QUEUED = 'queued',
  PROCESSING = 'processing',
  READY = 'ready',
  ERROR = 'error',
}

export interface Document {
  doc_id: string;
  filename: string;
  mime: string;
  size: number;
  status: DocumentStatus;
  created_at: string;
  version: number;
}

export interface Page {
  page_id: string;
  doc_id: string;
  page_no: number;
  image_uri: string;
  text: string;
}

export interface Chunk {
  chunk_id: string;
  doc_id: string;
  page_id: string;
  order: number;
  text: string;
  token_count: number;
  section_path: string;
  highlight_bbox?: number[];
}

export interface DocumentDetails extends Document {
  pages: Page[];
  chunks: Chunk[];
}

// New type for our processed data in data.json
export interface ProcessedChunk {
  chunk_id: string;
  doc_id: string;
  doc_filename: string;
  text: string;
  summary: string; // "Embedding" from Gemini
}


export interface Citation {
  doc_id: string;
  page_no: number;
  chunk_id: string;
  quote: string;
  page_image_uri: string;
  filename: string;
}

export interface QAResponse {
  answer: string;
  citations: Citation[];
}

export interface AgentMessage {
  id: string;
  role: 'user' | 'agent';
  content: string;
  citations?: Citation[];
  used_tools?: string[];
  timestamp: string;
}
