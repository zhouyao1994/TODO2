import type { MarkerKey, MarkerSet } from '../../../models'
import type { DashboardTrendRange } from '../../../models/dashboard-config'
import type { TileStats } from '../../../services/stats/tiles'
import { formatFollowupDate, formatFollowupDay } from '../../../utils/followup'
import { weekdayName } from '../../../utils/date'
import { addDays } from '../../../utils/calendar-grid'
import { lineMarkers, type HotRule } from '../../../utils/hot'
import { urgentRangeLabel, type UrgentDueWithinDays } from '../../../utils/urgency'
import { locale, t } from '../../../i18n'

/**
 * The dashboard's words: tile sub-lines, the Hot rule in words, counts as
 * `shown of total`, range labels. Pure, so the copy is testable on its own.
 */

/** `5`, or `5 of 19` when the screen filter hides some. */
export function countOf(shown: number, total: number): string {
  return shown === total ? String(shown) : t('ui.count_of', { a: shown, b: total })
}

/** `+3` / `−2` / `0`. */
export function signed(n: number): string {
  if (n > 0) return `+${n}`
  if (n < 0) return `−${-n}`
  return '0'
}

const RANGE_WORDS: Record<DashboardTrendRange, 'ui.range_words_14d' | 'ui.range_words_4w' | 'ui.range_words_12w'> = {
  '14d': 'ui.range_words_14d',
  '4w': 'ui.range_words_4w',
  '12w': 'ui.range_words_12w',
}

const RANGE_LABEL: Record<DashboardTrendRange, 'ui.range_label_14d' | 'ui.range_label_4w' | 'ui.range_label_12w'> = {
  '14d': 'ui.range_label_14d',
  '4w': 'ui.range_label_4w',
  '12w': 'ui.range_label_12w',
}

/** `the last 14 days` — the range inside a sentence. */
export function trendRangeWords(range: DashboardTrendRange): string {
  return t(RANGE_WORDS[range])
}

/** `Last 14 days` — the Created vs completed header. */
export function trendRangeLabel(range: DashboardTrendRange): string {
  return t(RANGE_LABEL[range])
}

/** One marker as a line part: `urgent`, `important`, `Focus`. */
function markerWord(k: MarkerKey): string {
  return k === 'focus' ? t('ui.focus') : k === 'urgent' ? t('ui.flag_urgent') : t('ui.flag_important')
}

/** A Hot rule line, short: `urgent + important`, `Focus`. */
export function hotLineLabel(line: MarkerSet): string {
  return lineMarkers(line).map(markerWord).join(' + ')
}

/**
 * The Hot rule in words, for the Hot section: `Urgent and important, or in
 * Focus`. A Focus-only line reads `in Focus`.
 */
export function hotRuleInWords(rule: HotRule): string {
  const lines = rule.map((line) => {
    const keys = lineMarkers(line)
    if (keys.length === 1 && keys[0] === 'focus') return t('ui.in_focus_words')
    return keys.map(markerWord).join(t('ui.and_join'))
  }).filter((s) => s !== '')
  const text = lines.join(t('ui.or_join_words'))
  return locale() === 'zh-CN' ? text : text.charAt(0).toUpperCase() + text.slice(1)
}

const MARKER_SHORT: Record<MarkerKey, string> = { urgent: 'U', important: 'I', focus: 'F' }
const MARKER_NAME: Record<MarkerKey, 'ui.urgent' | 'ui.important' | 'ui.focus'> = { urgent: 'ui.urgent', important: 'ui.important', focus: 'ui.focus' }

/**
 * The Hot rule at a glance, for the tab menu's `Hot is` item: `U+I or Focus`
 * (a one-marker line names it; a longer line uses initials).
 */
export function hotRuleShort(rule: HotRule): string {
  return rule.map((line) => {
    const keys = lineMarkers(line)
    const only = keys.length === 1 ? keys[0] : undefined
    return only ? t(MARKER_NAME[only]) : keys.map((k) => MARKER_SHORT[k]).join('+')
  }).filter((s) => s !== '').join(t('ui.or_binary'))
}

