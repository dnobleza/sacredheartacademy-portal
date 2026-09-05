import { useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Collapse from '@mui/material/Collapse';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import MenuList from '@mui/material/MenuList';
import Popover from '@mui/material/Popover';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Badge from '@mui/material/Badge';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import {
  BookOpen,
  CalendarClock,
  CalendarDays,
  CalendarRange,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  DoorOpen,
  FileText,
  GraduationCap,
  Layers,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu as MenuIcon,
  MessageSquare,
  Presentation,
  ShieldCheck,
  UserCircle,
  Users,
  Users2,
  UsersRound,
} from 'lucide-react';
import Logo from '../components/common/Logo';
import NotificationBell from '../components/common/NotificationBell';
import { fetchUnreadMessageCount } from '../services/messagesApi';
import { useAuth } from '../context/AuthContext';
import { roleLabel } from '../utils/roles';
import { glass, AQUA } from '../theme';
import { school } from '../data/landing';

const ICONS = {
  LayoutDashboard,
  GraduationCap,
  Presentation,
  ShieldCheck,
  UserCircle,
  Users,
  UsersRound,
  CalendarDays,
  CalendarRange,
  Layers,
  DoorOpen,
  BookOpen,
  CalendarClock,
  ClipboardCheck,
  ClipboardList,
  FileText,
  Users2,
  Megaphone,
  MessageSquare,
};

// Wide enough for the longest nav label ("Academic Management") plus its icon
// and chevron; below this the label truncates and the chevron is pushed out.
const EXPANDED_WIDTH = 296;
const COLLAPSED_WIDTH = 76;

/**
 * Remembering the rail state is a per-viewer convenience; a browser that
 * refuses storage simply starts expanded every time. Each portal keeps its own
 * key so collapsing the teacher rail does not collapse the admin one.
 */
const readCollapsed = (storageKey) => {
  try {
    return window.localStorage.getItem(storageKey) === 'true';
  } catch {
    return false;
  }
};

const navLinkSx = (collapsed) => ({
  display: 'flex',
  alignItems: 'center',
  gap: 1.75,
  px: collapsed ? 0 : 2,
  justifyContent: collapsed ? 'center' : 'flex-start',
  py: 1.25,
  borderRadius: 2.5,
  textDecoration: 'none',
  color: 'text.secondary',
  fontWeight: 600,
  fontSize: '0.9375rem',
  transition: 'background-color 180ms ease, color 180ms ease',
  '&:hover': { backgroundColor: 'primary.light', color: 'primary.dark' },
  '&.active': {
    backgroundColor: 'primary.light',
    color: 'primary.dark',
    fontWeight: 700,
  },
});

/**
 * Drops nav entries above the viewer's access level. Convenience only — the
 * backend guards those routes itself — so an unknown level hides the gated
 * entries rather than revealing them.
 */
const visibleNav = (items, level) =>
  items
    .filter((item) => item.minAccessLevel === undefined || level >= item.minAccessLevel)
    .map((item) =>
      item.children ? { ...item, children: visibleNav(item.children, level) } : item,
    )
    .filter((item) => !item.children || item.children.length > 0);

// Matches the notification bell's cadence so the two counters move together.
const UNREAD_POLL_INTERVAL_MS = 30000;

/**
 * Unread messages addressed to the viewer, for the nav badge. A failed poll
 * keeps the last known count rather than flashing the badge away.
 */
const useUnreadMessageCount = () => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const load = () => {
      fetchUnreadMessageCount()
        .then((value) => {
          if (!cancelled) {
            setCount(value);
          }
        })
        .catch(() => {});
    };

    load();
    const timer = window.setInterval(load, UNREAD_POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  return count;
};

// A group shows the total of its children so a collapsed rail or a closed
// group still reveals that something is waiting.
const badgeCountFor = (item, unreadMessages) => {
  if (item.children) {
    return item.children.reduce((total, child) => total + badgeCountFor(child, unreadMessages), 0);
  }

  return item.badge === 'messages' ? unreadMessages : 0;
};

function NavBadge({ count, children }) {
  if (!count) {
    return children;
  }

  return (
    <Badge
      badgeContent={count}
      color="error"
      max={99}
      sx={{ '& .MuiBadge-badge': { fontSize: '0.6875rem', height: 18, minWidth: 18 } }}
    >
      {children}
    </Badge>
  );
}

function SidebarContent({ nav, portalLabel, collapsed, onNavigate, onToggle, onLogout, signingOut }) {
  const unreadMessages = useUnreadMessageCount();
  const location = useLocation();
  const { user } = useAuth();

  const navItems = useMemo(
    () => visibleNav(nav, user?.access_level?.level ?? -1),
    [nav, user],
  );
  const [openGroups, setOpenGroups] = useState({});
  const [popover, setPopover] = useState({ anchorEl: null, item: null });

  const toggleGroup = (key) => {
    setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleGroupKeyDown = (event, item) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    if (event.key === ' ') event.preventDefault();
    if (collapsed) {
      setPopover({ anchorEl: event.currentTarget, item });
    } else {
      toggleGroup(item.key);
    }
  };

  const openPopover = (event, item) => {
    setPopover({ anchorEl: event.currentTarget, item });
  };

  const closePopover = () => setPopover({ anchorEl: null, item: null });

  const handleSurfaceClick = (event) => {
    if (!onToggle) return;
    if (event.target.closest('a')) return;
    if (event.target.closest('[data-nav-group]')) return;
    if (event.target.closest('[data-logout]')) return;
    onToggle();
  };

  const handleSurfaceKeyDown = (event) => {
    if (!onToggle) return;
    if (event.key === 'Enter') {
      onToggle();
    } else if (event.key === ' ') {
      event.preventDefault();
      onToggle();
    }
  };

  // Applied to the header and the empty area below the nav — never to an
  // ancestor of the nav itself, since links nested inside role="button" are
  // invalid ARIA and screen readers may skip them.
  const toggleProps = onToggle
    ? {
        role: 'button',
        tabIndex: 0,
        'aria-expanded': !collapsed,
        'aria-label': collapsed ? 'Expand sidebar' : 'Collapse sidebar',
        onClick: handleSurfaceClick,
        onKeyDown: handleSurfaceKeyDown,
        sx: {
          cursor: 'pointer',
          '&:focus-visible': { outline: `2px solid ${AQUA.dark}`, outlineOffset: -2 },
        },
      }
    : {};

  const { sx: toggleSx, ...toggleHandlers } = toggleProps;

  return (
    <Stack sx={{ height: '100%' }}>
      <Stack
        direction="row"
        alignItems="center"
        spacing={1.5}
        sx={{ px: collapsed ? 1.5 : 2.5, py: 2.5, minHeight: 76, ...toggleSx }}
        {...toggleHandlers}
      >
        <Logo size={40} />
        {!collapsed && (
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontWeight: 800, fontSize: '0.9375rem', lineHeight: 1.25 }} noWrap>
              {school.name}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {portalLabel}
            </Typography>
          </Box>
        )}
      </Stack>

      <Divider sx={{ borderColor: 'rgba(22,59,56,0.08)' }} />

      <Stack component="nav" aria-label={`${portalLabel} sections`} spacing={0.5} sx={{ p: 1.5 }}>
        {navItems.map((item) => {
          if (item.children) {
            const GroupIcon = ICONS[item.icon];
            const open = Boolean(openGroups[item.key]);
            const submenuId = `nav-group-${item.key}`;

            const groupToggle = (
              <Box
                data-nav-group="true"
                role="button"
                tabIndex={0}
                aria-expanded={open}
                aria-controls={submenuId}
                onClick={(event) => {
                  event.stopPropagation();
                  if (collapsed) {
                    openPopover(event, item);
                  } else {
                    toggleGroup(item.key);
                  }
                }}
                onKeyDown={(event) => {
                  event.stopPropagation();
                  handleGroupKeyDown(event, item);
                }}
                sx={{
                  ...navLinkSx(collapsed),
                  cursor: 'pointer',
                  '&:focus-visible': { outline: `2px solid ${AQUA.dark}`, outlineOffset: -2 },
                }}
              >
                <Box component="span" sx={{ display: 'flex', flexShrink: 0 }}>
                  <NavBadge count={badgeCountFor(item, unreadMessages)}>
                    <GroupIcon size={20} strokeWidth={2} />
                  </NavBadge>
                </Box>
                {!collapsed && (
                  <>
                    {/* minWidth: 0 lets this shrink below its text width. Without
                        it a flex item refuses to shrink past its content, so a
                        long label such as "Academic Management" pushed the
                        chevron outside the sidebar and it vanished. */}
                    <Box
                      component="span"
                      sx={{
                        flexGrow: 1,
                        minWidth: 0,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {item.label}
                    </Box>
                    <Box component="span" sx={{ display: 'flex', flexShrink: 0 }}>
                      {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </Box>
                  </>
                )}
              </Box>
            );

            return (
              <Box key={item.key}>
                {collapsed ? (
                  <Tooltip title={item.label} placement="right">
                    {groupToggle}
                  </Tooltip>
                ) : (
                  groupToggle
                )}

                {!collapsed && (
                  <Collapse in={open} timeout="auto" unmountOnExit>
                    <Stack
                      id={submenuId}
                      component="ul"
                      spacing={0.5}
                      sx={{ listStyle: 'none', m: 0, pl: 2.5, pt: 0.5 }}
                    >
                      {item.children.map((child) => {
                        const ChildIcon = ICONS[child.icon];
                        return (
                          <Box component="li" key={child.to} sx={{ listStyle: 'none' }}>
                            <Box
                              component={NavLink}
                              to={child.to}
                              end={child.end}
                              onClick={onNavigate}
                              sx={navLinkSx(false)}
                            >
                              <Box component="span" sx={{ display: 'flex', flexShrink: 0 }}>
                                <NavBadge count={badgeCountFor(child, unreadMessages)}>
                                  <ChildIcon size={18} strokeWidth={2} />
                                </NavBadge>
                              </Box>
                              <span>{child.label}</span>
                            </Box>
                          </Box>
                        );
                      })}
                    </Stack>
                  </Collapse>
                )}

                {collapsed && popover.item?.key === item.key && (
                  <Popover
                    open={Boolean(popover.anchorEl)}
                    anchorEl={popover.anchorEl}
                    onClose={closePopover}
                    anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                    transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                    slotProps={{ paper: { sx: { ml: 1, borderRadius: 2.5 } } }}
                  >
                    <MenuList aria-label={item.label} sx={{ minWidth: 180 }}>
                      {item.children.map((child) => {
                        const ChildIcon = ICONS[child.icon];
                        const childActive = location.pathname.startsWith(child.to);
                        return (
                          <MenuItem
                            key={child.to}
                            component={NavLink}
                            to={child.to}
                            end={child.end}
                            onClick={() => {
                              closePopover();
                              onNavigate?.();
                            }}
                            sx={{
                              gap: 1.25,
                              fontWeight: 600,
                              color: childActive ? 'primary.dark' : 'text.secondary',
                              backgroundColor: childActive ? 'primary.light' : 'transparent',
                            }}
                          >
                            <NavBadge count={badgeCountFor(child, unreadMessages)}>
                              <ChildIcon size={18} strokeWidth={2} />
                            </NavBadge>
                            {child.label}
                          </MenuItem>
                        );
                      })}
                    </MenuList>
                  </Popover>
                )}
              </Box>
            );
          }

          const Icon = ICONS[item.icon];

          const link = (
            <Box
              key={item.to}
              component={NavLink}
              to={item.to}
              end={item.end}
              onClick={onNavigate}
              sx={navLinkSx(collapsed)}
            >
              <Box component="span" sx={{ display: 'flex', flexShrink: 0 }}>
                <NavBadge count={badgeCountFor(item, unreadMessages)}>
                  <Icon size={20} strokeWidth={2} />
                </NavBadge>
              </Box>
              {!collapsed && <span>{item.label}</span>}
            </Box>
          );

          return collapsed ? (
            <Tooltip key={item.to} title={item.label} placement="right">
              {link}
            </Tooltip>
          ) : (
            link
          );
        })}
      </Stack>

      {/* Empty space below the nav also toggles, so most of the sidebar
          surface is clickable without swallowing the links. Mouse only —
          the header above is the single keyboard-reachable control, so this
          does not add a second identical tab stop. */}
      <Box
        aria-hidden="true"
        onClick={onToggle ? handleSurfaceClick : undefined}
        sx={{ flexGrow: 1, cursor: onToggle ? 'pointer' : 'default' }}
      />

      {onLogout && (
        <Box sx={{ p: 1.5, pt: 0 }}>
          {(() => {
            const logoutButton = (
              <Box
                data-logout="true"
                component="button"
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onLogout();
                }}
                disabled={signingOut}
                sx={{
                  ...navLinkSx(collapsed),
                  width: '100%',
                  border: 'none',
                  backgroundColor: 'transparent',
                  cursor: 'pointer',
                  font: 'inherit',
                  opacity: signingOut ? 0.6 : 1,
                  pointerEvents: signingOut ? 'none' : 'auto',
                  // A soft tint, not error.light — a saturated red fill leaves
                  // the dark red label unreadable and shouts next to the aqua nav.
                  '&:hover': { backgroundColor: 'rgba(211,47,47,0.10)', color: 'error.main' },
                  '&:focus-visible': { outline: `2px solid ${AQUA.dark}`, outlineOffset: -2 },
                }}
              >
                <Box component="span" sx={{ display: 'flex', flexShrink: 0 }}>
                  <LogOut size={20} strokeWidth={2} />
                </Box>
                {!collapsed && <span>{signingOut ? 'Signing out…' : 'Logout'}</span>}
              </Box>
            );

            return collapsed ? (
              <Tooltip title="Logout" placement="right">
                {logoutButton}
              </Tooltip>
            ) : (
              logoutButton
            );
          })()}
        </Box>
      )}
    </Stack>
  );
}

