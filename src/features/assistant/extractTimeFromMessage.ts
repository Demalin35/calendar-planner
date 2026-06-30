export interface ExtractedTime {
  time: string | null;
  matchedText?: string;
}

function formatTime(hours: number, minutes: number): string | null {
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function to24Hour(
  hours: number,
  minutes: number,
  period?: 'am' | 'pm' | 'morning' | 'evening' | 'утра' | 'вечера',
): string | null {
  let h = hours;

  if (period === 'pm' || period === 'evening' || period === 'вечера') {
    if (h < 12) h += 12;
  } else if (period === 'am' || period === 'morning' || period === 'утра') {
    if (h === 12) h = 0;
  } else if (hours >= 1 && hours <= 12 && !period) {
    // Bare hour without period defaults to morning for scheduling context.
    if (h === 12) h = 12;
  }

  return formatTime(h, minutes);
}

function inferPeriodFromMessage(message: string): 'morning' | 'evening' | undefined {
  const lower = message.toLowerCase();
  if (
    /(in the evening|вечера|вечером|pm\b)/i.test(lower) &&
    !/(in the morning|утра|утром|am\b)/i.test(lower)
  ) {
    return 'evening';
  }
  if (/(in the morning|утра|утром|am\b)/i.test(lower)) {
    return 'morning';
  }
  return undefined;
}

type TimeMatcher = {
  regex: RegExp;
  resolve: (match: RegExpMatchArray, message: string) => string | null;
};

const TIME_MATCHERS: TimeMatcher[] = [
  {
    regex: /(?:\bat\s+|в\s+)?(\d{1,2}):(\d{2})\b/i,
    resolve: (match) => {
      const hours = Number.parseInt(match[1], 10);
      const minutes = Number.parseInt(match[2], 10);
      return formatTime(hours, minutes);
    },
  },
  {
    regex:
      /\bat\s+(\d{1,2})(?::(\d{2}))?\s+in\s+the\s+(morning|evening)\b/i,
    resolve: (match) => {
      const hours = Number.parseInt(match[1], 10);
      const minutes = match[2] ? Number.parseInt(match[2], 10) : 0;
      const period = match[3].toLowerCase() as 'morning' | 'evening';
      return to24Hour(hours, minutes, period);
    },
  },
  {
    regex: /в\s+(\d{1,2})(?::(\d{2}))?\s+(утра|вечера)\b/i,
    resolve: (match) => {
      const hours = Number.parseInt(match[1], 10);
      const minutes = match[2] ? Number.parseInt(match[2], 10) : 0;
      const period = match[3].toLowerCase() as 'утра' | 'вечера';
      return to24Hour(hours, minutes, period);
    },
  },
  {
    regex: /\b(\d{1,2})\s*(am|pm)\b/i,
    resolve: (match) => {
      const hours = Number.parseInt(match[1], 10);
      const period = match[2].toLowerCase() as 'am' | 'pm';
      return to24Hour(hours, 0, period);
    },
  },
  {
    regex: /в\s+(\d{1,2})\s+час/i,
    resolve: (match, message) => {
      const hours = Number.parseInt(match[1], 10);
      const inferred = inferPeriodFromMessage(message);
      if (inferred === 'evening' || inferred === 'morning') {
        return to24Hour(hours, 0, inferred);
      }
      if (hours >= 1 && hours <= 6) {
        return formatTime(hours + 12, 0);
      }
      return formatTime(hours, 0);
    },
  },
  {
    regex: /(?:\bat\s+|в\s+)(\d{1,2})(?!\s*:|\s*\d|\s*(?:am|pm|утра|вечера|час))/i,
    resolve: (match, message) => {
      const hours = Number.parseInt(match[1], 10);
      const inferred = inferPeriodFromMessage(message);
      return to24Hour(hours, 0, inferred);
    },
  },
];

export function extractTimeFromMessage(message: string): ExtractedTime {
  for (const matcher of TIME_MATCHERS) {
    const match = message.match(matcher.regex);
    if (!match) continue;

    const time = matcher.resolve(match, message);
    if (time) {
      return { time, matchedText: match[0] };
    }
  }

  return { time: null };
}

export function stripTimeFromMessage(
  message: string,
  matchedText?: string,
): string {
  let text = matchedText ? message.replace(matchedText, ' ') : message;

  text = text
    .replace(/\s+in\s+the\s+(morning|evening)\b/gi, ' ')
    .replace(/\s+(утра|вечера)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return text;
}
