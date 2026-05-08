const errorHandler = (err, req, res, next) => {
  console.error('Error:', err.message);
  console.error('Stack:', err.stack);

  if (err.code === '23505') {
    // PostgreSQL unique violation
    const field = err.detail?.match(/\((.+?)\)/)?.[1] || 'field';
    return res.status(409).json({ error: `${field} already exists` });
  }

  if (err.code === '23503') {
    // Foreign key violation
    return res.status(400).json({ error: 'Referenced resource not found' });
  }

  if (err.code === '23502') {
    // Not null violation
    const field = err.column || 'field';
    return res.status(400).json({ error: `${field} is required` });
  }

  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal server error';

  res.status(status).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = errorHandler;
