import cookieParser from 'cookie-parser';
import crypto from 'crypto';
import express, { type NextFunction, type Request, type Response } from 'express';
import fs from 'fs';
import multer from 'multer';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import {
  getAdminAnalytics,
  recordNewspaperView,
  recordPageVisit,
  recordVideoView,
} from './server/analytics.ts';
import {
  changeAdminPassword,
  isAdminAuthenticated,
  loginAdmin,
  logoutAdmin,
  requireAdmin,
} from './server/auth.ts';
import {
  db,
  deleteUploadedFileIfLocal,
  getSetting,
  initDatabase,
  setSetting,
  UPLOADS_DIR,
} from './server/db.ts';
import { getISTParts } from './server/time.ts';

initDatabase();

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.set('trust proxy', 1);
app.use(express.json({ limit: '4mb' }));
app.use(cookieParser());

// Serve uploaded media persistently with byte-range support for MP4 streaming
app.use(
  '/uploads',
  express.static(UPLOADS_DIR, {
    acceptRanges: true,
    maxAge: '7d',
  })
);

// File type validators
const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const IMAGE_MIMES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);

function makeDiskStorage(subdir: string) {
  return multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, path.join(UPLOADS_DIR, subdir));
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || '.bin';
      cb(null, `${crypto.randomUUID()}${ext}`);
    },
  });
}

function imageFileFilter(_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) {
  const ext = path.extname(file.originalname).toLowerCase();
  const mime = file.mimetype.toLowerCase();
  if (!IMAGE_EXTS.has(ext) || !IMAGE_MIMES.has(mime)) {
    cb(new Error('Only JPG, JPEG, PNG, and WebP image files are allowed.'));
    return;
  }
  cb(null, true);
}

const posterUpload = multer({
  storage: makeDiskStorage('posters'),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: imageFileFilter,
});

const newspaperUpload = multer({
  storage: makeDiskStorage('newspapers'),
  limits: { fileSize: 25 * 1024 * 1024, files: 100 },
  fileFilter: imageFileFilter,
});

const articleImageUpload = multer({
  storage: makeDiskStorage('articles'),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: imageFileFilter,
});

const videoUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, file, cb) => {
      if (file.fieldname === 'thumbnail') {
        cb(null, path.join(UPLOADS_DIR, 'thumbnails'));
      } else {
        cb(null, path.join(UPLOADS_DIR, 'videos'));
      }
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || (file.fieldname === 'video' ? '.mp4' : '.jpg');
      cb(null, `${crypto.randomUUID()}${ext}`);
    },
  }),
  limits: { fileSize: 300 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const mime = file.mimetype.toLowerCase();
    if (file.fieldname === 'video') {
      if (ext !== '.mp4' || (mime !== 'video/mp4' && mime !== 'application/mp4')) {
        cb(new Error('Only MP4 video files are allowed.'));
        return;
      }
      cb(null, true);
      return;
    }
    if (file.fieldname === 'thumbnail') {
      if (!IMAGE_EXTS.has(ext) || !IMAGE_MIMES.has(mime)) {
        cb(new Error('Thumbnail must be a JPG, JPEG, PNG, or WebP image.'));
        return;
      }
      cb(null, true);
      return;
    }
    cb(new Error('Unexpected upload field.'));
  },
});

function sanitizeUrl(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  const trimmed = raw.trim();
  if (!trimmed) return '';
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.toString();
    }
  } catch {
    // Try prefixing https:// if user entered a domain without protocol
    if (!trimmed.includes(' ') && trimmed.includes('.')) {
      try {
        const withProto = new URL(`https://${trimmed}`);
        return withProto.toString();
      } catch {
        return '';
      }
    }
  }
  return '';
}

interface NewspaperPageRow {
  id: number;
  newspaper_id: number;
  page_number: number;
  image_url: string;
  file_name: string;
  file_size: number;
}

