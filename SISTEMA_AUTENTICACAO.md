# 🔐 Sistema de Autenticação - Planejamento

## 📋 **VISÃO GERAL**

Sistema de autenticação integrado com Google/Facebook para separar acesso entre pais e terapeutas com segurança de dados por usuário.

---

## 🎯 **OBJETIVOS PRINCIPAIS**

### **1️⃣ Autenticação Social**
- ✅ Login com Google (OAuth 2.0)
- ✅ Login com Facebook (Facebook Login)
- ✅ Criação automática de conta na primeira entrada
- ✅ Gerenciamento de sessão segura

### **2️⃣ Controle de Acesso**
- ✅ **Pais/Responsáveis**: Acesso apenas aos próprios dados
- ✅ **Terapeutas**: Acesso aos dados dos pacientes atribuídos
- ✅ **Administradores**: Acesso completo ao sistema

### **3️⃣ Segurança de Dados**
- ✅ Isolamento de dados por usuário
- ✅ Criptografia de informações sensíveis
- ✅ Logs de auditoria de acesso
- ✅ Conformidade com LGPD

---

## 🏗️ **ARQUITETURA PROPOSTA**

### **Fluxo de Autenticação:**
```
1. Usuário acessa o sistema
2. Escolhe método de login (Google/Facebook)
3. Redirecionamento para provedor OAuth
4. Retorno com token de autenticação
5. Verificação e criação/atualização do perfil
6. Definição do tipo de usuário (pai/terapeuta)
7. Redirecionamento para interface apropriada
```

### **Estrutura do Banco de Dados:**
```javascript
// Coleção: users
{
  uid: "firebase_user_id",
  email: "usuario@email.com",
  name: "Nome Completo",
  photoURL: "url_da_foto",
  provider: "google" | "facebook",
  userType: "parent" | "therapist" | "admin",
  createdAt: "2024-01-15T10:30:00Z",
  lastLogin: "2024-01-15T10:30:00Z",
  
  // Para pais
  children: ["patient_id_1", "patient_id_2"],
  
  // Para terapeutas
  patients: ["patient_id_1", "patient_id_2", "patient_id_3"],
  organization: "clinica_abc"
}

// Coleção: evaluations (modificada)
{
  id: "evaluation_id",
  patientId: "patient_id",
  parentUid: "firebase_user_id", // UID do pai que preencheu
  therapistUid: "firebase_user_id", // UID do terapeuta responsável
  
  // Dados existentes...
  patientInfo: { ... },
  evaluatorInfo: { ... },
  responses: { ... },
  groupScores: { ... },
  
  // Novos campos de segurança
  createdBy: "firebase_user_id",
  visibility: "private" | "shared",
  sharedWith: ["therapist_uid_1", "therapist_uid_2"]
}
```

---

## 🔧 **IMPLEMENTAÇÃO TÉCNICA**

### **1️⃣ Firebase Authentication Setup**
```javascript
// firebase-config.js (novo arquivo)
import { getAuth, GoogleAuthProvider, FacebookAuthProvider } from 'firebase/auth';

// Configuração dos provedores
const googleProvider = new GoogleAuthProvider();
const facebookProvider = new FacebookAuthProvider();

// Configurações específicas
googleProvider.addScope('profile');
googleProvider.addScope('email');

facebookProvider.addScope('email');
facebookProvider.addScope('public_profile');
```

### **2️⃣ Sistema de Login**
```html
<!-- login.html (nova página) -->
<div class="login-container">
  <h1>🔐 Acesso ao Sistema</h1>
  
  <div class="login-options">
    <button id="google-login" class="login-btn google">
      <img src="google-icon.svg"> Entrar com Google
    </button>
    
    <button id="facebook-login" class="login-btn facebook">
      <img src="facebook-icon.svg"> Entrar com Facebook
    </button>
  </div>
  
  <div class="user-type-selection" style="display: none;">
    <h3>Selecione seu tipo de acesso:</h3>
    <button id="select-parent" class="user-type-btn">
      👨‍👩‍👧‍👦 Sou Pai/Responsável
    </button>
    <button id="select-therapist" class="user-type-btn">
      👨‍⚕️ Sou Terapeuta
    </button>
  </div>
</div>
```

