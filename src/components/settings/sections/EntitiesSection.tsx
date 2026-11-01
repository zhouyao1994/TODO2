import { useState } from 'react'
import { usePersonStore } from '../../../stores/person-store'
import { useStatusStore } from '../../../stores/status-store'
import { useTagStore } from '../../../stores/tag-store'
import { useSettingsStore } from '../../../stores/settings-store'
import { CHECKIN_OPEN_METHOD_OPTIONS } from '../../../utils/checkin-settings'
import { PeopleEditor } from '../PeopleEditor'
import { StatusEditor } from '../StatusEditor'
import { TagEditor } from '../TagEditor'
import { UnusedEntitiesDialog } from '../UnusedEntitiesDialog'
import { SettingRow } from './SettingRow'
import { useStackedLayer } from './settings-layer'
import type { SettingsBodyProps } from './settings-sections'
import styles from './sections.module.css'
import { t, translateText } from '../../../i18n'

/** How a check-in email is handed to the mail app (also set from the check-in dialog). */
function CheckinOpenMethodSetting() {
  const method = useSettingsStore((s) => s.checkinOpenMethod)
  const setMethod = useSettingsStore((s) => s.setCheckinOpenMethod)
  return (
    <SettingRow label={t('ui.email_check_ins_open_as')} help={t('ui.how_each_check_in_email_reaches')} column>
      <div className={styles.radioGroup} role="radiogroup" aria-label={t('ui.email_check_ins_open_as')}>
        {CHECKIN_OPEN_METHOD_OPTIONS.map((o) => (
          <label key={o.method} className={styles.radioOption}>
            <input
              type="radio"
              name="checkin-open-method"
              value={o.method}
              checked={method === o.method}
              onChange={() => void setMethod(o.method)}
            />
            <span className={styles.radioText}>
              {translateText(o.label)}
              <span className={styles.help}>{translateText(o.help)}</span>
            </span>
          </label>
        ))}
      </div>
    </SettingRow>
  )
}

function countText(n: number, one: 'ui.people_count_one' | 'ui.status_count_one' | 'ui.tag_count_one', many: 'ui.people_count_many' | 'ui.status_count_many' | 'ui.tag_count_many'): string {
  return n === 1 ? t(one) : t(many, { n })
}

/**
 * People (+ how email check-ins open), statuses, tags and Unused people &
 * tags: each opens its editor / dialog over the modal. The phone's Settings
 * page shows only the Unused people & tags row.
 */
export function EntitiesSection({ mobile }: SettingsBodyProps) {
  const peopleCount = usePersonStore((s) => s.people.length)
  const statusCount = useStatusStore((s) => s.statuses.length)
  const tagCount = useTagStore((s) => s.tags.length)
  const [editor, setEditor] = useState<'people' | 'statuses' | 'tags' | 'unused' | null>(null)
  useStackedLayer(editor !== null)

  const close = () => setEditor(null)
  const button = `${styles.button} ${styles.buttonSecondary}`

  return (
    <div className={styles.section}>
      {!mobile && (
        <>
          <SettingRow label={t('ui.people')} help={countText(peopleCount, 'ui.people_count_one', 'ui.people_count_many')}>
            <button type="button" className={button} onClick={() => setEditor('people')}>{t('ui.manage_people')}</button>
          </SettingRow>
          <CheckinOpenMethodSetting />
          <SettingRow label={t('ui.statuses')} help={countText(statusCount, 'ui.status_count_one', 'ui.status_count_many')}>
            <button type="button" className={button} onClick={() => setEditor('statuses')}>{t('ui.manage_statuses')}</button>
          </SettingRow>
          <SettingRow label={t('ui.tags')} help={countText(tagCount, 'ui.tag_count_one', 'ui.tag_count_many')}>
            <button type="button" className={button} onClick={() => setEditor('tags')}>{t('ui.manage_tags')}</button>
          </SettingRow>
        </>
      )}
      <SettingRow label={t('ui.unused_people_tags')} help={t('ui.people_and_tags_no_task_has_2')}>
        <button type="button" className={button} onClick={() => setEditor('unused')}>{t('ui.find_unused')}</button>
      </SettingRow>

      {editor === 'people' && <PeopleEditor onClose={close} />}
      {editor === 'statuses' && <StatusEditor onClose={close} />}
      {editor === 'tags' && <TagEditor onClose={close} />}
      {editor === 'unused' && <UnusedEntitiesDialog onClose={close} />}
    </div>
  )
}
