import { GoogleGenAI, Chat, GenerateContentResponse, Content } from "@google/genai";
import { Document, DocumentStatus, QAResponse, Citation, AgentMessage, ProcessedChunk } from '../types';
import { getAPIKey } from '../src/config/api';
import { FileParserService } from './fileParser';
import { TextChunker } from './textChunker';
import { SearchEngine } from './searchEngine';
import * as VFS from './vfs';

// --- Initialize Gemini Client ---
const getGeminiClient = () => {
    const apiKey = getAPIKey();
    if (!apiKey) {
        throw new Error('Gemini API 키가 설정되지 않았습니다. .env 파일에 VITE_GEMINI_API_KEY를 설정하세요.');
    }
    return new GoogleGenAI({ apiKey });
};

const model = 'gemini-2.5-flash';

// --- API Functions ---
const simulateDelay = (ms: number) => new Promise(res => setTimeout(res, ms));

// --- Document Management ---

export const getDocuments = async (limit?: number): Promise<Document[]> => {
  await simulateDelay(200);
  const allDocs = VFS.getDatasetFiles();
  if (limit) {
    return allDocs.slice(0, limit);
  }
  return allDocs;
};

export const uploadDocument = async (file: File): Promise<Document> => {
  const newDoc: Document = {
    doc_id: `doc-${Date.now()}`,
    filename: file.name,
    mime: file.type,
    size: file.size,
    status: DocumentStatus.PROCESSING,
    created_at: new Date().toISOString(),
    version: 1,
  };

  try {
    // Add document to VFS first
    VFS.addDatasetFile(newDoc);
    
    // Parse the file content
    const parsedContent = await FileParserService.parseFile(file);
    
    // Validate parsed content
    if (!FileParserService.validateParsedContent(parsedContent)) {
      throw new Error(`파일에서 충분한 텍스트 내용을 추출할 수 없습니다. 다른 형식의 파일을 업로드하거나 텍스트가 포함된 파일을 사용해주세요.`);
    }
    
    // Save the parsed content
    VFS.saveFileContent(newDoc.doc_id, parsedContent.text, parsedContent.metadata);
    
    // Update document status to ready
    const updatedDoc = VFS.updateDocument(newDoc.doc_id, { status: DocumentStatus.READY });
    
    await simulateDelay(300); // Simulate processing time
    return updatedDoc || newDoc;
    
  } catch (error: any) {
    // Update document status to error
    VFS.updateDocument(newDoc.doc_id, { status: DocumentStatus.ERROR });
    console.error('File upload/parsing failed:', error);
    
    const errorMessage = error.message || '알 수 없는 오류가 발생했습니다.';
    throw new Error(`${file.name} 파일 처리 실패: ${errorMessage}`);
  }
};

export const deleteDocument = async (docId: string): Promise<void> => {
    await simulateDelay(200);
    const success = VFS.removeDatasetFile(docId);
    
    if (!success) {
        throw new Error("문서를 찾을 수 없습니다.");
    }
};

export const downloadDocument = async (docId: string): Promise<void> => {
    await simulateDelay(250); // Simulate some async work
    const allDocs = VFS.getDatasetFiles();
    const doc = allDocs.find(d => d.doc_id === docId);

    if (!doc) {
        console.error(`Document with id ${docId} not found for download.`);
        throw new Error("Document not found");
    }

    const content = getDocumentContent(doc);
    // Ensure a .txt extension for plain text content
    const filename = doc.filename.split('.').slice(0, -1).join('.') + '.txt';

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};


// Get the actual content of a document from VFS
const getDocumentContent = (doc: Document): string => {
    const content = VFS.getFileContent(doc.doc_id);
    if (content) {
        return content;
    }
    
    // Fallback to mock data if no content is stored
    console.warn(`No content found for document ${doc.doc_id}, using fallback content`);
    return `이것은 '${doc.filename}' 문서의 임시 내용입니다. 파일이 아직 처리되지 않았거나 파싱에 실패했을 수 있습니다.\n\n실제 문서 내용을 보려면 파일을 다시 업로드해 주세요.`;
};

