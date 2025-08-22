# 🔥 Guia de Configuração Firebase - Projeto: avaliacao-habilidades-2024

## ✅ STATUS: Projeto Criado e Configurado

Seu projeto Firebase **avaliacao-habilidades-2024** foi criado com sucesso!

## 📋 Checklist de Configuração Obrigatória

### 1. ✅ Ativar Autenticação Anonymous
1. Acesse: https://console.firebase.google.com/project/avaliacao-habilidades-2024/authentication/providers
2. Clique em **"Anonymous"**
3. **ATIVE** o método Anonymous
4. Clique em **"Salvar"**

### 2. ✅ Configurar Firestore Database
1. Acesse: https://console.firebase.google.com/project/avaliacao-habilidades-2024/firestore
2. Se não existir, clique em **"Criar banco de dados"**
3. Selecione **"Começar no modo de teste"**
4. Escolha localização: **southamerica-east1** (mais próximo do Brasil)

### 3. ✅ Configurar Regras de Segurança do Firestore
1. Acesse: https://console.firebase.google.com/project/avaliacao-habilidades-2024/firestore/rules
2. **SUBSTITUA** o conteúdo das regras por:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Coleção de avaliações
    match /evaluations/{document} {
      allow read, write: if request.auth != null;
    }
    
    // Coleção de testes de conectividade
    match /test_connectivity/{document} {
      allow read, write: if request.auth != null;
    }
    
    // Logs de auditoria (apenas leitura para usuários autenticados)
    match /audit_logs/{document} {
      allow read: if request.auth != null;
      allow write: if false; // Apenas o sistema pode escrever logs
    }
  }
}
```

3. Clique em **"Publicar"**

## 🧪 Teste de Conectividade

### Passo 1: Abrir Arquivo de Teste
Abra o arquivo: `test-firebase-connection.html` no seu navegador

### Passo 2: Executar Testes
1. **Aguarde** a mensagem "✅ Firebase inicializado e autenticado com sucesso!"
2. Clique em **"🔄 Testar Conexão"**
3. Clique em **"📝 Testar Escrita"**
4. Clique em **"📖 Testar Leitura"**

### Resultados Esperados:
- ✅ **Autenticação**: "Autenticação anônima realizada com sucesso"
- ✅ **Conexão**: "Conexão com Firestore estabelecida com sucesso"
- ✅ **Escrita**: "Documento criado com ID: [ID_DO_DOCUMENTO]"
- ✅ **Leitura**: "Leitura realizada com sucesso"

## 🚀 Testar Sistema Principal

### Para Terapeutas:
Abra: `terapeuta.html`

### Para Pais:
Abra: `pais.html`

### Para Administradores:
Abra: `index.html`

## 📊 Funcionalidades Disponíveis

### ✅ Sistema Funcionando:
- **Autenticação Anônima**: Usuários podem usar o sistema sem cadastro
- **Persistência na Nuvem**: Dados salvos no Firebase Firestore
- **Backup Local**: Fallback automático para localStorage
- **Exportação CSV**: Relatórios completos das avaliações
- **Gráficos e Análises**: Visualização do progresso
- **Múltiplas Avaliações**: Histórico completo por paciente

### 📁 Estrutura de Dados:
```
📁 Firestore Collections:
├── evaluations/
│   ├── [ID_DOCUMENTO] (avaliações dos pacientes)
│   └── ...
├── test_connectivity/
│   ├── [ID_DOCUMENTO] (testes de sistema)
│   └── ...
└── audit_logs/ (futuramente)
    ├── [ID_DOCUMENTO] (logs do sistema)
    └── ...
```

## ⚠️ Possíveis Problemas e Soluções

### Erro: "Auth/permission-denied"
- **Causa**: Autenticação Anonymous não está ativada
- **Solução**: Ative Anonymous Authentication no console

### Erro: "Firestore/permission-denied"
- **Causa**: Regras de segurança muito restritivas
- **Solução**: Configure as regras conforme mostrado acima

### Erro: "Network request failed"
- **Causa**: Problema de conectividade ou firewall
- **Solução**: Verifique conexão com internet

### Sistema funciona apenas localmente
- **Causa**: Firebase não configurado, mas localStorage ativo
- **Comportamento**: Normal - sistema tem fallback automático

## 📈 Monitoramento

### Verificar Uso:
1. Acesse: https://console.firebase.google.com/project/avaliacao-habilidades-2024/usage
2. Monitore:
   - **Firestore**: Leituras/Escritas/Exclusões
   - **Authentication**: Usuários ativos
   - **Hosting**: Tráfego (se configurado)

### Quotas Gratuitas:
- **Firestore**: 50.000 leituras/dia, 20.000 escritas/dia
- **Authentication**: Ilimitado para Anonymous
- **Storage**: 1GB gratuito

## 🔧 Comandos Úteis de Debug

### No Console do Navegador:
```javascript
// Verificar se Firebase está inicializado
console.log(window.firebase);

// Verificar usuário atual
console.log(window.firebase?.auth?.currentUser);

// Testar conexão manual
window.firebaseDb && console.log("Firestore conectado");
```

## 📝 Próximos Passos Recomendados

1. **Testar todas as funcionalidades** usando os arquivos HTML
2. **Verificar dados salvos** no console Firebase
3. **Configurar alertas** para quotas (opcional)
4. **Backup periódico** dos dados importantes
5. **Documentar usuários** sobre como usar o sistema

## 🆘 Suporte

Se houver problemas:
1. **Verificar console do navegador** para erros JavaScript
2. **Executar teste de conectividade** primeiro
3. **Confirmar regras do Firestore** estão corretas
4. **Verificar autenticação Anonymous** está ativa

---

## ✅ Checklist Final

- [ ] Authentication Anonymous ativado
- [ ] Firestore Database criado
- [ ] Regras de segurança configuradas
- [ ] Teste de conectividade executado com sucesso
- [ ] Sistema principal testado
- [ ] Dados sendo salvos no Firebase

**🎉 Quando todos os itens estiverem marcados, seu sistema estará 100% funcional!**