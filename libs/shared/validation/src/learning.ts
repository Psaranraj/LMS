import { z } from 'zod';
import { PLAN_MONTHS, QUIZ_OPTION_COUNT, QUIZ_QUESTION_COUNT } from '@lms/shared-constants';
import { LESSON_TYPES } from '@lms/shared-types';

export const enrollSchema = z.object({
  courseId: z.number().int().positive(),
  planMonths: z.number().refine((n) => (PLAN_MONTHS as readonly number[]).includes(n), 'Choose 1, 3, 6 or 9 months'),
});
export type EnrollInput = z.infer<typeof enrollSchema>;

export const payInstallmentSchema = z.object({ method: z.enum(['UPI', 'CARD', 'NET_BANKING']) });
export type PayInstallmentInput = z.infer<typeof payInstallmentSchema>;

export const submitQuizSchema = z.object({
  answers: z.array(z.number().int().min(0).max(QUIZ_OPTION_COUNT - 1)).length(QUIZ_QUESTION_COUNT),
});
export type SubmitQuizInput = z.infer<typeof submitQuizSchema>;

export const weekTitleSchema = z.object({ title: z.string().trim().min(1).max(120) });

export const lessonSchema = z.object({
  title: z.string().trim().min(1).max(160),
  type: z.enum(LESSON_TYPES),
  url: z.string().trim().min(1).max(500),
});
export type LessonInput = z.infer<typeof lessonSchema>;

export const quizEditSchema = z.object({
  questions: z
    .array(
      z.object({
        text: z.string().trim().min(1, 'Question is empty').max(300),
        options: z.array(z.string().trim().min(1, 'Option is empty').max(200)).length(QUIZ_OPTION_COUNT),
        correctIndex: z.number().int().min(0).max(QUIZ_OPTION_COUNT - 1),
      }),
    )
    .length(QUIZ_QUESTION_COUNT, `A quiz needs exactly ${QUIZ_QUESTION_COUNT} questions`),
});
export type QuizEditInput = z.infer<typeof quizEditSchema>;

export const rejectCertificateSchema = z.object({ reason: z.string().trim().min(1, 'Add a note for the student').max(300) });
