#!/bin/bash

# Script de Deploy para Fly.io
# Uso: ./deploy.sh [test|deploy|logs|status]

set -e

# Cores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

APP_NAME="meus-progressos"

echo -e "${BLUE}╔══════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   FormAval - Deploy Script (Fly.io)     ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════╝${NC}"
echo ""

# Função para verificar se flyctl está instalado
check_flyctl() {
    if ! command -v flyctl &> /dev/null; then
        echo -e "${RED}❌ Erro: flyctl não está instalado${NC}"
        echo ""
        echo "Instale o Fly.io CLI:"
        echo "  macOS:   brew install flyctl"
        echo "  Linux:   curl -L https://fly.io/install.sh | sh"
        echo "  Windows: iwr https://fly.io/install.ps1 -useb | iex"
        exit 1
    fi
    echo -e "${GREEN}✅ Fly.io CLI encontrado${NC}"
}

# Função para testar localmente com Docker
test_local() {
    echo -e "${BLUE}🧪 Testando aplicação localmente...${NC}"

    if ! command -v docker &> /dev/null; then
        echo -e "${YELLOW}⚠️  Docker não encontrado. Usando servidor Python...${NC}"
        echo -e "${BLUE}📡 Iniciando servidor em http://localhost:8080${NC}"
        python3 -m http.server 8080
    else
        echo -e "${BLUE}🐳 Fazendo build da imagem Docker...${NC}"
        docker build -t $APP_NAME .

        echo -e "${GREEN}✅ Build concluído${NC}"
        echo -e "${BLUE}📡 Iniciando servidor em http://localhost:8080${NC}"
        echo -e "${YELLOW}   Pressione Ctrl+C para parar${NC}"
        docker run -p 8080:8080 $APP_NAME
    fi
}

# Função para fazer deploy
deploy() {
    echo -e "${BLUE}🚀 Iniciando deploy...${NC}"

    # Verificar se app existe
    if ! flyctl apps list | grep -q "$APP_NAME"; then
        echo -e "${YELLOW}⚠️  App '$APP_NAME' não existe. Criando...${NC}"
        flyctl apps create $APP_NAME
    fi

    echo -e "${BLUE}📦 Fazendo deploy...${NC}"
    flyctl deploy

    echo ""
    echo -e "${GREEN}✅ Deploy concluído!${NC}"
    echo ""
    echo -e "${BLUE}📱 Sua aplicação está em:${NC}"
    flyctl info | grep "Hostname"
    echo ""
    echo -e "${YELLOW}⚠️  IMPORTANTE: Não esqueça de autorizar o domínio no Firebase Console!${NC}"
    echo -e "${YELLOW}   https://console.firebase.google.com → Authentication → Settings → Authorized domains${NC}"
}

# Função para ver logs
show_logs() {
    echo -e "${BLUE}📋 Mostrando logs (Ctrl+C para sair)...${NC}"
    flyctl logs -f
}

# Função para mostrar status
show_status() {
    echo -e "${BLUE}📊 Status da aplicação:${NC}"
    flyctl status
    echo ""
    echo -e "${BLUE}💻 Máquinas virtuais:${NC}"
    flyctl machine list
    echo ""
    echo -e "${BLUE}🌐 Informações da aplicação:${NC}"
    flyctl info
}

# Função para abrir aplicação
open_app() {
    echo -e "${BLUE}🌐 Abrindo aplicação no navegador...${NC}"
    flyctl open
}

# Menu principal
case "${1:-help}" in
    test|t)
        check_flyctl
        test_local
        ;;
    deploy|d)
        check_flyctl
        deploy
        ;;
    logs|l)
        check_flyctl
        show_logs
        ;;
    status|s)
        check_flyctl
        show_status
        ;;
    open|o)
        check_flyctl
        open_app
        ;;
    help|h|*)
        echo "Uso: ./deploy.sh [comando]"
        echo ""
        echo "Comandos disponíveis:"
        echo "  test   (t) - Testar aplicação localmente"
        echo "  deploy (d) - Fazer deploy no Fly.io"
        echo "  logs   (l) - Ver logs da aplicação"
        echo "  status (s) - Ver status da aplicação"
        echo "  open   (o) - Abrir aplicação no navegador"
        echo "  help   (h) - Mostrar esta mensagem"
        echo ""
        echo "Exemplos:"
        echo "  ./deploy.sh test     # Testar localmente"
        echo "  ./deploy.sh deploy   # Deploy no Fly.io"
        echo "  ./deploy.sh logs     # Ver logs"
        ;;
esac
