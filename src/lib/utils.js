import { toZonedTime, format } from 'date-fns-tz';

const IST_TIMEZONE = 'Asia/Kolkata';

/**
 * Returns the current date/time in IST
 */
export const getISTDate = () => {
  return toZonedTime(new Date(), IST_TIMEZONE);
};

/**
 * Formats a date to IST string
 */
export const formatIST = (date, formatStr = 'yyyy-MM-dd HH:mm:ss') => {
  if (!date) return '-';
  const zonedDate = toZonedTime(date, IST_TIMEZONE);
  return format(zonedDate, formatStr, { timeZone: IST_TIMEZONE });
};

/**
 * Get start of Today, Week, Month in IST for queries
 */
export const getISTBoundaries = () => {
  const now = getISTDate();

  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const week = new Date(now);
  const day = week.getDay();
  const diff = week.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Monday start
  week.setDate(diff);
  week.setHours(0, 0, 0, 0);

  const month = new Date(now.getFullYear(), now.getMonth(), 1);
  month.setHours(0,0,0,0);

  return { today, week, month };
};
