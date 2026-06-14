export const getGmt9Date = (offsetMs: number = 0): Date => {
  return new Date(Date.now() + 9 * 60 * 60 * 1000 + offsetMs);
};

export const getGmt9DateString = (offsetMs: number = 0): string => {
  const gmt9 = new Date(Date.now() + 9 * 60 * 60 * 1000 + offsetMs);
  return gmt9.toISOString().split('T')[0];
};

export const getGmt9Today = (): string => getGmt9DateString(0);
export const getGmt9Yesterday = (): string => getGmt9DateString(-86400000);

export const getTimeUntilNextGmt9Day = (): number => {
  const now = getGmt9Date();
  const nextDay = new Date(now);
  nextDay.setHours(24, 0, 0, 0); // Next midnight in GMT+9
  return nextDay.getTime() - now.getTime();
};
