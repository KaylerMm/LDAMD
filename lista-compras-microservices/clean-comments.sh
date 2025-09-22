#!/bin/bash

# Script para remover comentários excessivos mantendo apenas os essenciais

echo "🧹 Removendo comentários excessivos dos microserviços..."

# Função para limpar comentários desnecessários
clean_comments() {
    local file=$1
    echo "Limpando: $file"
    
    # Remove comentários de seções óbvias
    sed -i 's|^// Middleware$||g' "$file"
    sed -i 's|^// Routes$||g' "$file" 
    sed -i 's|^// Health check$||g' "$file"
    sed -i 's|^// Database setup$||g' "$file"
    sed -i 's|^// Shared modules$||g' "$file"
    sed -i 's|^// Register user$||g' "$file"
    sed -i 's|^// Login user$||g' "$file"
    sed -i 's|^// Create item$||g' "$file"
    sed -i 's|^// Update item$||g' "$file"
    sed -i 's|^// Delete item$||g' "$file"
    sed -i 's|^// Create list$||g' "$file"
    sed -i 's|^// Update list$||g' "$file"
    sed -i 's|^// Delete list$||g' "$file"
    
    # Remove comentários inline obvios
    sed -i 's| // Parse JSON bodies||g' "$file"
    sed -i 's| // Enable CORS||g' "$file"
    sed -i 's| // Security headers||g' "$file"
    sed -i 's| // Validate request||g' "$file"
    sed -i 's| // Hash password||g' "$file"
    sed -i 's| // Create user||g' "$file"
    sed -i 's| // Remove password from response||g' "$file"
    sed -i 's| // Check if.*exists||g' "$file"
    sed -i 's| // Verify.*with.*service||g' "$file"
    
    # Remove linhas vazias duplas
    sed -i '/^$/N;/^\n$/d' "$file"
    
    echo "✅ $file limpo"
}

# Limpar todos os microserviços
clean_comments "services/user-service/index.js"
clean_comments "services/item-service/index.js"
clean_comments "services/list-service/index.js"
clean_comments "api-gateway/index.js"

echo ""
echo "🎉 Limpeza de comentários concluída!"
echo "📋 Comentários mantidos: apenas os essenciais para compreensão"