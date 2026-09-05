const pool = require('../../config/database');
const logger = require('../../utils/logger');
const HTTP_STATUS = require('../../utils/http-status');
const { sendError, sendOk, sendCreated } = require('../../utils/send-response');
const {
  validateCreateAnnouncement,
  validateUpdateAnnouncement,
  validatePagination,
} = require('../../validations/announcement-validation');
const { notifyRoles } = require('../../utils/notifications');



const TARGET_ROLE_TO_ROLE_NAME = {
  students: 'student',
  teachers: 'teacher',
  parents: 'parent',
};




const AUTHOR_NAME_EXPR = `COALESCE(
  NULLIF(CONCAT_WS(' ', admins.first_name, admins.last_name), ''),
  users.email
)`;

const ANNOUNCEMENT_SELECT_FIELDS = `
  announcements.id,
  announcements.created_by,
  announcements.title,
  announcements.content,
  announcements.target_role,
  announcements.image_id,
  ${AUTHOR_NAME_EXPR} AS author_name,
  announcements.created_at,
  announcements.updated_at
`;




const findImage = async (imageId) => {
  const [rows] = await pool.execute('SELECT id FROM images WHERE id = ?', [imageId]);

  return rows[0] || null;
};

const ANNOUNCEMENT_JOINS = `
  FROM announcements
  LEFT JOIN users ON users.id = announcements.created_by
  LEFT JOIN admins ON admins.user_id = users.id
`;

const createAnnouncement = async (req, res) => {
  const validationErrors = validateCreateAnnouncement(req.body);

  if (validationErrors.length > 0) {
    return sendError(res, HTTP_STATUS.BAD_REQUEST, validationErrors.join(' '));
  }

  const title = req.body.title.trim();
  const content = req.body.content.trim();
  const targetRole = req.body.target_role || 'all';
  const imageId = req.body.image_id !== undefined && req.body.image_id !== null
    ? Number(req.body.image_id)
    : null;

  if (imageId !== null) {
    const image = await findImage(imageId);

    if (!image) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, 'Image is not valid.');
    }
  }

  
  
  
  const createdBy = req.user.userId;

  const [result] = await pool.execute(
    'INSERT INTO announcements (created_by, title, content, target_role, image_id) VALUES (?, ?, ?, ?, ?)',
    [createdBy, title, content, targetRole, imageId],
  );

  
  
  
  await notifyRoles({
    roles: targetRole === 'all' ? ['all'] : [TARGET_ROLE_TO_ROLE_NAME[targetRole]],
    title,
    message: content,
    type: 'announcement',
    excludeUserId: createdBy,
  });

  return sendCreated(res, {
    id: result.insertId,
    created_by: createdBy,
    title,
    content,
    target_role: targetRole,
    image_id: imageId,
  });
};

const listAnnouncements = async (req, res) => {
  const { page, limit, search } = validatePagination(req.query);
  const offset = (page - 1) * limit;

  const searchClause = search ? 'WHERE (announcements.title LIKE ? OR announcements.content LIKE ?)' : '';
  const searchParams = search ? Array(2).fill(`%${search}%`) : [];

  const [countRows] = await pool.execute(
    `SELECT COUNT(*) AS total FROM announcements ${searchClause}`,
    searchParams,
  );

  const [rows] = await pool.query(
    `SELECT ${ANNOUNCEMENT_SELECT_FIELDS}
     ${ANNOUNCEMENT_JOINS}
     ${searchClause}
     ORDER BY announcements.created_at DESC, announcements.id DESC
     LIMIT ? OFFSET ?`,
    [...searchParams, limit, offset],
  );

  return sendOk(res, {
    announcements: rows,
    pagination: {
      page,
      limit,
      total: countRows[0].total,
      totalPages: Math.ceil(countRows[0].total / limit),
    },
  });
};

const getAnnouncementById = async (req, res) => {
  const announcementId = req.params.id;

  const [rows] = await pool.execute(
    `SELECT ${ANNOUNCEMENT_SELECT_FIELDS} ${ANNOUNCEMENT_JOINS} WHERE announcements.id = ?`,
    [announcementId],
  );

  if (rows.length === 0) {
    return sendError(res, HTTP_STATUS.NOT_FOUND, 'Announcement not found.');
  }

  return sendOk(res, rows[0]);
};

const UPDATE_FIELDS = ['title', 'content', 'target_role', 'image_id'];

const normalizeUpdateValue = (field, value) => {
  if (field === 'image_id') {
    return value === undefined || value === null ? null : Number(value);
  }

  if (typeof value === 'string') {
    return field === 'content' ? value.trim() : value.trim();
  }

  return value;
};

const buildAssignments = (body, allowedFields) => {
  const columns = [];
  const values = [];

  allowedFields.forEach((field) => {
    if (!Object.prototype.hasOwnProperty.call(body, field)) {
      return;
    }

    columns.push(`${field} = ?`);
    values.push(normalizeUpdateValue(field, body[field]));
  });

  return { clause: columns.join(', '), values };
};

const updateAnnouncement = async (req, res) => {
  const validationErrors = validateUpdateAnnouncement(req.body);

  if (validationErrors.length > 0) {
    return sendError(res, HTTP_STATUS.BAD_REQUEST, validationErrors.join(' '));
  }

  const announcementId = req.params.id;

  const [existing] = await pool.execute('SELECT id FROM announcements WHERE id = ?', [
    announcementId,
  ]);

  if (existing.length === 0) {
    return sendError(res, HTTP_STATUS.NOT_FOUND, 'Announcement not found.');
  }

  
  
  if (
    Object.prototype.hasOwnProperty.call(req.body, 'image_id') &&
    req.body.image_id !== null
  ) {
    const image = await findImage(Number(req.body.image_id));

    if (!image) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, 'Image is not valid.');
    }
  }

  
  
  const update = buildAssignments(req.body, UPDATE_FIELDS);

  await pool.execute(`UPDATE announcements SET ${update.clause} WHERE id = ?`, [
    ...update.values,
    announcementId,
  ]);

  const [rows] = await pool.execute(
    `SELECT ${ANNOUNCEMENT_SELECT_FIELDS} ${ANNOUNCEMENT_JOINS} WHERE announcements.id = ?`,
    [announcementId],
  );

  logger.info(`Announcement ${announcementId} updated by admin ${req.user.userId}`);

  return sendOk(res, rows[0]);
};

const updateAnnouncementHandler = (req, res, next) =>
  updateAnnouncement(req, res).catch(next);

const deleteAnnouncement = async (req, res) => {
  const announcementId = req.params.id;

  const [existing] = await pool.execute('SELECT id FROM announcements WHERE id = ?', [
    announcementId,
  ]);

  if (existing.length === 0) {
    return sendError(res, HTTP_STATUS.NOT_FOUND, 'Announcement not found.');
  }

  
  await pool.execute('DELETE FROM announcements WHERE id = ?', [announcementId]);

  logger.info(`Announcement ${announcementId} deleted by admin ${req.user.userId}`);

  return res.status(HTTP_STATUS.NO_CONTENT).send();
};

const deleteAnnouncementHandler = (req, res, next) =>
  deleteAnnouncement(req, res).catch(next);

const createAnnouncementHandler = (req, res, next) =>
  createAnnouncement(req, res).catch(next);

module.exports = {
  createAnnouncement: createAnnouncementHandler,
  listAnnouncements,
  getAnnouncementById,
  updateAnnouncement: updateAnnouncementHandler,
  deleteAnnouncement: deleteAnnouncementHandler,
};
