const axios = require('axios');

// Configuration
const API_BASE_URL = 'http://localhost:3005/api';
let authToken = null;
let currentUser = null;

// Helper function to make authenticated requests
const makeRequest = async (method, url, data = null) => {
  try {
    const config = {
      method,
      url: `${API_BASE_URL}${url}`,
      headers: authToken ? { 'Authorization': `Bearer ${authToken}` } : {}
    };

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error(`❌ Request failed: ${method.toUpperCase()} ${url}`);
    console.error(`   Error: ${error.response?.data?.error || error.message}`);
    throw error;
  }
};

// Helper function to log results
const logResult = (title, data) => {
  console.log(`\n📋 ${title}`);
  console.log('=' .repeat(50));
  console.log(JSON.stringify(data, null, 2));
  console.log('=' .repeat(50));
};

// Demo functions
const registerUser = async () => {
  console.log('\n🔐 1. Registering new user...');
  
  const userData = {
    email: 'demo@example.com',
    username: 'demouser',
    password: 'demo123456',
    firstName: 'Demo',
    lastName: 'User',
    preferences: {
      defaultStore: 'Supermercado Central',
      currency: 'BRL'
    }
  };

  try {
    const result = await makeRequest('POST', '/auth/register', userData);
    authToken = result.token;
    currentUser = result.user;
    
    console.log('✅ User registered successfully!');
    console.log(`   User ID: ${currentUser.id}`);
    console.log(`   Username: ${currentUser.username}`);
    console.log(`   Email: ${currentUser.email}`);
    
    return result;
  } catch (error) {
    if (error.response?.status === 409) {
      console.log('ℹ️  User already exists, attempting login...');
      return await loginUser();
    }
    throw error;
  }
};

const loginUser = async () => {
  console.log('\n🔑 2. Logging in user...');
  
  const loginData = {
    email: 'demo@example.com',
    password: 'demo123456'
  };

  const result = await makeRequest('POST', '/auth/login', loginData);
  authToken = result.token;
  currentUser = result.user;
  
  console.log('✅ Login successful!');
  console.log(`   Welcome back, ${currentUser.firstName}!`);
  
  return result;
};

const searchItems = async () => {
  console.log('\n🔍 3. Searching for items...');
  
  // Search for "arroz"
  const searchResult = await makeRequest('GET', '/search?q=arroz');
  
  console.log('✅ Search results:');
  searchResult.items.forEach(item => {
    console.log(`   - ${item.name} (${item.brand}) - R$ ${item.averagePrice}`);
  });
  
  return searchResult;
};

const getItemCategories = async () => {
  console.log('\n📦 4. Getting item categories...');
  
  const categories = await makeRequest('GET', '/categories');
  
  console.log('✅ Available categories:');
  categories.categories.forEach(category => {
    console.log(`   - ${category}`);
  });
  
  return categories;
};

const createShoppingList = async () => {
  console.log('\n📝 5. Creating shopping list...');
  
  const listData = {
    name: 'Lista do Supermercado',
    description: 'Lista de compras para esta semana',
    status: 'active'
  };

  const result = await makeRequest('POST', '/lists', listData);
  
  console.log('✅ Shopping list created!');
  console.log(`   List ID: ${result.list.id}`);
  console.log(`   List Name: ${result.list.name}`);
  
  return result.list;
};

const addItemsToList = async (listId) => {
  console.log('\n➕ 6. Adding items to shopping list...');
  
  // First, get some items to add
  const itemsResult = await makeRequest('GET', '/items?limit=10');
  const availableItems = itemsResult.items;
  
  if (availableItems.length === 0) {
    console.log('❌ No items available to add');
    return;
  }

  // Add first 5 items to the list
  const itemsToAdd = [
    {
      itemId: availableItems[0].id,
      quantity: 2,
      notes: 'Preferir marca conhecida'
    },
    {
      itemId: availableItems[1].id,
      quantity: 1,
      notes: 'Verificar validade'
    },
    {
      itemId: availableItems[2].id,
      quantity: 3
    }
  ];

  console.log('✅ Adding items:');
  for (const itemData of itemsToAdd) {
    try {
      const result = await makeRequest('POST', `/lists/${listId}/items`, itemData);
      const addedItem = result.addedItem;
      console.log(`   - ${addedItem.itemName}: ${addedItem.quantity} ${addedItem.unit}`);
    } catch (error) {
      console.log(`   - Failed to add item: ${error.response?.data?.error}`);
    }
  }
};

