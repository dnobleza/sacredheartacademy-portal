import { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Menu as MenuIcon, Search, X } from 'lucide-react';
import GradientButton from '../common/GradientButton';
import Logo from '../common/Logo';
import { glass } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import { roleHome } from '../../utils/roles';
import { navLinks, school } from '../../data/landing';

function Navbar() {
  const { isAuthenticated, user } = useAuth();
  const portalPath = isAuthenticated ? roleHome(user.role) : '/login';
  const portalLabel = isAuthenticated ? 'Go to Portal' : 'Student Portal';

  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(navLinks[0].id);

  useEffect(() => {
    const sections = navLinks
      .map((link) => document.getElementById(link.id))
      .filter(Boolean);

    if (sections.length === 0 || typeof IntersectionObserver === 'undefined') {
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (visible) {
          setActive(visible.target.id);
        }
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: [0, 0.25, 0.5, 1] },
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  const closeDrawer = () => setOpen(false);

  return (
    <Box
      component="header"
      sx={{
        position: 'sticky',
        top: { xs: 8, md: 16 },
        zIndex: (theme) => theme.zIndex.appBar,
        px: { xs: 1.5, md: 3 },
      }}
    >
      <Container maxWidth="lg" disableGutters>
        <Box
          component="nav"
          aria-label="Main"
          sx={{
            ...glass,
            borderRadius: '20px',
            px: { xs: 2, md: 3 },
            py: { xs: 1.25, md: 1.5 },
            display: 'flex',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <Stack
            component="a"
            href="#home"
            direction="row"
            spacing={1.25}
            alignItems="center"
            sx={{ textDecoration: 'none', color: 'text.primary', flexShrink: 0 }}
          >
            <Logo size={42} />
            <Typography
              component="span"
              sx={{
                fontWeight: 800,
                fontSize: { xs: '0.9375rem', md: '1.0625rem' },
                letterSpacing: '-0.01em',
                whiteSpace: 'nowrap',
              }}
            >
              {school.name}
            </Typography>
          </Stack>

          <Stack
            direction="row"
            spacing={0.5}
            sx={{ ml: 'auto', display: { xs: 'none', lg: 'flex' } }}
          >
            {navLinks.map((link) => (
              <Box
                key={link.id}
                component="a"
                href={`#${link.id}`}
                aria-current={active === link.id ? 'true' : undefined}
                sx={{
                  px: 1.75,
                  py: 1,
                  borderRadius: 999,
                  fontSize: '0.9375rem',
                  fontWeight: active === link.id ? 700 : 500,
                  textDecoration: 'none',
                  color: active === link.id ? 'primary.dark' : 'text.secondary',
                  backgroundColor: active === link.id ? 'primary.light' : 'transparent',
                  transition: 'color 200ms ease, background-color 200ms ease',
                  '&:hover': { color: 'primary.dark', backgroundColor: 'primary.light' },
                }}
              >
                {link.label}
              </Box>
            ))}
          </Stack>

          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            sx={{ ml: { xs: 'auto', lg: 2 } }}
          >
            <IconButton
              aria-label="Search the site"
              sx={{
                color: 'text.secondary',
                display: { xs: 'none', sm: 'inline-flex' },
                '&:hover': { color: 'primary.dark', backgroundColor: 'primary.light' },
              }}
            >
              <Search size={20} />
            </IconButton>

            <GradientButton
              component={RouterLink}
              to={portalPath}
              sx={{
                px: { xs: 2, md: 3 },
                py: { xs: 0.9, md: 1.1 },
                fontSize: { xs: '0.875rem', md: '0.9375rem' },
                display: { xs: 'none', sm: 'inline-flex' },
              }}
            >
              {portalLabel}
            </GradientButton>

            <IconButton
              aria-label="Open navigation menu"
              onClick={() => setOpen(true)}
              sx={{ display: { xs: 'inline-flex', lg: 'none' }, color: 'text.primary' }}
            >
              <MenuIcon size={22} />
            </IconButton>
          </Stack>
        </Box>
      </Container>

      <Drawer
        anchor="right"
        open={open}
        onClose={closeDrawer}
        PaperProps={{ sx: { width: 280, p: 2, backgroundColor: 'background.paper' } }}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
          <Stack direction="row" spacing={1.25} alignItems="center">
            <Logo size={32} />
            <Typography sx={{ fontWeight: 800 }}>{school.name}</Typography>
          </Stack>
          <IconButton aria-label="Close navigation menu" onClick={closeDrawer}>
            <X size={20} />
          </IconButton>
        </Stack>

        <List>
          {navLinks.map((link) => (
            <ListItemButton
              key={link.id}
              component="a"
              href={`#${link.id}`}
              onClick={closeDrawer}
              sx={{ borderRadius: 2 }}
            >
              <ListItemText
                primary={link.label}
                primaryTypographyProps={{
                  sx: {
                    fontWeight: active === link.id ? 700 : 500,
                    color: active === link.id ? 'primary.dark' : 'text.primary',
                  },
                }}
              />
            </ListItemButton>
          ))}
        </List>

        <GradientButton
          component={RouterLink}
          to={portalPath}
          onClick={closeDrawer}
          fullWidth
          sx={{ mt: 2 }}
        >
          {portalLabel}
        </GradientButton>
      </Drawer>
    </Box>
  );
}

export default Navbar;
