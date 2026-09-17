import React, { useState } from 'react';
import { 
  CorrectionError, 
  ErrorType, 
  TextCheckStats 
} from '../types';
import { 
  AlertCircle, 
  BookOpen, 
  Check, 
  ChevronRight, 
  Plus, 
  Search, 
  Trash2, 
  BarChart3, 
  Filter,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { CORE_DICTIONARY } from '../utils/dictionaryData';

interface SuggestionsPanelProps {
  errors: CorrectionError[];
  onApplyCorrection: (error: CorrectionError, suggestion: string) => void;
  onSelectError: (error: CorrectionError) => void;
  selectedErrorId?: string;
  customWords: string[];
  onAddCustomWord: (word: string) => void;
  onRemoveCustomWord: (word: string) => void;
  stats: TextCheckStats;
  summary?: string;
  onExplainRule?: (error: CorrectionError) => void;
}

export const SuggestionsPanel: React.FC<SuggestionsPanelProps> = ({
  errors,
  onApplyCorrection,
  onSelectError,
  selectedErrorId,
  customWords,
  onAddCustomWord,
  onRemoveCustomWord,
  stats,
  summary,
  onExplainRule
}) => {
  const [activeTab, setActiveTab] = useState<'issues' | 'dictionary' | 'stats'>('issues');
  const [filterType, setFilterType] = useState<ErrorType | 'all'>('all');
  const [dictSearch, setDictSearch] = useState('');
  const [newWordInput, setNewWordInput] = useState('');

  const activeErrors = errors.filter(e => !e.userIgnored);
  const filteredErrors = filterType === 'all' 
    ? activeErrors 
    : activeErrors.filter(e => e.type === filterType);

  // Combined dictionary for lookup
  const allDictionaryWords = Array.from(new Set([...customWords, ...CORE_DICTIONARY])).sort();
  const displayedDictWords = allDictionaryWords
    .filter(w => !dictSearch || w.toLowerCase().includes(dictSearch.toLowerCase()))
    .slice(0, 150); // Keep smooth rendering

  const handleAddWordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newWordInput.trim()) {
      onAddCustomWord(newWordInput.trim().toLowerCase());
      setNewWordInput('');
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl border border-zinc-200 shadow-xs overflow-hidden">
      {/* Tab Switcher */}
      <div className="flex items-center border-b border-zinc-200 bg-zinc-50/70 p-1.5 gap-1 text-xs">
        <button
          id="panel-tab-issues"
          onClick={() => setActiveTab('issues')}
          className={`flex-1 py-1.5 px-2 rounded-lg font-medium transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'issues'
              ? 'bg-white text-zinc-900 shadow-xs border border-zinc-200/80 font-semibold'
              : 'text-zinc-500 hover:text-zinc-900'
          }`}
        >
          <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
          <span>Issues ({activeErrors.length})</span>
        </button>

        <button
          id="panel-tab-dict"
          onClick={() => setActiveTab('dictionary')}
          className={`flex-1 py-1.5 px-2 rounded-lg font-medium transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'dictionary'
              ? 'bg-white text-zinc-900 shadow-xs border border-zinc-200/80 font-semibold'
              : 'text-zinc-500 hover:text-zinc-900'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5 text-blue-500" />
          <span>Dictionary</span>
        </button>

        <button
          id="panel-tab-stats"
          onClick={() => setActiveTab('stats')}
          className={`flex-1 py-1.5 px-2 rounded-lg font-medium transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'stats'
              ? 'bg-white text-zinc-900 shadow-xs border border-zinc-200/80 font-semibold'
              : 'text-zinc-500 hover:text-zinc-900'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5 text-emerald-500" />
          <span>Metrics</span>
        </button>
      </div>

      {/* Tab 1: Issues List */}
      {activeTab === 'issues' && (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Filter Pills */}
          <div className="flex items-center gap-1 px-3 py-2 border-b border-zinc-100 overflow-x-auto text-[11px]">
            <span className="text-zinc-400 mr-1 flex items-center">
              <Filter className="w-3 h-3" />
            </span>
            <button
              id="filter-all-btn"
              onClick={() => setFilterType('all')}
              className={`px-2 py-0.5 rounded-full transition-colors ${
                filterType === 'all'
                  ? 'bg-zinc-800 text-white font-medium'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              }`}
            >
              All ({activeErrors.length})
            </button>
            <button
              id="filter-nonword-btn"
              onClick={() => setFilterType('non-word')}
              className={`px-2 py-0.5 rounded-full transition-colors ${
                filterType === 'non-word'
                  ? 'bg-red-600 text-white font-medium'
                  : 'bg-red-50 text-red-700 hover:bg-red-100'
              }`}
            >
              Spelling ({activeErrors.filter(e => e.type === 'non-word').length})
            </button>
            <button
              id="filter-realword-btn"
              onClick={() => setFilterType('real-word')}
              className={`px-2 py-0.5 rounded-full transition-colors ${
                filterType === 'real-word'
                  ? 'bg-blue-600 text-white font-medium'
                  : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
              }`}
            >
              Real-Word ({activeErrors.filter(e => e.type === 'real-word').length})
            </button>
            <button
              id="filter-grammar-btn"
              onClick={() => setFilterType('grammar')}
              className={`px-2 py-0.5 rounded-full transition-colors ${
                filterType === 'grammar'
                  ? 'bg-emerald-600 text-white font-medium'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              Grammar ({activeErrors.filter(e => e.type === 'grammar').length})
            </button>
          </div>

          {/* AI Executive Summary Banner (if available) */}
          {summary && (
            <div className="mx-3 mt-2 p-2.5 bg-blue-50/70 border border-blue-100 rounded-lg text-xs text-blue-900 leading-relaxed flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <span>{summary}</span>
            </div>
          )}

          {/* Issues List Scrollable */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {filteredErrors.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center text-center p-4 text-zinc-400">
                <Check className="w-8 h-8 text-emerald-500 mb-2 p-1.5 bg-emerald-50 rounded-full" />
                <p className="text-xs font-medium text-zinc-600">No issues found in this category.</p>
                <p className="text-[11px] text-zinc-400 mt-0.5">Your text matches spelling and grammar rules.</p>
              </div>
            ) : (
              filteredErrors.map((err) => {
                const isSelected = selectedErrorId === err.id;
                let badgeBg = 'bg-red-50 text-red-700 border-red-200';
                if (err.type === 'real-word') badgeBg = 'bg-blue-50 text-blue-700 border-blue-200';
                if (err.type === 'grammar') badgeBg = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                if (err.type === 'style') badgeBg = 'bg-amber-50 text-amber-700 border-amber-200';

                return (
                  <div
                    key={err.id}
                    id={`issue-card-${err.id}`}
                    onClick={() => onSelectError(err)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-zinc-50 border-zinc-400 shadow-xs ring-1 ring-zinc-300'
                        : 'bg-white border-zinc-200 hover:border-zinc-300'
                    }`}
                  >
                    {/* Header: Erroneous word and Type */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-zinc-900 text-sm font-mono">
                          {err.word}
                        </span>
                        <ArrowRight className="w-3 h-3 text-zinc-400" />
                        <span className="font-semibold text-emerald-700 text-sm font-mono">
                          {err.suggestions[0] || '—'}
                        </span>
                      </div>
                      <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full border ${badgeBg}`}>
                        {err.type}
                      </span>
                    </div>

                    {/* Explanation */}
                    <p className="text-xs text-zinc-600 mt-1.5 leading-normal">
                      {err.explanation}
                    </p>

                    {/* Quick suggestion replacement chips */}
                    <div className="mt-2.5 flex items-center justify-between gap-2 pt-2 border-t border-zinc-100">
                      <div className="flex flex-wrap gap-1">
                        {err.suggestions.slice(0, 3).map((sug, sIdx) => (
                          <button
                            key={sIdx}
                            onClick={(e) => {
                              e.stopPropagation();
                              onApplyCorrection(err, sug);
                            }}
                            className="px-2 py-1 rounded bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200 text-xs font-medium transition-colors"
                          >
                            Apply "{sug}"
                          </button>
                        ))}
                      </div>

                      {onExplainRule && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onExplainRule(err);
                          }}
                          className="text-[11px] text-blue-600 hover:underline shrink-0"
                        >
                          Why?
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Integrated Dictionary */}
      {activeTab === 'dictionary' && (
        <div className="flex-1 flex flex-col min-h-0 p-3">
          {/* Search Dictionary Input */}
          <div className="relative mb-2">
            <Search className="w-4 h-4 text-zinc-400 absolute left-2.5 top-2.5" />
            <input
              id="dictionary-search-input"
              type="text"
              value={dictSearch}
              onChange={(e) => setDictSearch(e.target.value)}
              placeholder="Search vocabulary..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-zinc-50 border border-zinc-200 rounded-lg outline-hidden focus:border-zinc-400 focus:bg-white transition-colors"
            />
          </div>

          {/* Add custom word form */}
          <form onSubmit={handleAddWordSubmit} className="flex gap-1.5 mb-3">
            <input
              id="add-custom-word-input"
              type="text"
              value={newWordInput}
              onChange={(e) => setNewWordInput(e.target.value)}
              placeholder="Add custom word..."
              className="flex-1 px-2.5 py-1.5 text-xs bg-white border border-zinc-200 rounded-lg outline-hidden focus:border-zinc-400"
            />
            <button
              id="submit-add-word-btn"
              type="submit"
              disabled={!newWordInput.trim()}
              className="px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-medium disabled:opacity-40 transition-colors flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </form>

          {/* Custom Words Section (if any) */}
          {customWords.length > 0 && !dictSearch && (
            <div className="mb-3">
              <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>Custom Vocabulary ({customWords.length})</span>
              </div>
              <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto p-1.5 bg-zinc-50 rounded-lg border border-zinc-200">
                {customWords.map((word) => (
                  <span
                    key={word}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white border border-zinc-200 text-xs text-zinc-800"
                  >
                    <span>{word}</span>
                    <button
                      onClick={() => onRemoveCustomWord(word)}
                      title="Remove from custom dictionary"
                      className="text-zinc-400 hover:text-rose-600 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Words List */}
          <div className="flex-1 overflow-y-auto border border-zinc-100 rounded-lg divide-y divide-zinc-100">
            {displayedDictWords.map((w) => {
              const isCustom = customWords.includes(w);
              return (
                <div
                  key={w}
                  className="px-3 py-1.5 flex items-center justify-between hover:bg-zinc-50 text-xs text-zinc-800"
                >
                  <span className="font-mono">{w}</span>
                  {isCustom ? (
                    <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.2 rounded">
                      User Added
                    </span>
                  ) : (
                    <span className="text-[10px] text-zinc-400">Core</span>
                  )}
                </div>
              );
            })}
          </div>
          <div className="text-[11px] text-zinc-400 mt-2 text-center">
            Showing top {displayedDictWords.length} dictionary entries
          </div>
        </div>
      )}

      {/* Tab 3: Text Statistics & Readability */}
      {activeTab === 'stats' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Readability Scorecard */}
          <div className="p-3.5 bg-zinc-50 border border-zinc-200 rounded-xl">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Flesch Reading Ease
                </span>
                <div className="text-2xl font-bold text-zinc-900 mt-0.5">
                  {stats.fleschScore} <span className="text-xs font-normal text-zinc-500">/ 100</span>
                </div>
              </div>
              <div className="px-2.5 py-1 rounded-lg bg-white border border-zinc-200 text-xs font-semibold text-zinc-700">
                {stats.readabilityGrade}
              </div>
            </div>
            <div className="w-full bg-zinc-200 h-2 rounded-full mt-3 overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all"
                style={{ width: `${stats.fleschScore}%` }}
              />
            </div>
          </div>

          {/* Counts Bento */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-3 rounded-lg border border-zinc-200 bg-white">
              <span className="text-zinc-400">Total Words</span>
              <p className="text-lg font-bold text-zinc-900 mt-0.5">{stats.totalWords}</p>
            </div>
            <div className="p-3 rounded-lg border border-zinc-200 bg-white">
              <span className="text-zinc-400">Characters</span>
              <p className="text-lg font-bold text-zinc-900 mt-0.5">{stats.totalCharacters}</p>
            </div>
            <div className="p-3 rounded-lg border border-zinc-200 bg-white">
              <span className="text-zinc-400">Est. Reading Time</span>
              <p className="text-lg font-bold text-zinc-900 mt-0.5">{stats.readingTimeMinutes} min</p>
            </div>
            <div className="p-3 rounded-lg border border-zinc-200 bg-white">
              <span className="text-zinc-400">Total Errors</span>
              <p className={`text-lg font-bold mt-0.5 ${stats.errorCount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                {stats.errorCount}
              </p>
            </div>
          </div>

          {/* Error Breakdown breakdown */}
          <div className="p-3.5 border border-zinc-200 rounded-xl bg-white space-y-2">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-2">
              Diagnostics Breakdown
            </span>
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2 text-zinc-700">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                <span>Non-word Spelling</span>
              </span>
              <span className="font-semibold">{stats.nonWordCount}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2 text-zinc-700">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <span>Real-word Context Misuse</span>
              </span>
              <span className="font-semibold">{stats.realWordCount}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2 text-zinc-700">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span>Grammar & Agreement</span>
              </span>
              <span className="font-semibold">{stats.grammarCount}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
