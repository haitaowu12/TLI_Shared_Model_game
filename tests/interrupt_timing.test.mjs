import { test } from "node:test";
import assert from "node:assert";

test("calculateInjectionSchedule uses fixed times in training mode", () => {
  const injections = [
    { at_s: 30, window: 10, from: "ops_d", line: "Test 1" },
    { at_s: 60, window: 10, from: "comms_i", line: "Test 2" },
    { at_s: 90, window: 10, from: "finance_c", line: "Test 3" },
  ];

  const schedule = calculateInjectionSchedule(injections, 120, true);

  assert.strictEqual(schedule.length, 3);
  assert.strictEqual(schedule[0].randomizedTime, 30);
  assert.strictEqual(schedule[1].randomizedTime, 60);
  assert.strictEqual(schedule[2].randomizedTime, 90);
});

test("calculateInjectionSchedule randomizes times in non-training mode", () => {
  const injections = [
    { at_s: 30, window: 10, from: "ops_d", line: "Test 1" },
    { at_s: 60, window: 10, from: "comms_i", line: "Test 2" },
    { at_s: 90, window: 10, from: "finance_c", line: "Test 3" },
  ];

  const schedule1 = calculateInjectionSchedule(injections, 120, false);
  const schedule2 = calculateInjectionSchedule(injections, 120, false);

  assert.strictEqual(schedule1.length, 3);
  assert.strictEqual(schedule2.length, 3);

  for (let i = 0; i < 3; i++) {
    assert.ok(
      schedule1[i].randomizedTime >= 20 && schedule1[i].randomizedTime <= 100,
      `Schedule1 injection ${i} time ${schedule1[i].randomizedTime} should be in valid range`
    );
    assert.ok(
      schedule2[i].randomizedTime >= 20 && schedule2[i].randomizedTime <= 100,
      `Schedule2 injection ${i} time ${schedule2[i].randomizedTime} should be in valid range`
    );
  }

  const times1 = schedule1.map((s) => s.randomizedTime);
  const times2 = schedule2.map((s) => s.randomizedTime);
  
  assert.ok(
    JSON.stringify(times1) !== JSON.stringify(times2),
    "Two different schedules should have different random times"
  );
});

test("calculateInjectionSchedule enforces minimum 20 second spacing", () => {
  const injections = [
    { at_s: 30, window: 10, from: "ops_d", line: "Test 1" },
    { at_s: 60, window: 10, from: "comms_i", line: "Test 2" },
    { at_s: 90, window: 10, from: "finance_c", line: "Test 3" },
  ];

  for (let i = 0; i < 10; i++) {
    const schedule = calculateInjectionSchedule(injections, 120, false);
    
    for (let j = 1; j < schedule.length; j++) {
      const spacing = schedule[j].randomizedTime - schedule[j - 1].randomizedTime;
      assert.ok(
        spacing >= 20,
        `Spacing between injections ${j - 1} and ${j} is ${spacing}s, should be >= 20s`
      );
    }
  }
});

test("calculateInjectionSchedule respects window property", () => {
  const injections = [
    { at_s: 30, window: 5, from: "ops_d", line: "Test 1" },
    { at_s: 60, window: 15, from: "comms_i", line: "Test 2" },
  ];

  for (let i = 0; i < 10; i++) {
    const schedule = calculateInjectionSchedule(injections, 120, false);
    
    assert.ok(
      schedule[0].randomizedTime >= 20 && schedule[0].randomizedTime <= 35,
      `First injection with window 5 should be between 20-35s, got ${schedule[0].randomizedTime}`
    );
    
    assert.ok(
      schedule[1].randomizedTime >= 45 && schedule[1].randomizedTime <= 75,
      `Second injection with window 15 should be between 45-75s, got ${schedule[1].randomizedTime}`
    );
  }
});

test("calculateInjectionSchedule handles missing window property with default", () => {
  const injections = [
    { at_s: 30, from: "ops_d", line: "Test 1" },
    { at_s: 60, window: 10, from: "comms_i", line: "Test 2" },
  ];

  const schedule = calculateInjectionSchedule(injections, 120, false);

  assert.strictEqual(schedule.length, 2);
  assert.ok(schedule[0].randomizedTime >= 20 && schedule[0].randomizedTime <= 40);
  assert.ok(schedule[1].randomizedTime >= 50 && schedule[1].randomizedTime <= 70);
});

function calculateInjectionSchedule(injections, roundDuration, isTraining) {
  if (isTraining) {
    return injections.map((inj) => ({
      ...inj,
      randomizedTime: inj.at_s,
    }));
  }

  const MIN_SPACING = 20;
  const schedule = [];
  let lastTime = 0;

  for (const inj of injections) {
    const windowSize = inj.window ?? 10;
    const minTime = Math.max(lastTime + MIN_SPACING, inj.at_s - windowSize);
    const maxTime = Math.min(roundDuration - 5, inj.at_s + windowSize);

    let randomizedTime;
    if (minTime >= maxTime) {
      randomizedTime = minTime;
    } else {
      randomizedTime = minTime + Math.random() * (maxTime - minTime);
    }

    schedule.push({
      ...inj,
      randomizedTime,
    });
    lastTime = randomizedTime;
  }

  return schedule;
}
