import { createTheme } from '@mui/material/styles';

export const AQUA = {
  primary: '#20BFA9',
  dark: '#159A89',
  light: '#E8FAF7',
  veryLight: '#F4FCFB',
  text: '#163B38',
  textSecondary: '#647775',
  border: 'rgba(255,255,255,0.45)',
  footer: '#0F2E2B',
};

/**
 * Shared glassmorphism surface. Spread this into `sx` rather than
 * redeclaring the blur/border/shadow on every frosted element.
 */
export const glass = {
  background: 'rgba(255,255,255,0.55)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(255,255,255,0.5)',
  boxShadow: '0 20px 50px rgba(22,59,56,0.08)',
  borderRadius: 4,
};

export const AQUA_GRADIENT = `linear-gradient(135deg, ${AQUA.primary} 0%, ${AQUA.dark} 100%)`;

const theme = createTheme({
  palette: {
    primary: {
      main: AQUA.primary,
      dark: AQUA.dark,
      light: AQUA.light,
      contrastText: '#FFFFFF',
    },
    background: {
      default: '#FFFFFF',
      paper: AQUA.veryLight,
    },
    text: {
      primary: AQUA.text,
      secondary: AQUA.textSecondary,
    },
    divider: 'rgba(22,59,56,0.10)',
  },
  shape: {
    borderRadius: 20,
  },
  typography: {
    fontFamily: "'Plus Jakarta Sans', 'Inter', system-ui, -apple-system, sans-serif",
    h1: {
      fontWeight: 800,
      letterSpacing: '-0.03em',
      lineHeight: 1.08,
      fontSize: 'clamp(2.4rem, 5.2vw, 4.25rem)',
    },
    h2: {
      fontWeight: 800,
      letterSpacing: '-0.02em',
      lineHeight: 1.15,
      fontSize: 'clamp(1.9rem, 3.4vw, 2.9rem)',
    },
    h3: {
      fontWeight: 700,
      letterSpacing: '-0.015em',
      lineHeight: 1.25,
      fontSize: 'clamp(1.25rem, 1.8vw, 1.6rem)',
    },
    h4: { fontWeight: 700, letterSpacing: '-0.01em' },
    h5: { fontWeight: 700 },
    h6: { fontWeight: 700 },
    body1: { lineHeight: 1.7, fontSize: '1.0625rem' },
    body2: { lineHeight: 1.7 },
    button: { fontWeight: 600 },
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          borderRadius: 999,
          textTransform: 'none',
          paddingInline: 26,
          paddingBlock: 11,
          fontSize: '1rem',
        },
      },
    },
    MuiCssBaseline: {
      styleOverrides: {
        html: { scrollBehavior: 'smooth' },
        'img, video': { display: 'block', maxWidth: '100%' },
        '@media (prefers-reduced-motion: reduce)': {
          html: { scrollBehavior: 'auto' },
          '*, *::before, *::after': {
            animationDuration: '0.01ms !important',
            animationIterationCount: '1 !important',
            transitionDuration: '0.01ms !important',
          },
        },
      },
    },
  },
});

export default theme;
