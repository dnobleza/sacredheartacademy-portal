import { useCallback, useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../../services/notificationsApi';
import { extractErrorMessage } from '../../services/api';
import { formatDateTime } from '../../utils/format';
import { CARD_RADIUS } from '../../theme';

const CARD_BORDER = '1px solid rgba(22,59,56,0.08)';

/**
 * The full-page version of the bell. The dropdown shows the latest few; this
 * lists everything and is what a sidebar Notifications entry points at.
 */
function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const data = await fetchNotifications();
      setNotifications(data.notifications || []);
      setUnread(data.unread_count || 0);
      setError('');
    } catch (requestError) {
      setError(extractErrorMessage(requestError, 'Could not load notifications.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleRead = async (notification) => {
    if (notification.is_read) {
      return;
    }

    try {
      await markNotificationRead(notification.id);
      await load();
    } catch {
      // A failed read is not worth interrupting the list for.
    }
  };

  const handleReadAll = async () => {
    try {
      await markAllNotificationsRead();
      await load();
    } catch (requestError) {
      setError(extractErrorMessage(requestError, 'Could not mark them read.'));
    }
  };

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1 }}>
        <Typography variant="h2" component="h1" sx={{ fontSize: { xs: '1.6rem', md: '2rem' } }}>
          Notifications
        </Typography>
        {unread > 0 && <Chip label={`${unread} unread`} color="error" sx={{ fontWeight: 700 }} />}
      </Stack>

      <Stack direction="row" alignItems="center" sx={{ mb: 4 }}>
        <Typography variant="body1" sx={{ color: 'text.secondary' }}>
          Everything the system has sent you.
        </Typography>
        {unread > 0 && (
          <Button onClick={handleReadAll} sx={{ ml: 'auto', fontWeight: 700 }}>
            Mark all read
          </Button>
        )}
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: CARD_RADIUS }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}>
          <CircularProgress size={26} aria-label="Loading notifications" />
        </Box>
      ) : notifications.length === 0 ? (
        <Paper
          elevation={0}
          sx={{ borderRadius: CARD_RADIUS, border: CARD_BORDER, backgroundColor: '#FFFFFF', py: 6, textAlign: 'center' }}
        >
          <Typography sx={{ color: 'text.secondary' }}>Nothing here yet.</Typography>
        </Paper>
      ) : (
        <Stack spacing={1.5}>
          {notifications.map((notification) => (
            <Paper
              key={notification.id}
              elevation={0}
              onClick={() => handleRead(notification)}
              sx={{
                borderRadius: CARD_RADIUS,
                border: CARD_BORDER,
                backgroundColor: notification.is_read ? '#FFFFFF' : 'primary.light',
                p: 2.5,
                cursor: notification.is_read ? 'default' : 'pointer',
              }}
            >
              <Stack direction="row" alignItems="center" spacing={1}>
                <Typography sx={{ fontWeight: 700 }}>{notification.title}</Typography>
                {!notification.is_read && <Chip size="small" color="error" label="New" sx={{ fontWeight: 700 }} />}
                <Typography variant="caption" sx={{ color: 'text.secondary', ml: 'auto' }}>
                  {formatDateTime(notification.created_at)}
                </Typography>
              </Stack>
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                {notification.message}
              </Typography>
            </Paper>
          ))}
        </Stack>
      )}
    </Box>
  );
}

export default NotificationsPage;
