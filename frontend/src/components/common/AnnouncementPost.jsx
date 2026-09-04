import { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { fetchImageObjectUrl } from '../../services/imagesApi';
import { AQUA_GRADIENT } from '../../theme';

const AUDIENCE_LABELS = {
  all: 'Everyone',
  students: 'Students',
  teachers: 'Teachers',
  parents: 'Parents',
};

export const formatDate = (value) => {
  if (!value) {
    return '—';
  }

  // Plain YYYY-MM-DD school-year boundaries — parsing as UTC midnight would
  // render a day early anywhere west of Greenwich, so build in local time.
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value));
  const date = dateOnly
    ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
    : new Date(value);

  return date.toLocaleDateString(undefined, { dateStyle: 'medium' });
};

/**
 * Object URL for an authenticated image, or null while loading / on failure.
 * Mirrors the pattern in pages/admin/Profile.jsx: the images endpoint needs a
 * bearer token, so the bytes are fetched as a blob and the URL is revoked when
 * the id changes or the component unmounts.
 */
export function useImageObjectUrl(imageId) {
  const [url, setUrl] = useState(null);

  useEffect(() => {
    if (!imageId) {
      setUrl(null);
      return undefined;
    }

    let active = true;
    let created = null;

    fetchImageObjectUrl(imageId)
      .then((objectUrl) => {
        if (!active) {
          URL.revokeObjectURL(objectUrl);
          return;
        }

        created = objectUrl;
        setUrl(objectUrl);
      })
      .catch(() => {
        // A missing or unreadable image just hides the picture; the post text
        // still renders.
        if (active) {
          setUrl(null);
        }
      });

    return () => {
      active = false;

      if (created) {
        URL.revokeObjectURL(created);
      }
    };
  }, [imageId]);

  return url;
}

/**
 * Feed-style announcement card, shared by the admin and teacher dashboards.
 * `manageTo` is where the footer link points — admins manage announcements,
 * teachers only read them, so the link is optional.
 */
function AnnouncementPost({ announcement, manageTo }) {
  const imageUrl = useImageObjectUrl(announcement.image_id);
  const authorPhotoUrl = useImageObjectUrl(announcement.author_photo_id);

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 4,
        border: '1px solid rgba(22,59,56,0.08)',
        backgroundColor: '#FFFFFF',
        overflow: 'hidden',
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ p: 2.5, pb: 1.5 }}>
        <Avatar src={authorPhotoUrl || undefined} sx={{ width: 44, height: 44, background: AQUA_GRADIENT, fontWeight: 700 }}>
          {(announcement.author_name || '?').trim()[0]?.toUpperCase()}
        </Avatar>

        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontWeight: 700 }} noWrap>
            {announcement.author_name}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {formatDate(announcement.created_at)}
          </Typography>
        </Box>

        <Chip
          label={AUDIENCE_LABELS[announcement.target_role] || announcement.target_role}
          size="small"
          sx={{ ml: 'auto', backgroundColor: 'primary.light', color: 'primary.dark', fontWeight: 700, flexShrink: 0 }}
        />
      </Stack>

      <Box sx={{ px: 2.5, pb: 2 }}>
        <Typography sx={{ fontWeight: 700, fontSize: '1.05rem', mb: 0.5 }}>{announcement.title}</Typography>
        {/* Announcement bodies are plain text typed by an admin; keeping them
            in a Typography (never dangerouslySetInnerHTML) means any markup a
            user pastes renders as text rather than executing. */}
        <Typography variant="body2" sx={{ color: 'text.secondary', whiteSpace: 'pre-wrap' }}>
          {announcement.content}
        </Typography>
      </Box>

      {imageUrl ? (
        <Box
          component="img"
          src={imageUrl}
          alt=""
          sx={{ display: 'block', width: '100%', maxHeight: 460, objectFit: 'cover' }}
        />
      ) : null}

      {manageTo ? (
        <Box sx={{ px: 2.5, py: 1.5, borderTop: '1px solid rgba(22,59,56,0.08)' }}>
          <Typography
            component={RouterLink}
            to={manageTo}
            variant="body2"
            sx={{ color: 'primary.dark', fontWeight: 700, textDecoration: 'none' }}
          >
            Manage announcement
          </Typography>
        </Box>
      ) : null}
    </Paper>
  );
}

export default AnnouncementPost;
