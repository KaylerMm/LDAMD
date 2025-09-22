const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const Joi = require('joi');
const path = require('path');
const axios = require('axios');

const JsonDatabase = require('../../shared/JsonDatabase');
const { registerService, sendHeartbeat, discoverService } = require('../../shared/serviceRegistry');

const app = express();
const PORT = process.env.PORT || 3003;

const db = new JsonDatabase(path.join(__dirname, '../../data/items.json'));

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const itemSchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  category: Joi.string().valid('Alimentos', 'Limpeza', 'Higiene', 'Bebidas', 'Padaria').required(),
  brand: Joi.string().max(50).optional(),
  unit: Joi.string().valid('kg', 'g', 'un', 'litro', 'ml', 'pacote', 'caixa').required(),
  averagePrice: Joi.number().min(0).required(),
  barcode: Joi.string().optional(),
  description: Joi.string().max(500).optional(),
  active: Joi.boolean().default(true)
});

const updateItemSchema = Joi.object({
  name: Joi.string().min(1).max(100),
  category: Joi.string().valid('Alimentos', 'Limpeza', 'Higiene', 'Bebidas', 'Padaria'),
  brand: Joi.string().max(50),
  unit: Joi.string().valid('kg', 'g', 'un', 'litro', 'ml', 'pacote', 'caixa'),
  averagePrice: Joi.number().min(0),
  barcode: Joi.string(),
  description: Joi.string().max(500),
  active: Joi.boolean()
});
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

   
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
const seedInitialData = () => {
  const items = db.findAll('items');
  if (items.length === 0) {
    console.log('Seeding initial items data...');
    
    const initialItems = [

      { name: 'Arroz Branco', category: 'Alimentos', brand: 'Tio João', unit: 'kg', averagePrice: 4.50, barcode: '7891234567890', description: 'Arroz branco tipo 1' },
      { name: 'Feijão Preto', category: 'Alimentos', brand: 'Camil', unit: 'kg', averagePrice: 6.80, barcode: '7891234567891', description: 'Feijão preto premium' },
      { name: 'Açúcar Cristal', category: 'Alimentos', brand: 'União', unit: 'kg', averagePrice: 3.20, barcode: '7891234567892', description: 'Açúcar cristal refinado' },
      { name: 'Óleo de Soja', category: 'Alimentos', brand: 'Liza', unit: 'litro', averagePrice: 5.90, barcode: '7891234567893', description: 'Óleo de soja refinado' },
      { name: 'Macarrão Espaguete', category: 'Alimentos', brand: 'Barilla', unit: 'pacote', averagePrice: 4.20, barcode: '7891234567894', description: 'Macarrão espaguete 500g' },
      { name: 'Leite Integral', category: 'Alimentos', brand: 'Parmalat', unit: 'litro', averagePrice: 4.80, barcode: '7891234567895', description: 'Leite integral UHT' },
      { name: 'Ovos', category: 'Alimentos', brand: 'Korin', unit: 'caixa', averagePrice: 8.50, barcode: '7891234567896', description: 'Ovos brancos 12 unidades' },
      { name: 'Banana Prata', category: 'Alimentos', brand: '', unit: 'kg', averagePrice: 4.90, barcode: '', description: 'Banana prata fresca' },
      

      { name: 'Detergente Líquido', category: 'Limpeza', brand: 'Ypê', unit: 'un', averagePrice: 2.80, barcode: '7891234567897', description: 'Detergente neutro 500ml' },
      { name: 'Água Sanitária', category: 'Limpeza', brand: 'Candida', unit: 'litro', averagePrice: 3.50, barcode: '7891234567898', description: 'Água sanitária 1L' },
      { name: 'Sabão em Pó', category: 'Limpeza', brand: 'Omo', unit: 'caixa', averagePrice: 12.90, barcode: '7891234567899', description: 'Sabão em pó 1kg' },
      { name: 'Desinfetante', category: 'Limpeza', brand: 'Pinho Sol', unit: 'litro', averagePrice: 6.20, barcode: '7891234567800', description: 'Desinfetante pinho 1L' },
      { name: 'Esponja de Aço', category: 'Limpeza', brand: 'Bombril', unit: 'pacote', averagePrice: 3.80, barcode: '7891234567801', description: 'Esponja de aço 8 unidades' },
      

      { name: 'Pasta de Dente', category: 'Higiene', brand: 'Colgate', unit: 'un', averagePrice: 4.50, barcode: '7891234567802', description: 'Pasta de dente Total 12 90g' },
      { name: 'Shampoo', category: 'Higiene', brand: 'Pantene', unit: 'un', averagePrice: 12.90, barcode: '7891234567803', description: 'Shampoo hidratação 400ml' },
      { name: 'Sabonete', category: 'Higiene', brand: 'Dove', unit: 'un', averagePrice: 2.80, barcode: '7891234567804', description: 'Sabonete hidratante 90g' },
      { name: 'Papel Higiênico', category: 'Higiene', brand: 'Neve', unit: 'pacote', averagePrice: 8.90, barcode: '7891234567805', description: 'Papel higiênico folha dupla 4 rolos' },
      { name: 'Desodorante', category: 'Higiene', brand: 'Rexona', unit: 'un', averagePrice: 7.80, barcode: '7891234567806', description: 'Desodorante aerosol 150ml' },
      

      { name: 'Refrigerante Cola', category: 'Bebidas', brand: 'Coca-Cola', unit: 'litro', averagePrice: 6.50, barcode: '7891234567807', description: 'Refrigerante cola 2L' },
      { name: 'Suco de Laranja', category: 'Bebidas', brand: 'Tang', unit: 'pacote', averagePrice: 3.20, barcode: '7891234567808', description: 'Suco em pó sabor laranja' },
      { name: 'Água Mineral', category: 'Bebidas', brand: 'Crystal', unit: 'litro', averagePrice: 2.10, barcode: '7891234567809', description: 'Água mineral sem gás 1,5L' },
      { name: 'Café Torrado', category: 'Bebidas', brand: 'Pilão', unit: 'pacote', averagePrice: 9.80, barcode: '7891234567810', description: 'Café torrado e moído 500g' },
      
      // Padaria
      { name: 'Pão de Açúcar', category: 'Padaria', brand: '', unit: 'un', averagePrice: 0.80, barcode: '', description: 'Pão de açúcar francês' },
      { name: 'Pão Integral', category: 'Padaria', brand: 'Wickbold', unit: 'un', averagePrice: 6.50, barcode: '7891234567811', description: 'Pão integral fatiado' },
      { name: 'Croissant', category: 'Padaria', brand: '', unit: 'un', averagePrice: 3.50, barcode: '', description: 'Croissant simples' }
    ];

    initialItems.forEach(item => {
      db.create('items', item);
    });

    console.log(`Seeded ${initialItems.length} initial items`);
  }
};
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'item-service',
    port: PORT,
    timestamp: new Date().toISOString()
  });
});

