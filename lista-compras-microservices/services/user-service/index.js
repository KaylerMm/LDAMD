const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const helmet = require('helmet');
const Joi = require('joi');
const path = require('path');

const JsonDatabase = require('../../shared/JsonDatabase');
const { registerService, sendHeartbeat } = require('../../shared/serviceRegistry');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

const db = new JsonDatabase(path.join(__dirname, '../../data/users.json'));

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  username: Joi.string().alphanum().min(3).max(30).required(),
  password: Joi.string().min(6).required(),
  firstName: Joi.string().min(1).max(50).required(),
  lastName: Joi.string().min(1).max(50).required(),
  preferences: Joi.object({
    defaultStore: Joi.string().optional(),
    currency: Joi.string().default('BRL')
  }).optional()
});

const loginSchema = Joi.object({
  email: Joi.string().email(),
  username: Joi.string().alphanum(),
  password: Joi.string().required()
}).or('email', 'username');

const updateUserSchema = Joi.object({
  email: Joi.string().email(),
  username: Joi.string().alphanum().min(3).max(30),
  firstName: Joi.string().min(1).max(50),
  lastName: Joi.string().min(1).max(50),
  preferences: Joi.object({
    defaultStore: Joi.string(),
    currency: Joi.string()
  })
});

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};
const generateToken = (user) => {
  const payload = {
    id: user.id,
    email: user.email,
    username: user.username
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
};

const hashPassword = async (password) => {
  return await bcrypt.hash(password, 12);
};

const comparePassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'user-service',
    port: PORT,
    timestamp: new Date().toISOString()
  });
});

app.post('/auth/register', async (req, res) => {
  try {
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { email, username, password, firstName, lastName, preferences } = value;

    const existingUser = db.findOne('users', { email }) || db.findOne('users', { username });
    if (existingUser) {
      return res.status(409).json({ error: 'User with this email or username already exists' });
    }
    const hashedPassword = await hashPassword(password);

   
    const userData = {
      email,
      username,
      password: hashedPassword,
      firstName,
      lastName,
      preferences: {
        defaultStore: preferences?.defaultStore || '',
        currency: preferences?.currency || 'BRL'
      }
    };

    const user = db.create('users', userData);

   
    const { password: _, ...userResponse } = user;
    const token = generateToken(user);

    res.status(201).json({
      message: 'User registered successfully',
      user: userResponse,
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
app.post('/auth/login', async (req, res) => {
  try {
   
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { email, username, password } = value;
    let user;
    if (email) {
      user = db.findOne('users', { email });
    } else if (username) {
      user = db.findOne('users', { username });
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

   
    const { password: _, ...userResponse } = user;
    const token = generateToken(user);

    res.json({
      message: 'Login successful',
      user: userResponse,
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
app.get('/users/:id', authenticateToken, (req, res) => {
  try {
    const userId = req.params.id;
    

    if (req.user.id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const user = db.findById('users', userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

   
    const { password, ...userResponse } = user;
    res.json(userResponse);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
app.put('/users/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.params.id;
    

    if (req.user.id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

   
    const { error, value } = updateUserSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

   
    const existingUser = db.findById('users', userId);
    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (value.email && value.email !== existingUser.email) {
      const emailExists = db.findOne('users', { email: value.email });
      if (emailExists) {
        return res.status(409).json({ error: 'Email already in use' });
      }
    }

    if (value.username && value.username !== existingUser.username) {
      const usernameExists = db.findOne('users', { username: value.username });
      if (usernameExists) {
        return res.status(409).json({ error: 'Username already in use' });
      }
    }
    const updatedUser = db.update('users', userId, value);

   
    const { password, ...userResponse } = updatedUser;

    res.json({
      message: 'User updated successfully',
      user: userResponse
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
app.post('/auth/verify', (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ error: 'Token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    
    res.json({ valid: true, user });
  });
});
app.get('/users', authenticateToken, (req, res) => {
  try {
    const users = db.findAll('users').map(user => {
      const { password, ...userResponse } = user;
      return userResponse;
    });
    
    res.json({ users, total: users.length });
  } catch (error) {
    console.error('Get users error:', error);
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
  console.log(`User Service running on port ${PORT}`);
  

  registerService('user-service', 'localhost', PORT, {
    description: 'User management and authentication service',
    version: '1.0.0'
  });
  setInterval(() => {
    sendHeartbeat('user-service');
  }, 30000);
});
process.on('SIGINT', () => {
  console.log('Shutting down User Service...');
  server.close(() => {
    process.exit(0);
  });
});

module.exports = app;