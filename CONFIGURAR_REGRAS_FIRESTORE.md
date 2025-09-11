# 🔐 Configurar Regras de Segurança do Firestore

## ⚠️ Problema Identificado
Erro: "Missing or insufficient permissions" ao tentar salvar dados no Firestore.

## 🔧 Solução Rápida

### Passo 1: Acessar o Console do Firebase
1. Acesse: https://console.firebase.google.com
2. Selecione o projeto: **avaliacao-habilidades-2024**

### Passo 2: Configurar Regras do Firestore
1. No menu lateral, clique em **Firestore Database**
2. Clique na aba **Rules** (Regras)
3. Substitua as regras atuais por uma das opções abaixo:

## 📝 Opções de Regras

### Opção 1: Permitir Acesso Temporário (Para Testes)
**⚠️ USE APENAS PARA TESTES - NÃO RECOMENDADO PARA PRODUÇÃO**

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

### Opção 2: Permitir Usuários Autenticados (RECOMENDADO)
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Permitir leitura e escrita para usuários autenticados (incluindo anônimos)
    match /evaluations/{document=**} {
      allow read, write: if request.auth != null;
    }
    
    // Regras específicas para outras coleções podem ser adicionadas aqui
    match /{document=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
  }
}
```

### Opção 3: Regras com Prazo (Mais Seguro para Desenvolvimento)
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Permitir acesso até uma data específica (ajuste a data conforme necessário)
    match /evaluations/{document=**} {
      allow read, write: if request.auth != null 
        && request.time < timestamp.date(2025, 12, 31);
    }
    
    // Permitir leitura pública mas escrita apenas autenticada
    match /{document=**} {
      allow read: if true;
      allow write: if request.auth != null
        && request.time < timestamp.date(2025, 12, 31);
    }
  }
}
```

### Opção 4: Regras Detalhadas (Para Produção)
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Regras para avaliações
    match /evaluations/{evaluationId} {
      // Permitir leitura para todos os usuários autenticados
      allow read: if request.auth != null;
      
      // Permitir criação para usuários autenticados
      allow create: if request.auth != null
        && request.resource.data.keys().hasAll(['patientInfo', 'responses'])
        && request.resource.data.patientInfo.keys().hasAll(['name', 'evaluationDate']);
      
      // Permitir atualização apenas se o usuário criou o documento
      allow update: if request.auth != null
        && request.auth.uid == resource.data.createdBy;
      
      // Não permitir exclusão
      allow delete: if false;
    }
    
    // Regras para terapeutas
    match /therapists/{therapistId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null 
        && request.auth.uid == therapistId;
    }
  }
}
```

## 🚀 Como Aplicar as Regras

1. Copie uma das opções de regras acima
2. No Console do Firebase, vá para **Firestore Database > Rules**
3. Delete todo o conteúdo existente
4. Cole as novas regras
5. Clique em **Publish** (Publicar)
6. Aguarde alguns segundos para as regras serem aplicadas

## ✅ Verificação

Após aplicar as regras:
1. Recarregue a página `restaurar-e-enviar-dados.html`
2. Tente enviar os dados novamente
3. O erro de permissão deve estar resolvido

## 🔒 Considerações de Segurança

- **Para Desenvolvimento/Testes**: Use a Opção 1 ou 2
- **Para Produção**: Use a Opção 3 ou 4
- **NUNCA** deixe `allow read, write: if true;` em produção
- Sempre exija autenticação mínima para operações de escrita
- Configure regras específicas para cada coleção conforme necessário

## 📊 Status Atual do Firebase

- **Projeto**: avaliacao-habilidades-2024
- **Autenticação**: Anônima habilitada
- **Problema**: Regras de segurança muito restritivas
- **Solução**: Aplicar regras que permitam usuários autenticados anonimamente

## 🆘 Se o Problema Persistir

1. Verifique se a autenticação anônima está habilitada:
   - Firebase Console > Authentication > Sign-in method
   - Habilite "Anonymous" se estiver desabilitado

2. Verifique se o Firestore está ativo:
   - Firebase Console > Firestore Database
   - Se aparecer "Create Database", crie um novo banco

3. Limpe o cache do navegador e tente novamente

4. Verifique o console do navegador (F12) para erros adicionais