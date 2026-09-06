import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

function SectionPanel({ title, action, children }) {
  return (
    <Box sx={{ mt: 4 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography variant="h5">{title}</Typography>
        {action}
      </Stack>
      {children}
    </Box>
  );
}

export default SectionPanel;
