import type { Person, PersistedTodoItem, Status } from '../models'
import { startOfToday } from '../utils/date'
import { byName } from '../utils/sort-order'
import { useTodoStore } from '../stores/todo-store'
import { useSettingsStore } from '../stores/settings-store'
import { shortcutLabel } from '../utils/shortcut-bindings'
import type { ShortcutId, ShortcutOverrides } from '../models/keyboard-shortcut'
import { runShortcutCommand, type ShortcutCallbacks } from './keyboard-shortcuts'
import { copySelectedTasks } from './task-copy'
import { t } from '../i18n'

/** `task` = task actions (New Task, Undo …); `search-results` = tasks found by the palette's search. */
export type CommandCategory = 'navigation' | 'task' | 'bulk' | 'filter' | 'email' | 'search-results'

export interface Command {
  id: string
  name: string
  shortcut?: string
  /** Muted text on the right of the row (e.g. `4 open tasks`). */
  hint?: string
  category: CommandCategory
  action: () => void
}

export interface CommandContext {
  /**
   * What the shortcut handlers the palette runs may call (Settings, the
   * shortcuts modal): the commands that have a binding run its handler.
   */
  shortcuts: ShortcutCallbacks
  /** Number of currently selected tasks */
  selectionCount: number
  /** Bulk actions on selected tasks */
  bulkSetCompleted: (ids: number[], completed: boolean) => Promise<void>
  bulkSetStatus: (ids: number[], statusId: number | undefined) => Promise<void>
  bulkRemove: (ids: number[]) => Promise<void>
  getSelectedIds: () => number[]
  /** Filter actions */
  clearAllFilters: () => void
  setShowCompleted: (show: boolean) => void
  getShowCompleted: () => boolean
  setDateRange: (start: Date | null, end: Date | null) => void
  /** Opens (or focuses) the top bar's panel of the tasks the screen filter matches (its tray edits that filter). */
  showScreenTasks?: () => void
  /** How many tasks that panel would list (open ones, completed too under Show completed). */
  getScreenTaskCount?: () => number
  /** Lazy todo getter (for task search — only called when palette has a query) */
  getTodos: () => PersistedTodoItem[]
  /** Open a task (from a palette task search hit) */
  focusTask: (todoId: number) => void
  /** Statuses for bulk commands */
  getStatuses?: () => Status[]
  /** Opens the email check-in dialog with `personIds` ticked (none = choose people there). */
  openCheckinDialog?: (personIds?: number[]) => void
  /**
   * Emails one person their check-in at once (`checkin-email/person-checkin`
   * `sendPersonCheckin`). Runs inside the command's key press / click: the
   * clipboard write needs that gesture.
   */
  sendPersonCheckin?: (personId: number) => void
  /** Opens the check-in reply import dialog. */
  openCheckinImport?: () => void
  /** People, for the per-person check-in commands. */
  getPeople?: () => readonly Person[]
  /** Open tasks assigned per person id (people with none may be absent). */
  getOpenTaskCounts?: () => ReadonlyMap<number, number>
  /** Per person id, the open tasks the check-in filter picks; `null` (or absent) while there is no filter. */
  getCheckinTaskCounts?: () => ReadonlyMap<number, number> | null
}

const openTasksLabel = (n: number) => (n === 1 ? t('ui.open_task_count_one') : t('ui.open_task_count_many', { n }))
const tasksLabel = (n: number) => (n === 1 ? t('ui.task_count_hint_one') : t('ui.task_count_hint_many', { n }))

/**
 * `Email check-in: <person>` for each person with at least one open task, by
 * name (an email address isn't needed: the recipient can be added in the mail
 * app); the hint counts their open tasks — `2 of 5 open tasks` while the
 * check-in filter narrows them (what the email would hold). Running one sends
 * that person's check-in at once.
 */
function personCheckinCommands(ctx: CommandContext, send: (personId: number) => void): Command[] {
  const counts = ctx.getOpenTaskCounts?.() ?? new Map<number, number>()
  const matching = ctx.getCheckinTaskCounts?.() ?? null
  return (ctx.getPeople?.() ?? [])
    .flatMap((p) => {
      const id = p.id
      const n = id != null ? counts.get(id) ?? 0 : 0
      if (id == null || n === 0) return []
      return [{ id, name: p.name, n }]
    })
    .sort(byName)
    .map(({ id, name, n }): Command => ({
      id: `email-checkin-${id}`,
      name: t('ui.command_email_checkin_person', { name }),
      hint: matching
        ? t(n === 1 ? 'ui.open_tasks_of_one' : 'ui.open_tasks_of', { matching: matching.get(id) ?? 0, open: n })
        : openTasksLabel(n),
      category: 'email',
      action: () => send(id),
    }))
}