interface NewspaperRow {
  id: number;
  title: string;
  publication_date: string;
  description: string;
  download_enabled: number;
  views: number;
  created_at: string;
  updated_at: string;
}

function listNewspapersWithPages(searchQuery = '', dateFilter = '', monthFilter = '') {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (searchQuery.trim()) {
    conditions.push('(title LIKE ? OR description LIKE ? OR publication_date LIKE ?)');
    const like = `%${searchQuery.trim()}%`;
    params.push(like, like, like);
  }
  if (dateFilter.trim()) {
    conditions.push('publication_date = ?');
    params.push(dateFilter.trim());
  }
  if (monthFilter.trim()) {
    conditions.push('publication_date LIKE ?');
    params.push(`${monthFilter.trim()}%`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const rows = db
    .prepare(
      `SELECT id, title, publication_date, description, download_enabled, views, created_at, updated_at
       FROM newspapers
       ${where}
       ORDER BY publication_date DESC, created_at DESC, id DESC`
    )
    .all(...params) as NewspaperRow[];

  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.id);
  const placeholders = ids.map(() => '?').join(',');
  const pages = db
    .prepare(
      `SELECT id, newspaper_id, page_number, image_url, file_name, file_size
       FROM newspaper_pages
       WHERE newspaper_id IN (${placeholders})
       ORDER BY page_number ASC, id ASC`
    )
    .all(...ids) as NewspaperPageRow[];

  const pagesByPaper = new Map<number, NewspaperPageRow[]>();
  for (const p of pages) {
    const arr = pagesByPaper.get(p.newspaper_id) ?? [];
    arr.push(p);
    pagesByPaper.set(p.newspaper_id, arr);
  }

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    publicationDate: r.publication_date,
    description: r.description,
    downloadEnabled: Boolean(r.download_enabled),
    views: r.views,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    pages: (pagesByPaper.get(r.id) ?? []).map((p) => ({
      id: p.id,
      pageNumber: p.page_number,
      imageUrl: p.image_url,
      fileName: p.file_name,
    })),
  }));
}

function getPosterPayload() {
  const enabled = getSetting('poster_enabled') === '1';
  const imageUrl = getSetting('poster_image_url');
  return {
    enabled: enabled && Boolean(imageUrl),
    imageUrl: enabled ? imageUrl : '',
    linkUrl: getSetting('poster_link_url'),
    caption: getSetting('poster_caption'),
  };
}

// ======================= PUBLIC READ & TRACKING ROUTES =======================

app.get('/api/public/bootstrap', (_req, res) => {
  const ist = getISTParts();
  const poster = getPosterPayload();
  const whatsappChannelUrl = getSetting('whatsapp_channel_url');
  const newspapers = listNewspapersWithPages();
  const videos = db
    .prepare(
      `SELECT id, title, description, video_url as videoUrl, thumbnail_url as thumbnailUrl, views, created_at as createdAt, updated_at as updatedAt
       FROM videos
       ORDER BY created_at DESC, id DESC`
    )
    .all();
  const rawArticles = db
    .prepare(
      `SELECT id, title, category, summary, content, author, image_url as imageUrl, is_breaking as isBreaking, published_at as publishedAt, created_at as createdAt
       FROM news_articles
       ORDER BY published_at DESC, id DESC`
    )
    .all() as Array<Record<string, unknown>>;
  const articles = rawArticles.map((a) => ({ ...a, isBreaking: Boolean(a.isBreaking) }));

  res.json({
    ist,
    poster,
    whatsappChannelUrl,
    newspapers,
    videos,
    articles,
  });
});

app.get('/api/newspapers', (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q : '';
  const date = typeof req.query.date === 'string' ? req.query.date : '';
  const month = typeof req.query.month === 'string' ? req.query.month : '';
  res.json({ newspapers: listNewspapersWithPages(q, date, month) });
});

