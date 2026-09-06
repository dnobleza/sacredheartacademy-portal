import { useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { fetchStudentGrades } from '../../services/studentApi';
import { extractErrorMessage } from '../../services/api';
import { EmptyRow, Loader } from '../../components/student/Feedback';
import { CARD_RADIUS } from '../../theme';

const CARD_BORDER = '1px solid rgba(22,59,56,0.08)';

function StudentGrades() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    fetchStudentGrades()
      .then((result) => {
        if (!cancelled) {
          setData(result);
        }
      })
      .catch((requestError) => {
        if (!cancelled) {
          setError(extractErrorMessage(requestError, 'Could not load your grades.'));
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const loading = data === null && !error;
  const periods = data?.grading_periods || [];

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1.5} flexWrap="wrap">
        <Typography variant="h2" component="h1" sx={{ fontSize: { xs: '1.6rem', md: '2rem' } }}>
          Grades
        </Typography>

        {data?.current_grading_period && (
          <Chip
            size="small"
            label={`${data.current_grading_period} grading period`}
            sx={{ borderRadius: '8px', fontWeight: 700 }}
          />
        )}
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mt: 3, borderRadius: CARD_RADIUS }}>
          {error}
        </Alert>
      )}

      <Paper
        elevation={0}
        sx={{
          mt: 3,
          borderRadius: CARD_RADIUS,
          border: CARD_BORDER,
          backgroundColor: '#FFFFFF',
          overflow: 'hidden',
        }}
      >
        {loading ? (
          <Loader label="Loading your grades" />
        ) : data.subjects.length === 0 ? (
          <EmptyRow text="No grades have been posted yet." />
        ) : (
          <TableContainer sx={{ overflowX: 'auto' }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Subject</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Teacher</TableCell>

                  {periods.map((period) => (
                    <TableCell key={period} align="center" sx={{ fontWeight: 700 }}>
                      {period}
                    </TableCell>
                  ))}

                  <TableCell align="center" sx={{ fontWeight: 700 }}>
                    Average
                  </TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {data.subjects.map((subject) => (
                  <TableRow key={subject.class_subject_id}>
                    <TableCell sx={{ fontWeight: 600 }}>{subject.subject_name}</TableCell>
                    <TableCell sx={{ color: 'text.secondary' }}>
                      {subject.teacher_name || '—'}
                    </TableCell>

                    {periods.map((period) => (
                      <TableCell key={period} align="center">
                        {subject.periods[period] === null ? '—' : subject.periods[period]}
                      </TableCell>
                    ))}

                    <TableCell align="center" sx={{ fontWeight: 800, color: 'primary.main' }}>
                      {subject.average === null ? '—' : subject.average}
                    </TableCell>
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

export default StudentGrades;
