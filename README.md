# 🏋️‍♂️ AI Fitness Agent — Full Stack IA Personal Trainer

O **AI Fitness Agent** é uma plataforma de treinamento inteligente de última geração que combina a potência do **Angular 19** com um backend robusto em **ASP.NET Core 9** e a inteligência artificial do **Google Gemini Pro**.

![Versão](https://img.shields.io/badge/version-1.0.0-brightgreen)
![Angular](https://img.shields.io/badge/Angular-19-DD0031?logo=angular)
![.NET](https://img.shields.io/badge/.NET-9.0-512BD4?logo=dotnet)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-4169E1?logo=postgresql)
![AI](https://img.shields.io/badge/AI-Gemini_Pro-orange?logo=google-gemini)

## ✨ Funcionalidades Principais

*   **🧠 Geração de Treino por IA**: Planos de treino 100% personalizados baseados no seu perfil, nível e limitações.
*   **🛡️ Autenticação Segura**: Sistema de login/registro com JWT e criptografia BCrypt.
*   **📊 Dashboard de Evolução**: Acompanhamento de carga, volume e fadiga muscular em tempo real.
*   **💎 UI/UX Premium**: Interface moderna com Glassmorphism, animações Stagger e design Split-screen.
*   **🔄 Persistência Inteligente**: Sincronização automática entre cache local e banco de dados PostgreSQL (Neon).

## 🚀 Tech Stack

### Frontend
- **Framework**: Angular 19 (Standalone Components)
- **Estilização**: Vanilla CSS com Design System moderno
- **Estado**: StateService reativo com RxJS
- **Animações**: CSS Keyframes & Angular Animations

### Backend
- **Framework**: ASP.NET Core 9 (Web API)
- **Banco de Dados**: PostgreSQL com Neon Serverless
- **ORM**: Entity Framework Core
- **Segurança**: JWT (JSON Web Tokens)
- **IA**: Integração direta com Google Generative AI (Gemini)

## 🛠️ Como Executar o Projeto

### Pré-requisitos
- Node.js 18+
- .NET 9 SDK
- Conta no [Neon.tech](https://neon.tech) (PostgreSQL)
- Google AI API Key (Gemini)

### 1. Configurando o Backend
```bash
cd ../AiFitnessAgent.Api
# Restaure as dependências
dotnet restore
# Configure sua ConnectionString no appsettings.json
# Execute as migrações
dotnet ef database update
# Inicie o servidor
dotnet run
```
*O servidor estará rodando em `http://localhost:5294`*

### 2. Configurando o Frontend
```bash
cd ai-fitness-agent
# Instale as dependências
npm install
# Configure sua Gemini API Key em environments/environment.ts
# Inicie a aplicação
npm start
```
*Acesse em `http://localhost:4200`*

## 📁 Estrutura de Pastas

```text
├── ai-fitness-agent (Frontend)
│   ├── src/app/core/agents (Lógica de IA e Persistência)
│   ├── src/app/features (Páginas: Auth, Workout, Onboarding)
│   └── src/app/shared (Componentes e Pipes comuns)
└── AiFitnessAgent.Api (Backend)
    ├── Controllers (Endpoints de Auth e Usuários)
    ├── Models (Entidades do Banco de Dados)
    └── Services (Lógica de JWT e IA)
```

## 🤝 Contribuição

Este é um projeto focado em demonstrar a integração de IA em aplicações Full Stack modernas. Sinta-se à vontade para abrir Issues ou Pull Requests.

---
Desenvolvido com ❤️ e Inteligência Artificial.
