import { Navigate, Outlet, useLocation } from 'react-router-dom';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import { useAuth } from '../context/AuthContext';
import { portalHome } from '../utils/roles';

/**
 * UX guard only — the real enforcement lives in the backend's
 * authenticate-token and authorize-roles middleware. This just avoids showing
 * a page the API would refuse to fill.
 */
function ProtectedRoute({ allowedRoles, minAccessLevel, exactAccessLevel, accessLevelId }) {
  const { status, user } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return (
      <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <CircularProgress aria-label="Checking your session" />
      </Box>
    );
  }

  if (status !== 'authenticated') {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // Wrong role: send them to their own portal rather than a dead end.
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={portalHome(user)} replace />;
  }

  // Access level gates a portal the same way it gates the API. An unknown
  // level fails closed, matching require-min-access-level on the server.
  if (minAccessLevel !== undefined && (user.access_level?.level ?? -1) < minAccessLevel) {
    return <Navigate to={portalHome(user)} replace />;
  }

  // Some portals belong to one level rather than a floor — the registrar's
  // screens are not a Super Admin's, so a higher level is refused too. Mirrors
  // require-exact-access-level on the server.
  if (exactAccessLevel !== undefined && user.access_level?.level !== exactAccessLevel) {
    return <Navigate to={portalHome(user)} replace />;
  }

  // Two access levels can share a number (Cashier and Laboratory Staff are both
  // level 2), so a portal that belongs to exactly one of them checks the id.
  if (accessLevelId !== undefined && user.access_level?.id !== accessLevelId) {
    return <Navigate to={portalHome(user)} replace />;
  }

  return <Outlet />;
}

export default ProtectedRoute;
