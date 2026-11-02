import { useMemo, type CSSProperties, type ReactNode } from 'react'
import type { PersistedTodoItem } from '../../../models'
import {
  DEFAULT_DASHBOARD_LOOK_AHEAD,
  type DashboardSectionOptions,
} from '../../../models/dashboard-config'
import { idsByDate } from '../../../services/stats/stats-context'
import {
  eisenhowerQuadrantDialog,
  eisenhowerSummaryDialog,
  recentlyCompletedDialog,
  staleTasksDialog,
  tagSectionDialog,
  tagsSectionDialog,
} from '../../../services/task-dialog'
import { EISENHOWER_QUADRANTS } from '../../../models/workspace-layout'
import { paneSubtitle, QUADRANT_COLOR } from '../../../utils/eisenhower-panes'
import { useChipNames } from '../../shared/filters/filter-menu'
import { bySortOrder } from '../../../utils/sort-order'
import { NEUTRAL_PERSON_COLOR } from '../../../constants'
import { usePersonStore } from '../../../stores/person-store'
import { rowKey } from '../../../utils/scoped-selection'
import { MobileTaskRow } from '../../task/MobileTaskRow'
import { TaskRowGrid } from '../../task/TaskRowGrid'
import { StatusIcon } from '../../shared/StatusIcon'
import { ListWidgetRow } from '../list/ListWidgetRow'
import { useElementSize } from '../../../hooks/use-element-size'
import {
  countOf, hotRuleInWords, nextDayDialogWords, nextDayLabels, signed, sinceLabel, staleSubLine, trendBucketDialogWords, trendBucketLabel,
  trendRangeLabel, trendRangeWords,
} from './dashboard-copy'
import { tileDrill } from './dashboard-tiles'
import { DashGlyph } from '../../shared/DashGlyph'
import type { DashGlyphName } from '../../../utils/dash-glyphs'
import { SECTION_META, sectionTitle, type DashboardSectionMeta } from './section-meta'
import type { DashboardData } from '../../../hooks/use-dashboard-data'
import type { DashboardRowKit, OnDashboardDrill } from './types'
import styles from './DashboardWidget.module.css'
import { t as tr, translateText } from '../../../i18n'

/** What every section is rendered with. */
export interface DashboardSectionProps {
  data: DashboardData
  /** The section's options from the tab config. */
  options: DashboardSectionOptions
  rows: DashboardRowKit
  onDrill?: OnDashboardDrill
  /** Its place in the grid (column span). */
  style?: CSSProperties
}

// ── Shared parts ────────────────────────────────────────────────────────────

function Panel({ def, count, onCount, sub, extras, style, className, children }: {
  def: DashboardSectionMeta
  count?: string
  /** Opens the tasks behind the count; absent = plain text. */
  onCount?: () => void
  sub?: string
  extras?: ReactNode
  style?: CSSProperties
  className?: string
  children: ReactNode
}) {
  return (
    <section className={`${styles.panel} ${styles.surface}${className ? ` ${className}` : ''}`} style={style} aria-label={sectionTitle(def.id)} data-dash-section={def.id}>
      <div className={styles.panelHeader}>
        <DashGlyph name={def.glyph} color={def.glyphColor} />
        <span className={styles.panelTitle}>{sectionTitle(def.id)}</span>
        {count != null && (onCount
          ? (
            <button type="button" className={`${styles.panelCount} ${styles.panelCountBtn}`} data-testid="dash-section-count" aria-label={`${sectionTitle(def.id)}: ${count}. ${tr('ui.show_tasks')}`} onClick={onCount}>
              {count}
            </button>
          )
          : <span className={styles.panelCount} data-testid="dash-section-count">{count}</span>)}
        {sub && <span className={styles.panelSub}>{sub}</span>}
        {extras && <span className={styles.panelExtras}>{extras}</span>}
      </div>
      {children}
    </section>
  )
}

