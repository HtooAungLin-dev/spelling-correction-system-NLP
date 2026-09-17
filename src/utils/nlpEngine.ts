import { CORE_DICTIONARY, REAL_WORD_RULES } from './dictionaryData';
import { CorrectionError } from '../types';

// Set for O(1) dictionary lookups
const DICTIONARY_SET = new Set<string>(CORE_DICTIONARY);

// Soundex phonetic hash
export function soundex(word: string): string {
  const clean = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!clean) return '';
  
  const map: Record<string, string> = {
    b: '1', f: '1', p: '1', v: '1',
    c: '2', g: '2', j: '2', k: '2', q: '2', s: '2', x: '2', z: '2',
    d: '3', t: '3',
    l: '4',
    m: '5', n: '5',
    r: '6',
  };

  const firstLetter = clean[0].toUpperCase();
  let code = firstLetter;
  let prevCode = map[clean[0]] || '';

  for (let i = 1; i < clean.length; i++) {
    const curCode = map[clean[i]] || '';
    if (curCode && curCode !== prevCode) {
      code += curCode;
      prevCode = curCode;
    } else if (!curCode) {
      prevCode = '';
    }
    if (code.length === 4) break;
  }

  return (code + '000').slice(0, 4);
}

// Levenshtein Edit Distance calculation
export function levenshteinDistance(s1: string, s2: string): number {
  const m = s1.length;
  const n = s2.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,      // deletion
        dp[i][j - 1] + 1,      // insertion
        dp[i - 1][j - 1] + cost // substitution
      );
      // Damerau transposition check
      if (i > 1 && j > 1 && s1[i - 1] === s2[j - 2] && s1[i - 2] === s2[j - 1]) {
        dp[i][j] = Math.min(dp[i][j], dp[i - 2][j - 2] + 1);
      }
    }
  }

  return dp[m][n];
}

// Common custom typo mappings for instant high-precision suggestions
const KNOWN_TYPO_MAP: Record<string, string[]> = {
  sientist: ['scientist'],
  reserches: ['researches', 'searches', 'researched'],
  medcine: ['medicine'],
  cleer: ['clear', 'clerk', 'clean'],
  resluts: ['results', 'result'],
  teh: ['the'],
  becuase: ['because'],
  accomodate: ['accommodate'],
  definatly: ['definitely'],
  definately: ['definitely'],
  seperate: ['separate'],
  untill: ['until'],
  recieved: ['received'],
  wierd: ['weird'],
  occured: ['occurred'],
  groth: ['growth'],
  sward: ['sword'],
  draggon: ['dragon'],
  sucess: ['success'],
};

// Generate best spelling candidates using Levenshtein distance + Soundex
export function getSuggestions(word: string, customWords: Set<string> = new Set()): string[] {
  const lower = word.toLowerCase();
  
  // 1. Direct typo dictionary check
  if (KNOWN_TYPO_MAP[lower]) {
    return KNOWN_TYPO_MAP[lower];
  }

  // 2. Norvig-style and distance-based scoring
  const targetSoundex = soundex(lower);
  const scored: Array<{ word: string; score: number }> = [];

  const candidates = Array.from(DICTIONARY_SET).concat(Array.from(customWords));

  for (const dictWord of candidates) {
    // Length filter to skip very distant lengths
    if (Math.abs(dictWord.length - lower.length) > 2) continue;

    const dist = levenshteinDistance(lower, dictWord);
    if (dist <= 2) {
      let score = dist * 2;
      // Phonetic bonus
      if (soundex(dictWord) === targetSoundex) {
        score -= 1.5;
      }
      // Common prefix bonus
      if (dictWord[0] === lower[0]) {
        score -= 0.5;
      }
      scored.push({ word: dictWord, score });
    }
  }

  scored.sort((a, b) => a.score - b.score);
  const topWords = scored.slice(0, 4).map(s => s.word);

  // Preserve case
  if (word[0] === word[0].toUpperCase() && word.slice(1) === word.slice(1).toLowerCase()) {
    return topWords.map(w => w.charAt(0).toUpperCase() + w.slice(1));
  }
  return topWords.length > 0 ? topWords : ['[no close suggestion]'];
}

