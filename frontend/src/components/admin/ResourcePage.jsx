import { useCallback, useEffect, useMemo, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Paper from '@mui/material/Paper';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { Pencil, Plus, Search, Trash2 } from 'lucide-react';
import GradientButton from '../common/GradientButton';
import ConfirmDialog from './ConfirmDialog';
import ResourceFormDialog from './ResourceFormDialog';
import TemporaryPasswordDialog from './TemporaryPasswordDialog';
import {
  createResource,
  deleteResource,
  fetchAccessLevels,
  listResource,
  updateResource,
} from '../../services/adminApi';
import { extractErrorMessage } from '../../services/api';

const STATUS_COLORS = {
  active: { bg: 'rgba(32,191,169,0.16)', fg: '#0F6F62' },
  inactive: { bg: 'rgba(100,119,117,0.16)', fg: '#4A5A58' },
  suspended: { bg: 'rgba(211,90,70,0.16)', fg: '#9C3B2A' },
  upcoming: { bg: 'rgba(59,130,246,0.16)', fg: '#1D4ED8' },
  completed: { bg: 'rgba(100,119,117,0.16)', fg: '#4A5A58' },
};

// DATE columns arrive as 'YYYY-MM-DD'. Passing that straight to new Date()
// parses it as UTC midnight, which renders as the previous day anywhere west
// of Greenwich, so build those in local time instead. Full timestamps
// (created_at and friends) still go through the normal parse.
const formatDate = (value) => {
  if (!value) {
    return '—';
  }

  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value));
  const date = dateOnly
    ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
    : new Date(value);

  return date.toLocaleDateString(undefined, { dateStyle: 'medium' });
};

/**
 * How a single row is named in aria-labels and the delete confirmation. Person
 * resources have first/last names; others (school years) do not, so a resource
 * may supply its own `displayName` accessor.
 */
const rowDisplayName = (resource, row) => {
  if (!row) {
    return '';
  }

  if (resource.displayName) {
    return resource.displayName(row) || '';
  }

  return [row.first_name, row.last_name].filter(Boolean).join(' ') || row.email || '';
};

const renderCell = (column, row) => {
  if (column.value) {
    return column.value(row) || '—';
  }

  const raw = row[column.field];

  if (column.type === 'date') {
    return formatDate(raw);
  }

  if (column.type === 'status') {
    const palette = STATUS_COLORS[raw] || STATUS_COLORS.inactive;

    return (
      <Chip
        label={raw || 'unknown'}
        size="small"
        sx={{
          backgroundColor: palette.bg,
          color: palette.fg,
          fontWeight: 700,
          textTransform: 'capitalize',
        }}
      />
    );
  }

  return raw || '—';
};

