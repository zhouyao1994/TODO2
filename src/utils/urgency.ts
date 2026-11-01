import type { TodoItem } from '../models/todo-item'
import { daysUntil } from './effective-date'
import { formatFollowupDay } from './followup'
import { t } from '../i18n'

/**
 * App-wide Urgent. A task is urgent when it is flagged urgent, or when its
 * due date falls within the "Due date makes a task urgent" range (overdue
 * included). The range is a day count from today (`0` = due today or
 * earlier) or `null` when the due date never makes a task urgent.
 *
 * Completed tasks are never urgent by date (an overdue date means nothing
 * once the task is done); a completed task keeps its flag.
 */

/** Days ahead a due date makes a task urgent; `null` = off. */
export type UrgentDueWithinDays = number | null

/** Default range: due within 3 days. */
export const DEFAULT_URGENT_DUE_WITHIN_DAYS = 3

/** The ranges Settings offers (Off · Today · 1 · 2 · 3 days · 1 · 2 weeks). */
export const URGENT_DUE_WITHIN_CHOICES: readonly UrgentDueWithinDays[] = [null, 0, 1, 2, 3, 7, 14]

/** Largest range accepted from storage / import. */
export const MAX_URGENT_DUE_WITHIN_DAYS = 365

/** Stored form of the Off choice in the settings row. */
export const URGENT_RANGE_OFF = 'off'

/** Settings row value → range; `undefined` when the value isn't valid. */
export function parseUrgentDueWithinDays(value: string): UrgentDueWithinDays | undefined {
  if (value === URGENT_RANGE_OFF) return null
  if (!/^\d{1,3}$/.test(value)) return undefined
  const n = Number(value)
  return n <= MAX_URGENT_DUE_WITHIN_DAYS ? n : undefined
}

/** Range → settings row value. */
export function formatUrgentDueWithinDays(range: UrgentDueWithinDays): string {
  return range == null ? URGENT_RANGE_OFF : String(range)
}

/** `Off`, `Today`, `1 day`, `3 days`, `1 week`, `2 weeks`. */
export function urgentRangeLabel(range: UrgentDueWithinDays): string {
  if (range == null) return t('ui.off')
  if (range === 0) return t('ui.today')
  if (range % 7 === 0) {
    const weeks = range / 7
    return weeks === 1 ? t('ui.weeks_count_one') : t('ui.weeks_count_many', { n: weeks })
  }
  return range === 1 ? t('ui.days_count_one') : t('ui.days_count_many', { n: range })
}

type UrgencyFields = Pick<TodoItem, 'urgent' | 'dueDate' | 'isCompleted'>

/** Whether the due date alone makes the task urgent (open tasks only). */
export function isUrgentByDate(todo: UrgencyFields, today: Date, range: UrgentDueWithinDays): boolean {
  if (range == null || todo.isCompleted) return false
  const days = daysUntil(todo.dueDate, today)
  return days != null && days <= range
}

/** Effective urgent: flagged urgent, or due within the range (overdue included). */
export function isEffectivelyUrgent(todo: UrgencyFields, today: Date, range: UrgentDueWithinDays): boolean {
  return todo.urgent === true || isUrgentByDate(todo, today, range)
}

/**
 * What a row shows in its Urgent slot: `flag` = the urgent mark (flagged,
 * whatever the date), `date` = the clock (urgent only by its due date),
 * `null` = nothing.
 */
export type UrgentMark = 'flag' | 'date' | null

export function urgentMark(todo: UrgencyFields, today: Date, range: UrgentDueWithinDays): UrgentMark {
  if (todo.urgent === true) return 'flag'
  return isUrgentByDate(todo, today, range) ? 'date' : null
}

/** `within 3 days` / `today` — the range in a sentence. */
function withinPhrase(range: number): string {
  if (range === 0) return t('ui.rel_today')
  return range === 1 ? t('ui.within_days_one', { n: range }) : t('ui.within_days_many', { n: range })
}