app.get('/categories', (req, res) => {
  try {
    const categories = ['Alimentos', 'Limpeza', 'Higiene', 'Bebidas', 'Padaria'];
    res.json({ categories });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/items', (req, res) => {
  try {
    const { category, name, active = 'true', page = 1, limit = 50 } = req.query;
    
    let query = {};
    
    if (category) {
      query.category = category;
    }
    
    if (active !== 'all') {
      query.active = active === 'true';
    }
    
    let items = db.findMany('items', query);
    
    // Filter by name (case-insensitive partial match)
    if (name) {
      const nameFilter = name.toLowerCase();
      items = items.filter(item => 
        item.name.toLowerCase().includes(nameFilter)
      );
    }
    
    // Sort by name
    items.sort((a, b) => a.name.localeCompare(b.name));
    
    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedItems = items.slice(startIndex, endIndex);
    
    res.json({
      items: paginatedItems,
      total: items.length,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(items.length / limit)
    });
  } catch (error) {
    console.error('Get items error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/search', (req, res) => {
  try {
    const { q, limit = 20 } = req.query;
    
    if (!q || q.trim().length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }
    
    const searchTerm = q.toLowerCase().trim();
    const allItems = db.findMany('items', { active: true });
    
    // Search in name, brand, and description
    const matchedItems = allItems.filter(item => {
      const searchableText = [
        item.name,
        item.brand || '',
        item.description || ''
      ].join(' ').toLowerCase();
      
      return searchableText.includes(searchTerm);
    });
    
    // Sort by relevance (exact matches first, then partial matches)
    matchedItems.sort((a, b) => {
      const aName = a.name.toLowerCase();
      const bName = b.name.toLowerCase();
      
      // Exact match in name gets highest priority
      if (aName === searchTerm && bName !== searchTerm) return -1;
      if (bName === searchTerm && aName !== searchTerm) return 1;
      
      // Name starts with search term gets second priority
      if (aName.startsWith(searchTerm) && !bName.startsWith(searchTerm)) return -1;
      if (bName.startsWith(searchTerm) && !aName.startsWith(searchTerm)) return 1;
      
      // Alphabetical order for the rest
      return aName.localeCompare(bName);
    });
    
    const results = matchedItems.slice(0, limit);
    
    res.json({
      query: q,
      items: results,
      total: results.length
    });
  } catch (error) {
    console.error('Search items error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get item by ID
app.get('/items/:id', (req, res) => {
  try {
    const item = db.findById('items', req.params.id);
    
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    res.json(item);
  } catch (error) {
    console.error('Get item error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new item (requires authentication)
app.post('/items', authenticateToken, async (req, res) => {
  try {
   
    const { error, value } = itemSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

   
    const existingItem = db.findOne('items', { 
      name: value.name, 
      brand: value.brand || '' 
    });
    
    if (existingItem) {
      return res.status(409).json({ error: 'Item with same name and brand already exists' });
    }

    // Create item
    const item = db.create('items', value);
    
    res.status(201).json({
      message: 'Item created successfully',
      item
    });
  } catch (error) {
    console.error('Create item error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update item (requires authentication)
app.put('/items/:id', authenticateToken, async (req, res) => {
  try {
   
    const { error, value } = updateItemSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

   
    const existingItem = db.findById('items', req.params.id);
    if (!existingItem) {
      return res.status(404).json({ error: 'Item not found' });
    }
    if ((value.name || value.brand !== undefined) && 
        (value.name !== existingItem.name || value.brand !== existingItem.brand)) {
      
      const conflictItem = db.findOne('items', { 
        name: value.name || existingItem.name, 
        brand: value.brand !== undefined ? value.brand : existingItem.brand 
      });
      
      if (conflictItem && conflictItem.id !== req.params.id) {
        return res.status(409).json({ error: 'Item with same name and brand already exists' });
      }
    }

    // Update item
    const updatedItem = db.update('items', req.params.id, value);
    
    res.json({
      message: 'Item updated successfully',
      item: updatedItem
    });
  } catch (error) {
    console.error('Update item error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Bulk get items by IDs (for other services)
app.post('/items/bulk', (req, res) => {
  try {
    const { ids } = req.body;
    
    if (!Array.isArray(ids)) {
      return res.status(400).json({ error: 'IDs must be an array' });
    }
    
    const items = ids.map(id => db.findById('items', id)).filter(Boolean);
    
    res.json({ items });
  } catch (error) {
    console.error('Bulk get items error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});
const server = app.listen(PORT, () => {
  console.log(`Item Service running on port ${PORT}`);
  
  // Seed initial data
  seedInitialData();
  

  registerService('item-service', 'localhost', PORT, {
    description: 'Item catalog and product management service',
    version: '1.0.0'
  });
  setInterval(() => {
    sendHeartbeat('item-service');
  }, 30000); // Every 30 seconds
});
process.on('SIGINT', () => {
  console.log('Shutting down Item Service...');
  server.close(() => {
    process.exit(0);
  });
});

module.exports = app;