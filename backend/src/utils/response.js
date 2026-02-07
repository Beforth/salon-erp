const sendResponse = (res, statusCode, data, meta = {}) => {
  const response = {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta,
    },
  };

  return res.status(statusCode).json(response);
};

const sendPaginatedResponse = (res, statusCode, data, pagination, meta = {}) => {
  const response = {
    success: true,
    data,
    pagination,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta,
    },
  };

  return res.status(statusCode).json(response);
};

module.exports = { sendResponse, sendPaginatedResponse };