function Empty({ title, hint }: { title: string; hint: string }) {
  return (
    <div className={styles.empty}>
      <span className={styles.emptyTitle}>{title}</span>
      <span className={styles.emptyHint}>{hint}</span>
    </div>
  )
}

/** A chart key: the series' colour as a swatch, or as its glyph when the marks carry it too (Next 7 days). */
function Legend({ color, label, glyph }: { color: string; label: string; glyph?: DashGlyphName }) {
  return (
    <span className={styles.legend}>
      {glyph ? <DashGlyph name={glyph} size={11} color={color} /> : <i className={styles.swatch} style={{ background: color }} />}
      {label}
    </span>
  )
}

/** A button when the number can be opened, else a plain element with the same look. */
function Clickable({ as, className, label, onClick, children, ...rest }: {
  as: 'div' | 'span'
  className?: string
  label?: string
  onClick?: () => void
  children: ReactNode
} & Record<`data-${string}`, string | undefined>) {
  if (onClick) {
    return <button type="button" className={className} aria-label={label} onClick={onClick} {...rest}>{children}</button>
  }
  const Tag = as
  return <Tag className={className} {...rest}>{children}</Tag>
}

/** Task rows as in a list widget: draggable, selectable, open on click. */
function TaskRows({ sectionKey, ids, data, kit }: {
  sectionKey: string
  ids: readonly number[]
  data: DashboardData
  kit: DashboardRowKit
}) {
  const assignedPeopleMap = usePersonStore((s) => s.assignedPeopleMap)
  const todos = ids.flatMap((id) => {
    const t = data.todoById.get(id)
    return t ? [t] : []
  })
  return (
    <>
      {todos.map((todo, i) => {
        const key = rowKey(sectionKey, todo.id)
        const people = assignedPeopleMap.get(todo.id)
        if (kit.isMobile) {
          return <MobileTaskRow key={key} todo={todo} assignedPeople={people} onOpenDetail={kit.onOpen} />
        }
        const prev = todos[i - 1]
        const next = todos[i + 1]
        return (
          <ListWidgetRow
            key={key}
            todo={todo}
            assignedPeople={people}
            tabId={kit.tabId}
            sectionKey={sectionKey}
            rowKey={key}
            selected={kit.inScope && kit.selectedIds.has(todo.id)}
            selFirst={!(prev && kit.selectedIds.has(prev.id))}
            selLast={!(next && kit.selectedIds.has(next.id))}
            cursor={kit.cursorKey === key}
            look="idle"
            onSelect={kit.onSelect}
            onOpenDetail={kit.onOpen}
          />
        )
      })}
    </>
  )
}

/** Task rows sharing the tab's columns and divider (phones: a plain list). */
function RowsGrid({ kit, children }: { kit: DashboardRowKit; children: ReactNode }) {
  if (kit.isMobile) return <>{children}</>
  return (
    <TaskRowGrid
      detailsWidth={kit.detailsWidth}
      onDetailsWidthChange={kit.onDetailsWidthChange}
      liveDetailsWidth={kit.liveDetailsWidth}
    >
      {children}
    </TaskRowGrid>
  )
}

/** The open tasks of `tasks` matching `pick`, in dialog order. */
function openIds(tasks: readonly PersistedTodoItem[], pick: (t: PersistedTodoItem) => boolean): number[] {
  return idsByDate(tasks.filter((t) => !t.isCompleted && pick(t)), 'deadline')
}

/** Task ids in `sortOrder`. */
function inSortOrder(ids: readonly number[], data: DashboardData): number[] {
  return ids.flatMap((id) => {
    const t = data.todoById.get(id)
    return t ? [t] : []
  }).sort(bySortOrder).map((t) => t.id)
}

// ── Hot ─────────────────────────────────────────────────────────────────────


