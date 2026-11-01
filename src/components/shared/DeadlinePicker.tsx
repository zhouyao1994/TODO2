import { useRef } from 'react'
import { StatusIcon } from './StatusIcon'
import { toDateInputValue, formatDate } from '../../utils/date'
import styles from './DeadlinePicker.module.css'
import { t } from '../../i18n'

interface DeadlinePickerProps {
  value: Date | null | undefined
  onChange: (next: Date | null) => void
}

export function DeadlinePicker({ value, onChange }: DeadlinePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleClick = () => {
    try { inputRef.current?.showPicker?.() } catch { inputRef.current?.focus() }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    onChange(raw ? new Date(raw + 'T00:00:00') : null)
  }

  const label = value ? formatDate(value) : t('ui.due_date')
  const cls = value ? `${styles.triggerChip} ${styles.triggerChipActive}` : styles.triggerChip

  return (
    <button
      type="button"
      className={cls}
      onClick={(e) => { e.stopPropagation(); handleClick() }}
      title={value ? t('ui.due_label', { date: label }) : t('ui.set_due_date')}
    >
      <StatusIcon icon="clock" />
      <span className={styles.triggerLabel}>{label}</span>
      {value && (
        <span
          className={styles.clearButton}
          onClick={(e) => { e.stopPropagation(); onChange(null) }}
          title={t('ui.clear_due_date')}
        >{t('ui.c397')}</span>
      )}
      <input
        ref={inputRef}
        type="date"
        className={styles.hiddenDateInput}
        value={toDateInputValue(value ?? undefined)}
        onChange={handleChange}
      />
    </button>
  )
}
