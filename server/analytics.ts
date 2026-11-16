import crypto from 'crypto';
import type { Request, Response } from 'express';
import { setCookieOptions } from './auth.ts';
import { db, getSetting } from './db.ts';
import { getISTParts, getRecentISTDates, getRecentISTMonths } from './time.ts';

const VISITOR_COOKIE_NAME = 'wnn_vid';
const VISITOR_COOKIE_TTL_MS = 365 * 24 * 60 * 60 * 1000;

function signVisitorId(visitorId: string): string {
  const secret = getSetting('session_secret');
  const sig = crypto.createHmac('sha256', secret).update(visitorId).digest('hex');
  return `${visitorId}.${sig}`;
}

function verifyVisitorCookie(rawValue: unknown): string | null {
  if (typeof rawValue !== 'string' || !rawValue.includes('.')) {
    return null;
  }
  const [visitorId, sig] = rawValue.split('.');
  if (!visitorId || !sig || visitorId.length > 64) {
    return null;
  }
  const secret = getSetting('session_secret');
  const expectedSig = crypto.createHmac('sha256', secret).update(visitorId).digest('hex');
  try {
    const a = Buffer.from(sig, 'hex');
    const b = Buffer.from(expectedSig, 'hex');
    if (a.length !== b.length) return null;
    return crypto.timingSafeEqual(a, b) ? visitorId : null;
  } catch {
    return null;
  }
}

const recordVisitTxn = db.transaction((visitorId: string, istDate: string, istMonth: string) => {
  // Ensure daily & monthly rows exist for current IST date/month
  db.prepare(`
    INSERT OR IGNORE INTO analytics_daily (ist_date, unique_visitors, page_views)
    VALUES (?, 0, 0)
  `).run(istDate);

  db.prepare(`
    INSERT OR IGNORE INTO analytics_monthly (ist_month, unique_visitors, page_views)
    VALUES (?, 0, 0)
  `).run(istMonth);

  // Always increment page views (today IST, this month IST, and all-time lifetime)
  db.prepare('UPDATE analytics_daily SET page_views = page_views + 1 WHERE ist_date = ?').run(istDate);
  db.prepare('UPDATE analytics_monthly SET page_views = page_views + 1 WHERE ist_month = ?').run(istMonth);
  db.prepare(`UPDATE analytics_totals SET count = count + 1 WHERE key = 'lifetime_page_views'`).run();

  // Count unique visitor once per IST day
  const dailyInsert = db
    .prepare('INSERT OR IGNORE INTO analytics_daily_visitors (ist_date, visitor_id) VALUES (?, ?)')
    .run(istDate, visitorId);
  if (dailyInsert.changes > 0) {
    db.prepare('UPDATE analytics_daily SET unique_visitors = unique_visitors + 1 WHERE ist_date = ?').run(istDate);
  }

  // Count unique visitor once per IST month (resets automatically when istMonth changes)
  const monthlyInsert = db
    .prepare('INSERT OR IGNORE INTO analytics_monthly_visitors (ist_month, visitor_id) VALUES (?, ?)')
    .run(istMonth, visitorId);
  if (monthlyInsert.changes > 0) {
    db.prepare('UPDATE analytics_monthly SET unique_visitors = unique_visitors + 1 WHERE ist_month = ?').run(istMonth);
  }

  // Count lifetime unique visitor once ever (never resets)
  const lifetimeInsert = db
    .prepare('INSERT OR IGNORE INTO analytics_known_visitors (visitor_id, first_seen_ist) VALUES (?, ?)')
    .run(visitorId, istDate);
  if (lifetimeInsert.changes > 0) {
    db.prepare(`UPDATE analytics_totals SET count = count + 1 WHERE key = 'lifetime_unique_visitors'`).run();
  }
});

export function recordPageVisit(req: Request, res: Response): void {
  let visitorId = verifyVisitorCookie(req.cookies?.[VISITOR_COOKIE_NAME]);
  if (!visitorId) {
    visitorId = crypto.randomUUID();
    res.cookie(VISITOR_COOKIE_NAME, signVisitorId(visitorId), setCookieOptions(req, VISITOR_COOKIE_TTL_MS));
  }

  const { istDate, istMonth } = getISTParts();
  recordVisitTxn(visitorId, istDate, istMonth);
  res.json({ recorded: true, istDate, istMonth });
}

export function recordNewspaperView(req: Request, res: Response): void {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: 'Invalid newspaper id.' });
    return;
  }
  const info = db.prepare('UPDATE newspapers SET views = views + 1 WHERE id = ?').run(id);
  if (info.changes === 0) {
    res.status(404).json({ error: 'Newspaper not found.' });
    return;
  }
  const row = db.prepare('SELECT views FROM newspapers WHERE id = ?').get(id) as { views: number };
  res.json({ id, views: row.views });
}