export function HotSection({ data, rows, onDrill, style }: DashboardSectionProps) {
  const ids = data.tiles.shown.hot.ids
  return (
    <Panel
      def={SECTION_META.hot}
      style={style}
      count={countOf(ids.length, data.tiles.total.hot.ids.length)}
      onCount={onDrill ? () => onDrill(tileDrill('hot', data)) : undefined}
      sub={hotRuleInWords(data.ctx.hotRule)}
    >
      <div className={styles.panelBody}>
        {ids.length === 0
          ? <Empty title={tr('ui.nothing_hot')} hint={tr('ui.empty_hot_hint')} />
          : <RowsGrid kit={rows}><TaskRows sectionKey="hot" ids={ids} data={data} kit={rows} /></RowsGrid>}
      </div>
    </Panel>
  )
}

// ── Needs follow-up ─────────────────────────────────────────────────────────


export function FollowupSection({ data, options, rows, onDrill, style }: DashboardSectionProps) {
  const lookAhead = options.lookAhead ?? DEFAULT_DASHBOARD_LOOK_AHEAD
  const { shown, total } = data.followup
  const groups = [
    { key: 'fu-late', name: tr('ui.late_col'), dot: 'var(--color-followup)', ids: shown.late },
    { key: 'fu-today', name: tr('ui.today_col'), dot: 'var(--color-followup)', ids: shown.today },
    { key: 'fu-next', name: tr('ui.next_n_days', { n: lookAhead }), dot: 'var(--color-text-muted)', ids: shown.upcoming },
  ].filter((g) => g.ids.length > 0)
  const shownCount = shown.late.length + shown.today.length + shown.upcoming.length
  const totalCount = total.late.length + total.today.length + total.upcoming.length
  return (
    <Panel
      def={SECTION_META.followup}
      style={style}
      count={countOf(shownCount, totalCount)}
      onCount={onDrill ? () => onDrill({
        title: tr('ui.sec_followup'),
        glyph: 'followup',
        description: tr('ui.followup_drill_desc', { n: lookAhead }),
        source: { kind: 'groups', groups: groups.map((g) => ({ key: g.key, label: g.name, color: g.dot, todoIds: g.ids })) },
      }) : undefined}
      sub={tr('ui.followup_sub', { n: lookAhead })}
    >
      <div className={styles.panelBody}>
        {groups.length === 0 ? (
          <Empty
            title={tr('ui.nothing_needs_follow_up')}
            hint={tr('ui.followup_empty_hint', { n: lookAhead })}
          />
        ) : (
          <RowsGrid kit={rows}>
            {groups.map((g) => (
              <div key={g.key} role="group" aria-label={g.name}>
                <div className={styles.groupHeader}>
                  <i className={styles.groupDot} style={{ background: g.dot }} />
                  <span>{g.name}</span>
                  <span className={styles.groupCount}>· {g.ids.length}</span>
                </div>
                <TaskRows sectionKey={g.key} ids={g.ids} data={data} kit={rows} />
              </div>
            ))}
          </RowsGrid>
        )}
      </div>
    </Panel>
  )
}

// ── Next 7 days ─────────────────────────────────────────────────────────────


/** Px per task in the Next 7 days bars, when they fit. */
const DAY_UNIT_PX = 22
/** Counts row + labels + gaps + padding around the bars in a column. */
const DAY_CHROME_PX = 80

