export interface IstClock {
  istDate: string; // YYYY-MM-DD in Asia/Kolkata
  istMonth: string; // YYYY-MM in Asia/Kolkata
  istTime: string; // HH:MM:SS in Asia/Kolkata
  istDisplayDate: string;
}

export function getISTParts(date = new Date()): IstClock {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const partMap: Record<string, string> = {};
  for (const part of formatter.formatToParts(date)) {
    if (part.type !== 'literal') {
      partMap[part.type] = part.value;
    }
  }

  const istDate = `${partMap.year}-${partMap.month}-${partMap.day}`;
  const istMonth = `${partMap.year}-${partMap.month}`;
  const istTime = `${partMap.hour === '24' ? '00' : partMap.hour}:${partMap.minute}:${partMap.second}`;

  const displayFormatter = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return {
    istDate,
    istMonth,
    istTime,
    istDisplayDate: displayFormatter.format(date),
  };
}

export function getRecentISTDates(days: number): string[] {
  const result: string[] = [];
  const now = Date.now();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now - i * 86400 * 1000);
    result.push(getISTParts(d).istDate);
  }
  return result;
}

export function getRecentISTMonths(months: number): string[] {
  const { istMonth } = getISTParts();
  const [yStr, mStr] = istMonth.split('-');
  let year = Number(yStr);
  let month = Number(mStr);
  const result: string[] = [];
  for (let i = 0; i < months; i++) {
    result.unshift(`${year}-${String(month).padStart(2, '0')}`);
    month -= 1;
    if (month === 0) {
      month = 12;
      year -= 1;
    }
  }
  return result;
}
