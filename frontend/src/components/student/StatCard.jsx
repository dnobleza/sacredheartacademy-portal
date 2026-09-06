import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { AQUA_GRADIENT, CARD_RADIUS, TILE_RADIUS } from '../../theme';

const CARD_BORDER = '1px solid rgba(22,59,56,0.08)';

/**
 * The dashboard stat tile, same shape as the one on the teacher and cashier
 * overviews. A null value shows an em dash: a student with no grades yet has
 * no average, which is not the same as an average of zero.
 */
function StatCard({ label, value, Icon, loading }) {
  return (
    <Paper
      elevation={0}
      sx={{ borderRadius: CARD_RADIUS, border: CARD_BORDER, backgroundColor: '#FFFFFF', p: 3, height: '100%' }}
    >
      <Stack direction="row" alignItems="center" spacing={2}>
        <Box
          aria-hidden="true"
          sx={{
            width: 48,
            height: 48,
            borderRadius: TILE_RADIUS,
            background: AQUA_GRADIENT,
            color: '#fff',
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0,
          }}
        >
          <Icon size={23} strokeWidth={2} />
        </Box>

        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
            {label}
          </Typography>

          {loading ? (
            <CircularProgress size={20} sx={{ mt: 1 }} aria-label={`Loading ${label}`} />
          ) : (
            <Typography sx={{ fontWeight: 800, fontSize: '2rem', lineHeight: 1.15, color: 'primary.main' }}>
              {value === null || value === undefined ? '—' : value}
            </Typography>
          )}
        </Box>
      </Stack>
    </Paper>
  );
}

export default StatCard;
