import { useCallback, useEffect, useRef, useState } from 'react';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContentText from '@mui/material/DialogContentText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { ArrowLeft, Check, MoreVertical, Pencil, Search, Send, SquarePen, Trash2, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { roleLabel } from '../../utils/roles';
import {
  deleteMessage,
  editMessage,
  fetchConversations,
  fetchRecipients,
  fetchThread,
  sendMessage,
} from '../../services/messagesApi';
import { extractErrorMessage } from '../../services/api';
import { AQUA_GRADIENT } from '../../theme';

const POLL_INTERVAL_MS = 5000;

const initials = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('') || '?';

const formatTimestamp = (value) => {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  const sameDay = date.toDateString() === new Date().toDateString();

  return sameDay
    ? date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
    : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

/**
 * Conversation list — the left pane on desktop, the whole screen on mobile
 * until a conversation is picked.
 */
function ConversationList({ conversations, loading, error, activeId, onSelect, onNewMessage }) {
  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 4,
        border: '1px solid rgba(22,59,56,0.08)',
        backgroundColor: '#FFFFFF',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ p: 2.5, pb: 1.5 }}>
        <Typography sx={{ fontWeight: 800 }}>Conversations</Typography>
        <IconButton onClick={onNewMessage} aria-label="New message" size="small" sx={{ color: 'primary.dark' }}>
          <SquarePen size={19} />
        </IconButton>
      </Stack>

      <Box sx={{ flex: 1, overflowY: 'auto' }}>
        {error && (
          <Alert severity="error" sx={{ mx: 2, borderRadius: 2 }}>
            {error}
          </Alert>
        )}

        {loading && conversations.length === 0 && !error && (
          <Box sx={{ display: 'grid', placeItems: 'center', py: 6 }}>
            <CircularProgress size={24} aria-label="Loading conversations" />
          </Box>
        )}

        {!loading && conversations.length === 0 && !error && (
          <Box sx={{ px: 2.5, py: 4 }}>
            <Typography sx={{ color: 'text.secondary' }}>
              No conversations yet. Start one with the pencil icon above.
            </Typography>
          </Box>
        )}

        <List disablePadding>
          {conversations.map((conversation) => (
            <ListItemButton
              key={conversation.user_id}
              selected={conversation.user_id === activeId}
              onClick={() => onSelect(conversation)}
              sx={{
                px: 2.5,
                py: 1.5,
                borderLeft: '3px solid transparent',
                '&.Mui-selected': {
                  backgroundColor: 'background.paper',
                  borderLeftColor: 'primary.main',
                },
              }}
            >
              <Avatar sx={{ background: AQUA_GRADIENT, mr: 1.5, width: 40, height: 40, fontSize: '0.9rem' }}>
                {initials(conversation.name)}
              </Avatar>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="baseline">
                  <Typography noWrap sx={{ fontWeight: 700 }}>
                    {conversation.name}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary', flexShrink: 0, ml: 1 }}>
                    {formatTimestamp(conversation.last_message_at)}
                  </Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography noWrap variant="body2" sx={{ color: 'text.secondary', flex: 1 }}>
                    {conversation.last_message || ''}
                  </Typography>
                  {conversation.unread_count > 0 && (
                    <Chip
                      label={conversation.unread_count}
                      size="small"
                      sx={{
                        ml: 1,
                        height: 20,
                        fontWeight: 700,
                        background: AQUA_GRADIENT,
                        color: '#fff',
                      }}
                    />
                  )}
                </Stack>
              </Box>
            </ListItemButton>
          ))}
        </List>
      </Box>
    </Paper>
  );
}

/**
 * Thread pane — messages plus the pinned composer. `onBack` only renders on
 * small screens, where the list and thread cannot share the viewport.
 */
