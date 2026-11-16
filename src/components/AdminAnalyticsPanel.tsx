import React, { useState } from 'react';
import { BarChart3, Clock, Eye, Film, Newspaper, RefreshCw, TrendingUp, Users } from 'lucide-react';
import type { AnalyticsPayload } from '../types';

interface AdminAnalyticsPanelProps {
  analytics: AnalyticsPayload | null;
  loading: boolean;
  onRefresh: () => void;
}

export function AdminAnalyticsPanel({ analytics, loading, onRefresh }: AdminAnalyticsPanelProps) {
  const [hoveredDayIdx, setHoveredDayIdx] = useState<number | null>(null);

  if (loading && !analytics) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-28 rounded-xl bg-slate-100 animate-pulse border border-slate-200" />
          ))}
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="border border-slate-200 rounded-xl p-8 bg-white text-center">
        <p className="text-sm text-slate-600">Unable to load visitor statistics.</p>
        <button
          type="button"
          onClick={onRefresh}
          className="mt-3 px-4 py-2 rounded-lg bg-[#0B1F3A] text-white text-xs font-semibold cursor-pointer"
        >
          Retry
        </button>
      </div>
    );
  }

  const { ist, metrics, dailySeries, monthlySeries, topNewspapers, topVideos } = analytics;

  const statCards = [
    {
      label: "Today's Visitors (IST)",
      value: metrics.todayVisitors,
      note: `Date: ${ist.date}`,
      icon: Users,
      accent: 'text-[#0B1F3A]',
    },
    {
      label: "This Month's Visitors (IST)",
      value: metrics.monthVisitors,
      note: `Month: ${ist.month} · Auto-resets`,
      icon: Users,
      accent: 'text-[#132E53]',
    },
    {
      label: 'Total Visitors (All Time)',
      value: metrics.totalVisitors,
      note: 'Permanent lifetime counter',
      icon: TrendingUp,
      accent: 'text-[#C8102E]',
    },
    {
      label: "Today's Page Views",
      value: metrics.todayPageViews,
      note: 'IST midnight reset',
      icon: Eye,
      accent: 'text-[#0B1F3A]',
    },
    {
      label: 'Monthly Page Views',
      value: metrics.monthPageViews,
      note: `Month: ${ist.month} · Auto-resets`,
      icon: BarChart3,
      accent: 'text-[#132E53]',
    },
    {
      label: 'Total Page Views',
      value: metrics.totalPageViews,
      note: 'Lifetime all-time views',
      icon: Eye,
      accent: 'text-[#C8102E]',
    },
    {
      label: 'Newspaper Views',
      value: metrics.newspaperViews,
      note: 'Total E-Paper reads',
      icon: Newspaper,
      accent: 'text-[#0B1F3A]',
    },
    {
      label: 'Video Views',
      value: metrics.videoViews,
      note: 'Total MP4 plays',
      icon: Film,
      accent: 'text-[#C8102E]',
    },
  ];

  const maxDaily = Math.max(
    1,
    ...dailySeries.map((d) => Math.max(d.pageViews, d.uniqueVisitors))
  );
  const maxMonthly = Math.max(
    1,
    ...monthlySeries.map((m) => Math.max(m.pageViews, m.uniqueVisitors))
  );

  const hoveredDay = hoveredDayIdx !== null ? dailySeries[hoveredDayIdx] : null;

  return (
    <div className="space-y-6">
      {/* IST Clock & Refresh Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 rounded-xl px-5 py-3.5">
        <div className="flex items-center gap-2.5 text-sm text-slate-700">
          <Clock className="w-4 h-4 text-[#C8102E] shrink-0" />
          <span>
            Indian Standard Time (IST):{' '}
            <strong className="font-mono tabular-nums text-[#0B1F3A]">
              {ist.date} {ist.time} IST
            </strong>
          </span>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-xs font-semibold text-[#0B1F3A] transition-colors cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Live Stats</span>
        </button>
      </div>

      {/* 8 Required Analytics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-600">{card.label}</span>
                <Icon className={`w-4 h-4 shrink-0 ${card.accent}`} />
              </div>
              <p className={`mt-3 text-3xl font-bold font-mono tabular-nums ${card.accent}`}>
                {card.value.toLocaleString()}
              </p>
              <p className="mt-1.5 text-xs text-slate-500">{card.note}</p>
            </div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 14-Day IST Traffic Chart */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="font-serif text-lg font-bold text-[#0B1F3A]">
                14-Day Visitor & Page View Trend (IST)
              </h3>
              <p className="text-xs text-slate-500">
                Unique daily visitors compared against total daily page views
              </p>
            </div>

            <div className="flex items-center gap-4 text-xs text-slate-600">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#0B1F3A]" />
                Unique Visitors
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#C8102E]" />
                Page Views
              </span>
            </div>
          </div>

          {hoveredDay && (
            <div className="mb-3 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-mono tabular-nums text-[#0B1F3A] flex flex-wrap items-center gap-4">
              <span>Date: {hoveredDay.date}</span>
              <span>Unique Visitors: {hoveredDay.uniqueVisitors}</span>
              <span>Page Views: {hoveredDay.pageViews}</span>
            </div>
          )}

          <div className="h-56 flex items-end gap-1.5 sm:gap-2 pt-4 border-b border-slate-200 pb-2">
            {dailySeries.map((day, idx) => {
              const vPct = Math.max(4, Math.round((day.uniqueVisitors / maxDaily) * 100));
              const pPct = Math.max(4, Math.round((day.pageViews / maxDaily) * 100));
              return (
                <div
                  key={day.date}
                  onMouseEnter={() => setHoveredDayIdx(idx)}
                  onMouseLeave={() => setHoveredDayIdx(null)}
                  className="flex-1 h-full flex flex-col justify-end items-center group cursor-pointer"
                >
                  <div className="w-full flex-1 flex items-end justify-center gap-0.5 sm:gap-1 px-0.5">
                    <div
                      title={`${day.date}: ${day.uniqueVisitors} unique visitors`}
                      style={{ height: `${day.uniqueVisitors === 0 ? 2 : vPct}%` }}
                      className="w-1/2 max-w-[14px] bg-[#0B1F3A] group-hover:bg-[#132E53] rounded-t transition-all"
                    />
                    <div
                      title={`${day.date}: ${day.pageViews} page views`}
                      style={{ height: `${day.pageViews === 0 ? 2 : pPct}%` }}
                      className="w-1/2 max-w-[14px] bg-[#C8102E] group-hover:bg-[#9B0C23] rounded-t transition-all"
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] font-mono tabular-nums text-slate-500">
            <span>{dailySeries[0]?.date}</span>
            <span>{dailySeries[Math.floor(dailySeries.length / 2)]?.date}</span>
            <span>{dailySeries[dailySeries.length - 1]?.date}</span>
          </div>
        </div>

        {/* 6-Month IST Overview */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-5 sm:p-6 flex flex-col">
          <h3 className="font-serif text-lg font-bold text-[#0B1F3A]">Monthly IST Summary</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Monthly counters reset cleanly at the start of each new IST month.
          </p>

          <div className="mt-5 space-y-3.5 flex-1">
            {monthlySeries.map((m) => {
              const barPct = Math.round((m.pageViews / maxMonthly) * 100);
              return (
                <div key={m.month} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-mono tabular-nums">
                    <span className="font-semibold text-[#0B1F3A]">{m.month}</span>
                    <span className="text-slate-600">
                      {m.uniqueVisitors} vis · {m.pageViews} views
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      style={{ width: `${m.pageViews === 0 ? 0 : Math.max(4, barPct)}%` }}
                      className="h-full bg-[#0B1F3A] rounded-full"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Top E-Papers & Top Videos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6">
          <h3 className="font-serif text-lg font-bold text-[#0B1F3A] mb-3">
            Most Read E-Paper Editions
          </h3>
          {topNewspapers.length === 0 ? (
            <p className="text-sm text-slate-500">No newspapers uploaded yet.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {topNewspapers.map((n) => (
                <div key={n.id} className="py-2.5 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#0B1F3A] truncate">{n.title}</p>
                    <p className="text-xs font-mono tabular-nums text-slate-500">
                      {n.publication_date}
                    </p>
                  </div>
                  <span className="text-xs font-mono tabular-nums font-semibold text-[#C8102E] whitespace-nowrap">
                    {n.views.toLocaleString()} views
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6">
          <h3 className="font-serif text-lg font-bold text-[#0B1F3A] mb-3">
            Most Watched Broadcast Videos
          </h3>
          {topVideos.length === 0 ? (
            <p className="text-sm text-slate-500">No videos uploaded yet.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {topVideos.map((v) => (
                <div key={v.id} className="py-2.5 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#0B1F3A] truncate">{v.title}</p>
                    <p className="text-xs font-mono tabular-nums text-slate-500">
                      {v.created_at.slice(0, 10)}
                    </p>
                  </div>
                  <span className="text-xs font-mono tabular-nums font-semibold text-[#C8102E] whitespace-nowrap">
                    {v.views.toLocaleString()} views
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
