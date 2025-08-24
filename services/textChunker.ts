export interface ChunkOptions {
  maxChunkSize?: number;
  minChunkSize?: number;
  overlap?: number;
  preserveParagraphs?: boolean;
  preserveSentences?: boolean;
}

export interface TextChunk {
  text: string;
  startIndex: number;
  endIndex: number;
  chunkNumber: number;
}

export class TextChunker {
  private static readonly DEFAULT_OPTIONS: Required<ChunkOptions> = {
    maxChunkSize: 1000,
    minChunkSize: 100,
    overlap: 100,
    preserveParagraphs: true,
    preserveSentences: true
  };

  static chunkText(text: string, options: ChunkOptions = {}): TextChunk[] {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };
    
    if (!text || text.trim().length === 0) {
      return [];
    }

    // Clean up the text
    const cleanText = this.cleanText(text);
    
    // Try different chunking strategies based on options
    if (opts.preserveParagraphs) {
      const paragraphChunks = this.chunkByParagraphs(cleanText, opts);
      if (paragraphChunks.length > 0) {
        return paragraphChunks;
      }
    }

    if (opts.preserveSentences) {
      return this.chunkBySentences(cleanText, opts);
    }

    // Fallback to simple fixed-size chunking
    return this.chunkBySize(cleanText, opts);
  }

  private static cleanText(text: string): string {
    return text
      .replace(/\r\n/g, '\n') // Normalize line endings
      .replace(/\n{3,}/g, '\n\n') // Reduce multiple newlines to double
      .replace(/[ \t]+/g, ' ') // Normalize whitespace
      .trim();
  }

  private static chunkByParagraphs(text: string, opts: Required<ChunkOptions>): TextChunk[] {
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length >= opts.minChunkSize);
    const chunks: TextChunk[] = [];
    let currentChunk = '';
    let currentStartIndex = 0;
    let chunkNumber = 0;

    for (let i = 0; i < paragraphs.length; i++) {
      const paragraph = paragraphs[i].trim();
      
      // If adding this paragraph would exceed max size, finalize current chunk
      if (currentChunk.length > 0 && (currentChunk.length + paragraph.length) > opts.maxChunkSize) {
        chunks.push({
          text: currentChunk.trim(),
          startIndex: currentStartIndex,
          endIndex: currentStartIndex + currentChunk.length,
          chunkNumber: chunkNumber++
        });

        // Start new chunk with overlap if specified
        if (opts.overlap > 0) {
          const overlapText = this.getOverlapText(currentChunk, opts.overlap);
          currentChunk = overlapText + '\n\n' + paragraph;
        } else {
          currentChunk = paragraph;
        }
        currentStartIndex = text.indexOf(paragraph, currentStartIndex);
      } else {
        // Add paragraph to current chunk
        if (currentChunk.length > 0) {
          currentChunk += '\n\n' + paragraph;
        } else {
          currentChunk = paragraph;
          currentStartIndex = text.indexOf(paragraph);
        }
      }
    }

    // Add the last chunk if it has content
    if (currentChunk.trim().length >= opts.minChunkSize) {
      chunks.push({
        text: currentChunk.trim(),
        startIndex: currentStartIndex,
        endIndex: currentStartIndex + currentChunk.length,
        chunkNumber: chunkNumber
      });
    }

    return chunks.length > 0 ? chunks : this.chunkBySentences(text, opts);
  }

  private static chunkBySentences(text: string, opts: Required<ChunkOptions>): TextChunk[] {
    // Korean and English sentence splitting
    const sentences = text.split(/(?<=[.!?])\s+|(?<=[.])\s+|(?<=[!?])\s+/).filter(s => s.trim().length > 0);
    const chunks: TextChunk[] = [];
    let currentChunk = '';
    let currentStartIndex = 0;
    let chunkNumber = 0;

    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i].trim();
      
      if (currentChunk.length > 0 && (currentChunk.length + sentence.length) > opts.maxChunkSize) {
        if (currentChunk.trim().length >= opts.minChunkSize) {
          chunks.push({
            text: currentChunk.trim(),
            startIndex: currentStartIndex,
            endIndex: currentStartIndex + currentChunk.length,
            chunkNumber: chunkNumber++
          });
        }

        // Start new chunk with overlap
        if (opts.overlap > 0) {
          const overlapText = this.getOverlapText(currentChunk, opts.overlap);
          currentChunk = overlapText + ' ' + sentence;
        } else {
          currentChunk = sentence;
        }
        currentStartIndex = text.indexOf(sentence, currentStartIndex);
      } else {
        if (currentChunk.length > 0) {
          currentChunk += ' ' + sentence;
        } else {
          currentChunk = sentence;
          currentStartIndex = text.indexOf(sentence);
        }
      }
    }

    // Add the last chunk
    if (currentChunk.trim().length >= opts.minChunkSize) {
      chunks.push({
        text: currentChunk.trim(),
        startIndex: currentStartIndex,
        endIndex: currentStartIndex + currentChunk.length,
        chunkNumber: chunkNumber
      });
    }

    return chunks.length > 0 ? chunks : this.chunkBySize(text, opts);
  }

  private static chunkBySize(text: string, opts: Required<ChunkOptions>): TextChunk[] {
    const chunks: TextChunk[] = [];
    let chunkNumber = 0;

    for (let i = 0; i < text.length; i += opts.maxChunkSize - opts.overlap) {
      const chunkText = text.substring(i, i + opts.maxChunkSize);
      
      if (chunkText.trim().length >= opts.minChunkSize) {
        chunks.push({
          text: chunkText.trim(),
          startIndex: i,
          endIndex: Math.min(i + opts.maxChunkSize, text.length),
          chunkNumber: chunkNumber++
        });
      }
    }

    return chunks;
  }

  private static getOverlapText(text: string, overlapSize: number): string {
    if (text.length <= overlapSize) {
      return text;
    }
    
    // Try to find a good breaking point (sentence end or word boundary)
    const overlapText = text.substring(text.length - overlapSize);
    const sentenceMatch = overlapText.match(/[.!?]\s+(.+)$/);
    if (sentenceMatch) {
      return sentenceMatch[1];
    }
    
    const wordBoundary = overlapText.lastIndexOf(' ');
    if (wordBoundary > 0) {
      return overlapText.substring(wordBoundary + 1);
    }
    
    return overlapText;
  }

  // Helper method to get chunk statistics
  static getChunkStatistics(chunks: TextChunk[]): {
    totalChunks: number;
    averageLength: number;
    minLength: number;
    maxLength: number;
  } {
    if (chunks.length === 0) {
      return { totalChunks: 0, averageLength: 0, minLength: 0, maxLength: 0 };
    }

    const lengths = chunks.map(c => c.text.length);
    return {
      totalChunks: chunks.length,
      averageLength: Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length),
      minLength: Math.min(...lengths),
      maxLength: Math.max(...lengths)
    };
  }
}