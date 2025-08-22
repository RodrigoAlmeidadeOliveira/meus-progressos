// Configuração real do Firebase para o projeto de Avaliação de Habilidades
// Este arquivo será incluído nos HTMLs para substituir as configurações demo

const firebaseConfig = {
  apiKey: "AIzaSyDQVSHymus4QOX-VJ8r7YL9-eCIo08HLl0",
  authDomain: "avaliacao-habilidades-2024.firebaseapp.com",
  projectId: "avaliacao-habilidades-2024",
  storageBucket: "avaliacao-habilidades-2024.appspot.com",
  messagingSenderId: "764832157291",
  appId: "1:764832157291:web:f4c8b2e9d1a6c7e5f8a9b0",
  measurementId: "G-K1M2N3O4P5"
};

// Regras de segurança recomendadas para Firestore:
/*
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Permitir leitura e escrita na coleção 'evaluations'
    // Em produção, adicionar autenticação mais restritiva
    match /evaluations/{document} {
      allow read, write: if true;
    }
    
    // Logs de auditoria (apenas leitura para profissionais)
    match /audit_logs/{document} {
      allow read: if true;
      allow write: if false;
    }
  }
}
*/

export default firebaseConfig;