/** What a tile's sub-line needs beyond its own stats. */
export interface TileCopyContext {
  today: Date
  /** The trend's net change over its range (Open). */
  trendNet: number | null
  trendRange: DashboardTrendRange
}

/** The sub-line under a tile's count. Empty = none. */
export function tileSubLine(id: keyof TileStats, tiles: TileStats, ctx: TileCopyContext): string {
  switch (id) {
    case 'open': {
      if (ctx.trendNet == null) return ''
      return ctx.trendNet === 0 ? t('ui.no_change_in', { range: trendRangeWords(ctx.trendRange) }) : t('ui.trend_in', { n: signed(ctx.trendNet), range: trendRangeWords(ctx.trendRange) })
    }
    case 'hot': {
      const parts = tiles.hot.lines.filter((l) => l.ids.length > 0)
      if (parts.length === 0) return t('ui.nothing_hot_right_now')
      const only = parts.length === 1 ? parts[0] : undefined
      if (only && hotLineLabel(only.line) === t('ui.focus')) return t('ui.n_in_focus', { n: only.ids.length })
      return parts.map((l) => t('ui.tile_hot_part', { n: l.ids.length, line: hotLineLabel(l.line) })).join(' · ')
    }
    case 'urgent': {
      const { flagged, byDate } = tiles.urgent
      const parts: string[] = []
      if (flagged > 0) parts.push(t('ui.n_flagged', { n: flagged }))
      if (byDate > 0) parts.push(t('ui.n_by_due', { n: byDate }))
      return parts.length > 0 ? parts.join(' · ') : t('ui.nothing_urgent')
    }
    case 'overdue': {
      const { oldest, oldestDaysLate } = tiles.overdue
      if (!oldest) return t('ui.nothing_overdue')
      return t('ui.oldest_line', { day: formatFollowupDay(oldest, ctx.today), n: oldestDaysLate })
    }
    case 'followupDue': {
      const { late, today, upcoming } = tiles.followupDue
      if (late > 0 && upcoming > 0) return t('ui.late_more', { late, upcoming })
      if (late > 0) return today > 0 ? t('ui.late_today', { late, today }) : t('ui.late_only', { late })
      if (upcoming > 0) return t('ui.upcoming7', { n: upcoming })
      return today > 0 ? t('ui.all_due_today') : t('ui.nothing_due')
    }
    case 'focus': {
      const n = tiles.focus.dueToday
      return n > 0 ? t('ui.n_due_today', { n }) : t('ui.none_due_today')
    }
    case 'dueToday': {
      const n = tiles.dueToday.upcoming
      return n > 0 ? t('ui.upcoming7', { n }) : t('ui.none_next7')
    }
    case 'dueNext7':
    case 'noFollowup':
      return ''
  }
}

/** `open since Sun 27 Sep` — the trend's stats row. */
export function sinceLabel(start: Date, today: Date): string {
  return t('ui.open_since', { date: formatFollowupDate(start, today) })
}

/** A trend bar's label: the day number (daily) or `Sep 28` (weekly). */
export function trendBucketLabel(start: Date, granularity: 'day' | 'week'): string {
  if (granularity === 'day') return String(start.getDate())
  return start.toLocaleDateString(locale(), { month: 'short', day: 'numeric' })
}

/** A Next 7 days column's labels: `Late` / `–`, `Today` / `10`, `Sun` / `11`. */
export function nextDayLabels(date: Date | null, index: number): [string, string] {
  if (date == null) return [t('ui.late_col'), '–']
  if (index === 1) return [t('ui.today_col'), String(date.getDate())]
  return [weekdayName(date), String(date.getDate())]
}

// ── The task dialog's words ──────────────────────────────────────────────────

const settingsNote = (): string => t('ui.settings_note')

/** What a tile's dialog needs to say what the tile counts. */
export interface TileDescriptionContext {
  today: Date
  urgentRange: UrgentDueWithinDays
  hotRule: HotRule
}

