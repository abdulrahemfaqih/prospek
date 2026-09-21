'use client';

import { LeadStatus } from '@/lib/types';

interface StatusControlProps {
  currentStatus: LeadStatus;
  onStatusChange: (status: LeadStatus) => void;
  disabled?: boolean;
}

// Grup 1: Alur prospek awal
const STATUS_PROSPECT: { key: LeadStatus; label: string }[] = [
  { key: 'new', label: 'Baru' },
  { key: 'contacted', label: 'Dihubungi' },
  { key: 'replied', label: 'Dibalas' },
  { key: 'rejected', label: 'Ditolak' },
];

// Grup 2: Alur pengerjaan proyek
const STATUS_PROJECT: { key: LeadStatus; label: string; color: string; activeBg: string }[] = [
  { key: 'demo',        label: 'Pembuatan Demo', color: '#6B3FA0', activeBg: '#6B3FA0' },
  { key: 'deal',        label: 'Deal',           color: '#2F6B4F', activeBg: '#2F6B4F' },
  { key: 'development', label: 'Development',    color: '#1A3F6F', activeBg: '#1A3F6F' },
  { key: 'revisi',      label: 'Revisi',         color: '#8C5A1A', activeBg: '#8C5A1A' },
  { key: 'selesai',     label: 'Selesai',        color: '#1F5C35', activeBg: '#1F5C35' },
];

export function StatusControl({
  currentStatus,
  onStatusChange,
  disabled = false,
}: StatusControlProps) {
  return (
    <div className="w-full space-y-2">
      {/* Baris 1: Status prospek */}
      <div>
        <p className="text-[10px] text-[var(--color-ink-faint)] font-medium uppercase tracking-wider mb-1 px-0.5">
          Prospek
        </p>
        <div className="flex w-full bg-[var(--color-paper)] p-1 rounded-[6px] border border-[var(--color-line)] gap-1">
          {STATUS_PROSPECT.map((opt) => {
            const isActive = currentStatus === opt.key;
            return (
              <button
                key={opt.key}
                type="button"
                disabled={disabled}
                onClick={() => onStatusChange(opt.key)}
                className={`flex-1 h-[30px] px-1 text-[11px] sm:text-[12px] rounded-[4px] font-medium transition-all flex items-center justify-center cursor-pointer disabled:cursor-not-allowed select-none ${
                  isActive
                    ? 'bg-[var(--color-surface)] text-[var(--color-ink)] shadow-sm font-semibold'
                    : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[rgba(0,0,0,0.03)]'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Baris 2: Status pengerjaan proyek */}
      <div>
        <p className="text-[10px] text-[var(--color-ink-faint)] font-medium uppercase tracking-wider mb-1 px-0.5">
          Pengerjaan Proyek
        </p>
        <div className="flex w-full bg-[#F7F4FC] p-1 rounded-[6px] border border-[#D8CCEE] gap-1">
          {STATUS_PROJECT.map((opt) => {
            const isActive = currentStatus === opt.key;
            return (
              <button
                key={opt.key}
                type="button"
                disabled={disabled}
                onClick={() => onStatusChange(opt.key)}
                style={isActive ? { backgroundColor: opt.activeBg, color: '#fff' } : {}}
                className={`flex-1 h-[30px] px-0.5 text-[10px] sm:text-[11px] rounded-[4px] font-medium transition-all flex items-center justify-center cursor-pointer disabled:cursor-not-allowed select-none ${
                  isActive
                    ? 'shadow-sm font-semibold'
                    : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[rgba(0,0,0,0.04)]'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

