import { useEffect, useRef, useState } from 'react';
import Box from '@mui/material/Box';

/**
 * Fades its children in with a slight upward movement the first time they
 * scroll into view. Motion is suppressed under prefers-reduced-motion via the
 * global CssBaseline override in theme.js.
 */
function Reveal({ children, delay = 0, sx = {}, ...rest }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;

    if (!node || typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // Reveal when the element enters the viewport, or when it is already
          // above it — lazily loaded images can grow the page and push an
          // element past the fold before the observer ever reports it visible.
          const alreadyPassed = entry.boundingClientRect.top < window.innerHeight;

          if (entry.isIntersecting || alreadyPassed) {
            setVisible(true);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0, rootMargin: '0px 0px -40px 0px' },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <Box
      ref={ref}
      sx={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'none' : 'translateY(16px)',
        transition: 'opacity 620ms ease, transform 620ms ease',
        transitionDelay: `${delay}ms`,
        ...sx,
      }}
      {...rest}
    >
      {children}
    </Box>
  );
}

export default Reveal;
