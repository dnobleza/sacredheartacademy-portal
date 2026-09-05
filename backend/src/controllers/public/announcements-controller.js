const pool = require('../../config/database');
const HTTP_STATUS = require('../../utils/http-status');
const { sendError, sendOk } = require('../../utils/send-response');
const { streamImage } = require('../../utils/stream-image');









const PUBLIC_LIMIT = 6;

const listPublicAnnouncements = async (req, res) => {
  const [rows] = await pool.execute(
    `SELECT id, title, content, image_id, created_at
     FROM announcements
     WHERE target_role = 'all'
     ORDER BY created_at DESC, id DESC
     LIMIT ${PUBLIC_LIMIT}`,
  );

  return sendOk(res, rows);
};


const getPublicAnnouncementImage = async (req, res) => {
  const announcementId = Number(req.params.id);

  if (!Number.isInteger(announcementId) || announcementId < 1) {
    return sendError(res, HTTP_STATUS.NOT_FOUND, 'Image not found.');
  }

  const [rows] = await pool.execute(
    `SELECT images.id, images.filename, images.mime_type
     FROM announcements
     JOIN images ON images.id = announcements.image_id
     WHERE announcements.id = ? AND announcements.target_role = 'all'`,
    [announcementId],
  );

  
  
  if (rows.length === 0) {
    return sendError(res, HTTP_STATUS.NOT_FOUND, 'Image not found.');
  }

  return streamImage(res, rows[0], rows[0].id);
};

module.exports = {
  listPublicAnnouncements,
  getPublicAnnouncementImage,
};