/**
 * The second tooltip line for a task urgent by date: `Due Tue 13, within 3
 * days.` / `Due today.` / `Overdue (Thu 8), so it counts as urgent.`
 * Empty when the task isn't urgent by date.
 */
export function urgentByDateReason(todo: UrgencyFields, today: Date, range: UrgentDueWithinDays): string {
  if (!isUrgentByDate(todo, today, range) || !todo.dueDate || range == null) return ''
  const days = daysUntil(todo.dueDate, today) ?? 0
  const day = formatFollowupDay(todo.dueDate, today)
  if (days < 0) return t('ui.urgent_overdue_reason', { day })
  if (days === 0) return t('ui.urgent_due_today_reason')
  return t('ui.urgent_due_within_reason', { day, within: withinPhrase(range) })
}

/**
 * Why a task's due date keeps it urgent, as a refused drop says it: `Plan
 * is overdue (Thu 8), so it counts as urgent.` / `… is due today, so …` /
 * `… is due Tue 13, within 3 days, so …`. Empty when the task isn't urgent
 * by date.
 */
export function urgentByDateSentence(
  todo: UrgencyFields & { title: string },
  today: Date,
  range: UrgentDueWithinDays,
): string {
  if (!isUrgentByDate(todo, today, range) || !todo.dueDate || range == null) return ''
  const days = daysUntil(todo.dueDate, today) ?? 0
  const day = formatFollowupDay(todo.dueDate, today)
  if (days < 0) return t('ui.urgent_overdue_sentence', { title: todo.title, day })
  if (days === 0) return t('ui.urgent_due_today_sentence', { title: todo.title })
  return t('ui.urgent_due_within_sentence', { title: todo.title, day, within: withinPhrase(range) })
}

/** What a refused drop suggests for a task kept urgent by its due date. */
export function urgentByDateHint(many = false): string {
  return many ? t('ui.urgent_date_hint_many') : t('ui.urgent_date_hint')
}

/** `today` / `Tue 13` / `overdue (Thu 8)` — the due date in a sentence. */
export function dueDatePhrase(dueDate: Date, today: Date): string {
  const days = daysUntil(dueDate, today) ?? 0
  const day = formatFollowupDay(dueDate, today)
  if (days < 0) return t('ui.due_overdue_phrase', { day })
  if (days === 0) return t('ui.rel_today')
  return day
}

/**
 * The Urgent toggles' hint (the editor's, and the task menu's / bulk bar's /
 * marker gutter's Urgent item). The toggles show and flip the flag only; a
 * due date that makes a task urgent is said here, not shown as pressed. One
 * task: `Urgent by due date — due Tue 13. Click to flag it urgent too.`
 * (unflagged) / `Its due date keeps it urgent even unflagged — due Tue 13.`
 * (flagged). Several: `2 of 3 tasks are urgent by their due dates, flagged or
 * not.` Empty when no task is urgent by its due date.
 */
export function urgentToggleHint(targets: readonly UrgencyFields[], today: Date, range: UrgentDueWithinDays): string {
  const byDate = targets.filter((t) => isUrgentByDate(t, today, range))
  const only = targets.length === 1 ? byDate[0] : undefined
  if (only?.dueDate) {
    const days = daysUntil(only.dueDate, today) ?? 0
    const dated = dueDatePhrase(only.dueDate, today)
    const phrase = days < 0 ? dated : t('ui.due_phrase', { day: dated })
    return only.urgent === true
      ? t('ui.urgent_hint_flagged', { phrase })
      : t('ui.urgent_hint_unflagged', { phrase })
  }
  const k = byDate.length
  if (k === 0 || targets.length < 2) return ''
  return k === 1
    ? t('ui.urgent_hint_multi_one', { total: targets.length })
    : t('ui.urgent_hint_multi_many', { k, total: targets.length })
}
