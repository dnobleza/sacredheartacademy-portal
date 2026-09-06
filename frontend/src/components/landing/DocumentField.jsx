import { useRef } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { FileText, Upload, X } from 'lucide-react';
import { CARD_RADIUS } from '../../theme';

// Mirrors the server's allowlist in backend/src/middleware/upload.js. The
// server rejects anything else regardless; this only saves a wasted upload.
export const ACCEPTED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
export const MAX_BYTES = 5 * 1024 * 1024;

const formatSize = (bytes) => {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const kb = bytes / 1024;
  return kb < 1024 ? `${Math.round(kb)} KB` : `${(kb / 1024).toFixed(1)} MB`;
};

/**
 * One optional attachment on the public application form.
 *
 * Unlike the admin ImageField, this holds the File in memory instead of
 * uploading it on selection: an applicant has no account, so there is no
 * authenticated upload endpoint to post to. The files ride along with the
 * application itself, as one multipart request.
 */
function DocumentField({ name, label, hint, value, error, onChange }) {
  const inputRef = useRef(null);

  const handleSelect = (event) => {
    const [file] = event.target.files || [];

    // Let the same file be picked again after a removal.
    event.target.value = '';

    if (!file) {
      return;
    }

    if (!ACCEPTED_TYPES.includes(file.type)) {
      onChange(name, null, 'Attach a PDF, JPEG, PNG, or WebP file.');
      return;
    }

    if (file.size > MAX_BYTES) {
      onChange(name, null, 'That file is larger than 5MB.');
      return;
    }

    onChange(name, file, '');
  };

  return (
    <Box
      sx={{
        borderRadius: CARD_RADIUS,
        border: '1px solid',
        borderColor: error ? 'error.main' : 'rgba(22,59,56,0.12)',
        p: 2,
        height: '100%',
      }}
    >
      <Typography variant="body2" sx={{ fontWeight: 700 }}>
        {label}
      </Typography>
      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1.5 }}>
        {hint}
      </Typography>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(',')}
        onChange={handleSelect}
        style={{ display: 'none' }}
        aria-label={label}
      />

      {value ? (
        <Stack direction="row" alignItems="center" spacing={1}>
          <Box aria-hidden="true" sx={{ color: 'primary.dark', display: 'flex', flexShrink: 0 }}>
            <FileText size={18} />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
              {value.name}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {formatSize(value.size)}
            </Typography>
          </Box>
          <IconButton
            size="small"
            aria-label={`Remove ${label}`}
            onClick={() => onChange(name, null, '')}
            sx={{ ml: 'auto', flexShrink: 0 }}
          >
            <X size={16} />
          </IconButton>
        </Stack>
      ) : (
        <Button
          size="small"
          variant="outlined"
          startIcon={<Upload size={16} />}
          onClick={() => inputRef.current?.click()}
          sx={{ borderRadius: CARD_RADIUS, fontWeight: 700 }}
        >
          Choose file
        </Button>
      )}

      {error ? (
        <Typography variant="caption" sx={{ color: 'error.main', display: 'block', mt: 1 }}>
          {error}
        </Typography>
      ) : null}
    </Box>
  );
}

export default DocumentField;
