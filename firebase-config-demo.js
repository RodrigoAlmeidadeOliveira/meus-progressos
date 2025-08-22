// Configuração DEMO do Firebase - Para Testes Locais APENAS
// Esta configuração usa o emulador local do Firebase
// Para produção, você DEVE criar um projeto real no console Firebase

const firebaseConfigDemo = {
    // Configuração demo que funciona com emulador
    apiKey: "demo-key",
    authDomain: "demo-project.firebaseapp.com",
    projectId: "demo-project",
    storageBucket: "demo-project.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:demo",
    // Flag para indicar que é demo
    isDemo: true
};

// Instruções para criar projeto real:
/*
1. Acesse https://console.firebase.google.com/
2. Clique em "Adicionar projeto"
3. Nomeie o projeto (ex: "avaliacao-habilidades-2024")
4. Ative Google Analytics (opcional)
5. No painel do projeto:
   - Clique no ícone da web (</>)
   - Registre seu app
   - Copie a configuração gerada
6. Ative Authentication:
   - Vá para Authentication > Sign-in method
   - Ative "Anonymous"
7. Configure Firestore:
   - Vá para Firestore Database
   - Crie banco em modo teste
   - Configure regras:
   
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /evaluations/{document} {
         allow read, write: if request.auth != null;
       }
       match /test_connectivity/{document} {
         allow read, write: if request.auth != null;
       }
     }
   }
*/

export default firebaseConfigDemo;