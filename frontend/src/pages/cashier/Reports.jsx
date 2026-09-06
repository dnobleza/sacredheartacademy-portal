import { useCallback, useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid2';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import {
  fetchCollectionSummary,
  fetchDailyReport,
  fetchMonthlyReport,
} from '../../services/cashierApi';
import { extractErrorMessage } from '../../services/api';
import { formatCurrency, formatDate, PAYMENT_METHOD_LABELS } from '../../utils/format';
import { CARD_RADIUS } from '../../theme';

const CARD_BORDER = '1px solid rgba(22,59,56,0.08)';

const panel = { borderRadius: CARD_RADIUS, border: CARD_BORDER, backgroundColor: '#FFFFFF', p: 3 };

function Totals({ items }) {
  return (
    <Grid container spacing={3} sx={{ mb: 3 }}>
      {items.map((item) => (
        <Grid key={item.label} size={{ xs: 12, sm: 6, md: 4 }}>
          <Paper elevation={0} sx={panel}>
            <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
              {item.label}
            </Typography>
            <Typography sx={{ fontWeight: 800, fontSize: '1.6rem', color: 'primary.main', mt: 0.5 }}>
              {item.value}
            </Typography>
          </Paper>
        </Grid>
      ))}
    </Grid>
  );
}

function AmountTable({ title, rows, labelKey, valueKey, labelHeader = 'Item' }) {
  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2 }}>
        {title}
      </Typography>
      <Paper elevation={0} sx={{ ...panel, p: 0, overflow: 'hidden' }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>{labelHeader}</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">
                  Amount
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    Nothing to report.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row, index) => (
                  <TableRow key={row[labelKey] ?? index} hover>
                    <TableCell>{row[labelKey]}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>
                      {formatCurrency(row[valueKey])}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}

function useReport(loader, argument) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setData(null);

    return loader(argument)
      .then(setData)
      .catch((requestError) => setError(extractErrorMessage(requestError, 'Could not load the report.')));
    // loader is a module-level function, stable across renders.
  }, [argument]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, error };
}

export function DailyCollection() {
  const [date, setDate] = useState('');
  const { data, error } = useReport(fetchDailyReport, date || undefined);

  return (
    <Box>
      <Typography variant="h2" component="h1" sx={{ fontSize: { xs: '1.6rem', md: '2rem' } }}>
        Daily Collection
      </Typography>
      <Typography variant="body1" sx={{ color: 'text.secondary', mt: 1, mb: 3 }}>
        Everything collected on one day, by method and by fee.
      </Typography>

      <TextField
        type="date"
        value={date}
        onChange={(event) => setDate(event.target.value)}
        label="Date"
        size="small"
        slotProps={{ inputLabel: { shrink: true } }}
        sx={{ mb: 3 }}
        helperText="Leave blank for today"
      />

      {error && <Alert severity="error" sx={{ mb: 3, borderRadius: CARD_RADIUS }}>{error}</Alert>}

      {!data && !error ? (
        <Box sx={{ display: 'grid', placeItems: 'center', py: 6 }}>
          <CircularProgress size={26} aria-label="Loading report" />
        </Box>
      ) : data ? (
        <>
          <Totals
            items={[
              { label: 'Collected', value: formatCurrency(data.totals.total) },
              { label: 'Transactions', value: data.totals.transactions },
              { label: 'Date', value: formatDate(data.date) },
            ]}
          />

          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
              <AmountTable
                title="By method"
                labelHeader="Method"
                rows={data.by_method.map((row) => ({
                  ...row,
                  label: PAYMENT_METHOD_LABELS[row.method] || row.method,
                }))}
                labelKey="label"
                valueKey="total"
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <AmountTable title="By fee" labelHeader="Fee" rows={data.by_fee} labelKey="fee_name" valueKey="total" />
            </Grid>
          </Grid>
        </>
      ) : null}
    </Box>
  );
}