export function NextDaysSection({ data, onDrill, style }: DashboardSectionProps) {
  const [ref, size] = useElementSize()
  const cols = data.nextDays
  const tallest = Math.max(1, ...cols.map((c) => c.dueIds.length + c.followupIds.length))
  const room = Math.max(0, size.height - DAY_CHROME_PX)
  const unit = size.height > 0 ? Math.min(DAY_UNIT_PX, room / tallest) : DAY_UNIT_PX
  return (
    <Panel
      def={SECTION_META.next7}
      style={style}
      extras={<><Legend color="var(--color-overdue)" label={tr('ui.due')} glyph="calendar" /><Legend color="var(--color-followup)" label={tr('ui.follow_up')} glyph="followup" /></>}
    >
      <div ref={ref} className={styles.days}>
        {cols.map((c, i) => {
          const [name, num] = nextDayLabels(c.date, i)
          const d = c.dueIds.length
          const f = c.followupIds.length
          const words = nextDayDialogWords(c.date, i, data.ctx.today)
          return (
            <Clickable
              key={i}
              as="div"
              className={styles.day}
              data-late={i === 0 ? 'true' : undefined}
              data-today={i === 1 ? 'true' : undefined}
              data-testid="dash-day"
              label={tr('ui.bucket_aria', { label: `${name} ${num}`, c: d, k: f })}
              onClick={onDrill ? () => onDrill({
                ...words,
                glyph: 'calendar',
                source: {
                  kind: 'groups',
                  groups: [
                    { key: 'due', label: tr('ui.due'), color: 'var(--color-overdue)', todoIds: c.dueIds },
                    { key: 'followup', label: tr('ui.followup'), color: 'var(--color-followup)', todoIds: c.followupIds },
                  ],
                },
              }) : undefined}
            >
              <span className={styles.dayCounts}>
                {d + f === 0 && <span className={styles.muted}>–</span>}
                {/* Each count with its glyph, so due and follow-up don't rest on colour alone. */}
                {d > 0 && <span className={styles.dayCount} data-count="due" style={{ color: 'var(--color-overdue)' }}><DashGlyph name="calendar" size={10} />{d}</span>}
                {f > 0 && <span className={styles.dayCount} data-count="followup" style={{ color: 'var(--color-followup)' }}><DashGlyph name="followup" size={10} />{f}</span>}
              </span>
              <span className={styles.dayBars}>
                {d > 0 && <span className={styles.bar} style={{ height: d * unit, background: 'var(--color-overdue)' }} />}
                {f > 0 && <span className={styles.bar} style={{ height: f * unit, background: 'var(--color-followup)' }} />}
              </span>
              <span className={styles.dayLabels}>
                <span className={styles.dayName}>{name}</span>
                <span className={styles.dayNum}>{num}</span>
              </span>
            </Clickable>
          )
        })}
      </div>
    </Panel>
  )
}

// ── Created vs completed ────────────────────────────────────────────────────


/** Px per task in the trend bars, when they fit. */
const TREND_UNIT_PX = 36

