#!/usr/bin/env python3
"""
Servidor local simples para o Sistema de Avaliação
Uso: python servidor.py
Acesse: http://seu-ip-local:8000
"""

import http.server
import socketserver
import socket
import webbrowser
import os
import sys

PORT = 8000

def get_local_ip():
    """Obtém o IP local da máquina"""
    try:
        # Conecta a um endereço externo para descobrir o IP local
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(("8.8.8.8", 80))
            ip = s.getsockname()[0]
        return ip
    except:
        return "localhost"

def main():
    # Muda para o diretório do script
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    # Verifica se os arquivos necessários existem
    required_files = ['index.html', 'styles.css', 'script.js']
    missing_files = [f for f in required_files if not os.path.exists(f)]
    
    if missing_files:
        print(f"❌ Arquivos não encontrados: {', '.join(missing_files)}")
        print("Certifique-se de que todos os arquivos estão na pasta correta.")
        return
    
    local_ip = get_local_ip()
    
    print("🚀 Iniciando Servidor de Avaliação...")
    print("=" * 50)
    print(f"📁 Pasta: {os.getcwd()}")
    print(f"🌐 Porta: {PORT}")
    print("=" * 50)
    print("📱 LINKS DE ACESSO:")
    print(f"   Local:     http://localhost:{PORT}")
    print(f"   Na rede:   http://{local_ip}:{PORT}")
    print("=" * 50)
    print("💡 INSTRUÇÕES:")
    print("   • Para acesso local: use o link 'Local'")
    print("   • Para compartilhar na rede: use o link 'Na rede'")
    print("   • Envie o link 'Na rede' para os pais acessarem")
    print("   • Pressione Ctrl+C para parar o servidor")
    print("=" * 50)
    
    # Configura o servidor
    Handler = http.server.SimpleHTTPRequestHandler
    
    # Adiciona headers para permitir CORS se necessário
    class CORSRequestHandler(Handler):
        def end_headers(self):
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type')
            super().end_headers()
    
    try:
        with socketserver.TCPServer(("", PORT), CORSRequestHandler) as httpd:
            print(f"✅ Servidor rodando em http://{local_ip}:{PORT}")
            print("\n🌍 Abrir no navegador? (s/n): ", end="")
            
            # Pergunta se quer abrir o navegador
            try:
                response = input().lower()
                if response in ['s', 'sim', 'y', 'yes', '']:
                    webbrowser.open(f'http://localhost:{PORT}')
                    print("🌐 Navegador aberto!")
            except:
                pass
            
            print("\n⏳ Aguardando conexões...")
            print("   (Use Ctrl+C para parar o servidor)\n")
            
            httpd.serve_forever()
            
    except KeyboardInterrupt:
        print("\n\n🛑 Servidor interrompido pelo usuário")
        print("✅ Obrigado por usar o Sistema de Avaliação!")
        
    except OSError as e:
        if e.errno == 48:  # Address already in use
            print(f"\n❌ Erro: Porta {PORT} já está em uso")
            print(f"💡 Tente usar outra porta ou feche o programa que está usando a porta {PORT}")
        else:
            print(f"\n❌ Erro ao iniciar servidor: {e}")

if __name__ == "__main__":
    main()