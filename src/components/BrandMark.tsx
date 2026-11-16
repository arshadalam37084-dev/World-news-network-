import React from 'react';

export function WnnLogoMark({ className = 'w-10 h-10' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect x="2" y="2" width="60" height="60" rx="8" fill="#0B1F3A" />
      <rect x="2" y="2" width="60" height="10" rx="4" fill="#C8102E" />
      <circle cx="32" cy="37" r="17" stroke="#FFFFFF" strokeWidth="2.2" />
      <ellipse cx="32" cy="37" rx="8.5" ry="17" stroke="#FFFFFF" strokeWidth="1.8" />
      <path d="M15 37H49" stroke="#FFFFFF" strokeWidth="1.8" />
      <path d="M18.5 28.5H45.5" stroke="#CBD5E1" strokeWidth="1.4" />
      <path d="M18.5 45.5H45.5" stroke="#CBD5E1" strokeWidth="1.4" />
      <circle cx="49" cy="18" r="3.5" fill="#C8102E" stroke="#FFFFFF" strokeWidth="1.4" />
    </svg>
  );
}

export function WhatsAppIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91C21.95 6.45 17.5 2 12.04 2zm5.81 14.12c-.24.68-1.41 1.3-1.95 1.38-.5.07-1.13.1-1.82-.12-.42-.13-.96-.31-1.65-.61-2.9-1.25-4.79-4.18-4.94-4.38-.14-.2-1.18-1.57-1.18-3 0-1.43.75-2.13 1.01-2.42.26-.29.58-.36.77-.36.19 0 .39 0 .56.01.18.01.42-.07.66.5.24.58.82 2 .89 2.15.07.14.12.31.02.51-.1.2-.14.31-.29.48-.14.17-.31.38-.44.51-.14.14-.29.3-.12.59.17.29.75 1.24 1.61 2.01 1.11.99 2.04 1.3 2.33 1.44.29.14.46.12.63-.07.17-.2.72-.84.91-1.13.19-.29.39-.24.65-.14.26.1 1.68.79 1.97.94.29.14.48.22.55.34.07.12.07.7-.17 1.38z" />
    </svg>
  );
}

export function WhatsAppChannelButton({
  url,
  className = '',
  compact = false,
}: {
  url: string;
  className?: string;
  compact?: boolean;
}) {
  const safeHref = url && (url.startsWith('http://') || url.startsWith('https://'))
    ? url
    : 'https://whatsapp.com/channel/0029Vb9FtP4JuyA4OaCPCr22';

  return (
    <a
      href={safeHref}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center justify-center gap-2 bg-[#15803D] hover:bg-[#166534] text-white font-semibold tracking-wide rounded-lg transition-colors whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#15803D] ${
        compact ? 'px-3.5 py-2 text-xs' : 'w-full px-4 py-2.5 text-xs sm:text-sm'
      } ${className}`}
    >
      <WhatsAppIcon className="w-4 h-4 shrink-0" />
      <span>FOLLOW OUR WHATSAPP CHANNEL</span>
    </a>
  );
}
