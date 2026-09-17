import React, { useRef, useState, useEffect } from 'react';
import { 
  CorrectionError, 
  ErrorType 
} from '../types';
import { 
  AlertCircle, 
  BookPlus, 
  Check, 
  EyeOff, 
  HelpCircle, 
  Info, 
  Sparkles,
  Layers,
  Split
} from 'lucide-react';

interface EditorAreaProps {
  text: string;
  onChangeText: (newText: string) => void;
  errors: CorrectionError[];
  onApplyCorrection: (error: CorrectionError, suggestion: string) => void;
  onIgnoreError: (errorId: string) => void;
  onAddToDictionary: (word: string) => void;
  activeError: CorrectionError | null;
  setActiveError: (error: CorrectionError | null) => void;
  characterLimit?: number;
  correctedText?: string;
}

export const EditorArea: React.FC<EditorAreaProps> = ({
  text,
  onChangeText,
  errors,
  onApplyCorrection,
  onIgnoreError,
  onAddToDictionary,
  activeError,
  setActiveError,
  characterLimit = 2000,
  correctedText
}) => {
  const [viewMode, setViewMode] = useState<'editor' | 'diff'>('editor');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const [popoverPos, setPopoverPos] = useState<{ x: number; y: number } | null>(null);

  // Synchronize scroll between textarea and highlight backdrop
  const handleScroll = () => {
    if (textareaRef.current && backdropRef.current) {
      backdropRef.current.scrollTop = textareaRef.current.scrollTop;
      backdropRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };

  // Filter out ignored errors
  const activeErrors = errors.filter(e => !e.userIgnored);

  // Position popover relative to clicked target
  const handleWordClick = (e: React.MouseEvent, err: CorrectionError) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const container = document.getElementById('editor-container')?.getBoundingClientRect();
    
    if (container) {
      setPopoverPos({
        x: Math.min(rect.left - container.left, container.width - 320),
        y: rect.bottom - container.top + 8,
      });
    }
    setActiveError(err);
  };

  // Close popover on outside click
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const popoverEl = document.getElementById('correction-popover');
      if (popoverEl && !popoverEl.contains(e.target as Node)) {
        setActiveError(null);
        setPopoverPos(null);
      }
    };
    window.addEventListener('mousedown', handleGlobalClick);
    return () => window.removeEventListener('mousedown', handleGlobalClick);
  }, [setActiveError]);

  // Render highlighted spans
  const renderHighlightedText = () => {
    if (!text) return null;
    if (activeErrors.length === 0) {
      return <span>{text}</span>;
    }

    const elements: React.ReactNode[] = [];
    let lastIndex = 0;

    activeErrors.forEach((err, idx) => {
      // Safe bounds check
      const start = Math.max(lastIndex, Math.min(err.startIndex, text.length));
      const end = Math.max(start, Math.min(err.endIndex, text.length));

      // Append text before this error
      if (start > lastIndex) {
        elements.push(<span key={`text-${lastIndex}`}>{text.substring(lastIndex, start)}</span>);
      }

      // Format highlight according to error category
      let styleClass = '';
      if (err.type === 'non-word') {
        styleClass = 'underline decoration-red-500 decoration-wavy decoration-2 bg-red-50/70 text-zinc-900 cursor-pointer hover:bg-red-100/80 rounded-xs transition-colors';
      } else if (err.type === 'real-word') {
        styleClass = 'underline decoration-blue-500 decoration-wavy decoration-2 bg-blue-50/70 text-zinc-900 cursor-pointer hover:bg-blue-100/80 rounded-xs transition-colors';
      } else if (err.type === 'grammar') {
        styleClass = 'underline decoration-emerald-500 decoration-wavy decoration-2 bg-emerald-50/70 text-zinc-900 cursor-pointer hover:bg-emerald-100/80 rounded-xs transition-colors';
      } else {
        styleClass = 'underline decoration-amber-500 decoration-wavy decoration-2 bg-amber-50/70 text-zinc-900 cursor-pointer hover:bg-amber-100/80 rounded-xs transition-colors';
      }

      const isSelected = activeError?.id === err.id;

      elements.push(
        <mark
          key={`err-${err.id}-${idx}`}
          onClick={(e) => handleWordClick(e, err)}
          className={`px-0.5 py-0 mx-0 font-normal ${styleClass} ${isSelected ? 'ring-2 ring-zinc-800' : ''}`}
          title={`${err.type.toUpperCase()}: ${err.explanation}`}
        >
          {text.substring(start, end)}
        </mark>
      );

      lastIndex = end;
    });

    if (lastIndex < text.length) {
      elements.push(<span key={`text-${lastIndex}`}>{text.substring(lastIndex)}</span>);
    }

    return elements;
  };

  const getBadgeForType = (type: ErrorType) => {
    switch (type) {
      case 'non-word':
        return {
          label: 'Spelling Error',
          bg: 'bg-red-50 text-red-700 border-red-200',
          dot: 'bg-red-500',
        };
      case 'real-word':
        return {
          label: 'Context / Homophone Misuse',
          bg: 'bg-blue-50 text-blue-700 border-blue-200',
          dot: 'bg-blue-500',
        };
      case 'grammar':
        return {
          label: 'Grammar & Agreement',
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          dot: 'bg-emerald-500',
        };
      case 'style':
        return {
          label: 'Style & Clarity',
          bg: 'bg-amber-50 text-amber-700 border-amber-200',
          dot: 'bg-amber-500',
        };
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl border border-zinc-200 shadow-xs overflow-hidden">
      {/* View Switcher & Toolbar Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-50/70 border-b border-zinc-200 text-xs text-zinc-600">
        <div className="flex items-center gap-1.5">
          <button
            id="view-editor-tab-btn"
            onClick={() => setViewMode('editor')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors ${
              viewMode === 'editor'
                ? 'bg-white text-zinc-900 font-semibold shadow-2xs border border-zinc-200/80'
                : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Interactive Editor</span>
          </button>
          <button
            id="view-diff-tab-btn"
            onClick={() => setViewMode('diff')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors ${
              viewMode === 'diff'
                ? 'bg-white text-zinc-900 font-semibold shadow-2xs border border-zinc-200/80'
                : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <Split className="w-3.5 h-3.5" />
            <span>Side-by-Side Diff</span>
          </button>
        </div>

        {/* Legend */}
        <div className="hidden sm:flex items-center gap-3 text-[11px] text-zinc-500">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
            <span>Non-word</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
            <span>Real-word</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            <span>Grammar</span>
          </span>
        </div>
      </div>

      {/* Main Workspace Body */}
      {viewMode === 'editor' ? (
        <div 
          id="editor-container"
          className="relative flex-1 min-h-[360px] p-4 font-sans text-base leading-relaxed overflow-hidden"
        >
          {/* Synchronized Highlight Backdrop Layer */}
          <div
            ref={backdropRef}
            aria-hidden="true"
            className="absolute inset-0 p-4 font-sans text-base leading-relaxed whitespace-pre-wrap break-words overflow-auto pointer-events-auto select-text text-transparent caret-zinc-900"
            style={{
              fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              lineHeight: '1.75',
              fontSize: '16px'
            }}
          >
            {renderHighlightedText()}
          </div>

          {/* Actual Input Textarea (Transparent text so highlights show through, but caret and typing are native) */}
          <textarea
            id="main-editor-textarea"
            ref={textareaRef}
            value={text}
            onChange={(e) => {
              const val = e.target.value;
              if (val.length <= characterLimit) {
                onChangeText(val);
              }
            }}
            onScroll={handleScroll}
            placeholder="Type or paste your text here to check spelling, real-word misuse, and grammar..."
            className="absolute inset-0 w-full h-full p-4 font-sans text-base leading-relaxed whitespace-pre-wrap break-words resize-none border-none outline-hidden bg-transparent text-zinc-900 selection:bg-blue-100 selection:text-zinc-900 caret-zinc-900 z-10 opacity-100"
            style={{
              fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              lineHeight: '1.75',
              fontSize: '16px',
              backgroundColor: 'transparent'
            }}
            spellCheck={false}
          />

          {/* Floating Interactive Correction Popover */}
          {activeError && popoverPos && (
            <div
              id="correction-popover"
              className="absolute z-40 w-80 bg-white rounded-xl shadow-xl border border-zinc-200/90 p-3.5 animate-in fade-in zoom-in-95 duration-100 text-left"
              style={{
                left: `${popoverPos.x}px`,
                top: `${popoverPos.y}px`,
              }}
            >
              {/* Popover Header with Error Type Badge */}
              <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${getBadgeForType(activeError.type).dot}`} />
                  <span className="text-[11px] font-semibold text-zinc-700 uppercase tracking-wider">
                    {getBadgeForType(activeError.type).label}
                  </span>
                </div>
                <span className="text-xs font-mono text-zinc-400">
                  {activeError.word}
                </span>
              </div>

              {/* Explanation / Reason */}
              <p className="text-xs text-zinc-600 mt-2 leading-normal">
                {activeError.explanation}
              </p>

              {/* Suggestion Chips */}
              <div className="mt-3">
                <div className="text-[11px] font-medium text-zinc-400 mb-1.5 flex items-center justify-between">
                  <span>Suggested Replacement:</span>
                  <Sparkles className="w-3 h-3 text-amber-500" />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {activeError.suggestions.map((sug, sIdx) => (
                    <button
                      key={sIdx}
                      id={`apply-sug-${sIdx}`}
                      onClick={() => {
                        onApplyCorrection(activeError, sug);
                        setActiveError(null);
                      }}
                      className="group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-600 text-emerald-800 hover:text-white border border-emerald-200 text-xs font-semibold transition-all shadow-2xs cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5 text-emerald-600 group-hover:text-white" />
                      <span>{sug}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Actions Footer */}
              <div className="mt-3 pt-2.5 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-500">
                {activeError.type === 'non-word' && (
                  <button
                    id="add-word-dict-btn"
                    onClick={() => {
                      onAddToDictionary(activeError.word);
                      setActiveError(null);
                    }}
                    className="inline-flex items-center gap-1 text-[11px] hover:text-zinc-900 transition-colors"
                    title="Add to personal dictionary"
                  >
                    <BookPlus className="w-3.5 h-3.5 text-blue-600" />
                    <span>Add to Dictionary</span>
                  </button>
                )}
                <button
                  id="ignore-err-btn"
                  onClick={() => {
                    onIgnoreError(activeError.id);
                    setActiveError(null);
                  }}
                  className="inline-flex items-center gap-1 text-[11px] hover:text-zinc-900 transition-colors ml-auto"
                >
                  <EyeOff className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Ignore</span>
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Side-by-Side Diff View */
        <div className="flex-1 p-4 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-auto min-h-[360px]">
          <div className="flex flex-col bg-zinc-50 rounded-lg p-3.5 border border-zinc-200">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
              Original Text
            </span>
            <div className="text-sm text-zinc-800 whitespace-pre-wrap leading-relaxed">
              {renderHighlightedText()}
            </div>
          </div>
          <div className="flex flex-col bg-emerald-50/40 rounded-lg p-3.5 border border-emerald-200">
            <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5" />
              <span>Corrected Version</span>
            </span>
            <div className="text-sm text-zinc-900 whitespace-pre-wrap leading-relaxed">
              {correctedText || 'Run "Check Text" or click "Fix All" to generate the corrected draft.'}
            </div>
          </div>
        </div>
      )}

      {/* Editor Footer Status Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-50/80 border-t border-zinc-200 text-xs text-zinc-500">
        <div className="flex items-center gap-3">
          <span>{text.length} / {characterLimit} characters</span>
          <span>•</span>
          <span>{text.trim() ? text.trim().split(/\s+/).length : 0} words</span>
        </div>

        <div className="flex items-center gap-2">
          {activeErrors.length > 0 ? (
            <span className="inline-flex items-center gap-1 text-rose-600 font-medium">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{activeErrors.length} issue{activeErrors.length !== 1 ? 's' : ''} detected</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
              <Check className="w-3.5 h-3.5" />
              <span>All clean</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