function ThreadPane({
  peer,
  messages,
  loading,
  error,
  currentUserId,
  onBack,
  onSend,
  onEdit,
  onDelete,
  sending,
}) {
  const [draft, setDraft] = useState('');
  const [menu, setMenu] = useState({ anchorEl: null, message: null });
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages]);

  const closeMenu = () => setMenu({ anchorEl: null, message: null });

  const startEdit = (message) => {
    setEditingId(message.id);
    setEditDraft(message.message);
    closeMenu();
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft('');
  };

  const saveEdit = async (message) => {
    const trimmed = editDraft.trim();

    // An unchanged or emptied box just closes; the server would reject an
    // empty body anyway.
    if (!trimmed || trimmed === message.message) {
      cancelEdit();
      return;
    }

    const ok = await onEdit(message.id, trimmed);

    if (ok) {
      cancelEdit();
    }
  };

  const confirmAndDelete = async () => {
    const target = confirmDelete;
    setConfirmDelete(null);

    if (target) {
      await onDelete(target.id);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const trimmed = draft.trim();
    if (!trimmed || sending) {
      return;
    }

    // Cleared only after a successful send — a failed request must not lose
    // what the admin typed.
    const ok = await onSend(trimmed);
    if (ok) {
      setDraft('');
    }
  };

  if (!peer) {
    return (
      <Paper
        elevation={0}
        sx={{
          borderRadius: 4,
          border: '1px solid rgba(22,59,56,0.08)',
          backgroundColor: '#FFFFFF',
          height: '100%',
          display: 'grid',
          placeItems: 'center',
          p: 4,
        }}
      >
        <Typography sx={{ color: 'text.secondary', textAlign: 'center' }}>
          Select a conversation, or start a new one.
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 4,
        border: '1px solid rgba(22,59,56,0.08)',
        backgroundColor: '#FFFFFF',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ p: 2, borderBottom: '1px solid rgba(22,59,56,0.08)' }}>
        <IconButton
          onClick={onBack}
          aria-label="Back to conversations"
          size="small"
          sx={{ display: { xs: 'inline-flex', md: 'none' } }}
        >
          <ArrowLeft size={19} />
        </IconButton>
        <Avatar sx={{ background: AQUA_GRADIENT, width: 36, height: 36, fontSize: '0.85rem' }}>
          {initials(peer.name)}
        </Avatar>
        <Box>
          <Typography sx={{ fontWeight: 700 }}>{peer.name}</Typography>
          {peer.role && (
            <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'capitalize' }}>
              {roleLabel(peer.role)}
            </Typography>
          )}
        </Box>
      </Stack>

      <Box sx={{ flex: 1, overflowY: 'auto', p: 2.5 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
            {error}
          </Alert>
        )}

        {loading && messages.length === 0 && !error && (
          <Box sx={{ display: 'grid', placeItems: 'center', py: 6 }}>
            <CircularProgress size={24} aria-label="Loading messages" />
          </Box>
        )}

        {!loading && messages.length === 0 && !error && (
          <Typography sx={{ color: 'text.secondary', textAlign: 'center', py: 4 }}>
            No messages yet. Say hello.
          </Typography>
        )}

        <Stack spacing={1.5}>
          {messages.map((message) => {
            const mine = message.sender_id === currentUserId;

            const editing = editingId === message.id;

            return (
              <Box
                key={message.id}
                sx={{
                  display: 'flex',
                  justifyContent: mine ? 'flex-end' : 'flex-start',
                  alignItems: 'center',
                  gap: 0.5,
                }}
              >
                {/* Only your own bubbles carry the menu. The server refuses an
                    edit or delete from anyone but the sender regardless. */}
                {mine && !editing && (
                  <IconButton
                    size="small"
                    aria-label="Message actions"
                    onClick={(event) => setMenu({ anchorEl: event.currentTarget, message })}
                    sx={{ color: 'text.secondary' }}
                  >
                    <MoreVertical size={16} />
                  </IconButton>
                )}

                <Box
                  sx={{
                    maxWidth: '78%',
                    px: 2,
                    py: 1.25,
                    borderRadius: 3,
                    background: mine ? AQUA_GRADIENT : 'background.paper',
                    color: mine ? '#fff' : 'text.primary',
                  }}
                >
                  {editing ? (
                    <Stack spacing={1}>
                      <TextField
                        value={editDraft}
                        onChange={(event) => setEditDraft(event.target.value)}
                        size="small"
                        fullWidth
                        multiline
                        maxRows={6}
                        autoFocus
                        sx={{ backgroundColor: '#fff', borderRadius: 1, minWidth: 220 }}
                      />
                      <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                        <IconButton
                          size="small"
                          onClick={cancelEdit}
                          aria-label="Cancel edit"
                          sx={{ color: 'inherit' }}
                        >
                          <X size={16} />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => saveEdit(message)}
                          aria-label="Save edit"
                          sx={{ color: 'inherit' }}
                        >
                          <Check size={16} />
                        </IconButton>
                      </Stack>
                    </Stack>
                  ) : (
                    <>
                      <Typography sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {message.message}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{ display: 'block', mt: 0.5, opacity: 0.8, textAlign: mine ? 'right' : 'left' }}
                      >
                        {formatTimestamp(message.created_at)}
                        {message.edited_at ? ' · edited' : ''}
                      </Typography>
                    </>
                  )}
                </Box>
              </Box>
            );
          })}
          <div ref={bottomRef} />
        </Stack>
      </Box>

      <Menu anchorEl={menu.anchorEl} open={Boolean(menu.anchorEl)} onClose={closeMenu}>
        <MenuItem onClick={() => startEdit(menu.message)} sx={{ gap: 1.25 }}>
          <Pencil size={16} /> Edit
        </MenuItem>
        <MenuItem
          onClick={() => {
            setConfirmDelete(menu.message);
            closeMenu();
          }}
          sx={{ gap: 1.25, color: 'error.main' }}
        >
          <Trash2 size={16} /> Delete
        </MenuItem>
      </Menu>

      <Dialog open={Boolean(confirmDelete)} onClose={() => setConfirmDelete(null)}>
        <DialogTitle>Delete message?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This removes the message for both of you. It cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(null)} sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <Button onClick={confirmAndDelete} color="error" sx={{ textTransform: 'none', fontWeight: 700 }}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{ p: 2, borderTop: '1px solid rgba(22,59,56,0.08)', display: 'flex', gap: 1.5 }}
      >
        <TextField
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Write a message"
          size="small"
          fullWidth
          disabled={sending}
        />
        <IconButton
          type="submit"
          disabled={sending || !draft.trim()}
          aria-label="Send"
          sx={{ background: AQUA_GRADIENT, color: '#fff', '&:hover': { background: AQUA_GRADIENT }, '&.Mui-disabled': { opacity: 0.5, color: '#fff' } }}
        >
          <Send size={18} />
        </IconButton>
      </Box>
    </Paper>
  );
}

