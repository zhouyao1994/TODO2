import type { DashboardTileId } from '../../../models/dashboard-config'
import type { DashGlyphName } from '../../../utils/dash-glyphs'
import { tileDescription } from './dashboard-copy'
import type { DashboardDrill } from './types'
import type { DashboardData } from '../../../hooks/use-dashboard-data'
import type { MessageKey } from '../../../i18n'
import { t } from '../../../i18n'

/** A built-in tile's look and its task dialog's title. */
export interface TileDef {
  labelKey: MessageKey
  /** The task dialog's title. */
  titleKey: MessageKey
  glyph: DashGlyphName
  color: string
}

/** The tile's display name: `Hot` / `热`. */
export function tileLabel(id: DashboardTileId): string {
  return t(TILES[id].labelKey)
}

/** The tile's task-dialog title. */
export function tileTitle(id: DashboardTileId): string {
  return t(TILES[id].titleKey)
}

export const TILES: Record<DashboardTileId, TileDef> = {
  open: { labelKey: 'ui.tile_open', titleKey: 'ui.tile_open_title', glyph: 'open', color: 'var(--color-accent)' },
  hot: { labelKey: 'ui.tile_hot', titleKey: 'ui.tile_hot_title', glyph: 'hot', color: 'var(--color-danger)' },
  urgent: { labelKey: 'ui.tile_urgent', titleKey: 'ui.tile_urgent_title', glyph: 'urgent', color: 'var(--color-danger)' },
  overdue: { labelKey: 'ui.tile_overdue', titleKey: 'ui.tile_overdue_title', glyph: 'overdue', color: 'var(--color-overdue)' },
  followupDue: { labelKey: 'ui.tile_followup_due', titleKey: 'ui.tile_followup_due', glyph: 'followup', color: 'var(--color-followup)' },
  focus: { labelKey: 'ui.focus', titleKey: 'ui.focus', glyph: 'focus', color: 'var(--color-accent)' },
  dueToday: { labelKey: 'ui.tile_due_today', titleKey: 'ui.tile_due_today', glyph: 'calendar', color: 'var(--color-overdue)' },
  dueNext7: { labelKey: 'ui.tile_due_next7', titleKey: 'ui.tile_due_next7', glyph: 'calendar', color: 'var(--color-overdue)' },
  noFollowup: { labelKey: 'ui.tile_no_followup', titleKey: 'ui.tile_no_followup', glyph: 'followup', color: 'var(--color-text-muted)' },
}

/** A tile's tasks for the task dialog (the Hot section's count opens the Hot tile's). */
export function tileDrill(id: DashboardTileId, data: DashboardData): DashboardDrill {
  const def = TILES[id]
  return {
    title: tileTitle(id),
    glyph: def.glyph,
    description: tileDescription(id, data.ctx),
    source: { kind: 'todos', todoIds: data.tiles.shown[id].ids },
  }
}
