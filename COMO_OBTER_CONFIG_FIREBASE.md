# 🔧 Como Obter a Configuração Firebase Correta

## ❌ Problema: API Key Inválida
A API key atual não é válida. Precisamos obter a configuração real do console Firebase.

## 📋 Passos Para Obter a Configuração:

### 1. Acessar o Console Firebase
1. Abra: https://console.firebase.google.com/project/avaliacao-habilidades-2024/overview
2. **Faça login** com sua conta Google

### 2. Navegar Para Configurações
1. Clique no **ícone de engrenagem** ⚙️ no menu lateral
2. Selecione **"Configurações do projeto"**
3. Role para baixo até a seção **"Seus apps"**

### 3. Encontrar/Criar App Web
Se você **já tem um app web**:
- Procure pelo app existente na lista
- Clique no **ícone de código** `</>`

Se você **NÃO tem um app web**:
1. Clique em **"Adicionar app"**
2. Selecione o **ícone Web** `</>`
3. Nome do app: `FormAval`
4. **NÃO** marque "Configurar Firebase Hosting"
5. Clique em **"Registrar app"**

### 4. Copiar a Configuração
Você verá algo assim:
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyABC123XYZ...",
  authDomain: "avaliacao-habilidades-2024.firebaseapp.com",
  projectId: "avaliacao-habilidades-2024",
  storageBucket: "avaliacao-habilidades-2024.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};
```

**COPIE TODA ESSA CONFIGURAÇÃO** - ela contém sua API key válida!

## 🔄 Depois de Copiar:

### Me envie a configuração neste formato:
```
apiKey: "SUA_API_KEY_AQUI"
authDomain: "avaliacao-habilidades-2024.firebaseapp.com"  
projectId: "avaliacao-habilidades-2024"
storageBucket: "avaliacao-habilidades-2024.appspot.com"
messagingSenderId: "SEU_SENDER_ID"
appId: "SEU_APP_ID"
```

**Eu vou atualizar todos os arquivos automaticamente!**

---

## 💡 Alternativa: Usar Sistema Offline

Enquanto isso, você pode usar o sistema **apenas localmente** abrindo:
- `firebase-local-test.html` - Sistema funcionando offline com localStorage

Este arquivo funciona **perfeitamente** sem Firebase, salvando tudo localmente no navegador.