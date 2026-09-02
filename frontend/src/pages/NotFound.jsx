import { Link as RouterLink } from 'react-router-dom';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import { ArrowLeft } from 'lucide-react';
import Logo from '../components/common/Logo';
import { glass, AQUA } from '../theme';

function NotFound() {
  return (
    <Box
      component="main"
      sx={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background: `linear-gradient(180deg, ${AQUA.light} 0%, #FFFFFF 60%)`,
        px: 2,
      }}
    >
      <Container maxWidth="sm">
        <Box sx={{ ...glass, p: { xs: 4, md: 5 }, textAlign: 'center' }}>
          <Logo size={64} sx={{ mx: 'auto', mb: 3 }} />

          <Typography variant="h2" component="h1" sx={{ fontSize: '1.75rem' }}>
            Page not found
          </Typography>

          <Typography variant="body1" sx={{ color: 'text.secondary', mt: 2 }}>
            The page you are looking for does not exist or has moved.
          </Typography>

          <Button
            component={RouterLink}
            to="/"
            startIcon={<ArrowLeft size={18} />}
            sx={{ mt: 4, color: 'primary.dark' }}
          >
            Back to home
          </Button>
        </Box>
      </Container>
    </Box>
  );
}

export default NotFound;
