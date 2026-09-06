import { useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid2';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { CalendarClock, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { fetchStudentAttendance } from '../../services/studentApi';
import { extractErrorMessage } from '../../services/api';
import StatCard from '../../components/student/StatCard';
import { EmptyRow, Loader } from '../../components/student/Feedback';
import { CARD_RADIUS } from '../../theme';
import { formatDate } from '../../utils/format';

const CARD_BORDER = '1px solid rgba(22,59,56,0.08)';

const STATUS_COLOR = {
  present: 'success',
  late: 'warning',
  absent: 'error',
  excused: 'info',
};

function StudentAttendance() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    fetchStudentAttendance()
      .then((result) => {
        if (!cancelled) {
          setData(result);
        }
      })
      .catch((requestError) => {
        if (!cancelled) {
          setError(extractErrorMessage(requestError, 'Could not load your attendance.'));
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const loading = data === null && !error;

  const tiles = [
    {
      label: 'Attendance',
      Icon: CalendarClock,
      value: data?.rate === null || data?.rate === undefined ? null : `${data.rate}%`,
    },
    { label: 'Present', Icon: CheckCircle2, value: data?.counts.present },
    { label: 'Late', Icon: Clock, value: data?.counts.late },
    { label: 'Absent', Icon: XCircle, value: data?.counts.absent },
  ];

  return (
    <Box>
      <Typography variant="h2" component="h1" sx={{ fontSize: { xs: '1.6rem', md: '2rem' } }}>
        Attendance
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mt: 3, borderRadius: CARD_RADIUS }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3} sx={{ mt: 1 }}>
        {tiles.map((tile) => (
          <Grid key={tile.label} size={{ xs: 12, sm: 6, lg: 3 }}>
            <StatCard label={tile.label} Icon={tile.Icon} value={tile.value} loading={loading} />
          </Grid>
        ))}
      </Grid>

      <Typography variant="h5" sx={{ mt: 4, mb: 2 }}>
        Recent records
      </Typography>

      <Paper
        elevation={0}
        sx={{
          borderRadius: CARD_RADIUS,
          border: CARD_BORDER,
          backgroundColor: '#FFFFFF',
          overflow: 'hidden',
        }}
      >
        {loading ? (
          <Loader label="Loading your attendance" />
        ) : data.records.length === 0 ? (
          <EmptyRow text="No attendance has been recorded yet." />
        ) : (
          <TableContainer sx={{ overflowX: 'auto' }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Subject</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Remarks</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {data.records.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{formatDate(row.attendance_date)}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{row.subject_name}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={row.status}
                        color={STATUS_COLOR[row.status] || 'default'}
                        sx={{ borderRadius: '8px', textTransform: 'capitalize', fontWeight: 700 }}
                      />
                    </TableCell>
                    <TableCell sx={{ color: 'text.secondary' }}>{row.remarks || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Box>
  );
}

export default StudentAttendance;
