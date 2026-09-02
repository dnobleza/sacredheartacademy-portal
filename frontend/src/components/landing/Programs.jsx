import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid2';
import Typography from '@mui/material/Typography';
import { ArrowRight, BookOpen, Compass, Rocket } from 'lucide-react';
import Section from '../common/Section';
import SectionHeading from '../common/SectionHeading';
import GlassCard from '../common/GlassCard';
import Reveal from '../common/Reveal';
import { AQUA, AQUA_GRADIENT } from '../../theme';
import { programs } from '../../data/landing';

const ICONS = { BookOpen, Compass, Rocket };

function Programs() {
  return (
    <Section id="academics" labelledBy="programs-heading">
      <SectionHeading
        id="programs-heading"
        eyebrow={programs.eyebrow}
        heading={programs.heading}
        sx={{ mb: { xs: 6, md: 8 } }}
      />

      <Grid container spacing={3.5}>
        {programs.items.map((program, index) => {
          const Icon = ICONS[program.icon];

          return (
            <Grid key={program.title} size={{ xs: 12, md: 4 }}>
              <Reveal delay={index * 110} sx={{ height: '100%' }}>
                <GlassCard
                  hover
                  component="article"
                  sx={{ height: '100%', p: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
                >
                  <Box sx={{ position: 'relative', aspectRatio: '7 / 5', overflow: 'hidden' }}>
                    <Box
                      component="img"
                      src={program.image.src}
                      alt={program.image.alt}
                      width={700}
                      height={500}
                      loading="lazy"
                      sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <Box
                      aria-hidden="true"
                      sx={{
                        position: 'absolute',
                        inset: 0,
                        background: `linear-gradient(180deg, transparent 40%, ${AQUA.dark}CC 100%)`,
                      }}
                    />
                    <Box
                      aria-hidden="true"
                      sx={{
                        position: 'absolute',
                        left: 20,
                        bottom: 20,
                        width: 46,
                        height: 46,
                        borderRadius: '14px',
                        background: AQUA_GRADIENT,
                        color: '#fff',
                        display: 'grid',
                        placeItems: 'center',
                        boxShadow: '0 10px 24px rgba(22,59,56,0.28)',
                      }}
                    >
                      <Icon size={23} strokeWidth={2} />
                    </Box>
                  </Box>

                  <Box sx={{ p: { xs: 3, md: 3.5 }, display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
                    <Typography variant="h3" component="h3">
                      {program.title}
                    </Typography>

                    <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1.5, flexGrow: 1 }}>
                      {program.body}
                    </Typography>

                    <Button
                      href="#admissions"
                      endIcon={<ArrowRight size={17} />}
                      sx={{
                        mt: 2.5,
                        px: 0,
                        alignSelf: 'flex-start',
                        color: 'primary.dark',
                        '&:hover': { background: 'transparent' },
                      }}
                      aria-label={`Learn more about ${program.title}`}
                    >
                      Learn More
                    </Button>
                  </Box>
                </GlassCard>
              </Reveal>
            </Grid>
          );
        })}
      </Grid>
    </Section>
  );
}

export default Programs;
