const HTTP_STATUS = require('./http-status');

const sendSuccess = (res, statusCode, data) =>
  res.status(statusCode).json({
    success: true,
    code: statusCode,
    data,
  });

const sendError = (res, statusCode, message) =>
  res.status(statusCode).json({
    success: false,
    code: statusCode,
    message,
  });

const sendOk = (res, data) => sendSuccess(res, HTTP_STATUS.OK, data);
const sendCreated = (res, data) => sendSuccess(res, HTTP_STATUS.CREATED, data);

module.exports = {
  sendSuccess,
  sendError,
  sendOk,
  sendCreated,
};
