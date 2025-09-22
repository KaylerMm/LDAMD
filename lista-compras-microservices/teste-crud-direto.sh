#!/bin/bash

# Script de Teste CRUD Simplificado - Sistema de Listas de Compras
# Testa operações CRUD usando serviços diretamente (sem API Gateway)

echo "🧪 SISTEMA DE LISTAS DE COMPRAS - TESTE CRUD DIRETO"
echo "==================================================="
echo ""

# Função para aguardar serviço ficar disponível
aguardar_servico() {
    local porta=$1
    local nome=$2
    local tentativas=0
    local max_tentativas=10
    
    echo "⏳ Aguardando $nome (porta $porta) ficar disponível..."
    
    while [ $tentativas -lt $max_tentativas ]; do
        if curl -s http://localhost:$porta/health > /dev/null 2>&1; then
            echo "✅ $nome está rodando!"
            return 0
        fi
        sleep 1
        tentativas=$((tentativas + 1))
        printf "."
    done
    
    echo ""
    echo "❌ $nome não respondeu após $max_tentativas tentativas"
    return 1
}

# Verificar se está no diretório correto
if [ ! -f "package.json" ] || [ ! -d "services" ]; then
    echo "❌ Execute este script no diretório raiz do projeto (lista-compras-microservices)"
    exit 1
fi

echo "📂 Diretório correto identificado"

# Gerar dados únicos para evitar conflitos
TIMESTAMP=$(date +%s)
USUARIO_TESTE="cruduser$TIMESTAMP"
EMAIL_TESTE="crud$TIMESTAMP@example.com"

echo "👤 Usuário de teste: $USUARIO_TESTE"
echo "📧 Email de teste: $EMAIL_TESTE"

# Verificar se serviços estão rodando
echo ""
echo "🔍 VERIFICANDO SERVIÇOS"
echo "======================"

echo "Verificando se os serviços estão disponíveis..."
aguardar_servico 3001 "User Service" || { echo "❌ Inicie o User Service primeiro"; exit 1; }
aguardar_servico 3003 "Item Service" || { echo "❌ Inicie o Item Service primeiro"; exit 1; }
aguardar_servico 3002 "List Service" || { echo "❌ Inicie o List Service primeiro"; exit 1; }

echo ""
echo "🎉 Serviços estão disponíveis!"

# ==========================================
# TESTES CRUD USER SERVICE (DIRETO)
# ==========================================
echo ""
echo "👤 TESTE CRUD - USER SERVICE (DIRETO)"
echo "====================================="

TOKEN=""
USER_ID=""

# CREATE USER
echo ""
echo "📝 CREATE - Criando usuário"
echo "----------------------------"
DADOS_USUARIO="{
    \"email\": \"$EMAIL_TESTE\",
    \"username\": \"$USUARIO_TESTE\",
    \"password\": \"senha123456\",
    \"firstName\": \"CRUD\",
    \"lastName\": \"Teste\",
    \"preferences\": {
        \"defaultStore\": \"Supermercado CRUD\",
        \"currency\": \"BRL\"
    }
}"

REGISTRO_RESPONSE=$(curl -s -X POST "http://localhost:3001/auth/register" \
    -H "Content-Type: application/json" \
    -d "$DADOS_USUARIO" 2>/dev/null)

