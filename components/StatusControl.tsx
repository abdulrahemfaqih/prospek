'use client';

import { LeadStatus } from '@/lib/types';

interface StatusControlProps {
  currentStatus: LeadStatus;
  onStatusChange: (status: LeadStatus) => void;
  disabled?: boolean;
}

const STATUS_OPTIONS: { key: LeadStatus; label: string }[] = [
  { key: 'new', label: 'Baru' },
  { key: 'contacted', label: 'Dihubungi' },
  { key: 'replied', label: 'Dibalas' },
  { key: 'deal', label: 'Deal' },
  { key: 'rejected', label: 'Ditolak' },
];

export function StatusControl({
  currentStatus,
  onStatusChange,
  disabled = false,
}: StatusControlProps) {
  return (
    <div className="w-full">
      <div className="flex w-full bg-[var(--color-paper)] p-1 rounded-[6px] border border-[var(--color-line)] gap-1">
        {STATUS_OPTIONS.map((opt) => {
          const isActive = currentStatus === opt.key;
          return (
            <button
              key={opt.key}
              type="button"
              disabled={disabled}
              onClick={() => onStatusChange(opt.key)}
              className={`flex-1 h-[32px] px-0.5 sm:px-1 text-[11px] sm:text-[12px] rounded-[6px] font-medium transition-all flex items-center justify-center cursor-pointer disabled:cursor-not-allowed select-none ${
                isActive
                  ? 'bg-[var(--color-surface)] text-[var(--color-ink)] shadow-sm font-semibold'
                  : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[rgba(0,0,0,0.02)]'
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
