/**
 * The UI theme palettes: the named colour schemes Settings › Appearance
 * ("Color theme") offers on top of the Light / Dark mode. A palette is a
 * full look — backgrounds, text, accents and the semantic colours — drawn
 * for both modes: picking one sets `data-palette` on `<html>` while the
 * mode keeps driving `data-theme`, so System / Light / Dark keep working
 * under every palette.
 *
 * Each palette's nine editable colours (`ThemeColors`) are the seeds the
 * settings store shows and resets to while that palette is active — the
 * same mirroring rule as `DEFAULT_THEMED_COLORS`: the values are also
 * written as token blocks in `styles/tokens.css` (`[data-palette="…"]
 * [data-theme="…"]`), and `src/test/models/ui-themes.test.ts` fails when
 * the two drift apart.
 */
import { DEFAULT_THEMED_COLORS, type ThemedColors } from './theme-colors'

export type ThemePaletteId = 'default' | 'nord' | 'solarized' | 'rose-pine' | 'everforest'

export const DEFAULT_PALETTE_ID: ThemePaletteId = 'default'

export interface ThemePalette {
  id: ThemePaletteId
  label: string
  /** The nine editable colours as this palette draws them, per mode. */
  colors: ThemedColors
}

/** The app's original look (no `data-palette` block of its own in tokens.css). */
const DEFAULT_PALETTE: ThemePalette = {
  id: 'default',
  label: 'Default',
  colors: {
    dark: { ...DEFAULT_THEMED_COLORS.dark },
    light: { ...DEFAULT_THEMED_COLORS.light },
  },
}

const NORD: ThemePalette = {
  id: 'nord',
  label: 'Nord',
  colors: {
    dark: {
      accent: '#8fc5d4',
      appBg: '#2e3440',
      surface: '#3b4252',
      border: '#4c566a',
      header: '#384153',
      danger: '#eba4ab',
      warning: '#e6b19f',
      star: '#ebcb8b',
      deadline: '#c9a6c2',
    },
    light: {
      accent: '#3f7e9c',
      appBg: '#e7ebf1',
      surface: '#fbfcfd',
      border: '#d3dae3',
      header: '#e9f2f6',
      danger: '#a94a52',
      warning: '#9a5727',
      star: '#7c5f10',
      deadline: '#8d5387',
    },
  },
}

const SOLARIZED: ThemePalette = {
  id: 'solarized',
  label: 'Solarized',
  colors: {
    dark: {
      accent: '#55beb4',
      appBg: '#002b36',
      surface: '#073642',
      border: '#1a4f5c',
      header: '#0a4150',
      danger: '#ec8177',
      warning: '#cfa42e',
      star: '#e0c05e',
      deadline: '#e57fb0',
    },
    light: {
      accent: '#1f8b83',
      appBg: '#eee8d5',
      surface: '#fdf6e3',
      border: '#ddd3b8',
      header: '#f5efdd',
      danger: '#b33832',
      warning: '#b05a12',
      star: '#7d6210',
      deadline: '#a12f77',
    },
  },
}

const ROSE_PINE: ThemePalette = {
  id: 'rose-pine',
  label: 'Rosé Pine',
  colors: {
    dark: {
      accent: '#9ccfd8',
      appBg: '#191724',
      surface: '#1f1d2e',
      border: '#3b3554',
      header: '#252239',
      danger: '#eb6f92',
      warning: '#ea9a97',
      star: '#f6c177',
      deadline: '#c4a7e7',
    },
    light: {
      accent: '#3e7e89',
      appBg: '#f3ebe2',
      surface: '#fdfaf4',
      border: '#e2d7ca',
      header: '#ebf0ec',
      danger: '#a34f66',
      warning: '#ab4f20',
      star: '#7a5c1c',
      deadline: '#7a5f96',
    },
  },
}

const EVERFOREST: ThemePalette = {
  id: 'everforest',
  label: 'Everforest',
  colors: {
    dark: {
      accent: '#8ec79c',
      appBg: '#2d353b',
      surface: '#343f44',
      border: '#475258',
      header: '#394642',
      danger: '#ec9290',
      warning: '#edab92',
      star: '#dbbc7f',
      deadline: '#d699b6',
    },
    light: {
      accent: '#3a7d6a',
      appBg: '#f2ecdb',
      surface: '#faf5e6',
      border: '#ddd4bc',
      header: '#ebf1e4',
      danger: '#b54c45',
      warning: '#a05a1d',
      star: '#7d6210',
      deadline: '#a24a83',
    },
  },
}

/** The palettes Appearance offers, default first. */
export const THEME_PALETTES: readonly ThemePalette[] = [DEFAULT_PALETTE, NORD, SOLARIZED, ROSE_PINE, EVERFOREST]

/** The seeds of one palette (a new object: callers may hand the bags to the store). */
export function themePaletteSeeds(id: ThemePaletteId): ThemedColors {
  const palette = THEME_PALETTES.find((p) => p.id === id) ?? DEFAULT_PALETTE
  return {
    dark: { ...palette.colors.dark },
    light: { ...palette.colors.light },
  }
}

/** Whether `v` is one of the palette ids this build knows. */
export function isThemePaletteId(v: unknown): v is ThemePaletteId {
  return typeof v === 'string' && THEME_PALETTES.some((p) => p.id === v)
}
