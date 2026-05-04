import { Injectable, inject } from '@angular/core';
import { Observable, of, delay, throwError, from, switchMap, firstValueFrom } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { map, catchError, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  UserProfile,
  WorkoutPlan,
  AiWorkoutResponseDto,
  AiExerciseDto,
  Exercise,
  WorkoutDay,
  FitnessLevel,
  Equipment,
  MuscleGroup,
} from '../models';

@Injectable({ providedIn: 'root' })
export class AiService {
  private readonly http = inject(HttpClient);
  private cachedApiKey: string | null = null;

  private async fetchApiKey(): Promise<string> {
    if (this.cachedApiKey) return this.cachedApiKey;
    const res = await firstValueFrom(this.http.get<{ apiKey: string }>('/config/gemini-key'));
    this.cachedApiKey = res.apiKey;
    return res.apiKey;
  }

  generateWorkout(profile: UserProfile): Observable<WorkoutPlan> {
    if (environment.useMockAi) {
      return this.mockGenerateWorkout(profile);
    }
    return this.geminiGenerateWorkout(profile);
  }

  explainWorkout(plan: WorkoutPlan, question?: string): Observable<string> {
    if (environment.useMockAi) {
      return this.mockStreamText(this.buildExplainMockText(plan, question));
    }
    return this.geminiStream(this.buildExplainPrompt(plan, question));
  }

  adjustWorkout(plan: WorkoutPlan, feedbackReason: string): Observable<WorkoutPlan> {
    if (environment.useMockAi) {
      return this.mockAdjustWorkout(plan, feedbackReason);
    }
    return this.geminiGenerateWorkout(
      this.buildAdjustmentProfile(plan, feedbackReason),
      plan,
      feedbackReason,
    );
  }

  chat(message: string, context: string): Observable<string> {
    if (environment.useMockAi) {
      return this.mockStreamText(this.buildChatMockResponse(message));
    }
    return this.geminiStream(this.buildChatPrompt(message, context));
  }