export function TrendSection({ data, onDrill, style }: DashboardSectionProps) {
  const [ref, size] = useElementSize()
  const { trend, trendRange, ctx } = data
  const buckets = trend?.buckets ?? []
  const tallest = Math.max(1, ...buckets.map((b) => Math.max(b.createdIds.length, b.completedIds.length)))
  const unit = size.height > 0 ? Math.min(TREND_UNIT_PX, size.height / tallest) : TREND_UNIT_PX
  const columns = { gridTemplateColumns: `repeat(${Math.max(1, buckets.length)}, minmax(0, 1fr))` }
  const granularity = trend?.window.granularity ?? 'day'
  const rangeWords = trendRangeWords(trendRange)
  return (
    <Panel
      def={SECTION_META.trend}
      style={style}
      sub={trendRangeLabel(trendRange)}
      extras={<><Legend color="var(--color-chart-created)" label={tr('ui.created')} /><Legend color="var(--color-accent)" label={tr('ui.completed')} /></>}
    >
      <div className={styles.trend}>
        <div className={styles.trendStats}>
          <Clickable
            as="span"
            className={styles.trendStat}
            data-testid="dash-trend-completed"
            label={tr('ui.completed_aria', { n: trend?.completed ?? 0, range: rangeWords })}
            onClick={onDrill && trend ? () => onDrill({
              title: tr('ui.drill_completed'),
              glyph: 'chart',
              description: tr('ui.completed_in_desc', { range: rangeWords }),
              source: { kind: 'todos', todoIds: buckets.flatMap((b) => b.completedIds) },
            }) : undefined}
          >
            <b style={{ color: 'var(--color-accent-text)' }}>{trend?.completed ?? 0}</b>{tr('ui.completed_2')}</Clickable>
          <Clickable
            as="span"
            className={styles.trendStat}
            data-testid="dash-trend-created"
            label={tr('ui.created_aria', { n: trend?.created ?? 0, range: rangeWords })}
            onClick={onDrill && trend ? () => onDrill({
              title: tr('ui.drill_created'),
              glyph: 'chart',
              description: tr('ui.created_in_desc', { range: rangeWords }),
              source: { kind: 'todos', todoIds: buckets.flatMap((b) => b.createdIds) },
            }) : undefined}
          >
            <b>{trend?.created ?? 0}</b>{tr('ui.created_2')}</Clickable>
          {trend && <span className={styles.trendStat}><b>{signed(trend.net)}</b>{sinceLabel(trend.window.start, ctx.today)}</span>}
        </div>
        <div ref={ref} className={styles.trendChart} style={columns}>
          {buckets.map((b, i) => {
            const label = trendBucketLabel(b.start, granularity)
            const c = b.createdIds.length
            const k = b.completedIds.length
            const words = trendBucketDialogWords(b.start, granularity, ctx.today)
            return (
              <Clickable
                key={i}
                as="div"
                className={styles.trendGroup}
                label={tr('ui.bucket_aria', { label, c, k })}
                onClick={onDrill && c + k > 0 ? () => onDrill({
                  ...words,
                  glyph: 'chart',
                  source: {
                    kind: 'groups',
                    groups: [
                      { key: 'completed', label: tr('ui.drill_completed'), color: 'var(--color-accent)', todoIds: b.completedIds },
                      { key: 'created', label: tr('ui.drill_created'), color: 'var(--color-chart-created)', todoIds: b.createdIds },
                    ],
                  },
                }) : undefined}
              >
                <span className={styles.trendBar} style={{ height: c * unit, background: 'var(--color-chart-created)' }} />
                <span className={styles.trendBar} style={{ height: k * unit, background: 'var(--color-accent)' }} />
              </Clickable>
            )
          })}
        </div>
        <div className={styles.trendAxis} style={columns}>
          {buckets.map((b, i) => (
            <span key={i} data-today={i === buckets.length - 1 ? 'true' : undefined}>{trendBucketLabel(b.start, granularity)}</span>
          ))}
        </div>
      </div>
    </Panel>
  )
}

// ── Status ──────────────────────────────────────────────────────────────────


export function StatusSection({ data, onDrill, style }: DashboardSectionProps) {
  const entries = data.status.shown
  const open = entries.reduce((n, e) => n + e.count, 0)
  const openTotal = data.status.total.reduce((n, e) => n + e.count, 0)
  return (
    <Panel
      def={SECTION_META.status}
      style={style}
      count={tr('ui.n_open', { n: countOf(open, openTotal) })}
      onCount={onDrill ? () => onDrill({
        title: tr('ui.tile_open_title'),
        glyph: 'status',
        description: tr('ui.status_drill_desc'),
        source: {
          kind: 'groups',
          groups: entries.filter((e) => e.count > 0).map((e) => ({
            key: String(e.id ?? 'none'),
            label: e.label,
            color: e.color,
            todoIds: openIds(data.shown, (t) => (t.statusId ?? null) === e.id),
          })),
        },
      }) : undefined}
    >
      {openTotal === 0 ? (
        <Empty title={tr('ui.no_open_tasks')} hint={tr('ui.status_empty_hint')} />
      ) : (
        <>
          <div className={styles.statusBar} role="img" aria-label={tr('ui.status_bar_aria', { n: open })}>
            {entries.filter((e) => e.count > 0).map((e) => (
              <span key={e.id ?? 'none'} style={{ flex: `${e.count} 1 0`, background: e.color }} />
            ))}
          </div>
          <div className={styles.panelBody}>
            {entries.map((e) => (
              <Clickable
                key={e.id ?? 'none'}
                as="div"
                className={styles.statusRow}
                data-zero={e.count === 0 ? 'true' : undefined}
                data-status-key={String(e.id ?? 'unset')}
                label={tr('ui.row_aria', { label: e.label, count: e.count })}
                onClick={onDrill && e.count > 0
                  ? () => onDrill({
                    title: e.label,
                    glyph: 'status',
                    description: e.id == null ? tr('ui.no_status_desc') : tr('ui.status_desc', { name: e.label }),
                    source: { kind: 'todos', todoIds: openIds(data.shown, (t) => (t.statusId ?? null) === e.id) },
                  })
                  : undefined}
              >
                <span style={{ color: e.color, display: 'inline-flex' }}><StatusIcon icon={e.icon} filled /></span>
                <span className={styles.statusName}>{e.label}</span>
                <span className={styles.statusCount}>{e.count}</span>
                <span className={styles.statusPct}>{open > 0 ? Math.round((e.count / open) * 100) : 0}%</span>
              </Clickable>
            ))}
          </div>
        </>
      )}
    </Panel>
  )
}