app.get('/api/videos', (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  let videos;
  if (q) {
    const like = `%${q}%`;
    videos = db
      .prepare(
        `SELECT id, title, description, video_url as videoUrl, thumbnail_url as thumbnailUrl, views, created_at as createdAt, updated_at as updatedAt
         FROM videos
         WHERE title LIKE ? OR description LIKE ?
         ORDER BY created_at DESC, id DESC`
      )
      .all(like, like);
  } else {
    videos = db
      .prepare(
        `SELECT id, title, description, video_url as videoUrl, thumbnail_url as thumbnailUrl, views, created_at as createdAt, updated_at as updatedAt
         FROM videos
         ORDER BY created_at DESC, id DESC`
      )
      .all();
  }
  res.json({ videos });
});

app.post('/api/analytics/visit', recordPageVisit);
app.post('/api/analytics/newspaper/:id/view', recordNewspaperView);
app.post('/api/analytics/video/:id/view', recordVideoView);

app.post('/api/contact', (req, res) => {
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
  const email = typeof req.body?.email === 'string' ? req.body.email.trim() : '';
  const subject = typeof req.body?.subject === 'string' ? req.body.subject.trim() : '';
  const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';

  if (!name || !email || !subject || !message) {
    res.status(400).json({ error: 'All contact form fields are required.' });
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(400).json({ error: 'Please provide a valid email address.' });
    return;
  }

  db.prepare(
    `INSERT INTO contact_messages (name, email, subject, message, created_at)
     VALUES (?, ?, ?, ?, ?)`
  ).run(name.slice(0, 120), email.slice(0, 160), subject.slice(0, 200), message.slice(0, 3000), new Date().toISOString());

  res.status(201).json({ success: true, message: 'Your message has been delivered to the WORLD NEWS NETWORK editorial desk.' });
});

// ======================= ADMIN AUTH ROUTES =======================

app.get('/api/admin/me', (req, res) => {
  res.json({ authenticated: isAdminAuthenticated(req) });
});

app.post('/api/admin/login', loginAdmin);
app.post('/api/admin/logout', logoutAdmin);
app.post('/api/admin/change-password', requireAdmin, changeAdminPassword);

// ======================= PROTECTED ADMIN ROUTES =======================

app.get('/api/admin/analytics', requireAdmin, getAdminAnalytics);

app.get('/api/admin/messages', requireAdmin, (_req, res) => {
  const messages = db
    .prepare('SELECT id, name, email, subject, message, created_at as createdAt FROM contact_messages ORDER BY id DESC LIMIT 100')
    .all();
  res.json({ messages });
});

// Poster Management (16:9)
app.post('/api/admin/poster', requireAdmin, posterUpload.single('image'), (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'Please upload a valid JPG, JPEG, PNG, or WebP poster image.' });
    return;
  }
  const previousUrl = getSetting('poster_image_url');
  const newUrl = `/uploads/posters/${req.file.filename}`;
  const linkUrl = sanitizeUrl(req.body?.linkUrl);
  const caption = typeof req.body?.caption === 'string' ? req.body.caption.trim().slice(0, 220) : '';

  setSetting('poster_image_url', newUrl);
  setSetting('poster_enabled', '1');
  if (typeof req.body?.linkUrl === 'string') {
    setSetting('poster_link_url', linkUrl);
  }
  if (typeof req.body?.caption === 'string') {
    setSetting('poster_caption', caption);
  }

  if (previousUrl && previousUrl !== newUrl) {
    deleteUploadedFileIfLocal(previousUrl);
  }

  res.json({ poster: getPosterPayload() });
});

app.put('/api/admin/poster/meta', requireAdmin, (req, res) => {
  const rawLink = typeof req.body?.linkUrl === 'string' ? req.body.linkUrl.trim() : '';
  const linkUrl = rawLink ? sanitizeUrl(rawLink) : '';
  if (rawLink && !linkUrl) {
    res.status(400).json({ error: 'Please provide a valid http(s) URL for the poster link.' });
    return;
  }
  const caption = typeof req.body?.caption === 'string' ? req.body.caption.trim().slice(0, 220) : '';
  setSetting('poster_link_url', linkUrl);
  setSetting('poster_caption', caption);
  res.json({ poster: getPosterPayload() });
});

