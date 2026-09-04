import { useCallback, useEffect, useState } from 'react';
import Badge from '@mui/material/Badge';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Bell } from 'lucide-react';
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../../services/notificationsApi';

// The bell polls rather than holding a socket; the same interval the messages
// page uses keeps the two feeling equally live without a second transport.
const POLL_INTERVAL_MS = 30000;

const formatWhen = (value) => {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();

  return sameDay
    ? date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString(undefined, { dateStyle: 'medium' });
};

function NotificationBell() {
  const [anchorEl, setAnchorEl] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await fetchNotifications();
      setNotifications(data.notifications);
      setUnreadCount(data.unread_count);
      setFailed(false);
    } catch {
      // A failed poll leaves the last known list on screen rather than
      // clearing the bell or interrupting the page.
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    load();
    const timer = window.setInterval(load, POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [load]);

  const handleOpen = (event) => {
    setAnchorEl(event.currentTarget);
    load();
  };

  const handleItemClick = async (notification) => {
    if (notification.is_read) {
      return;
    }

    // Optimistic: the row is already marked in the UI, and the next poll
    // corrects it if the request did not land.
    setNotifications((current) =>
      current.map((row) => (row.id === notification.id ? { ...row, is_read: true } : row)),
    );
    setUnreadCount((count) => Math.max(count - 1, 0));

    try {
      await markNotificationRead(notification.id);
    } catch {
      load();
    }
  };

  const handleMarkAll = async () => {
    setNotifications((current) => current.map((row) => ({ ...row, is_read: true })));
    setUnreadCount(0);

    try {
      await markAllNotificationsRead();
    } catch {
      load();
    }
  };

  return (
    <>
      <IconButton
        onClick={handleOpen}
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        sx={{ color: 'text.primary', flexShrink: 0 }}
      >
        <Badge badgeContent={unreadCount} color="error" max={99}>
          <Bell size={20} />
        </Badge>
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { width: 360, maxWidth: '92vw', maxHeight: 420 } } }}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 2, py: 1 }}>
          <Typography sx={{ fontWeight: 800 }}>Notifications</Typography>
          {unreadCount > 0 ? (
            <Button size="small" onClick={handleMarkAll} sx={{ textTransform: 'none', fontWeight: 700 }}>
              Mark all read
            </Button>
          ) : null}
        </Stack>

        <Divider sx={{ borderColor: 'rgba(22,59,56,0.08)' }} />

        {notifications.length === 0 ? (
          <MenuItem disabled sx={{ opacity: '1 !important', color: 'text.secondary' }}>
            {failed ? 'Could not load notifications' : 'No notifications yet'}
          </MenuItem>
        ) : (
          notifications.map((notification) => (
            <MenuItem
              key={notification.id}
              onClick={() => handleItemClick(notification)}
              sx={{
                alignItems: 'flex-start',
                whiteSpace: 'normal',
                py: 1.25,
                backgroundColor: notification.is_read ? 'transparent' : 'primary.light',
              }}
            >
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: notification.is_read ? 600 : 800 }}>
                  {notification.title}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: 'text.secondary',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {notification.message}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {formatWhen(notification.created_at)}
                </Typography>
              </Box>
            </MenuItem>
          ))
        )}
      </Menu>
    </>
  );
}

export default NotificationBell;
