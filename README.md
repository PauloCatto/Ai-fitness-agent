# AI Fitness Agent 🏋️‍♂️🤖

O **AI Fitness Agent** é uma plataforma de treinamento inteligente baseada em IA, projetada para criar, monitorar e ajustar planos de treino personalizados de forma autônoma. Utilizando uma arquitetura de multi-agentes e o poder do Google Gemini, o sistema atua como um personal trainer digital que aprende com seu progresso.

## 🌟 Visão Geral

Diferente de aplicativos de treino estáticos, este sistema utiliza **Agentes de IA especializados** que colaboram para otimizar sua jornada fitness:
- **Planejador (PlannerAgent):** Cria treinos sob medida baseados no seu perfil, objetivos e limitações.
- **Monitor de Progresso (ProgressAgent):** Analisa seu feedback pós-treino e ajusta a dificuldade dinamicamente.
- **Monitor de Recuperação (RecoveryAgent):** Avalia tendências de fadiga para prevenir overtraining.
- **Coach IA (CoachAgent):** Fornece orientações estratégicas e motivação personalizada.

## 🚀 Principais Funcionalidades

- **Onboarding Inteligente:** Coleta de dados completa incluindo limitações físicas e objetivos específicos.
- **Geração de Treino Dinâmica:** Planos que mudam conforme o usuário evolui.
- **Feedback Loop:** Cada sessão concluída alimenta o sistema para ajustes finos.
- **Painel de Controle Rico:** Gráficos de volume, fadiga e logs detalhados das decisões tomadas pela IA.
- **Interface Premium:** Design moderno com glassmorphism, animações suaves e modo escuro nativo.

## 🛠️ Stack Tecnológica

- **Frontend:** Angular 19+ (Stand-alone components, Reactive Forms, RxJS).
- **Estilo:** SCSS com Design Tokens personalizados.
- **Gráficos:** Chart.js.
- **IA:** Google Gemini API (via AI Service customizado).
- **Banco de Dados/Auth:** Firebase Firestore & Authentication.
- **Change Detection:** Zoneless (para máxima performance).

## 📦 Estrutura do Projeto

```text
src/app/
├── core/               # Singleton services, models e IA Agents
│   ├── agents/         # Lógica central dos multi-agentes
│   ├── services/       # Firebase, AI e Firestore services
│   └── state/          # Gerenciamento de estado (BehaviorSubjects)
├── features/           # Módulos e roteamento de funcionalidades
│   ├── dashboard/      # Painel principal e gráficos
│   └── workout/        # Visualização de plano e feedback
├── shared/             # Componentes, pipes e componentes reutilizáveis
└── styles/             # Design System e resets globais
```

## ⚙️ Configuração e Instalação

### Pré-requisitos
- Node.js 20+
- Angular CLI
- Uma chave da API Gemini (opcional, simulada por padrão)

### Passo a Passo
1. Clone o repositório.
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Configure as chaves de API em `src/environments/environment.ts`.
4. Inicie o servidor de desenvolvimento:
   ```bash
   ng serve
   ```
5. Acesse `http://localhost:4200`.

## 🧪 Testes

Para rodar os testes unitários:
```bash
npm test
```

## 📄 Licença

Este projeto é para fins educacionais e de demonstração tecnológica.

---
*Desenvolvido com ❤️ e IA para transformar sua rotina de treinos.*
