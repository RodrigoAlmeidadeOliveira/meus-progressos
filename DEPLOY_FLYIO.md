# 🚀 Deploy do FormAval no Fly.io

Este guia contém todas as instruções necessárias para fazer o deploy da aplicação FormAval no Fly.io.

## 📋 Pré-requisitos

1. **Instalar Fly.io CLI**
   ```bash
   # macOS
   brew install flyctl

   # Linux
   curl -L https://fly.io/install.sh | sh

   # Windows (PowerShell)
   iwr https://fly.io/install.ps1 -useb | iex
   ```

2. **Criar conta no Fly.io**
   ```bash
   flyctl auth signup
   # ou fazer login se já tiver conta
   flyctl auth login
   ```

## 🔧 Configuração Inicial

### 1. Criar a aplicação no Fly.io

```bash
# No diretório do projeto
flyctl apps create formaval

# Ou deixar o Fly.io gerar um nome único
flyctl apps create
```

### 2. Configurar região

A aplicação está configurada para usar a região `gru` (São Paulo, Brasil). Você pode alterar no arquivo `fly.toml` se necessário:

```toml
primary_region = "gru"  # São Paulo
# ou
primary_region = "iad"  # Estados Unidos (Leste)
# ou
primary_region = "ams"  # Amsterdã, Europa
```

Lista completa de regiões: `flyctl platform regions`

## 🚢 Deploy

### Deploy Inicial

```bash
# Deploy da aplicação
flyctl deploy

# Verificar status
flyctl status

# Ver logs
flyctl logs
```

### Acessar a aplicação

```bash
# Abrir no navegador
flyctl open

# Ver URL da aplicação
flyctl info
```

A aplicação estará disponível em: `https://formaval.fly.dev` (ou o nome que você escolheu)

## 🔐 Configuração do Firebase (IMPORTANTE)

A aplicação usa Firebase para autenticação e banco de dados. As configurações já estão no código, mas verifique se:

1. **Firebase está configurado corretamente** em `terapeuta.html`, `pais.html` e `index.html`
2. **Regras de segurança do Firestore** estão configuradas (veja `CONFIGURAR_REGRAS_FIRESTORE.md`)
3. **Domínio autorizado no Firebase Console**:
   - Acesse: https://console.firebase.google.com
   - Vá em: Authentication → Settings → Authorized domains
   - Adicione: `formaval.fly.dev` (ou seu domínio customizado)

## 🔄 Atualizações

Para atualizar a aplicação após fazer mudanças:

```bash
# Fazer commit das mudanças (opcional, mas recomendado)
git add .
git commit -m "Descrição das mudanças"

# Deploy da nova versão
flyctl deploy

# Ver logs em tempo real
flyctl logs -f
```

## 📊 Monitoramento

### Ver logs da aplicação
```bash
# Logs em tempo real
flyctl logs -f

# Últimas 100 linhas
flyctl logs -n 100
```

### Monitorar recursos
```bash
# Ver uso de CPU e memória
flyctl vm status

# Ver métricas detalhadas
flyctl dashboard
```

## 🔧 Comandos Úteis

### Gerenciar máquinas virtuais
```bash
# Listar VMs
flyctl machine list

# Parar aplicação (economizar recursos)
flyctl machine stop

# Iniciar aplicação
flyctl machine start

# Reiniciar aplicação
flyctl machine restart
```

### Configurações
```bash
# Ver configurações atuais
flyctl config show

# Validar fly.toml
flyctl config validate

# Ver secrets configurados
flyctl secrets list
```

### Escalonamento
```bash
# Aumentar memória (se necessário)
flyctl scale memory 512

# Aumentar CPUs
flyctl scale cpu 2

# Ver configuração atual
flyctl scale show
```

## 🌐 Domínio Customizado (Opcional)

Se você quiser usar um domínio próprio:

```bash
# Adicionar domínio
flyctl certs add seudominio.com

# Ver certificados SSL
flyctl certs list

# Verificar certificado
flyctl certs show seudominio.com
```

Depois, configure os registros DNS:
- **A record**: Aponte para o IP do Fly.io (veja com `flyctl ips list`)
- **AAAA record**: Aponte para o IPv6 do Fly.io

## 💰 Custos

O Fly.io tem um plano gratuito generoso:
- 3 VMs compartilhadas (256MB RAM cada)
- 3GB de armazenamento persistente
- 160GB de tráfego de saída

A configuração atual usa:
- 1 VM com 256MB RAM
- Auto-stop quando não está em uso (economia de recursos)
- Auto-start quando recebe requisições

Para ver uso atual:
```bash
flyctl dashboard billing
```

## 🐛 Troubleshooting

### Aplicação não inicia

```bash
# Ver logs detalhados
flyctl logs

# SSH na máquina para debug
flyctl ssh console
```

### Build falha

```bash
# Fazer build local primeiro para testar
docker build -t formaval .

# Testar localmente
docker run -p 8080:8080 formaval
```

### Problemas com Firebase

1. Verifique se o domínio do Fly.io está autorizado no Firebase Console
2. Verifique as regras de segurança do Firestore
3. Teste a conexão com Firebase nos logs: `flyctl logs | grep Firebase`

### Performance lenta

```bash
# Aumentar recursos
flyctl scale memory 512
flyctl scale cpu 2

# Ou adicionar mais regiões
flyctl regions add iad  # Adicionar US East
```

## 📱 Health Check

A aplicação tem health check configurado em `/health`. Você pode testar:

```bash
curl https://formaval.fly.dev/health
# Deve retornar: OK
```

## 🔒 Segurança

A configuração do Nginx inclui:
- ✅ HTTPS forçado
- ✅ Headers de segurança (X-Frame-Options, X-Content-Type-Options, etc.)
- ✅ Proteção contra XSS
- ✅ Compressão GZIP
- ✅ Cache otimizado

## 📞 Suporte

- Documentação oficial: https://fly.io/docs/
- Status do serviço: https://status.flyio.net/
- Comunidade: https://community.fly.io/

## ✅ Checklist de Deploy

- [ ] Fly.io CLI instalado
- [ ] Conta criada/login feito
- [ ] Aplicação criada (`flyctl apps create`)
- [ ] Domínio autorizado no Firebase Console
- [ ] Deploy realizado (`flyctl deploy`)
- [ ] Aplicação testada (`flyctl open`)
- [ ] Logs verificados (`flyctl logs`)
- [ ] Health check funcionando

---

**Nota**: Os arquivos de configuração criados são:
- `fly.toml` - Configuração do Fly.io
- `Dockerfile` - Build da aplicação
- `nginx.conf` - Servidor web
- `.dockerignore` - Otimização do build
