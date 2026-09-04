import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';

/**
 * Placeholder for teacher screens that are navigable but not built yet. It
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
          borderRadius: 4,
          border: '1px solid rgba(22,59,56,0.08)',
          backgroundColor: '#FFFFFF',
          p: 4,
        }}
      >
        <Typography sx={{ fontWeight: 700 }}>Not available yet</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
          This part of the teacher portal is still being built. The overview already shows your
          classes, schedule, and outstanding work.
        </Typography>
      </Paper>
    </Box>
  );
}

export default ComingSoon;
