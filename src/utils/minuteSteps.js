// The values a minutes stepper offers: 1 at a time up to 10, then 5 at a
// time, up to max (which is offered even off the 5s, e.g. 99)
export const minuteSteps = (max) => {
  const steps = Array.from({ length: Math.min(max, 10) }, (_, i) => i + 1);
  for (let n = 15; n < max; n += 5) steps.push(n);
  if (max > 10) steps.push(max);
  return steps;
};
