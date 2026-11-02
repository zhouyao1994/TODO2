import { describe, it, expect } from 'vitest'
import { contrast, resolveColor, sourceFiles, themeTokens, paletteTokens, type PaletteName, type ThemeName } from './css-source'

/** WCAG AA for normal-size text. */
const AA_TEXT = 4.5
/** WCAG AA for graphics (a checkmark, a knob) and large text. */
const AA_GRAPHIC = 3

function ratioTokens(tokens: Map<string, string>, fg: string, bg: string): number {
  const value = (name: string) => {
    const v = tokens.get(name)
    if (v === undefined) throw new Error(`no ${name}`)
    return v
  }
  return contrast(resolveColor(value(fg), tokens), resolveColor(value(bg), tokens))
}

function ratio(theme: ThemeName, fg: string, bg: string): number {
  return ratioTokens(themeTokens(theme), fg, bg)
}

/** Every palette mode the stylesheet draws (the default palette is the base blocks). */
const PALETTE_MODES: ReadonlyArray<[PaletteName | 'default', ThemeName]> = [
  ['default', 'dark'], ['default', 'light'],
  ['nord', 'dark'], ['nord', 'light'],
  ['solarized', 'dark'], ['solarized', 'light'],
  ['rose-pine', 'dark'], ['rose-pine', 'light'],
  ['everforest', 'dark'], ['everforest', 'light'],
]

function paletteModeTokens(palette: PaletteName | 'default', theme: ThemeName): Map<string, string> {
  return palette === 'default' ? themeTokens(theme) : paletteTokens(palette, theme)
}

describe('text contrast (WCAG AA)', () => {
  it.each(PALETTE_MODES)('%s %s: muted text reads on every surface it sits on', (palette, theme) => {
    const tokens = paletteModeTokens(palette, theme)
    for (const bg of ['--color-surface', '--color-surface-high', '--color-app-bg', '--color-header-bg', '--color-popover-bg']) {
      expect(ratioTokens(tokens, '--color-text-muted', bg), `${palette} ${theme} muted on ${bg}`).toBeGreaterThanOrEqual(AA_TEXT)
    }
  })

  it.each(PALETTE_MODES)('%s %s: the accent as text reads on the surfaces', (palette, theme) => {
    const tokens = paletteModeTokens(palette, theme)
    for (const bg of ['--color-surface', '--color-surface-high', '--color-app-bg', '--color-popover-bg']) {
      expect(ratioTokens(tokens, '--color-accent-text', bg), `${palette} ${theme} accent text on ${bg}`).toBeGreaterThanOrEqual(AA_TEXT)
    }
  })

  it.each(PALETTE_MODES)('%s %s: a checkmark on the accent fill stands out', (palette, theme) => {
    expect(ratioTokens(paletteModeTokens(palette, theme), '--color-text-on-accent', '--color-accent')).toBeGreaterThanOrEqual(AA_GRAPHIC)
  })

  it('the light accent as text follows an accent colour override', () => {
    // Mixed from the accent, so `color.light.accent` (an inline --color-accent) carries over.
    expect(themeTokens('light').get('--color-accent-text')).toMatch(/var\(--color-accent\)/)
    expect(themeTokens('dark').get('--color-accent-text')).toBe('var(--color-accent)')
  })

  it('dark: a danger button’s label reads on its fill', () => {
    expect(ratio('dark', '--color-surface', '--color-danger')).toBeGreaterThanOrEqual(AA_TEXT)
  })
})

/** Literal white is theme-blind: on the dark theme's light accent or danger fills it all but vanishes. */
describe('no hard-coded white in component styles', () => {
  // The check-in email preview is an email: white paper in either theme.
  const ALLOWED = new Set(['components/checkin/CheckinDialog.module.css'])

  it('every white comes from a token', () => {
    const offenders = sourceFiles(/\.module\.css$/)
      .filter(([path]) => !ALLOWED.has(path))
      .flatMap(([path, css]) => css
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .split('\n')
        .filter((line) => /:\s*[^;]*(#fff\b|#ffffff\b|\bwhite\b)/i.test(line) && !/white-space/.test(line))
        .map((line) => `${path}: ${line.trim()}`))
    expect(offenders).toEqual([])
  })
})
