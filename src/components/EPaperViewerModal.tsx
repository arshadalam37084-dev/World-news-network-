import React, { useEffect, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Maximize2,
  RotateCcw,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import type { Newspaper } from '../types';
import { WhatsAppChannelButton } from './BrandMark';

interface EPaperViewerModalProps {
  newspaper: Newspaper;
  whatsappChannelUrl: string;
  onClose: () => void;
}

export function EPaperViewerModal({ newspaper, whatsappChannelUrl, onClose }: EPaperViewerModalProps) {
  const [pageIndex, setPageIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);

  const pages = newspaper.pages;
  const currentPage = pages[pageIndex] || pages[0];

  useEffect(() => {
    setPageIndex(0);
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [newspaper.id]);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight') {
        setPageIndex((i) => Math.min(pages.length - 1, i + 1));
        setPan({ x: 0, y: 0 });
      } else if (e.key === 'ArrowLeft') {
        setPageIndex((i) => Math.max(0, i - 1));
        setPan({ x: 0, y: 0 });
      } else if (e.key === '+' || e.key === '=') {
        setZoom((z) => Math.min(3, Number((z + 0.25).toFixed(2))));
      } else if (e.key === '-') {
        setZoom((z) => {
          const next = Math.max(0.6, Number((z - 0.25).toFixed(2)));
          if (next <= 1) setPan({ x: 0, y: 0 });
          return next;
        });
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose, pages.length]);

  const handleZoomIn = () => setZoom((z) => Math.min(3, Number((z + 0.25).toFixed(2))));
  const handleZoomOut = () =>
    setZoom((z) => {
      const next = Math.max(0.6, Number((z - 0.25).toFixed(2)));
      if (next <= 1) setPan({ x: 0, y: 0 });
      return next;
    });
  const handleResetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const goPage = (nextIdx: number) => {
    setPageIndex(nextIdx);
    setPan({ x: 0, y: 0 });
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (zoom <= 1) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !dragStartRef.current) return;
    setPan({
      x: dragStartRef.current.panX + (e.clientX - dragStartRef.current.x),
      y: dragStartRef.current.panY + (e.clientY - dragStartRef.current.y),
    });
  };

  const handlePointerUp = () => {
    setIsDragging(false);
    dragStartRef.current = null;
  };

  const handleDownloadCurrentPage = () => {
    if (!currentPage || !newspaper.downloadEnabled) return;
    const a = document.createElement('a');
    a.href = currentPage.imageUrl;
    a.download = `${newspaper.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-page-${currentPage.pageNumber}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${newspaper.title} E-Paper Reader`}
      className="fixed inset-0 z-50 bg-[#081221] text-white flex flex-col"
    >
      {/* Top Reader Toolbar */}
      <div className="shrink-0 bg-[#0B1F3A] border-b border-white/10 px-3 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-serif text-sm sm:text-base font-bold text-white truncate">
            {newspaper.title}
          </h2>
          <p className="text-xs text-slate-300 font-mono tabular-nums">
            {newspaper.publicationDate} · Page {pageIndex + 1} of {pages.length}
          </p>
        </div>

        {/* Zoom & Page Controls */}
        <div className="flex items-center flex-wrap gap-1.5 sm:gap-2">
          {pages.length > 1 && (
            <div className="flex items-center bg-white/10 rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => goPage(Math.max(0, pageIndex - 1))}
                disabled={pageIndex === 0}
                aria-label="Previous page"
                className="p-1.5 rounded-md hover:bg-white/10 disabled:opacity-35 cursor-pointer disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 text-xs font-mono tabular-nums whitespace-nowrap">
                {pageIndex + 1} / {pages.length}
              </span>
              <button
                type="button"
                onClick={() => goPage(Math.min(pages.length - 1, pageIndex + 1))}
                disabled={pageIndex >= pages.length - 1}
                aria-label="Next page"
                className="p-1.5 rounded-md hover:bg-white/10 disabled:opacity-35 cursor-pointer disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="flex items-center bg-white/10 rounded-lg p-0.5">
            <button
              type="button"
              onClick={handleZoomOut}
              aria-label="Zoom out"
              className="p-1.5 rounded-md hover:bg-white/10 cursor-pointer"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="px-2 text-xs font-mono tabular-nums min-w-[48px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={handleZoomIn}
              aria-label="Zoom in"
              className="p-1.5 rounded-md hover:bg-white/10 cursor-pointer"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleResetZoom}
              aria-label="Reset zoom"
              title="Fit to screen"
              className="p-1.5 rounded-md hover:bg-white/10 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {newspaper.downloadEnabled && currentPage && (
            <button
              type="button"
              onClick={handleDownloadCurrentPage}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download Page</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            aria-label="Close reader"
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#C8102E] hover:bg-[#9B0C23] text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer"
          >
            <X className="w-4 h-4" />
            <span>Close</span>
          </button>
        </div>
      </div>

      {/* Main Zoomable Broadsheet Canvas */}
      <div
        className={`flex-1 overflow-auto relative flex items-center justify-center p-4 sm:p-6 select-none ${
          zoom > 1 ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default'
        }`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onDoubleClick={() => (zoom === 1 ? setZoom(1.75) : handleResetZoom())}
      >
        {currentPage ? (
          <div
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: 'center center',
            }}
            className="transition-transform duration-150 ease-out max-w-full max-h-full flex items-center justify-center"
          >
            <img
              src={currentPage.imageUrl}
              alt={`${newspaper.title} - Page ${currentPage.pageNumber}`}
              referrerPolicy="no-referrer"
              draggable={false}
              className="max-h-[72vh] sm:max-h-[75vh] w-auto object-contain rounded shadow-2xl bg-white"
            />
          </div>
        ) : (
          <div className="text-slate-400 text-sm">No pages available for this edition.</div>
        )}

        {/* Quick Left/Right Page Floating Controls */}
        {pages.length > 1 && pageIndex > 0 && (
          <button
            type="button"
            onClick={() => goPage(pageIndex - 1)}
            aria-label="Previous newspaper page"
            className="hidden md:flex fixed left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 hover:bg-[#C8102E] text-white items-center justify-center transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
        {pages.length > 1 && pageIndex < pages.length - 1 && (
          <button
            type="button"
            onClick={() => goPage(pageIndex + 1)}
            aria-label="Next newspaper page"
            className="hidden md:flex fixed right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 hover:bg-[#C8102E] text-white items-center justify-center transition-colors cursor-pointer"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Bottom Strip: Page Thumbnails + Mandatory WhatsApp Channel Button Below Newspaper */}
      <div className="shrink-0 bg-[#0B1F3A] border-t border-white/10 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto max-w-full pb-1 sm:pb-0">
          {pages.map((p, idx) => (
            <button
              key={p.id}
              type="button"
              onClick={() => goPage(idx)}
              className={`shrink-0 flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                idx === pageIndex
                  ? 'bg-[#C8102E] text-white'
                  : 'bg-white/10 text-slate-300 hover:bg-white/20'
              }`}
            >
              <Maximize2 className="w-3 h-3" />
              <span>Page {p.pageNumber}</span>
            </button>
          ))}
        </div>

        <WhatsAppChannelButton url={whatsappChannelUrl} compact />
      </div>
    </div>
  );
}
