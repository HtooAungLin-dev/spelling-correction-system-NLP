export function countWords(text: string): number {
  const matches = text.trim().match(/\b[\w'-]+\b/g);
  return matches ? matches.length : 0;
}

export function countSentences(text: string): number {
  const matches = text.match(/[^.!?]+[.!?]+/g);
  return matches ? matches.length : (text.trim() ? 1 : 0);
}

export function countSyllables(word: string): number {
  const clean = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!clean) return 0;
  if (clean.length <= 3) return 1;
  
  const processed = clean
    .replace(/(?:[^laeiouy]|ed|es|e)$/, '')
    .replace(/^y/, '');
  
  const matches = processed.match(/[aeiouy]{1,2}/g);
  return matches ? Math.max(1, matches.length) : 1;
}

export function calculateReadability(text: string): {
  fleschScore: number;
  readingGrade: string;
  readingTimeMinutes: number;
} {
  const words = text.trim().match(/\b[\w'-]+\b/g) || [];
  const wordCount = words.length;
  if (wordCount === 0) {
    return {
      fleschScore: 100,
      readingGrade: 'Very Easy',
      readingTimeMinutes: 0
    };
  }

  const sentenceCount = Math.max(1, countSentences(text));
  let totalSyllables = 0;
  for (const w of words) {
    totalSyllables += countSyllables(w);
  }

  // Flesch Reading Ease formula: 206.835 - 1.015 * (total words / total sentences) - 84.6 * (total syllables / total words)
  const wordsPerSentence = wordCount / sentenceCount;
  const syllablesPerWord = totalSyllables / wordCount;
  let flesch = 206.835 - (1.015 * wordsPerSentence) - (84.6 * syllablesPerWord);
  flesch = Math.min(100, Math.max(0, Math.round(flesch)));

  let grade = 'Standard';
  if (flesch >= 90) grade = '5th Grade (Very Easy)';
  else if (flesch >= 80) grade = '6th Grade (Easy)';
  else if (flesch >= 70) grade = '7th Grade (Fairly Easy)';
  else if (flesch >= 60) grade = '8th-9th Grade (Standard)';
  else if (flesch >= 50) grade = '10th-12th Grade (Fairly Difficult)';
  else if (flesch >= 30) grade = 'College Level (Difficult)';
  else grade = 'Graduate Level (Very Difficult)';

  // Average reading speed ~ 200 words per minute
  const readingTimeMinutes = Math.max(0.1, Number((wordCount / 200).toFixed(1)));

  return {
    fleschScore: flesch,
    readingGrade: grade,
    readingTimeMinutes
  };
}
