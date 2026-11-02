import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { DEFAULT_THEMED_COLORS, THEME_COLOR_VARS, type ThemeColors, type ThemeName } from '../../models/theme-colors'
import {
  DEFAULT_PALETTE_ID,
  THEME_PALETTES,
  isThemePaletteId,
  themePaletteSeeds,
  type ThemePaletteId,
} from '../../models/ui-themes'

/** The `--name: value;` declarations of the first rule whose selector list starts with `selector`. */
function declarations(css: string, selector: string): Map<string, string> {
  const start = css.indexOf(selector)
  if (start < 0) throw new Error(`no ${selector} rule`)
  const body = css.slice(css.indexOf('{', start) + 1, css.indexOf('\n}', start))
  const out = new Map<string, string>()
  for (const m of body.matchAll(/^\s*(--[\w-]+):\s*([^;]+);/gm)) out.set(m[1]!, m[2]!.trim())
  return out
}

const css = readFileSync(resolve(__dirname, '../../styles/tokens.css'), 'utf8')
const MODES: ReadonlyArray<ThemeName> = ['dark', 'light']

describe('theme palettes', () => {
  it('the default palette is first and its seeds are DEFAULT_THEMED_COLORS', () => {
    expect(THEME_PALETTES[0]?.id).toBe(DEFAULT_PALETTE_ID)
    expect(themePaletteSeeds(DEFAULT_PALETTE_ID)).toEqual({
      dark: { ...DEFAULT_THEMED_COLORS.dark },
      light: { ...DEFAULT_THEMED_COLORS.light },
    })
  })

  it('the palette ids are unique and every one reads as a palette id', () => {
    const ids = THEME_PALETTES.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) expect(isThemePaletteId(id)).toBe(true)
    expect(isThemePaletteId('dracula')).toBe(false)
    expect(isThemePaletteId('constructor')).toBe(false)
    expect(isThemePaletteId(7)).toBe(false)
  })

  it('the default palette has no tokens.css block of its own (it is the base blocks)', () => {
    expect(css.includes(`[data-palette="${DEFAULT_PALETTE_ID}"]`)).toBe(false)
  })

  it.each(THEME_PALETTES.filter((p) => p.id !== DEFAULT_PALETTE_ID))(
    'the %s seeds are the stylesheet values the overrides replace',
    (palette) => {
      const seeds = themePaletteSeeds(palette.id as ThemePaletteId)
      for (const theme of MODES) {
        const tokens = declarations(css, `[data-palette="${palette.id}"][data-theme="${theme}"] {`)
        const expected = Object.fromEntries(
          Object.entries(THEME_COLOR_VARS).map(([name, cssVar]) => [name, tokens.get(cssVar)]),
        )
        expect(seeds[theme] satisfies ThemeColors).toEqual(expected)
      }
    },
  )
})
