#!/bin/bash

echo "🚀 Starting Shopping List Microservices"
echo "======================================="

# Function to check if port is in use
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null ; then
        echo "⚠️  Port $1 is already in use"
        return 1
    else
        return 0
    fi
}

# Function to wait for service to be ready
wait_for_service() {
    local port=$1
    local service_name=$2
    local max_attempts=30
    local attempt=1
    
    echo "⏳ Waiting for $service_name to start on port $port..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s http://localhost:$port/health >/dev/null 2>&1; then
            echo "✅ $service_name is ready!"
            return 0
        fi
        
        echo "   Attempt $attempt/$max_attempts - $service_name not ready yet..."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    echo "❌ $service_name failed to start within expected time"
    return 1
}

# Check if all ports are available
echo "🔍 Checking port availability..."
ports_available=true

for port in 3001 3003 3002 3000; do
    if ! check_port $port; then
        ports_available=false
    fi
done

if [ "$ports_available" = false ]; then
    echo "❌ Some required ports are in use. Please stop other services first."
    echo "💡 You can kill processes using: sudo lsof -ti:PORT | xargs kill -9"
    exit 1
fi

echo "✅ All ports are available"

# Create data directory
mkdir -p data

# Install dependencies if needed
echo "📦 Checking dependencies..."
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm run install:all
fi

# Start services in background
echo "🚀 Starting services..."

# Start User Service
echo "Starting User Service (port 3001)..."
cd services/user-service && npm start &
USER_SERVICE_PID=$!
cd ../..

sleep 3

# Start Item Service  
echo "Starting Item Service (port 3003)..."
cd services/item-service && npm start &
ITEM_SERVICE_PID=$!
cd ../..

sleep 3

# Start List Service
echo "Starting List Service (port 3002)..."
cd services/list-service && npm start &
LIST_SERVICE_PID=$!
cd ../..

sleep 3

# Start API Gateway
echo "Starting API Gateway (port 3000)..."
cd api-gateway && npm start &
GATEWAY_PID=$!
cd ..

# Wait for all services to be ready
wait_for_service 3001 "User Service"
wait_for_service 3003 "Item Service"  
wait_for_service 3002 "List Service"
wait_for_service 3000 "API Gateway"

echo ""
echo "🎉 All services are running!"
echo "=========================="
echo "📋 Service URLs:"
echo "   API Gateway:   http://localhost:3000"
echo "   User Service:  http://localhost:3001"  
echo "   Item Service:  http://localhost:3003"
echo "   List Service:  http://localhost:3002"
echo ""
echo "🔍 Quick Tests:"
echo "   Health Check:  curl http://localhost:3000/health"
echo "   Registry:      curl http://localhost:3000/registry"
echo "   Demo Client:   npm run demo"
echo ""
echo "⚠️  Press Ctrl+C to stop all services"
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping all services..."
    kill $USER_SERVICE_PID $ITEM_SERVICE_PID $LIST_SERVICE_PID $GATEWAY_PID 2>/dev/null
    echo "✅ All services stopped"
    exit 0
}

# Set trap to cleanup on interrupt
trap cleanup SIGINT SIGTERM

# Keep script running and show logs
echo "📋 Service logs (Ctrl+C to stop):"
echo "================================"

# Wait for user interrupt
wait