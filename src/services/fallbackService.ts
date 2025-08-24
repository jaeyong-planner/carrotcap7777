import { ProcessedChunk } from '../types';

export interface FallbackResponse {
  success: boolean;
  message: string;
  data?: any;
  fallbackUsed: boolean;
}

export class FallbackService {
  private static instance: FallbackService;
  private fallbackData: Map<string, any> = new Map();

  static getInstance(): FallbackService {
    if (!FallbackService.instance) {
      FallbackService.instance = new FallbackService();
    }
    return FallbackService.instance;
  }

  // 기본 텍스트 요약 생성 (API 실패 시 사용)
  generateBasicSummary(text: string, maxLength: number = 200): string {
    if (text.length <= maxLength) {
      return text;
    }

    // 간단한 문장 단위 요약
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    let summary = '';
    let currentLength = 0;

    for (const sentence of sentences) {
      const trimmedSentence = sentence.trim();
      if (currentLength + trimmedSentence.length <= maxLength) {
        summary += (summary ? ' ' : '') + trimmedSentence;
        currentLength += trimmedSentence.length;
      } else {
        break;
      }
    }

    return summary + (summary.length < text.length ? '...' : '');
  }

  // 키워드 추출 (간단한 버전)
  extractKeywords(text: string, maxKeywords: number = 5): string[] {
    const words = text.toLowerCase()
      .replace(/[^\w\s가-힣]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 1);

    const wordCount = new Map<string, number>();
    
    for (const word of words) {
      wordCount.set(word, (wordCount.get(word) || 0) + 1);
    }

    return Array.from(wordCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxKeywords)
      .map(([word]) => word);
  }

  // 문서 처리 폴백
  processDocumentFallback(filename: string, content: string): ProcessedChunk[] {
    const chunks: ProcessedChunk[] = [];
    const chunkSize = 1000; // 1000자 단위로 청크 분할
    
    for (let i = 0; i < content.length; i += chunkSize) {
      const chunkText = content.slice(i, i + chunkSize);
      const chunkId = `fallback_chunk_${filename}_${i}`;
      
      chunks.push({
        chunk_id: chunkId,
        doc_id: `fallback_doc_${filename}`,
        doc_filename: filename,
        text: chunkText,
        summary: this.generateBasicSummary(chunkText),
      });
    }

    return chunks;
  }

  // API 응답 폴백
  createFallbackResponse(message: string, data?: any): FallbackResponse {
    return {
      success: true,
      message: `폴백 모드: ${message}`,
      data,
      fallbackUsed: true,
    };
  }

  // 에러 메시지 생성
  getErrorMessage(errorType: string): string {
    const errorMessages: Record<string, string> = {
      'API_KEY_INVALID': 'API 키가 유효하지 않습니다. 환경 변수를 확인하세요.',
      'API_REQUEST_FAILED': 'API 요청에 실패했습니다. 네트워크 연결을 확인하세요.',
      'DOCUMENT_PROCESSING_FAILED': '문서 처리에 실패했습니다. 폴백 모드로 진행합니다.',
      'NETWORK_ERROR': '네트워크 오류가 발생했습니다. 연결을 확인하세요.',
      'UNKNOWN_ERROR': '알 수 없는 오류가 발생했습니다.',
    };

    return errorMessages[errorType] || '알 수 없는 오류가 발생했습니다.';
  }
}

export const fallbackService = FallbackService.getInstance();
