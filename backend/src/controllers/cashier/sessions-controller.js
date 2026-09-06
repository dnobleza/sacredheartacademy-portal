const pool = require('../../config/database');
const logger = require('../../utils/logger');
const HTTP_STATUS = require('../../utils/http-status');
const { sendError, sendOk, sendCreated } = require('../../utils/send-response');
const { toAmount } = require('../../utils/money');
const { findOpenSession } = require('./payments-controller');
const { validateOpenSession, validateCloseSession } = require('../../validations/payment-validation');




const sessionTotals = async (sessionId) => {
  const [[totals]] = await pool.execute(
    `SELECT
       COALESCE(SUM(amount), 0) AS collected,
       COALESCE(SUM(CASE WHEN method = 'cash' THEN amount END), 0) AS cash_collected,
       COUNT(*) AS transactions
     FROM payments
     WHERE session_id = ?`,
    [sessionId],
  );

  return {
    collected: Number(totals.collected),
    cash_collected: Number(totals.cash_collected),
    transactions: Number(totals.transactions),
  };
};

const requireCashierProfile = (req, res) => {
  if (!req.user.profileId) {
    sendError(res, HTTP_STATUS.FORBIDDEN, 'No cashier profile is linked to this account.');
    return null;
  }

  return req.user.profileId;
};

const getCurrentSession = async (req, res) => {
  const cashierId = requireCashierProfile(req, res);

  if (!cashierId) {
    return undefined;
  }

  const session = await findOpenSession(cashierId);

  if (!session) {
    return sendOk(res, { session: null });
  }

  const totals = await sessionTotals(session.id);

  return sendOk(res, {
    session: {
      ...session,
      opening_cash: Number(session.opening_cash),
      ...totals,
      // What the drawer should hold: the float plus cash taken in.
      expected_cash: Math.round((Number(session.opening_cash) + totals.cash_collected) * 100) / 100,
    },
  });
};

const openSession = async (req, res) => {
  const cashierId = requireCashierProfile(req, res);

  if (!cashierId) {
    return undefined;
  }

  const validationErrors = validateOpenSession(req.body);

  if (validationErrors.length > 0) {
    return sendError(res, HTTP_STATUS.BAD_REQUEST, validationErrors.join(' '));
  }




  const existing = await findOpenSession(cashierId);

  if (existing) {
    return sendError(res, HTTP_STATUS.CONFLICT, 'You already have an open session.');
  }

  const [result] = await pool.execute(
    'INSERT INTO cashier_sessions (cashier_id, opening_cash) VALUES (?, ?)',
    [cashierId, toAmount(req.body.opening_cash)],
  );

  logger.info(`Cashier session ${result.insertId} opened by cashier ${cashierId}`);

  return sendCreated(res, { id: result.insertId, opening_cash: toAmount(req.body.opening_cash) });
};




const closeSession = async (req, res) => {
  const cashierId = requireCashierProfile(req, res);

  if (!cashierId) {
    return undefined;
  }

  const validationErrors = validateCloseSession(req.body);

  if (validationErrors.length > 0) {
    return sendError(res, HTTP_STATUS.BAD_REQUEST, validationErrors.join(' '));
  }

  const session = await findOpenSession(cashierId);

  if (!session) {
    return sendError(res, HTTP_STATUS.NOT_FOUND, 'You have no open session to close.');
  }

  const totals = await sessionTotals(session.id);
  const expected = Math.round((Number(session.opening_cash) + totals.cash_collected) * 100) / 100;
  const counted = toAmount(req.body.closing_cash);
  const variance = Math.round((counted - expected) * 100) / 100;

  await pool.execute(
    `UPDATE cashier_sessions
     SET status = 'closed', closed_at = CURRENT_TIMESTAMP,
         closing_cash = ?, expected_cash = ?, variance = ?, notes = ?
     WHERE id = ?`,
    [counted, expected, variance, req.body.notes ? String(req.body.notes).trim() : null, session.id],
  );

  logger.info(
    `Cashier session ${session.id} closed by cashier ${cashierId}; variance ${variance}`,
  );

  return sendOk(res, {
    id: session.id,
    ...totals,
    opening_cash: Number(session.opening_cash),
    expected_cash: expected,
    closing_cash: counted,
    variance,
  });
};

const listSessions = async (req, res) => {
  const cashierId = requireCashierProfile(req, res);

  if (!cashierId) {
    return undefined;
  }

  const [rows] = await pool.execute(
    `SELECT id, opening_cash, closing_cash, expected_cash, variance, status, opened_at, closed_at, notes
     FROM cashier_sessions
     WHERE cashier_id = ?
     ORDER BY opened_at DESC
     LIMIT 30`,
    [cashierId],
  );

  return sendOk(res, {
    sessions: rows.map((row) => ({
      ...row,
      opening_cash: Number(row.opening_cash),
      closing_cash: row.closing_cash === null ? null : Number(row.closing_cash),
      expected_cash: row.expected_cash === null ? null : Number(row.expected_cash),
      variance: row.variance === null ? null : Number(row.variance),
    })),
  });
};

module.exports = {
  getCurrentSession,
  openSession,
  closeSession,
  listSessions,
};