/**
 * Search-and-pick dialog for starting a conversation with someone not yet
 * in the list.
 */
function NewMessageDialog({ open, onClose, onPick }) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setSearch('');
      setResults([]);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);

    const timer = setTimeout(() => {
      fetchRecipients(search)
        .then((data) => {
          if (!cancelled) {
            setResults(data);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setResults([]);
          }
        })
        .finally(() => {
          if (!cancelled) {
            setLoading(false);
          }
        });
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [open, search]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ fontWeight: 800 }}>New message</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by name or email"
          size="small"
          fullWidth
          sx={{ mb: 1.5 }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={16} />
                </InputAdornment>
              ),
            },
          }}
        />

        {loading && (
          <Box sx={{ display: 'grid', placeItems: 'center', py: 3 }}>
            <CircularProgress size={22} aria-label="Searching" />
          </Box>
        )}

        {!loading && results.length === 0 && (
          <Typography sx={{ color: 'text.secondary', py: 2, textAlign: 'center' }}>No matches.</Typography>
        )}

        <List disablePadding>
          {results.map((person) => (
            <ListItemButton key={person.user_id} onClick={() => onPick(person)} sx={{ borderRadius: 2 }}>
              <Avatar sx={{ background: AQUA_GRADIENT, mr: 1.5, width: 34, height: 34, fontSize: '0.8rem' }}>
                {initials(person.name)}
              </Avatar>
              <Box sx={{ minWidth: 0 }}>
                <Typography noWrap sx={{ fontWeight: 600 }}>
                  {person.name}
                </Typography>
                <Typography noWrap variant="caption" sx={{ color: 'text.secondary' }}>
                  {person.email}
                </Typography>
              </Box>
            </ListItemButton>
          ))}
        </List>
      </DialogContent>
    </Dialog>
  );
}

