# ✅ Checklist Pré-Deploy - Fly.io

Use este checklist para garantir que tudo está configurado antes do deploy.

## 📋 Antes de Começar

### 1. Ambiente Local
- [ ] Node.js instalado (`node --version`)
- [ ] Git instalado (`git --version`)
- [ ] Projeto funcionando localmente
- [ ] Firebase conectando corretamente

### 2. Fly.io CLI
- [ ] Fly.io CLI instalado (`flyctl version`)
- [ ] Login feito (`flyctl auth login`)
- [ ] Conta verificada

### 3. Arquivos de Configuração
- [ ] `fly.toml` existe
- [ ] `Dockerfile` existe
- [ ] `nginx.conf` existe
- [ ] `.dockerignore` existe
- [ ] `package.json` está atualizado

## 🔥 Configuração Firebase

### Console Firebase
- [ ] Projeto criado: **avaliacao-habilidades-2024**
- [ ] Authentication habilitado
- [ ] Firestore Database criado
- [ ] Regras de segurança configuradas

### Arquivos HTML
Verifique se a configuração do Firebase está presente em:
- [ ] `index.html`
- [ ] `pais.html`
- [ ] `terapeuta.html`

### Configuração
```javascript
const firebaseConfig = {
    apiKey: "AIzaSyD_fkKU3N61u3HxKklIbdAMK2qUAPDVHhQ",
    authDomain: "avaliacao-habilidades-2024.firebaseapp.com",
    projectId: "avaliacao-habilidades-2024",
    storageBucket: "avaliacao-habilidades-2024.firebasestorage.app",
    messagingSenderId: "1026943873619",
    appId: "1:1026943873619:web:50276ae57af2e3a9ea0ca6",
    measurementId: "G-3LNVBBET4E"
};
```

## 🧪 Testes Locais

### Teste com Docker (Recomendado)
```bash
# Build
docker build -t formaval .

# Run
docker run -p 8080:8080 formaval

# Testar
# Abrir: http://localhost:8080
```

- [ ] Build do Docker funcionou
- [ ] Servidor iniciou corretamente
- [ ] Página principal carrega
- [ ] Firebase conecta
- [ ] Navegação funciona
- [ ] Formulários salvam dados

### Teste com Python (Alternativo)
```bash
python3 -m http.server 8080
```

- [ ] Servidor inicia
- [ ] Aplicação funciona

## 🚀 Deploy

### Pré-Deploy
- [ ] Commit de todas as mudanças (`git status`)
- [ ] Arquivos desnecessários ignorados
- [ ] Sem erros no console do navegador

### Deploy
```bash
# Opção 1: Script automatizado
./deploy.sh deploy

# Opção 2: Manual
flyctl apps create formaval
flyctl deploy
```

- [ ] App criado no Fly.io
- [ ] Deploy executado sem erros
- [ ] Aplicação acessível (`flyctl open`)
- [ ] Logs sem erros críticos (`flyctl logs`)

## 🔐 Pós-Deploy

### Firebase Console
**CRÍTICO:** Autorizar domínio no Firebase

1. Acesse: https://console.firebase.google.com
2. Selecione: **avaliacao-habilidades-2024**
3. Vá em: **Authentication** → **Settings** → **Authorized domains**
4. Clique: **Add domain**
5. Adicione: `formaval.fly.dev` (ou seu domínio)
6. Salve

- [ ] Domínio Fly.io autorizado
- [ ] Domínio customizado autorizado (se houver)

### Testes em Produção
Acesse: `https://formaval.fly.dev`

- [ ] Página principal carrega
- [ ] CSS aplicado corretamente
- [ ] JavaScript funciona
- [ ] Firebase conecta ✅
- [ ] Formulário de pais funciona
- [ ] Painel do terapeuta funciona
- [ ] Dados salvam no Firestore
- [ ] Exportação funciona
- [ ] Gráficos renderizam

### Diferentes Dispositivos
- [ ] Desktop (Chrome)
- [ ] Desktop (Firefox)
- [ ] Desktop (Safari/Edge)
- [ ] Mobile (Chrome Android)
- [ ] Mobile (Safari iOS)
- [ ] Tablet

### Performance
```bash
# Ver status
flyctl status

# Ver logs
flyctl logs -f

# Métricas
flyctl dashboard
```

- [ ] Health check: OK
- [ ] Tempo de resposta: < 2s
- [ ] Sem erros 500
- [ ] Memória: OK
- [ ] CPU: OK

## 🌐 Configurações Opcionais

### Domínio Customizado
Se você tem um domínio próprio:

```bash
flyctl certs add seudominio.com
```

- [ ] Certificado SSL criado
- [ ] DNS configurado (A record)
- [ ] Domínio acessível
- [ ] Domínio autorizado no Firebase

### Monitoramento
- [ ] Configurar alertas (opcional)
- [ ] Configurar backup (opcional)
- [ ] Documentar URL para equipe

## 📝 Documentação

### Compartilhar com Equipe
- [ ] URL da aplicação documentada
- [ ] Credenciais seguras (se houver)
- [ ] Instruções de uso enviadas
- [ ] Suporte técnico definido

### Para Usuários Finais
Preparar mensagem:
```
🎉 Sistema de Avaliação está no ar!

📱 Acesse: https://formaval.fly.dev
👥 Formulário para Pais: https://formaval.fly.dev/pais.html
👨‍⚕️ Painel do Terapeuta: https://formaval.fly.dev/terapeuta.html

✅ Funciona em qualquer dispositivo
✅ Dados salvos com segurança no Firebase
✅ Disponível 24/7
```

- [ ] Mensagem preparada
- [ ] Links testados
- [ ] Instruções claras

## 🐛 Troubleshooting

Se algo der errado:

### Build falha
```bash
# Testar Docker local
docker build -t formaval .
```

### Deploy falha
```bash
# Ver logs detalhados
flyctl logs

# Validar configuração
flyctl config validate
```

### Firebase não conecta
1. Verificar domínio autorizado
2. Ver logs: `flyctl logs | grep Firebase`
3. Testar console do navegador (F12)

### App lenta
```bash
# Aumentar recursos
flyctl scale memory 512
flyctl scale cpu 2
```

## 📊 Comandos Úteis

```bash
# Status
flyctl status

# Logs ao vivo
flyctl logs -f

# Abrir app
flyctl open

# Reiniciar
flyctl machine restart

# Dashboard
flyctl dashboard

# SSH (debug)
flyctl ssh console
```

## ✅ Deploy Concluído!

Parabéns! Se você completou todos os itens acima, sua aplicação está no ar e funcionando! 🎉

### Próximos Passos
1. Monitorar logs nos primeiros dias
2. Coletar feedback dos usuários
3. Documentar problemas e melhorias
4. Manter backups regulares dos dados

### Suporte
- Documentação Fly.io: https://fly.io/docs/
- Documentação Firebase: https://firebase.google.com/docs
- Logs da aplicação: `flyctl logs`

---

**Data do Deploy:** _____________
**URL Produção:** https://formaval.fly.dev
**Responsável:** _____________
