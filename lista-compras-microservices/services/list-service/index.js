const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const Joi = require('joi');
const path = require('path');
const axios = require('axios');

// Shared modules
const JsonDatabase = require('../../shared/JsonDatabase');
const { registerService, sendHeartbeat, discoverService } = require('../../shared/serviceRegistry');

const app = express();
const PORT = process.env.PORT || 3002;

// Database setup
const db = new JsonDatabase(path.join(__dirname, '../../data/lists.json'));

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Rate limiting - DESABILITADO PARA TESTES
// const limiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 1000 // limit each IP to 1000 requests per windowMs
// });
// app.use(limiter); // Comentado para permitir testes intensivos

// Validation schemas
const listSchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  description: Joi.string().max(500).optional(),
  status: Joi.string().valid('active', 'completed', 'archived').default('active')
});

const updateListSchema = Joi.object({
  name: Joi.string().min(1).max(100),
  description: Joi.string().max(500),
  status: Joi.string().valid('active', 'completed', 'archived')
});

const addItemSchema = Joi.object({
  itemId: Joi.string().required(),
  quantity: Joi.number().min(0.01).required(),
  unit: Joi.string().optional(),
  estimatedPrice: Joi.number().min(0).optional(),
  notes: Joi.string().max(200).optional()
});

const updateItemSchema = Joi.object({
  quantity: Joi.number().min(0.01),
  unit: Joi.string(),
  estimatedPrice: Joi.number().min(0),
  purchased: Joi.boolean(),
  notes: Joi.string().max(200)
});

// Authentication middleware (verifies token with user service)
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    // Verify token with user service
    const userService = discoverService('user-service');
    if (!userService) {
      return res.status(503).json({ error: 'User service unavailable' });
    }

    const response = await axios.post(`${userService.url}/auth/verify`, { token });
    
    if (response.data.valid) {
      req.user = response.data.user;
      next();
    } else {
      res.status(403).json({ error: 'Invalid token' });
    }
  } catch (error) {
    console.error('Authentication error:', error.message);
    res.status(403).json({ error: 'Authentication failed' });
  }
};

// Helper functions
const calculateSummary = (items) => {
  const totalItems = items.length;
  const purchasedItems = items.filter(item => item.purchased).length;
  const estimatedTotal = items.reduce((sum, item) => {
    return sum + (item.estimatedPrice * item.quantity);
  }, 0);

  return {
    totalItems,
    purchasedItems,
    estimatedTotal: Math.round(estimatedTotal * 100) / 100
  };
};

const getItemDetails = async (itemId) => {
  try {
    const itemService = discoverService('item-service');
    if (!itemService) {
      return null;
    }

    const response = await axios.get(`${itemService.url}/items/${itemId}`);
    return response.data;
  } catch (error) {
    console.error(`Failed to get item details for ${itemId}:`, error.message);
    return null;
  }
};

// Routes

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'list-service',
    port: PORT,
    timestamp: new Date().toISOString()
  });
});

