import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router';
import type { QuizEditQuestion } from '@lms/shared-types';
import { QUIZ_OPTION_COUNT, QUIZ_QUESTION_COUNT } from '@lms/shared-constants';
import { quizEditSchema } from '@lms/shared-validation';
import { Card, ErrorText, Loading, PageTitle } from '../../components/ui';
import { api } from '../../lib/apiClient';
import { errMsg } from '../../lib/errors';
import { toast } from '../../store/toast.store';

const blank = (): QuizEditQuestion => ({ text: '', options: Array(QUIZ_OPTION_COUNT).fill(''), correctIndex: 0 });

/** Exactly 10 questions, 4 options each, one correct option per question. */
export function QuizEditorPage() {
  const { weekId } = useParams();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<QuizEditQuestion[]>([]);
  const [error, setError] = useState('');
  const { data, isLoading } = useQuery({
    queryKey: ['teach-quiz', weekId],
    queryFn: () => api.get<{ weekTitle: string; weekNumber: number; questions: QuizEditQuestion[] }>(`/teach/weeks/${weekId}/quiz`),
    gcTime: 0,
  });

  useEffect(() => {
    if (!data) return;
    setQuestions(Array.from({ length: QUIZ_QUESTION_COUNT }, (_, i) => data.questions[i] ?? blank()));
  }, [data]);

  const change = (i: number, patch: Partial<QuizEditQuestion>) => setQuestions(questions.map((q, k) => (k === i ? { ...q, ...patch } : q)));

  async function save() {
    const parsed = quizEditSchema.safeParse({ questions });
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? 'Fill every question and option');
    try {
      await api.put(`/teach/weeks/${weekId}/quiz`, parsed.data);
      toast('Quiz saved');
      navigate(-1);
    } catch (e) {
      setError(errMsg(e));
    }
  }

  if (isLoading || !data) return <Loading />;
  return (
    <>
      <PageTitle title={`Week ${data.weekNumber} quiz`} sub={`${data.weekTitle} · ${QUIZ_QUESTION_COUNT} multiple-choice questions. Select the correct option for each.`} />
      {questions.map((q, i) => (
        <Card key={i} className="flex flex-col gap-2">
          <input className="input" placeholder={`Question ${i + 1}`} aria-label={`Question ${i + 1}`} value={q.text} onChange={(e) => change(i, { text: e.target.value })} />
          {q.options.map((o, j) => (
            <label key={j} className="flex items-center gap-3">
              <input type="radio" name={`correct${i}`} checked={q.correctIndex === j} onChange={() => change(i, { correctIndex: j })} aria-label={`Option ${'ABCD'[j]} is correct`} className="h-4 w-4 accent-[var(--accent)]" />
              <input className="input" placeholder={`Option ${'ABCD'[j]}`} aria-label={`Question ${i + 1} option ${'ABCD'[j]}`} value={o} onChange={(e) => change(i, { options: q.options.map((x, k) => (k === j ? e.target.value : x)) })} />
            </label>
          ))}
        </Card>
      ))}
      {error && <ErrorText>{error}</ErrorText>}
      <div className="flex gap-2"><button className="btn-ghost" onClick={() => navigate(-1)}>Cancel</button><button className="btn-primary" onClick={save}>Save quiz</button></div>
    </>
  );
}