function MessagesPage() {
  const { user } = useAuth();

  const [conversations, setConversations] = useState([]);
  const [conversationsLoading, setConversationsLoading] = useState(true);
  const [conversationsError, setConversationsError] = useState('');

  const [activePeer, setActivePeer] = useState(null);
  const [messages, setMessages] = useState([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const [threadError, setThreadError] = useState('');

  const [sending, setSending] = useState(false);
  const [newMessageOpen, setNewMessageOpen] = useState(false);

  const sendingRef = useRef(false);

  const loadConversations = useCallback(() => {
    return fetchConversations()
      .then((data) => {
        setConversations(data);
        setConversationsError('');
      })
      .catch((error) => {
        setConversationsError(extractErrorMessage(error, 'Could not load conversations.'));
      })
      .finally(() => setConversationsLoading(false));
  }, []);

  const loadThread = useCallback((userId) => {
    return fetchThread(userId)
      .then((data) => {
        setMessages(data);
        setThreadError('');
      })
      .catch((error) => {
        setThreadError(extractErrorMessage(error, 'Could not load this conversation.'));
      })
      .finally(() => setThreadLoading(false));
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Polling keeps both panes fresh without a websocket. Skipped in a
  // backgrounded tab and while a send is in flight, so it never fights the
  // request that will refresh things anyway once it resolves.
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.hidden || sendingRef.current) {
        return;
      }

      loadConversations();

      if (activePeer) {
        loadThread(activePeer.user_id);
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [activePeer, loadConversations, loadThread]);

  const selectConversation = (peer) => {
    setActivePeer(peer);
    setThreadLoading(true);
    setThreadError('');
    loadThread(peer.user_id).then(() => {
      // The GET marks their messages to us as read server-side; reflect
      // that locally right away rather than waiting for the next poll.
      setConversations((prev) =>
        prev.map((conversation) =>
          conversation.user_id === peer.user_id ? { ...conversation, unread_count: 0 } : conversation,
        ),
      );
    });
  };

  const handlePickRecipient = (person) => {
    setNewMessageOpen(false);
    selectConversation({ user_id: person.user_id, name: person.name, role: person.role });
  };

  const handleSend = async (text) => {
    if (!activePeer) {
      return false;
    }

    sendingRef.current = true;
    setSending(true);

    try {
      await sendMessage({ receiver_id: activePeer.user_id, message: text });
      await Promise.all([loadThread(activePeer.user_id), loadConversations()]);
      return true;
    } catch (error) {
      setThreadError(extractErrorMessage(error, 'Could not send that message. Please try again.'));
      return false;
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  };

  const handleEdit = async (messageId, text) => {
    try {
      await editMessage(messageId, text);
      await Promise.all([loadThread(activePeer.user_id), loadConversations()]);
      return true;
    } catch (error) {
      setThreadError(extractErrorMessage(error, 'Could not edit that message.'));
      return false;
    }
  };

  const handleDelete = async (messageId) => {
    try {
      await deleteMessage(messageId);
      await Promise.all([loadThread(activePeer.user_id), loadConversations()]);
      return true;
    } catch (error) {
      setThreadError(extractErrorMessage(error, 'Could not delete that message.'));
      return false;
    }
  };

  const currentUserId = user?.id;

  // On mobile, the thread pane replaces the list once a conversation is
  // active; on desktop both panes always show.
  const showListOnMobile = !activePeer;

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h2" component="h1" sx={{ fontSize: { xs: '1.6rem', md: '2rem' }, mb: 3 }}>
        Messages
      </Typography>

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '320px 1fr' },
          gap: 3,
          height: { xs: 'auto', md: 640 },
        }}
      >
        <Box sx={{ display: { xs: showListOnMobile ? 'block' : 'none', md: 'block' }, minHeight: 0 }}>
          <ConversationList
            conversations={conversations}
            loading={conversationsLoading}
            error={conversationsError}
            activeId={activePeer?.user_id}
            onSelect={selectConversation}
            onNewMessage={() => setNewMessageOpen(true)}
          />
        </Box>

        <Box sx={{ display: { xs: showListOnMobile ? 'none' : 'block', md: 'block' }, minHeight: 0 }}>
          <ThreadPane
            peer={activePeer}
            messages={messages}
            loading={threadLoading}
            error={threadError}
            currentUserId={currentUserId}
            onBack={() => setActivePeer(null)}
            onSend={handleSend}
            onEdit={handleEdit}
            onDelete={handleDelete}
            sending={sending}
          />
        </Box>
      </Box>

      <NewMessageDialog
        open={newMessageOpen}
        onClose={() => setNewMessageOpen(false)}
        onPick={handlePickRecipient}
      />
    </Box>
  );
}

export default MessagesPage;