/**
 * The shared sidebar shell. Admin and teacher portals differ only in their nav
 * data and the localStorage key for the collapse rail, so both mount this.
 */
function PortalLayout({ nav, storageKey, portalLabel }) {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const { user, profile, logout } = useAuth();
  const navigate = useNavigate();

  const [collapsed, setCollapsed] = useState(() => readCollapsed(storageKey));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, String(collapsed));
    } catch {
      // Storage unavailable — the rail just will not be remembered.
    }
  }, [collapsed, storageKey]);

  const handleLogout = async () => {
    setSigningOut(true);
    await logout();
    navigate('/login', { replace: true });
  };

  const displayName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ');
  const width = collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH;

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: AQUA.veryLight }}>
      {isDesktop ? (
        <Box
          component="aside"
          sx={{
            width,
            flexShrink: 0,
            position: 'sticky',
            top: 0,
            height: '100vh',
            backgroundColor: '#FFFFFF',
            borderRight: '1px solid rgba(22,59,56,0.08)',
            transition: 'width 220ms ease',
            overflowX: 'hidden',
          }}
        >
          <SidebarContent
            nav={nav}
            portalLabel={portalLabel}
            collapsed={collapsed}
            onToggle={() => setCollapsed((value) => !value)}
            onLogout={handleLogout}
            signingOut={signingOut}
          />
        </Box>
      ) : (
        <Drawer
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          PaperProps={{ sx: { width: EXPANDED_WIDTH } }}
        >
          <SidebarContent
            nav={nav}
            portalLabel={portalLabel}
            collapsed={false}
            onNavigate={() => setMobileOpen(false)}
            onLogout={handleLogout}
            signingOut={signingOut}
          />
        </Drawer>
      )}

      <Box sx={{ flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <Box
          component="header"
          sx={{
            ...glass,
            borderRadius: 0,
            borderLeft: 'none',
            borderRight: 'none',
            borderTop: 'none',
            boxShadow: 'none',
            position: 'sticky',
            top: 0,
            zIndex: 5,
            px: { xs: 2, md: 3 },
            py: 1.5,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
          }}
        >
          {!isDesktop && (
            <IconButton
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation menu"
              sx={{ color: 'text.primary' }}
            >
              <MenuIcon size={20} />
            </IconButton>
          )}

          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ ml: 'auto', minWidth: 0 }}>
            <NotificationBell />

            <Box sx={{ textAlign: 'right', minWidth: 0, display: { xs: 'none', sm: 'block' } }}>
              {displayName && (
                <Typography sx={{ fontWeight: 700, fontSize: '0.9375rem', lineHeight: 1.3 }} noWrap>
                  {displayName}
                </Typography>
              )}
              <Typography variant="caption" sx={{ color: 'text.secondary' }} noWrap>
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
          </Stack>
        </Box>

        <Box component="main" sx={{ p: { xs: 2.5, md: 4 }, flexGrow: 1 }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}

export default PortalLayout;
