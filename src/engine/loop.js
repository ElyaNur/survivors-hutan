// Fixed-timestep loop. stepClock is pure (testable); startLoop wires it to rAF.
export function stepClock(acc, frameDt, step = 1 / 60, maxFrame = 0.1) {
  acc += Math.min(frameDt, maxFrame);
  let steps = 0;
  while (acc >= step - 1e-9) { acc -= step; steps++; } // epsilon: float drift must not drop a step
  return { steps, acc: Math.max(acc, 0) };
}

export function startLoop(update, draw) {
  let acc = 0, last = performance.now();
  function frame(now) {
    const dt = (now - last) / 1000; last = now;
    const r = stepClock(acc, dt); acc = r.acc;
    for (let i = 0; i < r.steps; i++) update(1 / 60);
    draw();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
