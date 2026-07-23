import { useEffect, useState } from 'react';

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/** Live clock styled like reference: "Oct 26, 2023, 14:38 UTC" */
export function useClock() {
  const [label, setLabel] = useState(() => formatUtc(new Date()));

  useEffect(() => {
    const tick = () => setLabel(formatUtc(new Date()));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  return label;
}

function formatUtc(d: Date) {
  const mon = MONTHS[d.getUTCMonth()];
  const day = d.getUTCDate();
  const year = d.getUTCFullYear();
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  return `${mon} ${day}, ${year}, ${hh}:${mm} UTC`;
}
