import React, { useCallback, useEffect, useState } from 'react';
import { ExternalLink, Globe2 } from 'lucide-react';
import {
  checkAdminAuth,
  fetchBootstrap,
  trackNewspaperView,
  trackVideoView,
  trackVisit,
} from './api';
import { AdminPanel } from './components/AdminPanel';
import { WhatsAppChannelButton, WnnLogoMark } from './components/BrandMark';
import { EPaperSection } from './components/EPaperSection';
import { EPaperViewerModal } from './components/EPaperViewerModal';
import { AboutUsSection, ContactUsSection, LatestNewsSection } from './components/LatestNewsAndPages';
import { Navbar } from './components/Navbar';
import { VideoSection } from './components/VideoSection';
import type { Newspaper, PublicBootstrap, PublicSection, VideoItem } from './types';

function readInitialSection(): { isAdmin: boolean; section: PublicSection; videoId: number | null } {
  const path = window.location.pathname.toLowerCase();
  const params = new URLSearchParams(window.location.search);

  if (path === '/admin' || path.startsWith('/admin/') || params.get('admin') === '1') {
    return { isAdmin: true, section: 'home', videoId: null };
  }

  const secParam = params.get('section');
  const validSections: PublicSection[] = ['home', 'latest-news', 'e-paper', 'videos', 'about', 'contact'];
  const section = validSections.includes(secParam as PublicSection) ? (secParam as PublicSection) : 'home';
  const vNum = Number(params.get('v'));

  return {
    isAdmin: false,
    section,
    videoId: Number.isInteger(vNum) && vNum > 0 ? vNum : null,
  };
}

