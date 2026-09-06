import axios from 'axios';

/**
 * A bare client for the endpoints that work signed out. It deliberately does
 * not reuse services/api.js: that instance attaches a bearer token and its 401
 * interceptor tries to refresh the session, which is meaningless — and
 * confusing to debug — for a visitor who has no session at all.
 */
const publicApi = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

export const fetchAdmissionAcademicYears = async () => {
  const response = await publicApi.get('/admissions/academic-years');
  return response.data.data;
};

export const fetchAdmissionGradeLevels = async () => {
  const response = await publicApi.get('/admissions/grade-levels');
  return response.data.data;
};

/**
 * Applications post as JSON when nothing is attached, and as multipart when
 * they carry documents. Content-Type is cleared for the multipart case so the
 * browser writes its own boundary.
 */
export const submitAdmissionApplication = async (payload, documents) => {
  const attached = Object.entries(documents || {}).filter(([, file]) => file);

  if (attached.length === 0) {
    const response = await publicApi.post('/admissions', payload);
    return response.data.data;
  }

  const body = new FormData();

  Object.entries(payload).forEach(([key, value]) => {
    body.append(key, value);
  });

  attached.forEach(([documentType, file]) => {
    body.append(documentType, file);
  });

  const response = await publicApi.post('/admissions', body, {
    headers: { 'Content-Type': undefined },
  });

  return response.data.data;
};


/**
 * An applicant's own view of their application. Reference number and email
 * must both match, so nothing here is guessable from a reference alone.
 */
export const fetchApplicationStatus = async ({ reference, email }) => {
  const response = await publicApi.get('/admissions/status', { params: { reference, email } });
  return response.data.data;
};

/**
 * Sends corrections for a returned application. Always multipart: the fields
 * ride along with whatever replacement documents were attached.
 */
export const resubmitApplication = async ({ reference, email, fields, documents }) => {
  const body = new FormData();
  body.append('email', email);

  Object.entries(fields || {}).forEach(([key, value]) => {
    body.append(key, value);
  });

  Object.entries(documents || {}).forEach(([documentType, file]) => {
    if (file) {
      body.append(documentType, file);
    }
  });

  const response = await publicApi.post(`/admissions/${reference}/resubmit`, body, {
    headers: { 'Content-Type': undefined },
  });

  return response.data.data;
};


/**
 * An applicant reporting a payment from the status page. Always multipart, so
 * a proof photo rides along with the details; the applicant has no account, so
 * reference number and email are the credentials.
 */
export const declarePaymentForApplication = async ({ reference, email, fields, proof }) => {
  const body = new FormData();
  body.append('email', email);

  Object.entries(fields || {}).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      body.append(key, value);
    }
  });

  if (proof) {
    body.append('proof', proof);
  }

  const response = await publicApi.post(`/admissions/${reference}/declare-payment`, body, {
    headers: { 'Content-Type': undefined },
  });

  return response.data.data;
};


/**
 * The receipt for one confirmed payment. Reference plus email are the
 * credentials, exactly as for the status lookup.
 */
export const fetchApplicationReceipt = async ({ reference, email, paymentId }) => {
  const response = await publicApi.get(`/admissions/${reference}/receipt/${paymentId}`, {
    params: { email },
  });

  return response.data.data;
};


/**
 * The school's public news feed. The server returns only announcements posted
 * to everyone, and deliberately carries no author — the public site credits
 * the school itself.
 */
export const fetchPublicAnnouncements = async () => {
  const response = await publicApi.get('/announcements');
  return response.data.data;
};

export const publicAnnouncementImageUrl = (announcementId) =>
  `${publicApi.defaults.baseURL}/announcements/${announcementId}/image`;

export default publicApi;
