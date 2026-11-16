import React, { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  Edit3,
  Eye,
  EyeOff,
  FilePlus2,
  Film,
  Image as ImageIcon,
  KeyRound,
  Lock,
  LogOut,
  MessageSquare,
  Newspaper as NewspaperIcon,
  Plus,
  Trash2,
  Upload,
  Video as VideoIcon,
  X,
} from 'lucide-react';
import {
  adminChangePassword,
  adminLogin,
  adminLogout,
  createArticle,
  deleteArticle,
  deleteNewspaper,
  deleteVideo,
  fetchAdminAnalytics,
  fetchAdminMessages,
  removePoster,
  updateNewspaper,
  updatePosterMeta,
  updateVideo,
  updateWhatsappChannel,
  uploadNewspaper,
  uploadPoster,
  uploadVideo,
} from '../api';
import type {
  AnalyticsPayload,
  ContactMessage,
  NewsArticle,
  Newspaper,
  PosterConfig,
  VideoItem,
} from '../types';
import { AdminAnalyticsPanel } from './AdminAnalyticsPanel';
import { WhatsAppIcon, WnnLogoMark } from './BrandMark';

type AdminTab =
  | 'analytics'
  | 'upload-newspaper'
  | 'manage-newspapers'
  | 'poster'
  | 'upload-video'
  | 'manage-videos'
  | 'whatsapp'
  | 'news-desk'
  | 'password';

interface AdminPanelProps {
  isAuthenticated: boolean;
  onAuthChange: (authenticated: boolean) => void;
  onBackToSite: () => void;
  poster: PosterConfig;
  whatsappChannelUrl: string;
  newspapers: Newspaper[];
  videos: VideoItem[];
  articles: NewsArticle[];
  defaultIstDate: string;
  onDataChanged: () => Promise<void>;
}

