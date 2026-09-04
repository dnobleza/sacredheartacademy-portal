import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { LogOut } from 'lucide-react';
import Logo from '../components/common/Logo';
import { useAuth } from '../context/AuthContext';
import { roleLabel } from '../utils/roles';
import { glass, AQUA } from '../theme';
import { school } from '../data/landing';

/**
 * Shell shared by the four role portals: identity bar, role chip, logout.
 */
function DashboardLayout({ title, description, children }) {
  const { user, profile, logout } = useAuth();
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);

  const handleLogout = async () => {
    setSigningOut(true);
    await logout();
    navigate('/login', { replace: true });
  };

  const displayName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ');

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: `linear-gradient(180deg, ${AQUA.light} 0%, #FFFFFF 45%)`,
      }}
    >
      <Box component="header" sx={{ position: 'sticky', top: 16, zIndex: 10, px: { xs: 1.5, md: 3 } }}>
        <Container maxWidth="lg" disableGutters>
          <Box
            sx={{
              ...glass,
              borderRadius: '20px',
              px: { xs: 2, md: 3 },
              py: 1.5,
              display: 'flex',
              alignItems: 'center',
              gap: 2,
            }}
          >
            <Logo size={42} />

            <Typography
              sx={{ fontWeight: 800, fontSize: '1rem', display: { xs: 'none', sm: 'block' } }}
            >
              {school.name}
            </Typography>

            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ ml: 'auto', minWidth: 0 }}>
              <Box sx={{ textAlign: 'right', minWidth: 0, display: { xs: 'none', md: 'block' } }}>
                {displayName && (
                  <Typography sx={{ fontWeight: 700, fontSize: '0.9375rem', lineHeight: 1.3 }}>
                    {displayName}
                  </Typography>
                )}
                <Typography
                  variant="caption"
                  sx={{ color: 'text.secondary', overflowWrap: 'anywhere' }}
                >
                  {user?.email}
                </Typography>
              </Box>

              <Chip
                label={roleLabel(user?.role)}
                size="small"
                sx={{
                  backgroundColor: 'primary.light',
                  color: 'primary.dark',
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              />

              <Button
                onClick={handleLogout}
                disabled={signingOut}
                startIcon={<LogOut size={17} />}
                sx={{ color: 'primary.dark', flexShrink: 0, px: { xs: 1.5, md: 2 } }}
              >
                {signingOut ? 'Signing out…' : 'Logout'}
              </Button>
            </Stack>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="lg" component="main" sx={{ py: { xs: 5, md: 7 } }}>
        <Typography variant="h2" component="h1" sx={{ fontSize: { xs: '1.75rem', md: '2.25rem' } }}>
          {title}
        </Typography>

        <Typography variant="body1" sx={{ color: 'text.secondary', mt: 2, maxWidth: 620 }}>
          {description}
        </Typography>

        {children}
      </Container>
    </Box>
  );
}

export default DashboardLayout;