app.delete('/api/admin/poster', requireAdmin, (_req, res) => {
  const previousUrl = getSetting('poster_image_url');
  setSetting('poster_enabled', '0');
  setSetting('poster_image_url', '');
  setSetting('poster_link_url', '');
  setSetting('poster_caption', '');
  deleteUploadedFileIfLocal(previousUrl);
  res.json({ poster: getPosterPayload() });
});

// WhatsApp Channel URL Management
app.put('/api/admin/settings/whatsapp', requireAdmin, (req, res) => {
  const raw = typeof req.body?.whatsappChannelUrl === 'string' ? req.body.whatsappChannelUrl.trim() : '';
  const cleanUrl = sanitizeUrl(raw);
  if (!cleanUrl) {
    res.status(400).json({ error: 'Please enter a valid WhatsApp Channel URL (e.g. https://whatsapp.com/channel/...).' });
    return;
  }
  setSetting('whatsapp_channel_url', cleanUrl);
  res.json({ whatsappChannelUrl: cleanUrl });
});

// Newspaper Upload / Edit / Delete
app.post('/api/admin/newspapers', requireAdmin, newspaperUpload.array('pages', 100), (req, res) => {
  const files = (req.files as Express.Multer.File[]) || [];
  const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
  const publicationDate = typeof req.body?.publicationDate === 'string' ? req.body.publicationDate.trim() : '';
  const description = typeof req.body?.description === 'string' ? req.body.description.trim() : '';
  const downloadEnabled = req.body?.downloadEnabled === 'false' || req.body?.downloadEnabled === '0' ? 0 : 1;

  if (!title || !publicationDate) {
    for (const f of files) {
      deleteUploadedFileIfLocal(`/uploads/newspapers/${f.filename}`);
    }
    res.status(400).json({ error: 'Newspaper title and publication date are required.' });
    return;
  }
  if (files.length === 0) {
    res.status(400).json({ error: 'Please upload at least one newspaper page image (JPG, JPEG, PNG, or WebP).' });
    return;
  }

  const nowIso = new Date().toISOString();
  const createTxn = db.transaction(() => {
    const info = db
      .prepare(
        `INSERT INTO newspapers (title, publication_date, description, download_enabled, views, created_at, updated_at)
         VALUES (?, ?, ?, ?, 0, ?, ?)`
      )
      .run(title.slice(0, 200), publicationDate.slice(0, 20), description.slice(0, 2000), downloadEnabled, nowIso, nowIso);

    const newspaperId = Number(info.lastInsertRowid);
    const insertPage = db.prepare(
      `INSERT INTO newspaper_pages (newspaper_id, page_number, image_url, file_name, file_size)
       VALUES (?, ?, ?, ?, ?)`
    );

    files.forEach((file, index) => {
      insertPage.run(
        newspaperId,
        index + 1,
        `/uploads/newspapers/${file.filename}`,
        file.originalname.slice(0, 200),
        file.size
      );
    });
    return newspaperId;
  });

  const newspaperId = createTxn();
  const created = listNewspapersWithPages().find((n) => n.id === newspaperId);
  res.status(201).json({ newspaper: created });
});