function ResourcePage({ resource }) {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(10);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formError, setFormError] = useState('');

  const [deleting, setDeleting] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const [createdAccount, setCreatedAccount] = useState(null);
  const [toast, setToast] = useState('');

  const [optionSources, setOptionSources] = useState({});

  // Registry of remote option loaders, keyed by the `optionsSource` name a
  // field declares. A resource's fields name whichever sources they need;
  // this effect loads exactly those, so adding a new picker only means
  // adding an entry here rather than touching the fetch logic below.
  const optionLoaders = useMemo(
    () => ({
      accessLevels: () =>
        fetchAccessLevels().then((levels) =>
          // Numeric values, so an existing record's numeric access_level_id
          // matches an option and the edit form opens on the right one.
          levels.map((level) => ({
            value: level.id,
            label: `${level.code} — ${level.name}`,
          })),
        ),
      gradeLevels: () =>
        listResource('grade-levels', { page: 1, limit: 100 }).then((data) =>
          // Numeric values, for the same reason as accessLevels above.
          data.items.map((row) => ({ value: row.id, label: row.name })),
        ),
    }),
    [],
  );

  const neededSources = useMemo(
    () => [
      ...new Set(
        resource.fields.map((field) => field.optionsSource).filter(Boolean),
      ),
    ],
    [resource.fields],
  );

  useEffect(() => {
    if (neededSources.length === 0) {
      return;
    }

    let active = true;

    neededSources.forEach((source) => {
      const loader = optionLoaders[source];

      if (!loader) {
        return;
      }

      loader()
        .then((options) => {
          if (!active) {
            return;
          }

          setOptionSources((prev) => ({ ...prev, [source]: options }));
        })
        .catch(() => {
          // A failed load leaves the select empty; the server still rejects
          // a create without a valid id, so nothing slips through.
        });
    });

    return () => {
      active = false;
    };
  }, [neededSources, optionLoaders]);

  // Debounced so typing does not fire a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(0);
    }, 350);

    return () => clearTimeout(timer);
  }, [searchInput]);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');

    try {
      const data = await listResource(resource.key, { page: page + 1, limit, search });
      setRows(data.items);
      setTotal(data.pagination?.total ?? 0);
    } catch (error) {
      setLoadError(extractErrorMessage(error, `Could not load ${resource.label.toLowerCase()}.`));
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [resource.key, resource.label, page, limit, search]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setFormError('');
    setFormOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setFormError('');
    setFormOpen(true);
  };

  const handleSubmit = async (payload) => {
    setFormError('');

    try {
      if (editing) {
        await updateResource(resource.key, editing.id, payload);
        setToast(`${resource.singular} updated.`);
      } else {
        const created = await createResource(resource.key, payload);
        setToast(`${resource.singular} created.`);

        if (created?.temporary_password) {
          setCreatedAccount(created);
        }
      }

      setFormOpen(false);
      await load();
    } catch (error) {
      setFormError(extractErrorMessage(error, 'Could not save. Please try again.'));
    }
  };

  const handleDelete = async () => {
    setDeleteBusy(true);

    try {
      await deleteResource(resource.key, deleting.id);
      setDeleting(null);
      setToast(`${resource.singular} deleted.`);

      // Stepping back a page avoids landing on an empty last page.
      if (rows.length === 1 && page > 0) {
        setPage((current) => current - 1);
      } else {
        await load();
      }
    } catch (error) {
      setToast(extractErrorMessage(error, 'Could not delete.'));
      setDeleting(null);
    } finally {
      setDeleteBusy(false);
    }
  };

  const deletingName = useMemo(() => {
    if (!deleting) {
      return '';
    }

    return rowDisplayName(resource, deleting);
  }, [deleting, resource]);

  return (
    <Box>
      {/* justifyContent rather than ml:auto — Stack's own child-spacing rule
          out-specifies a margin set through sx on the child. */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        alignItems={{ xs: 'stretch', sm: 'center' }}
        justifyContent="space-between"
        sx={{ mb: 3 }}
      >
        <Box>
          <Typography variant="h2" component="h1" sx={{ fontSize: { xs: '1.6rem', md: '2rem' } }}>
            {resource.label}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
            {total} {total === 1 ? resource.singular.toLowerCase() : resource.label.toLowerCase()} on
            record
          </Typography>
        </Box>

        <GradientButton onClick={openCreate} startIcon={<Plus size={18} />} sx={{ flexShrink: 0 }}>
          Add {resource.singular.toLowerCase()}
        </GradientButton>
      </Stack>

      <Paper
        elevation={0}
        sx={{ borderRadius: 4, border: '1px solid rgba(22,59,56,0.08)', overflow: 'hidden' }}
      >
        <Box sx={{ p: 2.5 }}>
          <TextField
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            // Not every resource has an email to search by, so a resource may
            // name its own searchable fields.
            placeholder={`Search ${resource.label.toLowerCase()} by ${resource.searchHint || 'name or email'}`}
            size="small"
            fullWidth
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Search size={17} />
                  </InputAdornment>
                ),
              },
            }}
            sx={{ maxWidth: { sm: 420 } }}
          />
        </Box>

        {loadError && (
          <Alert severity="error" sx={{ mx: 2.5, mb: 2.5, borderRadius: 2 }}>
            {loadError}
          </Alert>
        )}

        <TableContainer>
          <Table sx={{ minWidth: 720 }}>
            <TableHead>
              <TableRow sx={{ backgroundColor: 'background.paper' }}>
                {resource.columns.map((column) => (
                  <TableCell
                    key={column.field}
                    sx={{ fontWeight: 700, minWidth: column.minWidth, whiteSpace: 'nowrap' }}
                  >
                    {column.label}
                  </TableCell>
                ))}
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={resource.columns.length + 1} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={26} aria-label={`Loading ${resource.label}`} />
                  </TableCell>
                </TableRow>
              )}

              {!loading && rows.length === 0 && !loadError && (
                <TableRow>
                  <TableCell colSpan={resource.columns.length + 1} align="center" sx={{ py: 6 }}>
                    <Typography sx={{ color: 'text.secondary' }}>
                      {search
                        ? `No ${resource.label.toLowerCase()} match “${search}”.`
                        : `No ${resource.label.toLowerCase()} yet.`}
                    </Typography>
                  </TableCell>
                </TableRow>
              )}

              {!loading &&
                rows.map((row) => (
                  <TableRow key={row.id} hover>
                    {resource.columns.map((column) => (
                      <TableCell key={column.field}>{renderCell(column, row)}</TableCell>
                    ))}
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                      <Tooltip title="Edit">
                        <IconButton
                          onClick={() => openEdit(row)}
                          aria-label={`Edit ${rowDisplayName(resource, row)}`}
                          size="small"
                          sx={{ color: 'primary.dark' }}
                        >
                          <Pencil size={17} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton
                          onClick={() => setDeleting(row)}
                          aria-label={`Delete ${rowDisplayName(resource, row)}`}
                          size="small"
                          sx={{ color: 'error.main' }}
                        >
                          <Trash2 size={17} />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={(event, next) => setPage(next)}
          rowsPerPage={limit}
          onRowsPerPageChange={(event) => {
            setLimit(Number(event.target.value));
            setPage(0);
          }}
          rowsPerPageOptions={[10, 25, 50]}
        />
      </Paper>

      <ResourceFormDialog
        open={formOpen}
        resource={resource}
        record={editing}
        optionSources={optionSources}
        submitError={formError}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        busy={deleteBusy}
        title={`Delete ${resource.singular.toLowerCase()}?`}
        message={
          resource.deleteMessage
            ? resource.deleteMessage(deletingName)
            : `${deletingName} and their login account will be permanently removed. This cannot be undone.`
        }
        onCancel={() => setDeleting(null)}
        onConfirm={handleDelete}
      />

      <TemporaryPasswordDialog
        open={Boolean(createdAccount)}
        account={createdAccount}
        onClose={() => setCreatedAccount(null)}
      />

      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={4000}
        onClose={() => setToast('')}
        message={toast}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
}

export default ResourcePage;
