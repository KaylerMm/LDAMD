const axios = require('axios');

// Use direct service URLs instead of API Gateway for better reliability
const SERVICES = {
  USER: 'http://localhost:3001',
  ITEM: 'http://localhost:3003',
  LIST: 'http://localhost:3002'
};

let token = null;

// Helper function to make API calls
async function apiCall(method, service, endpoint, data = null, headers = {}) {
  const url = SERVICES[service] + endpoint;
  console.log(`📡 ${method} ${service}: ${endpoint}`);
  
  const config = {
    method,
    url,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  };

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (data && (method === 'POST' || method === 'PUT')) {
    config.data = data;
  }

  try {
    const response = await axios(config);
    console.log(`✅ Success: ${response.status}`);
    return response.data;
  } catch (error) {
    console.log(`❌ Error: ${error.response?.status} - ${error.response?.data?.error || error.message}`);
    throw error;
  }
}

// Main demo function
async function runDemo() {
  console.log('🚀 Sistema de Listas de Compras - Demo');
  console.log('=====================================\n');

  try {
    let userId;

    // 1. Try to register user (or login if already exists)
    console.log('1️⃣ Registrando/logando usuário...');
    try {
      const userResponse = await apiCall('POST', 'USER', '/auth/register', {
        username: 'demouser',
        email: 'demo@example.com',
        password: 'senha123',
        firstName: 'Demo',
        lastName: 'User'
      });
      userId = userResponse.user.id;
      console.log(`   ✓ Usuário criado: ${userResponse.user.username}`);
    } catch (error) {
      if (error.response?.status === 409) {
        console.log('   ℹ️ Usuário já existe, fazendo login...');
      } else {
        throw error;
      }
    }
    console.log('');

    // 2. Login
    console.log('2️⃣ Fazendo login...');
    const loginResponse = await apiCall('POST', 'USER', '/auth/login', {
      username: 'demouser',
      password: 'senha123'
    });
    token = loginResponse.token;
    userId = userId || loginResponse.user.id;
    console.log('   ✓ Login realizado com sucesso');
    console.log('');

    // 3. Get user profile
    console.log('3️⃣ Obtendo perfil do usuário...');
    const profileResponse = await apiCall('GET', 'USER', `/users/${userId}`);
    console.log(`   ✓ Perfil: ${profileResponse.username} - ${profileResponse.email}`);
    console.log('');

    // 4. Get categories
    console.log('4️⃣ Buscando categorias...');
    const categories = await apiCall('GET', 'ITEM', '/categories');
    console.log(`   Categorias disponíveis: ${categories.categories.join(', ')}`);
    console.log('');

    // 5. Search items
    console.log('5️⃣ Buscando produtos...');
    const items = await apiCall('GET', 'ITEM', '/items');
    console.log(`   Produtos encontrados: ${items.items.length}`);
    items.items.slice(0, 3).forEach(item => {
      console.log(`   - ${item.name} (${item.category}) - R$ ${item.averagePrice}`);
    });
    console.log('');

    // 6. Create shopping list
    console.log('6️⃣ Criando lista de compras...');
    const list = await apiCall('POST', 'LIST', '/lists', {
      name: 'Lista Demo',
      description: 'Lista de demonstração do sistema'
    });
    console.log(`   ✓ Lista criada: ${list.list.name}`);
    console.log('');

    // 7. Add items to list
    console.log('7️⃣ Adicionando itens à lista...');
    const firstItem = items.items[0];
    const addItemResponse = await apiCall('POST', 'LIST', `/lists/${list.list.id}/items`, {
      itemId: firstItem.id,
      quantity: 2
    });
    console.log(`   ✓ Adicionado: ${firstItem.name} (qty: 2)`);
    console.log('');

    // 8. Get updated list
    console.log('8️⃣ Visualizando lista atualizada...');
    const updatedList = await apiCall('GET', 'LIST', `/lists/${list.list.id}`);
    console.log(`   Lista: ${updatedList.name} (${updatedList.status})`);
    console.log(`   Itens: ${updatedList.items.length}`);
    updatedList.items.forEach(item => {
      console.log(`   - ${item.itemName} (qty: ${item.quantity}) - Status: ${item.purchased ? 'Comprado' : 'Pendente'}`);
    });
    console.log('');

    // 9. Mark item as purchased
    console.log('9️⃣ Marcando item como comprado...');
    const firstListItem = updatedList.items[0];
    await apiCall('PUT', 'LIST', `/lists/${list.list.id}/items/${firstListItem.itemId}`, {
      purchased: true
    });
    console.log(`   ✓ ${firstListItem.itemName} marcado como comprado`);
    console.log('');

    // 10. Search products
    console.log('🔟 Buscando produtos específicos...');
    const searchResults = await apiCall('GET', 'ITEM', '/search?q=produto');
    console.log(`   Resultados para "produto": ${searchResults.items.length} itens`);
    searchResults.items.slice(0, 3).forEach(item => {
      console.log(`   - ${item.name} - R$ ${item.averagePrice}`);
    });
    console.log('');

    console.log('🎉 Demo concluído com sucesso!');
    console.log('=============================\n');

  } catch (error) {
    console.log('\n❌ Demo falhou:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('   Verifique se todos os microsserviços estão rodando:');
      console.log('   - User Service: http://localhost:3001');
      console.log('   - Item Service: http://localhost:3003'); 
      console.log('   - List Service: http://localhost:3002');
    } else {
      console.log('   Detalhes:', error.response?.data || error.message);
    }
  }

  // Health check
  console.log('\n🏥 Verificação dos serviços:');
  const healthChecks = [
    { name: 'User Service', url: 'http://localhost:3001/health' },
    { name: 'Item Service', url: 'http://localhost:3003/health' },
    { name: 'List Service', url: 'http://localhost:3002/health' }
  ];

  for (const service of healthChecks) {
    try {
      const response = await axios.get(service.url, { timeout: 2000 });
      console.log(`   ✅ ${service.name}: ${response.data.status || 'OK'}`);
    } catch (error) {
      console.log(`   ❌ ${service.name}: Indisponível`);
    }
  }
}

// Execute demo
runDemo().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error.message);
  process.exit(1);
});