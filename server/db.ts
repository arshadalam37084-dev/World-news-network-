import Database from 'better-sqlite3';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { getISTParts } from './time.ts';

export const DATA_DIR = path.resolve(process.cwd(), 'data');
export const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
export const UPLOAD_SUBDIRS = ['posters', 'newspapers', 'videos', 'thumbnails', 'articles'] as const;

for (const dir of [DATA_DIR, UPLOADS_DIR, ...UPLOAD_SUBDIRS.map((sub) => path.join(UPLOADS_DIR, sub))]) {
  fs.mkdirSync(dir, { recursive: true });
}

export const db = new Database(path.join(DATA_DIR, 'wnn.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') {
    return false;
  }
  const [, salt, originalHashHex] = parts;
  try {
    const derived = crypto.scryptSync(password, salt, 64);
    const original = Buffer.from(originalHashHex, 'hex');
    if (derived.length !== original.length) {
      return false;
    }
    return crypto.timingSafeEqual(derived, original);
  } catch {
    return false;
  }
}

export function getSetting(key: string): string {
  const row = db.prepare('SELECT value FROM app_settings WHERE key = ?').get(key) as { value: string } | undefined;
  return row ? row.value : '';
}

export function setSetting(key: string, value: string): void {
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO app_settings (key, value, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `).run(key, value, now);
}

export function deleteUploadedFileIfLocal(publicUrl: string | null | undefined): void {
  if (!publicUrl || !publicUrl.startsWith('/uploads/')) {
    return;
  }
  const relative = publicUrl.replace(/^\/uploads\//, '');
  const resolved = path.resolve(UPLOADS_DIR, relative);
  if (resolved.startsWith(UPLOADS_DIR) && fs.existsSync(resolved)) {
    try {
      fs.unlinkSync(resolved);
    } catch {
      // Ignore cleanup errors on already-removed files
    }
  }
}

function createSeedVideoFromImage(imageRelativePath: string, outFileName: string): string {
  const srcPath = path.resolve(process.cwd(), imageRelativePath.replace(/^\//, ''));
  const destPath = path.join(UPLOADS_DIR, 'videos', outFileName);
  if (fs.existsSync(destPath)) {
    return `/uploads/videos/${outFileName}`;
  }
  if (!fs.existsSync(srcPath)) {
    return '';
  }
  try {
    execFileSync(
      'ffmpeg',
      [
        '-y',
        '-loop',
        '1',
        '-i',
        srcPath,
        '-t',
        '5',
        '-vf',
        'scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,format=yuv420p',
        '-c:v',
        'libx264',
        '-preset',
        'ultrafast',
        '-movflags',
        '+faststart',
        destPath,
      ],
      { stdio: 'ignore', timeout: 15000 }
    );
    if (fs.existsSync(destPath)) {
      return `/uploads/videos/${outFileName}`;
    }
  } catch {
    // Fallback if ffmpeg fails
  }
  return '';
}

export function initDatabase(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS admin_sessions (
      token_hash TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      ip_address TEXT,
      user_agent TEXT
    );

    CREATE TABLE IF NOT EXISTS newspapers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      publication_date TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      download_enabled INTEGER NOT NULL DEFAULT 1,
      views INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS newspaper_pages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      newspaper_id INTEGER NOT NULL REFERENCES newspapers(id) ON DELETE CASCADE,
      page_number INTEGER NOT NULL,
      image_url TEXT NOT NULL,
      file_name TEXT NOT NULL,
      file_size INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS videos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      video_url TEXT NOT NULL,
      thumbnail_url TEXT NOT NULL DEFAULT '',
      views INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS news_articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      summary TEXT NOT NULL,
      content TEXT NOT NULL,
      author TEXT NOT NULL DEFAULT 'WNN Editorial Desk',
      image_url TEXT NOT NULL DEFAULT '',
      is_breaking INTEGER NOT NULL DEFAULT 0,
      published_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS contact_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      subject TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS analytics_totals (
      key TEXT PRIMARY KEY,
      count INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS analytics_daily (
      ist_date TEXT PRIMARY KEY,
      unique_visitors INTEGER NOT NULL DEFAULT 0,
      page_views INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS analytics_monthly (
      ist_month TEXT PRIMARY KEY,
      unique_visitors INTEGER NOT NULL DEFAULT 0,
      page_views INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS analytics_daily_visitors (
      ist_date TEXT NOT NULL,
      visitor_id TEXT NOT NULL,
      PRIMARY KEY (ist_date, visitor_id)
    );

    CREATE TABLE IF NOT EXISTS analytics_monthly_visitors (
      ist_month TEXT NOT NULL,
      visitor_id TEXT NOT NULL,
      PRIMARY KEY (ist_month, visitor_id)
    );

    CREATE TABLE IF NOT EXISTS analytics_known_visitors (
      visitor_id TEXT PRIMARY KEY,
      first_seen_ist TEXT NOT NULL
    );
  `);

  // Seed default settings safely (never overwrites existing admin choices)
  if (!getSetting('admin_password_hash')) {
    setSetting('admin_password_hash', hashPassword('arshad@786'));
  }
  if (!getSetting('session_secret')) {
    setSetting('session_secret', crypto.randomBytes(32).toString('hex'));
  }
  if (!getSetting('whatsapp_channel_url')) {
    setSetting('whatsapp_channel_url', 'https://whatsapp.com/channel/0029Vb9FtP4JuyA4OaCPCr22');
  }
  if (!getSetting('poster_initialized')) {
    setSetting('poster_initialized', '1');
    setSetting('poster_enabled', '1');
    setSetting('poster_image_url', '/src/assets/images/wnn_homepage_poster_1794853325284.jpg');
    setSetting('poster_link_url', '');
    setSetting('poster_caption', 'WORLD NEWS NETWORK — LIVE GLOBAL NEWSROOM COVERAGE');
  }

  db.prepare(`INSERT OR IGNORE INTO analytics_totals (key, count) VALUES ('lifetime_unique_visitors', 0)`).run();
  db.prepare(`INSERT OR IGNORE INTO analytics_totals (key, count) VALUES ('lifetime_page_views', 0)`).run();

  const { istDate } = getISTParts();

  // Seed initial E-Paper edition only if database is brand new
  const seededKey = getSetting('initial_content_seeded');
  if (!seededKey) {
    setSetting('initial_content_seeded', '1');
    const nowIso = new Date().toISOString();

    const npCount = (db.prepare('SELECT COUNT(*) as c FROM newspapers').get() as { c: number }).c;
    if (npCount === 0) {
      const insertNp = db.prepare(`
        INSERT INTO newspapers (title, publication_date, description, download_enabled, views, created_at, updated_at)
        VALUES (?, ?, ?, ?, 0, ?, ?)
      `);
      const insertPage = db.prepare(`
        INSERT INTO newspaper_pages (newspaper_id, page_number, image_url, file_name, file_size)
        VALUES (?, ?, ?, ?, ?)
      `);

      const r1 = insertNp.run(
        'WORLD NEWS NETWORK — Morning Main Edition',
        istDate,
        'Front-page diplomatic summit coverage, global economic indices, energy corridor briefings, and international dispatches.',
        1,
        nowIso,
        nowIso
      );
      insertPage.run(
        r1.lastInsertRowid,
        1,
        '/src/assets/images/epaper_frontpage_1_1794853325260.jpg',
        'wnn-front-page.jpg',
        0
      );
      insertPage.run(
        r1.lastInsertRowid,
        2,
        '/src/assets/images/epaper_page_2_1794853325424.jpg',
        'wnn-world-markets-page-2.jpg',
        0
      );
    }

    const vidCount = (db.prepare('SELECT COUNT(*) as c FROM videos').get() as { c: number }).c;
    if (vidCount === 0) {
      const v1Url = createSeedVideoFromImage('/src/assets/images/video_thumb_1_1794853327319.jpg', 'wnn-prime-bulletin.mp4');
      const v2Url = createSeedVideoFromImage('/src/assets/images/video_thumb_2_1794853326681.jpg', 'wnn-summit-briefing.mp4');

      const insertVid = db.prepare(`
        INSERT INTO videos (title, description, video_url, thumbnail_url, views, created_at, updated_at)
        VALUES (?, ?, ?, ?, 0, ?, ?)
      `);

      if (v1Url) {
        insertVid.run(
          'Prime Hour Global Desk: Diplomatic Accord & Market Outlook',
          'Our senior anchors break down today’s high-level trade talks, central bank policy signals, and regional infrastructure agreements.',
          v1Url,
          '/src/assets/images/video_thumb_1_1794853327319.jpg',
          nowIso,
          nowIso
        );
      }
      if (v2Url) {
        insertVid.run(
          'Special Press Briefing: International Security & Energy Corridor Report',
          'Highlights from the multilateral press conference addressing clean energy logistics, maritime corridors, and cross-border cooperation.',
          v2Url,
          '/src/assets/images/video_thumb_2_1794853326681.jpg',
          new Date(Date.now() - 3600 * 1000).toISOString(),
          nowIso
        );
      }
    }

    const artCount = (db.prepare('SELECT COUNT(*) as c FROM news_articles').get() as { c: number }).c;
    if (artCount === 0) {
      const insertArt = db.prepare(`
        INSERT INTO news_articles (title, category, summary, content, author, image_url, is_breaking, published_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      insertArt.run(
        'Global Trade Ministers Sign Framework for Resilient Supply Chains',
        'World Affairs',
        'Delegations from 24 economies agreed on streamlined customs standards and digital port clearances aimed at reducing transit bottlenecks.',
        'Trade representatives concluded three days of negotiations today with a comprehensive multilateral accord focused on port digitization, critical mineral logistics, and transparent tariff schedules.\n\nEconomists note that modernizing customs data pipelines could lower shipping delays across major maritime corridors by nearly 18 percent over the next two fiscal cycles.\n\nWORLD NEWS NETWORK bureaus report that implementation working groups will convene early next quarter to finalize technical interoperability rules.',
        'Arjun Mehta · Geneva Bureau',
        '/src/assets/images/video_thumb_2_1794853326681.jpg',
        1,
        nowIso,
        nowIso
      );
      insertArt.run(
        'Central Banks Signal Measured Approach as Manufacturing PMI Rebounds',
        'Economy & Markets',
        'Industrial output across Asia and Europe posted steady expansion while inflation expectations anchored closer to policy targets.',
        'Equity and bond desks responded calmly after fresh manufacturing data pointed to resilient factory orders and stabilizing energy input costs.\n\nPolicy analysts emphasized that central banks retain flexibility ahead of next month’s rate reviews, balancing domestic credit demand against currency stability.',
        'Neha Kulkarni · Financial Desk',
        '/src/assets/images/video_thumb_1_1794853327319.jpg',
        0,
        new Date(Date.now() - 7200 * 1000).toISOString(),
        nowIso
      );
      insertArt.run(
        'High-Speed Rail & Grid Modernization Receive Record Sovereign Green Bond Backing',
        'Infrastructure',
        'Institutional investors oversubscribed the new ten-year infrastructure bond tranche dedicated to electrified transit and substation upgrades.',
        'Municipal transit authorities confirmed that proceeds from the oversubscribed issuance will accelerate regional rail signaling upgrades and renewable grid storage integration.\n\nProject directors stated that Phase 1 civil works remain ahead of schedule with strict environmental auditing.',
        'Rohan Deshmukh · National Desk',
        '/src/assets/images/wnn_homepage_poster_1794853325284.jpg',
        0,
        new Date(Date.now() - 14400 * 1000).toISOString(),
        nowIso
      );
    }
  }
}