// ── People ──────────────────────────────────────────────────────────────────


function Count({ n, color }: { n: number; color: string }) {
  return <span className={styles.num} style={{ color: n > 0 ? color : 'var(--color-text-muted)' }}>{n > 0 ? n : '–'}</span>
}

export function PeopleSection({ data, options, onDrill, style }: DashboardSectionProps) {
  const { rows, unassigned } = data.people
  const showUnassigned = options.showUnassigned !== false && unassigned.ids.length > 0
  const max = Math.max(1, ...rows.map((r) => r.ids.length), showUnassigned ? unassigned.ids.length : 0)
  const all = useMemo(() => [
    ...rows.map((r) => ({ key: String(r.person.id), person: r.person, stats: r })),
    ...(showUnassigned ? [{ key: 'none', person: null, stats: unassigned }] : []),
  ], [rows, unassigned, showUnassigned])
  return (
    <Panel def={SECTION_META.people} style={style} sub={tr('ui.people_sub')}>
      {all.length === 0 ? (
        <Empty title={tr('ui.no_open_tasks')} hint={tr('ui.people_empty_hint')} />
      ) : (
        <>
          <div className={`${styles.peopleGrid} ${styles.peopleHead}`}>
            <span>{tr('ui.person_2')}</span><span>{tr('ui.open')}</span><span /><span className={styles.num}>{tr('ui.hot')}</span><span className={styles.num}>{tr('ui.follow_up')}</span>
          </div>
          <div className={styles.panelBody}>
            {all.map(({ key, person, stats }) => {
              const name = person ? person.name : tr('ui.unassigned')
              const open = stats.ids.length
              // In each task's own order, as the person chip lists them.
              const onClick = onDrill
                ? () => onDrill({
                  title: name,
                  glyph: 'people',
                  description: person ? tr('ui.person_drill_desc', { name: person.name }) : tr('ui.nobody_desc'),
                  source: { kind: 'todos', todoIds: inSortOrder(stats.ids, data) },
                  ...(person?.id != null ? { personId: person.id } : {}),
                })
                : null
              const content = (
                <>
                  <span className={styles.personName}>
                    {person
                      ? <i className={styles.avatar} style={{ background: person.color || NEUTRAL_PERSON_COLOR }}>{(person.initials || person.name).charAt(0).toUpperCase()}</i>
                      : <i className={`${styles.avatar} ${styles.avatarNone}`} />}
                    <span>{name}</span>
                  </span>
                  <span className={styles.peopleBar}><span style={{ width: `${Math.round((open / max) * 100)}%` }} /></span>
                  <span className={styles.num}>{open}</span>
                  <Count n={stats.hotIds.length} color="var(--color-danger)" />
                  <Count n={stats.followupDueIds.length} color="var(--color-followup)" />
                </>
              )
              const cls = `${styles.peopleGrid} ${styles.personRow}`
              return onClick ? (
                <button
                  key={key}
                  type="button"
                  className={cls}
                  data-person-row={key}
                  aria-label={tr('ui.person_row_aria', { name, open, hot: stats.hotIds.length, fu: stats.followupDueIds.length })}
                  onClick={onClick}
                >
                  {content}
                </button>
              ) : (
                <div key={key} className={cls} data-person-row={key}>{content}</div>
              )
            })}
          </div>
        </>
      )}
    </Panel>
  )
}

