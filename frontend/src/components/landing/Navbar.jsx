import { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { ChevronDown, Menu as MenuIcon, Search, X } from 'lucide-react';
import GradientButton from '../common/GradientButton';
import AdmissionFormDialog from './AdmissionFormDialog';
import Logo from '../common/Logo';
import { glass } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import { roleHome } from '../../utils/roles';
import { navLinks, school } from '../../data/landing';

// A dropdown child is one of three things: a route (`to`), an in-page anchor
// (`href`), or an action that runs on click and navigates nowhere.
const childComponent = (child) => {
  if (child.to) {
    return RouterLink;
  }

  return child.href ? 'a' : 'div';
};

function Navbar() {
  const { isAuthenticated, user } = useAuth();
  const portalPath = isAuthenticated ? roleHome(user.role) : '/login';
  const portalLabel = isAuthenticated ? 'Go to Portal' : 'Student Portal';

  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(navLinks[0].id);
  const [menu, setMenu] = useState({ anchorEl: null, id: null });
  const [admissionFormOpen, setAdmissionFormOpen] = useState(false);

  useEffect(() => {
    const sections = navLinks
      .filter((link) => !link.to)
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
  const closeMenu = () => setMenu({ anchorEl: null, id: null });

  // The only action a nav child can carry today. Kept as a lookup rather than
  // an inline check so a second one is a data change, not a component change.
  const NAV_ACTIONS = { 'admission-form': () => setAdmissionFormOpen(true) };

  const runAction = (name) => NAV_ACTIONS[name]?.();

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
                // Typography's default body line-height (1.5) pads the text box
                // well above and below the glyphs, so centering it against the
                // tightly-bound 42px logo left it looking a few pixels low.
                lineHeight: 1,
              }}
            >
              {school.name}
            </Typography>
          </Stack>

          <Stack
            direction="row"
            spacing={0.5}
            // The brand and actions Stacks on either side both center their
            // children explicitly; this one relied on the flex default
            // (stretch), which is what made it look out of line with them.
            alignItems="center"
            sx={{ ml: 'auto', minWidth: 0, display: { xs: 'none', lg: 'flex' } }}
          >
            {navLinks.map((link) => {
              const linkSx = {
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
              };

              if (link.children) {
                const menuId = `nav-menu-${link.id}`;
                const menuOpen = menu.id === link.id;

                return (
                  <Box key={link.id}>
                    <Box
                      component="button"
                      type="button"
                      aria-haspopup="menu"
                      aria-expanded={menuOpen}
                      aria-controls={menuOpen ? menuId : undefined}
                      onClick={(event) => setMenu({ anchorEl: event.currentTarget, id: link.id })}
                      sx={{
                        ...linkSx,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 0.5,
                        border: 'none',
                        cursor: 'pointer',
                        // A native <button> carries its own font, line-height and
                        // margin from the UA stylesheet, so it sat a couple of
                        // pixels off from the sibling <a> links despite identical
                        // padding. Reset it to inherit the surrounding text box.
                        margin: 0,
                        font: 'inherit',
                        lineHeight: 'inherit',
                        appearance: 'none',
                        // Firefox adds its own inner border/padding to buttons
                        // that padding alone can't override.
                        '&::-moz-focus-inner': { border: 0, padding: 0 },
                      }}
                    >
                      {link.label}
                      <ChevronDown size={15} />
                    </Box>

                    <Menu
                      id={menuId}
                      anchorEl={menu.anchorEl}
                      open={menuOpen}
                      onClose={closeMenu}
                      anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                      transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                      slotProps={{ paper: { sx: { mt: 1, borderRadius: 2.5, minWidth: 200 } } }}
                    >
                      {link.children.map((child) => (
                        <MenuItem
                          key={child.to || child.href || child.action}
                          component={childComponent(child)}
                          to={child.to}
                          href={child.href}
                          onClick={() => {
                            closeMenu();
                            if (child.action) {
                              runAction(child.action);
                            }
                          }}
                          sx={{ fontWeight: 600, color: 'text.secondary' }}
                        >
                          {child.label}
                        </MenuItem>
                      ))}
                    </Menu>
                  </Box>
                );
              }

              return (
                <Box
                  key={link.id}
                  component={link.to ? RouterLink : 'a'}
                  to={link.to}
                  href={link.to ? undefined : `#${link.id}`}
                  aria-current={active === link.id ? 'true' : undefined}
                  sx={linkSx}
                >
                  {link.label}
                </Box>
              );
            })}
          </Stack>

          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            sx={{ ml: { xs: 'auto', lg: 2 }, flexShrink: 0 }}
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
                whiteSpace: 'nowrap',
                flexShrink: 0,
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
            <Box key={link.id}>
              <ListItemButton
                component={link.to ? RouterLink : 'a'}
                to={link.to}
                href={link.to ? undefined : `#${link.id}`}
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

              {/* The drawer has room to show the children outright, so there is
                  no second tap to expand them. */}
              {link.children?.map((child) => (
                <ListItemButton
                  key={child.to || child.href || child.action}
                  component={childComponent(child)}
                  to={child.to}
                  href={child.href}
                  onClick={() => {
                    closeDrawer();
                    if (child.action) {
                      runAction(child.action);
                    }
                  }}
                  sx={{ borderRadius: 2, pl: 4 }}
                >
                  <ListItemText
                    primary={child.label}
                    primaryTypographyProps={{ sx: { fontSize: '0.9375rem', color: 'text.secondary' } }}
                  />
                </ListItemButton>
              ))}
            </Box>
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

      <AdmissionFormDialog
        open={admissionFormOpen}
        onClose={() => setAdmissionFormOpen(false)}
      />
    </Box>
  );
}

export default Navbar;
