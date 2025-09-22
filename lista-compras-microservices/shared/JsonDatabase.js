const fs = require('fs');
const path = require('path');

class JsonDatabase {
  constructor(filePath) {
    this.filePath = filePath;
    this.data = {};
    this.ensureFileExists();
    this.loadData();
  }

  ensureFileExists() {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(this.filePath)) {
      fs.writeFileSync(this.filePath, JSON.stringify({}));
    }
  }

  loadData() {
    try {
      const rawData = fs.readFileSync(this.filePath, 'utf8');
      this.data = JSON.parse(rawData);
    } catch (error) {
      console.error(`Error loading data from ${this.filePath}:`, error);
      this.data = {};
    }
  }

  saveData() {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2));
    } catch (error) {
      console.error(`Error saving data to ${this.filePath}:`, error);
    }
  }

  // Collection-like operations
  findAll(collection) {
    if (!this.data[collection]) {
      this.data[collection] = [];
    }
    return [...this.data[collection]];
  }

  findById(collection, id) {
    if (!this.data[collection]) {
      return null;
    }
    return this.data[collection].find(item => item.id === id) || null;
  }

  findOne(collection, query) {
    if (!this.data[collection]) {
      return null;
    }
    return this.data[collection].find(item => {
      return Object.keys(query).every(key => item[key] === query[key]);
    }) || null;
  }

  findMany(collection, query = {}) {
    if (!this.data[collection]) {
      return [];
    }
    if (Object.keys(query).length === 0) {
      return [...this.data[collection]];
    }
    return this.data[collection].filter(item => {
      return Object.keys(query).every(key => {
        if (typeof query[key] === 'object' && query[key] !== null) {
          // Support for operators like { $regex: 'pattern', $options: 'i' }
          if (query[key].$regex) {
            const regex = new RegExp(query[key].$regex, query[key].$options || '');
            return regex.test(item[key]);
          }
          // Support for { $in: [values] }
          if (query[key].$in) {
            return query[key].$in.includes(item[key]);
          }
        }
        return item[key] === query[key];
      });
    });
  }

  create(collection, data) {
    if (!this.data[collection]) {
      this.data[collection] = [];
    }
    
    const newItem = {
      ...data,
      id: data.id || this.generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    this.data[collection].push(newItem);
    this.saveData();
    return newItem;
  }

  update(collection, id, updateData) {
    if (!this.data[collection]) {
      return null;
    }
    
    const index = this.data[collection].findIndex(item => item.id === id);
    if (index === -1) {
      return null;
    }
    
    this.data[collection][index] = {
      ...this.data[collection][index],
      ...updateData,
      updatedAt: new Date().toISOString()
    };
    
    this.saveData();
    return this.data[collection][index];
  }

  delete(collection, id) {
    if (!this.data[collection]) {
      return false;
    }
    
    const index = this.data[collection].findIndex(item => item.id === id);
    if (index === -1) {
      return false;
    }
    
    this.data[collection].splice(index, 1);
    this.saveData();
    return true;
  }

  // Utility methods
  generateId() {
    return 'id_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  }

  count(collection) {
    if (!this.data[collection]) {
      return 0;
    }
    return this.data[collection].length;
  }

  // Backup and restore
  backup(backupPath) {
    fs.copyFileSync(this.filePath, backupPath);
  }

  restore(backupPath) {
    if (fs.existsSync(backupPath)) {
      fs.copyFileSync(backupPath, this.filePath);
      this.loadData();
    }
  }
}

module.exports = JsonDatabase;