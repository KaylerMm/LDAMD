const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const axios = require('axios');
const { registerService, sendHeartbeat, getRegistry, discoverService } = require('../shared/serviceRegistry');

const app = express();
const PORT = process.env.PORT || 3005;
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('combined'));

// Rate limiting - DESABILITADO PARA TESTES
// const limiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 2000 // limit each IP to 2000 requests per windowMs (gateway precisa de mais)
// });
// app.use(limiter); // Comentado para permitir testes intensivos

// Circuit Breaker class
class CircuitBreaker {
  constructor(serviceName, options = {}) {
    this.serviceName = serviceName;
    this.failureThreshold = options.failureThreshold || 3;
    this.resetTimeout = options.resetTimeout || 60000; // 60 seconds
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failureCount = 0;
    this.lastFailureTime = null;
  }

  async call(request) {
    if (this.state === 'OPEN') {
      // Check if we should attempt reset
      if (Date.now() - this.lastFailureTime > this.resetTimeout) {
        this.state = 'HALF_OPEN';
        console.log(`Circuit breaker for ${this.serviceName} is now HALF_OPEN`);
      } else {
        throw new Error(`Circuit breaker is OPEN for ${this.serviceName}`);
      }
    }

    try {
      const result = await request();
      
      // Success resets the circuit breaker
      if (this.state === 'HALF_OPEN') {
        this.state = 'CLOSED';
        this.failureCount = 0;
        console.log(`Circuit breaker for ${this.serviceName} is now CLOSED`);
      }
      
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  recordFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      console.log(`Circuit breaker for ${this.serviceName} is now OPEN`);
    }
  }

  getState() {
    return {
      serviceName: this.serviceName,
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime
    };
  }
}

// Circuit breakers for each service
const circuitBreakers = {
  'user-service': new CircuitBreaker('user-service'),
  'item-service': new CircuitBreaker('item-service'),
  'list-service': new CircuitBreaker('list-service')
};

