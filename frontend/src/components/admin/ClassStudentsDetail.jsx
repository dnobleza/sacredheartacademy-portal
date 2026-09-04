import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

/**
 * Read-only list of a class's enrolled students, shown in the edit dialog.
 * Students come from enrolment, not from this form, so there is nothing
 * here to edit or submit — see ADMIN_RESOURCES.classes.renderDetail.
 */
function ClassStudentsDetail({ detailRecord, loading }) {
  const students = detailRecord?.students || [];

  return (
    <Box sx={{ mt: 3, pt: 2.5, borderTop: '1px solid rgba(22,59,56,0.08)' }}>
      <Typography sx={{ fontWeight: 700, mb: 0.5 }}>Enrolled students</Typography>
      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1.5 }}>
        Derived from enrolment for this section and school year. Not editable here.
      </Typography>

      {loading && (
        <Stack direction="row" justifyContent="center" sx={{ py: 2 }}>
          <CircularProgress size={22} aria-label="Loading enrolled students" />
        </Stack>
      )}

      {!loading && students.length === 0 && (
        <Typography sx={{ color: 'text.secondary' }}>No students enrolled yet.</Typography>
      )}

      {!loading && students.length > 0 && (
        <Stack component="ul" spacing={0.5} sx={{ m: 0, pl: 2.5 }}>
          {students.map((student) => (
            <Box component="li" key={student.id} sx={{ fontSize: '0.9rem' }}>
              {[student.first_name, student.last_name].filter(Boolean).join(' ')}
            </Box>
          ))}
        </Stack>
      )}
    </Box>
  );
}

export default ClassStudentsDetail;
