import { t } from '../../i18n'
/** The Delete layout confirm's body: what goes (the layout and its `ownedLists` lists), and what stays. */
export function deleteLayoutMessage(ownedLists: number): string {
  if (ownedLists === 0) return t('ui.delete_layout_msg_none')
  const lists = ownedLists === 1 ? t('ui.its_list') : t('ui.its_lists', { n: ownedLists })
  return t('ui.delete_layout_msg_lists', { lists })
}