export function AdminPanel({
  isAuthenticated,
  onAuthChange,
  onBackToSite,
  poster,
  whatsappChannelUrl,
  newspapers,
  videos,
  articles,
  defaultIstDate,
  onDataChanged,
}: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>('analytics');
  const [statusBanner, setStatusBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Login State
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPw, setShowLoginPw] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loginBusy, setLoginBusy] = useState(false);

  // Analytics & Messages
  const [analytics, setAnalytics] = useState<AnalyticsPayload | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [messages, setMessages] = useState<ContactMessage[]>([]);

  // Upload Newspaper State
  const [npTitle, setNpTitle] = useState('');
  const [npDate, setNpDate] = useState(defaultIstDate);
  const [npDesc, setNpDesc] = useState('');
  const [npDownloadEnabled, setNpDownloadEnabled] = useState(true);
  const [npFiles, setNpFiles] = useState<File[]>([]);
  const [npUploading, setNpUploading] = useState(false);

  // Edit Newspaper Modal State
  const [editingPaper, setEditingPaper] = useState<Newspaper | null>(null);
  const [editNpTitle, setEditNpTitle] = useState('');
  const [editNpDate, setEditNpDate] = useState('');
  const [editNpDesc, setEditNpDesc] = useState('');
  const [editNpDownload, setEditNpDownload] = useState(true);
  const [editNpKeepPageIds, setEditNpKeepPageIds] = useState<number[]>([]);
  const [editNpNewFiles, setEditNpNewFiles] = useState<File[]>([]);
  const [editNpSaving, setEditNpSaving] = useState(false);

  // Poster State
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [posterLink, setPosterLink] = useState(poster.linkUrl);
  const [posterCaption, setPosterCaption] = useState(poster.caption);
  const [posterBusy, setPosterBusy] = useState(false);

  // Upload Video State
  const [vidTitle, setVidTitle] = useState('');
  const [vidDesc, setVidDesc] = useState('');
  const [vidFile, setVidFile] = useState<File | null>(null);
  const [vidThumb, setVidThumb] = useState<File | null>(null);
  const [vidUploading, setVidUploading] = useState(false);

  // Edit Video Modal State
  const [editingVideo, setEditingVideo] = useState<VideoItem | null>(null);
  const [editVidTitle, setEditVidTitle] = useState('');
  const [editVidDesc, setEditVidDesc] = useState('');
  const [editVidThumb, setEditVidThumb] = useState<File | null>(null);
  const [editVidSaving, setEditVidSaving] = useState(false);

  // WhatsApp Channel State
  const [waUrlInput, setWaUrlInput] = useState(whatsappChannelUrl);
  const [waBusy, setWaBusy] = useState(false);

  // Latest News Article State
  const [artTitle, setArtTitle] = useState('');
  const [artCategory, setArtCategory] = useState('World Affairs');
  const [artSummary, setArtSummary] = useState('');
  const [artContent, setArtContent] = useState('');
  const [artAuthor, setArtAuthor] = useState('WNN Editorial Desk');
  const [artBreaking, setArtBreaking] = useState(false);
  const [artImage, setArtImage] = useState<File | null>(null);
  const [artBusy, setArtBusy] = useState(false);

  // Change Password State
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwBusy, setPwBusy] = useState(false);

  useEffect(() => {
    setPosterLink(poster.linkUrl);
    setPosterCaption(poster.caption);
  }, [poster.linkUrl, poster.caption]);

  useEffect(() => {
    setWaUrlInput(whatsappChannelUrl);
  }, [whatsappChannelUrl]);

  useEffect(() => {
    if (defaultIstDate && !npDate) setNpDate(defaultIstDate);
  }, [defaultIstDate, npDate]);

  const notify = (type: 'success' | 'error', text: string) => {
    setStatusBanner({ type, text });
  };

  const loadAnalytics = useCallback(async () => {
    if (!isAuthenticated) return;
    setAnalyticsLoading(true);
    try {
      const [stats, msgs] = await Promise.all([fetchAdminAnalytics(), fetchAdminMessages()]);
      setAnalytics(stats);
      setMessages(msgs);
    } catch {
      // Ignore if session expired
    } finally {
      setAnalyticsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      loadAnalytics();
    }
  }, [isAuthenticated, loadAnalytics]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginBusy(true);
    try {
      await adminLogin(loginPassword);
      setLoginPassword('');
      onAuthChange(true);
      notify('success', 'Signed in to WORLD NEWS NETWORK Admin Dashboard.');
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : 'Login failed.');
    } finally {
      setLoginBusy(false);
    }
  };

  const handleLogout = async () => {
    await adminLogout();
    onAuthChange(false);
    setAnalytics(null);
    setStatusBanner(null);
  };

  // ==================== NEWSPAPER HANDLERS ====================
  const handleUploadNewspaper = async (e: React.FormEvent) => {
    e.preventDefault();
    if (npFiles.length === 0) {
      notify('error', 'Please select at least one newspaper page image (JPG, JPEG, PNG, WebP).');
      return;
    }
    setNpUploading(true);
    try {
      const fd = new FormData();
      fd.append('title', npTitle);
      fd.append('publicationDate', npDate);
      fd.append('description', npDesc);
      fd.append('downloadEnabled', String(npDownloadEnabled));
      for (const file of npFiles) {
        fd.append('pages', file);
      }
      await uploadNewspaper(fd);
      await onDataChanged();
      await loadAnalytics();
      setNpTitle('');
      setNpDesc('');
      setNpFiles([]);
      notify('success', 'Newspaper edition published permanently to E-Paper gallery.');
      setActiveTab('manage-newspapers');
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Failed to upload newspaper.');
    } finally {
      setNpUploading(false);
    }
  };

  const openEditNewspaper = (paper: Newspaper) => {
    setEditingPaper(paper);
    setEditNpTitle(paper.title);
    setEditNpDate(paper.publicationDate);
    setEditNpDesc(paper.description);
    setEditNpDownload(paper.downloadEnabled);
    setEditNpKeepPageIds(paper.pages.map((p) => p.id));
    setEditNpNewFiles([]);
  };

  const handleSaveEditedNewspaper = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPaper) return;
    setEditNpSaving(true);
    try {
      const fd = new FormData();
      fd.append('title', editNpTitle);
      fd.append('publicationDate', editNpDate);
      fd.append('description', editNpDesc);
      fd.append('downloadEnabled', String(editNpDownload));
      fd.append('keepPageIds', JSON.stringify(editNpKeepPageIds));
      for (const file of editNpNewFiles) {
        fd.append('newPages', file);
      }
      await updateNewspaper(editingPaper.id, fd);
      await onDataChanged();
      setEditingPaper(null);
      notify('success', 'Newspaper details and pages updated.');
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Failed to update newspaper.');
    } finally {
      setEditNpSaving(false);
    }
  };

  const handleDeleteNewspaper = async (paper: Newspaper) => {
    try {
      await deleteNewspaper(paper.id);
      await onDataChanged();
      await loadAnalytics();
      notify('success', `Deleted "${paper.title}" permanently.`);
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Failed to delete newspaper.');
    }
  };

  // ==================== POSTER HANDLERS ====================
  const handleUploadOrChangePoster = async (e: React.FormEvent) => {
    e.preventDefault();
    setPosterBusy(true);
    try {
      if (posterFile) {
        const fd = new FormData();
        fd.append('image', posterFile);
        fd.append('linkUrl', posterLink);
        fd.append('caption', posterCaption);
        await uploadPoster(fd);
        setPosterFile(null);
        notify('success', 'Homepage 16:9 poster uploaded and live.');
      } else {
        await updatePosterMeta(posterLink, posterCaption);
        notify('success', 'Homepage poster link & caption updated.');
      }
      await onDataChanged();
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Failed to update poster.');
    } finally {
      setPosterBusy(false);
    }
  };

  const handleRemovePoster = async () => {
    setPosterBusy(true);
    try {
      await removePoster();
      setPosterFile(null);
      setPosterLink('');
      setPosterCaption('');
      await onDataChanged();
      notify('success', 'Homepage poster removed.');
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Failed to remove poster.');
    } finally {
      setPosterBusy(false);
    }
  };

  // ==================== VIDEO HANDLERS ====================
  const handleUploadVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vidFile) {
      notify('error', 'Please select an MP4 video file to upload.');
      return;
    }
    setVidUploading(true);
    try {
      const fd = new FormData();
      fd.append('title', vidTitle);
      fd.append('description', vidDesc);
      fd.append('video', vidFile);
      if (vidThumb) fd.append('thumbnail', vidThumb);
      await uploadVideo(fd);
      await onDataChanged();
      await loadAnalytics();
      setVidTitle('');
      setVidDesc('');
      setVidFile(null);
      setVidThumb(null);
      notify('success', 'Video uploaded and published to the Videos gallery.');
      setActiveTab('manage-videos');
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Failed to upload video.');
    } finally {
      setVidUploading(false);
    }
  };

  const openEditVideo = (video: VideoItem) => {
    setEditingVideo(video);
    setEditVidTitle(video.title);
    setEditVidDesc(video.description);
    setEditVidThumb(null);
  };

  const handleSaveEditedVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVideo) return;
    setEditVidSaving(true);
    try {
      const fd = new FormData();
      fd.append('title', editVidTitle);
      fd.append('description', editVidDesc);
      if (editVidThumb) fd.append('thumbnail', editVidThumb);
      await updateVideo(editingVideo.id, fd);
      await onDataChanged();
      setEditingVideo(null);
      notify('success', 'Video details updated.');
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Failed to update video.');
    } finally {
      setEditVidSaving(false);
    }
  };

  const handleDeleteVideo = async (video: VideoItem) => {
    try {
      await deleteVideo(video.id);
      await onDataChanged();
      await loadAnalytics();
      notify('success', `Deleted video "${video.title}".`);
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Failed to delete video.');
    }
  };

  // ==================== WHATSAPP HANDLER ====================
  const handleSaveWhatsapp = async (e: React.FormEvent) => {
    e.preventDefault();
    setWaBusy(true);
    try {
      await updateWhatsappChannel(waUrlInput);
      await onDataChanged();
      notify('success', 'WhatsApp Channel link updated below all newspapers.');
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Invalid WhatsApp Channel URL.');
    } finally {
      setWaBusy(false);
    }
  };

  // ==================== LATEST NEWS HANDLER ====================
  const handleCreateArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    setArtBusy(true);
    try {
      const fd = new FormData();
      fd.append('title', artTitle);
      fd.append('category', artCategory);
      fd.append('summary', artSummary);
      fd.append('content', artContent);
      fd.append('author', artAuthor);
      fd.append('isBreaking', String(artBreaking));
      if (artImage) fd.append('image', artImage);
      await createArticle(fd);
      await onDataChanged();
      setArtTitle('');
      setArtSummary('');
      setArtContent('');
      setArtBreaking(false);
      setArtImage(null);
      notify('success', 'News dispatch published to Latest News.');
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Failed to publish dispatch.');
    } finally {
      setArtBusy(false);
    }
  };

  const handleDeleteArticle = async (id: number) => {
    try {
      await deleteArticle(id);
      await onDataChanged();
      notify('success', 'News dispatch removed.');
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Failed to delete dispatch.');
    }
  };

  // ==================== CHANGE PASSWORD HANDLER ====================
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPw !== confirmPw) {
      notify('error', 'New password and confirmation do not match.');
      return;
    }
    setPwBusy(true);
    try {
      const msg = await adminChangePassword(currentPw, newPw);
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
      notify('success', msg);
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Password update failed.');
    } finally {
      setPwBusy(false);
    }
  };

  // ==================== SEPARATE ADMIN LOGIN SCREEN ====================
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#081221] flex flex-col justify-center items-center px-4 py-12">
        <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden">
          <div className="bg-[#0B1F3A] px-6 py-6 text-white flex items-center gap-3 border-b-4 border-[#C8102E]">
            <WnnLogoMark className="w-10 h-10 shrink-0" />
            <div>
              <h1 className="font-serif text-xl font-bold tracking-tight">WORLD NEWS NETWORK</h1>
              <p className="text-xs text-slate-300">Restricted Editorial Admin Portal</p>
            </div>
          </div>

          <form onSubmit={handleLoginSubmit} className="p-6 sm:p-8 space-y-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#0B1F3A]">
              <Lock className="w-4 h-4 text-[#C8102E]" />
              <span>Owner Authentication Required</span>
            </div>

            {loginError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs font-medium text-[#C8102E]">
                {loginError}
              </div>
            )}

            <div>
              <label htmlFor="admin-password-input" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Administrator Password
              </label>
              <div className="relative">
                <input
                  id="admin-password-input"
                  type={showLoginPw ? 'text' : 'password'}
                  required
                  autoFocus
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Enter admin password"
                  className="w-full pl-3.5 pr-10 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#0B1F3A]"
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPw((s) => !s)}
                  aria-label={showLoginPw ? 'Hide password' : 'Show password'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-[#0B1F3A] cursor-pointer"
                >
                  {showLoginPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loginBusy}
              className="w-full py-2.5 px-4 rounded-lg bg-[#C8102E] hover:bg-[#9B0C23] disabled:opacity-60 text-white text-sm font-semibold transition-colors cursor-pointer"
            >
              {loginBusy ? 'Verifying Session...' : 'Sign In to Admin Dashboard'}
            </button>

            <div className="pt-3 border-t border-slate-100 flex justify-center">
              <button
                type="button"
                onClick={onBackToSite}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-[#0B1F3A] cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return to Public Newspaper</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  const sidebarItems: Array<{ id: AdminTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'analytics', label: 'Visitor Statistics', icon: BarChart3 },
    { id: 'upload-newspaper', label: 'Upload Newspaper', icon: FilePlus2 },
    { id: 'manage-newspapers', label: 'Manage & Delete E-Papers', icon: NewspaperIcon },
    { id: 'poster', label: 'Homepage Poster (16:9)', icon: ImageIcon },
    { id: 'upload-video', label: 'Upload Video (MP4)', icon: Upload },
    { id: 'manage-videos', label: 'Manage & Delete Videos', icon: Film },
    { id: 'whatsapp', label: 'WhatsApp Channel Link', icon: WhatsAppIcon },
    { id: 'news-desk', label: 'Latest News & Inbox', icon: MessageSquare },
    { id: 'password', label: 'Change Admin Password', icon: KeyRound },
  ];

  // ==================== AUTHENTICATED ADMIN DASHBOARD ====================
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Admin Top Header */}
      <header className="sticky top-0 z-40 bg-[#0B1F3A] text-white border-b border-white/10 px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <WnnLogoMark className="w-8 h-8 shrink-0" />
          <div className="min-w-0">
            <span className="font-serif text-base sm:text-lg font-bold tracking-tight truncate block">
              WORLD NEWS NETWORK · Admin Console
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onBackToSite}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">View Public Site</span>
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#C8102E] hover:bg-[#9B0C23] text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </header>

      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sidebar Navigation */}
        <aside className="lg:col-span-3">
          <nav
            aria-label="Admin Dashboard Navigation"
            className="bg-white border border-slate-200 rounded-xl p-2 flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible"
          >
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(item.id);
                    setStatusBanner(null);
                  }}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer text-left ${
                    active
                      ? 'bg-[#0B1F3A] text-white'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-[#0B1F3A]'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main Admin Workspace */}
        <main className="lg:col-span-9 space-y-6">
          {statusBanner && (
            <div
              className={`px-4 py-3 rounded-xl border text-sm font-medium flex items-center justify-between gap-3 ${
                statusBanner.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-red-50 border-red-200 text-[#C8102E]'
              }`}
            >
              <div className="flex items-center gap-2">
                {statusBanner.type === 'success' && <CheckCircle2 className="w-4 h-4 shrink-0" />}
                <span>{statusBanner.text}</span>
              </div>
              <button
                type="button"
                onClick={() => setStatusBanner(null)}
                aria-label="Dismiss notification"
                className="p-1 hover:opacity-70 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* 1. Visitor Statistics */}
          {activeTab === 'analytics' && (
            <AdminAnalyticsPanel
              analytics={analytics}
              loading={analyticsLoading}
              onRefresh={loadAnalytics}
            />
          )}

          {/* 2. Upload Newspaper */}
          {activeTab === 'upload-newspaper' && (
            <form
              onSubmit={handleUploadNewspaper}
              className="bg-white border border-slate-200 rounded-xl p-6 space-y-5"
            >
              <div>
                <h2 className="font-serif text-xl font-bold text-[#0B1F3A]">
                  Upload Daily Newspaper Edition
                </h2>
                <p className="text-xs text-slate-600 mt-0.5">
                  Upload unlimited multi-page JPG, JPEG, PNG, or WebP newspaper pages. Stored permanently until deleted.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Newspaper Title
                  </label>
                  <input
                    type="text"
                    required
                    value={npTitle}
                    onChange={(e) => setNpTitle(e.target.value)}
                    placeholder="e.g. WORLD NEWS NETWORK — Morning Edition"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#0B1F3A]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Publication Date
                  </label>
                  <input
                    type="date"
                    required
                    value={npDate}
                    onChange={(e) => setNpDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#0B1F3A] font-mono tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={npDesc}
                  onChange={(e) => setNpDesc(e.target.value)}
                  placeholder="Highlights and key stories featured in this edition..."
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#0B1F3A]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Newspaper Pages (Select multiple JPG, JPEG, PNG, or WebP files in page order)
                </label>
                <input
                  type="file"
                  multiple
                  accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                  onChange={(e) => setNpFiles(Array.from(e.target.files || []))}
                  className="w-full text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#0B1F3A] file:text-white hover:file:bg-[#132E53] border border-dashed border-slate-300 rounded-lg p-3"
                />
                {npFiles.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    <p className="text-xs font-semibold text-[#0B1F3A]">
                      Selected {npFiles.length} page(s):
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {npFiles.map((f, i) => (
                        <span
                          key={`${f.name}-${i}`}
                          className="text-xs bg-slate-100 border border-slate-200 px-2.5 py-1 rounded text-slate-700 font-mono"
                        >
                          Page {i + 1}: {f.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <label className="flex items-center gap-2.5 text-sm text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={npDownloadEnabled}
                  onChange={(e) => setNpDownloadEnabled(e.target.checked)}
                  className="w-4 h-4 accent-[#0B1F3A]"
                />
                <span>Allow public readers to download newspaper pages</span>
              </label>

              <button
                type="submit"
                disabled={npUploading}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#C8102E] hover:bg-[#9B0C23] disabled:opacity-60 text-white text-sm font-semibold transition-colors cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>{npUploading ? 'Uploading Pages...' : 'Publish Newspaper Edition'}</span>
              </button>
            </form>
          )}

          {/* 3. Manage & Delete Newspapers */}
          {activeTab === 'manage-newspapers' && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-serif text-xl font-bold text-[#0B1F3A]">
                    Manage & Delete Newspapers ({newspapers.length})
                  </h2>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Edit details, add or remove pages, toggle downloads, or delete editions permanently.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('upload-newspaper')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#0B1F3A] text-white text-xs font-semibold cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Upload New Edition</span>
                </button>
              </div>

              {newspapers.length === 0 ? (
                <p className="text-sm text-slate-500 py-8 text-center">No newspaper editions uploaded yet.</p>
              ) : (
                <div className="divide-y divide-slate-200">
                  {newspapers.map((paper) => (
                    <div
                      key={paper.id}
                      className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="flex items-start gap-3.5 min-w-0">
                        {paper.pages[0]?.imageUrl && (
                          <img
                            src={paper.pages[0].imageUrl}
                            alt={paper.title}
                            referrerPolicy="no-referrer"
                            className="w-14 h-20 object-cover rounded border border-slate-200 shrink-0 bg-slate-100"
                          />
                        )}
                        <div className="min-w-0">
                          <h3 className="font-serif text-base font-bold text-[#0B1F3A] truncate">
                            {paper.title}
                          </h3>
                          <p className="text-xs font-mono tabular-nums text-slate-500 mt-0.5">
                            {paper.publicationDate} · {paper.pages.length} pages · {paper.views} views ·{' '}
                            {paper.downloadEnabled ? 'Download On' : 'View Only'}
                          </p>
                          {paper.description && (
                            <p className="text-xs text-slate-600 mt-1 line-clamp-1">{paper.description}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => openEditNewspaper(paper)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-xs font-semibold text-[#0B1F3A] cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteNewspaper(paper)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 hover:bg-[#C8102E] text-[#C8102E] hover:text-white border border-red-200 text-xs font-semibold transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 4. Homepage Poster (16:9) */}
          {activeTab === 'poster' && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
              <div>
                <h2 className="font-serif text-xl font-bold text-[#0B1F3A]">
                  Homepage Main Poster (16:9)
                </h2>
                <p className="text-xs text-slate-600 mt-0.5">
                  Upload, replace, link, or remove the 16:9 banner displayed at the top of the homepage.
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-700">Current Homepage Poster Preview (16:9)</p>
                {poster.enabled && poster.imageUrl ? (
                  <div className="aspect-video w-full rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                    <img
                      src={poster.imageUrl}
                      alt={poster.caption || 'Homepage Poster'}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="aspect-video w-full rounded-xl border border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center text-slate-500 text-sm">
                    <ImageIcon className="w-8 h-8 mb-2 text-slate-400" />
                    <span>No homepage poster is currently active.</span>
                  </div>
                )}
              </div>

              <form onSubmit={handleUploadOrChangePoster} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Upload / Replace Poster Image (16:9 recommended, JPG/JPEG/PNG/WebP)
                  </label>
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                    onChange={(e) => setPosterFile(e.target.files?.[0] || null)}
                    className="w-full text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#0B1F3A] file:text-white border border-slate-300 rounded-lg p-2.5"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Clickable Destination Link (Optional)
                    </label>
                    <input
                      type="url"
                      value={posterLink}
                      onChange={(e) => setPosterLink(e.target.value)}
                      placeholder="https://example.com/special-report"
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#0B1F3A]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Poster Caption / Headline (Optional)
                    </label>
                    <input
                      type="text"
                      value={posterCaption}
                      onChange={(e) => setPosterCaption(e.target.value)}
                      placeholder="Special Edition Feature"
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#0B1F3A]"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <button
                    type="submit"
                    disabled={posterBusy}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#0B1F3A] hover:bg-[#132E53] disabled:opacity-60 text-white text-sm font-semibold cursor-pointer"
                  >
                    <Upload className="w-4 h-4" />
                    <span>{posterBusy ? 'Saving...' : posterFile ? 'Upload & Set Poster' : 'Save Link & Caption'}</span>
                  </button>

                  {poster.enabled && (
                    <button
                      type="button"
                      disabled={posterBusy}
                      onClick={handleRemovePoster}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-red-50 hover:bg-[#C8102E] text-[#C8102E] hover:text-white border border-red-200 text-sm font-semibold transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Remove Homepage Poster</span>
                    </button>
                  )}
                </div>
              </form>
            </div>
          )}

          {/* 5. Upload Video (MP4) */}
          {activeTab === 'upload-video' && (
            <form
              onSubmit={handleUploadVideo}
              className="bg-white border border-slate-200 rounded-xl p-6 space-y-5"
            >
              <div>
                <h2 className="font-serif text-xl font-bold text-[#0B1F3A]">
                  Upload Broadcast Video (MP4)
                </h2>
                <p className="text-xs text-slate-600 mt-0.5">
                  Upload MP4 video bulletins with titles, descriptions, and custom thumbnails.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Video Title</label>
                <input
                  type="text"
                  required
                  value={vidTitle}
                  onChange={(e) => setVidTitle(e.target.value)}
                  placeholder="e.g. Evening World Bulletin: Trade & Markets"
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#0B1F3A]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={vidDesc}
                  onChange={(e) => setVidDesc(e.target.value)}
                  placeholder="Brief summary of this video report..."
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#0B1F3A]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    MP4 Video File (Required)
                  </label>
                  <input
                    type="file"
                    required
                    accept=".mp4,video/mp4"
                    onChange={(e) => setVidFile(e.target.files?.[0] || null)}
                    className="w-full text-sm text-slate-600 file:mr-3 file:py-2 file:px-3.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#C8102E] file:text-white border border-slate-300 rounded-lg p-2.5"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Custom Thumbnail Image (Optional JPG/PNG/WebP)
                  </label>
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                    onChange={(e) => setVidThumb(e.target.files?.[0] || null)}
                    className="w-full text-sm text-slate-600 file:mr-3 file:py-2 file:px-3.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#0B1F3A] file:text-white border border-slate-300 rounded-lg p-2.5"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={vidUploading}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#C8102E] hover:bg-[#9B0C23] disabled:opacity-60 text-white text-sm font-semibold cursor-pointer"
              >
                <VideoIcon className="w-4 h-4" />
                <span>{vidUploading ? 'Uploading MP4 Video...' : 'Upload & Publish Video'}</span>
              </button>
            </form>
          )}

          {/* 6. Manage & Delete Videos */}
          {activeTab === 'manage-videos' && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-serif text-xl font-bold text-[#0B1F3A]">
                    Manage & Delete Videos ({videos.length})
                  </h2>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Edit video titles, descriptions, thumbnails, or delete videos permanently.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('upload-video')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#0B1F3A] text-white text-xs font-semibold cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Upload Video</span>
                </button>
              </div>

              {videos.length === 0 ? (
                <p className="text-sm text-slate-500 py-8 text-center">No videos uploaded yet.</p>
              ) : (
                <div className="divide-y divide-slate-200">
                  {videos.map((v) => (
                    <div
                      key={v.id}
                      className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="flex items-start gap-3.5 min-w-0">
                        {v.thumbnailUrl ? (
                          <img
                            src={v.thumbnailUrl}
                            alt={v.title}
                            referrerPolicy="no-referrer"
                            className="w-24 h-14 object-cover rounded border border-slate-200 shrink-0"
                          />
                        ) : (
                          <div className="w-24 h-14 rounded border border-slate-200 bg-[#0B1F3A] flex items-center justify-center text-white shrink-0">
                            <Film className="w-5 h-5" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <h3 className="font-serif text-base font-bold text-[#0B1F3A] truncate">
                            {v.title}
                          </h3>
                          <p className="text-xs font-mono tabular-nums text-slate-500 mt-0.5">
                            {v.createdAt.slice(0, 10)} · {v.views} views
                          </p>
                          {v.description && (
                            <p className="text-xs text-slate-600 mt-1 line-clamp-1">{v.description}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => openEditVideo(v)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-xs font-semibold text-[#0B1F3A] cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteVideo(v)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 hover:bg-[#C8102E] text-[#C8102E] hover:text-white border border-red-200 text-xs font-semibold transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 7. Manage WhatsApp Channel Link */}
          {activeTab === 'whatsapp' && (
            <form
              onSubmit={handleSaveWhatsapp}
              className="bg-white border border-slate-200 rounded-xl p-6 space-y-5"
            >
              <div>
                <h2 className="font-serif text-xl font-bold text-[#0B1F3A]">
                  Manage WhatsApp Channel Link
                </h2>
                <p className="text-xs text-slate-600 mt-0.5">
                  This URL powers the &ldquo;FOLLOW OUR WHATSAPP CHANNEL&rdquo; button displayed below every newspaper.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  WhatsApp Channel URL
                </label>
                <input
                  type="url"
                  required
                  value={waUrlInput}
                  onChange={(e) => setWaUrlInput(e.target.value)}
                  placeholder="https://whatsapp.com/channel/..."
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#0B1F3A]"
                />
              </div>

              <button
                type="submit"
                disabled={waBusy}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#15803D] hover:bg-[#166534] disabled:opacity-60 text-white text-sm font-semibold cursor-pointer"
              >
                <WhatsAppIcon className="w-4 h-4" />
                <span>{waBusy ? 'Updating Link...' : 'Save WhatsApp Channel Link'}</span>
              </button>
            </form>
          )}

          {/* 8. Latest News Dispatches & Reader Messages */}
          {activeTab === 'news-desk' && (
            <div className="space-y-6">
              <form
                onSubmit={handleCreateArticle}
                className="bg-white border border-slate-200 rounded-xl p-6 space-y-4"
              >
                <div>
                  <h2 className="font-serif text-xl font-bold text-[#0B1F3A]">
                    Publish Latest News Dispatch
                  </h2>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Post breaking news or editorial dispatches to the Latest News section.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Headline</label>
                    <input
                      type="text"
                      required
                      value={artTitle}
                      onChange={(e) => setArtTitle(e.target.value)}
                      placeholder="Dispatch headline"
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#0B1F3A]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                    <input
                      type="text"
                      required
                      value={artCategory}
                      onChange={(e) => setArtCategory(e.target.value)}
                      placeholder="World Affairs, Economy, National"
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#0B1F3A]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Byline / Author</label>
                    <input
                      type="text"
                      value={artAuthor}
                      onChange={(e) => setArtAuthor(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#0B1F3A]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Lead Image (Optional)
                    </label>
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                      onChange={(e) => setArtImage(e.target.files?.[0] || null)}
                      className="w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:bg-[#0B1F3A] file:text-white border border-slate-300 rounded-lg p-1.5"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Summary</label>
                  <input
                    type="text"
                    required
                    value={artSummary}
                    onChange={(e) => setArtSummary(e.target.value)}
                    placeholder="Concise 1-2 sentence editorial summary"
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#0B1F3A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Full Dispatch Body</label>
                  <textarea
                    rows={4}
                    required
                    value={artContent}
                    onChange={(e) => setArtContent(e.target.value)}
                    placeholder="Full article prose..."
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#0B1F3A]"
                  />
                </div>

                <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={artBreaking}
                    onChange={(e) => setArtBreaking(e.target.checked)}
                    className="w-4 h-4 accent-[#C8102E]"
                  />
                  <span>Mark as Breaking News</span>
                </label>

                <button
                  type="submit"
                  disabled={artBusy}
                  className="px-5 py-2.5 rounded-lg bg-[#0B1F3A] hover:bg-[#132E53] text-white text-sm font-semibold cursor-pointer"
                >
                  {artBusy ? 'Publishing...' : 'Publish News Dispatch'}
                </button>
              </form>

              {/* Existing News Dispatches */}
              <div className="bg-white border border-slate-200 rounded-xl p-6">
                <h3 className="font-serif text-lg font-bold text-[#0B1F3A] mb-3">
                  Published News Dispatches ({articles.length})
                </h3>
                <div className="divide-y divide-slate-200">
                  {articles.map((a) => (
                    <div key={a.id} className="py-3 flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-[#0B1F3A] truncate">{a.title}</p>
                        <p className="text-xs text-slate-500">
                          {a.category} · {a.publishedAt.slice(0, 10)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteArticle(a.id)}
                        className="px-3 py-1.5 rounded-lg bg-red-50 hover:bg-[#C8102E] text-[#C8102E] hover:text-white text-xs font-semibold cursor-pointer shrink-0"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Reader Contact Inbox */}
              <div className="bg-white border border-slate-200 rounded-xl p-6">
                <h3 className="font-serif text-lg font-bold text-[#0B1F3A] mb-3">
                  Reader Contact Messages ({messages.length})
                </h3>
                {messages.length === 0 ? (
                  <p className="text-sm text-slate-500">No reader messages received yet.</p>
                ) : (
                  <div className="divide-y divide-slate-200">
                    {messages.map((m) => (
                      <div key={m.id} className="py-3 space-y-1">
                        <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                          <span className="font-semibold text-[#0B1F3A]">
                            {m.name} ({m.email})
                          </span>
                          <span className="font-mono">{m.createdAt.slice(0, 10)}</span>
                        </div>
                        <p className="text-sm font-semibold text-slate-800">{m.subject}</p>
                        <p className="text-sm text-slate-600">{m.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 9. Change Admin Password */}
          {activeTab === 'password' && (
            <form
              onSubmit={handleChangePassword}
              className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 max-w-lg"
            >
              <div>
                <h2 className="font-serif text-xl font-bold text-[#0B1F3A]">
                  Change Admin Password
                </h2>
                <p className="text-xs text-slate-600 mt-0.5">
                  Passwords are hashed server-side using salted scrypt cryptography.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  required
                  value={currentPw}
                  onChange={(e) => setCurrentPw(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#0B1F3A]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  New Password (min 6 characters)
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#0B1F3A]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#0B1F3A]"
                />
              </div>

              <button
                type="submit"
                disabled={pwBusy}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#0B1F3A] hover:bg-[#132E53] disabled:opacity-60 text-white text-sm font-semibold cursor-pointer"
              >
                <KeyRound className="w-4 h-4" />
                <span>{pwBusy ? 'Updating Password...' : 'Update Admin Password'}</span>
              </button>
            </form>
          )}
        </main>
      </div>

      {/* Edit Newspaper Modal */}
      {editingPaper && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setEditingPaper(null)}
        >
          <form
            onSubmit={handleSaveEditedNewspaper}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-xl max-w-xl w-full p-6 space-y-4 border border-slate-200 shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-serif text-lg font-bold text-[#0B1F3A]">Edit Newspaper Edition</h3>
              <button
                type="button"
                onClick={() => setEditingPaper(null)}
                className="p-1 text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Title</label>
              <input
                type="text"
                required
                value={editNpTitle}
                onChange={(e) => setEditNpTitle(e.target.value)}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Publication Date</label>
              <input
                type="date"
                required
                value={editNpDate}
                onChange={(e) => setEditNpDate(e.target.value)}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg font-mono tabular-nums"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
              <textarea
                rows={2}
                value={editNpDesc}
                onChange={(e) => setEditNpDesc(e.target.value)}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Existing Pages (uncheck or remove unwanted pages)
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {editingPaper.pages.map((p) => {
                  const kept = editNpKeepPageIds.includes(p.id);
                  return (
                    <div
                      key={p.id}
                      className={`relative border rounded-lg p-1.5 text-center ${
                        kept ? 'border-[#0B1F3A] bg-slate-50' : 'border-red-200 opacity-45'
                      }`}
                    >
                      <img
                        src={p.imageUrl}
                        alt={`Page ${p.pageNumber}`}
                        referrerPolicy="no-referrer"
                        className="w-full h-20 object-cover rounded"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setEditNpKeepPageIds((prev) =>
                            kept ? prev.filter((id) => id !== p.id) : [...prev, p.id]
                          )
                        }
                        className="mt-1 w-full text-[11px] font-semibold text-[#0B1F3A] cursor-pointer"
                      >
                        {kept ? `Keep P${p.pageNumber}` : 'Removed'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Append Additional Pages (Optional)
              </label>
              <input
                type="file"
                multiple
                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                onChange={(e) => setEditNpNewFiles(Array.from(e.target.files || []))}
                className="w-full text-xs border border-slate-300 rounded-lg p-2"
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={editNpDownload}
                onChange={(e) => setEditNpDownload(e.target.checked)}
                className="w-4 h-4 accent-[#0B1F3A]"
              />
              <span>Enable public downloads</span>
            </label>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingPaper(null)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={editNpSaving}
                className="px-4 py-2 rounded-lg bg-[#0B1F3A] text-white text-xs font-semibold cursor-pointer"
              >
                {editNpSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Video Modal */}
      {editingVideo && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          onClick={() => setEditingVideo(null)}
        >
          <form
            onSubmit={handleSaveEditedVideo}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 border border-slate-200 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-serif text-lg font-bold text-[#0B1F3A]">Edit Video Details</h3>
              <button
                type="button"
                onClick={() => setEditingVideo(null)}
                className="p-1 text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Video Title</label>
              <input
                type="text"
                required
                value={editVidTitle}
                onChange={(e) => setEditVidTitle(e.target.value)}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
              <textarea
                rows={3}
                value={editVidDesc}
                onChange={(e) => setEditVidDesc(e.target.value)}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Replace Thumbnail (Optional)
              </label>
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                onChange={(e) => setEditVidThumb(e.target.files?.[0] || null)}
                className="w-full text-xs border border-slate-300 rounded-lg p-2"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingVideo(null)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={editVidSaving}
                className="px-4 py-2 rounded-lg bg-[#0B1F3A] text-white text-xs font-semibold cursor-pointer"
              >
                {editVidSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