app.put('/api/admin/newspapers/:id', requireAdmin, newspaperUpload.array('newPages', 100), (req, res) => {
  const id = Number(req.params.id);
  const newFiles = (req.files as Express.Multer.File[]) || [];
  if (!Number.isInteger(id) || id <= 0) {
    for (const f of newFiles) deleteUploadedFileIfLocal(`/uploads/newspapers/${f.filename}`);
    res.status(400).json({ error: 'Invalid newspaper ID.' });
    return;
  }

  const existing = db.prepare('SELECT id FROM newspapers WHERE id = ?').get(id) as { id: number } | undefined;
  if (!existing) {
    for (const f of newFiles) deleteUploadedFileIfLocal(`/uploads/newspapers/${f.filename}`);
    res.status(404).json({ error: 'Newspaper not found.' });
    return;
  }

  const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
  const publicationDate = typeof req.body?.publicationDate === 'string' ? req.body.publicationDate.trim() : '';
  const description = typeof req.body?.description === 'string' ? req.body.description.trim() : '';
  const downloadEnabled = req.body?.downloadEnabled === 'false' || req.body?.downloadEnabled === '0' ? 0 : 1;

  if (!title || !publicationDate) {
    for (const f of newFiles) deleteUploadedFileIfLocal(`/uploads/newspapers/${f.filename}`);
    res.status(400).json({ error: 'Title and publication date are required.' });
    return;
  }

  let keepPageIds: number[] | null = null;
  if (typeof req.body?.keepPageIds === 'string') {
    try {
      const parsed = JSON.parse(req.body.keepPageIds);
      if (Array.isArray(parsed)) {
        keepPageIds = parsed.map((v) => Number(v)).filter((v) => Number.isInteger(v) && v > 0);
      }
    } catch {
      keepPageIds = null;
    }
  }

  const existingPages = db
    .prepare('SELECT id, image_url FROM newspaper_pages WHERE newspaper_id = ? ORDER BY page_number ASC, id ASC')
    .all(id) as Array<{ id: number; image_url: string }>;

  const keptIdsSet = keepPageIds !== null ? new Set(keepPageIds) : new Set(existingPages.map((p) => p.id));
  const pagesToKeep =
    keepPageIds !== null
      ? keepPageIds
          .map((pid) => existingPages.find((p) => p.id === pid))
          .filter((p): p is { id: number; image_url: string } => Boolean(p))
      : existingPages;
  const pagesToDelete = existingPages.filter((p) => !keptIdsSet.has(p.id));

  if (pagesToKeep.length === 0 && newFiles.length === 0) {
    for (const f of newFiles) deleteUploadedFileIfLocal(`/uploads/newspapers/${f.filename}`);
    res.status(400).json({ error: 'A newspaper edition must retain at least one page image.' });
    return;
  }

  const nowIso = new Date().toISOString();
  const updateTxn = db.transaction(() => {
    db.prepare(
      `UPDATE newspapers
       SET title = ?, publication_date = ?, description = ?, download_enabled = ?, updated_at = ?
       WHERE id = ?`
    ).run(title.slice(0, 200), publicationDate.slice(0, 20), description.slice(0, 2000), downloadEnabled, nowIso, id);

    for (const del of pagesToDelete) {
      db.prepare('DELETE FROM newspaper_pages WHERE id = ? AND newspaper_id = ?').run(del.id, id);
    }

    // Re-index kept pages sequentially
    pagesToKeep.forEach((p, idx) => {
      db.prepare('UPDATE newspaper_pages SET page_number = ? WHERE id = ?').run(idx + 1, p.id);
    });

    // Append newly uploaded pages
    const insertPage = db.prepare(
      `INSERT INTO newspaper_pages (newspaper_id, page_number, image_url, file_name, file_size)
       VALUES (?, ?, ?, ?, ?)`
    );
    newFiles.forEach((file, idx) => {
      insertPage.run(
        id,
        pagesToKeep.length + idx + 1,
        `/uploads/newspapers/${file.filename}`,
        file.originalname.slice(0, 200),
        file.size
      );
    });
  });

  updateTxn();
  for (const del of pagesToDelete) {
    deleteUploadedFileIfLocal(del.image_url);
  }

  const updated = listNewspapersWithPages().find((n) => n.id === id);
  res.json({ newspaper: updated });
});

