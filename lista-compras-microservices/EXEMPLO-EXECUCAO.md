# 🎯 EXEMPLO DE EXECUÇÃO - Script de Teste Completo

## Como executar o teste completo:

```bash
cd lista-compras-microservices
./teste-completo.sh
```

## Saída esperada do script:

```
🚀 SISTEMA DE LISTAS DE COMPRAS - TESTE COMPLETO
================================================

📂 Diretório correto identificado

1️⃣ INSTALANDO DEPENDÊNCIAS
==========================
✅ Dependências já instaladas

2️⃣ PREPARANDO AMBIENTE DE TESTE
===============================
👤 Usuário de teste: usuario_teste_1695336281
📧 Email de teste: teste_1695336281@example.com

3️⃣ INICIANDO SERVIÇOS
===================
🔍 Verificando portas ocupadas...
🚀 Iniciando serviços em background...
   - User Service (porta 3001)
   - Item Service (porta 3003)
   - List Service (porta 3002)
   - API Gateway (porta 3005)

⏳ Aguardando inicialização dos serviços...
⏳ Aguardando User Service (porta 3001) ficar disponível...
✅ User Service está rodando!
⏳ Aguardando Item Service (porta 3003) ficar disponível...
✅ Item Service está rodando!
⏳ Aguardando List Service (porta 3002) ficar disponível...
✅ List Service está rodando!
⏳ Aguardando API Gateway (porta 3005) ficar disponível...
✅ API Gateway está rodando!

🎉 Todos os serviços estão rodando!

4️⃣ EXECUTANDO TESTES FUNCIONAIS
===============================

✅ Teste 1: Health Check do Sistema
-----------------------------------
Resposta do health check:
{
    "gateway": {
        "status": "healthy",
        "port": 3005,
        "timestamp": "2025-09-21T23:15:30.127Z"
    },
    "services": [
        {
            "name": "user-service",
            "status": "healthy",
            "url": "http://localhost:3001"
        },
        {
            "name": "item-service", 
            "status": "healthy",
            "url": "http://localhost:3003"
        },
        {
            "name": "list-service",
            "status": "healthy", 
            "url": "http://localhost:3002"
        }
    ]
}

✅ Teste 2: Registro de Usuário
------------------------------
Usuário registrado:
{
    "message": "User registered successfully",
    "user": {
        "id": "id_abc123def456",
        "email": "teste_1695336281@example.com",
        "username": "usuario_teste_1695336281",
        "firstName": "Usuário",
        "lastName": "Teste"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
🔑 Token obtido com sucesso

✅ Teste 3: Teste de Login
------------------------
Login realizado:
Usuário: usuario_teste_1695336281 | Status: Sucesso

✅ Teste 4: Listar Categorias de Produtos
----------------------------------------
Categorias disponíveis:
{
    "categories": [
        "Alimentos",
        "Limpeza", 
        "Higiene",
        "Bebidas",
        "Padaria"
    ]
}

✅ Teste 5: Listar Itens do Catálogo
-----------------------------------
Primeiros 5 itens do catálogo:
Total de itens: 25
- Arroz Branco (Alimentos) - R$ 4.5
- Feijão Preto (Alimentos) - R$ 6.8
- Açúcar Cristal (Alimentos) - R$ 3.2
- Óleo de Soja (Alimentos) - R$ 5.9
- Macarrão Espaguete (Alimentos) - R$ 4.2

✅ Teste 6: Buscar Produtos
--------------------------
Busca por 'arroz':
Resultados encontrados: 1
- Arroz Branco - R$ 4.5

✅ Teste 7: Criar Lista de Compras
---------------------------------
Lista criada:
{
    "message": "List created successfully",
    "list": {
        "id": "id_list123abc",
        "name": "Lista de Teste 1695336281",
        "description": "Lista criada automaticamente para teste do sistema",
        "status": "active",
        "userId": "id_abc123def456",
        "items": [],
        "summary": {
            "totalItems": 0,
            "purchasedItems": 0,
            "estimatedTotal": 0
        }
    }
}
📋 Lista criada com ID: id_list123abc

✅ Teste 8: Adicionar Itens à Lista
----------------------------------
Item 1 adicionado:
- Arroz Branco (1 kg) - R$ 5.99
Item 2 adicionado:
- Feijão Preto (2 kg) - R$ 10.99
Item 3 adicionado:
- Açúcar Cristal (3 kg) - R$ 15.99

✅ Teste 9: Visualizar Lista Completa
------------------------------------
Lista completa:
Nome: Lista de Teste 1695336281
Status: active
Total de itens: 3
Valor estimado: R$ 32.97

Itens na lista:
  ○ Arroz Branco (1 kg) - R$ 5.99
  ○ Feijão Preto (2 kg) - R$ 10.99
  ○ Açúcar Cristal (3 kg) - R$ 15.99

✅ Teste 10: Marcar Item como Comprado
-------------------------------------
Item marcado como comprado:
✓ Arroz Branco - Status: Comprado

✅ Teste 11: Listar Todas as Listas do Usuário
---------------------------------------------
Listas do usuário:
Total de listas: 1
- Lista de Teste 1695336281 (active) - 3 itens

✅ Teste 12: Dashboard do Usuário
--------------------------------
Dashboard do usuário:
Usuário: Usuário Teste
Estatísticas:
  - Listas ativas: 1
  - Listas completas: 0
  - Total de itens: 3
  - Valor estimado total: R$ 32.97

Erros: 0

✅ Teste 13: Busca Global no Sistema
-----------------------------------
Busca global por 'lista':
Query: 'lista'
Itens encontrados: 0
Listas encontradas: 1
  - Lista de Teste 1695336281

✅ Teste 14: Verificar Service Registry
-------------------------------------
Serviços registrados:
Total de serviços: 4
- user-service (http://localhost:3001) - Status: healthy
- item-service (http://localhost:3003) - Status: healthy
- list-service (http://localhost:3002) - Status: healthy
- api-gateway (http://localhost:3005) - Status: healthy

🎉 TODOS OS TESTES CONCLUÍDOS COM SUCESSO!
========================================

📊 RESUMO DOS TESTES REALIZADOS:
✅ Health check do sistema
✅ Registro de usuário único
✅ Autenticação/login
✅ Listagem de categorias
✅ Listagem de itens do catálogo
✅ Busca de produtos
✅ Criação de lista de compras
✅ Adição de itens à lista
✅ Visualização de lista completa
✅ Marcação de item como comprado
✅ Listagem de todas as listas
✅ Dashboard do usuário
✅ Busca global no sistema
✅ Verificação do service registry

🏆 Sistema funcionando perfeitamente!
📝 Usuário de teste criado: usuario_teste_1695336281
📧 Email: teste_1695336281@example.com

⚠️  Pressione Ctrl+C para parar os serviços e finalizar
```

## ⚡ Comandos Rápidos para Teste:

```bash
# Instalar e testar tudo automaticamente
npm test

# Ou executar diretamente
./teste-completo.sh

# Teste apenas o cliente demo
npm run demo

# Verificações rápidas
npm run health
npm run registry
```

## 🔄 Executar Múltiplas Vezes:

O script pode ser executado **quantas vezes quiser** sem conflitos:

```bash
# Primeira execução
./teste-completo.sh
# Cria: usuario_teste_1695336281

# Segunda execução (alguns segundos depois)  
./teste-completo.sh
# Cria: usuario_teste_1695336295

# Terceira execução...
./teste-completo.sh
# Cria: usuario_teste_1695336310
```

Cada execução cria dados únicos baseados no timestamp, evitando conflitos de email/username duplicados.

## 💡 Dicas:

1. **Primeira execução**: Pode demorar 3-5 minutos (instalação de dependências)
2. **Execuções seguintes**: 1-2 minutos apenas
3. **Interrupção**: Use `Ctrl+C` para parar serviços e finalizar
4. **Logs**: Todos os resultados são mostrados em tempo real
5. **Formato JSON**: Usa Python para formatar, mas funciona sem ele também