// Enhanced proxy middleware with circuit breaker
const createCircuitBreakerProxy = (serviceName, pathRewrite = {}) => {
  return async (req, res, next) => {
    try {
      const circuitBreaker = circuitBreakers[serviceName];
      
      await circuitBreaker.call(async () => {
        const service = discoverService(serviceName);
        
        if (!service || service.status !== 'healthy') {
          throw new Error(`${serviceName} is not available`);
        }

        // Create dynamic proxy
        const proxy = createProxyMiddleware({
          target: service.url,
          changeOrigin: true,
          pathRewrite,
          timeout: 5000,
          onError: (err, req, res) => {
            console.error(`Proxy error for ${serviceName}:`, err.message);
            circuitBreaker.recordFailure();
            res.status(503).json({ 
              error: `Service ${serviceName} unavailable`,
              details: err.message 
            });
          }
        });

        return new Promise((resolve, reject) => {
          proxy(req, res, (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
      });
    } catch (error) {
      console.error(`Circuit breaker error for ${serviceName}:`, error.message);
      res.status(503).json({ 
        error: `Service ${serviceName} circuit breaker is open`,
        details: error.message 
      });
    }
  };
};

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const registry = getRegistry();
    const services = registry.getAllServices();
    
    const healthChecks = await Promise.allSettled(
      services.map(async (service) => {
        try {
          const response = await axios.get(`${service.url}/health`, { timeout: 3000 });
          return {
            name: service.name,
            status: 'healthy',
            url: service.url,
            response: response.data
          };
        } catch (error) {
          return {
            name: service.name,
            status: 'unhealthy',
            url: service.url,
            error: error.message
          };
        }
      })
    );

    const results = healthChecks.map(result => result.value || result.reason);
    
    res.json({
      gateway: {
        status: 'healthy',
        port: PORT,
        timestamp: new Date().toISOString()
      },
      services: results,
      circuitBreakers: Object.values(circuitBreakers).map(cb => cb.getState())
    });
  } catch (error) {
    res.status(500).json({ error: 'Health check failed', details: error.message });
  }
});

// Service registry endpoint
app.get('/registry', (req, res) => {
  try {
    const registry = getRegistry();
    const services = registry.getAllServices();
    
    res.json({
      services,
      total: services.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get registry', details: error.message });
  }
});

// User service routes
app.use('/api/auth', createCircuitBreakerProxy('user-service', { '^/api/auth': '/auth' }));
app.use('/api/users', createCircuitBreakerProxy('user-service', { '^/api/users': '/users' }));

// Item service routes  
app.use('/api/items', createCircuitBreakerProxy('item-service', { '^/api/items': '/items' }));
app.use('/api/categories', createCircuitBreakerProxy('item-service', { '^/api/categories': '/categories' }));
app.use('/api/search', createCircuitBreakerProxy('item-service', { '^/api/search': '/search' }));

// List service routes
app.use('/api/lists', createCircuitBreakerProxy('list-service', { '^/api/lists': '/lists' }));
app.use('/api/stats', createCircuitBreakerProxy('list-service', { '^/api/stats': '/stats' }));

// Aggregated endpoints

// Dashboard endpoint - aggregates data from multiple services
app.get('/api/dashboard', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    
    if (!authHeader) {
      return res.status(401).json({ error: 'Authorization header required' });
    }

    const headers = { 'Authorization': authHeader };
    
    // Get data from multiple services in parallel
    const [userResponse, listsResponse, statsResponse] = await Promise.allSettled([
      // Get user info
      circuitBreakers['user-service'].call(async () => {
        const userService = discoverService('user-service');
        if (!userService) throw new Error('User service not available');
        
        // Extract user ID from token (this is a simplified approach)
        const verifyResponse = await axios.post(`${userService.url}/auth/verify`, 
          { token: authHeader.split(' ')[1] });
        
        return axios.get(`${userService.url}/users/${verifyResponse.data.user.id}`, { headers });
      }),
      
      // Get recent lists
      circuitBreakers['list-service'].call(async () => {
        const listService = discoverService('list-service');
        if (!listService) throw new Error('List service not available');
        return axios.get(`${listService.url}/lists?limit=5`, { headers });
      }),
      
      // Get user statistics
      circuitBreakers['list-service'].call(async () => {
        const listService = discoverService('list-service');
        if (!listService) throw new Error('List service not available');
        return axios.get(`${listService.url}/stats`, { headers });
      })
    ]);

    const dashboard = {
      timestamp: new Date().toISOString(),
      user: userResponse.status === 'fulfilled' ? userResponse.value.data : null,
      recentLists: listsResponse.status === 'fulfilled' ? listsResponse.value.data.lists : [],
      statistics: statsResponse.status === 'fulfilled' ? statsResponse.value.data : null,
      errors: []
    };

    // Collect any errors
    if (userResponse.status === 'rejected') {
      dashboard.errors.push({ service: 'user-service', error: userResponse.reason.message });
    }
    if (listsResponse.status === 'rejected') {
      dashboard.errors.push({ service: 'list-service', error: listsResponse.reason.message });
    }
    if (statsResponse.status === 'rejected') {
      dashboard.errors.push({ service: 'stats', error: statsResponse.reason.message });
    }

    res.json(dashboard);
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Dashboard unavailable', details: error.message });
  }
});

// Global search endpoint
app.get('/api/global-search', async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;
    
    if (!q || q.trim().length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }

    const authHeader = req.headers['authorization'];
    const headers = authHeader ? { 'Authorization': authHeader } : {};

    // Search in parallel across services
    const [itemsResponse, listsResponse] = await Promise.allSettled([
      // Search items
      circuitBreakers['item-service'].call(async () => {
        const itemService = discoverService('item-service');
        if (!itemService) throw new Error('Item service not available');
        return axios.get(`${itemService.url}/search?q=${encodeURIComponent(q)}&limit=${limit}`, { headers });
      }),
      
      // Search lists (if authenticated)
      authHeader ? circuitBreakers['list-service'].call(async () => {
        const listService = discoverService('list-service');
        if (!listService) throw new Error('List service not available');
        const response = await axios.get(`${listService.url}/lists`, { headers });
        
        // Filter lists by name containing search query
        const filteredLists = response.data.lists.filter(list => 
          list.name.toLowerCase().includes(q.toLowerCase())
        ).slice(0, limit);
        
        return { data: { lists: filteredLists } };
      }) : Promise.resolve({ status: 'fulfilled', value: { data: { lists: [] } } })
    ]);

    const results = {
      query: q,
      items: itemsResponse.status === 'fulfilled' ? itemsResponse.value.data.items : [],
      lists: listsResponse.status === 'fulfilled' ? listsResponse.value.data.lists : [],
      errors: []
    };

    // Collect errors
    if (itemsResponse.status === 'rejected') {
      results.errors.push({ service: 'item-service', error: itemsResponse.reason.message });
    }
    if (listsResponse.status === 'rejected') {
      results.errors.push({ service: 'list-service', error: listsResponse.reason.message });
    }

    res.json(results);
  } catch (error) {
    console.error('Global search error:', error);
    res.status(500).json({ error: 'Search unavailable', details: error.message });
  }
});

// Circuit breaker status endpoint
app.get('/api/circuit-breakers', (req, res) => {
  const states = Object.values(circuitBreakers).map(cb => cb.getState());
  res.json({ circuitBreakers: states });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Gateway error:', err);
  res.status(500).json({ error: 'Gateway error', details: err.message });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Endpoint not found',
    availableRoutes: [
      'GET /health',
      'GET /registry',
      'GET /api/dashboard',
      'GET /api/global-search',
      'POST /api/auth/register',
      'POST /api/auth/login',
      'GET /api/items',
      'GET /api/lists'
    ]
  });
});

// Health check all services periodically
const performHealthChecks = async () => {
  try {
    const registry = getRegistry();
    await registry.healthCheckAll();
  } catch (error) {
    console.error('Health check error:', error);
  }
};

// Start server
const server = app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
  
  // Register gateway service
  registerService('api-gateway', 'localhost', PORT, {
    description: 'API Gateway for shopping list microservices',
    version: '1.0.0'
  });

  // Start health checking
  setInterval(performHealthChecks, 30000); // Every 30 seconds
  
  // Send periodic heartbeats
  setInterval(() => {
    sendHeartbeat('api-gateway');
  }, 30000);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down API Gateway...');
  server.close(() => {
    process.exit(0);
  });
});

module.exports = app;