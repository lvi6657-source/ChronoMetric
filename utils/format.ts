
export const formatTime = (ms: number): string => {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const milliseconds = Math.floor((ms % 1000) / 10); // Show only 2 digits for ms

  const pad = (num: number) => num.toString().padStart(2, '0');
  const minutesStr = minutes.toString(); 

  return `${minutesStr}:${pad(seconds)}.${pad(milliseconds)}`;
};

// New formatter for the main display (tenths only)
export const formatTimeTenths = (ms: number): string => {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const tenths = Math.floor((ms % 1000) / 100); // Show 1 digit (tenths)

  const pad = (num: number) => num.toString().padStart(2, '0');
  const minutesStr = minutes.toString(); 

  return `${minutesStr}:${pad(seconds)}.${tenths}`;
};

// Smart Formatter: Removes leading zeros and empty units
// Examples: 
// 00:05.2 -> 5.2
// 01:05.2 -> 1:05.2
// 00:12.5 -> 12.5
export const formatSmart = (ms: number): string => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const tenths = Math.floor((ms % 1000) / 100);

    const pad = (num: number) => num.toString().padStart(2, '0');

    if (minutes > 0) {
        // If we have minutes, show M:SS.t
        return `${minutes}:${pad(seconds)}.${tenths}`;
    } else {
        // No minutes, show S.t (no padding on seconds)
        return `${seconds}.${tenths}`;
    }
};

export const formatTimeShort = (ms: number): string => {
    const seconds = (ms / 1000).toFixed(2);
    return `${seconds}s`;
};
