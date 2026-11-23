function notFound(req, res) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  let status = err.status || 500;
  let message = err.message || 'Something went wrong. Please try again.';
  let errors;

  if (err.name === 'ValidationError' && err.errors) {
    status = 422;
    message = 'Please check the submitted values.';
    errors = {};
    for (const [field, detail] of Object.entries(err.errors)) {
      errors[field] = detail.message;
    }
  } else if (err.name === 'CastError') {
    status = 404;
    message = 'That item could not be found.';
  } else if (err.code === 11000) {
    status = 409;
    const field = Object.keys(err.keyPattern || {})[0];
    message = field
      ? `A record with that ${field.replace(/([A-Z])/g, ' $1').toLowerCase()} already exists.`
      : 'That record already exists.';
  }

  if (status >= 500) {
    console.error(err);
  }

  const payload = { message };
  if (errors) payload.errors = errors;
  res.status(status).json(payload);
}

module.exports = { notFound, errorHandler };
