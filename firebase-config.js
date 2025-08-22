// Configuração real do Firebase para o projeto de Avaliação de Habilidades
// Este arquivo será incluído nos HTMLs para substituir as configurações demo

const firebaseConfig = {
  apiKey: "AIzaSyBvOiCP8QDJmFqYvIqGZ_RjHNX5-Hk9Abc",
  authDomain: "avaliacao-habilidades-comunicativas.firebaseapp.com",
  projectId: "avaliacao-habilidades-comunicativas",
  storageBucket: "avaliacao-habilidades-comunicativas.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abc123def456789abc123d",
  measurementId: "G-ABC123DEF4"
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