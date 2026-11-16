import React, { useState } from 'react';
import { ArrowRight, CheckCircle2, Globe2, Mail, MapPin, Newspaper as NewsIcon, Send, X } from 'lucide-react';
import { submitContactForm } from '../api';
import type { NewsArticle } from '../types';
import { WhatsAppChannelButton } from './BrandMark';

export function LatestNewsSection({
  articles,
  limit,
  onViewAll,
}: {
  articles: NewsArticle[];
  limit?: number;
  onViewAll?: () => void;
}) {
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('All');

  const categories = ['All', ...Array.from(new Set(articles.map((a) => a.category)))];
  const filtered = articles.filter((a) => activeCategory === 'All' || a.category === activeCategory);
  const displayList = typeof limit === 'number' ? filtered.slice(0, limit) : filtered;
  const lead = displayList[0];
  const secondary = displayList.slice(1);

  return (
    <section className="py-10 sm:py-14">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#C8102E]">
            Latest Wire Dispatches
          </p>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#0B1F3A] mt-1">
            Latest News
          </h2>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            Verified reporting from WORLD NEWS NETWORK correspondents across world affairs, markets, and national infrastructure.
          </p>
        </div>

        {onViewAll && articles.length > (limit || 0) && (
          <button
            type="button"
            onClick={onViewAll}
            className="self-start md:self-auto px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 text-[#0B1F3A] text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            All Latest News
          </button>
        )}
      </div>

      {!limit && categories.length > 1 && (
        <div className="mt-5 flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-lg w-fit">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                activeCategory === cat
                  ? 'bg-white text-[#0B1F3A] shadow-sm'
                  : 'text-slate-600 hover:text-[#0B1F3A]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {!lead ? (
        <div className="mt-8 border border-slate-200 rounded-xl bg-slate-50 p-10 text-center">
          <NewsIcon className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <p className="text-base font-semibold text-[#0B1F3A]">No dispatches published yet</p>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Lead Editorial Story */}
          <article
            onClick={() => setSelectedArticle(lead)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setSelectedArticle(lead);
              }
            }}
            className="lg:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col cursor-pointer hover:border-[#0B1F3A]/40 transition-colors group"
          >
            {lead.imageUrl && (
              <div className="aspect-video bg-slate-100 overflow-hidden border-b border-slate-200">
                <img
                  src={lead.imageUrl}
                  alt={lead.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-200"
                />
              </div>
            )}
            <div className="p-6 flex-1 flex flex-col">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                {lead.isBreaking && (
                  <>
                    <span className="font-bold text-[#C8102E] uppercase tracking-wider">Breaking</span>
                    <span aria-hidden="true">·</span>
                  </>
                )}
                <span className="font-semibold text-[#0B1F3A] uppercase tracking-wider">{lead.category}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">{lead.publishedAt.slice(0, 10)}</span>
              </div>

              <h3 className="font-serif text-2xl sm:text-3xl font-bold text-[#0B1F3A] mt-2 leading-tight group-hover:text-[#C8102E] transition-colors">
                {lead.title}
              </h3>

              <p className="text-sm sm:text-base text-slate-600 mt-3 leading-relaxed flex-1">
                {lead.summary}
              </p>

              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span className="font-medium text-slate-700">{lead.author}</span>
                <span className="inline-flex items-center gap-1 font-semibold text-[#C8102E]">
                  Read Full Dispatch <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          </article>

          {/* Secondary Stories Stack */}
          <div className="lg:col-span-5 flex flex-col gap-5">
            {secondary.map((art) => (
              <article
                key={art.id}
                onClick={() => setSelectedArticle(art)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedArticle(art);
                  }
                }}
                className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between cursor-pointer hover:border-[#0B1F3A]/40 transition-colors group flex-1"
              >
                <div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    {art.isBreaking && (
                      <>
                        <span className="font-bold text-[#C8102E] uppercase tracking-wider">Breaking</span>
                        <span aria-hidden="true">·</span>
                      </>
                    )}
                    <span className="font-semibold text-[#0B1F3A] uppercase tracking-wider">{art.category}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">{art.publishedAt.slice(0, 10)}</span>
                  </div>

                  <h3 className="font-serif text-lg sm:text-xl font-bold text-[#0B1F3A] mt-2 leading-snug group-hover:text-[#C8102E] transition-colors">
                    {art.title}
                  </h3>

                  <p className="text-sm text-slate-600 mt-2 line-clamp-2">{art.summary}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>{art.author}</span>
                  <span className="inline-flex items-center gap-1 font-semibold text-[#0B1F3A] group-hover:text-[#C8102E]">
                    Read <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      {/* Full Article Reader Modal */}
      {selectedArticle && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={selectedArticle.title}
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setSelectedArticle(null)}
        >
          <div
            className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-200 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between gap-4">
              <span className="text-xs font-semibold uppercase tracking-widest text-[#C8102E]">
                {selectedArticle.category}
              </span>
              <button
                type="button"
                onClick={() => setSelectedArticle(null)}
                aria-label="Close article"
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {selectedArticle.imageUrl && (
              <div className="aspect-video bg-slate-100 border-b border-slate-200">
                <img
                  src={selectedArticle.imageUrl}
                  alt={selectedArticle.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <div className="p-6 sm:p-8">
              <div className="flex items-center gap-2 text-xs text-slate-500 font-mono tabular-nums">
                <span>{selectedArticle.author}</span>
                <span aria-hidden="true">·</span>
                <span>{selectedArticle.publishedAt.slice(0, 10)}</span>
              </div>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#0B1F3A] mt-2 leading-tight">
                {selectedArticle.title}
              </h2>
              <p className="text-base font-medium text-slate-700 mt-4 leading-relaxed">
                {selectedArticle.summary}
              </p>
              <div className="mt-5 pt-5 border-t border-slate-200 space-y-4 text-sm sm:text-base text-slate-700 leading-relaxed whitespace-pre-line">
                {selectedArticle.content}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export function AboutUsSection({ whatsappChannelUrl }: { whatsappChannelUrl: string }) {
  return (
    <section className="py-12 sm:py-16">
      <div className="pb-6 border-b border-slate-200">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#C8102E]">
          Editorial Charter & Mission
        </p>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#0B1F3A] mt-1">
          About WORLD NEWS NETWORK
        </h1>
        <p className="text-base text-slate-600 mt-2 max-w-2xl">
          Real News... Real Time... — Independent digital broadsheet journalism engineered for speed, clarity, and archival permanence.
        </p>
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 space-y-5 text-slate-700 text-base leading-relaxed">
          <p>
            <strong className="text-[#0B1F3A]">WORLD NEWS NETWORK</strong> brings together the authority of classic broadsheet newspaper publishing and the immediacy of modern digital broadcast journalism. Every morning edition, special supplement, and live video bulletin is curated to deliver verified facts without noise.
          </p>
          <p>
            Through our dedicated E-Paper archive, readers on mobile, tablet, and desktop can inspect high-resolution broadsheet pages, zoom seamlessly into multi-column print typography, and revisit historical editions by exact publication date.
          </p>
          <div className="pt-2 max-w-sm">
            <WhatsAppChannelButton url={whatsappChannelUrl} />
          </div>
        </div>

        <div className="lg:col-span-5 grid grid-cols-1 gap-4">
          <div className="border border-slate-200 rounded-xl p-5 bg-slate-50">
            <Globe2 className="w-6 h-6 text-[#C8102E] mb-2" />
            <h3 className="font-serif text-lg font-bold text-[#0B1F3A]">Global & Regional Bureaus</h3>
            <p className="text-sm text-slate-600 mt-1">
              Continuous coverage spanning geopolitics, global finance, technology, and public policy in Indian Standard Time (IST).
            </p>
          </div>
          <div className="border border-slate-200 rounded-xl p-5 bg-slate-50">
            <NewsIcon className="w-6 h-6 text-[#0B1F3A] mb-2" />
            <h3 className="font-serif text-lg font-bold text-[#0B1F3A]">Daily Digital E-Paper</h3>
            <p className="text-sm text-slate-600 mt-1">
              Multi-page broadsheet editions archived permanently for seamless searching, full-screen reading, and offline reference.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export function ContactUsSection({ whatsappChannelUrl }: { whatsappChannelUrl: string }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setSubmitting(true);
    try {
      const res = await submitContactForm({ name, email, subject, message });
      setSuccessMsg(res.message);
      setName('');
      setEmail('');
      setSubject('');
      setMessage('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to submit message.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="py-12 sm:py-16">
      <div className="pb-6 border-b border-slate-200">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#C8102E]">
          Editorial Desk & Reader Support
        </p>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#0B1F3A] mt-1">
          Contact Us
        </h1>
        <p className="text-base text-slate-600 mt-2 max-w-2xl">
          Send news tips, editorial inquiries, or reader feedback directly to the WORLD NEWS NETWORK newsroom.
        </p>
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5 space-y-5">
          <div className="border border-slate-200 rounded-xl p-6 bg-slate-50 space-y-4">
            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-[#C8102E] mt-0.5 shrink-0" />
              <div>
                <h3 className="text-sm font-bold text-[#0B1F3A]">Editorial Newsroom Desk</h3>
                <p className="text-sm text-slate-600">newsdesk@worldnewsnetwork.org</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-[#0B1F3A] mt-0.5 shrink-0" />
              <div>
                <h3 className="text-sm font-bold text-[#0B1F3A]">Broadcast & Print Operations</h3>
                <p className="text-sm text-slate-600">Press Tower, Media District · Operating 24/7 IST</p>
              </div>
            </div>
            <div className="pt-2">
              <WhatsAppChannelButton url={whatsappChannelUrl} />
            </div>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="lg:col-span-7 border border-slate-200 rounded-xl p-6 bg-white space-y-4"
        >
          <h2 className="font-serif text-xl font-bold text-[#0B1F3A]">Send a Message to the Newsroom</h2>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-[#C8102E]">
              {error}
            </div>
          )}
          {successMsg && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#0B1F3A]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#0B1F3A]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Subject</label>
            <input
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="News tip, press release, or reader inquiry"
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#0B1F3A]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Message</label>
            <textarea
              rows={4}
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write your message here..."
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#0B1F3A]"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#C8102E] hover:bg-[#9B0C23] disabled:opacity-60 text-white text-sm font-semibold transition-colors cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>{submitting ? 'Sending...' : 'Send Message'}</span>
          </button>
        </form>
      </div>
    </section>
  );
}
