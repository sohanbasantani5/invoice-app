import { describe, expect, it } from "vitest";
import {
  COOLDOWN_DAYS,
  COOLDOWN_MS,
  MAX_REMINDERS,
  REMINDER_ELIGIBILITY_SQL,
  REMINDER_STAGES,
  evaluateReminder,
} from "@/lib/email/reminder-cadence";

const DAY = 86_400_000;

type Sent = { day: number; stage: number; daysOverdue: number; daysSinceLast: number | null };
type Blocked = { day: number; reason: string };

/**
 * Replays the cron once per calendar day: evaluate, then apply the exact state
 * transition the route applies on a successful send (count + 1, timestamp =
 * now). Days are offsets from the due date, so `startDay` is the first day the
 * invoice is picked up (client email added / auto-remind turned on).
 */
function replayCadence(dueDate: Date, startDay: number, endDay: number) {
  const state = { reminderCount: 0, lastReminderSentAt: null as Date | null };
  const sent: Sent[] = [];
  const blocked: Blocked[] = [];

  for (let day = startDay; day <= endDay; day++) {
    const now = new Date(dueDate.getTime() + day * DAY);
    const decision = evaluateReminder(
      {
        dueDate,
        reminderCount: state.reminderCount,
        lastReminderSentAt: state.lastReminderSentAt,
      },
      now
    );

    if (decision.eligible) {
      sent.push({
        day,
        stage: decision.stage as number,
        daysOverdue: decision.daysOverdue,
        daysSinceLast: decision.daysSinceLastReminder,
      });
      state.reminderCount += 1;
      state.lastReminderSentAt = now;
    } else {
      blocked.push({ day, reason: decision.reason });
    }
  }

  return { sent, blocked, state };
}

const blockedDays = (blocked: Blocked[], reason: string) =>
  blocked.filter((b) => b.reason === reason).map((b) => b.day);

