import React from 'react';
import { 
  Sparkles, 
  Cpu, 
  Zap, 
  RotateCcw, 
  CheckCheck, 
  Volume2, 
  Copy, 
  Check, 
  FileText,
  ChevronDown
} from 'lucide-react';
import { SAMPLE_PRESETS } from '../utils/dictionaryData';

interface HeaderProps {
  engineMode: 'hybrid' | 'gemini' | 'local';
  setEngineMode: (mode: 'hybrid' | 'gemini' | 'local') => void;
  onCheck: () => void;
  onFixAll: () => void;
  onClear: () => void;
  onLoadPreset: (text: string) => void;
  onSpeak: () => void;
  isSpeaking: boolean;
  isChecking: boolean;
  errorCount: number;
  text: string;
}

export const Header: React.FC<HeaderProps> = ({
  engineMode,
  setEngineMode,
  onCheck,
  onFixAll,
  onClear,
  onLoadPreset,
  onSpeak,
  isSpeaking,
  isChecking,
  errorCount,
  text
}) => {
  const [copied, setCopied] = React.useState(false);
  const [showPresets, setShowPresets] = React.useState(false);

  const handleCopy = async () => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <header className="border-b border-zinc-200 bg-white/95 backdrop-blur-sm sticky top-0 z-30 px-4 sm:px-6 py-3">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        {/* Brand & Tagline */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center text-white shadow-sm ring-1 ring-zinc-950/10">
            <Sparkles className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold text-zinc-900 tracking-tight">
                Spelling Correction System
              </h1>
              <span className="text-[11px] font-medium tracking-wide uppercase px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/60">
                Advanced NLP
              </span>
            </div>
            <p className="text-xs text-zinc-500">
              Non-word, real-word context misuse, and grammar detection engine
            </p>
          </div>
        </div>

        {/* Engine Switcher & Primary Controls */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-between md:justify-end">
          {/* Mode Switcher */}
          <div className="inline-flex rounded-lg p-0.5 bg-zinc-100 border border-zinc-200 text-xs font-medium text-zinc-600">
            <button
              id="mode-hybrid-btn"
              onClick={() => setEngineMode('hybrid')}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md transition-all ${
                engineMode === 'hybrid'
                  ? 'bg-white text-zinc-900 shadow-xs font-semibold'
                  : 'hover:text-zinc-900'
              }`}
              title="Instant local edit distance + Gemini semantic verification"
            >
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>Hybrid</span>
            </button>
            <button
              id="mode-gemini-btn"
              onClick={() => setEngineMode('gemini')}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md transition-all ${
                engineMode === 'gemini'
                  ? 'bg-white text-zinc-900 shadow-xs font-semibold'
                  : 'hover:text-zinc-900'
              }`}
              title="Deep AI contextual proofreader"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-500" />
              <span>Deep AI</span>
            </button>
            <button
              id="mode-local-btn"
              onClick={() => setEngineMode('local')}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md transition-all ${
                engineMode === 'local'
                  ? 'bg-white text-zinc-900 shadow-xs font-semibold'
                  : 'hover:text-zinc-900'
              }`}
              title="Algorithmic Levenshtein & Soundex"
            >
              <Cpu className="w-3.5 h-3.5 text-emerald-600" />
              <span>Local NLP</span>
            </button>
          </div>

          {/* Preset Selector Dropdown */}
          <div className="relative">
            <button
              id="load-sample-menu-btn"
              onClick={() => setShowPresets(!showPresets)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-700 bg-white border border-zinc-300 rounded-lg hover:bg-zinc-50 transition-colors shadow-xs"
            >
              <FileText className="w-3.5 h-3.5 text-zinc-500" />
              <span>Sample Text</span>
              <ChevronDown className="w-3 h-3 text-zinc-400" />
            </button>

            {showPresets && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowPresets(false)} 
                />
                <div className="absolute right-0 mt-1.5 w-72 bg-white border border-zinc-200 rounded-xl shadow-lg z-50 py-1.5 overflow-hidden text-left">
                  <div className="px-3 py-1 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                    Load Test Benchmarks
                  </div>
                  {SAMPLE_PRESETS.map((p, idx) => (
                    <button
                      key={idx}
                      id={`preset-btn-${idx}`}
                      onClick={() => {
                        onLoadPreset(p.text);
                        setShowPresets(false);
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-zinc-50 transition-colors border-b border-zinc-100 last:border-0"
                    >
                      <div className="text-xs font-medium text-zinc-800 flex items-center justify-between">
                        <span>{p.title}</span>
                        {idx === 0 && (
                          <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                            Original
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-zinc-500 line-clamp-1 mt-0.5">
                        {p.description}
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5">
            <button
              id="tts-speak-btn"
              onClick={onSpeak}
              title={isSpeaking ? 'Stop reading' : 'Read aloud with Text-to-Speech'}
              className={`p-1.5 rounded-lg border text-xs transition-colors shadow-xs ${
                isSpeaking 
                  ? 'bg-rose-50 border-rose-200 text-rose-700' 
                  : 'bg-white border-zinc-300 text-zinc-700 hover:bg-zinc-50'
              }`}
            >
              <Volume2 className={`w-4 h-4 ${isSpeaking ? 'animate-pulse' : ''}`} />
            </button>

            <button
              id="copy-text-btn"
              onClick={handleCopy}
              disabled={!text}
              title="Copy current text to clipboard"
              className="p-1.5 rounded-lg border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 transition-colors shadow-xs disabled:opacity-40"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            </button>

            <button
              id="clear-text-btn"
              onClick={onClear}
              title="Clear text area"
              className="p-1.5 rounded-lg border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 transition-colors shadow-xs"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {errorCount > 0 && (
              <button
                id="fix-all-btn"
                onClick={onFixAll}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-all shadow-xs"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Fix All ({errorCount})</span>
              </button>
            )}

            <button
              id="check-text-btn"
              onClick={onCheck}
              disabled={isChecking || !text.trim()}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium transition-all shadow-xs disabled:opacity-50"
            >
              {isChecking ? (
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              )}
              <span>{isChecking ? 'Checking...' : 'Check Text'}</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