// ── Tags ────────────────────────────────────────────────────────────────────


export function TagsSection({ data, options, onDrill, style }: DashboardSectionProps) {
  const { shown, total } = data.tags
  const showUntagged = options.showUntagged !== false && shown.untagged.ids.length > 0
  const all = useMemo(() => {
    const totalOpen = new Map(total.rows.map((r) => [r.tag.id, r.ids.length]))
    return [
      ...shown.rows.map((r) => ({ key: String(r.tag.id), tag: r.tag, stats: r, totalOpen: totalOpen.get(r.tag.id) ?? r.ids.length })),
      ...(showUntagged ? [{ key: 'none', tag: null, stats: shown.untagged, totalOpen: total.untagged.ids.length }] : []),
    ]
  }, [shown, total, showUntagged])
  const max = Math.max(1, ...all.map((r) => r.stats.ids.length))
  return (
    <Panel
      def={SECTION_META.tags}
      style={style}
      className={styles.tagsPanel}
      count={tr('ui.tagged_count', { count: countOf(shown.taggedIds.length, total.taggedIds.length) })}
      // Each tag's tasks in their own order, as a person's are.
      onCount={onDrill ? () => onDrill(tagsSectionDialog(shown.rows.map((r) => ({ tag: r.tag, todoIds: inSortOrder(r.ids, data) })))) : undefined}
      sub={tr('ui.tags_sub')}
    >
      {all.length === 0 ? (
        <Empty title={tr('ui.no_tagged_tasks')} hint={tr('ui.tags_empty_hint')} />
      ) : (
        <>
          <div className={`${styles.tagsGrid} ${styles.peopleHead}`}>
            <span>{tr('ui.tag_2')}</span><span>{tr('ui.open')}</span><span className={styles.tagsBarCol} /><span className={styles.num}>{tr('ui.hot')}</span><span className={styles.num}>{tr('ui.follow_up')}</span>
          </div>
          <div className={styles.panelBody}>
            {all.map(({ key, tag, stats, totalOpen }) => {
              const name = tag ? `#${tag.name}` : tr('ui.no_tag')
              const open = stats.ids.length
              const openLabel = countOf(open, totalOpen)
              const content = (
                <>
                  <span className={styles.personName}>
                    <i className={`${styles.tagDot} ${tag ? '' : styles.avatarNone}`} style={tag ? { background: tag.color } : undefined} />
                    <span className={styles.tagName}>{name}</span>
                  </span>
                  <span className={`${styles.peopleBar} ${styles.tagsBarCol}`}><span style={{ width: `${Math.round((open / max) * 100)}%` }} /></span>
                  <span className={styles.num} data-testid="dash-tag-open">{openLabel}</span>
                  <Count n={stats.hotIds.length} color="var(--color-danger)" />
                  <Count n={stats.followupDueIds.length} color="var(--color-followup)" />
                </>
              )
              const cls = `${styles.tagsGrid} ${styles.personRow}`
              return onDrill ? (
                <button
                  key={key}
                  type="button"
                  className={cls}
                  data-tag-row={key}
                  aria-label={tr('ui.person_row_aria', { name, open: openLabel, hot: stats.hotIds.length, fu: stats.followupDueIds.length })}
                  onClick={() => onDrill(tagSectionDialog(tag, inSortOrder(stats.ids, data)))}
                >
                  {content}
                </button>
              ) : (
                <div key={key} className={cls} data-tag-row={key}>{content}</div>
              )
            })}
          </div>
        </>
      )}
    </Panel>
  )
}

// ── Stale tasks ─────────────────────────────────────────────────────────────


