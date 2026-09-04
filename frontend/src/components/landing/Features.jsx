import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid2';
import Typography from '@mui/material/Typography';
import { GraduationCap, HeartHandshake, Lightbulb, Users } from 'lucide-react';
import Section from '../common/Section';
import SectionHeading from '../common/SectionHeading';
import GlassCard from '../common/GlassCard';
import Reveal from '../common/Reveal';
import { features } from '../../data/landing';

const ICONS = { GraduationCap, Lightbulb, HeartHandshake, Users };

function Features() {
  return (
    <Section id="admissions" labelledBy="features-heading" background="#E8FAF7">
      <SectionHeading
        id="features-heading"
        heading={features.heading}
        lede={features.lede}
        sx={{ mb: { xs: 6, md: 8 } }}
      />

      <Grid container spacing={3}>
        {features.items.map((item, index) => {
          const Icon = ICONS[item.icon];

          return (
            <Grid key={item.title} size={{ xs: 12, sm: 6, lg: 3 }}>
              <Reveal delay={index * 90} sx={{ height: '100%' }}>
                <GlassCard hover sx={{ height: '100%' }}>
                  <Box
                    aria-hidden="true"
                    sx={{
                      width: 52,
                      height: 52,
                      borderRadius: '16px',
                      backgroundColor: 'rgba(32,191,169,0.14)',
                      color: 'primary.dark',
                      display: 'grid',
                      placeItems: 'center',
                      mb: 2.5,
                    }}
                  >
                    <Icon size={26} strokeWidth={1.9} />
                  </Box>

                  <Typography variant="h3" component="h3" sx={{ fontSize: '1.1875rem' }}>
                    {item.title}
                  </Typography>

                  <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1.5 }}>
                    {item.body}
                  </Typography>
                </GlassCard>
              </Reveal>
            </Grid>
          );
        })}
      </Grid>
    </Section>
  );
}

export default Features;
