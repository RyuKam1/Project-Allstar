/**
 * Canonical typography per theme. ThemeContext loads these families and sets CSS variables.
 */
export const THEME_TYPOGRAPHY = {
  default: {
    main: 'DM Sans',
    header: 'Oswald',
    display: 'Anton',
    mainFallback: 'system-ui, sans-serif',
    headerFallback: 'system-ui, sans-serif',
    displayFallback: 'Oswald, system-ui, sans-serif',
    googleFamilies: [
      { name: 'DM Sans', axis: 'wght', weights: '400;500;600;700' },
      { name: 'Oswald', axis: 'wght', weights: '500;600;700' },
      { name: 'Anton' },
    ],
  },
  tactical: {
    main: 'Rajdhani',
    header: 'Share Tech Mono',
    mainFallback: 'sans-serif',
    headerFallback: 'monospace',
    googleFamilies: [
      { name: 'Rajdhani', axis: 'wght', weights: '500;600;700' },
      { name: 'Share Tech Mono' },
    ],
  },
  kingdom: {
    main: 'Cormorant',
    header: 'Cinzel',
    mainFallback: 'Georgia, serif',
    headerFallback: 'Georgia, serif',
    googleFamilies: [
      { name: 'Cormorant', axis: 'wght', weights: '400;500;600' },
      { name: 'Cinzel', axis: 'wght', weights: '500;700;900' },
    ],
  },
  nightcity: {
    main: 'Montserrat',
    header: 'Barlow Condensed',
    mainFallback: 'system-ui, sans-serif',
    headerFallback: 'system-ui, sans-serif',
    googleFamilies: [
      { name: 'Montserrat', axis: 'wght', weights: '400;500;600' },
      { name: 'Barlow Condensed', axis: 'wght', weights: '400;600;800' },
    ],
  },
  pro: {
    main: 'Inter',
    header: 'Teko',
    mainFallback: 'system-ui, sans-serif',
    headerFallback: 'system-ui, sans-serif',
    googleFamilies: [
      { name: 'Inter', axis: 'wght', weights: '400;500;600' },
      { name: 'Teko', axis: 'wght', weights: '400;500;600;700' },
    ],
  },
  retro: {
    main: 'Share Tech Mono',
    header: 'Orbitron',
    mainFallback: 'monospace',
    headerFallback: 'sans-serif',
    googleFamilies: [
      { name: 'Share Tech Mono' },
      { name: 'Orbitron', axis: 'wght', weights: '500;700;900' },
    ],
  },
  minimal: {
    main: 'IBM Plex Sans',
    header: 'IBM Plex Sans',
    mainFallback: 'system-ui, sans-serif',
    headerFallback: 'system-ui, sans-serif',
    googleFamilies: [
      { name: 'IBM Plex Sans', axis: 'wght', weights: '400;500;600' },
    ],
  },
  street: {
    main: 'Rubik',
    header: 'Teko',
    mainFallback: 'system-ui, sans-serif',
    headerFallback: 'system-ui, sans-serif',
    googleFamilies: [
      { name: 'Rubik', axis: 'wght', weights: '400;500;600;700' },
      { name: 'Teko', axis: 'wght', weights: '400;500;600;700' },
    ],
  },
  utility: {
    main: 'Work Sans',
    header: 'Archivo Narrow',
    mainFallback: 'system-ui, sans-serif',
    headerFallback: 'system-ui, sans-serif',
    googleFamilies: [
      { name: 'Work Sans', axis: 'wght', weights: '400;500;600;700' },
      { name: 'Archivo Narrow', axis: 'wght', weights: '500;600;700' },
    ],
  },
  maximalist: {
    main: 'Space Grotesk',
    header: 'Bebas Neue',
    mainFallback: 'system-ui, sans-serif',
    headerFallback: 'system-ui, sans-serif',
    googleFamilies: [
      { name: 'Space Grotesk', axis: 'wght', weights: '400;500;600;700' },
      { name: 'Bebas Neue' },
    ],
  },
};

function encodeFamily(name) {
  return name.replace(/ /g, '+');
}

function familyParam(family) {
  const encoded = encodeFamily(family.name);
  if (!family.axis) {
    return `family=${encoded}`;
  }
  return `family=${encoded}:${family.axis}@${family.weights}`;
}

export const VALID_THEME_IDS = Object.keys(THEME_TYPOGRAPHY);

export function normalizeThemeId(themeId) {
  return VALID_THEME_IDS.includes(themeId) ? themeId : 'default';
}

export function getThemeTypography(themeId = 'default') {
  return THEME_TYPOGRAPHY[normalizeThemeId(themeId)];
}

export function getThemeStyleObject(themeId = 'default') {
  const typo = getThemeTypography(themeId);
  const style = {
    '--font-main': `'${typo.main}', ${typo.mainFallback}`,
    '--font-header': `'${typo.header}', ${typo.headerFallback}`,
  };
  if (typo.display) {
    style['--font-display'] = `'${typo.display}', ${typo.displayFallback || typo.headerFallback}`;
  }
  return style;
}

export function getThemeFontsUrl(themeId = 'default') {
  const typo = getThemeTypography(themeId);
  const params = typo.googleFamilies.map(familyParam);
  return `https://fonts.googleapis.com/css2?${params.join('&')}&display=swap`;
}

export function applyThemeTypography(themeId = 'default') {
  if (typeof document === 'undefined') return;

  const typo = getThemeTypography(themeId);
  const root = document.documentElement;

  root.style.setProperty('--font-main', `'${typo.main}', ${typo.mainFallback}`);
  root.style.setProperty('--font-header', `'${typo.header}', ${typo.headerFallback}`);
  if (typo.display) {
    root.style.setProperty('--font-display', `'${typo.display}', ${typo.displayFallback || typo.headerFallback}`);
  }

  let link = document.getElementById('theme-fonts');
  if (!link) {
    link = document.createElement('link');
    link.id = 'theme-fonts';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }
  link.href = getThemeFontsUrl(themeId);
}

export const DEFAULT_THEME_FONTS_URL = getThemeFontsUrl('default');

export const THEME_COOKIE_NAME = 'allstar_theme';
export const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function buildThemeCookieValue(themeId) {
  return `${THEME_COOKIE_NAME}=${encodeURIComponent(normalizeThemeId(themeId))};path=/;max-age=${THEME_COOKIE_MAX_AGE};SameSite=Lax`;
}
