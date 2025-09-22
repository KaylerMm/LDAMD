# 🧪 GUIA DE TESTES - Sistema de Listas de Compras

Este documento explica como executar testes CRUD completos do sistema de microserviços.

## 📋 Pré-requisitos

- **Node.js** (versão 14 ou superior)
- **npm** (geralmente incluído com Node.js)
- **curl** (para testes HTTP)
- **Python 3** (para formatação JSON - opcional)
- **Sistema Linux/Unix** (bash para scripts)

## 🚀 Execução dos Testes CRUD

### Como Executar (Método Recomendado)

```bash
# 1. Navegar para o diretório do projeto
cd lista-compras-microservices

# 2. Instalar dependências (apenas na primeira vez)
npm run install:all

# 3. Iniciar os microserviços manualmente em terminais separados
# Terminal 1:
cd services/user-service && npm start

# Terminal 2:
cd services/item-service && npm start

# Terminal 3:
cd services/list-service && npm start

# 4. Executar os testes CRUD
./teste-crud-direto.sh
```

### Método Alternativo com nohup (Background)

```bash
# Iniciar todos os serviços em background
cd services/user-service && nohup npm start > /tmp/user.log 2>&1 &
cd services/item-service && nohup npm start > /tmp/item.log 2>&1 &
cd services/list-service && nohup npm start > /tmp/list.log 2>&1 &

# Aguardar inicialização e executar testes
sleep 5 && ./teste-crud-direto.sh
```

## 📊 Testes CRUD Incluídos no Script

O script `teste-crud-direto.sh` executa operações **CRUD completas** em todos os microserviços:

### 👤 **USER SERVICE** - Operações CRUD
- ✅ **CREATE** - Registro de usuário único com timestamp
- ✅ **READ** - Leitura de dados do usuário autenticado
- ✅ **UPDATE** - Atualização de perfil e preferências
- ✅ **AUTH** - Geração e validação de token JWT

### 🛒 **ITEM SERVICE** - Operações CRUD
- ✅ **CREATE** - Criação de novo produto no catálogo
- ✅ **READ** - Listagem de produtos existentes
- ✅ **UPDATE** - Atualização de preço, nome e descrição
- ✅ **SEARCH** - Busca no catálogo de produtos

### � **LIST SERVICE** - Operações CRUD
- ✅ **CREATE** - Criação de nova lista de compras
- ✅ **READ** - Listagem de todas as listas do usuário
- ✅ **UPDATE** - Adição/edição de itens na lista
- ✅ **DELETE** - Remoção completa de listas

### 🎯 **Características dos Testes:**
- **Dados Únicos**: Cada execução usa timestamp para evitar conflitos
- **Testes Isolados**: Cada microserviço é testado diretamente
- **Autenticação**: Todos os endpoints protegidos são validados
- **Feedback Visual**: Resultados formatados em português com emojis

## 🔄 Executando Múltiplas Vezes

O script foi projetado para ser executado **infinitas vezes sem conflitos**:

- **Usuários únicos**: Cada execução gera `cruduser[timestamp]`
- **Emails únicos**: Formato `crud[timestamp]@example.com`
- **Produtos únicos**: `Produto Teste CRUD [timestamp]`
- **Listas únicas**: `Lista CRUD [timestamp]`

### Exemplo de Execução Múltipla:
```bash
# Primeira execução
./teste-crud-direto.sh
# Cria: cruduser1758498802, crud1758498802@example.com

# Segunda execução (alguns segundos depois)
./teste-crud-direto.sh  
# Cria: cruduser1758498856, crud1758498856@example.com

# Resultado: Zero conflitos entre execuções
```

## 📝 Interpretando os Resultados

### ✅ Teste Bem-sucedido (Exemplo: Criação de Usuário)
```
👤 TESTE CRUD - USER SERVICE (DIRETO)
=====================================

📝 CREATE - Criando usuário
----------------------------
✅ Usuário criado:
   ID: id_o9exu4grmmfucs8el
   Username: cruduser1758498802
   Email: crud1758498802@example.com
   Nome: CRUD Teste
✅ Token obtido: eyJhbGciOiJIUzI1NiIsInR5cCI6Ik...
✅ User ID: id_o9exu4grmmfucs8el
```

### ❌ Teste com Problema
```
❌ Falha ao obter token ou ID do usuário
Resposta: {"error":"\"username\" must only contain alpha-numeric characters"}
```

