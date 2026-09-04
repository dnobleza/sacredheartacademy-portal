import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Reveal from '../common/Reveal';
import { glass } from '../../theme';
import { stats } from '../../data/landing';

function Stats() {
  return (
    <Box
      component="section"
      aria-label="School by the numbers"
      sx={{ position: 'relative', mt: { xs: -6, md: -12 }, mb: { xs: 2, md: 4 }, px: { xs: 1.5, md: 3 } }}
    >
      <Container maxWidth="lg" disableGutters>
        <Reveal>
          <Box
            sx={{
              ...glass,
              px: { xs: 3, md: 5 },
              py: { xs: 4, md: 5 },
              display: 'grid',
              gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
              gap: { xs: 4, md: 0 },
            }}
          >
            {stats.map((stat, index) => (
              <Box
                key={stat.label}
                sx={{
                  textAlign: 'center',
                  px: { md: 2 },
                  borderLeft: {
                    xs: 'none',
                    md: index === 0 ? 'none' : '1px solid rgba(22,59,56,0.10)',
                  },
                }}
              >
                <Typography
                  component="p"
                  sx={{
                    color: 'primary.main',
                    fontWeight: 800,
                    letterSpacing: '-0.02em',
                    fontSize: { xs: '2rem', md: '2.75rem' },
                    lineHeight: 1.1,
                  }}
                >
                  {stat.value}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ color: 'text.secondary', mt: 0.75, fontWeight: 500 }}
                >
                  {stat.label}
                </Typography>
              </Box>
            ))}
          </Box>
        </Reveal>
      </Container>
    </Box>
  );
}

export default Stats;