export function StaleSection({ data, rows, onDrill, style }: DashboardSectionProps) {
  const { shown, total } = data.stale
  const days = data.staleDays
  const ids = shown.ids
  return (
    <Panel
      def={SECTION_META.stale}
      style={style}
      count={countOf(ids.length, total.ids.length)}
      onCount={onDrill ? () => onDrill(staleTasksDialog(ids, days)) : undefined}
      sub={staleSubLine(days, shown.oldestDays)}
    >
      <div className={styles.panelBody}>
        {ids.length === 0
          ? <Empty title={tr('ui.nothing_stale')} hint={tr('ui.stale_empty_hint', { n: days })} />
          : <RowsGrid kit={rows}><TaskRows sectionKey="stale" ids={ids} data={data} kit={rows} /></RowsGrid>}
      </div>
    </Panel>
  )
}

// ── Recently completed ──────────────────────────────────────────────────────


export function RecentSection({ data, rows, onDrill, style }: DashboardSectionProps) {
  const { shown, total } = data.recent
  const days = data.recentDays
  const ids = shown.ids
  return (
    <Panel
      def={SECTION_META.recent}
      style={style}
      count={countOf(ids.length, total.ids.length)}
      onCount={onDrill ? () => onDrill(recentlyCompletedDialog(ids, days)) : undefined}
      sub={tr('ui.recent_sub', { n: days })}
    >
      <div className={styles.panelBody}>
        {ids.length === 0
          ? <Empty title={tr('ui.nothing_completed')} hint={tr('ui.recent_empty_hint', { n: days })} />
          : <RowsGrid kit={rows}><TaskRows sectionKey="recent" ids={ids} data={data} kit={rows} /></RowsGrid>}
      </div>
    </Panel>
  )
}

// ── Eisenhower ──────────────────────────────────────────────────────────────


export function EisenhowerSection({ data, onDrill, style }: DashboardSectionProps) {
  const { shown, total } = data.eisenhower
  const { panes, listName } = data.eisenhowerSetup
  const names = useChipNames()
  const subtitles = useMemo(() => panes.map((p) => paneSubtitle(p, names)), [panes, names])
  const source = { urgentRange: data.ctx.urgentRange, listName }
  const sum = (s: typeof shown) => EISENHOWER_QUADRANTS.reduce((n, q) => n + s[q].ids.length, 0)
  const custom = panes.some((p) => p.customFilter)
  const sub = [listName != null ? `“${listName}”` : null, custom ? tr('ui.custom_panes') : tr('ui.urgent_x_important')].filter((x) => x != null).join(' · ')
  return (
    <Panel
      def={SECTION_META.eisenhower}
      style={style}
      count={`${countOf(sum(shown), sum(total))} open`}
      onCount={onDrill ? () => onDrill(eisenhowerSummaryDialog(panes, {
        do: shown.do.ids, schedule: shown.schedule.ids, delegate: shown.delegate.ids, drop: shown.drop.ids,
      }, source)) : undefined}
      sub={sub}
    >
      <div className={styles.matrix}>
        {panes.map((pane, i) => {
          const q = pane.id
          const n = shown[q].ids.length
          const t = total[q].ids.length
          const byDate = shown[q].byDate
          const subtitle = subtitles[i] ?? ''
          return (
            <Clickable
              key={q}
              as="div"
              className={styles.quadrant}
              data-eis-cell={q}
              label={tr('ui.eisenhower_quad_aria', { name: translateText(pane.name), subtitle: subtitle.toLowerCase(), count: countOf(n, t) })}
              onClick={onDrill && n > 0 ? () => onDrill(eisenhowerQuadrantDialog(pane, subtitle, shown[q].ids, source)) : undefined}
            >
              <span className={styles.quadrantName} style={{ color: QUADRANT_COLOR[q] }}>{pane.name}</span>
              <span className={styles.quadrantSub}>{subtitle}</span>
              <span className={styles.quadrantCount} style={{ color: n === 0 ? 'var(--color-text-muted)' : undefined }} data-testid="dash-eis-count">
                {n}
                {n !== t && <span className={styles.of}>{tr('ui.of')}{' '}{t}</span>}
              </span>
              {byDate > 0 && <span className={styles.quadrantSub}>{byDate} {tr('ui.by_due_date')}</span>}
            </Clickable>
          )
        })}
      </div>
    </Panel>
  )
}
