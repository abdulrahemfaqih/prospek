import { LeadStatus } from '@/lib/types';

interface StatusBadgeProps {
  status: LeadStatus | string;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; text: string; bg: string }
> = {
  new: {
    label: 'Baru',
    text: '#4A5565',
    bg: '#EBEDF1',
  },
  contacted: {
    label: 'Dihubungi',
    text: '#7A5B12',
    bg: '#F6EDD6',
  },
  replied: {
    label: 'Dibalas',
    text: '#1D5B79',
    bg: '#E4EEF3',
  },
  deal: {
    label: 'Deal',
    text: '#2F6B4F',
    bg: '#E1EFE7',
  },
  rejected: {
    label: 'Ditolak',
    text: '#8C3B3B',
    bg: '#F3E3E3',
  },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.new;

  return (
    <span
      style={{ color: config.text, backgroundColor: config.bg }}
      className="inline-flex items-center px-2 py-0.5 rounded-[6px] text-[12px] font-medium whitespace-nowrap"
    >
      {config.label}
    </span>
  );
}
