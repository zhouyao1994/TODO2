import { expect, test, type Page } from '@playwright/test'
import { openSettings, seedWorkspace, type WorkspaceSeed } from './fixtures/workspace'

/**
 * Color themes (Settings › Appearance › Color theme): picking one sets
 * `data-palette` on `<html>` next to `data-theme`, re-colors the app at
 * once, keeps working when the Light / Dark mode flips, and survives a
 * reload (its `themePalette` settings row). The computed background is
 * pinned to each palette's app-bg token so a recolored app is really
 * asserted, not just an attribute.
 */

const SEED: WorkspaceSeed = {
  listDefinitions: [{ name: 'Team' }],
  tasks: [{ title: 'A task' }],
  layouts: [{ name: 'Main', columns: [{ id: 'c', cells: [{ id: 'k', tabs: [{ id: 'list', kind: 'lens', listDefIdx: 0 }] }] }] }],
}

async function setPalette(page: Page, id: string) {
  await page.evaluate(async (palette) => {
    const mod = (await import(/* @vite-ignore */ '/src/stores/settings-store.ts' as string)) as {
      useSettingsStore: { getState: () => { setThemePalette: (id: string) => Promise<void> } }
    }
    await mod.useSettingsStore.getState().setThemePalette(palette)
  }, id)
  await expect(page.locator('html')).toHaveAttribute('data-palette', id)
}

async function setMode(page: Page, mode: 'dark' | 'light') {
  await page.evaluate(async (m) => {
    const mod = (await import(/* @vite-ignore */ '/src/stores/settings-store.ts' as string)) as {
      useSettingsStore: { getState: () => { setThemeMode: (mode: 'dark' | 'light') => Promise<void> } }
    }
    await mod.useSettingsStore.getState().setThemeMode(m)
  }, mode)
  await expect(page.locator('html')).toHaveAttribute('data-theme', mode)
}

const bodyBg = (page: Page) => page.evaluate(() => getComputedStyle(document.body).backgroundColor)

test.beforeEach(async ({ page }) => {
  await seedWorkspace(page, SEED)
})

test('a color theme re-colors the app, composes with the mode, and survives a reload', async ({ page }) => {
  await setPalette(page, 'nord')
  expect(await bodyBg(page)).toBe('rgb(46, 52, 64)') // Nord dark's app bg

  await setMode(page, 'light')
  expect(await bodyBg(page)).toBe('rgb(231, 235, 241)') // Nord light's app bg

  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-palette', 'nord')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  expect(await bodyBg(page)).toBe('rgb(231, 235, 241)')
})

test('the Appearance picker shows every palette, checks the active one, and switches on click', async ({ page }) => {
  const dialog = await openSettings(page, 'Appearance')
  const group = dialog.getByRole('radiogroup', { name: 'Color theme' })
  for (const label of ['Default', 'Nord', 'Solarized', 'Rosé Pine', 'Everforest']) {
    await expect(group.getByRole('radio', { name: label })).toBeVisible()
  }
  await expect(group.getByRole('radio', { name: 'Default' })).toHaveAttribute('aria-checked', 'true')

  await group.getByRole('radio', { name: 'Solarized' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-palette', 'solarized')
  await expect(group.getByRole('radio', { name: 'Solarized' })).toHaveAttribute('aria-checked', 'true')
  expect(await bodyBg(page)).toBe('rgb(0, 43, 54)') // Solarized dark's app bg
})
