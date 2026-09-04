import Button from '@mui/material/Button';
import { AQUA, AQUA_GRADIENT } from '../../theme';

/**
 * Primary call to action: aqua gradient pill with a soft aqua glow.
 */
function GradientButton({ sx = {}, children, ...rest }) {
  return (
    <Button
      variant="contained"
      sx={{
        background: AQUA_GRADIENT,
        color: '#FFFFFF',
        boxShadow: `0 12px 28px ${AQUA.primary}59`,
        transition: 'transform 220ms ease, box-shadow 220ms ease',
        '&:hover': {
          background: AQUA_GRADIENT,
          transform: 'translateY(-2px)',
          boxShadow: `0 18px 36px ${AQUA.primary}73`,
        },
        ...sx,
      }}
      {...rest}
    >
      {children}
    </Button>
  );
}

export default GradientButton;