// --- RAG Dataset Creation ---

export const createQADataset = async (onProgress: (message: string) => void): Promise<{ count: number }> => {
    onProgress('업로드된 문서들을 가져옵니다...');
    const documents = await getDocuments();
    const qaData = VFS.getQAData();
    const processedDocIds = new Set(qaData.map(chunk => chunk.doc_id));

    const docsToProcess = documents.filter(doc => !processedDocIds.has(doc.doc_id));

    if (docsToProcess.length === 0) {
        onProgress('모든 문서가 이미 처리되었습니다. 새로운 문서를 업로드하여 데이터셋에 추가하세요.');
        return { count: 0 };
    }
    
    onProgress(`${docsToProcess.length}개의 새로운 문서를 처리합니다...`);
    let totalChunks = 0;

    for (const doc of docsToProcess) {
        onProgress(`'${doc.filename}' 문서를 처리 중입니다...`);
        const textContent = getDocumentContent(doc);
        
        // Use improved chunking algorithm
        const chunks = TextChunker.chunkText(textContent, {
            maxChunkSize: 800,
            minChunkSize: 50,
            overlap: 100,
            preserveParagraphs: true,
            preserveSentences: true
        });

        if (chunks.length === 0) {
            onProgress(`'${doc.filename}' 문서에서 유효한 텍스트를 찾을 수 없습니다. 건너뜁니다.`);
            continue;
        }

        onProgress(`'${doc.filename}'에서 ${chunks.length}개의 청크를 생성했습니다. 키워드를 추출합니다...`);
        
        const processedChunks: ProcessedChunk[] = [];
        for (const [index, chunk] of chunks.entries()) {
            const chunkText = chunk.text;
            try {
                const prompt = `다음 텍스트의 핵심 내용을 대표하는 검색용 키워드들을 쉼표로 구분하여 나열해 주세요. 이 키워드들은 원본 텍스트를 검색하고 찾아내는 데 사용됩니다. 문장으로 만들지 말고, 가장 중요한 단어와 구문만 나열하세요.\n\n---\n${chunkText}\n\n---\n키워드:`;
                
                const ai = getGeminiClient();
                const response = await ai.models.generateContent({
                    model,
                    contents: prompt,
                });
                const summary = response.text;
                
                processedChunks.push({
                    chunk_id: `${doc.doc_id}-chunk-${index}`,
                    doc_id: doc.doc_id,
                    doc_filename: doc.filename,
                    text: chunkText,
                    summary: summary.trim(), // 'summary' now holds keywords for embedding
                });
                onProgress(`'${doc.filename}'의 청크 ${index + 1}/${chunks.length} 처리 완료.`);
            } catch (error) {
                console.error(`Failed to process chunk ${index} for ${doc.filename}`, error);
                onProgress(`'${doc.filename}'의 청크 ${index + 1} 처리에 실패했습니다. 건너뜁니다.`);
            }
            await simulateDelay(200); // Avoid hitting API rate limits
        }

        VFS.appendToQAData(processedChunks);
        totalChunks += processedChunks.length;
        onProgress(`'${doc.filename}'의 처리된 청크를 data.json에 추가했습니다.`);
    }

    onProgress(`완료! 총 ${totalChunks}개의 새로운 청크가 처리되어 data.json에 추가되었습니다.`);
    return { count: totalChunks };
};

