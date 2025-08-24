import mammoth from 'mammoth';

export interface ParsedContent {
  text: string;
  metadata?: {
    title?: string;
    author?: string;
    pages?: number;
  };
}

export class FileParserService {
  static async parseFile(file: File): Promise<ParsedContent> {
    const fileType = file.type || this.getFileTypeFromName(file.name);
    
    switch (fileType) {
      case 'application/pdf':
        return this.parsePDF(file);
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        return this.parseDOCX(file);
      case 'application/vnd.openxmlformats-officedocument.presentationml.presentation':
        return this.parsePPTX(file);
      case 'text/plain':
        return this.parseTXT(file);
      default:
        throw new Error(`지원되지 않는 파일 형식: ${fileType}`);
    }
  }

  private static getFileTypeFromName(fileName: string): string {
    const ext = fileName.toLowerCase().split('.').pop();
    switch (ext) {
      case 'pdf': return 'application/pdf';
      case 'docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      case 'pptx': return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
      case 'txt': return 'text/plain';
      case 'hwp': return 'application/x-hwp';
      default: return 'unknown';
    }
  }

  private static async parsePDF(file: File): Promise<ParsedContent> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const text = await this.extractTextFromPDFBuffer(arrayBuffer);
      return {
        text,
        metadata: {
          title: file.name,
          pages: 1 // Placeholder
        }
      };
    } catch (error) {
      throw new Error(`PDF 파일 파싱 실패: ${error.message || 'PDF 파일을 읽을 수 없습니다'}`);
    }
  }

  private static async extractTextFromPDFBuffer(arrayBuffer: ArrayBuffer): Promise<string> {
    // Basic text extraction from PDF bytes
    const uint8Array = new Uint8Array(arrayBuffer);
    const decoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: false });
    let rawText = decoder.decode(uint8Array);
    
    // Try to extract text between stream objects
    const streamMatches = rawText.match(/stream\s+(.*?)\s+endstream/gs);
    let extractedText = '';
    
    if (streamMatches) {
      streamMatches.forEach(match => {
        const streamContent = match.replace(/^stream\s+/, '').replace(/\s+endstream$/, '');
        // Simple text extraction - look for readable text
        const textContent = streamContent.match(/[\x20-\x7E\uAC00-\uD7A3]+/g);
        if (textContent) {
          extractedText += textContent.join(' ') + ' ';
        }
      });
    }
    
    // If no stream text found, try general text extraction
    if (!extractedText.trim()) {
      const textMatches = rawText.match(/[\x20-\x7E\uAC00-\uD7A3]{3,}/g);
      if (textMatches) {
        extractedText = textMatches.join(' ');
      }
    }
    
    // Clean up the text
    extractedText = extractedText
      .replace(/\s+/g, ' ')
      .replace(/[^\x20-\x7E\uAC00-\uD7A3]/g, ' ')
      .trim();
    
    if (!extractedText || extractedText.length < 20) {
      return `PDF 파일 "${arrayBuffer.byteLength} bytes" - 텍스트 추출이 제한됩니다. PDF가 스캔된 이미지이거나 보호된 파일일 수 있습니다. 텍스트 형태로 다시 저장하여 업로드해주세요.`;
    }
    
    return extractedText;
  }

  private static async parseDOCX(file: File): Promise<ParsedContent> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      
      if (!result.value || result.value.trim().length === 0) {
        throw new Error('DOCX 파일에서 텍스트를 추출할 수 없습니다.');
      }
      
      return {
        text: result.value,
        metadata: {
          title: file.name
        }
      };
    } catch (error) {
      throw new Error(`DOCX 파일 파싱 실패: ${error.message}`);
    }
  }

  private static async parsePPTX(file: File): Promise<ParsedContent> {
    try {
      // PPTX parsing is complex - for now we'll provide a basic implementation
      const arrayBuffer = await file.arrayBuffer();
      // This would require a proper PPTX parsing library
      // For now, we'll extract what we can
      const text = await this.extractTextFromPPTX(arrayBuffer);
      
      return {
        text,
        metadata: {
          title: file.name
        }
      };
    } catch (error) {
      throw new Error(`PPTX 파일 파싱 실패: ${error.message}`);
    }
  }

  private static async extractTextFromPPTX(arrayBuffer: ArrayBuffer): Promise<string> {
    // PPTX is a ZIP file containing XML files
    try {
      const uint8Array = new Uint8Array(arrayBuffer);
      const decoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: false });
      let rawText = decoder.decode(uint8Array);
      
      // Look for XML text content patterns
      const textMatches = rawText.match(/>([^<]*\w[^<]*)</g);
      let extractedText = '';
      
      if (textMatches) {
        textMatches.forEach(match => {
          const content = match.replace(/^>/, '').replace(/<$/, '').trim();
          if (content.length > 2 && /[\w\uAC00-\uD7A3]/.test(content)) {
            extractedText += content + ' ';
          }
        });
      }
      
      // Clean up the text
      extractedText = extractedText
        .replace(/\s+/g, ' ')
        .replace(/[^\x20-\x7E\uAC00-\uD7A3]/g, ' ')
        .trim();
      
      if (!extractedText || extractedText.length < 20) {
        return `PPTX 파일 "${Math.round(arrayBuffer.byteLength / 1024)}KB" - 프레젠테이션 파일입니다. 텍스트 추출이 제한적입니다. 가능하면 텍스트 파일로 내용을 복사하여 업로드해주세요.`;
      }
      
      return extractedText;
    } catch (error) {
      return `PPTX 파일 처리 중 오류가 발생했습니다. 텍스트 파일로 변환하여 업로드해주세요.`;
    }
  }

  private static async parseTXT(file: File): Promise<ParsedContent> {
    try {
      const text = await file.text();
      return {
        text,
        metadata: {
          title: file.name
        }
      };
    } catch (error) {
      throw new Error(`TXT 파일 파싱 실패: ${error.message}`);
    }
  }

  // Helper method to validate file content
  static validateParsedContent(content: ParsedContent): boolean {
    return content.text && content.text.trim().length > 10;
  }

  // Helper method to estimate reading time
  static estimateReadingTime(text: string): number {
    const wordsPerMinute = 200;
    const words = text.split(/\s+/).length;
    return Math.ceil(words / wordsPerMinute);
  }
}