// Check if a word is in dictionary or custom words
export function isKnownWord(word: string, customWords: Set<string> = new Set()): boolean {
  const lower = word.toLowerCase();
  if (DICTIONARY_SET.has(lower) || customWords.has(lower)) return true;
  
  // Check basic plural/past-tense inflections
  if (lower.endsWith('s') && DICTIONARY_SET.has(lower.slice(0, -1))) return true;
  if (lower.endsWith('es') && DICTIONARY_SET.has(lower.slice(0, -2))) return true;
  if (lower.endsWith('ed') && DICTIONARY_SET.has(lower.slice(0, -2))) return true;
  if (lower.endsWith('ing') && DICTIONARY_SET.has(lower.slice(0, -3))) return true;

  return false;
}

// Local NLP Rules Engine
export function analyzeTextLocally(
  text: string,
  customWords: Set<string> = new Set()
): CorrectionError[] {
  const errors: CorrectionError[] = [];
  if (!text.trim()) return errors;

  // 1. Real-word misuse detection via contextual rules
  for (const rule of REAL_WORD_RULES) {
    let match: RegExpExecArray | null;
    const regex = new RegExp(rule.pattern.source, 'gi');
    while ((match = regex.exec(text)) !== null) {
      // Find the group capturing the target word
      const targetWord = match[1];
      if (!targetWord) continue;
      
      const wordOffset = match[0].indexOf(targetWord);
      const startIndex = match.index + wordOffset;
      const endIndex = startIndex + targetWord.length;

      errors.push({
        id: `real-word-${startIndex}-${endIndex}`,
        word: targetWord,
        originalText: targetWord,
        startIndex,
        endIndex,
        type: 'real-word',
        suggestions: [rule.replacement],
        explanation: rule.explanation,
        rule: 'Contextual Confusion / Homophone Misuse',
        context: text.substring(Math.max(0, startIndex - 20), Math.min(text.length, endIndex + 20))
      });
    }
  }

  // 2. Grammar: Subject-Verb Agreement checks
  // He/She/It + base verb (e.g. "He want", "She like", "He research", "It look")
  const singularSubjPattern = /\b(He|She|It|This|That)\s+(want|need|like|reserch|research|go|make|think|know|take|see|feel|look|come|give|find|say)\b/gi;
  let sMatch: RegExpExecArray | null;
  while ((sMatch = singularSubjPattern.exec(text)) !== null) {
    const subj = sMatch[1];
    const verb = sMatch[2];
    const verbStartIndex = sMatch.index + sMatch[0].lastIndexOf(verb);
    const verbEndIndex = verbStartIndex + verb.length;

    // Determine correct third-person singular verb
    let correctVerb = verb + 's';
    if (verb === 'go') correctVerb = 'goes';
    else if (verb === 'research' || verb === 'reserch') correctVerb = 'researches';

    errors.push({
      id: `grammar-subj-${verbStartIndex}-${verbEndIndex}`,
      word: verb,
      originalText: verb,
      startIndex: verbStartIndex,
      endIndex: verbEndIndex,
      type: 'grammar',
      suggestions: [correctVerb],
      explanation: `Subject '${subj}' is 3rd-person singular. In the present tense, the verb must be '${correctVerb}'.`,
      rule: 'Subject-Verb Agreement'
    });
  }

  // Plural pronoun + singular verb ("They was", "We was")
  const pluralWasPattern = /\b(They|We|You)\s+(was)\b/gi;
  let wasMatch: RegExpExecArray | null;
  while ((wasMatch = pluralWasPattern.exec(text)) !== null) {
    const verb = wasMatch[2];
    const vStart = wasMatch.index + wasMatch[0].lastIndexOf(verb);
    const vEnd = vStart + verb.length;

    errors.push({
      id: `grammar-plural-was-${vStart}-${vEnd}`,
      word: verb,
      originalText: verb,
      startIndex: vStart,
      endIndex: vEnd,
      type: 'grammar',
      suggestions: ['were'],
      explanation: `Plural subject '${wasMatch[1]}' takes past tense verb 'were', not 'was'.`,
      rule: 'Subject-Verb Agreement'
    });
  }

  // 3. Grammar: Indefinite article agreement ("a" before vowel, "an" before consonant)
  const articleVowelPattern = /\b(a)\s+([aeiou]\w+)\b/gi;
  let avMatch: RegExpExecArray | null;
  while ((avMatch = articleVowelPattern.exec(text)) !== null) {
    const article = avMatch[1];
    const nextWord = avMatch[2];
    // Exclude words starting with 'u' that have consonant 'y' sound like 'university', 'unit'
    if (/^(university|universal|union|unit|unique|user)/i.test(nextWord)) continue;

    const artStart = avMatch.index;
    const artEnd = artStart + article.length;

    errors.push({
      id: `grammar-article-${artStart}-${artEnd}`,
      word: article,
      originalText: article,
      startIndex: artStart,
      endIndex: artEnd,
      type: 'grammar',
      suggestions: [article === 'a' ? 'an' : 'An'],
      explanation: `Use 'an' before words beginning with a vowel sound like '${nextWord}'.`,
      rule: 'Indefinite Article Agreement'
    });
  }

  // 4. Grammar: Duplicate words ("the the", "and and")
  const duplicatePattern = /\b([a-z]+)\s+(\1)\b/gi;
  let dupMatch: RegExpExecArray | null;
  while ((dupMatch = duplicatePattern.exec(text)) !== null) {
    const dupWord = dupMatch[2];
    const dStart = dupMatch.index + dupMatch[0].lastIndexOf(dupWord);
    const dEnd = dStart + dupWord.length;

    errors.push({
      id: `grammar-dup-${dStart}-${dEnd}`,
      word: dupWord,
      originalText: dupWord,
      startIndex: dStart,
      endIndex: dEnd,
      type: 'grammar',
      suggestions: ['[delete duplicate]'],
      explanation: `Repeated consecutive word '${dupWord}'.`,
      rule: 'Repeated Word'
    });
  }

  // 5. Non-word spelling error detection
  // Extract all alpha words with their character spans
  const wordRegex = /\b[A-Za-z]+(?:'[A-Za-z]+)?\b/g;
  let match: RegExpExecArray | null;

  while ((match = wordRegex.exec(text)) !== null) {
    const rawWord = match[0];
    const startIndex = match.index;
    const endIndex = startIndex + rawWord.length;

    // Check if this span already overlaps with a real-word or grammar error
    const overlaps = errors.some(e => 
      (startIndex >= e.startIndex && startIndex < e.endIndex) ||
      (endIndex > e.startIndex && endIndex <= e.endIndex)
    );
    if (overlaps) continue;

    // Check if word is known in core dictionary or custom user dictionary
    if (!isKnownWord(rawWord, customWords)) {
      const suggestions = getSuggestions(rawWord, customWords);
      errors.push({
        id: `non-word-${startIndex}-${endIndex}`,
        word: rawWord,
        originalText: rawWord,
        startIndex,
        endIndex,
        type: 'non-word',
        suggestions,
        explanation: `'${rawWord}' is not recognized in standard English. Did you mean ${suggestions[0] || 'something else'}?`,
        rule: 'Spelling Error (Non-Word)',
        context: text.substring(Math.max(0, startIndex - 15), Math.min(text.length, endIndex + 15))
      });
    }
  }

  // Sort errors by startIndex
  errors.sort((a, b) => a.startIndex - b.startIndex);
  return errors;
}

// Generate fully corrected string by applying top suggestions
export function applyAllCorrections(text: string, errors: CorrectionError[]): string {
  if (errors.length === 0) return text;
  
  // Sort reverse by startIndex so replacing does not offset earlier indices
  const sorted = [...errors].sort((a, b) => b.startIndex - a.startIndex);
  let result = text;

  for (const err of sorted) {
    if (err.userIgnored || !err.suggestions.length) continue;
    let replacement = err.suggestions[0];
    if (replacement === '[delete duplicate]') {
      replacement = '';
    }
    result = result.substring(0, err.startIndex) + replacement + result.substring(err.endIndex);
  }

  // Clean up any extra spacing from deleted words
  return result.replace(/\s{2,}/g, ' ').trim();
}
