import { Injectable } from '@angular/core';
import { Observable, of, delay, throwError, from, switchMap } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
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

/**
 * AiService — the ONLY entry point for Gemini API calls.
 *
 * Responsibilities:
 *  - Return Observables only (never mutates state).
 *  - Stream partial text responses for chat (typewriter effect).
 *  - Parse AI JSON output into strongly typed models.
 *  - Fall back to mock data when `environment.useMockAi = true`.
 *
 * Agents consume these Observables and push results to StateService.
 */
@Injectable({ providedIn: 'root' })
export class AiService {
  // ─── Public API ────────────────────────────────────────────────────────────

  /**
   * Generate a full workout plan for a user.
   * Returns an Observable<WorkoutPlan> (single emit).
   */
  generateWorkout(profile: UserProfile): Observable<WorkoutPlan> {
    if (environment.useMockAi) {
      return this.mockGenerateWorkout(profile);
    }
    return this.geminiGenerateWorkout(profile);
  }

  /**
   * Explain a workout plan or answer a fitness question.
   * Returns a streaming Observable<string> — each emission is a new chunk/token.
   * Use `scan((acc, chunk) => acc + chunk)` in the consumer to accumulate.
   */
  explainWorkout(plan: WorkoutPlan, question?: string): Observable<string> {
    if (environment.useMockAi) {
      return this.mockStreamText(this.buildExplainMockText(plan, question));
    }
    return this.geminiStream(this.buildExplainPrompt(plan, question));
  }

  /**
   * Adjust an existing plan based on session feedback.
   * Returns an Observable<WorkoutPlan> (single emit).
   */
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

  /**
   * Send a freeform chat message to the coach.
   * Returns a streaming Observable<string>.
   */
  chat(message: string, context: string): Observable<string> {
    if (environment.useMockAi) {
      return this.mockStreamText(this.buildChatMockResponse(message));
    }
    return this.geminiStream(this.buildChatPrompt(message, context));
  }

  // ─── Gemini Integration ────────────────────────────────────────────────────

