import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid2';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { ArrowRight, Check } from 'lucide-react';
import Section from '../common/Section';
import Reveal from '../common/Reveal';
import { AQUA } from '../../theme';
import { about } from '../../data/landing';

function About() {
  return (
    <Section id="about" labelledBy="about-heading">
      <Grid container spacing={{ xs: 5, md: 8 }} alignItems="center">
        <Grid size={{ xs: 12, md: 6 }}>
          <Reveal>
            <Box
              sx={{
                position: 'relative',
                borderRadius: '28px',
                overflow: 'hidden',
                boxShadow: '0 30px 70px rgba(22,59,56,0.16)',
                aspectRatio: '9 / 10',
                maxWidth: 520,
              }}
            >
              <Box
                component="img"
                src={about.image.src}
                alt={about.image.alt}
                width={900}
                height={1000}
                loading="lazy"
                sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <Box
                aria-hidden="true"
                sx={{
                  position: 'absolute',
                  inset: 0,
                  background: `linear-gradient(200deg, transparent 55%, ${AQUA.dark}2E 100%)`,
                }}
              />
            </Box>
          </Reveal>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Reveal delay={100}>
            <Typography
              component="p"
              sx={{
                color: 'primary.dark',
                fontWeight: 700,
                fontSize: '0.8125rem',
                letterSpacing: '0.16em',
                mb: 1.5,
              }}
            >
              {about.eyebrow}
            </Typography>

            <Typography id="about-heading" variant="h2" component="h2">
              {about.heading}
            </Typography>

            {about.body.map((paragraph) => (
              <Typography key={paragraph} variant="body1" sx={{ color: 'text.secondary', mt: 2.5 }}>
                {paragraph}
              </Typography>
            ))}

            <Stack component="ul" spacing={1.5} sx={{ listStyle: 'none', p: 0, mt: 3.5 }}>
              {about.points.map((point) => (
                <Stack
                  key={point}
                  component="li"
                  direction="row"
                  spacing={1.5}
                  alignItems="flex-start"
                >
                  <Box
                    aria-hidden="true"
                    sx={{
                      mt: '2px',
                      width: 24,
                      height: 24,
                      borderRadius: '8px',
                      backgroundColor: 'primary.light',
                      color: 'primary.dark',
                      display: 'grid',
                      placeItems: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Check size={15} strokeWidth={3} />
                  </Box>
                  <Typography variant="body2" sx={{ color: 'text.primary' }}>
                    {point}
                  </Typography>
                </Stack>
              ))}
            </Stack>

            <Button
              href="#academics"
              endIcon={<ArrowRight size={17} />}
              sx={{ mt: 3.5, px: 0, color: 'primary.dark', '&:hover': { background: 'transparent' } }}
            >
              Learn More
            </Button>
          </Reveal>
        </Grid>
      </Grid>
    </Section>
  );
}

export default About;