/**
 * What a built-in tile counts, in words — the task dialog's line under its
 * title: `Hot = urgent and important, or in Focus (Settings › Tasks).`
 */
export function tileDescription(id: keyof TileStats, ctx: TileDescriptionContext): string {
  switch (id) {
    case 'open':
      return t('ui.desc_open')
    case 'hot': {
      const words = hotRuleInWords(ctx.hotRule)
      const lowered = locale() === 'zh-CN' ? words : `${words.charAt(0).toLowerCase()}${words.slice(1)}`
      return t('ui.desc_hot', { words: lowered, note: settingsNote() })
    }
    case 'urgent':
      if (ctx.urgentRange == null) return t('ui.desc_urgent_flags', { note: settingsNote() })
      if (ctx.urgentRange === 0) return t('ui.desc_urgent_today', { note: settingsNote() })
      return t('ui.desc_urgent_range', { range: urgentRangeLabel(ctx.urgentRange), note: settingsNote() })
    case 'overdue':
      return t('ui.desc_overdue')
    case 'followupDue':
      return t('ui.desc_followup_due')
    case 'focus':
      return t('ui.desc_focus')
    case 'dueToday':
      return t('ui.desc_due_today')
    case 'dueNext7':
      return t('ui.desc_due_next7', { day: formatFollowupDay(addDays(ctx.today, 6), ctx.today) })
    case 'noFollowup':
      return t('ui.desc_no_followup')
  }
}

/** What a tile counts, in a few words — the Customize dialog's line beside it. */
export function tileCatalogHint(id: keyof TileStats, ctx: { today: Date; urgentRange: UrgentDueWithinDays }): string {
  switch (id) {
    case 'open': return t('ui.hint_open')
    case 'hot': return t('ui.hint_hot')
    case 'urgent':
      if (ctx.urgentRange == null) return t('ui.hint_urgent_flags')
      if (ctx.urgentRange === 0) return t('ui.hint_urgent_today')
      return t('ui.hint_urgent_range', { range: urgentRangeLabel(ctx.urgentRange) })
    case 'overdue': return t('ui.hint_overdue')
    case 'followupDue': return t('ui.hint_followup')
    case 'focus': return t('ui.hint_focus')
    case 'dueToday': return t('ui.hint_due_today')
    case 'dueNext7': return t('ui.hint_due_next7', { day: formatFollowupDay(addDays(ctx.today, 6), ctx.today) })
    case 'noFollowup': return t('ui.hint_no_followup')
  }
}

/** The Stale tasks header: `Not changed in 14 days or more · oldest 39 days`. */
export function staleSubLine(days: number, oldestDays: number | null): string {
  const base = t('ui.stale_base', { n: days })
  return oldestDays == null ? base : t('ui.stale_oldest', { base, n: oldestDays })
}

/** A dialog line under the top-bar filter: it counts only what the filter shows. */
export function withScreenNote(description: string): string {
  return t('ui.screen_note', { description })
}

/** A Next 7 days column's dialog: title and line. `index` 0 = Late, 1 = today. */
export function nextDayDialogWords(date: Date | null, index: number, today: Date): { title: string; description: string } {
  if (date == null) return { title: t('ui.late_dialog_title'), description: t('ui.late_dialog_desc') }
  if (index === 1) return { title: t('ui.today_col'), description: t('ui.today_dialog_desc') }
  const day = formatFollowupDay(date, today)
  return { title: day, description: t('ui.day_dialog_desc', { day }) }
}

/** A trend bar's dialog: title and line (`Thu 8`, or `Week of Sep 28`). */
export function trendBucketDialogWords(start: Date, granularity: 'day' | 'week', today: Date): { title: string; description: string } {
  if (granularity === 'day') {
    const day = formatFollowupDay(start, today)
    return { title: day, description: t('ui.day_tasks_desc', { day }) }
  }
  const week = t('ui.week_of', { week: trendBucketLabel(start, 'week') })
  return { title: week, description: t('ui.week_tasks_desc', { week: trendBucketLabel(start, 'week') }) }
}
