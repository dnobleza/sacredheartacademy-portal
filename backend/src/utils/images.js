const pool = require('../config/database');




const findImage = async (imageId) => {
  const id = Number(imageId);

  if (!Number.isInteger(id) || id < 1) {
    return null;
  }

  const [rows] = await pool.execute('SELECT id FROM images WHERE id = ?', [id]);

  return rows[0] || null;
};

module.exports = {
  findImage,
};
