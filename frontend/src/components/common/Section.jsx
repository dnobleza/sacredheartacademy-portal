import Box from '@mui/material/Box';
import Container from '@mui/material/Container';

/**
 * Semantic <section> wrapper providing consistent vertical rhythm, an optional
 * background tint, and the shared max-width container.
 */
function Section({ id, labelledBy, background = 'transparent', sx = {}, containerSx = {}, children }) {
  return (
    <Box
      component="section"
      id={id}
      aria-labelledby={labelledBy}
      sx={{
        position: 'relative',
        background,
        py: { xs: 8, md: 12 },
        ...sx,
      }}
    >
      <Container maxWidth="lg" sx={containerSx}>
        {children}
      </Container>
    </Box>
  );
}

export default Section;
