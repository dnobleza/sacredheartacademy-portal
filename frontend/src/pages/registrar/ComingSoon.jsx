import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { CARD_RADIUS } from '../../theme';

/**
 * Placeholder for registrar screens that are navigable but not built yet. It
 * deliberately shows no fake data — the sidebar link lands somewhere honest
 * instead of 404ing.
 */
function ComingSoon({ title }) {
  return (
    <Box>
      <Typography variant="h2" component="h1" sx={{ fontSize: { xs: '1.6rem', md: '2rem' } }}>
        {title}
      </Typography>

      <Paper
        elevation={0}
        sx={{
          mt: 3,
          borderRadius: CARD_RADIUS,
          border: '1px solid rgba(22,59,56,0.08)',
          backgroundColor: '#FFFFFF',
          p: 4,
        }}
      >
        <Typography sx={{ fontWeight: 700 }}>Not available yet</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
          Document and transcript requests are still being built. Admissions, enrolment, and
          section records are already available from the sidebar.
        </Typography>
      </Paper>
    </Box>
  );
}

export default ComingSoon;
