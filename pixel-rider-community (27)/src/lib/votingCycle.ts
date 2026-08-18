// Voting Cycle Helper for "Bild der Woche"
// Cycle Definition:
// - Voting & Submission Phase: Starts Thursday 00:00:00, ends Sunday 20:00:00 (local/Berlin time)
// - Showcase & Preparation Phase: Starts Sunday 20:00:00, ends Thursday 00:00:00 (winner is showcased on landing page, author can update info)

export interface CycleStatus {
  phase: 'voting' | 'countdown';
  cycleId: string;
  targetDate: Date;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  formattedCountdown: string;
  badgeLabel: string;
  subLabel: string;
}

export function getCurrentCycleId(date = new Date()): string {
  const d = new Date(date);
  // Calculate ISO week number
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `cycle_${d.getFullYear()}_w${weekNo}`;
}

export function getVotingCycleStatus(now = new Date()): CycleStatus {
  const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 4 = Thursday, 5 = Friday, 6 = Saturday
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  // Check if currently in Voting Phase:
  // From Thursday (day 4, 00:00) through Sunday before 20:00 (day 0, hour < 20)
  const isVotingPhase =
    dayOfWeek === 4 ||
    dayOfWeek === 5 ||
    dayOfWeek === 6 ||
    (dayOfWeek === 0 && (currentHour < 20 || (currentHour === 20 && currentMinute === 0)));

  const cycleId = getCurrentCycleId(now);
  let targetDate = new Date(now);

  if (isVotingPhase) {
    // Target is this coming Sunday at 20:00
    const daysUntilSunday = (7 - dayOfWeek) % 7;
    targetDate.setDate(now.getDate() + daysUntilSunday);
    targetDate.setHours(20, 0, 0, 0);

    if (targetDate.getTime() <= now.getTime()) {
      targetDate.setDate(targetDate.getDate() + 7);
    }

    const diffMs = Math.max(0, targetDate.getTime() - now.getTime());
    const totalSeconds = Math.floor(diffMs / 1000);
    const days = Math.floor(totalSeconds / (3600 * 24));
    const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return {
      phase: 'voting',
      cycleId,
      targetDate,
      days,
      hours,
      minutes,
      seconds,
      formattedCountdown: `${days > 0 ? `${days}d ` : ''}${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`,
      badgeLabel: 'Voting aktiv',
      subLabel: 'Voting endet am Sonntag um 20:00 Uhr',
    };
  } else {
    // Countdown / Showcase Phase: Target is next Thursday at 00:00
    let daysUntilThursday = (4 - dayOfWeek + 7) % 7;
    if (daysUntilThursday === 0) daysUntilThursday = 7;

    targetDate.setDate(now.getDate() + daysUntilThursday);
    targetDate.setHours(0, 0, 0, 0);

    const diffMs = Math.max(0, targetDate.getTime() - now.getTime());
    const totalSeconds = Math.floor(diffMs / 1000);
    const days = Math.floor(totalSeconds / (3600 * 24));
    const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return {
      phase: 'countdown',
      cycleId,
      targetDate,
      days,
      hours,
      minutes,
      seconds,
      formattedCountdown: `${days > 0 ? `${days}d ` : ''}${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`,
      badgeLabel: 'Neuer Zyklus startet Donnerstag',
      subLabel: 'Offizieller Sieger auf der Landingpage präsentiert',
    };
  }
}
