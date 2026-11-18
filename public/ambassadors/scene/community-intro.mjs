const clamp = value => Math.max(0,Math.min(1,value));
const ease = value => value < 0.5 ? 4 * value ** 3 : 1 - (-2 * value + 2) ** 3 / 2;
const bump = (time,start,duration) => time < start || time > start + duration ? 0 : Math.sin(Math.PI * (time-start) / duration) ** 2;

export const communityArrivalDuration = 5.35;
const loopStart = 6;
const cycleDuration = 4.2;

// The heart stays anchored to its final city point throughout the entrance.
// Only scale and local rotation change; each heartbeat returns to that pose.
export function communityArrivalMotion(elapsed,loop = false) {
  const progress = clamp((elapsed-2.65)/1.05);
  const remaining = (1-progress) ** 3;
  const back = progress-1;
  const result = {
    turn:ease(clamp((elapsed-0.25)/2.6)),
    heart:elapsed < 2.65 ? 0 : 1 + 2.4 * back ** 3 + 1.4 * back ** 2,
    angle:-0.65 * remaining + 0.07 * Math.sin(Math.PI * progress) ** 2,
    radius:-0.2 + (Math.PI+0.4) * clamp((elapsed-3.45)/1.9),
    floor:0.18,
    phase:elapsed < 2.65 ? 'rotating' : elapsed < 3.45 ? 'heart' : 'wave',
    cycle:-1,
  };
  if (loop && elapsed >= loopStart) {
    const time = (elapsed-loopStart) % cycleDuration;
    result.heart = 1 + 0.055 * bump(time,0,0.3) + 0.028 * bump(time,0.32,0.24);
    result.radius = -0.2 + (Math.PI+0.4) * clamp((time-0.16)/1.9);
    result.floor = 1;
    result.phase = 'looping';
    result.cycle = Math.floor((elapsed-loopStart)/cycleDuration);
  }
  return result;
}
