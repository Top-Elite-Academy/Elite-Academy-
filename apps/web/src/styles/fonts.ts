import {
  Cinzel,
  Cormorant_Garamond,
  IBM_Plex_Mono,
  IBM_Plex_Sans,
  IBM_Plex_Sans_Arabic,
  IBM_Plex_Sans_Hebrew,
} from 'next/font/google';

/**
 * Brand fonts. next/font downloads them at build time and serves them from our
 * own domain (spec §10: fonts self-hosted; CSP font-src 'self').
 * Cinzel and Cormorant have no Arabic/Hebrew letters: the browser falls back to
 * IBM Plex Sans Arabic / Hebrew through the font stacks in globals.css.
 */
const display = Cinzel({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-cinzel',
  display: 'swap',
});

const sans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-plex-sans',
  display: 'swap',
});

const arabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-plex-arabic',
  display: 'swap',
});

const hebrew = IBM_Plex_Sans_Hebrew({
  subsets: ['hebrew'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-plex-hebrew',
  display: 'swap',
});

const mono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-plex-mono',
  display: 'swap',
});

const serif = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['500'],
  style: ['italic'],
  variable: '--font-cormorant',
  display: 'swap',
});

/** Put on <html> so the CSS variables are available everywhere. */
export const fontVariables = [display, sans, arabic, hebrew, mono, serif]
  .map((font) => font.variable)
  .join(' ');
