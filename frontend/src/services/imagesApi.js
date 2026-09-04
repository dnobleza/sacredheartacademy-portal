import api from './api';

/**
 * Uploads and image fetching. Images are NOT public files: the backend serves
 * them from an authenticated endpoint, so a plain <img src="/api/v1/images/5">
 * would arrive without the bearer token and 401. Everything here goes through
 * the axios instance, whose interceptor attaches the token, and the bytes are
 * turned into an object URL the browser can render.
 */

export const uploadImage = async (file) => {
  const form = new FormData();
  form.append('image', file);

  // The shared instance sets Content-Type: application/json. Clearing it lets
  // the browser write its own multipart header including the boundary, without
  // which multer cannot parse the body.
  const response = await api.post('/images', form, {
    headers: { 'Content-Type': undefined },
  });

  return response.data.data;
};

/**
 * Returns an object URL for an image. The caller owns it and must pass it to
 * URL.revokeObjectURL when done, or the blob is held for the life of the
 * document.
 */
export const fetchImageObjectUrl = async (imageId) => {
  const response = await api.get(`/images/${imageId}`, { responseType: 'blob' });
  return URL.createObjectURL(response.data);
};

export const deleteImage = async (imageId) => {
  await api.delete(`/images/${imageId}`);
};
