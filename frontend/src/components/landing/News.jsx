import { useEffect, useState } from 'react';
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
import { news, school } from '../../data/landing';
import { fetchPublicAnnouncements, publicAnnouncementImageUrl } from '../../services/publicApi';

const formatDate = (value) =>
  new Date(value).toLocaleDateString(undefined, { dateStyle: 'long' });

/**
 * Announcements posted for everyone become news cards. The API carries no
 * author for public posts, so the byline is the school itself rather than the
 * admin who wrote it.
 *
 * A post with no picture borrows the stock photo of the static item in the same
 * position, so the card keeps its shape instead of collapsing.
 */
const toCard = (announcement, index) => ({
  key: `announcement-${announcement.id}`,
  date: formatDate(announcement.created_at),
  category: school.name,
  title: announcement.title,
  body: announcement.content,
  image: announcement.image_id
    ? { src: publicAnnouncementImageUrl(announcement.id), alt: announcement.title }
    : news.items[index % news.items.length].image,
});

const staticCards = news.items.map((item) => ({ ...item, key: item.title }));

function News() {
  // Falls back to the hand-written items when nothing is published yet, or when
  // the request fails — a backend outage must not blank the marketing page.
  const [cards, setCards] = useState(staticCards);

  useEffect(() => {
    let cancelled = false;

    fetchPublicAnnouncements()
      .then((announcements) => {
        if (!cancelled && announcements.length > 0) {
          setCards(announcements.map(toCard));
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Section id="news" labelledBy="news-heading">
      <SectionHeading
        id="news-heading"
        eyebrow={news.eyebrow}
        heading={news.heading}
        sx={{ mb: { xs: 6, md: 8 } }}
      />

      <Grid container spacing={3.5}>
        {cards.map((item, index) => (
          <Grid key={item.key} size={{ xs: 12, md: 4 }}>
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

                  <Typography
                    variant="body2"
                    sx={{
                      color: 'text.secondary',
                      mt: 1.5,
                      flexGrow: 1,
                      // An announcement body has no length limit, so it is
                      // clamped here rather than letting one long post stretch
                      // its card taller than the two beside it.
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      whiteSpace: 'pre-wrap',
                    }}
                  >
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
