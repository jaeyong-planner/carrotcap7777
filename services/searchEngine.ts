import { ProcessedChunk } from '../types';

export interface SearchResult {
  chunk: ProcessedChunk;
  score: number;
  matchedTerms: string[];
}

export class SearchEngine {
  static searchChunks(query: string, chunks: ProcessedChunk[], maxResults: number = 5): SearchResult[] {
    if (!query.trim() || chunks.length === 0) {
      return [];
    }

    const normalizedQuery = this.normalizeText(query);
    const queryTerms = this.extractKeywords(normalizedQuery);
    
    const results: SearchResult[] = chunks.map(chunk => {
      const score = this.calculateRelevanceScore(queryTerms, chunk);
      const matchedTerms = this.findMatchedTerms(queryTerms, chunk);
      
      return {
        chunk,
        score,
        matchedTerms
      };
    }).filter(result => result.score > 0);

    // Sort by score (descending) and take top results
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults);
  }

  private static normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s가-힣]/g, ' ') // Keep only letters, numbers, and Korean characters
      .replace(/\s+/g, ' ')
      .trim();
  }

  private static extractKeywords(text: string): string[] {
    const words = text.split(/\s+/);
    // Filter out very short words and common stop words
    const stopWords = new Set(['은', '는', '이', '가', '을', '를', '에', '의', '로', '와', '과', '하고', '그리고', 'and', 'or', 'the', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'of', 'with']);
    
    return words.filter(word => word.length > 1 && !stopWords.has(word));
  }

  private static calculateRelevanceScore(queryTerms: string[], chunk: ProcessedChunk): number {
    const chunkText = this.normalizeText(chunk.text);
    const chunkSummary = this.normalizeText(chunk.summary);
    const chunkWords = new Set([...chunkText.split(/\s+/), ...chunkSummary.split(/\s+/)]);
    
    let score = 0;
    let matchedTerms = 0;

    for (const term of queryTerms) {
      // Exact match in text content
      const textMatches = (chunkText.match(new RegExp(term, 'g')) || []).length;
      if (textMatches > 0) {
        score += textMatches * 3; // Higher weight for text matches
        matchedTerms++;
      }

      // Exact match in summary (keywords)
      const summaryMatches = (chunkSummary.match(new RegExp(term, 'g')) || []).length;
      if (summaryMatches > 0) {
        score += summaryMatches * 2; // Medium weight for summary matches
        matchedTerms++;
      }

      // Fuzzy matching for Korean text
      if (this.containsKorean(term)) {
        // Check for partial matches in Korean
        for (const word of chunkWords) {
          if (word.includes(term) || term.includes(word)) {
            score += 1; // Lower weight for partial matches
            break;
          }
        }
      }

      // Semantic similarity (basic implementation)
      const semanticScore = this.calculateSemanticSimilarity(term, chunkText);
      score += semanticScore;
    }

    // Boost score based on match density
    const matchDensity = matchedTerms / queryTerms.length;
    score *= (1 + matchDensity);

    // Consider chunk length - prefer chunks that aren't too short or too long
    const lengthFactor = this.calculateLengthFactor(chunk.text.length);
    score *= lengthFactor;

    return Math.round(score * 100) / 100; // Round to 2 decimal places
  }

  private static findMatchedTerms(queryTerms: string[], chunk: ProcessedChunk): string[] {
    const chunkText = this.normalizeText(chunk.text + ' ' + chunk.summary);
    const matched: string[] = [];

    for (const term of queryTerms) {
      if (chunkText.includes(term)) {
        matched.push(term);
      }
    }

    return matched;
  }

  private static containsKorean(text: string): boolean {
    return /[가-힣]/.test(text);
  }

  private static calculateSemanticSimilarity(term: string, text: string): number {
    // Basic semantic similarity - in production, you'd use proper embeddings
    const synonyms: { [key: string]: string[] } = {
      '회사': ['기업', '법인', '조직'],
      '매출': ['수익', 'revenue', '판매'],
      '직원': ['사원', '구성원', '인력'],
      '기술': ['테크', 'tech', '기법'],
      '개발': ['development', '구축', '제작'],
      '사업': ['business', '비즈니스', '영업'],
      '투자': ['investment', '자본', '펀딩'],
      '관리': ['management', '운영', '매니지먼트'],
    };

    let similarityScore = 0;
    const normalizedText = this.normalizeText(text);

    for (const [key, values] of Object.entries(synonyms)) {
      if (term === key || values.includes(term)) {
        const allTerms = [key, ...values];
        for (const synonym of allTerms) {
          if (normalizedText.includes(synonym)) {
            similarityScore += 0.5;
          }
        }
      }
    }

    return similarityScore;
  }

  private static calculateLengthFactor(length: number): number {
    // Optimal chunk length is around 500-1000 characters
    if (length < 100) return 0.5;
    if (length < 300) return 0.8;
    if (length < 800) return 1.0;
    if (length < 1200) return 0.9;
    return 0.7;
  }

  // Helper method for highlighting matched terms in results
  static highlightMatches(text: string, matchedTerms: string[]): string {
    let highlightedText = text;
    
    for (const term of matchedTerms) {
      const regex = new RegExp(`(${term})`, 'gi');
      highlightedText = highlightedText.replace(regex, '**$1**');
    }
    
    return highlightedText;
  }

  // Method to get search suggestions based on available chunks
  static getSearchSuggestions(chunks: ProcessedChunk[], maxSuggestions: number = 5): string[] {
    const keywords = new Set<string>();
    
    chunks.forEach(chunk => {
      const chunkKeywords = this.extractKeywords(this.normalizeText(chunk.summary));
      chunkKeywords.forEach(keyword => {
        if (keyword.length > 2) {
          keywords.add(keyword);
        }
      });
    });

    // Return most common keywords as suggestions
    return Array.from(keywords)
      .slice(0, maxSuggestions)
      .sort();
  }
}