/**
 * Overdue-reminder cadence.
 *
 * Two gates decide whether a reminder leaves:
 *
 *  1. THRESHOLD — how far past the due date the invoice is. Stage n+1 becomes
 *     reachable at `REMINDER_STAGES[n]` days overdue.
 *  2. COOLDOWN  — once at least one reminder has gone out, the next one may not
 *     leave until the previous one is a full 7 days (168 h) old.
 *
 * The cooldown is what the ladder used to be missing. Thresholds alone are
 * "days overdue", so an invoice that is already deep into the ladder when it is
 * first picked up (client email added on day 20, for example) satisfied stage 1,
 * 2 and 3 on three consecutive runs. Reminders 2 and 3 are now additionally
 * gated on `last_reminder_sent_at`.
 *
 * The same rule is applied twice: as `REMINDER_ELIGIBILITY_SQL` in the cron's
 * SELECT (so blocked rows are never even loaded) and again in
 * `evaluateReminder` (so a query edit, a fixture row, or a hand-run can't skip
 * the guard). Both layers read the constants below.
 */

const DAY_MS = 86_400_000;

/** Earliest days-overdue point at which reminder n+1 becomes reachable. */
export const REMINDER_STAGES = [1, 7, 14] as const;

/** Reminders 1..3 exist; a fourth is never sent. */
export const MAX_REMINDERS = REMINDER_STAGES.length;

/** Minimum gap between two consecutive reminders, in days. */
export const COOLDOWN_DAYS = 7;

/** Minimum gap between two consecutive reminders, in milliseconds (168 h). */
export const COOLDOWN_MS = COOLDOWN_DAYS * DAY_MS;

export type ReminderReason =
  | "eligible"
  | "complete"
  | "not-due"
  | "cooldown"
  | "missing-last-reminder";

export type ReminderState = {
  /** Invoice due date — ISO date (`2026-11-10`), ISO timestamp, or Date. */
  dueDate: string | Date;
  /** How many reminders have already been sent (0..3). */
  reminderCount: number | null | undefined;
  /** When the last reminder was sent; required once `reminderCount > 0`. */
  lastReminderSentAt: string | Date | null | undefined;
};

export type ReminderEligibility = {
  eligible: boolean;
  /** 1-based reminder number this run would send (1..3), or null when exhausted. */
  stage: number | null;
  /** Days overdue required to reach that stage (1 / 7 / 14). */
  threshold: number | null;
  daysOverdue: number;
  /** Whole 24 h periods since the previous reminder; null when none was sent. */
  daysSinceLastReminder: number | null;
  reason: ReminderReason;
};

function toDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value);
}

function wholeDays(ms: number): number {
  return Math.floor(ms / DAY_MS);
}

/**
 * Pure eligibility decision for one invoice at one instant.
 *
 *   reminderCount 0 -> eligible once daysOverdue >= 1
 *   reminderCount 1 -> eligible once daysOverdue >= 7  AND gap >= 7 days
 *   reminderCount 2 -> eligible once daysOverdue >= 14 AND gap >= 7 days
 *   reminderCount 3 -> never eligible
 */
export function evaluateReminder(state: ReminderState, now: Date = new Date()): ReminderEligibility {
  const nowMs = now.getTime();
  const daysOverdue = wholeDays(nowMs - toDate(state.dueDate).getTime());

  const reminderCount = Math.max(0, Math.trunc(state.reminderCount ?? 0));
  const lastSent = state.lastReminderSentAt ? toDate(state.lastReminderSentAt) : null;
  const elapsedSinceLast = lastSent ? nowMs - lastSent.getTime() : null;
  const daysSinceLastReminder = elapsedSinceLast === null ? null : wholeDays(elapsedSinceLast);

  if (reminderCount >= MAX_REMINDERS) {
    return { eligible: false, stage: null, threshold: null, daysOverdue, daysSinceLastReminder, reason: "complete" };
  }

  const stage = reminderCount + 1;
  const threshold = REMINDER_STAGES[reminderCount];

  if (daysOverdue < threshold) {
    return { eligible: false, stage, threshold, daysOverdue, daysSinceLastReminder, reason: "not-due" };
  }

  if (reminderCount > 0) {
    // A nonzero count with no timestamp is corrupt state: the 7-day gap cannot
    // be proven, so the safe read is "not yet". Repair with
    // `update invoices set last_reminder_sent_at = now() where reminder_count > 0 and last_reminder_sent_at is null;`
    if (elapsedSinceLast === null) {
      return { eligible: false, stage, threshold, daysOverdue, daysSinceLastReminder, reason: "missing-last-reminder" };
    }
    // Negative elapsed (a timestamp in the future, i.e. clock skew) also fails here.
    if (elapsedSinceLast < COOLDOWN_MS) {
      return { eligible: false, stage, threshold, daysOverdue, daysSinceLastReminder, reason: "cooldown" };
    }
  }

  return { eligible: true, stage, threshold, daysOverdue, daysSinceLastReminder, reason: "eligible" };
}

/**
 * SQL twin of `evaluateReminder`, spliced into the cron SELECT. Kept as one
 * exported constant so the two layers can never drift: the numbers below are
 * the same `MAX_REMINDERS` / `COOLDOWN_DAYS` the TypeScript reads.
 */
export const REMINDER_ELIGIBILITY_SQL = `(
          i.reminder_count < ${MAX_REMINDERS}
          and (
            i.reminder_count = 0
            or (
              i.last_reminder_sent_at is not null
              and i.last_reminder_sent_at <= now() - interval '${COOLDOWN_DAYS} days'
            )
          )
        )`;
