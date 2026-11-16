import type {
  AnalyticsPayload,
  ContactMessage,
  NewsArticle,
  Newspaper,
  PosterConfig,
  PublicBootstrap,
  VideoItem,
} from './types';

async function handleJson<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = typeof data?.error === 'string' ? data.error : `Request failed (${res.status})`;
    throw new Error(message);
  }
  return data as T;
}

export async function fetchBootstrap(): Promise<PublicBootstrap> {
  const res = await fetch('/api/public/bootstrap', { credentials: 'include' });
  return handleJson<PublicBootstrap>(res);
}

export async function trackVisit(): Promise<void> {
  await fetch('/api/analytics/visit', {
    method: 'POST',
    credentials: 'include',
  }).catch(() => {});
}

export async function trackNewspaperView(id: number): Promise<number | null> {
  try {
    const res = await fetch(`/api/analytics/newspaper/${id}/view`, {
      method: 'POST',
      credentials: 'include',
    });
    const data = await handleJson<{ views: number }>(res);
    return data.views;
  } catch {
    return null;
  }
}

export async function trackVideoView(id: number): Promise<number | null> {
  try {
    const res = await fetch(`/api/analytics/video/${id}/view`, {
      method: 'POST',
      credentials: 'include',
    });
    const data = await handleJson<{ views: number }>(res);
    return data.views;
  } catch {
    return null;
  }
}

export async function submitContactForm(payload: {
  name: string;
  email: string;
  subject: string;
  message: string;
}): Promise<{ success: boolean; message: string }> {
  const res = await fetch('/api/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  });
  return handleJson(res);
}

export async function checkAdminAuth(): Promise<boolean> {
  const res = await fetch('/api/admin/me', { credentials: 'include' });
  const data = await handleJson<{ authenticated: boolean }>(res);
  return data.authenticated;
}

export async function adminLogin(password: string): Promise<void> {
  const res = await fetch('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ password }),
  });
  await handleJson(res);
}

export async function adminLogout(): Promise<void> {
  const res = await fetch('/api/admin/logout', {
    method: 'POST',
    credentials: 'include',
  });
  await handleJson(res);
}

export async function adminChangePassword(currentPassword: string, newPassword: string): Promise<string> {
  const res = await fetch('/api/admin/change-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  const data = await handleJson<{ message: string }>(res);
  return data.message;
}

export async function fetchAdminAnalytics(): Promise<AnalyticsPayload> {
  const res = await fetch('/api/admin/analytics', { credentials: 'include' });
  return handleJson<AnalyticsPayload>(res);
}

export async function fetchAdminMessages(): Promise<ContactMessage[]> {
  const res = await fetch('/api/admin/messages', { credentials: 'include' });
  const data = await handleJson<{ messages: ContactMessage[] }>(res);
  return data.messages;
}

export async function uploadPoster(formData: FormData): Promise<PosterConfig> {
  const res = await fetch('/api/admin/poster', {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });
  const data = await handleJson<{ poster: PosterConfig }>(res);
  return data.poster;
}

export async function updatePosterMeta(linkUrl: string, caption: string): Promise<PosterConfig> {
  const res = await fetch('/api/admin/poster/meta', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ linkUrl, caption }),
  });
  const data = await handleJson<{ poster: PosterConfig }>(res);
  return data.poster;
}

export async function removePoster(): Promise<PosterConfig> {
  const res = await fetch('/api/admin/poster', {
    method: 'DELETE',
    credentials: 'include',
  });
  const data = await handleJson<{ poster: PosterConfig }>(res);
  return data.poster;
}

export async function updateWhatsappChannel(whatsappChannelUrl: string): Promise<string> {
  const res = await fetch('/api/admin/settings/whatsapp', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ whatsappChannelUrl }),
  });
  const data = await handleJson<{ whatsappChannelUrl: string }>(res);
  return data.whatsappChannelUrl;
}

export async function uploadNewspaper(formData: FormData): Promise<Newspaper> {
  const res = await fetch('/api/admin/newspapers', {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });
  const data = await handleJson<{ newspaper: Newspaper }>(res);
  return data.newspaper;
}

export async function updateNewspaper(id: number, formData: FormData): Promise<Newspaper> {
  const res = await fetch(`/api/admin/newspapers/${id}`, {
    method: 'PUT',
    credentials: 'include',
    body: formData,
  });
  const data = await handleJson<{ newspaper: Newspaper }>(res);
  return data.newspaper;
}

export async function deleteNewspaper(id: number): Promise<void> {
  const res = await fetch(`/api/admin/newspapers/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  await handleJson(res);
}

export async function uploadVideo(formData: FormData): Promise<VideoItem> {
  const res = await fetch('/api/admin/videos', {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });
  const data = await handleJson<{ video: VideoItem }>(res);
  return data.video;
}

export async function updateVideo(id: number, formData: FormData): Promise<VideoItem> {
  const res = await fetch(`/api/admin/videos/${id}`, {
    method: 'PUT',
    credentials: 'include',
    body: formData,
  });
  const data = await handleJson<{ video: VideoItem }>(res);
  return data.video;
}

export async function deleteVideo(id: number): Promise<void> {
  const res = await fetch(`/api/admin/videos/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  await handleJson(res);
}

export async function createArticle(formData: FormData): Promise<NewsArticle> {
  const res = await fetch('/api/admin/articles', {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });
  const data = await handleJson<{ article: NewsArticle }>(res);
  return data.article;
}

export async function deleteArticle(id: number): Promise<void> {
  const res = await fetch(`/api/admin/articles/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  await handleJson(res);
}
