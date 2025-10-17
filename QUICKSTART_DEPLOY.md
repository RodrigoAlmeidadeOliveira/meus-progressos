# ⚡ Quick Start - Deploy no Fly.io

## 🎯 Deploy em 3 passos

### 1️⃣ Instalar Fly.io CLI

**macOS:**
```bash
brew install flyctl
```

**Linux:**
```bash
curl -L https://fly.io/install.sh | sh
```

**Windows (PowerShell como Admin):**
```powershell
iwr https://fly.io/install.ps1 -useb | iex
```

### 2️⃣ Fazer Login

```bash
# Se não tem conta, criar:
flyctl auth signup

# Se já tem conta, fazer login:
flyctl auth login
```

### 3️⃣ Deploy

```bash
# No diretório do projeto
cd /caminho/para/FormAval

# Criar app e fazer deploy (tudo de uma vez)
flyctl launch

# Ou criar manualmente:
flyctl apps create formaval
flyctl deploy
```

**Pronto!** 🎉 Sua aplicação estará no ar em: `https://formaval.fly.dev`

---

## 🔥 Comandos Importantes

```bash
# Abrir aplicação no navegador
flyctl open

# Ver logs em tempo real
flyctl logs -f

# Ver status
flyctl status

# Reiniciar aplicação
flyctl machine restart

# Ver dashboard com métricas
flyctl dashboard
```

---

## ⚙️ Configurar Firebase (OBRIGATÓRIO)

Depois do deploy, você PRECISA autorizar o domínio no Firebase:

1. Acesse: https://console.firebase.google.com
2. Selecione seu projeto: **avaliacao-habilidades-2024**
3. Vá em: **Authentication** → **Settings** → **Authorized domains**
4. Clique em **Add domain**
5. Adicione: `formaval.fly.dev` (ou seu domínio)
6. Salve

**Sem isso, o Firebase não vai funcionar!**

---

## 🐛 Problemas Comuns

### "Build failed"
```bash
# Testar build local primeiro
docker build -t formaval .
docker run -p 8080:8080 formaval
```

### "Firebase não conecta"
- Verifique se autorizou o domínio no Firebase Console
- Veja os logs: `flyctl logs | grep Firebase`

### "Aplicação lenta"
```bash
# Aumentar recursos (se necessário)
flyctl scale memory 512
```

---

## 📱 Testar Localmente (Opcional)

Antes de fazer deploy, você pode testar localmente:

```bash
# Com Docker
docker build -t formaval .
docker run -p 8080:8080 formaval

# Ou com Python (simples)
python3 -m http.server 8080
```

Acesse: http://localhost:8080

---

## 💡 Dicas

- **Custo**: O plano gratuito do Fly.io é suficiente para este projeto
- **Auto-stop**: A app para quando não está em uso (economiza recursos)
- **Auto-start**: Inicia automaticamente quando alguém acessa
- **HTTPS**: Já vem configurado automaticamente
- **Logs**: Use `flyctl logs -f` para monitorar em tempo real

---

## 📚 Documentação Completa

Veja o arquivo `DEPLOY_FLYIO.md` para instruções detalhadas sobre:
- Domínio customizado
- Monitoramento avançado
- Escalonamento
- Troubleshooting completo
- Segurança e otimizações

---

## ✅ Checklist Rápido

Antes de fazer deploy, verifique:

- [ ] Fly.io CLI instalado (`flyctl version`)
- [ ] Login feito (`flyctl auth login`)
- [ ] Projeto Firebase funcionando localmente
- [ ] Arquivos `fly.toml`, `Dockerfile`, `nginx.conf` existem
- [ ] Pronto para deploy! (`flyctl deploy`)

Após o deploy:

- [ ] Domínio autorizado no Firebase Console
- [ ] Aplicação abre no navegador (`flyctl open`)
- [ ] Firebase conecta corretamente (testar login/cadastro)
- [ ] Logs sem erros (`flyctl logs`)

---

**Dúvidas?** Veja a documentação completa em `DEPLOY_FLYIO.md` ou a documentação oficial: https://fly.io/docs/
