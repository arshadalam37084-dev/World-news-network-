export type PublicSection = 'home' | 'latest-news' | 'e-paper' | 'videos' | 'about' | 'contact';

export interface IstInfo {
  istDate: string;
  istMonth: string;
  istTime: string;
  istDisplayDate: string;
}

export interface PosterConfig {
  enabled: boolean;
  imageUrl: string;
  linkUrl: string;
  caption: string;
}

export interface NewspaperPage {
  id: number;
  pageNumber: number;
  imageUrl: string;
  fileName: string;
}

export interface Newspaper {
  id: number;
  title: string;
  publicationDate: string;
  description: string;
  downloadEnabled: boolean;
  views: number;
  createdAt: string;
  updatedAt: string;
  pages: NewspaperPage[];
}

export interface VideoItem {
  id: number;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl: string;
  views: number;
  createdAt: string;
  updatedAt: string;
}

export interface NewsArticle {
  id: number;
  title: string;
  category: string;
  summary: string;
  content: string;
  author: string;
  imageUrl: string;
  isBreaking: boolean;
  publishedAt: string;
  createdAt: string;
}

export interface PublicBootstrap {
  ist: IstInfo;
  poster: PosterConfig;
  whatsappChannelUrl: string;
  newspapers: Newspaper[];
  videos: VideoItem[];
  articles: NewsArticle[];
}

export interface ContactMessage {
  id: number;
  name: string;
  email: string;
  subject: string;
  message: string;
  createdAt: string;
}

export interface AnalyticsPayload {
  ist: {
    date: string;
    month: string;
    time: string;
    displayDate: string;
  };
  metrics: {
    todayVisitors: number;
    monthVisitors: number;
    totalVisitors: number;
    todayPageViews: number;
    monthPageViews: number;
    totalPageViews: number;
    newspaperViews: number;
    videoViews: number;
  };
  counts: {
    newspapers: number;
    videos: number;
    articles: number;
    messages: number;
  };
  dailySeries: Array<{
    date: string;
    uniqueVisitors: number;
    pageViews: number;
  }>;
  monthlySeries: Array<{
    month: string;
    uniqueVisitors: number;
    pageViews: number;
  }>;
  topNewspapers: Array<{
    id: number;
    title: string;
    publication_date: string;
    views: number;
  }>;
  topVideos: Array<{
    id: number;
    title: string;
    views: number;
    created_at: string;
  }>;
}
