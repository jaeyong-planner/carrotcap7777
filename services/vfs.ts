import { Document, ProcessedChunk, DocumentStatus, AgentMessage } from '../types';

const VFS_KEY = 'rag_agent_vfs';
const VFS_CONTENT_KEY = 'rag_agent_file_contents';
const HISTORY_KEY = 'rag_agent_history';

interface VFS {
  dataset: Document[];
  qa_data: ProcessedChunk[];
}

interface FileContentStorage {
  [docId: string]: {
    content: string;
    metadata?: {
      title?: string;
      author?: string;
      pages?: number;
    };
  };
}

interface ChatHistory {
  id: string;
  title: string;
  messages: AgentMessage[];
  created_at: string;
  updated_at: string;
}

const getVFS = (): VFS => {
  try {
    const rawVFS = localStorage.getItem(VFS_KEY);
    if (rawVFS) {
      return JSON.parse(rawVFS);
    }
  } catch (e) {
    console.error("Failed to parse VFS from localStorage", e);
  }
  // Default structure
  return { dataset: [], qa_data: [] };
};

const saveVFS = (vfs: VFS) => {
  localStorage.setItem(VFS_KEY, JSON.stringify(vfs));
};

const getFileContents = (): FileContentStorage => {
  try {
    const rawContents = localStorage.getItem(VFS_CONTENT_KEY);
    if (rawContents) {
      return JSON.parse(rawContents);
    }
  } catch (e) {
    console.error("Failed to parse file contents from localStorage", e);
  }
  return {};
};

const saveFileContents = (contents: FileContentStorage) => {
  localStorage.setItem(VFS_CONTENT_KEY, JSON.stringify(contents));
};

export const initVFS = () => {
    if (!localStorage.getItem(VFS_KEY)) {
        const initialVFS: VFS = { dataset: [], qa_data: [] };
        saveVFS(initialVFS);
    }
    if (!localStorage.getItem(VFS_CONTENT_KEY)) {
        const initialContents: FileContentStorage = {};
        saveFileContents(initialContents);
    }
};

export const getDatasetFiles = (): Document[] => {
  const vfs = getVFS();
  // Sort by creation date, newest first.
  return vfs.dataset.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
};

export const addDatasetFile = (doc: Document) => {
  const vfs = getVFS();
  // Add to the beginning of the array to keep it sorted by newest first
  vfs.dataset.unshift(doc);
  saveVFS(vfs);
};

export const getQAData = (): ProcessedChunk[] => {
  const vfs = getVFS();
  return vfs.qa_data;
};

export const appendToQAData = (newChunks: ProcessedChunk[]) => {
  const vfs = getVFS();
  // Avoid duplicates based on chunk_id
  const existingChunkIds = new Set(vfs.qa_data.map(c => c.chunk_id));
  const uniqueNewChunks = newChunks.filter(c => !existingChunkIds.has(c.chunk_id));
  
  vfs.qa_data.push(...uniqueNewChunks);
  saveVFS(vfs);
};

export const clearQAData = () => {
    const vfs = getVFS();
    vfs.qa_data = [];
    saveVFS(vfs);
};

// File content management functions
export const saveFileContent = (docId: string, content: string, metadata?: any) => {
    const contents = getFileContents();
    contents[docId] = { content, metadata };
    saveFileContents(contents);
};

export const getFileContent = (docId: string): string | null => {
    const contents = getFileContents();
    return contents[docId]?.content || null;
};

export const getFileMetadata = (docId: string) => {
    const contents = getFileContents();
    return contents[docId]?.metadata || null;
};

export const deleteFileContent = (docId: string) => {
    const contents = getFileContents();
    delete contents[docId];
    saveFileContents(contents);
};

// Document update function
export const updateDocument = (docId: string, updates: Partial<Document>) => {
    const vfs = getVFS();
    const docIndex = vfs.dataset.findIndex(doc => doc.doc_id === docId);
    
    if (docIndex >= 0) {
        vfs.dataset[docIndex] = { ...vfs.dataset[docIndex], ...updates };
        saveVFS(vfs);
        return vfs.dataset[docIndex];
    }
    
    return null;
};

export const removeDatasetFile = (docId: string) => {
    const vfs = getVFS();
    const docIndex = vfs.dataset.findIndex(doc => doc.doc_id === docId);
    
    if (docIndex >= 0) {
        vfs.dataset.splice(docIndex, 1);
        saveVFS(vfs);
        
        // Also remove file content
        deleteFileContent(docId);
        
        // Remove related QA data chunks
        vfs.qa_data = vfs.qa_data.filter(chunk => chunk.doc_id !== docId);
        saveVFS(vfs);
        
        return true;
    }
    
    return false;
};

// Chat history management functions
const getChatHistories = (): ChatHistory[] => {
  try {
    const rawHistories = localStorage.getItem(HISTORY_KEY);
    if (rawHistories) {
      return JSON.parse(rawHistories);
    }
  } catch (e) {
    console.error("Failed to parse chat histories from localStorage", e);
  }
  return [];
};

const saveChatHistories = (histories: ChatHistory[]) => {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(histories));
};

export const getChatHistory = (): ChatHistory[] => {
  const histories = getChatHistories();
  return histories.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
};

export const saveChatSession = (messages: AgentMessage[]): string => {
  if (messages.length === 0) return '';
  
  const histories = getChatHistories();
  const title = messages[0]?.content?.substring(0, 30) + '...' || '새로운 대화';
  const sessionId = `chat-${Date.now()}`;
  
  const newHistory: ChatHistory = {
    id: sessionId,
    title,
    messages,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  histories.push(newHistory);
  saveChatHistories(histories);
  return sessionId;
};

export const loadChatSession = (sessionId: string): AgentMessage[] => {
  const histories = getChatHistories();
  const session = histories.find(h => h.id === sessionId);
  return session?.messages || [];
};

export const deleteChatSession = (sessionId: string): boolean => {
  const histories = getChatHistories();
  const index = histories.findIndex(h => h.id === sessionId);
  
  if (index >= 0) {
    histories.splice(index, 1);
    saveChatHistories(histories);
    return true;
  }
  return false;
};

export const clearChatHistory = () => {
  localStorage.removeItem(HISTORY_KEY);
};
