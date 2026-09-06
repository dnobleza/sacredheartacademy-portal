import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { CARD_RADIUS } from '../../theme';

/**
 * Placeholder for screens that are navigable but not built yet. It shows no
 * fake data on purpose — the sidebar link lands somewhere honest rather than
 * 404ing.
 */
function ComingSoon({ title, note }) {
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
          {note || 'This part of the portal is still being built.'}
        </Typography>
      </Paper>
    </Box>
  );
}

export default ComingSoon;