const markItemAsPurchased = async (listId) => {
  console.log('\n✅ 7. Marking an item as purchased...');
  
  // Get the list to see its items
  const list = await makeRequest('GET', `/lists/${listId}`);
  
  if (list.items.length === 0) {
    console.log('❌ No items in the list to mark as purchased');
    return;
  }

  // Mark the first item as purchased
  const firstItem = list.items[0];
  const updateData = {
    purchased: true,
    notes: firstItem.notes + ' - Comprado!'
  };

  await makeRequest('PUT', `/lists/${listId}/items/${firstItem.itemId}`, updateData);
  
  console.log('✅ Item marked as purchased:');
  console.log(`   - ${firstItem.itemName}`);
};

const getListSummary = async (listId) => {
  console.log('\n📊 8. Getting list summary...');
  
  const summary = await makeRequest('GET', `/lists/${listId}/summary`);
  
  logResult('List Summary', summary);
  
  return summary;
};

const getDashboard = async () => {
  console.log('\n📈 9. Getting user dashboard...');
  
  const dashboard = await makeRequest('GET', '/dashboard');
  
  logResult('User Dashboard', dashboard);
  
  return dashboard;
};

const performGlobalSearch = async () => {
  console.log('\n🌐 10. Performing global search...');
  
  const searchResults = await makeRequest('GET', '/global-search?q=lista');
  
  console.log('✅ Global search results:');
  console.log(`   - Found ${searchResults.items.length} items`);
  console.log(`   - Found ${searchResults.lists.length} lists`);
  
  if (searchResults.errors.length > 0) {
    console.log('⚠️  Search errors:');
    searchResults.errors.forEach(error => {
      console.log(`   - ${error.service}: ${error.error}`);
    });
  }
  
  return searchResults;
};

const checkHealth = async () => {
  console.log('\n🏥 11. Checking system health...');
  
  try {
    const health = await axios.get('http://localhost:3005/health');
    
    console.log('✅ System Health Check:');
    console.log(`   Gateway: ${health.data.gateway.status}`);
    
    health.data.services.forEach(service => {
      console.log(`   ${service.name}: ${service.status}`);
    });
    
    if (health.data.circuitBreakers.length > 0) {
      console.log('\n🔌 Circuit Breakers:');
      health.data.circuitBreakers.forEach(cb => {
        console.log(`   ${cb.serviceName}: ${cb.state} (failures: ${cb.failureCount})`);
      });
    }
    
    return health.data;
  } catch (error) {
    console.log('❌ Health check failed:', error.message);
    throw error;
  }
};

const checkServiceRegistry = async () => {
  console.log('\n📋 12. Checking service registry...');
  
  try {
    const registry = await axios.get('http://localhost:3005/registry');
    
    console.log('✅ Registered Services:');
    registry.data.services.forEach(service => {
      console.log(`   - ${service.name}: ${service.url} (${service.status})`);
    });
    
    return registry.data;
  } catch (error) {
    console.log('❌ Registry check failed:', error.message);
    throw error;
  }
};

// Main demo function
const runDemo = async () => {
  console.log('🚀 Starting Shopping List Microservices Demo');
  console.log('===============================================');
  
  try {
    // Step 1: Register or login user
    await registerUser();
    
    // Step 2: Search items
    await searchItems();
    
    // Step 3: Get categories
    await getItemCategories();
    
    // Step 4: Create shopping list
    const shoppingList = await createShoppingList();
    
    // Step 5: Add items to list
    await addItemsToList(shoppingList.id);
    
    // Step 6: Mark item as purchased
    await markItemAsPurchased(shoppingList.id);
    
    // Step 7: Get list summary
    await getListSummary(shoppingList.id);
    
    // Step 8: Get dashboard
    await getDashboard();
    
    // Step 9: Global search
    await performGlobalSearch();
    
    // Step 10: Health check
    await checkHealth();
    
    // Step 11: Service registry
    await checkServiceRegistry();
    
    console.log('\n🎉 Demo completed successfully!');
    console.log('===============================================');
    
  } catch (error) {
    console.error('\n💥 Demo failed:', error.message);
    console.log('===============================================');
    
    // Still try to show health status
    try {
      console.log('\n🔍 Attempting to diagnose issues...');
      await checkHealth();
    } catch (healthError) {
      console.log('❌ Cannot reach API Gateway. Make sure all services are running.');
    }
    
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run the demo
if (require.main === module) {
  runDemo();
}

module.exports = {
  runDemo,
  registerUser,
  loginUser,
  searchItems,
  createShoppingList,
  addItemsToList,
  getDashboard,
  checkHealth
};