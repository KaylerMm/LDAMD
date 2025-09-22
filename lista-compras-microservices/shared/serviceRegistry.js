const fs = require('fs');
const path = require('path');

const REGISTRY_FILE = path.join(__dirname, '../data/service-registry.json');

class ServiceRegistry {
  constructor() {
    this.services = new Map();
    this.loadFromFile();
    this.setupCleanup();
  }

  // Ensure registry directory exists
  ensureDirectoryExists() {
    const dir = path.dirname(REGISTRY_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  // Load services from file
  loadFromFile() {
    this.ensureDirectoryExists();
    try {
      if (fs.existsSync(REGISTRY_FILE)) {
        const data = fs.readFileSync(REGISTRY_FILE, 'utf8');
        const parsed = JSON.parse(data);
        this.services = new Map(Object.entries(parsed));
      }
    } catch (error) {
      console.error('Error loading service registry:', error);
      this.services = new Map();
    }
  }

  // Save services to file
  saveToFile() {
    this.ensureDirectoryExists();
    try {
      const data = Object.fromEntries(this.services);
      fs.writeFileSync(REGISTRY_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Error saving service registry:', error);
    }
  }

  // Register a service
  register(serviceName, host, port, metadata = {}) {
    const service = {
      name: serviceName,
      host,
      port,
      url: `http://${host}:${port}`,
      status: 'healthy',
      lastHeartbeat: new Date().toISOString(),
      metadata: {
        ...metadata,
        pid: process.pid,
        startTime: new Date().toISOString()
      }
    };

    this.services.set(serviceName, service);
    this.saveToFile();
    
    console.log(`Service registered: ${serviceName} at ${service.url}`);
    return service;
  }

  // Unregister a service
  unregister(serviceName) {
    if (this.services.has(serviceName)) {
      this.services.delete(serviceName);
      this.saveToFile();
      console.log(`Service unregistered: ${serviceName}`);
      return true;
    }
    return false;
  }

  // Get a service by name
  getService(serviceName) {
    return this.services.get(serviceName) || null;
  }

  // Get all services
  getAllServices() {
    return Array.from(this.services.values());
  }

  // Update service heartbeat
  heartbeat(serviceName) {
    const service = this.services.get(serviceName);
    if (service) {
      service.lastHeartbeat = new Date().toISOString();
      service.status = 'healthy';
      this.services.set(serviceName, service);
      this.saveToFile();
      return true;
    }
    return false;
  }

  // Mark service as unhealthy
  markUnhealthy(serviceName) {
    const service = this.services.get(serviceName);
    if (service) {
      service.status = 'unhealthy';
      this.services.set(serviceName, service);
      this.saveToFile();
      return true;
    }
    return false;
  }

  // Check for stale services (older than 60 seconds)
  cleanupStaleServices() {
    const now = new Date();
    let cleaned = false;

    for (const [name, service] of this.services) {
      const lastHeartbeat = new Date(service.lastHeartbeat);
      const timeDiff = (now - lastHeartbeat) / 1000; // seconds

      if (timeDiff > 60) {
        console.log(`Removing stale service: ${name} (last heartbeat: ${timeDiff}s ago)`);
        this.services.delete(name);
        cleaned = true;
      }
    }

    if (cleaned) {
      this.saveToFile();
    }

    return cleaned;
  }

  // Setup cleanup on process exit
  setupCleanup() {
    process.on('SIGINT', () => this.cleanup());
    process.on('SIGTERM', () => this.cleanup());
    process.on('exit', () => this.cleanup());
  }

  cleanup() {
    // Remove services with current PID
    const currentPid = process.pid;
    let cleaned = false;

    for (const [name, service] of this.services) {
      if (service.metadata && service.metadata.pid === currentPid) {
        console.log(`Cleaning up service: ${name}`);
        this.services.delete(name);
        cleaned = true;
      }
    }

    if (cleaned) {
      this.saveToFile();
    }
  }

  // Health check all services
  async healthCheckAll() {
    const axios = require('axios');
    const results = [];

    for (const [name, service] of this.services) {
      try {
        const response = await axios.get(`${service.url}/health`, { timeout: 5000 });
        if (response.status === 200) {
          service.status = 'healthy';
          service.lastHeartbeat = new Date().toISOString();
        } else {
          service.status = 'unhealthy';
        }
      } catch (error) {
        service.status = 'unhealthy';
        console.log(`Health check failed for ${name}: ${error.message}`);
      }

      this.services.set(name, service);
      results.push({
        name,
        status: service.status,
        url: service.url
      });
    }

    this.saveToFile();
    return results;
  }

  // Get service URL for load balancing (simple round-robin)
  getServiceUrl(serviceName) {
    const service = this.getService(serviceName);
    if (service && service.status === 'healthy') {
      return service.url;
    }
    return null;
  }
}

// Singleton instance
let registryInstance = null;

function getRegistry() {
  if (!registryInstance) {
    registryInstance = new ServiceRegistry();
  }
  return registryInstance;
}

// Helper functions for easy service registration
function registerService(serviceName, host, port, metadata = {}) {
  return getRegistry().register(serviceName, host, port, metadata);
}

function discoverService(serviceName) {
  return getRegistry().getService(serviceName);
}

function unregisterService(serviceName) {
  return getRegistry().unregister(serviceName);
}

function sendHeartbeat(serviceName) {
  return getRegistry().heartbeat(serviceName);
}

module.exports = {
  ServiceRegistry,
  getRegistry,
  registerService,
  discoverService,
  unregisterService,
  sendHeartbeat
};