describe("overdue-reminder cadence", () => {
  it("enforces a 7-day cooldown for an invoice picked up on day 15", () => {
    // The production case: INV/2026-27/014 was already 15 days overdue when its
    // client email landed, so every threshold (1, 7, 14) was satisfied at once.
    const dueDate = new Date("2026-11-01T00:00:00Z");
    const { sent, blocked, state } = replayCadence(dueDate, 15, 45);

    // Exactly three sends, seven days apart.
    expect(sent).toEqual([
      { day: 15, stage: 1, daysOverdue: 15, daysSinceLast: null },
      { day: 22, stage: 2, daysOverdue: 22, daysSinceLast: 7 },
      { day: 29, stage: 3, daysOverdue: 29, daysSinceLast: 7 },
    ]);

    // Days 16-21: threshold for stage 2 (>= 7 days overdue) is already met, so
    // only the cooldown can be holding it back.
    expect(blockedDays(blocked, "cooldown")).toEqual([
      16, 17, 18, 19, 20, 21, 23, 24, 25, 26, 27, 28,
    ]);

    // Never a fourth reminder, no matter how overdue it gets.
    expect(blockedDays(blocked, "complete")).toEqual(Array.from({ length: 16 }, (_, i) => 30 + i));
    expect(state.reminderCount).toBe(3);
  });

  it("blocks the exact three-days-in-a-row regression", () => {
    // Before the fix: days 15, 16, 17 all fired (thresholds 1, 7, 14 were
    // already passed). Now day 16 and 17 must be cooldown blocks.
    const dueDate = new Date("2026-11-01T00:00:00Z");
    const day = (n: number) => new Date(dueDate.getTime() + n * DAY);

    const first = evaluateReminder(
      { dueDate, reminderCount: 0, lastReminderSentAt: null },
      day(15)
    );
    expect(first).toMatchObject({ eligible: true, stage: 1, daysOverdue: 15 });

    const lastSent = day(15);
    const day16 = evaluateReminder(
      { dueDate, reminderCount: 1, lastReminderSentAt: lastSent },
      day(16)
    );
    expect(day16).toMatchObject({ eligible: false, stage: 2, reason: "cooldown", daysSinceLastReminder: 1 });

    // Even a count that jumped ahead (corrupt/late data) is held by the gap.
    const day17 = evaluateReminder(
      { dueDate, reminderCount: 2, lastReminderSentAt: lastSent },
      day(17)
    );
    expect(day17).toMatchObject({ eligible: false, stage: 3, reason: "cooldown", daysSinceLastReminder: 2 });
  });

  it("treats 168 h as the boundary: 6d 23h 59m 59s is blocked, 7d exactly sends", () => {
    const dueDate = new Date("2026-11-01T00:00:00Z");
    const now = new Date("2026-11-25T00:00:00Z");

    const justShort = evaluateReminder(
      { dueDate, reminderCount: 1, lastReminderSentAt: new Date(now.getTime() - COOLDOWN_MS + 1000) },
      now
    );
    expect(justShort.eligible).toBe(false);
    expect(justShort.reason).toBe("cooldown");
    expect(justShort.daysSinceLastReminder).toBe(6);

    const exactly = evaluateReminder(
      { dueDate, reminderCount: 1, lastReminderSentAt: new Date(now.getTime() - COOLDOWN_MS) },
      now
    );
    expect(exactly.eligible).toBe(true);
    expect(exactly.stage).toBe(2);
    expect(exactly.daysSinceLastReminder).toBe(7);
  });

  it("keeps the days-overdue threshold alongside the cooldown (AND, not OR)", () => {
    const dueDate = new Date("2026-11-01T00:00:00Z");
    // Gap is satisfied (10 days) but stage 2 still needs 7 days overdue.
    const early = evaluateReminder(
      { dueDate, reminderCount: 1, lastReminderSentAt: new Date(dueDate.getTime() + 1 * DAY) },
      new Date(dueDate.getTime() + 3 * DAY)
    );
    expect(early).toMatchObject({
      eligible: false,
      stage: 2,
      threshold: 7,
      reason: "not-due",
      daysOverdue: 3,
    });

    // Long overdue, recent send -> cooldown wins.
    const recent = evaluateReminder(
      { dueDate, reminderCount: 1, lastReminderSentAt: new Date(dueDate.getTime() + 28 * DAY) },
      new Date(dueDate.getTime() + 30 * DAY)
    );
    expect(recent).toMatchObject({
      eligible: false,
      stage: 2,
      threshold: 7,
      reason: "cooldown",
      daysOverdue: 30,
    });
  });

  it("never sends a fourth reminder", () => {
    const dueDate = new Date("2026-01-01T00:00:00Z");
    const ancient = new Date("2025-06-01T00:00:00Z");
    const decision = evaluateReminder(
      { dueDate, reminderCount: 3, lastReminderSentAt: ancient },
      new Date("2027-01-01T00:00:00Z")
    );
    expect(decision).toMatchObject({ eligible: false, stage: null, reason: "complete" });
    expect(decision.daysOverdue).toBeGreaterThan(300);
  });

  it("refuses to guess when reminder_count > 0 but the timestamp is missing", () => {
    const decision = evaluateReminder(
      { dueDate: "2026-11-01", reminderCount: 1, lastReminderSentAt: null },
      new Date("2026-11-30T00:00:00Z")
    );
    expect(decision).toMatchObject({
      eligible: false,
      stage: 2,
      threshold: 7,
      reason: "missing-last-reminder",
    });
  });

  it("blocks a last_reminder_sent_at in the future (clock skew)", () => {
    const now = new Date("2026-11-20T00:00:00Z");
    const decision = evaluateReminder(
      { dueDate: "2026-11-01", reminderCount: 1, lastReminderSentAt: new Date("2026-11-25T00:00:00Z") },
      now
    );
    expect(decision.eligible).toBe(false);
    expect(decision.reason).toBe("cooldown");
    expect(decision.daysSinceLastReminder).toBeLessThan(0);
  });

  it("keeps the SQL gate in lockstep with the TypeScript gate", () => {
    expect(MAX_REMINDERS).toBe(3);
    expect(REMINDER_STAGES).toEqual([1, 7, 14]);
    expect(COOLDOWN_DAYS).toBe(7);

    // Both layers must encode the same numbers; a change here without the lib
    // changing is a drift bug.
    expect(REMINDER_ELIGIBILITY_SQL).toContain(`i.reminder_count < ${MAX_REMINDERS}`);
    expect(REMINDER_ELIGIBILITY_SQL).toContain("i.reminder_count = 0");
    expect(REMINDER_ELIGIBILITY_SQL).toContain(`interval '${COOLDOWN_DAYS} days'`);
    expect(REMINDER_ELIGIBILITY_SQL).toContain("i.last_reminder_sent_at is not null");
  });
});