app.delete('/api/admin/newspapers/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: 'Invalid newspaper ID.' });
    return;
  }
  const pages = db
    .prepare('SELECT image_url FROM newspaper_pages WHERE newspaper_id = ?')
    .all(id) as Array<{ image_url: string }>;

  const info = db.prepare('DELETE FROM newspapers WHERE id = ?').run(id);
  if (info.changes === 0) {
    res.status(404).json({ error: 'Newspaper not found.' });
    return;
  }

  for (const p of pages) {
    deleteUploadedFileIfLocal(p.image_url);
  }

  res.json({ success: true, deletedId: id });
});

// Video Upload / Edit / Delete
app.post(
  '/api/admin/videos',
  requireAdmin,
  videoUpload.fields([
    { name: 'video', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 },
  ]),
  (req, res) => {
    const filesMap = (req.files as Record<string, Express.Multer.File[]>) || {};
    const videoFile = filesMap.video?.[0];
    const thumbFile = filesMap.thumbnail?.[0];

    const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
    const description = typeof req.body?.description === 'string' ? req.body.description.trim() : '';

    if (!videoFile) {
      if (thumbFile) deleteUploadedFileIfLocal(`/uploads/thumbnails/${thumbFile.filename}`);
      res.status(400).json({ error: 'Please upload an MP4 video file.' });
      return;
    }
    if (!title) {
      deleteUploadedFileIfLocal(`/uploads/videos/${videoFile.filename}`);
      if (thumbFile) deleteUploadedFileIfLocal(`/uploads/thumbnails/${thumbFile.filename}`);
      res.status(400).json({ error: 'Video title is required.' });
      return;
    }

    const nowIso = new Date().toISOString();
    const videoUrl = `/uploads/videos/${videoFile.filename}`;
    const thumbnailUrl = thumbFile ? `/uploads/thumbnails/${thumbFile.filename}` : '';

    const info = db
      .prepare(
        `INSERT INTO videos (title, description, video_url, thumbnail_url, views, created_at, updated_at)
         VALUES (?, ?, ?, ?, 0, ?, ?)`
      )
      .run(title.slice(0, 200), description.slice(0, 2000), videoUrl, thumbnailUrl, nowIso, nowIso);

    const created = db
      .prepare(
        `SELECT id, title, description, video_url as videoUrl, thumbnail_url as thumbnailUrl, views, created_at as createdAt, updated_at as updatedAt
         FROM videos WHERE id = ?`
      )
      .get(info.lastInsertRowid);

    res.status(201).json({ video: created });
  }
);

app.put('/api/admin/videos/:id', requireAdmin, videoUpload.single('thumbnail'), (req, res) => {
  const id = Number(req.params.id);
  const thumbFile = req.file;

  if (!Number.isInteger(id) || id <= 0) {
    if (thumbFile) deleteUploadedFileIfLocal(`/uploads/thumbnails/${thumbFile.filename}`);
    res.status(400).json({ error: 'Invalid video ID.' });
    return;
  }

  const existing = db
    .prepare('SELECT id, thumbnail_url FROM videos WHERE id = ?')
    .get(id) as { id: number; thumbnail_url: string } | undefined;

  if (!existing) {
    if (thumbFile) deleteUploadedFileIfLocal(`/uploads/thumbnails/${thumbFile.filename}`);
    res.status(404).json({ error: 'Video not found.' });
    return;
  }

  const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
  const description = typeof req.body?.description === 'string' ? req.body.description.trim() : '';
  if (!title) {
    if (thumbFile) deleteUploadedFileIfLocal(`/uploads/thumbnails/${thumbFile.filename}`);
    res.status(400).json({ error: 'Video title is required.' });
    return;
  }

  const newThumbUrl = thumbFile ? `/uploads/thumbnails/${thumbFile.filename}` : existing.thumbnail_url;
  const nowIso = new Date().toISOString();

  db.prepare(
    `UPDATE videos SET title = ?, description = ?, thumbnail_url = ?, updated_at = ? WHERE id = ?`
  ).run(title.slice(0, 200), description.slice(0, 2000), newThumbUrl, nowIso, id);

  if (thumbFile && existing.thumbnail_url && existing.thumbnail_url !== newThumbUrl) {
    deleteUploadedFileIfLocal(existing.thumbnail_url);
  }

  const updated = db
    .prepare(
      `SELECT id, title, description, video_url as videoUrl, thumbnail_url as thumbnailUrl, views, created_at as createdAt, updated_at as updatedAt
       FROM videos WHERE id = ?`
    )
    .get(id);

  res.json({ video: updated });
});

