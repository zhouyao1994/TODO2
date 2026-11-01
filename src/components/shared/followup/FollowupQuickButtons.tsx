import { describeFollowupInterval, formatFollowupIntervalDisplay, type FollowupInterval } from '../../../utils/followup'
import styles from './Followup.module.css'
import { t } from '../../../i18n'

interface FollowupQuickButtonsProps {
  intervals: readonly FollowupInterval[]
  /** `long` = "1 week" (popover); `short` = "1w" (task editor). */
  labelStyle: 'long' | 'short'
  onPick: (interval: FollowupInterval) => void
}

/** Row of interval chips ("1 week" … "3 months"), each counted from today. */
export function FollowupQuickButtons({ intervals, labelStyle, onPick }: FollowupQuickButtonsProps) {
  return (
    <div className={styles.quickRow} role="group" aria-label={t('ui.quick_follow_up_intervals')}>
      {intervals.map((i) => {
        const long = describeFollowupInterval(i)
        return (
          <button
            key={formatFollowupIntervalDisplay(i)}
            type="button"
            className={styles.quickButton}
            onClick={() => onPick(i)}
            title={t('ui.followup_in', { interval: long })}
            aria-label={t('ui.followup_in', { interval: long })}
          >
            {labelStyle === 'long' ? long : formatFollowupIntervalDisplay(i)}
          </button>
        )
      })}
    </div>
  )
}
