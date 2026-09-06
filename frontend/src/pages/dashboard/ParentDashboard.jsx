import { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import DashboardLayout from '../../layouts/DashboardLayout';
import StudentAccountPanel from '../../components/cashier/StudentAccountPanel';
import { fetchChildAccount, fetchMyChildren } from '../../services/financialApi';
import { extractErrorMessage } from '../../services/api';
import { UserCircle } from 'lucide-react';
import { CARD_RADIUS } from '../../theme';

const childName = (child) =>
  [child.first_name, child.middle_name, child.last_name].filter(Boolean).join(' ').trim();

function ParentDashboard() {
  const [children, setChildren] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    fetchMyChildren()
      .then((result) => {
        if (cancelled) {
          return;
        }

        setChildren(result.children);

        // A parent usually has one child; skip the picker in that case.
        if (result.children.length > 0) {
          setSelectedId(result.children[0].id);
        }
      })
      .catch((requestError) => {
        if (!cancelled) {
          setError(extractErrorMessage(requestError, 'Could not load your children.'));
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedId) {
      return undefined;
    }

    let cancelled = false;
    setData(null);

    fetchChildAccount(selectedId)
      .then((result) => {
        if (!cancelled) {
          setData(result);
        }
      })
      .catch((requestError) => {
        if (!cancelled) {
          setError(extractErrorMessage(requestError, 'Could not load that account.'));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  return (
    <DashboardLayout
      title="Parent portal"
      description="Your children's financial accounts for the current school year."
    >
      <Button
        component={RouterLink}
        to="/parent/profile"
        startIcon={<UserCircle size={16} />}
        variant="outlined"
        sx={{ mb: 3, borderRadius: CARD_RADIUS, textTransform: 'none', fontWeight: 700 }}
      >
        My profile
      </Button>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: CARD_RADIUS }}>
          {error}
        </Alert>
      )}

      {children === null && !error ? (
        <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}>
          <CircularProgress size={26} aria-label="Loading your children" />
        </Box>
      ) : children && children.length === 0 ? (
        <Typography sx={{ color: 'text.secondary' }}>
          No children are linked to your account yet. The registrar can link them.
        </Typography>
      ) : (
        <>
          {children && children.length > 1 && (
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 3 }}>
              {children.map((child) => (
                <Button
                  key={child.id}
                  onClick={() => setSelectedId(child.id)}
                  variant={child.id === selectedId ? 'contained' : 'outlined'}
                  sx={{ fontWeight: 700 }}
                >
                  {childName(child)}
                </Button>
              ))}
            </Stack>
          )}

          {data === null ? (
            <Box sx={{ display: 'grid', placeItems: 'center', py: 6 }}>
              <CircularProgress size={26} aria-label="Loading account" />
            </Box>
          ) : data.account ? (
            <StudentAccountPanel account={data.account} academicYear={data.academic_year} />
          ) : (
            <Typography sx={{ color: 'text.secondary' }}>
              {data.academic_year
                ? 'No charges for this school year yet.'
                : 'No school year is active yet.'}
            </Typography>
          )}
        </>
      )}
    </DashboardLayout>
  );
}

export default ParentDashboard;