  private async getGeminiModel() {
    const apiKey = await this.fetchApiKey();
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);
    return genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  }

  private geminiGenerateWorkout(
    profile: UserProfile,
    existingPlan?: WorkoutPlan,
    feedbackReason?: string,
  ): Observable<WorkoutPlan> {
    const prompt = this.buildWorkoutPrompt(profile, existingPlan, feedbackReason);

    return from(this.getGeminiModel()).pipe(
      switchMap((model) => from(model.generateContent(prompt))),
      map((result) => {
        const raw = result.response.text();
        return this.parseWorkoutResponse(raw, profile);
      }),
      catchError((err) =>
        throwError(() => new Error(`Gemini workout generation failed: ${err.message}`)),
      ),
    );
  }

  private geminiStream(prompt: string): Observable<string> {
    return new Observable<string>((observer) => {
      this.getGeminiModel().then((model) => {
        model
          .generateContentStream(prompt)
          .then((streamResult) => {
            (async () => {
              try {
                for await (const chunk of streamResult.stream) {
                  const text = chunk.text();
                  if (text) observer.next(text);
                }
                observer.complete();
              } catch (err) {
                observer.error(err);
              }
            })();
          })
          .catch((err) => observer.error(err));
      });

      return () => { };
    });
  }

  private buildWorkoutPrompt(
    profile: UserProfile,
    existingPlan?: WorkoutPlan,
    feedbackReason?: string,
  ): string {
    const limitationsText =
      profile.limitations && profile.limitations.length > 0
        ? profile.limitations.join(', ')
        : 'Nenhuma';
    const injuriesText = profile.injuries?.trim() || 'Nenhuma';
    const adjustNote = existingPlan
      ? `O usuário deu o seguinte feedback sobre o plano anterior: "${feedbackReason}". Ajuste o plano de acordo.`
      : '';

    const goalLabels: Record<string, string> = {
      hypertrophy: 'Hipertrofia (ganho de massa muscular)',
      strength: 'Força (aumentar carga nos exercícios)',
      weight_loss: 'Emagrecimento (perda de gordura corporal)',
      endurance: 'Resistência (melhorar condicionamento físico)',
    };

    return `
Você é um personal trainer profissional e especialista em prescrição de treino.

Dados do usuário:
- Nome: ${profile.displayName}
- Idade: ${profile.age} anos
- Peso: ${profile.weight} kg
- Nível de condicionamento: ${profile.fitnessLevel}
- Objetivo principal: ${goalLabels[profile.goal] ?? profile.goal}
- Frequência semanal: ${profile.preferences.daysPerWeek} dias por semana
- Duração por sessão: ${profile.preferences.sessionDurationMinutes} minutos
- Equipamentos disponíveis: ${profile.preferences.availableEquipment.join(', ')}
- Áreas de foco: ${profile.preferences.focusAreas.join(', ')}
- Limitações físicas: ${limitationsText}
- Lesões / Restrições específicas: ${injuriesText}

${adjustNote}

REGRAS OBRIGATÓRIAS:
- NÃO invente informações sobre o usuário
- RESPEITE as limitações físicas — evite exercícios que possam agravar a condição
- Priorize segurança acima de performance
- Adapte o volume e intensidade ao nível declarado
- NÃO retorne texto fora do JSON

Retorne SOMENTE JSON válido neste formato exato (sem markdown, sem texto extra):
{
  "agentReasoning": "string — explique sua lógica para este plano em português",
  "fitnessLevel": "${profile.fitnessLevel}",
  "totalVolume": number,
  "estimatedWeeklyMinutes": number,
  "days": [
    {
      "day": 1,
      "label": "Segunda",
      "focus": "string",
      "isRestDay": false,
      "estimatedMinutes": 45,
      "exercises": [
        {
          "id": "string-único",
          "name": "string em português",
          "muscleGroups": ["chest"],
          "sets": 3,
          "reps": "8-12",
          "restSeconds": 60,
          "difficulty": "${profile.fitnessLevel}",
          "instructions": "string em português",
          "tips": "string em português",
          "equipment": ["barbell"]
        }
      ]
    }
  ]
}
Gere exatamente ${profile.preferences.daysPerWeek} dias de treino mais os dias de descanso para completar 7 dias.
Dias da semana em português: Segunda, Terça, Quarta, Quinta, Sexta, Sábado, Domingo.
`.trim();
  }

  private buildExplainPrompt(plan: WorkoutPlan, question?: string): string {
    const q = question ?? 'Explain this workout plan and its benefits.';
    return `
You are a supportive fitness coach AI. Answer this question about the workout plan below.

Question: ${q}

Workout Plan Summary:
- Level: ${plan.fitnessLevel}
- Days: ${plan.days.length}
- Focus areas: ${plan.days.map((d) => d.focus).join(', ')}
- Reasoning: ${plan.agentReasoning}

Respond in 2-3 concise paragraphs. Be encouraging and specific.
`.trim();
  }

  private buildChatPrompt(message: string, context: string): string {
    return `
Você é o "Elite Fitness Coach", um especialista em fisiologia do exercício, nutrição esportiva e psicologia do bem-estar.
Sua missão é fornecer orientações técnicas, seguras e extremamente motivadoras.

${context ? `CONTEXTO ATUAL DO ATLETA: ${context}` : ''}

DIRETRIZES DE RESPOSTA:
1. Seja técnico mas acessível. Use termos como "sobrecarga progressiva", "síntese proteica" e "déficit calórico" quando apropriado.
2. Seja empático e encorajador.
3. Se a pergunta for fora do escopo de fitness/saúde, tente gentilmente trazer o foco de volta para o bem-estar.
4. Mantenha a resposta em no máximo 2-3 parágrafos curtos.

PERGUNTA DO USUÁRIO: ${message}

Responda em português brasileiro.
`.trim();
  }

  private parseWorkoutResponse(raw: string, profile: UserProfile): WorkoutPlan {
    const cleaned = raw.replace(/```json|```/g, '').trim();

    let dto: AiWorkoutResponseDto;
    try {
      dto = JSON.parse(cleaned) as AiWorkoutResponseDto;
    } catch {
      throw new Error('AI returned invalid JSON. Enable mock mode or check your prompt.');
    }

    return {
      id: crypto.randomUUID(),
      userId: profile.uid,
      generatedAt: new Date(),
      weekNumber: 1,
      fitnessLevel: dto.fitnessLevel ?? profile.fitnessLevel,
      agentReasoning: dto.agentReasoning ?? '',
      totalVolume: dto.totalVolume ?? 0,
      estimatedWeeklyMinutes: dto.estimatedWeeklyMinutes ?? 0,
      days: (dto.days ?? []).map((d) => this.mapDay(d)),
    };
  }

  private mapDay(d: AiWorkoutResponseDto['days'][number]): WorkoutDay {
    return {
      day: d.day,
      label: d.label,
      focus: d.focus,
      isRestDay: d.isRestDay,
      estimatedMinutes: d.estimatedMinutes,
      exercises: (d.exercises ?? []).map((e) => this.mapExercise(e)),
    };
  }

  private mapExercise(e: AiExerciseDto): Exercise {
    return {
      id: e.id ?? crypto.randomUUID(),
      name: e.name,
      muscleGroups: (e.muscleGroups ?? []).map(g => typeof g === 'string' ? g : (g as any).name || (g as any).toString()) as MuscleGroup[],
      sets: e.sets,
      reps: e.reps,
      restSeconds: e.restSeconds,
      difficulty: e.difficulty as FitnessLevel,
      instructions: e.instructions,
      tips: e.tips,
      equipment: (e.equipment ?? []).map(eq => typeof eq === 'string' ? eq : (eq as any).name || (eq as any).toString()) as Equipment[],
    };
  }

  private mockGenerateWorkout(profile: UserProfile): Observable<WorkoutPlan> {
    const plan = this.buildMockPlan(profile);
    return of(plan).pipe(delay(1800));
  }

  private mockAdjustWorkout(plan: WorkoutPlan, reason: string): Observable<WorkoutPlan> {
    const adjusted: WorkoutPlan = {
      ...plan,
      id: crypto.randomUUID(),
      generatedAt: new Date(),
      weekNumber: plan.weekNumber + 1,
      agentReasoning: `Plano ajustado com base no seu feedback: "${reason}". Volume e intensidade foram modificados para melhor atender às suas necessidades.`,
    };
    return of(adjusted).pipe(delay(1200));
  }

  private mockStreamText(text: string): Observable<string> {
    const words = text.split(' ');
    return new Observable<string>((observer) => {
      let index = 0;
      const interval = setInterval(() => {
        if (index < words.length) {
          observer.next(words[index] + (index < words.length - 1 ? ' ' : ''));
          index++;
        } else {
          clearInterval(interval);
          observer.complete();
        }
      }, 40);
      return () => clearInterval(interval);
    });
  }

  private buildExplainMockText(plan: WorkoutPlan, question?: string): string {
    return `Ótima pergunta! Seu plano de ${plan.days.filter((d) => !d.isRestDay).length} dias no nível ${plan.fitnessLevel} é construído com o princípio da sobrecarga progressiva no centro de tudo. Cada dia de treino foca em grupos musculares específicos para maximizar a recuperação e a adaptação. O programa equilibra movimentos compostos — que recrutam o maior número de fibras musculares — com exercícios de isolamento para esculpir e fortalecer cada região. Os dias de descanso são estrategicamente posicionados para permitir que seu sistema nervoso central e seus músculos se reparem e fiquem mais fortes. Mantenha a consistência e você verá resultados mensuráveis em 3 a 4 semanas!`;
  }

  private buildChatMockResponse(message: string): string {
    const msg = message.toLowerCase();
    if (msg.includes('sexo')) {
      return `O sexo é uma atividade física moderada que pode complementar seu estilo de vida ativo. Em termos de gasto calórico, não substitui um treino intenso, mas contribui para o bem-estar hormonal e redução do estresse, o que indiretamente ajuda na recuperação muscular. O mais importante é o equilíbrio!`;
    }
    if (msg.includes('nutrição') || msg.includes('comer') || msg.includes('dieta')) {
      return `A nutrição é a base dos seus resultados. Priorize proteínas para reconstrução muscular (1.6g a 2.2g por kg) e carboidratos complexos para energia. Não esqueça dos micronutrientes vindos de vegetais e da hidratação constante.`;
    }
    if (msg.includes('treino') || msg.includes('exercício') || msg.includes('academia')) {
      return `Seu treino deve ser focado em sobrecarga progressiva. Tente aumentar a carga, o volume ou diminuir o descanso gradualmente. A técnica correta é sempre superior ao peso bruto para evitar lesões.`;
    }
    if (msg.includes('descanso') || msg.includes('sono') || msg.includes('recuperação')) {
      return `O músculo cresce no descanso, não no treino. Garanta 7-9 horas de sono de qualidade e dias de descanso total ou ativo para permitir a reparação tecidual.`;
    }
    return `Essa é uma excelente dúvida! Para o seu nível e objetivo, o foco deve ser na consistência. Pequenos ajustes diários na sua rotina de treino e alimentação trarão os maiores resultados a longo prazo. Como posso detalhar mais algum desses pontos para você?`;
  }

  private buildAdjustmentProfile(plan: WorkoutPlan, reason: string): UserProfile {
    return {
      uid: plan.userId,
      displayName: 'Usuário',
      email: '',
      fitnessLevel: plan.fitnessLevel,
      goals: [reason],
      goal: 'hypertrophy',
      age: 30,
      weight: 75,
      limitations: [],
      injuries: '',
      onboardingCompleted: true,
      createdAt: new Date(),
      preferences: {
        daysPerWeek: plan.days.filter((d) => !d.isRestDay).length,
        sessionDurationMinutes: Math.round(plan.estimatedWeeklyMinutes / 5),
        availableEquipment: ['barbell', 'dumbbell', 'machine', 'bodyweight'],
        focusAreas: ['chest', 'back', 'legs', 'core'],
      },
    };
  }

  private buildMockPlan(profile: UserProfile): WorkoutPlan {
    return {
      id: crypto.randomUUID(),
      userId: profile.uid,
      generatedAt: new Date(),
      weekNumber: 1,
      fitnessLevel: profile.fitnessLevel,
      totalVolume: 52,
      estimatedWeeklyMinutes: 215,
      agentReasoning: `Com base no seu nível de condicionamento ${profile.fitnessLevel} e seus objetivos (${profile.goals.join(', ')}), elaborei uma divisão de ${profile.preferences.daysPerWeek} dias usando a estrutura Empurrar/Puxar/Pernas. Isso maximiza a recuperação muscular entre as sessões enquanto mantém um estímulo de treino consistente. Os movimentos compostos são priorizados pela resposta hormonal e eficiência, com exercícios de isolamento para corrigir pontos mais fracos. A sobrecarga progressiva está incorporada nas faixas de repetição — quando atingir o topo da faixa com facilidade, aumente a carga.`,
      days: [
        {
          day: 1,
          label: 'Segunda',
          focus: 'Empurrar — Peito, Ombros e Tríceps',
          isRestDay: false,
          estimatedMinutes: 55,
          exercises: [
            {
              id: 'ex-1-1',
              name: 'Supino Reto com Barra',
              muscleGroups: ['chest', 'triceps', 'shoulders'],
              sets: 4,
              reps: '6-8',
              restSeconds: 90,
              difficulty: 'intermediate',
              instructions:
                'Deite no banco plano. Pegue a barra um pouco mais larga que a largura dos ombros. Desça com controle até o peito e empurre de forma explosiva.',
              tips: 'Mantenha as escápulas retraídas e os pés bem apoiados no chão.',
              equipment: ['barbell'],
            },
            {
              id: 'ex-1-2',
              name: 'Supino Inclinado com Halteres',
              muscleGroups: ['chest', 'shoulders'],
              sets: 3,
              reps: '10-12',
              restSeconds: 75,
              difficulty: 'intermediate',
              instructions:
                'Ajuste o banco para 30-45° de inclinação. Pressione os halteres da altura dos ombros até a extensão completa.',
              tips: 'Controle a descida — 2 a 3 segundos para baixo para máxima tensão muscular.',
              equipment: ['dumbbell'],
            },
            {
              id: 'ex-1-3',
              name: 'Desenvolvimento Militar',
              muscleGroups: ['shoulders', 'triceps'],
              sets: 3,
              reps: '8-10',
              restSeconds: 75,
              difficulty: 'intermediate',
              instructions:
                'Pressione a barra da altura dos ombros até o bloqueio completo acima da cabeça. Desça com controle.',
              tips: 'Contraia o core e mantenha as costelas abaixadas durante todo o movimento.',
              equipment: ['barbell'],
            },
            {
              id: 'ex-1-4',
              name: 'Elevação Lateral',
              muscleGroups: ['shoulders'],
              sets: 3,
              reps: '12-15',
              restSeconds: 60,
              difficulty: 'beginner',
              instructions:
                'Com leve flexão nos cotovelos, eleve os halteres lateralmente até a altura dos ombros.',
              tips: 'Guie pelo cotovelo, não pelo pulso. Evite encolher os ombros.',
              equipment: ['dumbbell'],
            },
            {
              id: 'ex-1-5',
              name: 'Tríceps Corda no Cabo',
              muscleGroups: ['triceps'],
              sets: 3,
              reps: '12-15',
              restSeconds: 60,
              difficulty: 'beginner',
              instructions:
                'Acople a corda ao cabo alto. Empurre para baixo abrindo a corda no final até estender completamente os braços.',
              tips: 'Mantenha os cotovelos fixados próximos ao corpo durante todo o movimento.',
              equipment: ['machine'],
            },
          ],
        },
        {
          day: 2,
          label: 'Terça',
          focus: 'Puxar — Costas e Bíceps',
          isRestDay: false,
          estimatedMinutes: 55,
          exercises: [
            {
              id: 'ex-2-1',
              name: 'Levantamento Terra',
              muscleGroups: ['back', 'legs', 'core'],
              sets: 4,
              reps: '4-6',
              restSeconds: 120,
              difficulty: 'intermediate',
              instructions:
                'Pés na largura do quadril, barra sobre o meio do pé. Quadril para trás, pegue a barra e empurre o chão para ficar de pé.',
              tips: 'Mantenha a coluna neutra. Pense em "empurrar o chão" e não em "puxar a barra".',
              equipment: ['barbell'],
            },
            {
              id: 'ex-2-2',
              name: 'Remada com Barra',
              muscleGroups: ['back', 'biceps'],
              sets: 3,
              reps: '8-10',
              restSeconds: 90,
              difficulty: 'intermediate',
              instructions: 'Incline o tronco a 45°. Puxe a barra em direção ao peito baixo, liderando com os cotovelos.',
              tips: 'Aproxime as escápulas no ponto mais alto. Evite movimentos bruscos.',
              equipment: ['barbell'],
            },
            {
              id: 'ex-2-3',
              name: 'Barra Fixa',
              muscleGroups: ['back', 'biceps'],
              sets: 3,
              reps: '6-10',
              restSeconds: 90,
              difficulty: 'intermediate',
              instructions:
                'Suspenda-se na barra com pegada pronada. Puxe o peito até a barra e desça com controle.',
              tips: 'Amplitude total de movimento — comece com os braços completamente estendidos a cada repetição.',
              equipment: ['bodyweight'],
            },
            {
              id: 'ex-2-4',
              name: 'Face Pull no Cabo',
              muscleGroups: ['shoulders', 'back'],
              sets: 3,
              reps: '15-20',
              restSeconds: 60,
              difficulty: 'beginner',
              instructions:
                'Ajuste o cabo na altura do rosto. Puxe as alças em direção ao rosto com cotovelos altos e abertos.',
              tips: 'Excelente para saúde do ombro. Foque na contração do deltoide posterior.',
              equipment: ['machine'],
            },
            {
              id: 'ex-2-5',
              name: 'Rosca Martelo',
              muscleGroups: ['biceps'],
              sets: 3,
              reps: '12-15',
              restSeconds: 60,
              difficulty: 'beginner',
              instructions:
                'Pegada neutra (polegares para cima). Rosque os halteres alternadamente até a altura dos ombros.',
              tips: 'Mantenha os braços superiores fixos. Desça devagar.',
              equipment: ['dumbbell'],
            },
          ],
        },
        {
          day: 3,
          label: 'Quarta',
          focus: 'Recuperação Ativa',
          isRestDay: true,
          estimatedMinutes: 20,
          exercises: [],
        },
        {
          day: 4,
          label: 'Quinta',
          focus: 'Pernas — Quadríceps, Isquiotibiais e Glúteos',
          isRestDay: false,
          estimatedMinutes: 65,
          exercises: [
            {
              id: 'ex-4-1',
              name: 'Agachamento com Barra',
              muscleGroups: ['legs', 'glutes', 'core'],
              sets: 4,
              reps: '6-8',
              restSeconds: 120,
              difficulty: 'intermediate',
              instructions:
                'Barra no trapézio superior. Agache até as coxas paralelas ou abaixo. Empurre através dos calcanhares para subir.',
              tips: 'Mantenha o peito erguido e os joelhos alinhados com os pés. A profundidade é essencial.',
              equipment: ['barbell'],
            },
            {
              id: 'ex-4-2',
              name: 'Levantamento Terra Romeno',
              muscleGroups: ['legs', 'glutes'],
              sets: 3,
              reps: '10-12',
              restSeconds: 90,
              difficulty: 'intermediate',
              instructions:
                'Em pé, empurre os quadris para trás e desça a barra ao longo das pernas até sentir o alongamento dos isquiotibiais. Retorne.',
              tips: 'Leve flexão nos joelhos. Sinta o alongamento profundo dos isquiotibiais na parte inferior.',
              equipment: ['barbell'],
            },
            {
              id: 'ex-4-3',
              name: 'Leg Press',
              muscleGroups: ['legs', 'glutes'],
              sets: 3,
              reps: '12-15',
              restSeconds: 75,
              difficulty: 'beginner',
              instructions:
                'Pés na largura dos ombros na plataforma. Desça até 90° de flexão nos joelhos e empurre de volta.',
              tips: 'Não trave os joelhos completamente no topo do movimento.',
              equipment: ['machine'],
            },
            {
              id: 'ex-4-4',
              name: 'Avanço Caminhando',
              muscleGroups: ['legs', 'glutes'],
              sets: 3,
              reps: '12 cada perna',
              restSeconds: 75,
              difficulty: 'intermediate',
              instructions:
                'Dê um passo à frente em posição de avanço, abaixe o joelho traseiro próximo ao chão e impulsione com o pé da frente.',
              tips: 'Mantenha o tronco ereto. O joelho da frente não deve ultrapassar os dedos do pé.',
              equipment: ['bodyweight'],
            },
            {
              id: 'ex-4-5',
              name: 'Flexão de Joelho (Leg Curl)',
              muscleGroups: ['legs'],
              sets: 3,
              reps: '12-15',
              restSeconds: 60,
              difficulty: 'beginner',
              instructions: 'Deitado de bruços na máquina. Flex os calcanhares em direção aos glúteos e retorne devagar.',
              tips: 'Amplitude total de movimento. Pause no topo do movimento.',
              equipment: ['machine'],
            },
          ],
        },
        {
          day: 5,
          label: 'Sexta',
          focus: 'Corpo Inteiro — Potência e Core',
          isRestDay: false,
          estimatedMinutes: 50,
          exercises: [
            {
              id: 'ex-5-1',
              name: 'Clean and Press com Halteres',
              muscleGroups: ['full_body', 'shoulders'],
              sets: 3,
              reps: '6-8',
              restSeconds: 90,
              difficulty: 'intermediate',
              instructions:
                'Puxada explosiva da posição suspensa, receba os halteres nos ombros e pressione acima da cabeça.',
              tips: 'Foque no impulso do quadril. É um movimento de potência — velocidade é essencial.',
              equipment: ['dumbbell'],
            },
            {
              id: 'ex-5-2',
              name: 'Roda de Abdominal (Ab Wheel)',
              muscleGroups: ['core'],
              sets: 3,
              reps: '8-12',
              restSeconds: 75,
              difficulty: 'intermediate',
              instructions:
                'Ajoelhe no chão. Role a roda para frente até quase ficar paralelo ao chão e puxe de volta.',
              tips: 'Mantenha os quadris baixos e o core contraído. Não deixe a lombar ceder.',
              equipment: ['bodyweight'],
            },
            {
              id: 'ex-5-3',
              name: 'Prancha Isométrica',
              muscleGroups: ['core'],
              sets: 3,
              reps: '45-60s',
              restSeconds: 60,
              difficulty: 'beginner',
              instructions:
                'Antebraços no chão, corpo em linha reta da cabeça aos calcanhares. Segure a posição.',
              tips: 'Contraia glúteos e abdômen. Respire de forma constante durante a sustentação.',
              equipment: ['bodyweight'],
            },
            {
              id: 'ex-5-4',
              name: 'Woodchop no Cabo',
              muscleGroups: ['core'],
              sets: 3,
              reps: '12 cada lado',
              restSeconds: 60,
              difficulty: 'intermediate',
              instructions:
                'Ajuste o cabo alto. Puxe diagonalmente pelo corpo de cima para baixo, rotacionando o tronco.',
              tips: 'Gire os pés e mova o quadril, não apenas os ombros.',
              equipment: ['machine'],
            },
          ],
        },
        {
          day: 6,
          label: 'Sábado',
          focus: 'Cardio e Mobilidade',
          isRestDay: true,
          estimatedMinutes: 30,
          exercises: [],
        },
        {
          day: 7,
          label: 'Domingo',
          focus: 'Descanso Total',
          isRestDay: true,
          estimatedMinutes: 0,
          exercises: [],
        },
      ],
    };
  }
}