// Create new list
app.post('/lists', authenticateToken, async (req, res) => {
  try {
    // Validate request
    const { error, value } = listSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    // Create list
    const listData = {
      ...value,
      userId: req.user.id,
      items: [],
      summary: {
        totalItems: 0,
        purchasedItems: 0,
        estimatedTotal: 0
      }
    };

    const list = db.create('lists', listData);
    
    res.status(201).json({
      message: 'List created successfully',
      list
    });
  } catch (error) {
    console.error('Create list error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all lists for the authenticated user
app.get('/lists', authenticateToken, (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    
    let query = { userId: req.user.id };
    
    if (status) {
      query.status = status;
    }
    
    let lists = db.findMany('lists', query);
    
    // Sort by updatedAt (most recent first)
    lists.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    
    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedLists = lists.slice(startIndex, endIndex);
    
    res.json({
      lists: paginatedLists,
      total: lists.length,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(lists.length / limit)
    });
  } catch (error) {
    console.error('Get lists error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get specific list
app.get('/lists/:id', authenticateToken, (req, res) => {
  try {
    const list = db.findById('lists', req.params.id);
    
    if (!list) {
      return res.status(404).json({ error: 'List not found' });
    }
    
    // Check if user owns this list
    if (list.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    res.json(list);
  } catch (error) {
    console.error('Get list error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update list
app.put('/lists/:id', authenticateToken, async (req, res) => {
  try {
    // Validate request
    const { error, value } = updateListSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    // Check if list exists and belongs to user
    const existingList = db.findById('lists', req.params.id);
    if (!existingList) {
      return res.status(404).json({ error: 'List not found' });
    }
    
    if (existingList.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Update list
    const updatedList = db.update('lists', req.params.id, value);
    
    res.json({
      message: 'List updated successfully',
      list: updatedList
    });
  } catch (error) {
    console.error('Update list error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete list
app.delete('/lists/:id', authenticateToken, (req, res) => {
  try {
    // Check if list exists and belongs to user
    const existingList = db.findById('lists', req.params.id);
    if (!existingList) {
      return res.status(404).json({ error: 'List not found' });
    }
    
    if (existingList.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Delete list
    const deleted = db.delete('lists', req.params.id);
    
    if (deleted) {
      res.json({ message: 'List deleted successfully' });
    } else {
      res.status(500).json({ error: 'Failed to delete list' });
    }
  } catch (error) {
    console.error('Delete list error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add item to list
app.post('/lists/:id/items', authenticateToken, async (req, res) => {
  try {
    // Validate request
    const { error, value } = addItemSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    // Check if list exists and belongs to user
    const existingList = db.findById('lists', req.params.id);
    if (!existingList) {
      return res.status(404).json({ error: 'List not found' });
    }
    
    if (existingList.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get item details from item service
    const itemDetails = await getItemDetails(value.itemId);
    if (!itemDetails) {
      return res.status(404).json({ error: 'Item not found or item service unavailable' });
    }

    // Check if item is already in the list
    const existingItemIndex = existingList.items.findIndex(item => item.itemId === value.itemId);
    if (existingItemIndex !== -1) {
      return res.status(409).json({ error: 'Item already in list' });
    }

    // Create new list item
    const newItem = {
      itemId: value.itemId,
      itemName: itemDetails.name,
      quantity: value.quantity,
      unit: value.unit || itemDetails.unit,
      estimatedPrice: value.estimatedPrice || itemDetails.averagePrice,
      purchased: false,
      notes: value.notes || '',
      addedAt: new Date().toISOString()
    };

    // Add item to list
    const updatedItems = [...existingList.items, newItem];
    const summary = calculateSummary(updatedItems);

    const updatedList = db.update('lists', req.params.id, { 
      items: updatedItems, 
      summary 
    });
    
    res.status(201).json({
      message: 'Item added to list successfully',
      list: updatedList,
      addedItem: newItem
    });
  } catch (error) {
    console.error('Add item to list error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update item in list
app.put('/lists/:id/items/:itemId', authenticateToken, async (req, res) => {
  try {
    // Validate request
    const { error, value } = updateItemSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    // Check if list exists and belongs to user
    const existingList = db.findById('lists', req.params.id);
    if (!existingList) {
      return res.status(404).json({ error: 'List not found' });
    }
    
    if (existingList.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Find item in list
    const itemIndex = existingList.items.findIndex(item => item.itemId === req.params.itemId);
    if (itemIndex === -1) {
      return res.status(404).json({ error: 'Item not found in list' });
    }

    // Update item
    const updatedItems = [...existingList.items];
    updatedItems[itemIndex] = {
      ...updatedItems[itemIndex],
      ...value
    };

    const summary = calculateSummary(updatedItems);

    const updatedList = db.update('lists', req.params.id, { 
      items: updatedItems, 
      summary 
    });
    
    res.json({
      message: 'Item updated successfully',
      list: updatedList,
      updatedItem: updatedItems[itemIndex]
    });
  } catch (error) {
    console.error('Update item in list error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove item from list
app.delete('/lists/:id/items/:itemId', authenticateToken, (req, res) => {
  try {
    // Check if list exists and belongs to user
    const existingList = db.findById('lists', req.params.id);
    if (!existingList) {
      return res.status(404).json({ error: 'List not found' });
    }
    
    if (existingList.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Find item in list
    const itemIndex = existingList.items.findIndex(item => item.itemId === req.params.itemId);
    if (itemIndex === -1) {
      return res.status(404).json({ error: 'Item not found in list' });
    }

    // Remove item
    const updatedItems = existingList.items.filter(item => item.itemId !== req.params.itemId);
    const summary = calculateSummary(updatedItems);

    const updatedList = db.update('lists', req.params.id, { 
      items: updatedItems, 
      summary 
    });
    
    res.json({
      message: 'Item removed from list successfully',
      list: updatedList
    });
  } catch (error) {
    console.error('Remove item from list error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get list summary
app.get('/lists/:id/summary', authenticateToken, (req, res) => {
  try {
    const list = db.findById('lists', req.params.id);
    
    if (!list) {
      return res.status(404).json({ error: 'List not found' });
    }
    
    // Check if user owns this list
    if (list.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Recalculate summary to ensure accuracy
    const summary = calculateSummary(list.items);
    
    res.json({
      listId: list.id,
      listName: list.name,
      status: list.status,
      summary,
      itemsByCategory: list.items.reduce((acc, item) => {
        // This would need item details to categorize properly
        // For now, we'll just count items
        acc.total = (acc.total || 0) + 1;
        if (item.purchased) {
          acc.purchased = (acc.purchased || 0) + 1;
        }
        return acc;
      }, {})
    });
  } catch (error) {
    console.error('Get list summary error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user statistics
app.get('/stats', authenticateToken, (req, res) => {
  try {
    const userLists = db.findMany('lists', { userId: req.user.id });
    
    const stats = {
      totalLists: userLists.length,
      activeLists: userLists.filter(list => list.status === 'active').length,
      completedLists: userLists.filter(list => list.status === 'completed').length,
      archivedLists: userLists.filter(list => list.status === 'archived').length,
      totalItems: userLists.reduce((sum, list) => sum + list.items.length, 0),
      totalEstimatedValue: userLists.reduce((sum, list) => sum + list.summary.estimatedTotal, 0)
    };
    
    res.json(stats);
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`List Service running on port ${PORT}`);
  
  // Register service with service registry
  registerService('list-service', 'localhost', PORT, {
    description: 'Shopping list management service',
    version: '1.0.0'
  });

  // Send periodic heartbeats
  setInterval(() => {
    sendHeartbeat('list-service');
  }, 30000); // Every 30 seconds
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down List Service...');
  server.close(() => {
    process.exit(0);
  });
});

module.exports = app;