  private async getGeminiModel() {
    // Dynamic import — avoids bundling the SDK when mock mode is on
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(environment.geminiApiKey);
    return genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
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

      return () => {}; // cleanup — Gemini SDK streams auto-terminate
    });
  }

  // ─── Prompt Builders ──────────────────────────────────────────────────────

  private buildWorkoutPrompt(
    profile: UserProfile,
    existingPlan?: WorkoutPlan,
    feedbackReason?: string,
  ): string {
    const adjustNote = existingPlan
      ? `The user gave feedback on the previous plan: "${feedbackReason}". Adjust accordingly.`
      : '';

    return `
You are an expert personal trainer AI. Generate a personalized ${profile.preferences.daysPerWeek}-day workout plan.

User Profile:
- Fitness Level: ${profile.fitnessLevel}
- Goals: ${profile.goals.join(', ')}
- Session Duration: ${profile.preferences.sessionDurationMinutes} minutes
- Available Equipment: ${profile.preferences.availableEquipment.join(', ')}
- Focus Areas: ${profile.preferences.focusAreas.join(', ')}

${adjustNote}

Return ONLY valid JSON matching this exact schema (no markdown, no extra text):
{
  "agentReasoning": "string — explain your reasoning for this plan",
  "fitnessLevel": "${profile.fitnessLevel}",
  "totalVolume": number,
  "estimatedWeeklyMinutes": number,
  "days": [
    {
      "day": 1,
      "label": "Monday",
      "focus": "string",
      "isRestDay": false,
      "estimatedMinutes": 45,
      "exercises": [
        {
          "id": "unique-string",
          "name": "string",
          "muscleGroups": ["chest"],
          "sets": 3,
          "reps": "8-12",
          "restSeconds": 60,
          "difficulty": "intermediate",
          "instructions": "string",
          "tips": "string",
          "equipment": ["barbell"]
        }
      ]
    }
  ]
}
Generate exactly ${profile.preferences.daysPerWeek} training days plus rest days to fill 7 days.
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
You are an AI fitness coach. Answer the user's fitness question concisely and helpfully.

${context ? `Context: ${context}` : ''}

User: ${message}

Respond in 1-2 paragraphs max. Be specific, practical, and motivating.
`.trim();
  }

  // ─── Response Parser ──────────────────────────────────────────────────────

  private parseWorkoutResponse(raw: string, profile: UserProfile): WorkoutPlan {
    // Strip any accidental markdown code fences
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
      muscleGroups: e.muscleGroups as MuscleGroup[],
      sets: e.sets,
      reps: e.reps,
      restSeconds: e.restSeconds,
      difficulty: e.difficulty as FitnessLevel,
      instructions: e.instructions,
      tips: e.tips,
      equipment: e.equipment as Equipment[],
    };
  }

  // ─── Mock Data ────────────────────────────────────────────────────────────

  private mockGenerateWorkout(profile: UserProfile): Observable<WorkoutPlan> {
    const plan = this.buildMockPlan(profile);
    // Simulate network latency
    return of(plan).pipe(delay(1800));
  }

  private mockAdjustWorkout(plan: WorkoutPlan, reason: string): Observable<WorkoutPlan> {
    const adjusted: WorkoutPlan = {
      ...plan,
      id: crypto.randomUUID(),
      generatedAt: new Date(),
      weekNumber: plan.weekNumber + 1,
      agentReasoning: `Adjusted based on feedback: "${reason}". Volume and intensity modified accordingly.`,
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
    return `Great question! Your ${plan.fitnessLevel} level ${plan.days.filter((d) => !d.isRestDay).length}-day plan is designed with progressive overload principles at its core. Each training day targets specific muscle groups to maximize recovery and adaptation. The program balances compound movements — which recruit the most muscle fibers — with isolation work to sculpt and strengthen each area. Rest days are strategically placed to allow your central nervous system and muscles to repair and grow stronger. Stick to it consistently and you'll see measurable results within 3-4 weeks!`;
  }

  private buildChatMockResponse(message: string): string {
    const responses = [
      `That's a fantastic question about fitness! The key principle here is progressive overload — consistently increasing the challenge on your muscles over time. Whether through more weight, more reps, or reduced rest, your body needs a reason to adapt and grow stronger. Focus on compound movements like squats, deadlifts, and bench press as your foundation, then layer in isolation work. Recovery is equally important: aim for 7-9 hours of sleep and ensure adequate protein intake (1.6-2.2g per kg of bodyweight). You've got this!`,
      `Nutrition and training are two sides of the same coin for ${message.toLowerCase().includes('weight') ? 'weight management' : 'performance improvement'}. On training days, ensure you consume enough carbohydrates to fuel your sessions. Post-workout, prioritize protein within 30-60 minutes to kickstart muscle protein synthesis. Hydration is often overlooked but critical — aim for at least 2-3 liters of water daily, more on intense training days. Small consistent habits compound into massive results over time.`,
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  private buildAdjustmentProfile(plan: WorkoutPlan, reason: string): UserProfile {
    return {
      uid: plan.userId,
      displayName: 'User',
      email: '',
      fitnessLevel: plan.fitnessLevel,
      goals: [reason],
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
      agentReasoning: `Based on your ${profile.fitnessLevel} fitness level and goals (${profile.goals.join(', ')}), I've designed a balanced ${profile.preferences.daysPerWeek}-day training split using a Push/Pull/Legs structure. This maximizes muscle recovery between sessions while delivering consistent training stimulus. Compound movements are prioritized for hormonal response and efficiency, with isolation work to address weaker links. Progressive overload is built into the rep ranges — when you hit the top of the range comfortably, increase the weight.`,
      days: [
        {
          day: 1,
          label: 'Monday',
          focus: 'Push — Chest, Shoulders & Triceps',
          isRestDay: false,
          estimatedMinutes: 55,
          exercises: [
            {
              id: 'ex-1-1',
              name: 'Barbell Bench Press',
              muscleGroups: ['chest', 'triceps', 'shoulders'],
              sets: 4,
              reps: '6-8',
              restSeconds: 90,
              difficulty: 'intermediate',
              instructions:
                'Lie flat on the bench. Grip bar slightly wider than shoulder-width. Lower to chest with control, press explosively.',
              tips: 'Keep shoulder blades retracted and feet flat on the floor.',
              equipment: ['barbell'],
            },
            {
              id: 'ex-1-2',
              name: 'Incline Dumbbell Press',
              muscleGroups: ['chest', 'shoulders'],
              sets: 3,
              reps: '10-12',
              restSeconds: 75,
              difficulty: 'intermediate',
              instructions:
                'Set bench to 30-45° incline. Press dumbbells from shoulder level to full extension.',
              tips: 'Control the descent — 2-3 seconds down for maximum muscle tension.',
              equipment: ['dumbbell'],
            },
            {
              id: 'ex-1-3',
              name: 'Overhead Press',
              muscleGroups: ['shoulders', 'triceps'],
              sets: 3,
              reps: '8-10',
              restSeconds: 75,
              difficulty: 'intermediate',
              instructions:
                'Press bar from shoulder height to full lockout overhead. Lower with control.',
              tips: 'Brace your core and keep ribs down throughout the movement.',
              equipment: ['barbell'],
            },
            {
              id: 'ex-1-4',
              name: 'Lateral Raises',
              muscleGroups: ['shoulders'],
              sets: 3,
              reps: '12-15',
              restSeconds: 60,
              difficulty: 'beginner',
              instructions:
                'With slight elbow bend, raise dumbbells laterally to shoulder height.',
              tips: 'Lead with elbows, not wrists. Avoid shrugging.',
              equipment: ['dumbbell'],
            },
            {
              id: 'ex-1-5',
              name: 'Triceps Rope Pushdown',
              muscleGroups: ['triceps'],
              sets: 3,
              reps: '12-15',
              restSeconds: 60,
              difficulty: 'beginner',
              instructions:
                'Attach rope to high cable. Push down spreading rope at the bottom until arms are fully extended.',
              tips: 'Keep elbows pinned to sides throughout the movement.',
              equipment: ['machine'],
            },
          ],
        },
        {
          day: 2,
          label: 'Tuesday',
          focus: 'Pull — Back & Biceps',
          isRestDay: false,
          estimatedMinutes: 55,
          exercises: [
            {
              id: 'ex-2-1',
              name: 'Deadlift',
              muscleGroups: ['back', 'legs', 'core'],
              sets: 4,
              reps: '4-6',
              restSeconds: 120,
              difficulty: 'intermediate',
              instructions:
                'Hip-width stance, bar over mid-foot. Hinge hips back, grip bar, drive through floor to stand.',
              tips: 'Maintain neutral spine. Think "push the floor away" not "pull the bar up".',
              equipment: ['barbell'],
            },
            {
              id: 'ex-2-2',
              name: 'Barbell Rows',
              muscleGroups: ['back', 'biceps'],
              sets: 3,
              reps: '8-10',
              restSeconds: 90,
              difficulty: 'intermediate',
              instructions: 'Hinge forward 45°. Pull bar to lower chest, leading with elbows.',
              tips: 'Squeeze shoulder blades together at top. Avoid jerking.',
              equipment: ['barbell'],
            },
            {
              id: 'ex-2-3',
              name: 'Pull-Ups',
              muscleGroups: ['back', 'biceps'],
              sets: 3,
              reps: '6-10',
              restSeconds: 90,
              difficulty: 'intermediate',
              instructions:
                'Hang from bar with overhand grip. Pull chest to bar, lower with control.',
              tips: 'Full range of motion — start from dead hang each rep.',
              equipment: ['bodyweight'],
            },
            {
              id: 'ex-2-4',
              name: 'Face Pulls',
              muscleGroups: ['shoulders', 'back'],
              sets: 3,
              reps: '15-20',
              restSeconds: 60,
              difficulty: 'beginner',
              instructions:
                'Set cable at face height. Pull handles toward face, elbows high and flared out.',
              tips: 'Great for shoulder health. Focus on rear delt contraction.',
              equipment: ['machine'],
            },
            {
              id: 'ex-2-5',
              name: 'Hammer Curls',
              muscleGroups: ['biceps'],
              sets: 3,
              reps: '12-15',
              restSeconds: 60,
              difficulty: 'beginner',
              instructions:
                'Neutral grip (thumbs up). Curl dumbbells alternately to shoulder height.',
              tips: 'Keep upper arms stationary. Slow on the way down.',
              equipment: ['dumbbell'],
            },
          ],
        },
        {
          day: 3,
          label: 'Wednesday',
          focus: 'Active Recovery',
          isRestDay: true,
          estimatedMinutes: 20,
          exercises: [],
        },
        {
          day: 4,
          label: 'Thursday',
          focus: 'Legs — Quads, Hamstrings & Glutes',
          isRestDay: false,
          estimatedMinutes: 65,
          exercises: [
            {
              id: 'ex-4-1',
              name: 'Barbell Back Squat',
              muscleGroups: ['legs', 'glutes', 'core'],
              sets: 4,
              reps: '6-8',
              restSeconds: 120,
              difficulty: 'intermediate',
              instructions:
                'Bar on upper traps. Squat until thighs parallel or below. Drive through heels.',
              tips: 'Keep chest up, knees tracking over toes. Depth is king.',
              equipment: ['barbell'],
            },
            {
              id: 'ex-4-2',
              name: 'Romanian Deadlift',
              muscleGroups: ['legs', 'glutes'],
              sets: 3,
              reps: '10-12',
              restSeconds: 90,
              difficulty: 'intermediate',
              instructions:
                'Start standing. Push hips back, lower bar along legs until hamstring stretch, return.',
              tips: 'Soft bend in knees. Feel a deep hamstring stretch at the bottom.',
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
                'Place feet shoulder-width on platform. Lower until 90° knee angle, press back.',
              tips: 'Do not lock knees fully at top of movement.',
              equipment: ['machine'],
            },
            {
              id: 'ex-4-4',
              name: 'Walking Lunges',
              muscleGroups: ['legs', 'glutes'],
              sets: 3,
              reps: '12 each leg',
              restSeconds: 75,
              difficulty: 'intermediate',
              instructions:
                'Step forward into lunge, lower back knee near floor, drive forward with front foot.',
              tips: 'Keep torso upright. Front knee should not pass toes.',
              equipment: ['bodyweight'],
            },
            {
              id: 'ex-4-5',
              name: 'Leg Curl',
              muscleGroups: ['legs'],
              sets: 3,
              reps: '12-15',
              restSeconds: 60,
              difficulty: 'beginner',
              instructions: 'Lying face down on machine. Curl heels toward glutes, slowly return.',
              tips: 'Full range of motion. Pause at top of movement.',
              equipment: ['machine'],
            },
          ],
        },
        {
          day: 5,
          label: 'Friday',
          focus: 'Full Body Power & Core',
          isRestDay: false,
          estimatedMinutes: 50,
          exercises: [
            {
              id: 'ex-5-1',
              name: 'Dumbbell Clean & Press',
              muscleGroups: ['full_body', 'shoulders'],
              sets: 3,
              reps: '6-8',
              restSeconds: 90,
              difficulty: 'intermediate',
              instructions:
                'Explosive pull from hang position, catch dumbbells at shoulders, press overhead.',
              tips: 'Focus on hip drive. This is a power movement — speed is key.',
              equipment: ['dumbbell'],
            },
            {
              id: 'ex-5-2',
              name: 'Ab Wheel Rollout',
              muscleGroups: ['core'],
              sets: 3,
              reps: '8-12',
              restSeconds: 75,
              difficulty: 'intermediate',
              instructions:
                'Kneel on floor. Roll wheel forward until almost parallel to floor, pull back.',
              tips: 'Keep hips low and core braced. Do not let lower back sag.',
              equipment: ['bodyweight'],
            },
            {
              id: 'ex-5-3',
              name: 'Plank',
              muscleGroups: ['core'],
              sets: 3,
              reps: '45-60s',
              restSeconds: 60,
              difficulty: 'beginner',
              instructions:
                'Forearms on floor, body in straight line from head to heels. Hold.',
              tips: 'Squeeze glutes and abs. Breathe steadily through the hold.',
              equipment: ['bodyweight'],
            },
            {
              id: 'ex-5-4',
              name: 'Cable Woodchop',
              muscleGroups: ['core'],
              sets: 3,
              reps: '12 each side',
              restSeconds: 60,
              difficulty: 'intermediate',
              instructions:
                'Set cable high. Pull diagonally across body from high to low, rotating torso.',
              tips: 'Pivot feet and rotate through hips, not just shoulders.',
              equipment: ['machine'],
            },
          ],
        },
        {
          day: 6,
          label: 'Saturday',
          focus: 'Cardio & Mobility',
          isRestDay: true,
          estimatedMinutes: 30,
          exercises: [],
        },
        {
          day: 7,
          label: 'Sunday',
          focus: 'Full Rest',
          isRestDay: true,
          estimatedMinutes: 0,
          exercises: [],
        },
      ],
    };
  }
}