/** The palette's commands; key hints show the live keys (`overrides`: the user's shortcut changes). */
export function createCommands(
  ctx: CommandContext,
  overrides: ShortcutOverrides = useSettingsStore.getState().shortcutOverrides,
): Command[] {
  const keys = (id: ShortcutId) => shortcutLabel(id, overrides)
  /** A command that has a binding: its keys as the hint, its handler as the action. */
  const bound = (id: string, name: string, binding: ShortcutId, category: CommandCategory): Command => ({
    id, name, shortcut: keys(binding), category,
    action: () => { void runShortcutCommand(binding, ctx.shortcuts) },
  })
  const commands: Command[] = [
    // Navigation
    bound('open-settings', t('ui.command_open_settings'), 'open-settings', 'navigation'),
    bound('focus-filter', t('ui.command_focus_filters'), 'focus-filters', 'navigation'),
    bound('focus-search', t('ui.command_focus_search'), 'focus-search', 'navigation'),
    ...(ctx.shortcuts.openShortcutsModal ? [bound('keyboard-shortcuts', t('ui.keyboard_shortcuts'), 'show-shortcuts', 'navigation')] : []),

    // Task actions
    bound('new-task', t('ui.command_new_task'), 'quick-add', 'task'),
    bound('undo', t('ui.undo'), 'undo', 'task'),
    bound('redo', t('ui.command_redo'), 'redo', 'task'),
    bound('select-all', t('ui.command_select_all_tasks'), 'select-all', 'task'),

    // Filter presets
    { id: 'filter-show-completed', name: t('ui.command_toggle_show_completed'), category: 'filter', action: () => ctx.setShowCompleted(!ctx.getShowCompleted()) },
    { id: 'filter-clear', name: t('ui.command_clear_all_filters'), category: 'filter', action: ctx.clearAllFilters },
    { id: 'filter-overdue', name: t('ui.command_show_overdue_tasks'), category: 'filter', action: () => {
      ctx.clearAllFilters()
      const yesterday = new Date(startOfToday().getTime() - 1)
      ctx.setDateRange(null, yesterday)
    }},
  ]
  // Always offered: with no filter on, it lists every open task.
  const showScreenTasks = ctx.showScreenTasks
  if (showScreenTasks) {
    const n = ctx.getScreenTaskCount?.()
    commands.push({
      id: 'filter-show-tasks',
      name: t('ui.command_show_matching'),
      ...(n != null ? { hint: tasksLabel(n) } : {}),
      category: 'filter',
      action: showScreenTasks,
    })
  }

  // Email
  const openCheckinDialog = ctx.openCheckinDialog
  if (openCheckinDialog) {
    commands.push({ id: 'email-checkins', name: t('ui.command_email_checkins'), hint: t('ui.command_choose_people'), category: 'email', action: () => openCheckinDialog() })
  }
  if (ctx.openCheckinImport) {
    commands.push({ id: 'email-import-reply', name: t('ui.command_import_reply'), category: 'email', action: ctx.openCheckinImport })
  }
  if (ctx.sendPersonCheckin) commands.push(...personCheckinCommands(ctx, ctx.sendPersonCheckin))

  // Bulk actions — only when tasks are selected
  if (ctx.selectionCount === 1) {
    commands.push({
      id: 'task-duplicate', name: t('ui.command_duplicate_task'), category: 'task',
      action: async () => {
        const ids = ctx.getSelectedIds()
        const onlyId = ids[0]
        if (ids.length === 1 && onlyId != null) {
          await useTodoStore.getState().duplicate(onlyId)
        }
      },
    })
  }
  if (ctx.selectionCount > 0) {
    const label = ctx.selectionCount === 1 ? t('ui.task_count_one') : t('ui.task_count_many', { n: ctx.selectionCount })
    commands.push(
      { id: 'bulk-complete', name: t('ui.command_complete_tasks', { label }), category: 'bulk', action: () => ctx.bulkSetCompleted(ctx.getSelectedIds(), true) },
      { id: 'bulk-uncomplete', name: t('ui.command_uncomplete_tasks', { label }), category: 'bulk', action: () => ctx.bulkSetCompleted(ctx.getSelectedIds(), false) },
    )
    // Bulk status commands
    const statuses = ctx.getStatuses?.() ?? []
    for (const status of statuses) {
      commands.push({
        id: `bulk-status-${status.id}`,
        name: t('ui.command_set_status', { label, status: status.name }),
        category: 'bulk',
        action: () => ctx.bulkSetStatus(ctx.getSelectedIds(), status.id!),
      })
    }
    if (statuses.length > 0) {
      commands.push({
        id: 'bulk-status-clear',
        name: t('ui.command_clear_status', { label }),
        category: 'bulk',
        action: () => ctx.bulkSetStatus(ctx.getSelectedIds(), undefined),
      })
    }
    commands.push(
      // The selection, as the copy shortcut copies it (no text-selection check: the palette is the ask).
      { id: 'bulk-copy', name: t('ui.command_copy_tasks', { label }), shortcut: keys('copy-selected'), category: 'bulk', action: () => { void copySelectedTasks() } },
      { id: 'bulk-delete', name: t('ui.command_delete_tasks', { label }), category: 'bulk', action: () => ctx.bulkRemove(ctx.getSelectedIds()) },
    )
  }

  return commands
}

/**
 * Filter-first dynamic command search — only creates Command objects for
 * todos whose titles match the query. Called lazily by the command
 * palette when the user types a search string.
 */
export function searchDynamicCommands(query: string, ctx: CommandContext): Command[] {
  if (!query) return []
  const q = query.toLowerCase()
  const results: Command[] = []

  for (const todo of ctx.getTodos()) {
    if (todo.title.toLowerCase().includes(q)) {
      results.push({
        id: `task-${todo.id}`,
        name: todo.title,
        category: 'search-results',
        action: () => ctx.focusTask(todo.id),
      })
    }
  }

  return results
}
