import { useEffect, useRef, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { ImagePlus, Trash2 } from 'lucide-react';
import { fetchImageObjectUrl, uploadImage } from '../../services/imagesApi';
import { extractErrorMessage } from '../../services/api';

// Mirrors the backend's fileFilter and size limit, so an obviously wrong file
// is refused before it costs a round trip. The server still enforces both —
// this is only to save the user the wait.
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 5 * 1024 * 1024;

/**
 * Picks an image and yields its id. The value handed up is the images.id the
 * owning record stores, never the file itself: the upload happens as soon as a
 * file is chosen, so by the time the form is submitted the id already exists.
 */
function ImageField({ label, value, onChange, disabled }) {
  const inputRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Object URLs are revoked when the id changes or the field unmounts;
  // otherwise every preview leaks a blob for the life of the document.
  useEffect(() => {
    if (!value) {
      setPreviewUrl(null);
      return undefined;
    }

    let active = true;
    let created = null;

    setLoading(true);
    fetchImageObjectUrl(value)
      .then((url) => {
        if (!active) {
          // Resolved after unmount — nothing will render it, so release it now.
          URL.revokeObjectURL(url);
          return;
        }

        created = url;
        setPreviewUrl(url);
      })
      .catch(() => {
        if (active) {
          // A missing or unreadable image should not block editing the record.
          setPreviewUrl(null);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;

      if (created) {
        URL.revokeObjectURL(created);
      }
    };
  }, [value]);

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    // Let the same file be chosen again after a failure.
    event.target.value = '';

    if (!file) {
      return;
    }

    if (!ACCEPTED.includes(file.type)) {
      setError('Choose a JPEG, PNG or WebP image.');
      return;
    }

    if (file.size > MAX_BYTES) {
      setError('Image must be 5MB or smaller.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const image = await uploadImage(file);
      onChange(image.id);
    } catch (uploadError) {
      setError(extractErrorMessage(uploadError, 'Could not upload that image.'));
      setLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600, mb: 1 }}>
        {label}
      </Typography>

      <Stack direction="row" spacing={2} alignItems="center">
        <Box
          sx={{
            width: 88,
            height: 88,
            borderRadius: 3,
            border: '1px solid rgba(22,59,56,0.12)',
            backgroundColor: 'rgba(22,59,56,0.03)',
            display: 'grid',
            placeItems: 'center',
            overflow: 'hidden',
            flexShrink: 0,
          }}
        >
          {loading && <CircularProgress size={20} aria-label="Loading image" />}
          {!loading && previewUrl && (
            <Box
              component="img"
              src={previewUrl}
              alt=""
              sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          )}
          {!loading && !previewUrl && <ImagePlus size={22} color="#7d8c8a" aria-hidden="true" />}
        </Box>

        <Stack spacing={1}>
          <Button
            onClick={() => inputRef.current?.click()}
            disabled={disabled || loading}
            variant="outlined"
            size="small"
            sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 700 }}
          >
            {value ? 'Replace' : 'Upload'}
          </Button>

          {value && (
            <Button
              onClick={() => {
                setError('');
                onChange(null);
              }}
              disabled={disabled || loading}
              size="small"
              startIcon={<Trash2 size={15} />}
              sx={{ borderRadius: 2.5, textTransform: 'none', color: 'error.main' }}
            >
              Remove
            </Button>
          )}
        </Stack>
      </Stack>

      <Box
        component="input"
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(',')}
        onChange={handleFile}
        sx={{ display: 'none' }}
      />

      {error && (
        <Alert severity="error" sx={{ mt: 1.5, borderRadius: 2 }}>
          {error}
        </Alert>
      )}
    </Box>
  );
}

export default ImageField;
