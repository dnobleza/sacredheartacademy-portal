const pool = require('../../config/database');
const HTTP_STATUS = require('../../utils/http-status');
const { sendError, sendOk } = require('../../utils/send-response');
const { streamImage } = require('../../utils/stream-image');

// SECURITY: everything here is readable by anyone on the internet.
//   - Only target_role = 'all' is ever selected. Posts aimed at students,
//     teachers or parents are internal school business; that clause is fixed
//     here and there is no audience parameter a caller could influence.
//   - There is deliberately no join to users or admins and no created_by in
//     the select list, so an author's name or email cannot reach a public
//     response even by accident. The public site credits the school itself,
//     which is a label on the frontend rather than data from here.
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

/**
 * The picture attached to a public announcement.
 *
 * The authenticated /images/:id endpoint cannot simply be opened up — that
 * would expose every staff and student photo by id. Here the announcement id
 * is what authorises the read: the image is only reachable through an
 * announcement that is already public, so an arbitrary images.id is not
 * addressable.
 */
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

  // Not public, no such announcement, or no picture attached — all the same
  // 404, so the response never reveals which.
  if (rows.length === 0) {
    return sendError(res, HTTP_STATUS.NOT_FOUND, 'Image not found.');
  }

  return streamImage(res, rows[0], rows[0].id);
};

module.exports = {
  listPublicAnnouncements,
  getPublicAnnouncementImage,
};
