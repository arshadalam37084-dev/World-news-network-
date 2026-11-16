import React, { useMemo, useState } from 'react';
import { Calendar, Download, Eye, FileText, Maximize2, Search, X } from 'lucide-react';
import type { Newspaper } from '../types';
import { WhatsAppChannelButton } from './BrandMark';

interface EPaperSectionProps {
  newspapers: Newspaper[];
  whatsappChannelUrl: string;
  onOpenNewspaper: (newspaper: Newspaper) => void;
  title?: string;
  subtitle?: string;
  limit?: number;
  onViewAll?: () => void;
}

export function EPaperSection({
  newspapers,
  whatsappChannelUrl,
  onOpenNewspaper,
  title = 'E-Paper Editions',
  subtitle = 'Browse daily digital broadsheet editions in crisp high resolution. Newest editions appear first.',
  limit,
  onViewAll,
}: EPaperSectionProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');

  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    for (const n of newspapers) {
      if (n.publicationDate && n.publicationDate.length >= 7) {
        set.add(n.publicationDate.slice(0, 7));
      }
    }
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [newspapers]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = newspapers.filter((n) => {
      if (dateFilter && n.publicationDate !== dateFilter) return false;
      if (monthFilter && !n.publicationDate.startsWith(monthFilter)) return false;
      if (q) {
        const hay = `${n.title} ${n.publicationDate} ${n.description}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    return typeof limit === 'number' ? list.slice(0, limit) : list;
  }, [newspapers, searchQuery, dateFilter, monthFilter, limit]);

  const hasFilters = Boolean(searchQuery || dateFilter || monthFilter);

  const handleDownloadEdition = (e: React.MouseEvent, newspaper: Newspaper) => {
    e.stopPropagation();
    const firstPage = newspaper.pages[0];
    if (!firstPage || !newspaper.downloadEnabled) return;
    const a = document.createElement('a');
    a.href = firstPage.imageUrl;
    a.download = `${newspaper.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${newspaper.publicationDate}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <section className="py-10 sm:py-14">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#C8102E]">
            Digital Broadsheet Archive
          </p>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#0B1F3A] mt-1">
            {title}
          </h2>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">{subtitle}</p>
        </div>

        {onViewAll && newspapers.length > (limit || 0) && (
          <button
            type="button"
            onClick={onViewAll}
            className="self-start md:self-auto px-4 py-2 rounded-lg bg-[#0B1F3A] hover:bg-[#132E53] text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Browse All E-Papers ({newspapers.length})
          </button>
        )}
      </div>

      {/* Search & Date Archive Filters (shown on full E-Paper view or when not limited) */}
      {!limit && (
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative sm:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search newspapers by title or date (e.g. 2026-11-16)..."
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#0B1F3A]"
            />
          </div>

          <div className="relative">
            <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="date"
              aria-label="Filter by publication date"
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value);
                if (e.target.value) setMonthFilter('');
              }}
              className="w-full pl-10 pr-3 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#0B1F3A] font-mono tabular-nums"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              aria-label="Browse older newspapers by month"
              value={monthFilter}
              onChange={(e) => {
                setMonthFilter(e.target.value);
                if (e.target.value) setDateFilter('');
              }}
              className="w-full px-3 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#0B1F3A]"
            >
              <option value="">All Months</option>
              {availableMonths.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>

            {hasFilters && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setDateFilter('');
                  setMonthFilter('');
                }}
                aria-label="Clear search filters"
                className="p-2.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Newspaper Gallery */}
      {filtered.length === 0 ? (
        <div className="mt-8 border border-slate-200 rounded-xl bg-slate-50 p-10 text-center">
          <FileText className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <p className="text-base font-semibold text-[#0B1F3A]">No newspaper editions matched your search</p>
          <p className="text-sm text-slate-600 mt-1">
            Try clearing the date filter or searching with a different keyword.
          </p>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
          {filtered.map((paper) => {
            const cover = paper.pages[0]?.imageUrl;
            return (
              <article
                key={paper.id}
                className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col hover:border-[#0B1F3A]/40 transition-colors"
              >
                {/* Newspaper Front-Page Image */}
                <div
                  onClick={() => onOpenNewspaper(paper)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onOpenNewspaper(paper);
                    }
                  }}
                  className="relative aspect-[3/4] bg-slate-100 overflow-hidden group cursor-pointer border-b border-slate-200"
                >
                  {cover ? (
                    <img
                      src={cover}
                      alt={`${paper.title} (${paper.publicationDate})`}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover object-top group-hover:scale-[1.02] transition-transform duration-200"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-slate-100 to-slate-200">
                      <FileText className="w-10 h-10 text-slate-400 mb-2" />
                      <span className="text-sm font-serif font-bold text-slate-700">{paper.title}</span>
                    </div>
                  )}

                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#0B1F3A]/90 via-[#0B1F3A]/45 to-transparent p-4 flex items-end justify-between">
                    <span className="text-xs font-mono tabular-nums text-white font-medium">
                      {paper.pages.length} {paper.pages.length === 1 ? 'Page' : 'Pages'}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-white bg-[#C8102E] px-2.5 py-1 rounded">
                      <Maximize2 className="w-3 h-3" />
                      Read Full Screen
                    </span>
                  </div>
                </div>

                {/* Mandatory WhatsApp Channel Button directly below newspaper image */}
                <div className="px-4 pt-3.5 pb-1">
                  <WhatsAppChannelButton url={whatsappChannelUrl} />
                </div>

                {/* Newspaper Metadata & Controls */}
                <div className="p-4 pt-3 flex-1 flex flex-col">
                  <div className="flex items-center gap-2 text-xs text-slate-500 font-mono tabular-nums">
                    <span>{paper.publicationDate}</span>
                    <span aria-hidden="true">·</span>
                    <span className="inline-flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5" />
                      {paper.views.toLocaleString()} views
                    </span>
                  </div>

                  <h3 className="font-serif text-lg font-bold text-[#0B1F3A] mt-1.5 leading-snug">
                    {paper.title}
                  </h3>

                  {paper.description && (
                    <p className="text-sm text-slate-600 mt-1.5 line-clamp-2 flex-1">
                      {paper.description}
                    </p>
                  )}

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onOpenNewspaper(paper)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#0B1F3A] hover:bg-[#132E53] text-white text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                      <span>Open E-Paper</span>
                    </button>

                    {paper.downloadEnabled && paper.pages.length > 0 && (
                      <button
                        type="button"
                        onClick={(e) => handleDownloadEdition(e, paper)}
                        aria-label={`Download ${paper.title}`}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download</span>
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
