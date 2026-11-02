import { t } from '../../../i18n'

/** The note a prompted list gets in the Customize dialog (kept for the test's English copy). */
export const PROMPTED_LIST_TILE_NOTE = 'Lists that ask for a value can’t be tiles'

/** The same note in the UI language. */
export function promptedListTileNote(): string {
  return t('ui.asks_value_note')
}