### **3️⃣ Gerenciador de Autenticação**
```javascript
// auth-manager.js (novo arquivo)
class AuthManager {
  constructor() {
    this.auth = getAuth();
    this.user = null;
    this.userProfile = null;
  }

  async loginWithGoogle() {
    try {
      const result = await signInWithPopup(this.auth, googleProvider);
      await this.handleAuthSuccess(result.user);
    } catch (error) {
      console.error('Erro no login Google:', error);
      throw error;
    }
  }

  async loginWithFacebook() {
    try {
      const result = await signInWithPopup(this.auth, facebookProvider);
      await this.handleAuthSuccess(result.user);
    } catch (error) {
      console.error('Erro no login Facebook:', error);
      throw error;
    }
  }

  async handleAuthSuccess(user) {
    this.user = user;
    
    // Verificar se usuário já existe
    const userDoc = await this.getUserProfile(user.uid);
    
    if (!userDoc) {
      // Primeiro login - mostrar seleção de tipo
      this.showUserTypeSelection();
    } else {
      // Usuário existente - redirecionar para interface
      this.redirectToInterface(userDoc.userType);
    }
  }

  async createUserProfile(userType) {
    const userData = {
      uid: this.user.uid,
      email: this.user.email,
      name: this.user.displayName,
      photoURL: this.user.photoURL,
      provider: this.user.providerData[0].providerId,
      userType: userType,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString()
    };

    await setDoc(doc(db, 'users', this.user.uid), userData);
    this.userProfile = userData;
    this.redirectToInterface(userType);
  }

  redirectToInterface(userType) {
    if (userType === 'parent') {
      window.location.href = 'pais.html';
    } else if (userType === 'therapist') {
      window.location.href = 'terapeuta.html';
    }
  }
}
```

---

## 🔒 **REGRAS DE SEGURANÇA FIRESTORE**

