export const getHealthStatus = (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'routewise-api',
    stack: 'PERN (PostgreSQL, Express.js, React.js, Node.js)',
    timestamp: new Date().toISOString(),
  });
};
