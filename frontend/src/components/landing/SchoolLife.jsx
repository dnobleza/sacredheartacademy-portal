import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Section from '../common/Section';
import SectionHeading from '../common/SectionHeading';
import Reveal from '../common/Reveal';
import { glass } from '../../theme';
import { schoolLife } from '../../data/landing';

const LARGE_TILES = ['a', 'd'];

function SchoolLife() {
  return (
    <Section id="student-life" labelledBy="school-life-heading" background="#F4FCFB">
      <SectionHeading
        id="school-life-heading"
        eyebrow={schoolLife.eyebrow}
        heading={schoolLife.heading}
        lede={schoolLife.lede}
        sx={{ mb: { xs: 6, md: 8 } }}
      />

      <Box
        sx={{
          display: 'grid',
          gap: 2.5,
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
          gridTemplateAreas: {
            xs: '"a a" "b c" "d d" "e f"',
            md: '"a a b c" "a a d d" "e f d d"',
          },
        }}
      >
        {schoolLife.items.map((item, index) => {
          const isLarge = LARGE_TILES.includes(item.area);

          return (
            <Reveal
              key={item.caption}
              delay={index * 70}
              sx={{
                gridArea: item.area,
                position: 'relative',
                borderRadius: '24px',
                overflow: 'hidden',
                boxShadow: '0 18px 44px rgba(22,59,56,0.12)',
                minHeight: { xs: 160, md: isLarge ? 260 : 190 },
                '&:hover img': { transform: 'scale(1.05)' },
              }}
            >
              <Box
                component="img"
                src={item.src}
                alt={item.alt}
                loading="lazy"
                sx={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  position: 'absolute',
                  inset: 0,
                  transition: 'transform 500ms ease',
                }}
              />

              {isLarge && (
                <Box
                  sx={{
                    ...glass,
                    position: 'absolute',
                    left: 16,
                    bottom: 16,
                    px: 2,
                    py: 0.9,
                    borderRadius: 999,
                    boxShadow: 'none',
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{ fontWeight: 700, color: 'text.primary', letterSpacing: '0.02em' }}
                  >
                    {item.caption}
                  </Typography>
                </Box>
              )}
            </Reveal>
          );
        })}
      </Box>
    </Section>
  );
}

export default SchoolLife;
