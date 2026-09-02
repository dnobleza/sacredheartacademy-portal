import Box from '@mui/material/Box';
import { glass } from '../../theme';

/**
 * Frosted glass surface. Pass `hover` to add the lift-on-hover interaction used
 * by the feature, program, and news cards.
 */
function GlassCard({ hover = false, component = 'div', sx = {}, children, ...rest }) {
  return (
    <Box
      component={component}
      sx={{
        ...glass,
        p: { xs: 3, md: 3.5 },
        transition: 'transform 300ms ease, box-shadow 300ms ease',
        ...(hover && {
          '&:hover': {
            transform: 'translateY(-6px)',
            boxShadow: '0 30px 60px rgba(22,59,56,0.14)',
          },
        }),
        ...sx,
      }}
      {...rest}
    >
      {children}
    </Box>
  );
}

export default GlassCard;
