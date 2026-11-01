import { useRef } from 'react'
import { useFollowupInput, NEXT_FOLLOWUP_PLACEHOLDER, type FollowupInputState } from '../../../hooks/use-followup-input'
import { useSelectAllOnFocus } from '../../../hooks/use-select-all-on-focus'
import { useToday } from '../../../hooks/use-today'
import { addFollowupInterval, formatFollowupDate, relativeDayPhrase, QUICK_FOLLOWUP_INTERVALS } from '../../../utils/followup'
import { startOfDay } from '../../../utils/date'
import { FollowedUpIcon, FollowupFlagIcon } from '../FollowupIcons'
import { FollowupDateButton } from './FollowupDateButton'
import { FollowupQuickButtons } from './FollowupQuickButtons'
import styles from './Followup.module.css'
import { t } from '../../../i18n'

interface FollowupEditorGroupProps {
  next: Date | undefined
  last: Date | undefined
  onNextChange: (date: Date | null) => void
  onLastChange: (date: Date | null) => void
  onFollowedUp: () => void
  /** Replaces the Next hint while the input shows the stored value (create mode: `Default · 1 month`). */
  nextHint?: string
  /** Focus (click, Tab) selects the Next field's text — create mode, while it shows the untouched default. */
  selectNextOnFocus?: boolean
  /** Hides the Last row and the Mark followed up button (a draft task has no history). */
  hideLast?: boolean
  /** Row / label classes from the host editor so the group lines up with its other rows. */
  rowClassName?: string
  labelClassName?: string
}

function HelpText({ state, today, fallback, fallbackClass }: {
  state: FollowupInputState
  today: Date
  fallback: React.ReactNode
  fallbackClass?: string
}) {
  if (state.kind === 'invalid') return <span className={`${styles.editorHint} ${styles.helpError}`}>{state.message}</span>
  if (state.kind === 'valid') {
    return (
      <span className={styles.editorHint}>
        → <strong className={styles.helpDate}>{formatFollowupDate(state.date, today)}</strong>
        {' · '}{relativeDayPhrase(state.date, today)}
      </span>
    )
  }
  return <span className={`${styles.editorHint} ${fallbackClass ?? ''}`}>{fallback}</span>
}

/**
 * Task editor's Follow-up group: Next (interval or date, × clears, date picker, quick
 * intervals) and Last (date, never in the future, date picker) plus the
 * "Mark followed up" button. ⏎ / Tab / blur commit; Esc reverts; invalid input
 * keeps the old value until fixed.
 */
export function FollowupEditorGroup({
  next, last, onNextChange, onLastChange, onFollowedUp, nextHint, selectNextOnFocus = false,
  hideLast = false, rowClassName, labelClassName,
}: FollowupEditorGroupProps) {
  const today = useToday()
  const nextInput = useFollowupInput(next, 'next', today)
  const lastInput = useFollowupInput(last, 'last', today)
  const skipCommitRef = useRef(false)
  const selectNext = useSelectAllOnFocus(selectNextOnFocus)

  const commit = (input: typeof nextInput, onChange: (d: Date | null) => void) => {
    if (skipCommitRef.current) {
      skipCommitRef.current = false
      return
    }
    const s = input.state
    if (s.kind === 'empty') {
      onChange(null)
      input.settle(null)
    } else if (s.kind === 'valid') {
      onChange(s.date)
      input.settle(s.date)
    }
  }

  const keyHandler = (input: typeof nextInput) => (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      e.currentTarget.blur()
    } else if (e.key === 'Escape') {
      // Revert without committing; keep the editor open.
      e.preventDefault()
      e.stopPropagation()
      skipCommitRef.current = true
      input.reset()
      e.currentTarget.blur()
    }
  }

  const lastIsToday = !!last && startOfDay(last).getTime() === today.getTime()

  return (
    <div className={styles.editorGroup}>
      <div className={styles.editorHeading}>
        <FollowupFlagIcon />
        {t('ui.follow_up')}</div>

      <div className={rowClassName}>
        <span className={labelClassName}>{t('ui.next')}</span>
        <div className={`${styles.editorInputWrap} ${nextInput.state.kind === 'invalid' ? styles.inputWrapError : ''}`}>
          <input
            className={styles.input}
            value={nextInput.text}
            placeholder={NEXT_FOLLOWUP_PLACEHOLDER}
            onChange={(e) => { skipCommitRef.current = false; nextInput.change(e.target.value) }}
            onMouseDown={selectNext.onMouseDown}
            onMouseUp={selectNext.onMouseUp}
            onFocus={(e) => { skipCommitRef.current = false; selectNext.onFocus(e) }}
            onBlur={() => commit(nextInput, onNextChange)}
            onKeyDown={keyHandler(nextInput)}
            aria-label={t('ui.next_follow_up')}
            aria-invalid={nextInput.state.kind === 'invalid'}
            autoComplete="off"
            spellCheck={false}
          />
          {nextInput.text !== '' && (
            <button
              type="button"
              className={styles.inputClear}
              aria-label={t('ui.clear_next_follow_up')}
              title={t('ui.clear_next_follow_up')}
              // Keep the input's blur from committing the text we're about to clear.
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { onNextChange(null); nextInput.settle(null) }}
            >
              {t('ui.c397')}</button>
          )}
          <FollowupDateButton
            label={t('ui.pick_next_follow_up_date')}
            value={next}
            onPick={(d) => { onNextChange(d); nextInput.settle(d) }}
          />
        </div>
        <HelpText
          state={nextInput.state}
          today={today}
          fallback={nextHint ?? nextInput.storedHint ?? 'None'}
        />
        <FollowupQuickButtons
          intervals={QUICK_FOLLOWUP_INTERVALS}
          labelStyle="short"
          onPick={(i) => {
            const d = addFollowupInterval(today, i)
            onNextChange(d)
            nextInput.settle(d)
          }}
        />
      </div>

      {!hideLast && <div className={rowClassName}>
        <span className={labelClassName}>{t('ui.last')}</span>
        <div className={`${styles.editorInputWrap} ${lastInput.state.kind === 'invalid' ? styles.inputWrapError : ''}`}>
          <input
            className={styles.input}
            value={lastInput.text}
            placeholder={t('ui.never')}
            onChange={(e) => { skipCommitRef.current = false; lastInput.change(e.target.value) }}
            onFocus={() => { skipCommitRef.current = false }}
            onBlur={() => commit(lastInput, onLastChange)}
            onKeyDown={keyHandler(lastInput)}
            aria-label={t('ui.last_follow_up')}
            aria-invalid={lastInput.state.kind === 'invalid'}
            autoComplete="off"
            spellCheck={false}
          />
          <FollowupDateButton
            label={t('ui.pick_last_follow_up_date')}
            value={last}
            max={today}
            onPick={(d) => { onLastChange(d); lastInput.settle(d) }}
          />
        </div>
        <HelpText
          state={lastInput.state}
          today={today}
          fallback={lastIsToday ? '✓ Today' : (lastInput.storedHint ?? '')}
          fallbackClass={lastIsToday ? styles.editorHintAccent : undefined}
        />
        <button
          type="button"
          className={`${styles.followedUpSecondary} ${lastIsToday ? styles.followedUpDone : ''}`}
          onClick={onFollowedUp}
          data-done-today={lastIsToday ? 'true' : undefined}
        >
          <FollowedUpIcon />
          {t('ui.mark_followed_up')}</button>
      </div>}
    </div>
  )
}