export default function App() {
  const initial = readInitialSection();
  const [isAdminRoute, setIsAdminRoute] = useState(initial.isAdmin);
  const [activeSection, setActiveSection] = useState<PublicSection>(initial.section);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);

  const [data, setData] = useState<PublicBootstrap | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [readerPaper, setReaderPaper] = useState<Newspaper | null>(null);
  const [activeVideo, setActiveVideo] = useState<VideoItem | null>(null);

  const refreshAll = useCallback(async () => {
    try {
      const [bootstrap, auth] = await Promise.all([fetchBootstrap(), checkAdminAuth()]);
      setData(bootstrap);
      setIsAdminAuthenticated(auth);
      setLoadError('');
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Unable to load WORLD NEWS NETWORK.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshAll();
    if (!initial.isAdmin) {
      trackVisit();
    }
  }, [refreshAll, initial.isAdmin]);

  // Handle shared deep link to a specific video (?section=videos&v=ID)
  useEffect(() => {
    if (data && initial.videoId && !activeVideo) {
      const target = data.videos.find((v) => v.id === initial.videoId);
      if (target) {
        setActiveVideo(target);
      }
    }
  }, [data, initial.videoId, activeVideo]);

  useEffect(() => {
    const onPopState = () => {
      const parsed = readInitialSection();
      setIsAdminRoute(parsed.isAdmin);
      setActiveSection(parsed.section);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigatePublic = (section: PublicSection) => {
    setIsAdminRoute(false);
    setActiveSection(section);
    const url = section === 'home' ? '/' : `/?section=${section}`;
    window.history.pushState({}, '', url);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    trackVisit();
  };

  const openAdminPortal = () => {
    setIsAdminRoute(true);
    window.history.pushState({}, '', '/admin');
    window.scrollTo({ top: 0 });
  };

  const handleOpenNewspaper = async (paper: Newspaper) => {
    setReaderPaper(paper);
    const updatedViews = await trackNewspaperView(paper.id);
    if (updatedViews !== null) {
      setData((prev) =>
        prev
          ? {
              ...prev,
              newspapers: prev.newspapers.map((n) =>
                n.id === paper.id ? { ...n, views: updatedViews } : n
              ),
            }
          : prev
      );
    }
  };

  const handlePlayVideo = async (video: VideoItem) => {
    setActiveVideo(video);
    const updatedViews = await trackVideoView(video.id);
    if (updatedViews !== null) {
      setData((prev) =>
        prev
          ? {
              ...prev,
              videos: prev.videos.map((v) =>
                v.id === video.id ? { ...v, views: updatedViews } : v
              ),
            }
          : prev
      );
    }
  };

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
        <WnnLogoMark className="w-12 h-12 mb-3 animate-pulse" />
        <p className="font-serif text-xl font-bold text-[#0B1F3A]">WORLD NEWS NETWORK</p>
        <p className="text-xs text-slate-500 mt-1">Loading digital newsroom...</p>
      </div>
    );
  }

  if (loadError && !data) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
        <p className="font-serif text-xl font-bold text-[#C8102E]">Unable to reach newsroom server</p>
        <p className="text-sm text-slate-600 mt-1">{loadError}</p>
        <button
          type="button"
          onClick={refreshAll}
          className="mt-4 px-4 py-2 rounded-lg bg-[#0B1F3A] text-white text-xs font-semibold cursor-pointer"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  if (!data) return null;

  // Separate Admin Route View
  if (isAdminRoute) {
    return (
      <AdminPanel
        isAuthenticated={isAdminAuthenticated}
        onAuthChange={setIsAdminAuthenticated}
        onBackToSite={() => navigatePublic('home')}
        poster={data.poster}
        whatsappChannelUrl={data.whatsappChannelUrl}
        newspapers={data.newspapers}
        videos={data.videos}
        articles={data.articles}
        defaultIstDate={data.ist.istDate}
        onDataChanged={refreshAll}
      />
    );
  }

  // ==================== PUBLIC WEBSITE VIEW ====================
  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col">
      <Navbar
        activeSection={activeSection}
        onNavigate={navigatePublic}
        onOpenAdmin={openAdminPortal}
        isAdminAuthenticated={isAdminAuthenticated}
      />

      <main className="flex-1">
        {/* HOME VIEW */}
        {activeSection === 'home' && (
          <>
            {/* Broadsheet Masthead Banner */}
            <section className="bg-[#0B1F3A] text-white border-b-4 border-[#C8102E]">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-7 sm:py-9 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex flex-col sm:flex-row items-center text-center sm:text-left gap-4">
                  <WnnLogoMark className="w-14 h-14 sm:w-16 sm:h-16 shrink-0" />
                  <div>
                    <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white">
                      WORLD NEWS NETWORK
                    </h1>
                    <p className="mt-1.5 text-sm sm:text-base font-semibold tracking-widest uppercase text-red-400">
                      REAL NEWS... REAL TIME...
                    </p>
                  </div>
                </div>

                <div className="text-center md:text-right border-t md:border-t-0 border-white/15 pt-4 md:pt-0 w-full md:w-auto">
                  <div className="inline-flex items-center gap-2 text-xs font-mono text-slate-300">
                    <Globe2 className="w-3.5 h-3.5 text-red-400" />
                    <span>Digital Broadsheet Edition</span>
                  </div>
                  <p className="text-sm font-semibold text-white mt-0.5">{data.ist.istDisplayDate}</p>
                  <p className="text-xs font-mono tabular-nums text-slate-300 mt-0.5">
                    IST Edition · {data.newspapers.length} E-Paper{data.newspapers.length === 1 ? '' : 's'} Archived
                  </p>
                </div>
              </div>
            </section>

            {/* 16:9 Homepage Main Poster */}
            {data.poster.enabled && data.poster.imageUrl && (
              <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
                {data.poster.linkUrl ? (
                  <a
                    href={data.poster.linkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block relative aspect-video w-full rounded-xl overflow-hidden border border-slate-200 group shadow-sm"
                  >
                    <img
                      src={data.poster.imageUrl}
                      alt={data.poster.caption || 'WORLD NEWS NETWORK Featured Poster'}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-[1.01] transition-transform duration-300"
                    />
                    {data.poster.caption && (
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#0B1F3A]/90 via-[#0B1F3A]/45 to-transparent p-4 sm:p-6 flex items-end justify-between gap-4">
                        <p className="font-serif text-base sm:text-xl lg:text-2xl font-bold text-white">
                          {data.poster.caption}
                        </p>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#C8102E] text-white text-xs font-semibold whitespace-nowrap shrink-0">
                          <span>Open Link</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    )}
                  </a>
                ) : (
                  <div className="relative aspect-video w-full rounded-xl overflow-hidden border border-slate-200 shadow-sm">
                    <img
                      src={data.poster.imageUrl}
                      alt={data.poster.caption || 'WORLD NEWS NETWORK Featured Poster'}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                    {data.poster.caption && (
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#0B1F3A]/85 via-[#0B1F3A]/40 to-transparent p-4 sm:p-6">
                        <p className="font-serif text-base sm:text-xl lg:text-2xl font-bold text-white">
                          {data.poster.caption}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </section>
            )}

            {/* Homepage E-Paper Gallery Preview (Newest First) */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <EPaperSection
                newspapers={data.newspapers}
                whatsappChannelUrl={data.whatsappChannelUrl}
                onOpenNewspaper={handleOpenNewspaper}
                title="Today's E-Paper Editions"
                subtitle="Read today's broadsheet front page and multi-page supplements in full-screen high resolution."
                limit={3}
                onViewAll={() => navigatePublic('e-paper')}
              />

              <div className="border-t border-slate-200" />

              {/* Homepage Latest News Dispatches */}
              <LatestNewsSection
                articles={data.articles}
                limit={4}
                onViewAll={() => navigatePublic('latest-news')}
              />

              <div className="border-t border-slate-200" />

              {/* Homepage Broadcast Video Bulletins */}
              <VideoSection
                videos={data.videos}
                onPlayVideo={handlePlayVideo}
                activeVideo={activeVideo}
                onCloseVideo={() => setActiveVideo(null)}
                limit={3}
                onViewAll={() => navigatePublic('videos')}
              />
            </div>
          </>
        )}

        {/* DEDICATED LATEST NEWS VIEW */}
        {activeSection === 'latest-news' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <LatestNewsSection articles={data.articles} />
          </div>
        )}

        {/* DEDICATED E-PAPER GALLERY VIEW */}
        {activeSection === 'e-paper' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <EPaperSection
              newspapers={data.newspapers}
              whatsappChannelUrl={data.whatsappChannelUrl}
              onOpenNewspaper={handleOpenNewspaper}
            />
          </div>
        )}

        {/* DEDICATED VIDEOS VIEW */}
        {activeSection === 'videos' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <VideoSection
              videos={data.videos}
              onPlayVideo={handlePlayVideo}
              activeVideo={activeVideo}
              onCloseVideo={() => setActiveVideo(null)}
            />
          </div>
        )}

        {/* ABOUT US VIEW */}
        {activeSection === 'about' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <AboutUsSection whatsappChannelUrl={data.whatsappChannelUrl} />
          </div>
        )}

        {/* CONTACT US VIEW */}
        {activeSection === 'contact' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <ContactUsSection whatsappChannelUrl={data.whatsappChannelUrl} />
          </div>
        )}
      </main>

      {/* Clean Editorial Footer */}
      <footer className="bg-[#0B1F3A] text-white border-t-4 border-[#C8102E] mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          <div className="md:col-span-5 space-y-3">
            <div className="flex items-center gap-3">
              <WnnLogoMark className="w-9 h-9 shrink-0" />
              <div>
                <p className="font-serif text-lg font-extrabold tracking-tight">WORLD NEWS NETWORK</p>
                <p className="text-xs font-semibold uppercase tracking-widest text-red-400">
                  Real News... Real Time...
                </p>
              </div>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-md">
              Independent digital broadsheet, E-Paper archive, and broadcast video news portal delivering verified journalism.
            </p>
          </div>

          <div className="md:col-span-4">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">
              Sections
            </h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {(
                [
                  ['home', 'Home'],
                  ['latest-news', 'Latest News'],
                  ['e-paper', 'E-Paper'],
                  ['videos', 'Videos'],
                  ['about', 'About Us'],
                  ['contact', 'Contact Us'],
                ] as Array<[PublicSection, string]>
              ).map(([sec, label]) => (
                <button
                  key={sec}
                  type="button"
                  onClick={() => navigatePublic(sec)}
                  className="text-left text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="md:col-span-3 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400">
              Instant Alerts
            </h3>
            <WhatsAppChannelButton url={data.whatsappChannelUrl} />
            <button
              type="button"
              onClick={openAdminPortal}
              className="block text-xs text-slate-400 hover:text-white underline cursor-pointer pt-1"
            >
              Editorial Admin Portal
            </button>
          </div>
        </div>

        <div className="border-t border-white/10 py-4 px-4 sm:px-6 lg:px-8 text-center text-xs text-slate-400">
          © {new Date().getFullYear()} WORLD NEWS NETWORK. All rights reserved.
        </div>
      </footer>

      {/* Full-Screen E-Paper Reader Modal */}
      {readerPaper && (
        <EPaperViewerModal
          newspaper={readerPaper}
          whatsappChannelUrl={data.whatsappChannelUrl}
          onClose={() => setReaderPaper(null)}
        />
      )}
    </div>
  );
}
