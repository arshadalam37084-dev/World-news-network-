import React, { useMemo, useRef, useState } from 'react';
import { Check, Eye, Film, Play, Search, Share2, X } from 'lucide-react';
import type { VideoItem } from '../types';

interface VideoSectionProps {
  videos: VideoItem[];
  onPlayVideo: (video: VideoItem) => void;
  activeVideo: VideoItem | null;
  onCloseVideo: () => void;
  limit?: number;
  onViewAll?: () => void;
}

export function VideoSection({
  videos,
  onPlayVideo,
  activeVideo,
  onCloseVideo,
  limit,
  onViewAll,
}: VideoSectionProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const videoElRef = useRef<HTMLVideoElement | null>(null);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = q
      ? videos.filter((v) => `${v.title} ${v.description}`.toLowerCase().includes(q))
      : videos;
    return typeof limit === 'number' ? list.slice(0, limit) : list;
  }, [videos, searchQuery, limit]);

  const handleShare = async (video: VideoItem) => {
    const url = `${window.location.origin}/?section=videos&v=${video.id}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: video.title, text: video.description || video.title, url });
        return;
      } catch {
        // Fallback to clipboard copy
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(video.id);
      setTimeout(() => setCopiedId((prev) => (prev === video.id ? null : prev)), 2500);
    } catch {
      // Ignore clipboard failure
    }
  };

  return (
    <section className="py-10 sm:py-14">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#C8102E]">
            WNN Broadcast Desk
          </p>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#0B1F3A] mt-1">
            Broadcast Video Bulletins
          </h2>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            Watch field reports, studio briefings, and special video dispatches directly on WORLD NEWS NETWORK.
          </p>
        </div>

        {onViewAll && videos.length > (limit || 0) && (
          <button
            type="button"
            onClick={onViewAll}
            className="self-start md:self-auto px-4 py-2 rounded-lg bg-[#0B1F3A] hover:bg-[#132E53] text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            All Videos ({videos.length})
          </button>
        )}
      </div>

      {!limit && (
        <div className="mt-6 max-w-md relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search video bulletins..."
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#0B1F3A]"
          />
        </div>
      )}

      {/* Active Embedded Video Player Stage */}
      {activeVideo && (
        <div className="mt-8 bg-[#0B1F3A] rounded-xl overflow-hidden border border-slate-800 text-white">
          <div className="px-4 sm:px-6 py-3 border-b border-white/10 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-mono text-red-400 uppercase tracking-wider">Now Playing</p>
              <h3 className="font-serif text-base sm:text-lg font-bold truncate">{activeVideo.title}</h3>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleShare(activeVideo)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold transition-colors cursor-pointer"
              >
                {copiedId === activeVideo.id ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Link Copied</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Share</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={onCloseVideo}
                aria-label="Close video player"
                className="p-1.5 rounded-lg bg-white/10 hover:bg-[#C8102E] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="bg-black aspect-video w-full">
            <video
              ref={videoElRef}
              key={activeVideo.id}
              src={activeVideo.videoUrl}
              poster={activeVideo.thumbnailUrl || undefined}
              controls
              autoPlay
              playsInline
              className="w-full h-full object-contain"
            />
          </div>

          {activeVideo.description && (
            <div className="px-4 sm:px-6 py-4 text-sm text-slate-300 border-t border-white/10">
              {activeVideo.description}
            </div>
          )}
        </div>
      )}

      {/* Video Cards Grid */}
      {filtered.length === 0 ? (
        <div className="mt-8 border border-slate-200 rounded-xl bg-slate-50 p-10 text-center">
          <Film className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <p className="text-base font-semibold text-[#0B1F3A]">No videos available</p>
          <p className="text-sm text-slate-600 mt-1">
            {searchQuery ? 'Try adjusting your search query.' : 'Uploaded MP4 video bulletins will appear here.'}
          </p>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((video) => {
            const isPlaying = activeVideo?.id === video.id;
            return (
              <article
                key={video.id}
                className={`bg-white border rounded-xl overflow-hidden flex flex-col transition-colors ${
                  isPlaying ? 'border-[#C8102E]' : 'border-slate-200 hover:border-[#0B1F3A]/40'
                }`}
              >
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => onPlayVideo(video)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onPlayVideo(video);
                    }
                  }}
                  className="relative aspect-video bg-[#0B1F3A] overflow-hidden group cursor-pointer"
                >
                  {video.thumbnailUrl ? (
                    <img
                      src={video.thumbnailUrl}
                      alt={video.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-200"
                    />
                  ) : (
                    <video
                      src={video.videoUrl}
                      muted
                      preload="metadata"
                      className="w-full h-full object-cover"
                    />
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex items-center justify-center">
                    <span className="w-12 h-12 rounded-full bg-[#C8102E] group-hover:bg-[#9B0C23] text-white flex items-center justify-center shadow-lg transition-transform group-hover:scale-105">
                      <Play className="w-5 h-5 fill-current ml-0.5" />
                    </span>
                  </div>
                </div>

                <div className="p-4 flex-1 flex flex-col">
                  <div className="flex items-center gap-2 text-xs text-slate-500 font-mono tabular-nums">
                    <span>{video.createdAt.slice(0, 10)}</span>
                    <span aria-hidden="true">·</span>
                    <span className="inline-flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5" />
                      {video.views.toLocaleString()} views
                    </span>
                  </div>

                  <h3 className="font-serif text-lg font-bold text-[#0B1F3A] mt-1.5 leading-snug">
                    {video.title}
                  </h3>

                  {video.description && (
                    <p className="text-sm text-slate-600 mt-1.5 line-clamp-2 flex-1">
                      {video.description}
                    </p>
                  )}

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onPlayVideo(video)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#0B1F3A] hover:bg-[#132E53] text-white text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>{isPlaying ? 'Playing Now' : 'Watch Video'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleShare(video)}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer"
                    >
                      {copiedId === video.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Share2 className="w-3.5 h-3.5" />
                          <span>Share</span>
                        </>
                      )}
                    </button>
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