export function MonthlyCollection() {
  const [month, setMonth] = useState('');
  const { data, error } = useReport(fetchMonthlyReport, month || undefined);

  return (
    <Box>
      <Typography variant="h2" component="h1" sx={{ fontSize: { xs: '1.6rem', md: '2rem' } }}>
        Monthly Collection
      </Typography>
      <Typography variant="body1" sx={{ color: 'text.secondary', mt: 1, mb: 3 }}>
        A month of collections, broken down by day, method and fee.
      </Typography>

      <TextField
        type="month"
        value={month}
        onChange={(event) => setMonth(event.target.value)}
        label="Month"
        size="small"
        slotProps={{ inputLabel: { shrink: true } }}
        sx={{ mb: 3 }}
        helperText="Leave blank for this month"
      />

      {error && <Alert severity="error" sx={{ mb: 3, borderRadius: CARD_RADIUS }}>{error}</Alert>}

      {!data && !error ? (
        <Box sx={{ display: 'grid', placeItems: 'center', py: 6 }}>
          <CircularProgress size={26} aria-label="Loading report" />
        </Box>
      ) : data ? (
        <>
          <Totals
            items={[
              { label: 'Collected', value: formatCurrency(data.totals.total) },
              { label: 'Transactions', value: data.totals.transactions },
              { label: 'Month', value: data.month },
            ]}
          />

          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 4 }}>
              <AmountTable
                title="By day"
                labelHeader="Day"
                rows={data.by_day.map((row) => ({ ...row, label: formatDate(row.day) }))}
                labelKey="label"
                valueKey="total"
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <AmountTable
                title="By method"
                labelHeader="Method"
                rows={data.by_method.map((row) => ({
                  ...row,
                  label: PAYMENT_METHOD_LABELS[row.method] || row.method,
                }))}
                labelKey="label"
                valueKey="total"
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <AmountTable title="By fee" labelHeader="Fee" rows={data.by_fee} labelKey="fee_name" valueKey="total" />
            </Grid>
          </Grid>
        </>
      ) : null}
    </Box>
  );
}

export function CollectionSummary() {
  const { data, error } = useReport(fetchCollectionSummary, undefined);

  return (
    <Box>
      <Typography variant="h2" component="h1" sx={{ fontSize: { xs: '1.6rem', md: '2rem' } }}>
        Collection Summary
      </Typography>
      <Typography variant="body1" sx={{ color: 'text.secondary', mt: 1, mb: 3 }}>
        {data?.active_academic_year
          ? `Charged against collected for ${data.active_academic_year.name}.`
          : 'Follows the active school year.'}
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 3, borderRadius: CARD_RADIUS }}>{error}</Alert>}

      {!data && !error ? (
        <Box sx={{ display: 'grid', placeItems: 'center', py: 6 }}>
          <CircularProgress size={26} aria-label="Loading report" />
        </Box>
      ) : data?.totals ? (
        <>
          <Totals
            items={[
              { label: 'Total charged', value: formatCurrency(data.totals.charged) },
              { label: 'Total collected', value: formatCurrency(data.totals.collected) },
              { label: 'Outstanding', value: formatCurrency(data.totals.outstanding) },
            ]}
          />

          <Typography variant="h5" sx={{ mb: 2 }}>
            By fee
          </Typography>
          <Paper elevation={0} sx={{ ...panel, p: 0, overflow: 'hidden', mb: 3 }}>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Fee</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="right">
                      Charged
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="right">
                      Collected
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="right">
                      Outstanding
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.by_fee.map((row) => (
                    <TableRow key={row.fee_id} hover>
                      <TableCell>{row.fee_name}</TableCell>
                      <TableCell align="right">{formatCurrency(row.charged)}</TableCell>
                      <TableCell align="right">{formatCurrency(row.collected)}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>
                        {formatCurrency(Math.round((row.charged - row.collected) * 100) / 100)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

          <AmountTable
            title="By grade level"
            labelHeader="Grade level"
            rows={data.by_grade_level}
            labelKey="grade_level_name"
            valueKey="collected"
          />
        </>
      ) : (
        <Stack sx={{ py: 4 }}>
          <Typography sx={{ color: 'text.secondary' }}>No active school year.</Typography>
        </Stack>
      )}
    </Box>
  );
}