export const clearAndRecreateQADataset = async (onProgress: (message: string) => void): Promise<{ count: number }> => {
    onProgress('기존 QA 데이터를 모두 지웁니다...');
    VFS.clearQAData();
    await simulateDelay(200);
    // After clearing, process all documents from scratch
    const documents = await getDocuments();
    const docsToProcess = documents;
    
    onProgress(`${docsToProcess.length}개의 문서를 처음부터 다시 처리합니다...`);
    let totalChunks = 0;

    for (const doc of docsToProcess) {
        onProgress(`'${doc.filename}' 문서를 처리 중입니다...`);
        const textContent = getDocumentContent(doc);
        
        // Use improved chunking algorithm
        const chunks = TextChunker.chunkText(textContent, {
            maxChunkSize: 800,
            minChunkSize: 50,
            overlap: 100,
            preserveParagraphs: true,
            preserveSentences: true
        });

        if (chunks.length === 0) {
            onProgress(`'${doc.filename}' 문서에서 유효한 텍스트를 찾을 수 없습니다. 건너뜁니다.`);
            continue;
        }

        onProgress(`'${doc.filename}'에서 ${chunks.length}개의 청크를 생성했습니다. 키워드를 추출합니다...`);
        
        const processedChunks: ProcessedChunk[] = [];
        for (const [index, chunk] of chunks.entries()) {
            const chunkText = chunk.text;
            try {
                const prompt = `다음 텍스트의 핵심 내용을 대표하는 검색용 키워드들을 쉼표로 구분하여 나열해 주세요. 이 키워드들은 원본 텍스트를 검색하고 찾아내는 데 사용됩니다. 문장으로 만들지 말고, 가장 중요한 단어와 구문만 나열하세요.\n\n---\n${chunkText}\n\n---\n키워드:`;
                
                const ai = getGeminiClient();
                const response = await ai.models.generateContent({
                    model,
                    contents: prompt,
                });
                const summary = response.text;
                
                processedChunks.push({
                    chunk_id: `${doc.doc_id}-chunk-${index}`,
                    doc_id: doc.doc_id,
                    doc_filename: doc.filename,
                    text: chunkText,
                    summary: summary.trim(), // 'summary' now holds keywords for embedding
                });
                onProgress(`'${doc.filename}'의 청크 ${index + 1}/${chunks.length} 처리 완료.`);
            } catch (error) {
                console.error(`Failed to process chunk ${index} for ${doc.filename}`, error);
                onProgress(`'${doc.filename}'의 청크 ${index + 1} 처리에 실패했습니다. 건너뜁니다.`);
            }
            await simulateDelay(200); // Avoid hitting API rate limits
        }

        VFS.appendToQAData(processedChunks);
        totalChunks += processedChunks.length;
        onProgress(`'${doc.filename}'의 처리된 청크를 data.json에 추가했습니다.`);
    }

    onProgress(`완료! 총 ${totalChunks}개의 청크가 처리되어 data.json에 저장되었습니다.`);
    return { count: totalChunks };
};


export const getQADataJson = async (): Promise<string> => {
    await simulateDelay(100);
    const data = VFS.getQAData();
    return JSON.stringify(data, null, 2);
};

// --- Search and Chat ---

export const searchRAG = async (query: string): Promise<QAResponse> => {
    await simulateDelay(500);
    const qaData = VFS.getQAData();

    if (qaData.length === 0) {
        return {
            answer: "QA 데이터셋이 아직 생성되지 않았습니다. 관리자 페이지에서 먼저 데이터셋을 생성해주세요.",
            citations: [],
        };
    }
    
    // Use improved search engine
    const searchResults = SearchEngine.searchChunks(query, qaData, 3);
    
    if (searchResults.length === 0) {
        // Try a more lenient search with individual keywords
        const keywords = query.split(/\s+/);
        const fallbackResults: any[] = [];
        
        for (const keyword of keywords) {
            const keywordResults = SearchEngine.searchChunks(keyword, qaData, 1);
            fallbackResults.push(...keywordResults);
        }
        
        if (fallbackResults.length === 0) {
            return { 
                answer: `'${query}'에 대한 관련 정보를 문서에서 찾을 수 없습니다. 다른 키워드로 검색해보시거나 관련 문서를 추가로 업로드해주세요.`, 
                citations: [] 
            };
        }
        
        // Use fallback results
        const topChunks = fallbackResults.slice(0, 2).map(result => result.chunk);
        return await generateAnswerFromChunks(query, topChunks);
    }

    const topChunks = searchResults.map(result => result.chunk);
    return await generateAnswerFromChunks(query, topChunks);
};

