# Sistema de Listas de Compras - Microserviços

Sistema distribuído para gerenciamento de listas de compras utilizando arquitetura de microsserviços com API Gateway, Service Discovery e bancos NoSQL independentes.

## 🏗️ Arquitetura

### Microsserviços
- **User Service** (porta 3001) - Gerenciamento de usuários e autenticação
- **Item Service** (porta 3003) - Catálogo de itens/produtos  
- **List Service** (porta 3002) - Gerenciamento de listas de compras
- **API Gateway** (porta 3000) - Ponto único de entrada

### Tecnologias Utilizadas
- Node.js + Express
- JWT para autenticação
- Banco NoSQL baseado em arquivos JSON
- Service Registry compartilhado
- Circuit Breaker pattern
- Health checks automáticos

## 🚀 Instalação e Execução

### 🧪 Teste Automático Completo (Recomendado)
```bash
# Executa todos os testes do zero
./teste-completo.sh
```

### 1. Instalação das dependências
```bash
npm run install:all
```

### 2. Execução dos serviços

#### Opção A: Executar cada serviço em terminais separados
```bash
# Terminal 1 - User Service
npm run start:user

# Terminal 2 - Item Service  
npm run start:item

# Terminal 3 - List Service
npm run start:list

# Terminal 4 - API Gateway
npm run start:gateway
```

#### Opção B: Executar individualmente
```bash
# User Service
cd services/user-service && npm start

# Item Service
cd services/item-service && npm start

# List Service
cd services/list-service && npm start

# API Gateway
cd api-gateway && npm start
```

### 3. Executar demonstração
```bash
npm run demo
```

### 4. Verificação do sistema
```bash
# Health check
npm run health

# Service registry
npm run registry

# Teste completo automático
./teste-completo.sh
```

## 📡 Endpoints da API

### Autenticação
- `POST /api/auth/register` - Registro de usuário
- `POST /api/auth/login` - Login

### Usuários
- `GET /api/users/:id` - Buscar usuário
- `PUT /api/users/:id` - Atualizar usuário

### Itens
- `GET /api/items` - Listar itens (com filtros)
- `GET /api/items/:id` - Buscar item específico
- `POST /api/items` - Criar item (autenticado)
- `PUT /api/items/:id` - Atualizar item (autenticado)
- `GET /api/categories` - Listar categorias
- `GET /api/search?q=termo` - Buscar itens

### Listas
- `POST /api/lists` - Criar lista
- `GET /api/lists` - Listar listas do usuário
- `GET /api/lists/:id` - Buscar lista específica
- `PUT /api/lists/:id` - Atualizar lista
- `DELETE /api/lists/:id` - Deletar lista
- `POST /api/lists/:id/items` - Adicionar item à lista
- `PUT /api/lists/:id/items/:itemId` - Atualizar item na lista
- `DELETE /api/lists/:id/items/:itemId` - Remover item da lista
- `GET /api/lists/:id/summary` - Resumo da lista

### Endpoints Agregados
- `GET /api/dashboard` - Dashboard com estatísticas do usuário
- `GET /api/global-search?q=termo` - Busca global (listas + itens)

### Sistema
- `GET /health` - Status de todos os serviços
- `GET /registry` - Lista de serviços registrados

## 📊 Recursos Implementados

### ✅ Microsserviços Funcionais
- [x] User Service com autenticação JWT
- [x] Item Service com catálogo de 25+ itens
- [x] List Service com CRUD completo
- [x] API Gateway com roteamento inteligente

### ✅ Service Discovery
- [x] Registro automático de serviços
- [x] Descoberta por nome de serviço
- [x] Health checks periódicos
- [x] Cleanup automático na saída

### ✅ Recursos Avançados
- [x] Circuit Breaker (3 falhas = abrir circuito)
- [x] Health checks a cada 30 segundos
- [x] Logs de requisições
- [x] Rate limiting
- [x] Middleware de segurança (Helmet)

### ✅ Funcionalidades de Negócio
- [x] Registro e autenticação de usuários
- [x] Catálogo de produtos com categorias
- [x] Criação e gerenciamento de listas
- [x] Adição/remoção de itens nas listas
- [x] Marcação de itens como comprados
- [x] Cálculo automático de totais
- [x] Dashboard agregado
- [x] Busca global

## 🗂️ Estrutura do Projeto

```
lista-compras-microservices/
├── package.json
├── client-demo.js
├── README.md
├── shared/
│   ├── JsonDatabase.js
│   └── serviceRegistry.js
├── services/
│   ├── user-service/
│   │   ├── package.json
│   │   └── index.js
│   ├── item-service/
│   │   ├── package.json
│   │   └── index.js
│   └── list-service/
│       ├── package.json
│       └── index.js
├── api-gateway/
│   ├── package.json
│   └── index.js
└── data/
    ├── users.json
    ├── items.json
    ├── lists.json
    └── service-registry.json
```

## 🧪 Demonstração

O arquivo `client-demo.js` demonstra todo o fluxo do sistema:

1. **Registro de usuário** - Cria uma conta demo
2. **Login** - Autentica o usuário
3. **Busca de itens** - Explora o catálogo
4. **Categorias** - Lista categorias disponíveis
5. **Criação de lista** - Cria uma nova lista de compras
6. **Adição de itens** - Adiciona produtos à lista
7. **Marcação de compras** - Marca itens como comprados
8. **Resumo da lista** - Visualiza estatísticas
9. **Dashboard** - Mostra dashboard agregado
10. **Busca global** - Busca em todos os serviços
11. **Health check** - Verifica status dos serviços
12. **Service registry** - Lista serviços registrados

## 🔧 Configuração

### Variáveis de Ambiente
```bash
# User Service
PORT=3001
JWT_SECRET=your-secret-key-change-in-production

# Item Service  
PORT=3003

# List Service
PORT=3002

# API Gateway
PORT=3000
```

### Banco de Dados
O sistema utiliza arquivos JSON como banco de dados:
- `data/users.json` - Usuários
- `data/items.json` - Itens do catálogo  
- `data/lists.json` - Listas de compras
- `data/service-registry.json` - Registry de serviços

## 🛠️ Desenvolvimento

### Executar em modo desenvolvimento
```bash
# Instalar nodemon globalmente (opcional)
npm install -g nodemon

# Executar serviços em modo dev
cd services/user-service && npm run dev
cd services/item-service && npm run dev  
cd services/list-service && npm run dev
cd api-gateway && npm run dev
```

### Logs
Cada serviço gera logs detalhados:
- Requests HTTP
- Erros de comunicação
- Health checks
- Circuit breaker events
- Service registry events

## 🔒 Segurança

### Implementado
- Hash de senhas com bcrypt (12 rounds)
- JWT tokens com expiração (24h)
- Rate limiting (100 req/15min por IP)
- Middleware de segurança (Helmet)
- Validação de entrada com Joi
- CORS configurado

### Headers de Segurança
- Content Security Policy
- X-Frame-Options
- X-Content-Type-Options
- Strict-Transport-Security

## 🚨 Tratamento de Erros

### Circuit Breaker
- Monitora falhas de comunicação
- Abre circuito após 3 falhas consecutivas
- Reset automático após 60 segundos
- Fallback graceful para indisponibilidade

### Health Checks
- Verificação automática a cada 30s
- Remoção de serviços inativos (60s timeout)
- Status individual por serviço
- Limpeza automática na saída

## 🧪 Testes

### Teste Automático Completo ⭐
Execute **do zero ao funcionamento completo** em um comando:
```bash
./teste-completo.sh
```

**O que este script faz:**
- 🔧 Instala dependências automaticamente
- 🚀 Inicia todos os 4 microserviços
- ✅ Executa 14 testes funcionais completos
- 👤 Cria usuários únicos (sem conflitos entre execuções)
- 📊 Mostra resultados detalhados em português
- 🛑 Para serviços automaticamente no final

### Testes Manuais
Execute o cliente demo para testar fluxos específicos:
```bash
node client-demo-simple.js
```

### Verificações Rápidas
```bash
# Status geral
curl http://localhost:3005/health

# Serviços registrados  
curl http://localhost:3005/registry

# Circuit breakers
curl http://localhost:3005/api/circuit-breakers
```

### 📖 Guia Completo de Testes
Consulte o **[TESTE-README.md](TESTE-README.md)** para instruções detalhadas de teste.

## 🔍 Troubleshooting

### Problemas Comuns

1. **Erro de "Service unavailable"**
   - Verificar se todos os serviços estão rodando
   - Checar o service registry: `npm run registry`

2. **Circuit breaker aberto**
   - Aguardar 60s para reset automático
   - Verificar logs dos serviços

3. **Erro de autenticação**
   - Verificar se o token JWT é válido
   - Relogar se necessário

4. **Porta já em uso**
   - Alterar porta nos arquivos de configuração
   - Verificar processos em execução: `lsof -i :3000`

### Logs Úteis
```bash
# Ver todos os processos Node
ps aux | grep node

# Verificar portas ocupadas
netstat -tulpn | grep :300

# Matar processo específico
kill -9 PID
```

## 📈 Monitoramento

### Métricas Disponíveis
- Status de saúde de cada serviço
- Estado dos circuit breakers
- Estatísticas de uso por usuário
- Tempo de resposta das requisições
- Logs de acesso e erros

### Endpoints de Monitoramento
- `GET /health` - Status completo do sistema
- `GET /registry` - Serviços registrados
- `GET /api/circuit-breakers` - Estado dos circuit breakers

## 🤝 Contribuição

1. Fork do projeto
2. Criar branch para feature (`git checkout -b feature/AmazingFeature`)
3. Commit das mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para branch (`git push origin feature/AmazingFeature`)
5. Abrir Pull Request

## 📝 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para detalhes.

## 👨‍💻 Autor

Desenvolvido como projeto acadêmico para a disciplina de Lista de Compras - Microserviços.