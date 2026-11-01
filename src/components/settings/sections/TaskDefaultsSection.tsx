import { useSettingsStore } from '../../../stores/settings-store'
import { useStatusStore } from '../../../stores/status-store'
import { FollowupIntervalSetting } from '../FollowupIntervalSetting'
import { HotRuleEditor } from '../../shared/HotRuleEditor'
import { HotIcon } from '../../shared/MarkerIcons'
import {
  URGENT_DUE_WITHIN_CHOICES,
  formatUrgentDueWithinDays,
  parseUrgentDueWithinDays,
  urgentRangeLabel,
  type UrgentDueWithinDays,
} from '../../../utils/urgency'
import {
  LIST_GROUP_CHOICES,
  LIST_SORT_CHOICES,
  choicesWith,
  groupLabel,
  sortLabel,
  sortOrderWords,
} from '../../../utils/list-options'
import { TODO_SORT_DIRECTIONS, isTodoGroupBy, isTodoSortBy, sortHasDirection } from '../../../models/todo-sort-group'
import { SettingRow } from './SettingRow'
import styles from './sections.module.css'
import { t, translateText } from '../../../i18n'

/** `Off` / `Today` / `Within 3 days` — a range choice as the select shows it. */
function urgentChoiceLabel(range: UrgentDueWithinDays): string {
  return range == null || range === 0 ? urgentRangeLabel(range) : t('ui.within_range', { range: urgentRangeLabel(range) })
}

/**
 * Defaults for new tasks: status, whether they get a next follow-up and the
 * follow-up interval, when a due date makes a task urgent, which tasks are
 * hot, the first day of the week, and how new lists sort and group.
 */
export function TaskDefaultsSection() {
  const defaultStatusId = useSettingsStore((s) => s.defaultStatusId)
  const setDefaultStatusId = useSettingsStore((s) => s.setDefaultStatusId)
  const weekStartsOn = useSettingsStore((s) => s.weekStartsOn)
  const setWeekStartsOn = useSettingsStore((s) => s.setWeekStartsOn)
  const statuses = useStatusStore((s) => s.statuses)
  const urgentRange = useSettingsStore((s) => s.urgentDueWithinDays)
  const setUrgentRange = useSettingsStore((s) => s.setUrgentDueWithinDays)
  // A range set outside the offered choices (e.g. by an import) still shows.
  const urgentChoices = URGENT_DUE_WITHIN_CHOICES.includes(urgentRange)
    ? URGENT_DUE_WITHIN_CHOICES
    : [...URGENT_DUE_WITHIN_CHOICES, urgentRange]

  return (
    <div className={styles.section}>
      <SettingRow label={t('ui.default_status')} help={t('ui.given_to_every_new_task')}>
        <select
          className={styles.select}
          aria-label={t('ui.default_status_for_new_tasks')}
          value={defaultStatusId ?? ''}
          onChange={(e) => setDefaultStatusId(e.target.value ? Number(e.target.value) : null)}
        >
          <option value="">{t('ui.none')}</option>
          {statuses.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </SettingRow>
      <FollowupIntervalSetting />
      <SettingRow
        label={t('ui.due_date_makes_a_task_urgent')}
        help={t('ui.overdue_tasks_count_too_they_show')}
      >
        <select
          className={styles.select}
          aria-label={t('ui.due_date_makes_a_task_urgent')}
          value={formatUrgentDueWithinDays(urgentRange)}
          onChange={(e) => {
            const next = parseUrgentDueWithinDays(e.target.value)
            if (next !== undefined) void setUrgentRange(next)
          }}
        >
          {urgentChoices.map((range) => (
            <option key={formatUrgentDueWithinDays(range)} value={formatUrgentDueWithinDays(range)}>
              {urgentChoiceLabel(range)}
            </option>
          ))}
        </select>
      </SettingRow>
      <SettingRow
        label={<span className={styles.labelWithIcon}><span className={styles.hotIcon}><HotIcon /></span>{t('ui.hot_tasks')}</span>}
        help={t('ui.a_task_is_hot_when_it')}
        column
      >
        <HotRuleEditor />
      </SettingRow>
      <SettingRow label={t('ui.week_starts_on')} help={t('ui.calendars_and_the_this_week_group')}>
        <select
          className={styles.select}
          aria-label={t('ui.week_starts_on')}
          value={weekStartsOn}
          onChange={(e) => setWeekStartsOn(Number(e.target.value) === 0 ? 0 : 1)}
        >
          <option value={1}>{t('ui.monday')}</option>
          <option value={0}>{t('ui.sunday')}</option>
        </select>
      </SettingRow>
      <NewListDefaults />
    </div>
  )
}

/**
 * What a new blank list (adding a List widget, or a tab switched to List)
 * starts sorted (and which way, for a sort with a direction) and grouped by.
 * Each change is one undo step.
 */
function NewListDefaults() {
  const sort = useSettingsStore((s) => s.newListSort)
  const direction = useSettingsStore((s) => s.newListSortDirection)
  const group = useSettingsStore((s) => s.newListGroup)
  const setSort = useSettingsStore((s) => s.setNewListSort)
  const setGroup = useSettingsStore((s) => s.setNewListGroup)
  return (
    <>
      <SettingRow label={t('ui.new_lists_sort_by')} help={t('ui.a_list_you_create_starts_sorted')}>
        <select
          className={styles.select}
          aria-label={t('ui.new_lists_sort_by')}
          value={sort}
          // A direction carries over to another sort with one (as in Edit list).
          onChange={(e) => { if (isTodoSortBy(e.target.value)) void setSort(e.target.value, direction) }}
        >
          {choicesWith(LIST_SORT_CHOICES, sort).map((choice) => (
            <option key={choice} value={choice}>{sortLabel(choice)}</option>
          ))}
        </select>
        {sortHasDirection(sort) && (
          <select
            className={styles.select}
            aria-label={t('ui.new_lists_sort_order')}
            value={direction}
            onChange={(e) => void setSort(sort, e.target.value === 'desc' ? 'desc' : 'asc')}
          >
            {TODO_SORT_DIRECTIONS.map((dir) => (
              <option key={dir} value={dir}>{translateText(sortOrderWords(sort, dir) ?? '')}</option>
            ))}
          </select>
        )}
      </SettingRow>
      <SettingRow label={t('ui.new_lists_group_by')} help={t('ui.a_list_you_create_starts_grouped')}>
        <select
          className={styles.select}
          aria-label={t('ui.new_lists_group_by')}
          value={group}
          onChange={(e) => { if (isTodoGroupBy(e.target.value)) void setGroup(e.target.value) }}
        >
          {choicesWith(LIST_GROUP_CHOICES, group).map((choice) => (
            <option key={choice} value={choice}>{groupLabel(choice)}</option>
          ))}
        </select>
      </SettingRow>
    </>
  )
}
