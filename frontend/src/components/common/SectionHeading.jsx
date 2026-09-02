import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Reveal from './Reveal';

/**
 * Eyebrow label + section h2 + optional supporting lede.
 * `id` is wired to the parent Section's aria-labelledby.
 */
function SectionHeading({ id, eyebrow, heading, lede, align = 'center', maxWidth = 720, sx = {} }) {
  const centered = align === 'center';

  return (
    <Reveal
      sx={{
        textAlign: align,
        maxWidth,
        mx: centered ? 'auto' : 0,
        ...sx,
      }}
    >
      {eyebrow && (
        <Typography
          component="p"
          sx={{
            color: 'primary.dark',
            fontWeight: 700,
            fontSize: '0.8125rem',
            letterSpacing: '0.16em',
            mb: 1.5,
          }}
        >
          {eyebrow}
        </Typography>
      )}

      <Typography id={id} variant="h2" component="h2">
        {heading}
      </Typography>

      {lede && (
        <Typography variant="body1" sx={{ color: 'text.secondary', mt: 2.5 }}>
          {lede}
        </Typography>
      )}

      <Box
        aria-hidden="true"
        sx={{
          width: 56,
          height: 4,
          borderRadius: 999,
          background: 'linear-gradient(90deg, #20BFA9 0%, #159A89 100%)',
          mt: 3,
          mx: centered ? 'auto' : 0,
        }}
      />
    </Reveal>
  );
}

export default SectionHeading;
