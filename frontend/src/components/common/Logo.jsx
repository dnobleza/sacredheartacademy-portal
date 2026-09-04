import Box from '@mui/material/Box';

/**
 * The Sacred Heart Academy seal. Served from /public so it is not bundled.
 * Decorative by default — the school name sits beside it as real text.
 */
function Logo({ size = 40, alt = '', sx = {} }) {
  return (
    <Box
      component="img"
      src="/logo.png"
      alt={alt}
      aria-hidden={alt ? undefined : 'true'}
      width={size}
      height={size}
      sx={{
        width: size,
        height: size,
        borderRadius: '50%',
        objectFit: 'contain',
        flexShrink: 0,
        ...sx,
      }}
    />
  );
}

export default Logo;
