interface PaginationProps {
  currentPage: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (newPage: number) => void;
}

export function Pagination({
  currentPage,
  pageSize,
  totalCount,
  onPageChange,
}: PaginationProps) {
  if (totalCount === 0) return null;

  const from = Math.min((currentPage - 1) * pageSize + 1, totalCount);
  const to = Math.min(currentPage * pageSize, totalCount);
  const totalPages = Math.ceil(totalCount / pageSize);

  const hasPrev = currentPage > 1;
  const hasNext = currentPage < totalPages;

  return (
    <div className="flex items-center justify-between py-3.5 sm:py-4 text-[12px] sm:text-[13px] text-[var(--color-ink-muted)] gap-2">
      <div className="text-left">
        <span className="tabular-nums font-semibold text-[var(--color-ink)]">
          {from}-{to}
        </span>{' '}
        dari{' '}
        <span className="tabular-nums font-semibold text-[var(--color-ink)]">
          {totalCount.toLocaleString('id-ID')}
        </span>
      </div>

      <div className="flex items-center space-x-1.5 sm:space-x-2 flex-shrink-0">
        <button
          type="button"
          disabled={!hasPrev}
          onClick={() => onPageChange(currentPage - 1)}
          aria-label="Halaman sebelumnya"
          className="h-[34px] sm:h-[32px] px-2.5 sm:px-3 bg-[var(--color-surface)] border border-[var(--color-line-strong)] text-[var(--color-ink)] rounded-[6px] text-[12px] sm:text-[13px] font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#F8F9FA] transition-colors cursor-pointer"
        >
          &lt; Sebelumnya
        </button>
        <button
          type="button"
          disabled={!hasNext}
          onClick={() => onPageChange(currentPage + 1)}
          aria-label="Halaman berikutnya"
          className="h-[34px] sm:h-[32px] px-2.5 sm:px-3 bg-[var(--color-surface)] border border-[var(--color-line-strong)] text-[var(--color-ink)] rounded-[6px] text-[12px] sm:text-[13px] font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#F8F9FA] transition-colors cursor-pointer"
        >
          Lanjut &gt;
        </button>
      </div>
    </div>
  );
}