// Helper function to generate answer from chunks
const generateAnswerFromChunks = async (query: string, chunks: ProcessedChunk[]): Promise<QAResponse> => {
    if (chunks.length === 0) {
        return { answer: `'${query}'에 대한 관련 정보를 문서에서 찾을 수 없습니다.`, citations: [] };
    }

    const context = chunks.map(c => `문서: ${c.doc_filename}\n내용: ${c.text}`).join('\n\n---\n\n');
    const prompt = `당신은 문서 기반 질의응답 AI입니다. 다음 컨텍스트를 사용하여 사용자의 질문에 답변하세요. 답변은 컨텍스트에 있는 정보에만 근거해야 합니다. 컨텍스트에서 답변을 찾을 수 없으면 "제공된 문서에서 답변을 찾을 수 없습니다."라고 말하세요.\n\n## 컨텍스트\n${context}\n\n## 질문\n${query}\n\n## 답변\n`;

    try {
        const ai = getGeminiClient();
        const response = await ai.models.generateContent({
            model,
            contents: prompt,
        });

        const citations: Citation[] = chunks.map(c => ({
            doc_id: c.doc_id,
            filename: c.doc_filename,
            page_no: 1, // Simplified, as we don't have page info
            chunk_id: c.chunk_id,
            quote: c.text,
            page_image_uri: ''
        }));

        return { answer: response.text, citations };
    } catch (error) {
        console.error('Failed to generate answer:', error);
        return { 
            answer: `죄송합니다. 답변 생성 중 오류가 발생했습니다: ${error.message}`, 
            citations: [] 
        };
    }
};

export const chatWithAgent = async (history: AgentMessage[], query: string): Promise<AgentMessage> => {
    const qaData = VFS.getQAData();

    let context = "사용자의 질문에 답하기 위해 참고할 수 있는 추가적인 문서 정보가 없습니다.";
    if (qaData.length > 0) {
        // Use improved search engine for better context
        const searchResults = SearchEngine.searchChunks(query, qaData, 2);
        
        if (searchResults.length > 0) {
            const topChunks = searchResults.map(result => result.chunk);
            context = "다음은 사용자의 질문과 관련이 있을 수 있는 문서에서 추출한 정보입니다:\n\n" + 
                      topChunks.map(c => `문서 '${c.doc_filename}'에서 발췌:\n${c.text}`).join('\n\n---\n\n');
        }
    }

    const systemInstruction = `[시스템 지침]
당신은 지식 검색(RAG)과 창의적 해석을 결합해 전문 비즈니스 전략 문서를 편집·구조화하는 AI 어시스턴트입니다.
검색된 문서는 신뢰할 수 있는 사실 기반 자료이며, 사용자의 질문 의도에 맞춰 논리적 흐름으로 재구성해야 합니다.

[출력 구조]
1. 서론
   - 배경 및 문제 정의
   - 핵심 목표의 의미와 상징성 
   - 비유·메시지 제시

2. 본론: 핵심 전략
   [전략 1 제목]
     • 핵심: (한 줄 요약)
     • 근거: (문서에서 발췌한 주요 사실/데이터)
     • 해석: (전략적 시사점과 의미)
     • 실행 제안: (구체적 실행 방안)
   
   [추가 전략들도 동일 구조로 반복]

3. 결론
   - 전략적 요약
   - 목표 달성의 본질적 의미
   - 상징적 비유/메타포
   - 다음 단계 제안 (KPI, 로드맵, 성과 확산 방안)

[작성 규칙]
- 소제목은 명사형으로, 번호 부여
- 한 항목당 5줄 이내 요약
- 불필요한 형용사·중복 서술 제거
- 문장은 간결하고 명확하게
- 숫자와 데이터는 강조 처리
- 불확실한 정보는 명시적으로 표시
- 마크다운 서식 사용 가능

## 관련 문서 컨텍스트
${context}`;

    const geminiHistory: Content[] = history.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }],
    }));

    const ai = getGeminiClient();
    const chat: Chat = ai.chats.create({
        model: model,
        history: geminiHistory,
        config: { systemInstruction },
    });

    const response: GenerateContentResponse = await chat.sendMessage({ message: query });
    const agentResponseText = response.text;

    return {
        id: `msg-${Date.now()}`,
        role: 'agent',
        content: agentResponseText,
        timestamp: new Date().toISOString()
    };
};