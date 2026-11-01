import type { CalendarView } from '../models/workspace-layout'
import type { WeekStart } from './effective-date'
import { locale, t } from '../i18n'
import { addDays, weekdayName } from './date'

/**
 * Calendar grid math: which days a month / week view shows, its toolbar
 * label, moving the offset between views, and how many entries fit a month
 * cell or a week row. Day arithmetic goes through local `new Date(y, m, d)` so DST days
 * never shift a date.
 */

export { addDays }

/** Midnight of the first day of the week containing `d`. */
export function weekStartOf(d: Date, weekStartsOn: WeekStart): Date {
  return addDays(d, -((d.getDay() - weekStartsOn + 7) % 7))
}

/** Widget widths (px) where the layout changes. */
export const CALENDAR_BREAKPOINTS = {
  /** Month view turns into the compact dot grid + day list below this. */
  compactMonth: 480,
  /** Week view shows rows below this, seven columns from it. */
  weekColumns: 560,
  /** The date-type toggles lose their labels below this. */
  toggleLabels: 620,
} as const

/** A month view always shows six weeks. */
export const MONTH_GRID_DAYS = 42

export interface CalendarRange {
  view: CalendarView
  /** The days shown, in order (42 in month view, 7 in week view). */
  days: Date[]
  /** Month view: the first of the shown month. Week view: the week's first day. */
  start: Date
}

/** The days a view shows at `offset` months / weeks from the one containing `today`. */
export function calendarRange(view: CalendarView, offset: number, today: Date, weekStartsOn: WeekStart): CalendarRange {
  if (view === 'month') {
    const start = new Date(today.getFullYear(), today.getMonth() + offset, 1)
    const first = weekStartOf(start, weekStartsOn)
    return { view, start, days: Array.from({ length: MONTH_GRID_DAYS }, (_, i) => addDays(first, i)) }
  }
  const start = addDays(weekStartOf(today, weekStartsOn), offset * 7)
  return { view, start, days: Array.from({ length: 7 }, (_, i) => addDays(start, i)) }
}

/** Weekday names in grid order (`Mon …` / `星期一 …`). */
export function weekdayLabels(weekStartsOn: WeekStart): string[] {
  const names = locale() === 'zh-CN'
    ? ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  return Array.from({ length: 7 }, (_, i) => names[(i + weekStartsOn) % 7] ?? '')
}

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const LONG_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export function shortMonth(d: Date): string {
  if (locale() === 'zh-CN') return `${d.getMonth() + 1}月`
  return SHORT_MONTHS[d.getMonth()] ?? ''
}

export function longMonth(d: Date): string {
  if (locale() === 'zh-CN') return `${d.getMonth() + 1}月`
  return LONG_MONTHS[d.getMonth()] ?? ''
}

/**
 * The toolbar label. Month: `October 2026` (`Oct 2026` when `short`). Week:
 * `Oct 5 – 11, 2026` / `Sep 28 – Oct 4, 2026`, without the year when
 * `short`; a week across New Year names both years.
 */
export function calendarRangeLabel(range: CalendarRange, short: boolean): string {
  const zh = locale() === 'zh-CN'
  if (range.view === 'month') {
    const month = `${range.start.getMonth() + 1}月`
    return zh ? `${range.start.getFullYear()}年${month}` : `${short ? shortMonth(range.start) : longMonth(range.start)} ${range.start.getFullYear()}`
  }
  const first = range.days[0] ?? range.start
  const last = range.days[range.days.length - 1] ?? range.start
  if (zh) {
    const from = `${first.getMonth() + 1}月${first.getDate()}日`
    const to = `${last.getMonth() + 1}月${last.getDate()}日`
    if (first.getFullYear() !== last.getFullYear()) return `${first.getFullYear()}年${from} – ${last.getFullYear()}年${to}`
    return first.getMonth() === last.getMonth() ? `${from} – ${last.getDate()}日` : `${from} – ${to}`
  }
  if (first.getFullYear() !== last.getFullYear()) {
    return short
      ? `${shortMonth(first)} ${first.getDate()} – ${shortMonth(last)} ${last.getDate()}`
      : `${shortMonth(first)} ${first.getDate()}, ${first.getFullYear()} – ${shortMonth(last)} ${last.getDate()}, ${last.getFullYear()}`
  }
  const span = first.getMonth() === last.getMonth()
    ? `${shortMonth(first)} ${first.getDate()} – ${last.getDate()}`
    : `${shortMonth(first)} ${first.getDate()} – ${shortMonth(last)} ${last.getDate()}`
  return short ? span : `${span}, ${first.getFullYear()}`
}

