import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid2';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { ArrowRight, CalendarDays } from 'lucide-react';
import Section from '../common/Section';
import SectionHeading from '../common/SectionHeading';
import GlassCard from '../common/GlassCard';
import Reveal from '../common/Reveal';
import { news } from '../../data/landing';

function News() {
  return (
    <Section id="news" labelledBy="news-heading">
      <SectionHeading
        id="news-heading"
        eyebrow={news.eyebrow}
        heading={news.heading}
        sx={{ mb: { xs: 6, md: 8 } }}
      />

      <Grid container spacing={3.5}>
        {news.items.map((item, index) => (
          <Grid key={item.title} size={{ xs: 12, md: 4 }}>
            <Reveal delay={index * 110} sx={{ height: '100%' }}>
              <GlassCard
                hover
                component="article"
                sx={{
                  height: '100%',
                  p: 0,
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  background: 'rgba(255,255,255,0.72)',
                }}
              >
                <Box sx={{ aspectRatio: '7 / 4.6', overflow: 'hidden' }}>
                  <Box
                    component="img"
                    src={item.image.src}
                    alt={item.image.alt}
                    width={700}
                    height={460}
                    loading="lazy"
                    sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </Box>

                <Box sx={{ p: { xs: 3, md: 3.5 }, display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
                  <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1.75 }}>
                    <Chip
                      label={item.category}
                      size="small"
                      sx={{
                        backgroundColor: 'primary.light',
                        color: 'primary.dark',
                        fontWeight: 700,
                        fontSize: '0.6875rem',
                        letterSpacing: '0.04em',
                      }}
                    />
                    <Stack direction="row" spacing={0.6} alignItems="center">
                      <Box aria-hidden="true" sx={{ display: 'flex', color: 'text.secondary' }}>
                        <CalendarDays size={14} />
                      </Box>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {item.date}
                      </Typography>
                    </Stack>
                  </Stack>

                  <Typography variant="h3" component="h3" sx={{ fontSize: '1.125rem' }}>
                    {item.title}
                  </Typography>

                  <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1.5, flexGrow: 1 }}>
                    {item.body}
                  </Typography>

                  <Button
                    href="#news"
                    endIcon={<ArrowRight size={17} />}
                    sx={{
                      mt: 2.5,
                      px: 0,
                      alignSelf: 'flex-start',
                      color: 'primary.dark',
                      '&:hover': { background: 'transparent' },
                    }}
                    aria-label={`Read more: ${item.title}`}
                  >
                    Read More
                  </Button>
                </Box>
              </GlassCard>
            </Reveal>
          </Grid>
        ))}
      </Grid>
    </Section>
  );
}

export default News;
