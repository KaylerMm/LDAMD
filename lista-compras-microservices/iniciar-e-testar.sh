#!/bin/bash

# Script para inicializar todos os serviços e testar o sistema

echo "🚀 INICIANDO SISTEMA DE LISTAS DE COMPRAS"
echo "========================================"

# Função para verificar se uma porta está em uso
verificar_porta() {
    local porta=$1
    if lsof -Pi :$porta -sTCP:LISTEN -t >/dev/null ; then
        echo "⚠️ Porta $porta já está em uso, parando processo..."
        kill -9 $(lsof -Pi :$porta -sTCP:LISTEN -t) 2>/dev/null
        sleep 1
    fi
}

# Limpar processos node existentes se necessário
echo "🧹 Limpando processos anteriores..."
verificar_porta 3001
verificar_porta 3002
verificar_porta 3003
verificar_porta 3005

# Iniciar os serviços em background
echo ""
echo "🏃‍♂️ Iniciando serviços..."

# User Service
echo "👤 Iniciando User Service (porta 3001)..."
cd /home/kayler/Documents/PUC/LDAMD/lista-compras-microservices/services/user-service
npm start > /tmp/user-service.log 2>&1 &
USER_PID=$!

# Item Service  
echo "🛒 Iniciando Item Service (porta 3003)..."
cd /home/kayler/Documents/PUC/LDAMD/lista-compras-microservices/services/item-service
npm start > /tmp/item-service.log 2>&1 &
ITEM_PID=$!

# List Service
echo "📋 Iniciando List Service (porta 3002)..."
cd /home/kayler/Documents/PUC/LDAMD/lista-compras-microservices/services/list-service
npm start > /tmp/list-service.log 2>&1 &
LIST_PID=$!

# Aguardar um pouco para os serviços iniciarem
sleep 3

# API Gateway
echo "🌐 Iniciando API Gateway (porta 3005)..."
cd /home/kayler/Documents/PUC/LDAMD/lista-compras-microservices/api-gateway
npm start > /tmp/api-gateway.log 2>&1 &
GATEWAY_PID=$!

# Aguardar serviços iniciarem
echo ""
echo "⏳ Aguardando serviços ficarem prontos..."
sleep 5

# Verificar se os serviços estão rodando
echo ""
echo "🔍 Verificando status dos serviços..."

check_service() {
    local nome=$1
    local porta=$2
    local tentativas=0
    
    while [ $tentativas -lt 10 ]; do
        if curl -s http://localhost:$porta/health >/dev/null 2>&1; then
            echo "✅ $nome (porta $porta) - OK"
            return 0
        fi
        sleep 1
        tentativas=$((tentativas + 1))
    done
    echo "❌ $nome (porta $porta) - FALHOU"
    return 1
}

check_service "User Service" 3001
check_service "Item Service" 3003
check_service "List Service" 3002
check_service "API Gateway" 3005

echo ""
echo "🎉 Todos os serviços estão rodando!"
echo ""
echo "🔗 URLs dos serviços:"
echo "   - API Gateway: http://localhost:3005"
echo "   - User Service: http://localhost:3001"  
echo "   - Item Service: http://localhost:3003"
echo "   - List Service: http://localhost:3002"
echo ""
echo "📊 Logs dos serviços em:"
echo "   - User Service: /tmp/user-service.log"
echo "   - Item Service: /tmp/item-service.log"
echo "   - List Service: /tmp/list-service.log"
echo "   - API Gateway: /tmp/api-gateway.log"
echo ""

# Aguardar entrada do usuário para executar testes
read -p "Pressione Enter para executar o teste CRUD ou Ctrl+C para sair..."

echo ""
echo "🧪 EXECUTANDO TESTE CRUD COMPLETO"
echo "================================="

# Executar o teste CRUD
cd /home/kayler/Documents/PUC/LDAMD/lista-compras-microservices
./teste-crud-completo.sh

echo ""
echo "✅ Teste concluído!"
echo ""

# Perguntar se quer manter os serviços rodando
read -p "Deseja parar os serviços? (y/N): " parar

if [ "$parar" = "y" ] || [ "$parar" = "Y" ]; then
    echo ""
    echo "🛑 Parando serviços..."
    kill $USER_PID $ITEM_PID $LIST_PID $GATEWAY_PID 2>/dev/null
    echo "✅ Serviços parados"
else
    echo ""
    echo "🚀 Serviços continuam rodando!"
    echo "   Para parar manualmente: kill $USER_PID $ITEM_PID $LIST_PID $GATEWAY_PID"
fi

echo ""
echo "🏁 Script finalizado!"