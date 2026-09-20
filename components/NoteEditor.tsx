'use client';

import { useEffect, useRef, useState } from 'react';

interface NoteEditorProps {
  initialContent: string;
  onSave: (newContent: string) => void;
  onCancel: () => void;
  isSaving: boolean;
}

const MAX_CHARS = 20000;
const WARNING_THRESHOLD = 18000;

export function NoteEditor({
  initialContent,
  onSave,
  onCancel,
  isSaving,
}: NoteEditorProps) {
  const [content, setContent] = useState(initialContent || '');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto focus and set cursor at end of text on mount
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
      const length = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(length, length);
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      onSave(content);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  const charCount = content.length;
  const isNearLimit = charCount >= WARNING_THRESHOLD;

  return (
    <div className="space-y-3">
      <textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => setContent(e.target.value.slice(0, MAX_CHARS))}
        onKeyDown={handleKeyDown}
        placeholder="Tulis dengan markdown, misalnya - untuk daftar atau **tebal**."
        className="w-full min-h-[200px] p-3 bg-[var(--color-surface)] border border-[var(--color-line)] rounded-[6px] text-[14px] font-sans text-[var(--color-ink)] placeholder:text-[var(--color-ink-faint)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-2 resize-y"
      />

      <div className="flex items-center justify-between">
        <div className="text-[12px] text-[var(--color-ink-muted)]">
          {isNearLimit && (
            <span className={charCount >= MAX_CHARS ? 'text-[#8C3B3B] font-semibold' : ''}>
              {charCount.toLocaleString('id-ID')} / {MAX_CHARS.toLocaleString('id-ID')} karakter
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            className="h-[36px] px-3 bg-[var(--color-surface)] border border-[var(--color-line-strong)] text-[var(--color-ink)] rounded-[6px] text-[13px] font-medium hover:bg-[#F8F9FA] transition-colors cursor-pointer disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={() => onSave(content)}
            disabled={isSaving}
            className="h-[36px] px-4 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white rounded-[6px] text-[13px] font-medium transition-colors flex items-center cursor-pointer disabled:opacity-50"
          >
            {isSaving ? 'Menyimpan...' : 'Simpan catatan'}
          </button>
        </div>
      </div>
    </div>
  );
}