### 🎉 Resumo Final Completo
```
🎉 TESTE CRUD DIRETO FINALIZADO!
================================

📊 RESUMO DOS TESTES CRUD REALIZADOS:

👤 USER SERVICE (DIRETO):
   ✅ CREATE - Registro de usuário
   ✅ READ - Leitura de dados do usuário
   ✅ UPDATE - Atualização de perfil
   ✅ Autenticação JWT

🛒 ITEM SERVICE (DIRETO):
   ✅ CREATE - Criação de novo item
   ✅ READ - Listagem de itens
   ✅ UPDATE - Atualização de item

� LIST SERVICE (DIRETO):
   ✅ CREATE - Criação de lista
   ✅ READ - Listagem de listas
   ✅ CREATE - Adição de itens à lista
   ✅ DELETE - Remoção de lista

🏆 Todos os testes CRUD diretos passaram com sucesso!
```

## 🐛 Solução de Problemas

### Problema: Serviços não iniciaram
```bash
❌ User Service não respondeu após 10 tentativas
```
**Soluções**:
1. Verificar se Node.js está instalado: `node --version`
2. Verificar portas ocupadas: `lsof -i :3001 :3002 :3003`
3. Matar processos conflitantes: `pkill -f "node.*service"`
4. Reinstalar dependências: `npm run install:all`

### Problema: Diretório incorreto
```bash
❌ Execute este script no diretório raiz do projeto
```
**Solução**: Certifique-se de estar em `lista-compras-microservices/`

### Problema: Validação de dados
```bash
❌ Resposta: {"error":"\"username\" must only contain alpha-numeric characters"}
```
**Solução**: O script já foi corrigido para gerar usernames alfanuméricos

### Problema: Python não disponível
Se não tiver Python 3, os JSONs aparecerão sem formatação, mas os testes funcionam normalmente.

**Instalar Python** (Ubuntu/Debian):
```bash
sudo apt update && sudo apt install python3
```

### Problema: Timeout nos testes
Se os serviços demorarem para iniciar, edite o script e aumente o tempo limite:
```bash
# Na linha 16 do teste-crud-direto.sh, mude de:
local max_tentativas=10
# Para:
local max_tentativas=20
```

## 🔍 Testes Manuais (Opcional)

### Testar Health Check dos Serviços
```bash
# Verificar se serviços estão rodando
curl http://localhost:3001/health  # User Service
curl http://localhost:3002/health  # List Service  
curl http://localhost:3003/health  # Item Service
```

### Testar Endpoint Específico Manualmente
```bash
# 1. Registrar usuário manualmente
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"manual@test.com","username":"manual123","password":"senha123456","firstName":"Manual","lastName":"Test","preferences":{"defaultStore":"Loja","currency":"BRL"}}'

# 2. Listar produtos disponíveis
curl http://localhost:3003/items?limit=5

# 3. Testar com token JWT (substitua TOKEN_AQUI pelo token real)
curl -H "Authorization: Bearer TOKEN_AQUI" \
  http://localhost:3002/lists
```

## ⏰ Tempo de Execução

- **Instalação inicial**: ~1-2 minutos (`npm run install:all`)
- **Inicialização dos serviços**: ~5-10 segundos
- **Execução dos testes CRUD**: ~15-30 segundos
- **Total (primeira vez)**: ~2-3 minutos
- **Execuções subsequentes**: ~30-60 segundos

## 📁 Arquivos de Dados Gerados

Durante os testes, serão criados automaticamente:

```
data/
├── users.json           # Usuários de teste criados
├── items.json           # Produtos criados nos testes  
├── lists.json           # Listas de compras de teste
└── service-registry.json # Registry dos serviços (se disponível)
```

**Nota**: Estes arquivos são criados automaticamente e podem ser deletados entre execuções.

## 🏆 Critérios de Sucesso

O sistema estará **100% funcional** quando o script mostrar:

### ✅ **Sucesso Completo:**
```bash
🎉 TESTE CRUD DIRETO FINALIZADO!
🏆 Todos os testes CRUD diretos passaram com sucesso!
```

### 📋 **Operações Validadas:**
- ✅ **User Service**: Registro, autenticação, leitura e atualização de usuários
- ✅ **Item Service**: Criação, listagem e atualização de produtos
- ✅ **List Service**: Criação, gerenciamento e exclusão de listas
- ✅ **Autenticação JWT**: Tokens válidos em todas as operações protegidas

**🎯 Meta**: Todas as operações CRUD funcionando = Sistema pronto para uso!