export function recordVideoView(req: Request, res: Response): void {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: 'Invalid video id.' });
    return;
  }
  const info = db.prepare('UPDATE videos SET views = views + 1 WHERE id = ?').run(id);
  if (info.changes === 0) {
    res.status(404).json({ error: 'Video not found.' });
    return;
  }
  const row = db.prepare('SELECT views FROM videos WHERE id = ?').get(id) as { views: number };
  res.json({ id, views: row.views });
}

export function getAdminAnalytics(_req: Request, res: Response): void {
  const { istDate, istMonth, istTime, istDisplayDate } = getISTParts();

  const dailyRow = db
    .prepare('SELECT unique_visitors, page_views FROM analytics_daily WHERE ist_date = ?')
    .get(istDate) as { unique_visitors: number; page_views: number } | undefined;

  const monthlyRow = db
    .prepare('SELECT unique_visitors, page_views FROM analytics_monthly WHERE ist_month = ?')
    .get(istMonth) as { unique_visitors: number; page_views: number } | undefined;

  const totalVisitorsRow = db
    .prepare(`SELECT count FROM analytics_totals WHERE key = 'lifetime_unique_visitors'`)
    .get() as { count: number } | undefined;

  const totalPageViewsRow = db
    .prepare(`SELECT count FROM analytics_totals WHERE key = 'lifetime_page_views'`)
    .get() as { count: number } | undefined;

  const npViewsRow = db.prepare('SELECT COALESCE(SUM(views), 0) as total FROM newspapers').get() as { total: number };
  const vidViewsRow = db.prepare('SELECT COALESCE(SUM(views), 0) as total FROM videos').get() as { total: number };

  const npCount = (db.prepare('SELECT COUNT(*) as c FROM newspapers').get() as { c: number }).c;
  const vidCount = (db.prepare('SELECT COUNT(*) as c FROM videos').get() as { c: number }).c;
  const artCount = (db.prepare('SELECT COUNT(*) as c FROM news_articles').get() as { c: number }).c;
  const msgCount = (db.prepare('SELECT COUNT(*) as c FROM contact_messages').get() as { c: number }).c;

  // Build continuous 14-day IST series
  const recentDates = getRecentISTDates(14);
  const dailyMap = new Map<string, { unique_visitors: number; page_views: number }>();
  const dailyRows = db
    .prepare('SELECT ist_date, unique_visitors, page_views FROM analytics_daily WHERE ist_date >= ?')
    .all(recentDates[0]) as Array<{ ist_date: string; unique_visitors: number; page_views: number }>;
  for (const r of dailyRows) {
    dailyMap.set(r.ist_date, { unique_visitors: r.unique_visitors, page_views: r.page_views });
  }
  const dailySeries = recentDates.map((d) => ({
    date: d,
    uniqueVisitors: dailyMap.get(d)?.unique_visitors ?? 0,
    pageViews: dailyMap.get(d)?.page_views ?? 0,
  }));

  // Build continuous 6-month IST series
  const recentMonths = getRecentISTMonths(6);
  const monthlyMap = new Map<string, { unique_visitors: number; page_views: number }>();
  const monthlyRows = db
    .prepare('SELECT ist_month, unique_visitors, page_views FROM analytics_monthly WHERE ist_month >= ?')
    .all(recentMonths[0]) as Array<{ ist_month: string; unique_visitors: number; page_views: number }>;
  for (const r of monthlyRows) {
    monthlyMap.set(r.ist_month, { unique_visitors: r.unique_visitors, page_views: r.page_views });
  }
  const monthlySeries = recentMonths.map((m) => ({
    month: m,
    uniqueVisitors: monthlyMap.get(m)?.unique_visitors ?? 0,
    pageViews: monthlyMap.get(m)?.page_views ?? 0,
  }));

  const topNewspapers = db
    .prepare('SELECT id, title, publication_date, views FROM newspapers ORDER BY views DESC, id DESC LIMIT 5')
    .all();

  const topVideos = db
    .prepare('SELECT id, title, views, created_at FROM videos ORDER BY views DESC, id DESC LIMIT 5')
    .all();

  res.json({
    ist: {
      date: istDate,
      month: istMonth,
      time: istTime,
      displayDate: istDisplayDate,
    },
    metrics: {
      todayVisitors: dailyRow?.unique_visitors ?? 0,
      monthVisitors: monthlyRow?.unique_visitors ?? 0,
      totalVisitors: totalVisitorsRow?.count ?? 0,
      todayPageViews: dailyRow?.page_views ?? 0,
      monthPageViews: monthlyRow?.page_views ?? 0,
      totalPageViews: totalPageViewsRow?.count ?? 0,
      newspaperViews: npViewsRow.total,
      videoViews: vidViewsRow.total,
    },
    counts: {
      newspapers: npCount,
      videos: vidCount,
      articles: artCount,
      messages: msgCount,
    },
    dailySeries,
    monthlySeries,
    topNewspapers,
    topVideos,
  });
}
