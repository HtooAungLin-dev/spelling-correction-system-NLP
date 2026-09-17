import React from 'react';
import { CorrectionError } from '../types';
import { BookOpen, Check, X, Sparkles } from 'lucide-react';

interface ExplainModalProps {
  error: CorrectionError | null;
  onClose: () => void;
  detailedExplanation?: string;
  loading?: boolean;
  onApply: (error: CorrectionError, suggestion: string) => void;
}

export const ExplainModal: React.FC<ExplainModalProps> = ({
  error,
  onClose,
  detailedExplanation,
  loading,
  onApply
}) => {
  if (!error) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-zinc-200 p-5 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-900">Grammar & Orthography Guide</h3>
              <p className="text-[11px] text-zinc-400">{error.rule || 'Linguistic Diagnostic'}</p>
            </div>
          </div>
          <button
            id="close-explain-modal-btn"
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="py-4 space-y-3.5 text-xs text-zinc-600">
          <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-rose-600 line-through">
                {error.word}
              </span>
              <span className="font-semibold text-emerald-600">
                ➔ {error.suggestions[0] || 'Correction'}
              </span>
            </div>
            {error.context && (
              <div className="mt-2 text-[11px] text-zinc-500 italic bg-white p-2 rounded border border-zinc-100">
                "...{error.context}..."
              </div>
            )}
          </div>

          <div>
            <span className="font-semibold text-zinc-900 block mb-1">
              Diagnostic Explanation:
            </span>
            <p className="leading-relaxed text-zinc-700">
              {error.explanation}
            </p>
          </div>

          {/* Deep Linguistic AI Analysis */}
          <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-100 text-blue-900">
            <div className="flex items-center gap-1.5 font-semibold mb-1 text-[11px] text-blue-700">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Context & Rule Insights:</span>
            </div>
            {loading ? (
              <div className="flex items-center gap-2 text-zinc-500 py-1">
                <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <span>Consulting linguistic database...</span>
              </div>
            ) : (
              <p className="leading-relaxed text-xs">
                {detailedExplanation || 'In modern standard English, choosing the correct morphological and syntactic form ensures natural readability and clarity for the reader.'}
              </p>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="pt-3 border-t border-zinc-100 flex items-center justify-end gap-2">
          <button
            id="dismiss-explain-btn"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50 text-xs font-medium"
          >
            Dismiss
          </button>
          {error.suggestions.length > 0 && (
            <button
              id="apply-from-modal-btn"
              onClick={() => {
                onApply(error, error.suggestions[0]);
                onClose();
              }}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Apply "{error.suggestions[0]}"</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
