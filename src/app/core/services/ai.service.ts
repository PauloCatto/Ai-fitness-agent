import { Injectable, inject } from '@angular/core';
import { Observable, of, throwError, from, switchMap, firstValueFrom } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { map, catchError } from 'rxjs/operators';
import { ApiService } from './api.service';
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
  private readonly api = inject(ApiService);
  private cachedApiKey: string | null = null;

  private async fetchApiKey(): Promise<string> {
    try {
      if (this.cachedApiKey) return this.cachedApiKey;
      const res = await firstValueFrom(
        this.http.get<{ apiKey: string }>('/config/gemini-key').pipe(
          catchError(err => throwError(() => new Error('Falha ao obter chave da API do backend. Verifique se o servidor está rodando.')))
        )
      );

      const cleanKey = res.apiKey.trim();
      this.cachedApiKey = cleanKey;
      return cleanKey;
    } catch (err: any) {
      console.error('Erro na Busca da Chave:', err);
      throw err;
    }
  }

  generateWorkout(profile: UserProfile): Observable<WorkoutPlan> {
    return this.geminiGenerateWorkout(profile);
  }

  saveWorkoutPlan(plan: WorkoutPlan): Observable<WorkoutPlan> {
    return this.api.post<any>('/workoutplans', {
      planData: JSON.stringify(plan)
    }).pipe(
      map(() => plan),
      catchError(err => throwError(() => new Error(`Falha ao salvar plano: ${err.message}`)))
    );
  }

  getLatestWorkoutPlan(): Observable<WorkoutPlan | null> {
    return this.api.get<any>('/workoutplans/latest').pipe(
      map(res => {
        if (!res || !res.planData) return null;
        const plan = JSON.parse(res.planData) as WorkoutPlan;
        plan.generatedAt = new Date(plan.generatedAt);
        return plan;
      }),
      catchError(() => of(null))
    );
  }

  explainWorkout(plan: WorkoutPlan, question?: string): Observable<string> {
    return this.geminiStream(this.buildExplainPrompt(plan, question));
  }

  adjustWorkout(plan: WorkoutPlan, feedbackReason: string): Observable<WorkoutPlan> {
    return this.geminiGenerateWorkout(
      this.buildAdjustmentProfile(plan, feedbackReason),
      plan,
      feedbackReason,
    );
  }

  chat(message: string, context: string): Observable<string> {
    return this.geminiStream(this.buildChatPrompt(message, context));
  }

  suggestAlternative(exercise: Exercise, profile: UserProfile): Observable<Exercise> {
    const prompt = this.buildSwapPrompt(exercise, profile);
    return from(this.getGeminiModel()).pipe(
      switchMap((model) => from(model.generateContent(prompt))),
      map((result) => {
        const raw = result.response.text();
        const cleaned = raw.replace(/```json|```/g, '').trim();
        const dto = JSON.parse(cleaned) as AiExerciseDto;
        return this.mapExercise(dto);
      }),
      catchError((err) => {
        console.error('Erro ao sugerir alternativa:', err);
        return throwError(() => new Error(`Falha na sugestão de troca: ${err.message}`));
      })
    );
  }

  private async getGeminiModel() {
    const apiKey = await this.fetchApiKey();
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);
    return genAI.getGenerativeModel({ model: 'gemini-2.5-flash' }, { apiVersion: 'v1' });
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
      catchError((err) => {
        console.error('Erro Detalhado do Gemini:', err);
        return throwError(() => new Error(`Gemini workout generation failed: ${err.message}`));
      }),
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
- Divisão de treino preferida: ${profile.preferences.workoutSplit || 'A critério da IA'}
- Áreas de foco: ${profile.preferences.focusAreas.join(', ') || 'Equilibrado'}
- Preferência de Cardio: ${profile.preferences.cardioMinutes || 0} minutos por sessão
- Duração total por sessão (incluindo cardio): ${profile.preferences.sessionDurationMinutes} minutos
- Equipamentos disponíveis: ${profile.preferences.availableEquipment.join(', ')}
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
    const q = question ?? 'Explique este plano de treino e seus benefícios.';
    return `
Você é um treinador de elite e mentor de bem-estar. Responda à pergunta sobre o plano de treino abaixo.

Pergunta: ${q}

Resumo do Plano:
- Nível: ${plan.fitnessLevel}
- Dias de Treino: ${plan.days.filter(d => !d.isRestDay).length} dias
- Foco: ${plan.days.map((d) => d.focus).join(', ')}
- Lógica do Plano: ${plan.agentReasoning}

DIRETRIZES DE RESPOSTA:
1. Responda em 2-3 parágrafos concisos e motivadores.
2. Seja específico sobre os benefícios para este atleta.
3. Responda obrigatoriamente em PORTUGUÊS BRASILEIRO.
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

  private buildSwapPrompt(exercise: Exercise, profile: UserProfile): string {
    return `
Você é um especialista em biomecânica e prescrição de exercícios.
O usuário deseja substituir o seguinte exercício:
- Nome: ${exercise.name}
- Músculos: ${exercise.muscleGroups.join(', ')}
- Equipamento original: ${exercise.equipment.join(', ')}

Perfil do Usuário:
- Nível: ${profile.fitnessLevel}
- Limitações: ${profile.limitations.join(', ') || 'Nenhuma'}
- Equipamentos disponíveis: ${profile.preferences.availableEquipment.join(', ')}

REGRAS:
1. O novo exercício DEVE trabalhar os mesmos grupos musculares principais.
2. O novo exercício DEVE utilizar apenas os equipamentos disponíveis do usuário.
3. O novo exercício DEVE respeitar as limitações físicas.
4. Retorne APENAS o JSON do exercício.

Retorne no formato JSON exato:
{
  "id": "string-uuid",
  "name": "nome do exercício em português",
  "muscleGroups": ["mesmos do original ou similares"],
  "sets": ${exercise.sets},
  "reps": "${exercise.reps}",
  "restSeconds": ${exercise.restSeconds},
  "difficulty": "${profile.fitnessLevel}",
  "instructions": "instruções detalhadas em português",
  "tips": "dicas de segurança em português",
  "equipment": ["equipamento disponível"]
}
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
}
