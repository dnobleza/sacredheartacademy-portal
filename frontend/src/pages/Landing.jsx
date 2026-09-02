import Box from '@mui/material/Box';
import Navbar from '../components/landing/Navbar';
import Hero from '../components/landing/Hero';
import Stats from '../components/landing/Stats';
import About from '../components/landing/About';
import Features from '../components/landing/Features';
import Programs from '../components/landing/Programs';
import SchoolLife from '../components/landing/SchoolLife';
import News from '../components/landing/News';
import PortalCTA from '../components/landing/PortalCTA';
import Footer from '../components/landing/Footer';
import { AQUA } from '../theme';

/**
 * Decorative aqua wash behind the upper half of the page: a soft vertical
 * gradient, two radial glows, and a few blurred circles. Fixed, non-interactive,
 * and hidden from assistive technology.
 */
function BackgroundDecor() {
  return (
    <Box
      aria-hidden="true"
      sx={{
        position: 'fixed',
        inset: 0,
        zIndex: -1,
        pointerEvents: 'none',
        background: `
          radial-gradient(60rem 40rem at 85% -5%, ${AQUA.primary}26 0%, transparent 60%),
          radial-gradient(45rem 35rem at 5% 30%, ${AQUA.primary}1A 0%, transparent 62%),
          linear-gradient(180deg, ${AQUA.light} 0%, ${AQUA.veryLight} 28%, #FFFFFF 60%)
        `,
        '& span': {
          position: 'absolute',
          borderRadius: '50%',
          filter: 'blur(60px)',
          opacity: 0.5,
        },
      }}
    >
      <Box component="span" sx={{ width: 260, height: 260, top: '6%', right: '12%', background: `${AQUA.primary}4D` }} />
      <Box component="span" sx={{ width: 200, height: 200, top: '38%', left: '4%', background: `${AQUA.dark}33` }} />
      <Box component="span" sx={{ width: 300, height: 300, top: '62%', right: '2%', background: `${AQUA.primary}2E` }} />
    </Box>
  );
}

function Landing() {
  return (
    <>
      <BackgroundDecor />
      <Navbar />

      <Box component="main">
        <Hero />
        <Stats />
        <About />
        <Features />
        <Programs />
        <SchoolLife />
        <News />
        <PortalCTA />
      </Box>

      <Footer />
    </>
  );
}

export default Landing;