/** What an empty view is called in its note: `October` / `this week` / `the week of Oct 12`. */
export function calendarRangeName(range: CalendarRange, today: Date, weekStartsOn: WeekStart): string {
  if (range.view === 'month') {
    if (locale() === 'zh-CN') {
      const month = `${range.start.getMonth() + 1}月`
      return range.start.getFullYear() === today.getFullYear() ? month : `${range.start.getFullYear()}年${month}`
    }
    const name = longMonth(range.start)
    return range.start.getFullYear() === today.getFullYear() ? name : `${name} ${range.start.getFullYear()}`
  }
  if (range.start.getTime() === weekStartOf(today, weekStartsOn).getTime()) return t('ui.this_week')
  const day = locale() === 'zh-CN' ? `${range.start.getMonth() + 1}月${range.start.getDate()}日` : `${shortMonth(range.start)} ${range.start.getDate()}`
  return t('ui.week_of_range', { day })
}

/**
 * The offset in view `to` that keeps roughly the same dates in view as
 * `offset` in view `from`: a month becomes the week holding its first day; a
 * week becomes the month holding its middle day. Offset 0 stays 0.
 */
export function convertCalendarOffset(
  from: CalendarView,
  to: CalendarView,
  offset: number,
  today: Date,
  weekStartsOn: WeekStart,
): number {
  if (from === to || offset === 0) return from === to ? offset : 0
  if (from === 'month') {
    const target = weekStartOf(new Date(today.getFullYear(), today.getMonth() + offset, 1), weekStartsOn)
    const current = weekStartOf(today, weekStartsOn)
    return Math.round((target.getTime() - current.getTime()) / (7 * 86_400_000))
  }
  const mid = addDays(weekStartOf(today, weekStartsOn), offset * 7 + 3)
  return (mid.getFullYear() - today.getFullYear()) * 12 + mid.getMonth() - today.getMonth()
}

/** Month-cell geometry (px): padding top + bottom, day-number line, entry height, gap. */
export const MONTH_CELL = { padding: 4, number: 18, entry: 18, gap: 1 } as const

/**
 * How many 18px entries a month cell of `cellHeight` px fits; unbounded
 * before the cell is measured.
 */
export function monthCellFit(cellHeight: number): number {
  if (!(cellHeight > 0)) return Number.POSITIVE_INFINITY
  return Math.max(0, Math.floor((cellHeight - MONTH_CELL.padding - MONTH_CELL.number) / (MONTH_CELL.entry + MONTH_CELL.gap)))
}

/**
 * How many of a day's `count` entries a month cell or week row shows and how
 * many go behind `+N more`: all when they fit, else `fit − 1` entries and the
 * more button in the last slot.
 */
export function dayOverflow(count: number, fit: number): { shown: number; more: number } {
  if (count <= fit) return { shown: count, more: 0 }
  const shown = Math.max(0, fit - 1)
  return { shown, more: count - shown }
}

/**
 * Week-rows geometry (px): the container's padding (each side) and row gap;
 * a row's vertical padding (both sides), minimum height and date block; the
 * 24px entry and the gap between entries.
 */
export const WEEK_ROWS = { padding: 6, gap: 2, rowPadding: 12, rowMin: 40, dateBlock: 28, entry: 24, entryGap: 2 } as const

/** Height of a week row whose entry column holds `slots` 24px slots (an empty day's `—` takes one). */
function weekRowHeight(slots: number): number {
  const n = Math.max(1, slots)
  const content = Math.max(WEEK_ROWS.dateBlock, n * WEEK_ROWS.entry + (n - 1) * WEEK_ROWS.entryGap)
  return Math.max(WEEK_ROWS.rowMin, WEEK_ROWS.rowPadding + content)
}

/**
 * The most entry slots a week row may use so the seven rows fit a container
 * `height` px tall, given each day's entry count. Unbounded when every day
 * fits (or before the container is measured); otherwise the same cap for
 * every row — the largest that fits, so a busy day keeps as many entries as
 * the quieter days leave room for — and at least 1 (rows at their minimum
 * height then scroll). A row over the cap shows `cap − 1` entries and
 * `+N more` (`dayOverflow`).
 */
export function weekRowsFit(height: number, counts: readonly number[]): number {
  if (!(height > 0)) return Number.POSITIVE_INFINITY
  const available = height - WEEK_ROWS.padding * 2 - WEEK_ROWS.gap * Math.max(0, counts.length - 1)
  const total = (cap: number) => counts.reduce((sum, c) => sum + weekRowHeight(Math.min(c, cap)), 0)
  if (total(Number.POSITIVE_INFINITY) <= available) return Number.POSITIVE_INFINITY
  for (let cap = Math.max(...counts) - 1; cap > 1; cap--) {
    if (total(cap) <= available) return cap
  }
  return 1
}

/** `Thu 15 Oct` / `10月15日 星期四`. */
export function dayLabel(d: Date): string {
  if (locale() === 'zh-CN') return `${shortMonth(d)}${d.getDate()}日 ${weekdayName(d)}`
  const wd = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()] ?? ''
  return `${wd} ${d.getDate()} ${shortMonth(d)}`
}

/** `Thu 15` / `星期四 15日` — a date near today, as the drop chooser's "was …" hint shows it. */
export function shortDayLabel(d: Date): string {
  if (locale() === 'zh-CN') return `${weekdayName(d)} ${d.getDate()}日`
  const wd = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()] ?? ''
  return `${wd} ${d.getDate()}`
}
