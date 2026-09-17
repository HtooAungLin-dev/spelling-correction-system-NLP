/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Header } from './components/Header';
import { EditorArea } from './components/EditorArea';
import { SuggestionsPanel } from './components/SuggestionsPanel';
import { ExplainModal } from './components/ExplainModal';
import { CorrectionError, TextCheckStats } from './types';
import { 
  analyzeTextLocally, 
  applyAllCorrections 
} from './utils/nlpEngine';
import { calculateReadability } from './utils/readability';
import { SAMPLE_PRESETS } from './utils/dictionaryData';

const STORAGE_KEY_CUSTOM_WORDS = 'spelling_app_custom_words';

export default function App() {
  // Initialize with the original GitHub sample benchmark
  const [text, setText] = useState<string>(SAMPLE_PRESETS[0].text);
  const [errors, setErrors] = useState<CorrectionError[]>([]);
  const [activeError, setActiveError] = useState<CorrectionError | null>(null);
  const [engineMode, setEngineMode] = useState<'hybrid' | 'gemini' | 'local'>('hybrid');
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [correctedText, setCorrectedText] = useState<string>('');
  const [summary, setSummary] = useState<string>('');
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  // Custom User Vocabulary (stored in localStorage)
  const [customWords, setCustomWords] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CUSTOM_WORDS);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Linguistic explanation modal state
  const [explainModalError, setExplainModalError] = useState<CorrectionError | null>(null);
  const [detailedExplanation, setDetailedExplanation] = useState<string>('');
  const [loadingExplanation, setLoadingExplanation] = useState<boolean>(false);

  // Save custom words to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_CUSTOM_WORDS, JSON.stringify(customWords));
    } catch (e) {
      console.warn('Unable to persist custom dictionary:', e);
    }
  }, [customWords]);

  // Compute text statistics
  const stats: TextCheckStats = useMemo(() => {
    const words = text.trim() ? text.trim().split(/\s+/).filter(Boolean) : [];
    const activeErrors = errors.filter(e => !e.userIgnored);
    const nonWordCount = activeErrors.filter(e => e.type === 'non-word').length;
    const realWordCount = activeErrors.filter(e => e.type === 'real-word').length;
    const grammarCount = activeErrors.filter(e => e.type === 'grammar').length;
    const styleCount = activeErrors.filter(e => e.type === 'style').length;

    const { fleschScore, readingGrade, readingTimeMinutes } = calculateReadability(text);

    return {
      totalWords: words.length,
      totalCharacters: text.length,
      errorCount: activeErrors.length,
      nonWordCount,
      realWordCount,
      grammarCount,
      styleCount,
      readingTimeMinutes,
      fleschScore,
      readabilityGrade: readingGrade
    };
  }, [text, errors]);

  // Local fast analysis runner
  const runLocalAnalysis = useCallback((inputText: string, currentCustomWords: string[]) => {
    const customSet = new Set(currentCustomWords.map(w => w.toLowerCase()));
    const detected = analyzeTextLocally(inputText, customSet);
    setErrors(detected);
    const corrected = applyAllCorrections(inputText, detected);
    setCorrectedText(corrected);
  }, []);

  // Deep AI & Hybrid analysis runner
  const runAnalysis = useCallback(async (
    inputText: string, 
    mode: 'hybrid' | 'gemini' | 'local', 
    currentCustomWords: string[]
  ) => {
    if (!inputText.trim()) {
      setErrors([]);
      setCorrectedText('');
      setSummary('');
      return;
    }

    // Always run local fast pass first so feedback is instant
    const customSet = new Set(currentCustomWords.map(w => w.toLowerCase()));
    const localErrors = analyzeTextLocally(inputText, customSet);
    const localCorrected = applyAllCorrections(inputText, localErrors);

    if (mode === 'local') {
      setErrors(localErrors);
      setCorrectedText(localCorrected);
      setSummary('Analyzed using local algorithmic edit distance, phonetic soundex, and grammar rules.');
      return;
    }

    // In hybrid or gemini mode, query the server endpoint
    setIsChecking(true);
    // Show local results immediately while waiting
    setErrors(localErrors);
    setCorrectedText(localCorrected);

    try {
      const res = await fetch('/api/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: inputText, mode }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      if (data.errors && Array.isArray(data.errors) && data.errors.length > 0) {
        // Filter out any errors that the user has added to their custom dictionary
        const filtered = data.errors.filter((e: CorrectionError) => 
          !customSet.has(e.word.toLowerCase())
        );
        setErrors(filtered);
        setCorrectedText(data.correctedText || localCorrected);
        setSummary(data.summary || 'Deep AI contextual review completed.');
      } else if (data.useFallback) {
        // Fallback to local
        setErrors(localErrors);
        setCorrectedText(localCorrected);
        setSummary('Fast NLP Engine active.');
      } else {
        // No errors found by AI!
        setErrors([]);
        setCorrectedText(inputText);
        setSummary('No spelling or grammatical issues found.');
      }
    } catch (err) {
      console.warn('Backend check error, using local fallback:', err);
      setErrors(localErrors);
      setCorrectedText(localCorrected);
      setSummary('Local NLP verification active.');
    } finally {
      setIsChecking(false);
    }
  }, []);

  // Run initial check on mount
  useEffect(() => {
    runAnalysis(text, engineMode, customWords);
  }, []); // Run once on mount

  // Handle typing in editor
  const handleTextChange = (newText: string) => {
    setText(newText);
    // Instant local evaluation on keystroke
    runLocalAnalysis(newText, customWords);
  };

  // Apply single word replacement
  const handleApplyCorrection = (error: CorrectionError, suggestion: string) => {
    let replacement = suggestion;
    if (replacement === '[delete duplicate]') {
      replacement = '';
    }

    const before = text.substring(0, error.startIndex);
    const after = text.substring(error.endIndex);
    const updated = (before + replacement + after).replace(/\s{2,}/g, ' ');

    setText(updated);
    setActiveError(null);
    runAnalysis(updated, engineMode, customWords);
  };

  // Fix All button
  const handleFixAll = () => {
    if (errors.length === 0) return;
    const allFixed = applyAllCorrections(text, errors);
    setText(allFixed);
    setErrors([]);
    setCorrectedText(allFixed);
  };

  // Ignore error
  const handleIgnoreError = (errorId: string) => {
    setErrors(prev => prev.map(e => e.id === errorId ? { ...e, userIgnored: true } : e));
    if (activeError?.id === errorId) setActiveError(null);
  };

  // Add word to custom dictionary
  const handleAddCustomWord = (word: string) => {
    const clean = word.toLowerCase().trim();
    if (!clean || customWords.includes(clean)) return;

    const next = [...customWords, clean];
    setCustomWords(next);
    // Re-check with new dictionary
    runAnalysis(text, engineMode, next);
  };

  // Remove word from custom dictionary
  const handleRemoveCustomWord = (word: string) => {
    const next = customWords.filter(w => w !== word);
    setCustomWords(next);
    runAnalysis(text, engineMode, next);
  };

  // Load preset sample text
  const handleLoadPreset = (presetText: string) => {
    setText(presetText);
    runAnalysis(presetText, engineMode, customWords);
  };

  // Clear editor
  const handleClear = () => {
    setText('');
    setErrors([]);
    setCorrectedText('');
    setSummary('');
    setActiveError(null);
  };

  // Text to Speech
  const handleSpeak = () => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    if (!text.trim() || !('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  // Explain rule with Gemini backend
  const handleExplainRule = async (error: CorrectionError) => {
    setExplainModalError(error);
    setDetailedExplanation('');
    setLoadingExplanation(true);

    try {
      const res = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          word: error.word,
          suggestion: error.suggestions[0] || '',
          type: error.type,
          context: error.context || text,
        }),
      });
      const data = await res.json();
      setDetailedExplanation(data.explanation || error.explanation);
    } catch {
      setDetailedExplanation(error.explanation);
    } finally {
      setLoadingExplanation(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-100/60 text-zinc-900 flex flex-col font-sans selection:bg-blue-100 selection:text-zinc-900">
      {/* Global Header */}
      <Header
        engineMode={engineMode}
        setEngineMode={(mode) => {
          setEngineMode(mode);
          runAnalysis(text, mode, customWords);
        }}
        onCheck={() => runAnalysis(text, engineMode, customWords)}
        onFixAll={handleFixAll}
        onClear={handleClear}
        onLoadPreset={handleLoadPreset}
        onSpeak={handleSpeak}
        isSpeaking={isSpeaking}
        isChecking={isChecking}
        errorCount={stats.errorCount}
        text={text}
      />

      {/* Main Workspace Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left/Center: Rich Interactive Editor */}
        <section className="lg:col-span-8 flex flex-col h-[calc(100vh-140px)] min-h-[520px]">
          <EditorArea
            text={text}
            onChangeText={handleTextChange}
            errors={errors}
            onApplyCorrection={handleApplyCorrection}
            onIgnoreError={handleIgnoreError}
            onAddToDictionary={handleAddCustomWord}
            activeError={activeError}
            setActiveError={setActiveError}
            characterLimit={5000}
            correctedText={correctedText}
          />
        </section>

        {/* Right Side: Diagnostics, Dictionary & Metrics */}
        <aside className="lg:col-span-4 flex flex-col h-[calc(100vh-140px)] min-h-[520px]">
          <SuggestionsPanel
            errors={errors}
            onApplyCorrection={handleApplyCorrection}
            onSelectError={(err) => setActiveError(err)}
            selectedErrorId={activeError?.id}
            customWords={customWords}
            onAddCustomWord={handleAddCustomWord}
            onRemoveCustomWord={handleRemoveCustomWord}
            stats={stats}
            summary={summary}
            onExplainRule={handleExplainRule}
          />
        </aside>
      </main>

      {/* Linguistic Rule Explanation Modal */}
      <ExplainModal
        error={explainModalError}
        onClose={() => setExplainModalError(null)}
        detailedExplanation={detailedExplanation}
        loading={loadingExplanation}
        onApply={handleApplyCorrection}
      />
    </div>
  );
}
