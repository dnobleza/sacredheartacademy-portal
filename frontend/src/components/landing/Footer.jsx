import { Link as RouterLink } from 'react-router-dom';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid2';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Mail, MapPin, Phone } from 'lucide-react';
import Logo from '../common/Logo';
import { AQUA } from '../../theme';
import { footerLinks, school } from '../../data/landing';

/**
 * Brand marks are inline SVG — lucide-react dropped brand icons in v1.
 */
function BrandIcon({ path, size = 18 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d={path} />
    </svg>
  );
}

const SOCIALS = [
  {
    label: 'Facebook',
    path: 'M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.45 2.89h-2.33v6.99A10 10 0 0 0 22 12Z',
  },
  {
    label: 'Instagram',
    path: 'M12 2c2.72 0 3.06.01 4.12.06 1.07.05 1.79.22 2.43.46.65.26 1.2.6 1.75 1.15.55.55.89 1.1 1.15 1.75.24.64.41 1.36.46 2.43.05 1.06.06 1.4.06 4.12s-.01 3.06-.06 4.12c-.05 1.07-.22 1.79-.46 2.43a4.9 4.9 0 0 1-1.15 1.75c-.55.55-1.1.89-1.75 1.15-.64.24-1.36.41-2.43.46-1.06.05-1.4.06-4.12.06s-3.06-.01-4.12-.06c-1.07-.05-1.79-.22-2.43-.46a4.9 4.9 0 0 1-1.75-1.15 4.9 4.9 0 0 1-1.15-1.75c-.24-.64-.41-1.36-.46-2.43C2.01 15.06 2 14.72 2 12s.01-3.06.06-4.12c.05-1.07.22-1.79.46-2.43.26-.65.6-1.2 1.15-1.75.55-.55 1.1-.89 1.75-1.15.64-.24 1.36-.41 2.43-.46C8.94 2.01 9.28 2 12 2Zm0 1.8c-2.67 0-2.99.01-4.04.06-.98.04-1.5.2-1.86.34-.47.18-.8.4-1.15.75-.35.35-.57.68-.75 1.15-.14.36-.3.88-.34 1.86-.05 1.05-.06 1.37-.06 4.04s.01 2.99.06 4.04c.04.98.2 1.5.34 1.86.18.47.4.8.75 1.15.35.35.68.57 1.15.75.36.14.88.3 1.86.34 1.05.05 1.37.06 4.04.06s2.99-.01 4.04-.06c.98-.04 1.5-.2 1.86-.34.47-.18.8-.4 1.15-.75.35-.35.57-.68.75-1.15.14-.36.3-.88.34-1.86.05-1.05.06-1.37.06-4.04s-.01-2.99-.06-4.04c-.04-.98-.2-1.5-.34-1.86a3.1 3.1 0 0 0-.75-1.15 3.1 3.1 0 0 0-1.15-.75c-.36-.14-.88-.3-1.86-.34-1.05-.05-1.37-.06-4.04-.06Zm0 3.06a5.14 5.14 0 1 1 0 10.28 5.14 5.14 0 0 1 0-10.28Zm0 1.8a3.34 3.34 0 1 0 0 6.68 3.34 3.34 0 0 0 0-6.68Zm5.34-3.2a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4Z',
  },
  {
    label: 'YouTube',
    path: 'M21.58 7.19a2.51 2.51 0 0 0-1.77-1.78C18.25 5 12 5 12 5s-6.25 0-7.81.41a2.51 2.51 0 0 0-1.77 1.78A26.2 26.2 0 0 0 2 12a26.2 26.2 0 0 0 .42 4.81 2.51 2.51 0 0 0 1.77 1.78C5.75 19 12 19 12 19s6.25 0 7.81-.41a2.51 2.51 0 0 0 1.77-1.78A26.2 26.2 0 0 0 22 12a26.2 26.2 0 0 0-.42-4.81ZM10 15.02V8.98L15.2 12 10 15.02Z',
  },
];

