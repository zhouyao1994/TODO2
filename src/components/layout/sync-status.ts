import { locale, t } from '../../i18n'
import { useMemo } from 'react'
import { useFileStorageStore } from '../../services/file-storage-store'
import { useFileOpsStore } from '../../stores/file-ops-store'
import type { SyncPauseReason } from '../../services/file-storage'

/**
 * Everything the storage pill (desktop) and the phone's status button say
 * about where the data lives and what needs the user: one state, the most
 * urgent first — Permission needed › Sync paused › Sync error › Backup
 * warning › Synced / Local only.
 */
export type StoragePillKind = 'local' | 'syncing' | 'permission' | 'paused' | 'error' | 'backup'

export interface StoragePillInput {
  isConnected: boolean
  fileName: string | null
  needsPermission: boolean
  paused: { reason?: SyncPauseReason; message: string } | null
  error: string | null
  dismissedError: string | null
  /** A backup that would not restore, or an operation run without one (`file-ops-store`). */
  snapshotWarning: string | null
}

/** Something waiting for the user, in the pill's order. */
export type SyncWarning =
  | { kind: 'permission'; fileName: string; refused: boolean }
  | { kind: 'paused'; reason: SyncPauseReason | null; message: string; fileName: string | null }
  | { kind: 'error'; message: string }
  | { kind: 'backup'; message: string }

export interface StoragePillState {
  kind: StoragePillKind
  text: string
  /** How many warnings are active (the pill's count badge from two on). */
  warningCount: number
}

/** The error texts that mean the browser said no to Grant access. */
const REFUSED_ERRORS: ReadonlySet<string> = new Set(['Permission denied', 'Could not get file access'])

/**
 * The active warnings, most urgent first. An error isn't its own warning
 * while permission is needed or sync is paused (it is that state's cause —
 * a refused grant shows as the permission warning's flag), nor once the
 * user dismissed that error.
 */
export function syncWarnings(s: StoragePillInput): SyncWarning[] {
  const out: SyncWarning[] = []
  if (s.needsPermission) {
    out.push({ kind: 'permission', fileName: s.fileName ?? 'the sync file', refused: s.error != null && REFUSED_ERRORS.has(s.error) })
  }
  // Sync paused (unreadable / newer / older file, or a cancelled prompt):
  // nothing has been written either way until the user picks a way forward.
  if (s.paused) out.push({ kind: 'paused', reason: s.paused.reason ?? null, message: s.paused.message, fileName: s.fileName })
  if (s.error != null && s.error !== s.dismissedError && !s.needsPermission && !s.paused) {
    out.push({ kind: 'error', message: s.error })
  }
  if (s.snapshotWarning) out.push({ kind: 'backup', message: s.snapshotWarning })
  return out
}

const WARNING_TEXT: Record<SyncWarning['kind'], 'ui.warn_permission' | 'ui.warn_paused' | 'ui.warn_error' | 'ui.warn_backup'> = {
  permission: 'ui.warn_permission',
  paused: 'ui.warn_paused',
  error: 'ui.warn_error',
  backup: 'ui.warn_backup',
}

/**
 * The pill's state: its most urgent warning, else Synced (syncing to the
 * file — its name is in the pill's tooltip and popover), else Local only.
 */
export function storagePillState(s: StoragePillInput): StoragePillState {
  const warnings = syncWarnings(s)
  const first = warnings.at(0)
  if (first) return { kind: first.kind, text: t(WARNING_TEXT[first.kind]), warningCount: warnings.length }
  if (s.isConnected) return { kind: 'syncing', text: t('ui.synced'), warningCount: 0 }
  return { kind: 'local', text: t('ui.local_only'), warningCount: 0 }
}

/** The pill's accessible name: `Storage: <text>`, plus the count when several warnings are active. */
export function storagePillLabel(state: StoragePillState): string {
  return state.warningCount > 1 ? t('ui.storage_warnings', { text: state.text, count: state.warningCount }) : t('ui.storage_label', { text: state.text })
}

/** Red for a failure; amber for waiting on the user; none for Local only / Syncing. */
export function warningTone(kind: StoragePillKind): 'danger' | 'warning' | null {
  if (kind === 'error') return 'danger'
  if (kind === 'local' || kind === 'syncing') return null
  return 'warning'
}

/** A warning in words: its title, why it shows, an optional flag line and what it means. */
export interface SyncWarningCopy {
  title: string
  why: string
  flag: string | null
  body: string | null
}

const PAUSED_PREFIX = 'File sync paused — '

/**
 * A paused message without its `File sync paused — ` prefix, as a sentence:
 * a capital first letter — unless it starts with the file's name, which is
 * shown as it is spelled.
 */
function pausedWhy(message: string, fileName: string | null): string {
  const rest = message.startsWith(PAUSED_PREFIX) ? message.slice(PAUSED_PREFIX.length) : message
  if (fileName && rest.startsWith(fileName)) return rest
  return rest.charAt(0).toUpperCase() + rest.slice(1)
}

function pausedBody(reason: SyncPauseReason | null): string | null {
  // After a failed write-back the browser already holds the file's data.
  if (reason === 'write-failed') return null
  const untouched = t('ui.pause_untouched')
  if (reason === 'conflict-cancelled') {
    return `${untouched} ${t('ui.pause_body_conflict')}`
  }
  if (reason === 'too-new') return `${untouched} ${t('ui.pause_body_too_new')}`
  if (reason === 'too-old') return `${untouched} ${t('ui.pause_body_too_old')}`
  return untouched
}

