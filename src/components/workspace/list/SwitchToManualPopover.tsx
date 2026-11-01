import { createPortal } from 'react-dom'
import { useEffect, useRef } from 'react'
import { usePopoverAnchor } from '../../../hooks/use-popover-anchor'
import styles from './ListWidget.module.css'
import { t } from '../../../i18n'

interface SwitchToManualPopoverProps {
  listName: string
  /** The sort the list has now, as a label (e.g. `Due date`). */
  sortLabel: string
  /** Where the row was dropped (viewport). */
  at: { x: number; y: number }
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Asked after a row is dropped in a sorted list: switching to manual order
 * starts the order from what the list shows, with the move applied.
 */
export function SwitchToManualPopover({ listName, sortLabel, at, onConfirm, onCancel }: SwitchToManualPopoverProps) {
  const confirmRef = useRef<HTMLButtonElement>(null)
  const { panelRef, style } = usePopoverAnchor({
    anchor: { kind: 'point', x: at.x, y: at.y },
    open: true,
    placement: 'bottom-start',
    closeOnScroll: false,
    onClose: onCancel,
  })

  useEffect(() => {
    confirmRef.current?.focus()
  }, [])

  return createPortal(
    <div
      ref={panelRef}
      className={styles.switchPopover}
      style={{ position: style.position, left: style.left, top: style.top }}
      role="dialog"
      aria-label={t('ui.switch_to_manual_order')}
      data-testid="switch-to-manual"
      onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); onCancel() } }}
    >
      <div className={styles.switchTitle}>{t('ui.switch_to_manual_order')}</div>
      <p className={styles.switchBody}>
        “{listName}{t('ui.is_sorted_by')}{' '}{sortLabel.toLowerCase()}{t('ui.manual_order_starts_from_what_you')}</p>
      <div className={styles.switchFooter}>
        <button type="button" className={styles.switchCancel} onClick={onCancel}>
          {t('ui.cancel')}{' '}<kbd className={styles.kbd}>Esc</kbd>
        </button>
        <button ref={confirmRef} type="button" className={styles.switchConfirm} onClick={onConfirm}>
          {t('ui.switch_to_manual')}</button>
      </div>
    </div>,
    document.body,
  )
}
