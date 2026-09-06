import { Link as RouterLink } from 'react-router-dom';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { ArrowLeft } from 'lucide-react';
import Logo from '../../components/common/Logo';
import AdmissionWizard from '../../components/landing/AdmissionWizard';
import { AQUA, CARD_RADIUS } from '../../theme';

/**
 * The same wizard the navbar opens as a dialog, given a full page for anyone
 * who would rather not fill a long form inside a modal — and so the form has a
 * shareable URL.
 */
function AdmissionApply() {
  return (
    <Box sx={{ minHeight: '100vh', background: `linear-gradient(180deg, ${AQUA.veryLight} 0%, #FFFFFF 40%)` }}>
      <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 } }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 4 }}>
          <Logo />
          <Button
            component={RouterLink}
            to="/"
            startIcon={<ArrowLeft size={16} />}
            sx={{ color: 'primary.dark', fontWeight: 700 }}
          >
            Back to the site
          </Button>
        </Stack>

        <Typography variant="h2" component="h1" sx={{ fontSize: { xs: '1.7rem', md: '2.1rem' } }}>
          Enrollment application
        </Typography>
        <Typography variant="body1" sx={{ color: 'text.secondary', mt: 1, mb: 4, maxWidth: 560 }}>
          It takes a few minutes. You will get a reference number at the end — keep it to track your
          application.
        </Typography>

        <Paper
          elevation={0}
          sx={{
            borderRadius: CARD_RADIUS,
            border: '1px solid rgba(22,59,56,0.08)',
            backgroundColor: '#FFFFFF',
            p: { xs: 2.5, md: 4 },
          }}
        >
          <AdmissionWizard />
        </Paper>

        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 3, textAlign: 'center' }}>
          Already applied?{' '}
          <Box component={RouterLink} to="/admissions/status" sx={{ color: 'primary.dark', fontWeight: 700 }}>
            Check your application
          </Box>
          .
        </Typography>
      </Container>
    </Box>
  );
}

export default AdmissionApply;
