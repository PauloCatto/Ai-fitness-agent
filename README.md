# 🏋️‍♂️ AI Fitness Agent — Frontend

[![Angular](https://img.shields.io/badge/Angular-21-DD0031?style=for-the-badge&logo=angular)](https://angular.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![RxJS](https://img.shields.io/badge/RxJS-Reactive-B71C1C?style=for-the-badge&logo=reactivex)](https://rxjs.dev/)
[![UI/UX](https://img.shields.io/badge/UI/UX-Premium_Glassmorphism-blue?style=for-the-badge)](https://dribbble.com/)

A interface de última geração para o seu Personal Trainer IA. Desenvolvido com **Angular 21**, o frontend do AI Fitness Agent oferece uma experiência premium, reativa e inteligente para transformar a forma como você treina.

## ✨ Diferenciais Técnicos

O projeto utiliza o que há de mais moderno no ecossistema Angular e padrões de desenvolvimento de software de alto nível.

- **🤖 Sistema Multi-Agente**: Arquitetura baseada em agentes de IA (Planner, Progress, Recovery, Coach) que colaboram para otimizar seu treino.
- **Standalone Components**: Arquitetura moderna sem NgModules, mais leve e escalável.
- **Reactive State Management**: Gerenciamento de estado robusto utilizando `BehaviorSubject` e `Signals` (Angular 19).
- **Zoneless-ready**: Preparado para alta performance com detecção de mudanças otimizada.
- **Active Workout Mode**: Cronômetro de descanso inteligente com feedback tátil (vibração) e audiovisual (Web Audio API).

## 🚀 Funcionalidades Premium

- **Painel Inteligente**: Visualize sua fadiga, volume de treino e insights da IA em um dashboard dinâmico.
- **Onboarding Gamificado**: Processo de configuração de perfil dividido em etapas claras e intuitivas.
- **Treino Ativo**: Interface focada na execução, permitindo controlar séries e tempos de descanso personalizados.
- **Feedback Sensorial**: O app avisa quando o descanso acabou através de sons e vibrações, garantindo a intensidade do treino.

## 🛠️ Tech Stack

- **Framework**: Angular 21 (Zoneless ready)
- **Linguagem**: TypeScript 5.x
- **Gráficos**: Chart.js 4.x (Dashboard reativo)
- **IA**: Google Generative AI SDK (Gemini Integration)
- **Estilização**: CSS Moderno (Glassmorphism & Keyframes)
- **Comunicação**: HttpClient + Interceptors JWT

## 📁 Estrutura de Pastas

```text
src/app/
├── core/                # Singleton Services, Models, Guards, Interceptors
│   ├── agents/          # Agentes de IA (PlannerAgent, ProgressAgent...)
│   ├── services/        # Serviços de API e Infraestrutura
│   └── state/           # Gerenciamento de Estado Global
├── features/            # Módulos de Funcionalidades (Dashboard, Workout, Onboarding)
└── shared/              # Componentes, Pipes e Diretivas Reutilizáveis
```

## 🛠️ Como Executar

Este é um projeto focado em demonstrar a integração de IA em aplicações Full Stack modernas. Sinta-se à vontade para abrir Issues ou Pull Requests.
