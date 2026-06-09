import { toZonedTime, format } from 'date-fns-tz';

const IST_TIMEZONE = 'Asia/Kolkata';

export const getISTDate = () => toZonedTime(new Date(), IST_TIMEZONE);

export const parseSafeDate = (dateVal) => {
  if (!dateVal) return new Date();
  if (dateVal.toDate && typeof dateVal.toDate === 'function') return dateVal.toDate();
  const d = new Date(dateVal);
  return isNaN(d.getTime()) ? new Date() : d;
};

export const formatIST = (date, formatStr = 'yyyy-MM-dd HH:mm:ss') => {
  if (!date) return '-';
  const d = parseSafeDate(date);
  return format(toZonedTime(d, IST_TIMEZONE), formatStr, { timeZone: IST_TIMEZONE });
};

export const getISTBoundaries = () => {
  const now = getISTDate();
  const today = new Date(now); today.setHours(0, 0, 0, 0);
  const week = new Date(now); const day = week.getDay();
  const diff = week.getDate() - day + (day === 0 ? -6 : 1);
  week.setDate(diff); week.setHours(0, 0, 0, 0);
  const month = new Date(now.getFullYear(), now.getMonth(), 1); month.setHours(0, 0, 0, 0);
  return { today, week, month, now };
};

export const getDaysRemainingInMonth = () => {
  const now = getISTDate();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return lastDay.getDate() - now.getDate() + 1;
};
