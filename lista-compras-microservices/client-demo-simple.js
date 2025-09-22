const axios = require('axios');

const API_BASE_URL = 'http://localhost:3005/api';

// Demo user data
const demoUser = {
  email: 'demo@example.com',
  username: 'demo_user',
  password: 'demo123456',
  firstName: 'Demo',
  lastName: 'User'
};

let authToken = '';

// Helper function for API calls
const apiCall = async (method, endpoint, data = null, headers = {}) => {
  try {
    const config = {
      method,
      url: `${API_BASE_URL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    if (data) config.data = data;
    if (authToken) config.headers.Authorization = `Bearer ${authToken}`;

    console.log(`📡 ${method.toUpperCase()} ${endpoint}`);
    const response = await axios(config);
    console.log(`✅ Success: ${response.status}`);
    return response.data;
  } catch (error) {
    console.log(`❌ Error: ${error.response?.status || 'Network'} - ${error.response?.data?.error || error.message}`);
    throw error;
  }
};

async function runDemo() {
  console.log('🚀 Sistema de Listas de Compras - Demo');
  console.log('=====================================\n');

  try {
    // 1. Register user
    console.log('1️⃣ Registrando usuário...');
    const registerResponse = await apiCall('POST', '/auth/register', demoUser);
    authToken = registerResponse.token;
    console.log(`   Usuário criado: ${registerResponse.user.username}`);
    console.log('');

    // 2. Test authentication
    console.log('2️⃣ Testando autenticação...');
    const userResponse = await apiCall('GET', `/users/${registerResponse.user.id}`);
    console.log(`   Usuário autenticado: ${userResponse.firstName} ${userResponse.lastName}`);
    console.log('');

    // 3. Get categories
    console.log('3️⃣ Buscando categorias...');
    const categories = await apiCall('GET', '/categories');
    console.log(`   Categorias disponíveis: ${categories.categories.join(', ')}`);
    console.log('');

    // 4. Search items
    console.log('4️⃣ Buscando itens...');
    const items = await apiCall('GET', '/items?limit=5');
    console.log(`   Total de itens: ${items.total}`);
    items.items.forEach(item => {
      console.log(`   - ${item.name} (${item.category}) - R$ ${item.averagePrice}`);
    });
    console.log('');

    // 5. Create a shopping list
    console.log('5️⃣ Criando lista de compras...');
    const listData = {
      name: 'Lista da Semana',
      description: 'Compras semanais para casa'
    };
    const list = await apiCall('POST', '/lists', listData);
    console.log(`   Lista criada: ${list.list.name}`);
    console.log('');

    // 6. Add items to list
    console.log('6️⃣ Adicionando itens à lista...');
    const itemsToAdd = items.items.slice(0, 3);
    for (const item of itemsToAdd) {
      const itemData = {
        itemId: item.id,
        quantity: Math.floor(Math.random() * 3) + 1,
        estimatedPrice: item.averagePrice
      };
      await apiCall('POST', `/lists/${list.list.id}/items`, itemData);
      console.log(`   + ${item.name} (${itemData.quantity} ${item.unit})`);
    }
    console.log('');

    // 7. Get updated list
    console.log('7️⃣ Visualizando lista atualizada...');
    const updatedList = await apiCall('GET', `/lists/${list.list.id}`);
    console.log(`   Lista: ${updatedList.name}`);
    console.log(`   Itens: ${updatedList.summary.totalItems}`);
    console.log(`   Total estimado: R$ ${updatedList.summary.estimatedTotal}`);
    console.log('');

    // 8. Mark first item as purchased
    console.log('8️⃣ Marcando item como comprado...');
    const firstItem = updatedList.items[0];
    await apiCall('PUT', `/lists/${list.list.id}/items/${firstItem.itemId}`, {
      purchased: true
    });
    console.log(`   ✓ ${firstItem.itemName} marcado como comprado`);
    console.log('');

    // 9. Search items
    console.log('9️⃣ Buscando produtos...');
    const searchResults = await apiCall('GET', '/search?q=arroz');
    console.log(`   Resultados para "arroz": ${searchResults.items.length} itens`);
    searchResults.items.forEach(item => {
      console.log(`   - ${item.name} - R$ ${item.averagePrice}`);
    });
    console.log('');

    // 10. Get user lists
    console.log('🔟 Listando todas as listas do usuário...');
    const userLists = await apiCall('GET', '/lists');
    console.log(`   Total de listas: ${userLists.total}`);
    userLists.lists.forEach(list => {
      console.log(`   - ${list.name} (${list.status}) - ${list.summary.totalItems} itens`);
    });
    console.log('');

    console.log('🎉 Demo concluído com sucesso!');
    console.log('=============================\n');

  } catch (error) {
    console.log('\n❌ Demo falhou:', error.message);
  }

  // Quick system health check
  try {
    console.log('🏥 Verificação rápida do sistema:');
    const health = await axios.get('http://localhost:3005/health');
    console.log(`   Gateway: ${health.data.gateway.status}`);
    health.data.services.forEach(service => {
      console.log(`   ${service.name}: ${service.status}`);
    });
  } catch (error) {
    console.log('   ❌ Não foi possível verificar o sistema');
  }
}

// Execute demo
runDemo().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error.message);
  process.exit(1);
});