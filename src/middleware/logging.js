/**
 * Request logging middleware
 * Logs all requests without sensitive data, includes requestId for correlation
 */

/**
 * Request logging middleware
 * Logs comprehensive request information including method, path, IP, headers, and response details
 */
export function requestLogger(req, res, next) {
  const requestId = req.headers['x-request-id'] || `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const startTime = Date.now();
  
  // Store requestId in request for downstream use
  req.requestId = requestId;
  
  // Get client IP address
  const clientIp = req.ip || 
                   req.connection?.remoteAddress || 
                   req.socket?.remoteAddress ||
                   req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
                   'unknown';
  
  // Log incoming request (without sensitive data)
  const requestLogData = {
    type: 'request',
    requestId,
    method: req.method,
    path: req.path,
    query: Object.keys(req.query).length > 0 ? req.query : undefined,
    clientId: req.body?.clientId || 'not-provided',
    clientIp,
    userAgent: req.headers['user-agent'],
    contentType: req.headers['content-type'],
    contentLength: req.headers['content-length'],
    timestamp: new Date().toISOString(),
  };
  
  // Remove undefined fields for cleaner logs
  Object.keys(requestLogData).forEach(key => {
    if (requestLogData[key] === undefined) {
      delete requestLogData[key];
    }
  });
  
  console.log('[REQUEST]', JSON.stringify(requestLogData));
  
  // Log response when it finishes
  const originalSend = res.send;
  res.send = function(data) {
    const duration = Date.now() - startTime;
    
    const responseLogData = {
      type: 'response',
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      clientId: req.authenticatedClient?.clientId || req.body?.clientId || 'unknown',
      timestamp: new Date().toISOString(),
    };
    
    console.log('[RESPONSE]', JSON.stringify(responseLogData));
    
    return originalSend.call(this, data);
  };
  
  next();
}

