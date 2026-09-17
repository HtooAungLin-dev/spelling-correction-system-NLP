export type ErrorType = 'non-word' | 'real-word' | 'grammar' | 'style';

export interface CorrectionError {
  id: string;
  word: string;
  originalText: string;
  startIndex: number;
  endIndex: number;
  type: ErrorType;
  suggestions: string[];
  explanation: string;
  rule?: string;
  context?: string;
  userIgnored?: boolean;
}

export interface TextCheckStats {
  totalWords: number;
  totalCharacters: number;
  errorCount: number;
  nonWordCount: number;
  realWordCount: number;
  grammarCount: number;
  styleCount: number;
  readingTimeMinutes: number;
  fleschScore: number;
  readabilityGrade: string;
}

export interface CheckResponse {
  errors: CorrectionError[];
  correctedText: string;
  stats: TextCheckStats;
  summary?: string;
  engineUsed: 'local' | 'gemini' | 'hybrid';
}

export interface DictionaryEntry {
  word: string;
  phonetic?: string;
  partOfSpeech?: string;
  definition?: string;
  isCustom?: boolean;
}