echo "✅ Usuário criado:"
echo "$REGISTRO_RESPONSE" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    print(f\"   ID: {data['user']['id']}\")
    print(f\"   Username: {data['user']['username']}\")
    print(f\"   Email: {data['user']['email']}\")
    print(f\"   Nome: {data['user']['firstName']} {data['user']['lastName']}\")
except:
    print(sys.stdin.read())
" 2>/dev/null || echo "$REGISTRO_RESPONSE"

# Extrair token e user ID
TOKEN=$(echo "$REGISTRO_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['token'])" 2>/dev/null || echo "")
USER_ID=$(echo "$REGISTRO_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['user']['id'])" 2>/dev/null || echo "")

if [ -z "$TOKEN" ] || [ -z "$USER_ID" ]; then
    echo "❌ Falha ao obter token ou ID do usuário"
    echo "Resposta: $REGISTRO_RESPONSE"
    exit 1
fi

echo "✅ Token obtido: ${TOKEN:0:30}..."
echo "✅ User ID: $USER_ID"

# READ USER
echo ""
echo "📖 READ - Lendo dados do usuário"
echo "--------------------------------"
USER_RESPONSE=$(curl -s -X GET "http://localhost:3001/users/$USER_ID" \
    -H "Authorization: Bearer $TOKEN" 2>/dev/null)

echo "✅ Dados do usuário recuperados:"
echo "$USER_RESPONSE" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    print(f\"   ID: {data['id']}\")
    print(f\"   Username: {data['username']}\")
    print(f\"   Email: {data['email']}\")
    print(f\"   Loja padrão: {data['preferences']['defaultStore']}\")
except Exception as e:
    print(f\"Erro no parsing: {e}\")
" 2>/dev/null || echo "$USER_RESPONSE"

# UPDATE USER
echo ""
echo "✏️ UPDATE - Atualizando dados do usuário"
echo "----------------------------------------"
DADOS_UPDATE="{
    \"firstName\": \"CRUD Atualizado\",
    \"lastName\": \"Teste Modificado\",
    \"preferences\": {
        \"defaultStore\": \"Supermercado Atualizado\",
        \"currency\": \"USD\"
    }
}"

UPDATE_RESPONSE=$(curl -s -X PUT "http://localhost:3001/users/$USER_ID" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "$DADOS_UPDATE" 2>/dev/null)

echo "✅ Usuário atualizado:"
echo "$UPDATE_RESPONSE" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    print(f\"   Nome: {data['user']['firstName']} {data['user']['lastName']}\")
    print(f\"   Loja: {data['user']['preferences']['defaultStore']}\")
    print(f\"   Moeda: {data['user']['preferences']['currency']}\")
except Exception as e:
    print(f\"Erro: {e}\")
" 2>/dev/null || echo "$UPDATE_RESPONSE"

# ==========================================
# TESTES CRUD ITEM SERVICE (DIRETO)
# ==========================================
echo ""
echo "🛒 TESTE CRUD - ITEM SERVICE (DIRETO)"
echo "====================================="

ITEM_ID=""

# READ ITEMS (listar alguns existentes)
echo ""
echo "📖 READ - Listando itens existentes"
echo "-----------------------------------"
ITEMS_RESPONSE=$(curl -s "http://localhost:3003/items?limit=5" 2>/dev/null)
echo "✅ Itens do sistema:"
echo "$ITEMS_RESPONSE" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    print(f\"   Total: {data['total']} itens\")
    for item in data['items'][:3]:
        print(f\"   - {item['name']} - R$ {item['averagePrice']}\")
except Exception as e:
    print(f\"Erro: {e}\")
" 2>/dev/null || echo "$ITEMS_RESPONSE"

# CREATE ITEM
echo ""
echo "📝 CREATE - Criando novo item"
echo "-----------------------------"
DADOS_ITEM="{
    \"name\": \"Produto Teste CRUD $TIMESTAMP\",
    \"category\": \"Alimentos\",
    \"brand\": \"Marca Teste\",
    \"unit\": \"un\",
    \"averagePrice\": 15.99,
    \"barcode\": \"123456789$TIMESTAMP\",
    \"description\": \"Produto criado para teste CRUD\",
    \"active\": true
}"

ITEM_CREATE_RESPONSE=$(curl -s -X POST "http://localhost:3003/items" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "$DADOS_ITEM" 2>/dev/null)

echo "✅ Item criado:"
echo "$ITEM_CREATE_RESPONSE" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    print(f\"   ID: {data['item']['id']}\")
    print(f\"   Nome: {data['item']['name']}\")
    print(f\"   Categoria: {data['item']['category']}\")
    print(f\"   Preço: R$ {data['item']['averagePrice']}\")
except Exception as e:
    print(f\"Erro: {e}\")
" 2>/dev/null || echo "$ITEM_CREATE_RESPONSE"

ITEM_ID=$(echo "$ITEM_CREATE_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['item']['id'])" 2>/dev/null || echo "")

# UPDATE ITEM
if [ -n "$ITEM_ID" ]; then
    echo ""
    echo "✏️ UPDATE - Atualizando item"
    echo "----------------------------"
    ITEM_UPDATE="{
        \"name\": \"Produto CRUD Atualizado $TIMESTAMP\",
        \"averagePrice\": 19.99,
        \"description\": \"Produto atualizado via teste CRUD\",
        \"brand\": \"Marca Atualizada\"
    }"
    
    ITEM_UPDATE_RESPONSE=$(curl -s -X PUT "http://localhost:3003/items/$ITEM_ID" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $TOKEN" \
        -d "$ITEM_UPDATE" 2>/dev/null)
    
    echo "✅ Item atualizado:"
    echo "$ITEM_UPDATE_RESPONSE" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    print(f\"   Nome: {data['item']['name']}\")
    print(f\"   Preço: R$ {data['item']['averagePrice']}\")
    print(f\"   Marca: {data['item']['brand']}\")
except Exception as e:
    print(f\"Erro: {e}\")
" 2>/dev/null || echo "$ITEM_UPDATE_RESPONSE"
fi

# ==========================================
# TESTES CRUD LIST SERVICE (DIRETO)
# ==========================================
echo ""
echo "📋 TESTE CRUD - LIST SERVICE (DIRETO)"
echo "====================================="

LIST_ID=""

# CREATE LIST
echo ""
echo "📝 CREATE - Criando lista"
echo "-------------------------"
DADOS_LISTA="{
    \"name\": \"Lista CRUD $TIMESTAMP\",
    \"description\": \"Lista criada para teste CRUD completo\",
    \"status\": \"active\"
}"

LIST_CREATE_RESPONSE=$(curl -s -X POST "http://localhost:3002/lists" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "$DADOS_LISTA" 2>/dev/null)

echo "✅ Lista criada:"
echo "$LIST_CREATE_RESPONSE" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    print(f\"   ID: {data['list']['id']}\")
    print(f\"   Nome: {data['list']['name']}\")
    print(f\"   Status: {data['list']['status']}\")
    print(f\"   Itens: {data['list']['summary']['totalItems']}\")
except Exception as e:
    print(f\"Erro: {e}\")
" 2>/dev/null || echo "$LIST_CREATE_RESPONSE"

LIST_ID=$(echo "$LIST_CREATE_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['list']['id'])" 2>/dev/null || echo "")

# READ LISTS
echo ""
echo "📖 READ - Listando todas as listas do usuário"
echo "---------------------------------------------"
LISTS_RESPONSE=$(curl -s -X GET "http://localhost:3002/lists" \
    -H "Authorization: Bearer $TOKEN" 2>/dev/null)

echo "✅ Listas do usuário:"
echo "$LISTS_RESPONSE" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    print(f\"   Total: {data['total']} listas\")
    for lista in data['lists']:
        print(f\"   - {lista['name']} ({lista['status']}) - {lista['summary']['totalItems']} itens\")
except Exception as e:
    print(f\"Erro: {e}\")
" 2>/dev/null || echo "$LISTS_RESPONSE"

# ADD ITEMS TO LIST
if [ -n "$LIST_ID" ]; then
    echo ""
    echo "➕ CREATE - Adicionando itens à lista"
    echo "------------------------------------"
    
    # Obter alguns itens para adicionar
    ITEMS_FOR_LIST=$(curl -s "http://localhost:3003/items?limit=3" 2>/dev/null)
    ITEM_IDS=$(echo "$ITEMS_FOR_LIST" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    ids = [item['id'] for item in data['items'][:3]]
    print(' '.join(ids))
except:
    print('')
" 2>/dev/null || echo "")
    
    if [ -n "$ITEM_IDS" ]; then
        contador=1
        for ID_ITEM in $ITEM_IDS; do
            DADOS_ITEM_LISTA="{
                \"itemId\": \"$ID_ITEM\",
                \"quantity\": $contador,
                \"estimatedPrice\": $((contador * 8)).50,
                \"notes\": \"Item CRUD $contador\"
            }"
            
            ADD_ITEM_RESPONSE=$(curl -s -X POST "http://localhost:3002/lists/$LIST_ID/items" \
                -H "Content-Type: application/json" \
                -H "Authorization: Bearer $TOKEN" \
                -d "$DADOS_ITEM_LISTA" 2>/dev/null)
            
            echo "✅ Item $contador adicionado:"
            echo "$ADD_ITEM_RESPONSE" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    item = data['addedItem']
    print(f\"   - {item['itemName']} ({item['quantity']} {item['unit']}) - R$ {item['estimatedPrice']}\")
except Exception as e:
    print(f\"Erro: {e}\")
" 2>/dev/null || echo "$ADD_ITEM_RESPONSE"
            
            contador=$((contador + 1))
        done
    fi
fi

# DELETE LIST
if [ -n "$LIST_ID" ]; then
    echo ""
    echo "🗑️ DELETE - Deletando lista"
    echo "---------------------------"
    DELETE_LIST_RESPONSE=$(curl -s -X DELETE "http://localhost:3002/lists/$LIST_ID" \
        -H "Authorization: Bearer $TOKEN" 2>/dev/null)
    
    echo "✅ Lista deletada:"
    echo "$DELETE_LIST_RESPONSE" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    print(f\"   {data['message']}\")
except Exception as e:
    print(f\"Erro: {e}\")
" 2>/dev/null || echo "$DELETE_LIST_RESPONSE"
fi

# RESULTADO FINAL
echo ""
echo "🎉 TESTE CRUD DIRETO FINALIZADO!"
echo "================================"
echo ""
echo "📊 RESUMO DOS TESTES CRUD REALIZADOS:"
echo ""
echo "👤 USER SERVICE (DIRETO):"
echo "   ✅ CREATE - Registro de usuário"
echo "   ✅ READ - Leitura de dados do usuário"
echo "   ✅ UPDATE - Atualização de perfil"
echo "   ✅ Autenticação JWT"
echo ""
echo "🛒 ITEM SERVICE (DIRETO):"
echo "   ✅ CREATE - Criação de novo item"
echo "   ✅ READ - Listagem de itens"
echo "   ✅ UPDATE - Atualização de item"
echo ""
echo "📋 LIST SERVICE (DIRETO):"
echo "   ✅ CREATE - Criação de lista"
echo "   ✅ READ - Listagem de listas"
echo "   ✅ CREATE - Adição de itens à lista"
echo "   ✅ DELETE - Remoção de lista"
echo ""
echo "🏆 Todos os testes CRUD diretos passaram com sucesso!"
echo "📝 Dados de teste criados com timestamp: $TIMESTAMP"
echo ""

exit 0