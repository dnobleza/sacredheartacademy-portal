import { Link as RouterLink } from 'react-router-dom';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { ArrowRight } from 'lucide-react';
import Reveal from '../common/Reveal';
import { AQUA } from '../../theme';

import { portalCta } from '../../data/landing';

function PortalCTA() {
  return (
    <Box
      component="section"
      aria-labelledby="portal-cta-heading"
      sx={{
        position: 'relative',
        overflow: 'hidden',
        background: `linear-gradient(120deg, ${AQUA.dark} 0%, ${AQUA.primary} 55%, #4FD6C3 100%)`,
        py: { xs: 9, md: 13 },
      }}
    >
      {/* Decorative frosted shapes. */}
      <Box
        aria-hidden="true"
        sx={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          '&::before, &::after': {
            content: '""',
            position: 'absolute',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.16)',
            filter: 'blur(6px)',
          },
          '&::before': { width: 320, height: 320, top: -120, left: -80 },
          '&::after': { width: 260, height: 260, bottom: -110, right: -60 },
        }}
      />

      <Container maxWidth="md" sx={{ position: 'relative', textAlign: 'center' }}>
        <Reveal>
          <Typography
            id="portal-cta-heading"
            variant="h2"
            component="h2"
            sx={{ color: '#FFFFFF' }}
          >
            {portalCta.heading}
          </Typography>

          <Typography
            variant="body1"
            sx={{ color: 'rgba(255,255,255,0.92)', mt: 2.5, maxWidth: 640, mx: 'auto' }}
          >
            {portalCta.body}
          </Typography>

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            justifyContent="center"
            sx={{ mt: 4.5 }}
          >
            <Button
              component={RouterLink}
              to="/login"
              endIcon={<ArrowRight size={18} />}
              sx={{
                backgroundColor: '#FFFFFF',
                color: AQUA.dark,
                fontWeight: 700,
                boxShadow: '0 14px 30px rgba(15,46,43,0.22)',
                '&:hover': { backgroundColor: '#FFFFFF', transform: 'translateY(-2px)' },
                transition: 'transform 220ms ease',
              }}
            >
              Student Portal
            </Button>

            <Button
              component={RouterLink}
              to="/login"
              endIcon={<ArrowRight size={18} />}
              sx={{
                color: '#FFFFFF',
                fontWeight: 700,
                background: 'rgba(255,255,255,0.16)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: '1px solid rgba(255,255,255,0.55)',
                '&:hover': { background: 'rgba(255,255,255,0.26)', transform: 'translateY(-2px)' },
                transition: 'transform 220ms ease, background 220ms ease',
              }}
            >
              Parent Portal
            </Button>
          </Stack>
        </Reveal>
      </Container>
    </Box>
  );
}

export default PortalCTA;
