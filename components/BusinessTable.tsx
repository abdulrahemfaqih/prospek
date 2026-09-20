'use client';

import { FileText } from 'lucide-react';
import { BusinessWithLead } from '@/lib/types';
import { StatusBadge } from './StatusBadge';

interface BusinessTableProps {
  businesses: BusinessWithLead[];
  isLoading: boolean;
  selectedId?: string | null;
  onSelectBusiness: (business: BusinessWithLead) => void;
  hasActiveFilter: boolean;
}

export function BusinessTable({
  businesses,
  isLoading,
  selectedId,
  onSelectBusiness,
  hasActiveFilter,
}: BusinessTableProps) {
  if (isLoading) {
    return (
      <div className="w-full bg-[var(--color-surface)] border border-[var(--color-line)] rounded-[0px] overflow-hidden my-4">
        <div className="p-8 text-center text-[var(--color-ink-muted)] text-[14px]">
          Memuat data usaha...
        </div>
      </div>
    );
  }

  if (businesses.length === 0) {
    return (
      <div className="w-full bg-[var(--color-surface)] border border-[var(--color-line)] rounded-[0px] p-12 text-center my-4">
        {hasActiveFilter ? (
          <div>
            <p className="text-[14px] text-[var(--color-ink)] font-medium mb-1">
              Tidak ada usaha yang cocok.
            </p>
            <p className="text-[13px] text-[var(--color-ink-muted)]">
              Longgarkan filter atau reset untuk melihat seluruh daftar.
            </p>
          </div>
        ) : (
          <div>
            <p className="text-[14px] text-[var(--color-ink)] font-medium mb-1">
              Belum ada data.
            </p>
            <p className="text-[13px] text-[var(--color-ink-muted)]">
              Jalankan <code className="bg-[var(--color-paper)] px-1.5 py-0.5 rounded font-mono text-[13px]">python scrape.py</code> di terminal, lalu muat ulang halaman ini.
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      {/* 1. Tampilan Kartu Responsif untuk Layar Ponsel (<640px) */}
      <div className="block sm:hidden divide-y divide-[var(--color-line)] border-b border-[var(--color-line)] bg-[var(--color-surface)]">
        {businesses.map((biz) => {
          const isSelected = selectedId === biz.place_id;
          const hasNotes = Boolean(biz.leads?.notes && biz.leads.notes.trim());

          return (
            <div
              key={biz.place_id}
              onClick={() => onSelectBusiness(biz)}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onSelectBusiness(biz);
              }}
              className={`p-3.5 transition-colors cursor-pointer active:bg-[var(--color-paper)] outline-none focus:bg-[var(--color-paper)] ${
                isSelected ? 'bg-[var(--color-accent-soft)]/50' : 'bg-[var(--color-surface)]'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-[14px] font-semibold text-[var(--color-ink)] leading-snug truncate">
                      {biz.name}
                    </span>
                    {hasNotes && (
                      <FileText
                        className="w-3.5 h-3.5 text-[var(--color-ink-faint)] flex-shrink-0"
                        aria-label="Punya catatan"
                      />
                    )}
                  </div>
                  <p className="text-[12px] text-[var(--color-ink-muted)] mt-0.5 truncate">
                    {biz.category || biz.category_group || 'Usaha'} · {biz.city || 'Indonesia'}
                  </p>
                </div>
                <div className="flex-shrink-0 pt-0.5">
                  <StatusBadge status={biz.leads?.status || 'new'} />
                </div>
              </div>

              <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-[var(--color-line)]/60 text-[12px]">
                <div className="flex items-center gap-3">
                  {biz.rating ? (
                    <span className="tabular-nums font-medium text-[var(--color-ink)] flex items-center gap-1">
                      <span className="text-[#B88728]">★</span> {biz.rating.toFixed(1)}
                      <span className="text-[var(--color-ink-muted)] font-normal">
                        ({biz.reviews_count || 0})
                      </span>
                    </span>
                  ) : (
                    <span className="text-[var(--color-ink-faint)]">Belum ada rating</span>
                  )}

                  {biz.wa_number && (
                    <span className="text-[11px] px-1.5 py-0.5 rounded bg-[#EAF5EC] text-[#246636] font-medium">
                      WA
                    </span>
                  )}
                </div>

                <div className="text-[var(--color-ink-muted)] tabular-nums">
                  Skor: <span className="font-semibold text-[var(--color-ink)]">{biz.lead_score}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 2. Tampilan Tabel Penuh untuk Layar Tablet & Desktop (>=640px) */}
      <div className="hidden sm:block w-full overflow-x-auto border-b border-[var(--color-line)]">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="h-[40px] border-b border-[var(--color-line)] bg-[var(--color-paper)] text-[13px] font-medium text-[var(--color-ink-muted)]">
              <th className="px-4 font-medium">Nama usaha</th>
              <th className="px-4 font-medium hidden md:table-cell">Kota</th>
              <th className="px-4 font-medium">Rating</th>
              <th className="px-4 font-medium hidden md:table-cell">Website</th>
              <th className="px-4 font-medium">Telepon</th>
              <th className="px-4 font-medium text-right hidden md:table-cell">Skor</th>
              <th className="px-4 font-medium text-right">Status</th>
            </tr>
          </thead>
          <tbody>
            {businesses.map((biz) => {
              const isSelected = selectedId === biz.place_id;
              const hasNotes = Boolean(biz.leads?.notes && biz.leads.notes.trim());

              // Website display per design.md
              let websiteDisplay = null;
              if (biz.website_kind === 'none' || !biz.website) {
                websiteDisplay = (
                  <span className="font-medium text-[var(--color-ink)]">
                    Tidak ada
                  </span>
                );
              } else {
                try {
                  const url = new URL(biz.website.startsWith('http') ? biz.website : `https://${biz.website}`);
                  const domain = url.hostname.replace(/^www\./, '');
                  websiteDisplay = (
                    <span className="text-[var(--color-ink-muted)] truncate max-w-[140px] inline-block">
                      {domain}
                    </span>
                  );
                } catch {
                  websiteDisplay = (
                    <span className="text-[var(--color-ink-muted)]">
                      {biz.website_kind === 'social' ? 'Media sosial' : 'Website'}
                    </span>
                  );
                }
              }

              return (
                <tr
                  key={biz.place_id}
                  onClick={() => onSelectBusiness(biz)}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') onSelectBusiness(biz);
                  }}
                  className={`h-[52px] border-b border-[var(--color-line)] cursor-pointer transition-colors outline-none focus:bg-[#F8F9FA] ${
                    isSelected
                      ? 'bg-[var(--color-accent-soft)]'
                      : 'hover:bg-[#F8F9FA]'
                  }`}
                >
                  {/* 1. Nama usaha (+ kategori, kota & ikon catatan) */}
                  <td className="px-4 py-1.5">
                    <div className="flex items-center space-x-1.5">
                      <span className="text-[14px] font-medium text-[var(--color-ink)] truncate max-w-[240px] sm:max-w-[320px]">
                        {biz.name}
                      </span>
                      {hasNotes && (
                        <FileText
                          className="w-4 h-4 text-[var(--color-ink-faint)] flex-shrink-0"
                          aria-label="Punya catatan"
                        />
                      )}
                    </div>
                    <div className="text-[13px] text-[var(--color-ink-muted)] leading-[1.3] truncate">
                      {biz.category || biz.category_group || 'Usaha'} · {biz.city || 'Indonesia'}
                    </div>
                  </td>

                  {/* 2. Kota */}
                  <td className="px-4 text-[14px] text-[var(--color-ink)] hidden md:table-cell whitespace-nowrap">
                    {biz.city || '-'}
                  </td>

                  {/* 3. Rating & Review */}
                  <td className="px-4 text-[13px] whitespace-nowrap">
                    {biz.rating ? (
                      <span className="tabular-nums font-medium text-[var(--color-ink)]">
                        {biz.rating.toFixed(1)}{' '}
                        <span className="text-[var(--color-ink-muted)] font-normal">
                          ({biz.reviews_count || 0})
                        </span>
                      </span>
                    ) : (
                      <span className="text-[var(--color-ink-faint)]">-</span>
                    )}
                  </td>

                  {/* 4. Website */}
                  <td className="px-4 text-[13px] hidden md:table-cell whitespace-nowrap">
                    {websiteDisplay}
                  </td>

                  {/* 5. Telepon */}
                  <td className="px-4 text-[13px] text-[var(--color-ink-muted)] tabular-nums whitespace-nowrap">
                    {biz.phone || '-'}
                  </td>

                  {/* 6. Skor Lead (Rata kanan) */}
                  <td className="px-4 text-right hidden md:table-cell whitespace-nowrap">
                    <span className="tabular-nums font-semibold text-[14px] text-[var(--color-ink)]">
                      {biz.lead_score}
                    </span>
                  </td>

                  {/* 7. Status */}
                  <td className="px-4 text-right whitespace-nowrap">
                    <StatusBadge status={biz.leads?.status || 'new'} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
