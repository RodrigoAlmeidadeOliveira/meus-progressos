# 🔥 Configuração Firebase - Guia Completo

## ❌ PROBLEMA ATUAL
A API Key do Firebase está **INVÁLIDA** ou o projeto foi **DESATIVADO**.

## ✅ SOLUÇÃO: Criar Projeto Firebase Real

### Passo 1: Criar Projeto
1. Acesse [Firebase Console](https://console.firebase.google.com/)
2. Clique em **"Adicionar projeto"**
3. Nome: `avaliacao-habilidades-2024`
4. Desative Google Analytics (opcional)
5. Clique em **"Criar projeto"**

### Passo 2: Configurar Aplicação Web
1. No dashboard do projeto, clique no ícone **"</>"** (Web)
2. Nome do app: `Sistema Avaliacao Habilidades`
3. **NÃO** marque "Firebase Hosting"
4. Clique em **"Registrar app"**
5. **COPIE** a configuração gerada (será algo como):

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyABC123...",
  authDomain: "seu-projeto.firebaseapp.com",
  projectId: "avaliacao-habilidades-2024",
  storageBucket: "avaliacao-habilidades-2024.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123def456"
};
```

### Passo 3: Ativar Authentication
1. No menu lateral, vá para **"Authentication"**
2. Clique em **"Começar"**
3. Vá para aba **"Sign-in method"**
4. Clique em **"Anonymous"**
5. **ATIVE** o método Anonymous
6. Clique em **"Salvar"**

### Passo 4: Configurar Firestore
1. No menu lateral, vá para **"Firestore Database"**
2. Clique em **"Criar banco de dados"**
3. Selecione **"Começar no modo de teste"**
4. Escolha a localização mais próxima (ex: `southamerica-east1`)
5. Clique em **"Concluído"**

### Passo 5: Configurar Regras de Segurança
1. Na aba **"Regras"** do Firestore
2. **SUBSTITUA** o conteúdo por:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Permitir acesso a usuários autenticados (incluindo anonymous)
    match /evaluations/{document} {
      allow read, write: if request.auth != null;
    }
    
    // Coleção de testes
    match /test_connectivity/{document} {
      allow read, write: if request.auth != null;
    }
    
    // Logs de auditoria (apenas leitura)
    match /audit_logs/{document} {
      allow read: if request.auth != null;
      allow write: if false;
    }
  }
}
```

3. Clique em **"Publicar"**

### Passo 6: Atualizar Configuração nos Arquivos
Depois de criar o projeto, **SUBSTITUA** a configuração em:
- `index.html`
- `pais.html` 
- `terapeuta.html`
- `firebase-test.html`

Substitua esta parte:
```javascript
const firebaseConfig = {
    apiKey: "AIzaSyDQVSHymus4QOX-VJ8r7YL9-eCIo08HLl0", // ❌ INVÁLIDA
    authDomain: "avaliacao-habilidades-2024.firebaseapp.com",
    // ... resto da config inválida
};
```

Pela nova configuração copiada do console Firebase.

## 🧪 TESTE IMEDIATO - Modo Offline
Para testar o sistema **AGORA** sem Firebase:
1. Abra `firebase-local-test.html`
2. O sistema funcionará em modo offline usando localStorage

## ⚠️ IMPORTANTE
- O projeto Firebase atual está **INATIVO** ou **DELETADO**
- Você **DEVE** criar um novo projeto para usar Firebase
- Enquanto isso, o sistema funciona perfeitamente offline

## 💡 ALTERNATIVA RÁPIDA
Se não quiser criar projeto Firebase agora, modifique o sistema para funcionar **apenas** offline:
1. Remova imports do Firebase dos arquivos HTML
2. Use apenas localStorage
3. Mantenha fallback para localStorage que já existe

## 🔧 PRÓXIMOS PASSOS
1. ✅ Criar projeto Firebase (15 minutos)
2. ✅ Atualizar configuração nos arquivos
3. ✅ Testar conectividade
4. ✅ Sistema funcionando 100%