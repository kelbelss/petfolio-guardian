export const formatInterval = (seconds: number): string => {
  const hours = seconds / 3600;
  if (hours < 1) return `${seconds / 60} minutes`;
  if (hours < 24) return `${hours} hours`;
  if (hours < 168) return `${hours / 24} days`;
  return `${hours / 168} weeks`;
}; 