app.delete('/api/admin/videos/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: 'Invalid video ID.' });
    return;
  }

  const existing = db
    .prepare('SELECT video_url, thumbnail_url FROM videos WHERE id = ?')
    .get(id) as { video_url: string; thumbnail_url: string } | undefined;

  if (!existing) {
    res.status(404).json({ error: 'Video not found.' });
    return;
  }

  db.prepare('DELETE FROM videos WHERE id = ?').run(id);
  deleteUploadedFileIfLocal(existing.video_url);
  deleteUploadedFileIfLocal(existing.thumbnail_url);

  res.json({ success: true, deletedId: id });
});

// Latest News Dispatches Management
app.post('/api/admin/articles', requireAdmin, articleImageUpload.single('image'), (req, res) => {
  const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
  const category = typeof req.body?.category === 'string' ? req.body.category.trim() : 'World Affairs';
  const summary = typeof req.body?.summary === 'string' ? req.body.summary.trim() : '';
  const content = typeof req.body?.content === 'string' ? req.body.content.trim() : '';
  const author = typeof req.body?.author === 'string' ? req.body.author.trim() : 'WNN Editorial Desk';
  const isBreaking = req.body?.isBreaking === 'true' || req.body?.isBreaking === true || req.body?.isBreaking === '1' ? 1 : 0;

  if (!title || !summary || !content) {
    if (req.file) deleteUploadedFileIfLocal(`/uploads/articles/${req.file.filename}`);
    res.status(400).json({ error: 'Headline, summary, and full dispatch body are required.' });
    return;
  }

  const imageUrl = req.file ? `/uploads/articles/${req.file.filename}` : '';
  const nowIso = new Date().toISOString();

  const info = db
    .prepare(
      `INSERT INTO news_articles (title, category, summary, content, author, image_url, is_breaking, published_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      title.slice(0, 220),
      category.slice(0, 60) || 'World Affairs',
      summary.slice(0, 500),
      content.slice(0, 12000),
      author.slice(0, 100) || 'WNN Editorial Desk',
      imageUrl,
      isBreaking,
      nowIso,
      nowIso
    );

  const created = db
    .prepare(
      `SELECT id, title, category, summary, content, author, image_url as imageUrl, is_breaking as isBreaking, published_at as publishedAt, created_at as createdAt
       FROM news_articles WHERE id = ?`
    )
    .get(info.lastInsertRowid) as Record<string, unknown>;

  res.status(201).json({ article: { ...created, isBreaking: Boolean(created.isBreaking) } });
});

app.delete('/api/admin/articles/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: 'Invalid article ID.' });
    return;
  }
  const existing = db.prepare('SELECT image_url FROM news_articles WHERE id = ?').get(id) as
    | { image_url: string }
    | undefined;
  if (!existing) {
    res.status(404).json({ error: 'Article not found.' });
    return;
  }
  db.prepare('DELETE FROM news_articles WHERE id = ?').run(id);
  deleteUploadedFileIfLocal(existing.image_url);
  res.json({ success: true, deletedId: id });
});

// JSON API error handler (handles Multer size/type errors cleanly)
app.use('/api', (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof multer.MulterError) {
    res.status(400).json({ error: err.message });
    return;
  }
  if (err instanceof Error) {
    res.status(400).json({ error: err.message });
    return;
  }
  res.status(500).json({ error: 'Unexpected server error.' });
});

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'API endpoint not found.' });
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    if (fs.existsSync(distDir)) {
      app.use(express.static(distDir));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distDir, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`WORLD NEWS NETWORK server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
