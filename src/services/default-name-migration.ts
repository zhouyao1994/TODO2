import { getLanguage } from '../i18n'
import { useListDefinitionStore } from '../stores/list-definition-store'

/** The seed name a created list starts with, plus its dedupe suffix. */
const NEW_LIST_PATTERN = /^New list(?: (\d+))?$/

/**
 * Renames seed-named lists into the UI language, once, after the language is
 * known (`New list` → `新建列表`). Idempotent: the English pattern no longer
 * matches afterwards, and a name collision leaves the list as it is.
 */
export async function migrateDefaultListNames(): Promise<void> {
  if (getLanguage() !== 'zh-CN') return
  const { listDefinitions, update } = useListDefinitionStore.getState()
  for (const def of listDefinitions) {
    const match = NEW_LIST_PATTERN.exec(def.name)
    if (!match) continue
    const zhName = `新建列表${match[1] != null ? ` ${match[1]}` : ''}`
    if (listDefinitions.some((d) => d.id !== def.id && d.name === zhName)) continue
    try {
      await update({ ...def, name: zhName })
    } catch {
      // A failed rename leaves the seed name; nothing else depends on it.
    }
  }
}
