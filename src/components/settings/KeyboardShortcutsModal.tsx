import styles from './EntityEditor.module.css'
import { EditorModal } from './EditorModal'
import { ShortcutList } from './ShortcutList'
import { t } from '../../i18n'

interface KeyboardShortcutsModalProps {
  onClose: () => void
}

export function KeyboardShortcutsModal({ onClose }: KeyboardShortcutsModalProps) {
  return (
    <EditorModal title={t('ui.keyboard_shortcuts')} onClose={onClose}>
      <div className={styles.list}>
        <ShortcutList />
      </div>
    </EditorModal>
  )
}
