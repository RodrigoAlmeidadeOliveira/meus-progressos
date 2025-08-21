# Sistema de Avaliação de Habilidades Comunicativas

## 📋 Sobre o Sistema

Sistema completo para avaliação de habilidades comunicativas com 149 questões organizadas em 4 categorias principais, gráficos interativos e exportação de dados.

## 🚀 Opções de Hospedagem

### **1. GitHub Pages (GRATUITO - RECOMENDADO)**

**Vantagens:** Gratuito, confiável, fácil de usar, HTTPS automático
**Ideal para:** Compartilhar com pais e profissionais

#### Passos:
1. Crie uma conta no [GitHub](https://github.com)
2. Crie um novo repositório público
3. Faça upload dos arquivos: `index.html`, `styles.css`, `script.js`
4. Vá em Settings > Pages
5. Selecione "Deploy from a branch" > "main"
6. Seu link será: `https://seuusuario.github.io/nome-do-repositorio`

### **2. Netlify (GRATUITO)**

**Vantagens:** Deploy automático, domínio personalizado, muito fácil
**Ideal para:** Profissionais que querem marca própria

#### Passos:
1. Acesse [Netlify](https://netlify.com)
2. Faça login com GitHub ou email
3. Arraste e solte a pasta do projeto
4. Receba o link instantaneamente
5. Opcional: Configure domínio personalizado

### **3. Vercel (GRATUITO)**

**Vantagens:** Performance excelente, fácil deploy
**Ideal para:** Uso profissional

#### Passos:
1. Acesse [Vercel](https://vercel.com)
2. Conecte com GitHub
3. Importe o repositório
4. Deploy automático

### **4. Servidor Local (Para Rede Local)**

**Vantagens:** Controle total, sem dependência de internet
**Ideal para:** Clínicas, consultórios, uso interno

#### Opção A - Python (Simples):
```bash
# No terminal, dentro da pasta do projeto:
python -m http.server 8000
# Acesse: http://SEU-IP-LOCAL:8000
```

#### Opção B - Node.js:
```bash
npx serve .
# Ou instale globalmente:
npm install -g serve
serve
```

#### Opção C - XAMPP/WAMP:
1. Instale XAMPP
2. Coloque arquivos em `htdocs/avaliacao/`
3. Acesse: `http://localhost/avaliacao/`

### **5. Hospedagem Compartilhada**

**Providers recomendados:**
- Hostinger (R$ 7,99/mês)
- UOLHost (R$ 12,90/mês)
- HostGator (R$ 6,99/mês)

## 🔒 Considerações de Segurança

### **Dados Sensíveis:**
- O sistema armazena dados no navegador (localStorage)
- Para uso profissional, considere implementar backend com banco de dados
- LGPD: Informe sobre coleta e armazenamento de dados

### **Acesso Restrito:**
- Para acesso restrito, use plataformas como:
  - Google Sites (com login Google)
  - WordPress com senha
  - Servidor com autenticação

## 📱 Como Compartilhar com os Pais

### **Opção 1 - Link Direto (Recomendado):**
```
Olá! 

Desenvolvemos um sistema de avaliação digital para acompanhar o desenvolvimento das habilidades comunicativas. 

🔗 Link: https://seusite.com
👤 Acesso: Livre (sem necessidade de cadastro)
📱 Funciona em: Computador, tablet e celular

Instruções:
1. Clique no link
2. Preencha as informações solicitadas
3. Responda o questionário completo
4. Os resultados ficam salvos no seu dispositivo

Dúvidas? Entre em contato!
```

### **Opção 2 - QR Code:**
- Gere um QR Code do link
- Envie por WhatsApp
- Facilita acesso em dispositivos móveis

## 📊 Instruções de Uso

### **Para os Pais:**
1. **Acesse o link** fornecido pelo profissional
2. **Preencha os dados:**
   - Nome da criança
   - Seus dados (nome, email, telefone)
   - Data da avaliação
3. **Responda as questões** usando a escala de 1-5
4. **Salve a avaliação** clicando em "Salvar Avaliação"
5. **Visualize resultados** clicando em "Ver Resultados"

### **Para o Profissional:**
1. **Acesse os dados** através da função "Ver Resultados"
2. **Exporte relatórios** em CSV
3. **Analise gráficos** de evolução
4. **Compare avaliações** ao longo do tempo

## 🛠️ Estrutura dos Arquivos

```
FormAval/
├── index.html          # Página principal
├── styles.css          # Estilos visuais
├── script.js           # Funcionalidades
└── README.md           # Este arquivo
```

## 🔄 Atualizações

Para atualizar o sistema:
1. Substitua os arquivos no servidor
2. Limpe o cache do navegador (Ctrl+F5)
3. Comunique mudanças aos usuários

## 📞 Suporte

Para suporte técnico:
- Documente problemas relatados
- Teste em diferentes dispositivos
- Mantenha backups dos dados exportados

## 🎯 Próximos Passos Recomendados

1. **Teste o sistema** antes de enviar aos pais
2. **Escolha a plataforma** de hospedagem
3. **Configure o acesso** 
4. **Prepare as instruções** para os pais
5. **Envie o link** com orientações claras

---

**Desenvolvido para avaliação profissional de habilidades comunicativas**