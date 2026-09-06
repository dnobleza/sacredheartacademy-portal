import { useCallback, useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import DashboardLayout from '../../layouts/DashboardLayout';
import StudentAccountPanel from '../../components/cashier/StudentAccountPanel';
import DeclarePaymentPanel from '../../components/student/DeclarePaymentPanel';
import { fetchMyFinancialAccount } from '../../services/financialApi';
import { extractErrorMessage } from '../../services/api';
import { CARD_RADIUS } from '../../theme';

function StudentDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  // Declaring a payment does not change the balance, but a cashier may have
  // confirmed one since the page loaded, so the panel can ask for a refresh.
  const reload = useCallback(
    () =>
      fetchMyFinancialAccount()
        .then(setData)
        .catch((requestError) =>
          setError(extractErrorMessage(requestError, 'Could not load your account.')),
        ),
    [],
  );

  useEffect(() => {
    let cancelled = false;

    fetchMyFinancialAccount()
      .then((result) => {
        if (!cancelled) {
          setData(result);
        }
      })
      .catch((requestError) => {
        if (!cancelled) {
          setError(extractErrorMessage(requestError, 'Could not load your account.'));
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const loading = data === null && !error;

  return (
    <DashboardLayout
      title="Student portal"
      description="Your financial account for the current school year. Schedule, grades and attendance will follow."
    >
      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: CARD_RADIUS }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}>
          <CircularProgress size={26} aria-label="Loading your account" />
        </Box>
      ) : data?.account ? (
        <Stack spacing={3}>
          <StudentAccountPanel account={data.account} academicYear={data.academic_year} />
          <DeclarePaymentPanel balance={data.account.totals.balance} onConfirmed={reload} />
        </Stack>
      ) : (
        <Typography sx={{ color: 'text.secondary' }}>
          {data?.academic_year
            ? 'You have no charges for this school year yet.'
            : 'No school year is active yet.'}
        </Typography>
      )}
    </DashboardLayout>
  );
}

export default StudentDashboard;