### **Regras Avançadas:**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Coleção de usuários
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Coleção de avaliações
    match /evaluations/{evaluationId} {
      allow read: if request.auth != null && (
        // Pai pode ver apenas suas próprias avaliações
        resource.data.parentUid == request.auth.uid ||
        // Terapeuta pode ver avaliações dos seus pacientes
        resource.data.therapistUid == request.auth.uid ||
        // Avaliação compartilhada com o usuário
        request.auth.uid in resource.data.sharedWith
      );
      
      allow write: if request.auth != null && (
        // Pai pode criar/editar apenas suas avaliações
        request.auth.uid == resource.data.parentUid ||
        // Terapeuta pode editar avaliações dos seus pacientes
        request.auth.uid == resource.data.therapistUid
      );
    }
    
    // Coleção de pacientes (nova)
    match /patients/{patientId} {
      allow read: if request.auth != null && (
        request.auth.uid in resource.data.parents ||
        request.auth.uid in resource.data.therapists
      );
      
      allow write: if request.auth != null && 
        request.auth.uid in resource.data.therapists;
    }
  }
}
```

---

## 👥 **TIPOS DE USUÁRIO**

### **🧑‍🤝‍🧑 Pais/Responsáveis**
**Permissões:**
- ✅ Preencher formulários de avaliação
- ✅ Visualizar histórico dos próprios filhos
- ✅ Exportar dados dos próprios filhos
- ❌ Não podem ver dados de outras famílias

**Interface:**
- Dashboard simplificado com os filhos cadastrados
- Formulário de avaliação pré-configurado
- Histórico de avaliações realizadas

### **👨‍⚕️ Terapeutas**
**Permissões:**
- ✅ Visualizar todos os pacientes atribuídos
- ✅ Criar/editar perfis de pacientes
- ✅ Gerar relatórios e análises
- ✅ Gerenciar permissões de acesso
- ✅ Exportar dados completos

**Interface:**
- Dashboard completo atual
- Gerenciamento de pacientes
- Ferramentas de análise avançada

### **👔 Administradores**
**Permissões:**
- ✅ Acesso completo ao sistema
- ✅ Gerenciar usuários e permissões
- ✅ Configurações do sistema
- ✅ Logs de auditoria

---

## 📱 **FLUXO DE USUÁRIO**

### **Para Pais (Novo Fluxo):**
```
1. Acessa o sistema
2. Faz login com Google/Facebook
3. Primeiro acesso: seleciona "Sou Pai/Responsável"
4. É redirecionado para área dos pais
5. Vê lista dos filhos (inicialmente vazia)
6. Adiciona novo filho ou preenche avaliação
7. Dados ficam privados até compartilhar com terapeuta
```

### **Para Terapeutas (Novo Fluxo):**
```
1. Acessa o sistema
2. Faz login com Google/Facebook
3. Primeiro acesso: seleciona "Sou Terapeuta"
4. É redirecionado para dashboard do terapeuta
5. Vê apenas pacientes atribuídos a ele
6. Pode convidar pais para compartilhar dados
7. Gerencia todos os dados dos pacientes
```

---

## 🔐 **RECURSOS DE SEGURANÇA**

### **1️⃣ Compartilhamento Seguro**
- Pais podem autorizar acesso específico para terapeutas
- Sistema de convites por email
- Permissões granulares por avaliação

### **2️⃣ Auditoria**
```javascript
// logs de acesso
{
  userId: "firebase_uid",
  action: "view_evaluation" | "edit_evaluation" | "export_data",
  resourceId: "evaluation_id",
  timestamp: "2024-01-15T10:30:00Z",
  ip: "192.168.1.1",
  userAgent: "browser_info"
}
```

### **3️⃣ Criptografia**
- Dados sensíveis criptografados no cliente
- Chaves de criptografia por usuário
- Backup seguro das chaves

---

## 🚀 **CRONOGRAMA DE IMPLEMENTAÇÃO**

### **Fase 1: Base (1-2 semanas)**
- ✅ Configurar Firebase Authentication
- ✅ Criar sistema de login social
- ✅ Implementar seleção de tipo de usuário
- ✅ Atualizar regras de segurança básicas

### **Fase 2: Interface (2-3 semanas)**
- ✅ Adaptar interface dos pais para autenticação
- ✅ Adaptar dashboard do terapeuta
- ✅ Implementar controle de acesso nas páginas
- ✅ Sistema de logout e gerenciamento de sessão

### **Fase 3: Recursos Avançados (2-4 semanas)**
- ✅ Sistema de compartilhamento de dados
- ✅ Convites para terapeutas
- ✅ Logs de auditoria
- ✅ Criptografia de dados sensíveis

### **Fase 4: Testes e Deploy (1-2 semanas)**
- ✅ Testes de segurança
- ✅ Testes de usabilidade
- ✅ Deploy em produção
- ✅ Monitoramento e ajustes

---

## 💰 **ESTIMATIVA DE CUSTOS**

### **Firebase (Plano Blaze)**
| Recurso | Uso Estimado | Custo Mensal |
|---------|--------------|--------------|
| **Authentication** | 1.000 usuários | $0 (grátis até 50k) |
| **Firestore Reads** | 100.000 | ~$0.36 |
| **Firestore Writes** | 10.000 | ~$0.18 |
| **Storage** | 5GB | ~$0.10 |
| **Hosting** | 10GB transfer | $0 (grátis até 10GB) |
| **TOTAL** | | **~$0.64/mês** |

**Nota:** Muito acessível para começar!

---

## 📋 **PRÓXIMOS PASSOS**

### **Para Implementar:**
1. **Configurar Authentication no Console Firebase**
2. **Registrar aplicação no Google Cloud Console**
3. **Registrar aplicação no Facebook Developers**
4. **Implementar sistema de login**
5. **Atualizar regras de segurança**
6. **Adaptar interfaces existentes**
7. **Testes completos**

### **Dependências:**
- Google Cloud Console (para OAuth Google)
- Facebook Developers (para OAuth Facebook)
- Domínio verificado (para produção)
- Certificado SSL (para autenticação social)

---

## 🎯 **RESULTADO FINAL**

Após implementação completa:
- ✅ **Sistema totalmente seguro** com isolamento de dados
- ✅ **Login social** moderno e fácil
- ✅ **Controle de acesso** granular por tipo de usuário
- ✅ **Conformidade LGPD** com logs de auditoria
- ✅ **Escalabilidade** para milhares de usuários
- ✅ **Interface profissional** mantendo usabilidade atual

**🚀 Ready para implementar quando quiser!**