/** A backup warning that a saved backup would not restore (the others say none was saved). */
export function isUnrestorableBackupWarning(message: string): boolean {
  return message.startsWith('Backup snapshot (')
}


/**
 * A stored file-sync pause message, rebuilt in the UI language from its
 * reason (the stored text stays English for matching); unknown reasons fall
 * back to the stored sentence.
 */
function pausedWhyLocalized(w: Extract<SyncWarning, { kind: 'paused' }>): string {
  // English keeps the stored sentence byte-for-byte; Chinese rebuilds it.
  if (locale() !== 'zh-CN') return pausedWhy(w.message, w.fileName)
  const file = w.fileName ?? ''
  switch (w.reason) {
    case 'write-failed': return t('ui.pause_write_failed', { file })
    case 'conflict-cancelled': return t('ui.pause_conflict_cancelled', { file })
    case 'too-large': return t('ui.pause_too_large')
    case 'read-error': return t('ui.pause_read_error')
    case 'invalid-json': return t('ui.pause_invalid_json')
    case 'backup-failed': return t('ui.pause_backup_failed', { file: file || '' })
    case 'upgrade-cancelled': return t('ui.pause_upgrade_cancelled', { file: file || '' })
    case 'too-new': return t('ui.pause_too_new')
    case 'too-old': return t('ui.pause_too_old')
    case 'upgrade-failed': return t('ui.pause_upgrade_failed')
    default: return pausedWhy(w.message, w.fileName)
  }
}

/** A stored error/snapshot text in the UI language; unknown texts pass through. */
export function fileErrorCopy(message: string): string {
  const known: ReadonlyArray<[string, () => string]> = [
    ['Permission denied', () => t('ui.err_permission_denied')],
    ['Could not get file access', () => t('ui.err_no_file_access')],
    ['Failed to open file', () => t('ui.err_open_failed')],
    ['Failed to create file', () => t('ui.err_create_failed')],
    ['File not found — it may have been moved or deleted', () => t('ui.err_file_missing')],
    ['Failed to save to file', () => t('ui.err_save_failed')],
    ['Failed to initialize file storage', () => t('ui.err_init_failed')],
    ['Failed to reconnect to file', () => t('ui.err_reconnect_failed')],
    ['Failed to read file', () => t('ui.err_read_failed')],
  ]
  for (const [en, say] of known) if (message === en) return say()
  return message
}

/** One warning's words — shared by the pill's popover and the phone's status sheet. */
export function syncWarningCopy(w: SyncWarning): SyncWarningCopy {
  switch (w.kind) {
    case 'permission':
      return {
        title: t(WARNING_TEXT.permission),
        why: t('ui.pause_permission_why', { file: w.fileName }),
        flag: w.refused ? t('ui.pause_refused_flag') : null,
        body: t('ui.pause_permission_body'),
      }
    case 'paused':
      return { title: t(WARNING_TEXT.paused), why: pausedWhyLocalized(w), flag: null, body: pausedBody(w.reason) }
    case 'error':
      return {
        title: t(WARNING_TEXT.error),
        why: fileErrorCopy(w.message),
        flag: null,
        body: t('ui.pause_error_body'),
      }
    case 'backup':
      return {
        title: t(WARNING_TEXT.backup),
        why: fileErrorCopy(w.message),
        flag: null,
        body: isUnrestorableBackupWarning(w.message)
          ? t('ui.pause_backup_check')
          : t('ui.pause_backup_free'),
      }
  }
}

/** The storage state from the stores, as `storagePillState` reads it. */
export function useStoragePillInput(): StoragePillInput {
  const isConnected = useFileStorageStore((s) => s.isConnected)
  const fileName = useFileStorageStore((s) => s.fileName)
  const needsPermission = useFileStorageStore((s) => s.needsPermission)
  const paused = useFileStorageStore((s) => s.paused)
  const error = useFileStorageStore((s) => s.error)
  const dismissedError = useFileStorageStore((s) => s.dismissedError)
  const snapshotWarning = useFileOpsStore((s) => s.snapshotWarning)
  return useMemo(
    () => ({ isConnected, fileName, needsPermission, paused, error, dismissedError, snapshotWarning }),
    [isConnected, fileName, needsPermission, paused, error, dismissedError, snapshotWarning],
  )
}

/** The storage pill's state and its active warnings, from the stores. */
export function useStorageStatus(): { state: StoragePillState; warnings: SyncWarning[] } {
  const input = useStoragePillInput()
  return useMemo(() => ({ state: storagePillState(input), warnings: syncWarnings(input) }), [input])
}

/** The strip's old "stored locally" dismissal flag; the pill replaced the strip's info branch. */
const LEGACY_BANNER_DISMISSED_KEY = 'todo2-file-sync-banner-dismissed'

/** Drops storage keys nothing reads any more. */
export function removeLegacySyncKeys(): void {
  try {
    localStorage.removeItem(LEGACY_BANNER_DISMISSED_KEY)
  } catch {
    // Storage unavailable (private mode, blocked): nothing to clean up.
  }
}
