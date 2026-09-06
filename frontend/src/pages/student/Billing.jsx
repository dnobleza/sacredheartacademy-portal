import { useCallback, useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import StudentAccountPanel from '../../components/cashier/StudentAccountPanel';
import DeclarePaymentPanel from '../../components/student/DeclarePaymentPanel';
import { Loader } from '../../components/student/Feedback';
import { fetchMyFinancialAccount } from '../../services/financialApi';
import { extractErrorMessage } from '../../services/api';
import { CARD_RADIUS } from '../../theme';

function StudentBilling() {
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
    <Box>
      <Typography variant="h2" component="h1" sx={{ fontSize: { xs: '1.6rem', md: '2rem' } }}>
        Tuition &amp; Payments
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mt: 3, borderRadius: CARD_RADIUS }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Loader label="Loading your account" />
      ) : data?.account ? (
        <Stack spacing={3} sx={{ mt: 3 }}>
          <StudentAccountPanel account={data.account} academicYear={data.academic_year} />
          <DeclarePaymentPanel balance={data.account.totals.balance} onConfirmed={reload} />
        </Stack>
      ) : (
        <Typography sx={{ color: 'text.secondary', mt: 3 }}>
          {data?.academic_year
            ? 'You have no charges for this school year yet.'
            : 'No school year is active yet.'}
        </Typography>
      )}
    </Box>
  );
}

export default StudentBilling;
