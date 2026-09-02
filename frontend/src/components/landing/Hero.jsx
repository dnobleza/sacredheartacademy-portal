import { Link as RouterLink } from 'react-router-dom';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid2';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { ArrowRight, GraduationCap, Users } from 'lucide-react';
import GradientButton from '../common/GradientButton';
import Reveal from '../common/Reveal';
import { glass, AQUA, AQUA_GRADIENT } from '../../theme';
import { hero } from '../../data/landing';

const ICONS = { GraduationCap, Users };

function FloatingCard({ card, index, sx = {} }) {
  const Icon = ICONS[card.icon];

  return (
    <Box
      sx={{
        ...glass,
        p: 2.25,
        minWidth: 172,
        animation: `heroFloat 6s ease-in-out ${index * 1.5}s infinite`,
        '@keyframes heroFloat': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        ...sx,
      }}
    >
      <Stack direction="row" spacing={1.5} alignItems="center">
        <Box
          aria-hidden="true"
          sx={{
            width: 42,
            height: 42,
            borderRadius: '12px',
            backgroundColor: 'primary.light',
            color: 'primary.dark',
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0,
          }}
        >
          <Icon size={22} strokeWidth={2.2} />
        </Box>
        <Box>
          <Typography sx={{ fontWeight: 800, lineHeight: 1.2 }}>{card.title}</Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {card.subtitle}
          </Typography>
        </Box>
      </Stack>

      <Box
        aria-hidden="true"
        sx={{
          mt: 1.75,
          height: 3,
          width: 44,
          borderRadius: 999,
          background: AQUA_GRADIENT,
        }}
      />
    </Box>
  );
}

function Hero() {
  return (
    <Box
      component="section"
      id="home"
      aria-labelledby="hero-heading"
      sx={{ position: 'relative', pt: { xs: 6, md: 10 }, pb: { xs: 10, md: 18 } }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={{ xs: 6, md: 8 }} alignItems="center">
          <Grid size={{ xs: 12, md: 6 }}>
            <Reveal>
              <Box
                sx={{
                  ...glass,
                  display: 'inline-block',
                  borderRadius: 999,
                  px: 2.25,
                  py: 0.9,
                  mb: 3,
                }}
              >
                <Typography
                  component="span"
                  sx={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    letterSpacing: '0.18em',
                    color: 'primary.dark',
                  }}
                >
                  {hero.badge}
                </Typography>
              </Box>
            </Reveal>

            <Reveal delay={80}>
              <Typography id="hero-heading" variant="h1" component="h1">
                {hero.headline}{' '}
                <Box
                  component="span"
                  sx={{
                    background: AQUA_GRADIENT,
                    WebkitBackgroundClip: 'text',
                    backgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    color: AQUA.primary,
                  }}
                >
                  {hero.headlineAccent}
                </Box>
              </Typography>
            </Reveal>

            <Reveal delay={160}>
              <Typography
                variant="body1"
                sx={{ color: 'text.secondary', mt: 3, maxWidth: 520, fontSize: '1.125rem' }}
              >
                {hero.body}
              </Typography>
            </Reveal>

            <Reveal delay={240}>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={2}
                sx={{ mt: 4.5, width: { xs: '100%', sm: 'auto' } }}
              >
                <GradientButton
                  href="#about"
                  endIcon={<ArrowRight size={18} />}
                  fullWidth={false}
                  sx={{ width: { xs: '100%', sm: 'auto' } }}
                >
                  Explore Our School
                </GradientButton>

                <Button
                  href="#admissions"
                  sx={{
                    ...glass,
                    borderRadius: 999,
                    color: 'primary.dark',
                    width: { xs: '100%', sm: 'auto' },
                    '&:hover': {
                      background: 'rgba(255,255,255,0.78)',
                      transform: 'translateY(-2px)',
                    },
                    transition: 'transform 220ms ease, background 220ms ease',
                  }}
                >
                  Admissions
                </Button>
              </Stack>
            </Reveal>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Reveal delay={120} sx={{ position: 'relative' }}>
              <Box
                sx={{
                  position: 'relative',
                  borderRadius: { xs: '120px 120px 24px 24px', md: '180px 180px 28px 28px' },
                  overflow: 'hidden',
                  boxShadow: '0 40px 80px rgba(22,59,56,0.18)',
                  aspectRatio: '4 / 5',
                  maxWidth: 520,
                  mx: 'auto',
                }}
              >
                <Box
                  component="img"
                  src={hero.image.src}
                  alt={hero.image.alt}
                  width={900}
                  height={1100}
                  fetchPriority="high"
                  sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <Box
                  aria-hidden="true"
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    background: `linear-gradient(160deg, ${AQUA.primary}26 0%, transparent 45%, ${AQUA.dark}33 100%)`,
                  }}
                />
              </Box>

              {/* Desktop: float over the image edges. */}
              <Box sx={{ display: { xs: 'none', md: 'block' } }}>
                <FloatingCard
                  card={hero.cards[0]}
                  index={0}
                  sx={{ position: 'absolute', top: '18%', left: { md: -8, lg: -24 } }}
                />
                <FloatingCard
                  card={hero.cards[1]}
                  index={1}
                  sx={{ position: 'absolute', bottom: '10%', right: { md: -8, lg: -24 } }}
                />
              </Box>

              {/* Mobile: stack below the image so nothing overlaps text. */}
              <Stack
                direction="row"
                spacing={2}
                justifyContent="center"
                flexWrap="wrap"
                useFlexGap
                sx={{ display: { xs: 'flex', md: 'none' }, mt: 3 }}
              >
                {hero.cards.map((card, index) => (
                  <FloatingCard key={card.title} card={card} index={index} sx={{ flex: '1 1 160px' }} />
                ))}
              </Stack>
            </Reveal>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}

export default Hero;