const linkSx = {
  color: 'rgba(255,255,255,0.72)',
  textDecoration: 'none',
  fontSize: '0.9375rem',
  // The email address is one long unbreakable token — let it wrap rather than
  // push the footer column past the viewport.
  overflowWrap: 'anywhere',
  minWidth: 0,
  transition: 'color 200ms ease',
  '&:hover': { color: '#FFFFFF' },
};

function Footer() {
  return (
    <Box
      component="footer"
      id="contact"
      sx={{ backgroundColor: AQUA.footer, color: '#FFFFFF', pt: { xs: 8, md: 10 }, pb: 4 }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={{ xs: 5, md: 6 }}>
          <Grid size={{ xs: 12, md: 4 }}>
            <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 2.5 }}>
              <Logo size={42} />
              <Typography sx={{ fontWeight: 800, fontSize: '1.0625rem' }}>{school.name}</Typography>
            </Stack>

            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.72)', maxWidth: 320 }}>
              {school.description}
            </Typography>

            <Stack direction="row" spacing={1} sx={{ mt: 3 }}>
              {SOCIALS.map(({ label, path }) => (
                <IconButton
                  key={label}
                  href="#contact"
                  aria-label={`${school.name} on ${label}`}
                  sx={{
                    color: 'rgba(255,255,255,0.8)',
                    backgroundColor: 'rgba(255,255,255,0.08)',
                    '&:hover': { backgroundColor: 'rgba(255,255,255,0.18)', color: '#FFFFFF' },
                  }}
                >
                  <BrandIcon path={path} />
                </IconButton>
              ))}
            </Stack>
          </Grid>

          {footerLinks.map((column) => (
            <Grid key={column.title} size={{ xs: 6, md: 2.5 }}>
              <Typography component="h2" sx={{ fontWeight: 700, fontSize: '1rem', mb: 2.5 }}>
                {column.title}
              </Typography>

              <Stack component="ul" spacing={1.5} sx={{ listStyle: 'none', p: 0, m: 0 }}>
                {column.links.map((link) => (
                  <Box component="li" key={link.label}>
                    {link.to ? (
                      <Box component={RouterLink} to={link.to} sx={linkSx}>
                        {link.label}
                      </Box>
                    ) : (
                      <Box component="a" href={link.href} sx={linkSx}>
                        {link.label}
                      </Box>
                    )}
                  </Box>
                ))}
              </Stack>
            </Grid>
          ))}

          <Grid size={{ xs: 12, md: 3 }}>
            <Typography component="h2" sx={{ fontWeight: 700, fontSize: '1rem', mb: 2.5 }}>
              Contact
            </Typography>

            <Stack spacing={1.75}>
              <Stack direction="row" spacing={1.25} alignItems="flex-start">
                <Box aria-hidden="true" sx={{ display: 'flex', color: AQUA.primary, mt: '2px' }}>
                  <MapPin size={17} />
                </Box>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.72)' }}>
                  {school.address}
                </Typography>
              </Stack>

              <Stack direction="row" spacing={1.25} alignItems="center" sx={{ minWidth: 0 }}>
                <Box aria-hidden="true" sx={{ display: 'flex', color: AQUA.primary, flexShrink: 0 }}>
                  <Phone size={17} />
                </Box>
                <Box component="a" href={`tel:${school.phone.replace(/[^\d+]/g, '')}`} sx={linkSx}>
                  {school.phone}
                </Box>
              </Stack>

              <Stack direction="row" spacing={1.25} alignItems="center" sx={{ minWidth: 0 }}>
                <Box aria-hidden="true" sx={{ display: 'flex', color: AQUA.primary, flexShrink: 0 }}>
                  <Mail size={17} />
                </Box>
                <Box component="a" href={`mailto:${school.email}`} sx={linkSx}>
                  {school.email}
                </Box>
              </Stack>
            </Stack>
          </Grid>
        </Grid>

        <Divider sx={{ borderColor: 'rgba(255,255,255,0.12)', mt: { xs: 6, md: 8 }, mb: 3 }} />

        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.55)', textAlign: 'center' }}>
          © {new Date().getFullYear()} {school.name}. All rights reserved.
        </Typography>
      </Container>
    </Box>
  );
}

export default Footer;
