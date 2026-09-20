'use client';

import { useEffect, useState } from 'react';
import { ExternalLink, X } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createClient } from '@/lib/supabase/client';
import { BusinessWithLead, LeadStatus } from '@/lib/types';
import { NoteEditor } from './NoteEditor';
import { NoteViewer } from './NoteViewer';
import { StatusControl } from './StatusControl';

interface DetailDrawerProps {
  business: BusinessWithLead | null;
  isOpen: boolean;
  onClose: () => void;
}

const DEFAULT_WA_TEMPLATE =
  'Halo, saya Faqih, pembuat website. Saya lihat {nama_usaha} di Google Maps dan belum menemukan websitenya. Boleh saya kirim contoh tampilan website untuk usaha Anda?';

export function DetailDrawer({ business, isOpen, onClose }: DetailDrawerProps) {
  const queryClient = useQueryClient();
  const supabase = createClient();

  // Local state
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [showUnsavedPrompt, setShowUnsavedPrompt] = useState(false);
  const [pendingCloseAction, setPendingCloseAction] = useState<(() => void) | null>(null);
  const [notesSuccessNotice, setNotesSuccessNotice] = useState(false);
  const [notesErrorNotice, setNotesErrorNotice] = useState<string | null>(null);

  // WhatsApp template in localStorage
  const [waTemplate, setWaTemplate] = useState(DEFAULT_WA_TEMPLATE);
  const [isEditingTemplate, setIsEditingTemplate] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('prospek_wa_template');
      if (saved) setWaTemplate(saved);
    }
  }, []);

  // Reset note edit state when selected business changes
  useEffect(() => {
    setIsEditingNotes(false);
    setShowUnsavedPrompt(false);
    setPendingCloseAction(null);
    setNotesErrorNotice(null);
  }, [business?.place_id]);

  // Handle escape key to close drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (isEditingNotes) {
          // If editing notes, confirm discard
          triggerUnsavedCheck(onClose);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isEditingNotes]);

  // 1. Status Mutation with Optimistic Update
  const statusMutation = useMutation({
    mutationFn: async (newStatus: LeadStatus) => {
      if (!business) return;

      const nowIso = new Date().toISOString();
      const payload: any = {
        business_id: business.place_id,
        status: newStatus,
        updated_at: nowIso,
      };

      // If status becomes contacted and contacted_at is null, record current timestamp
      if (newStatus === 'contacted' && !business.leads?.contacted_at) {
        payload.contacted_at = nowIso;
      }

      const { error } = await supabase.from('leads').upsert(payload, {
        onConflict: 'business_id',
      });

      if (error) throw error;
      return payload;
    },
    onMutate: async (newStatus: LeadStatus) => {
      await queryClient.cancelQueries({ queryKey: ['businesses'] });
      const previousData = queryClient.getQueriesData({ queryKey: ['businesses'] });

      // Optimistically update query cache
      queryClient.setQueriesData({ queryKey: ['businesses'] }, (old: any) => {
        if (!old || !old.data) return old;
        return {
          ...old,
          data: old.data.map((item: BusinessWithLead) => {
            if (item.place_id === business?.place_id) {
              return {
                ...item,
                leads: {
                  ...(item.leads || {}),
                  status: newStatus,
                  contacted_at:
                    newStatus === 'contacted' && !item.leads?.contacted_at
                      ? new Date().toISOString()
                      : item.leads?.contacted_at || null,
                },
              };
            }
            return item;
          }),
        };
      });

      return { previousData };
    },
    onError: (_err, _newStatus, context) => {
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['businesses'] });
      queryClient.invalidateQueries({ queryKey: ['summary_stats'] });
    },
  });

  // 2. Notes Mutation
  const notesMutation = useMutation({
    mutationFn: async (newNotes: string) => {
      if (!business) return;

      const nowIso = new Date().toISOString();
      const cleaned = newNotes.trim() ? newNotes.trim() : null;

      const { error } = await supabase.from('leads').upsert(
        {
          business_id: business.place_id,
          notes: cleaned,
          notes_updated_at: nowIso,
          updated_at: nowIso,
        },
        { onConflict: 'business_id' }
      );

      if (error) throw error;
      return { notes: cleaned, notes_updated_at: nowIso };
    },
    onSuccess: (res) => {
      queryClient.setQueriesData({ queryKey: ['businesses'] }, (old: any) => {
        if (!old || !old.data) return old;
        return {
          ...old,
          data: old.data.map((item: BusinessWithLead) => {
            if (item.place_id === business?.place_id) {
              return {
                ...item,
                leads: {
                  ...(item.leads || {}),
                  notes: res?.notes ?? null,
                  notes_updated_at: res?.notes_updated_at ?? null,
                },
              };
            }
            return item;
          }),
        };
      });

      setIsEditingNotes(false);
      setNotesErrorNotice(null);
      setNotesSuccessNotice(true);
      setTimeout(() => setNotesSuccessNotice(false), 2000);
      queryClient.invalidateQueries({ queryKey: ['businesses'] });
    },
    onError: (err: any) => {
      setNotesErrorNotice(
        err?.message || 'Catatan gagal disimpan. Periksa koneksi lalu coba lagi.'
      );
    },
  });

  // 3. Follow up date Mutation
  const followUpMutation = useMutation({
    mutationFn: async (dateStr: string | null) => {
      if (!business) return;

      const nowIso = new Date().toISOString();
      const { error } = await supabase.from('leads').upsert(
        {
          business_id: business.place_id,
          follow_up_at: dateStr || null,
          updated_at: nowIso,
        },
        { onConflict: 'business_id' }
      );

      if (error) throw error;
      return dateStr;
    },
    onSuccess: (newDate) => {
      queryClient.setQueriesData({ queryKey: ['businesses'] }, (old: any) => {
        if (!old || !old.data) return old;
        return {
          ...old,
          data: old.data.map((item: BusinessWithLead) => {
            if (item.place_id === business?.place_id) {
              return {
                ...item,
                leads: {
                  ...(item.leads || {}),
                  follow_up_at: newDate || null,
                },
              };
            }
            return item;
          }),
        };
      });
      queryClient.invalidateQueries({ queryKey: ['businesses'] });
    },
  });

  if (!business) return null;

  const currentNotes = business.leads?.notes || '';
  const currentStatus = business.leads?.status || 'new';

  const triggerUnsavedCheck = (action: () => void) => {
    if (isEditingNotes) {
      setPendingCloseAction(() => action);
      setShowUnsavedPrompt(true);
    } else {
      action();
    }
  };

  const handleDiscardChanges = () => {
    setIsEditingNotes(false);
    setShowUnsavedPrompt(false);
    if (pendingCloseAction) {
      pendingCloseAction();
      setPendingCloseAction(null);
    }
  };

  const handleSaveTemplate = (tmpl: string) => {
    setWaTemplate(tmpl);
    if (typeof window !== 'undefined') {
      localStorage.setItem('prospek_wa_template', tmpl);
    }
    setIsEditingTemplate(false);
  };

  // WhatsApp link generation
  const buildWaLink = () => {
    if (!business.wa_number) return null;
    const message = waTemplate.replace('{nama_usaha}', business.name);
    return `https://wa.me/${business.wa_number}?text=${encodeURIComponent(message)}`;
  };

  const waLink = buildWaLink();
  const mapsUrl =
    business.maps_url ||
    `https://www.google.com/maps/place/?q=place_id:${business.place_id.replace('data:', '')}`;

  // Formatted date string for notes updated
  const formattedNotesDate = business.leads?.notes_updated_at
    ? new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'short',
      }).format(new Date(business.leads.notes_updated_at))
    : null;

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className={`fixed inset-0 bg-black/40 z-40 transition-opacity duration-160 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => triggerUnsavedCheck(onClose)}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        className={`fixed inset-y-0 right-0 w-full sm:w-[440px] max-w-full bg-[var(--color-surface)] z-50 border-l border-[var(--color-line)] shadow-drawer flex flex-col transition-transform duration-160 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* 1. Header Drawer */}
        <div className="p-4 sm:p-5 border-b border-[var(--color-line)] flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-[18px] sm:text-[20px] font-semibold text-[var(--color-ink)] leading-[1.3] m-0 truncate">
              {business.name}
            </h2>
            <p className="text-[12px] sm:text-[13px] text-[var(--color-ink-muted)] mt-1 mb-0 truncate">
              {business.category || business.category_group || 'Usaha'} · {business.city || 'Indonesia'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => triggerUnsavedCheck(onClose)}
            aria-label="Tutup drawer"
            className="p-1.5 -mr-1 text-[var(--color-ink-faint)] hover:text-[var(--color-ink)] rounded-[6px] hover:bg-[rgba(0,0,0,0.03)] transition-colors cursor-pointer flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

      {/* Unsaved Warning Banner */}
      {showUnsavedPrompt && (
        <div className="bg-[#F6EDD6] border-b border-[#EBD7A7] p-3 text-[13px] text-[#7A5B12] flex items-center justify-between">
          <span>Catatan belum disimpan.</span>
          <div className="flex space-x-2">
            <button
              type="button"
              onClick={handleDiscardChanges}
              className="font-medium underline hover:text-[#5A4108] cursor-pointer"
            >
              Buang perubahan
            </button>
            <button
              type="button"
              onClick={() => setShowUnsavedPrompt(false)}
              className="font-medium bg-white/80 px-2 py-0.5 rounded border border-[#EBD7A7] hover:bg-white cursor-pointer"
            >
              Lanjut mengedit
            </button>
          </div>
        </div>
      )}

      {/* Scrollable Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* 2. Status Segmented Control */}
        <div>
          <label className="block text-[14px] font-semibold text-[var(--color-ink)] mb-2">
            Status
          </label>
          <StatusControl
            currentStatus={currentStatus}
            onStatusChange={(newSt) => statusMutation.mutate(newSt)}
            disabled={statusMutation.isPending}
          />
        </div>

        <div className="border-t border-[var(--color-line)]" />

        {/* 3. Detail Usaha */}
        <div className="space-y-2.5 text-[14px]">
          <div className="grid grid-cols-[80px_1fr] gap-2">
            <span className="text-[var(--color-ink-muted)] text-[13px]">Alamat</span>
            <span className="text-[var(--color-ink)] break-words max-w-[70ch]">
              {business.address || '-'}
            </span>
          </div>

          <div className="grid grid-cols-[80px_1fr] gap-2">
            <span className="text-[var(--color-ink-muted)] text-[13px]">Telepon</span>
            <span className="text-[var(--color-ink)] tabular-nums">
              {business.phone || '-'}
            </span>
          </div>

          <div className="grid grid-cols-[80px_1fr] gap-2">
            <span className="text-[var(--color-ink-muted)] text-[13px]">Website</span>
            <div>
              {business.website ? (
                <a
                  href={business.website.startsWith('http') ? business.website : `https://${business.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--color-accent)] underline hover:text-[var(--color-accent-hover)] inline-flex items-center gap-1"
                >
                  <span className="truncate max-w-[240px]">{business.website}</span>
                  <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                </a>
              ) : (
                <span className="font-medium text-[var(--color-ink)]">Tidak ada</span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-[80px_1fr] gap-2">
            <span className="text-[var(--color-ink-muted)] text-[13px]">Rating</span>
            <span className="text-[var(--color-ink)] tabular-nums">
              {business.rating ? `${business.rating.toFixed(1)} (${business.reviews_count || 0} ulasan)` : '-'}
            </span>
          </div>

          <div className="grid grid-cols-[80px_1fr] gap-2">
            <span className="text-[var(--color-ink-muted)] text-[13px]">Maps</span>
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--color-accent)] underline hover:text-[var(--color-accent-hover)] inline-flex items-center gap-1"
            >
              <span>Buka di Google Maps</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        <div className="border-t border-[var(--color-line)]" />

        {/* 4. Catatan Markdown */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <span className="text-[14px] font-semibold text-[var(--color-ink)]">
                Catatan
              </span>
              {notesSuccessNotice && (
                <span className="text-[12px] text-[var(--color-accent)] font-medium">
                  Catatan tersimpan
                </span>
              )}
            </div>

            {!isEditingNotes && (
              <button
                type="button"
                onClick={() => setIsEditingNotes(true)}
                className="text-[13px] text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] font-medium cursor-pointer"
              >
                {currentNotes ? 'Ubah' : 'Tambah catatan'}
              </button>
            )}
          </div>

          {notesErrorNotice && (
            <div className="mb-2 p-2.5 bg-[#F3E3E3] border border-[#E4BCBC] text-[#8C3B3B] text-[13px] rounded-[6px]">
              {notesErrorNotice}
            </div>
          )}

          {isEditingNotes ? (
            <NoteEditor
              initialContent={currentNotes}
              onSave={(content) => notesMutation.mutate(content)}
              onCancel={() => triggerUnsavedCheck(() => setIsEditingNotes(false))}
              isSaving={notesMutation.isPending}
            />
          ) : (
            <div>
              <NoteViewer content={currentNotes} />
              {formattedNotesDate && (
                <div className="text-[13px] text-[var(--color-ink-faint)] mt-2">
                  Diperbarui {formattedNotesDate}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="border-t border-[var(--color-line)]" />

        {/* 5. Tanggal Tindak Lanjut */}
        <div>
          <label
            htmlFor="follow_up_input"
            className="block text-[14px] font-semibold text-[var(--color-ink)] mb-1.5"
          >
            Tindak lanjut
          </label>
          <input
            id="follow_up_input"
            type="date"
            value={business.leads?.follow_up_at || ''}
            onChange={(e) => followUpMutation.mutate(e.target.value || null)}
            className="h-[36px] px-3 bg-[var(--color-surface)] border border-[var(--color-line)] rounded-[6px] text-[14px] text-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
          />
        </div>
      </div>

      {/* 6. Footer: Tombol Buka WhatsApp */}
      <div className="p-4 border-t border-[var(--color-line)] bg-[var(--color-paper)] space-y-2">
        {waLink ? (
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full h-[40px] bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-medium text-[14px] rounded-[6px] flex items-center justify-center transition-colors cursor-pointer"
          >
            Buka WhatsApp
          </a>
        ) : (
          <div>
            <button
              type="button"
              disabled
              className="w-full h-[40px] bg-[var(--color-surface)] border border-[var(--color-line-strong)] text-[var(--color-ink-faint)] font-medium text-[14px] rounded-[6px] flex items-center justify-center cursor-not-allowed opacity-70"
            >
              Buka WhatsApp
            </button>
            <p className="text-[12px] text-[var(--color-ink-muted)] text-center mt-1 mb-0">
              Nomor bukan seluler, hubungi lewat telepon
            </p>
          </div>
        )}

        {/* Template WhatsApp Editor Modal/Toggle */}
        <div className="text-center">
          <button
            type="button"
            onClick={() => setIsEditingTemplate(!isEditingTemplate)}
            className="text-[12px] text-[var(--color-ink-muted)] hover:text-[var(--color-accent)] underline cursor-pointer"
          >
            {isEditingTemplate ? 'Tutup editor template' : 'Ubah template pesan WhatsApp'}
          </button>
        </div>

        {isEditingTemplate && (
          <div className="p-3 bg-[var(--color-surface)] border border-[var(--color-line)] rounded-[6px] text-[12px] space-y-2">
            <label className="block font-medium text-[var(--color-ink)]">
              Template Pesan (gunakan {'{nama_usaha}'} sebagai variabel):
            </label>
            <textarea
              defaultValue={waTemplate}
              id="wa_template_textarea"
              rows={3}
              className="w-full p-2 border border-[var(--color-line)] rounded text-[12px] font-sans resize-y focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
            />
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById('wa_template_textarea') as HTMLTextAreaElement;
                  if (el) handleSaveTemplate(el.value);
                }}
                className="h-[28px] px-3 bg-[var(--color-accent)] text-white rounded text-[12px] font-medium cursor-pointer"
              >
                Simpan template
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  </>
  );
}
