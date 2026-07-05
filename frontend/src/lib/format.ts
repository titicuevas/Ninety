const watchedDateFormatter = new Intl.DateTimeFormat('es-ES', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

const shortDateFormatter = new Intl.DateTimeFormat('es-ES', {
  day: 'numeric',
  month: 'short',
});

export function formatWatchedDate(date: string) {
  return watchedDateFormatter.format(new Date(`${date}T12:00:00`));
}

export function formatMatchDate(utcDate?: string) {
  if (!utcDate) return null;
  return watchedDateFormatter.format(new Date(utcDate));
}

export function formatRelativeTime(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'ahora mismo';
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `hace ${days} d`;
  return shortDateFormatter.format(new Date(iso));
}
