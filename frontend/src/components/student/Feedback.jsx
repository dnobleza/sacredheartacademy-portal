import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';

export function EmptyRow({ text }) {
  return (
    <Box sx={{ py: 5, textAlign: 'center' }}>
      <Typography sx={{ color: 'text.secondary' }}>{text}</Typography>
    </Box>
  );
}

export function Loader({ label }) {
  return (
    <Box sx={{ display: 'grid', placeItems: 'center', py: 6 }}>
      <CircularProgress size={26} aria-label={label} />
    </Box>
  );
}
