import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router';
import type { QuizQuestionDto, QuizResultDto } from '@lms/shared-types';
import { Card, ErrorText, Loading, PageTitle } from '../../components/ui';
import { api } from '../../lib/apiClient';
import { errMsg } from '../../lib/errors';
import { toast } from '../../store/toast.store';

const LETTERS = 'ABCD';

/** 10 multiple-choice questions. All 10 correct completes the week. The server does the grading. */
export function QuizPage() {
  const { id, weekId } = useParams();
  const queryClient = useQueryClient();
  const [answers, setAnswers] = useState<(number | null)[]>(Array(10).fill(null));
  const [result, setResult] = useState<QuizResultDto | null>(null);
  const [error, setError] = useState('');

  const quiz = useQuery({
    queryKey: ['quiz', weekId],
    queryFn: () => api.get<{ title: string; questions: QuizQuestionDto[] }>(`/learning/weeks/${weekId}/quiz`),
    gcTime: 0,
  });

  const submit = useMutation({
    mutationFn: () => api.post<QuizResultDto>(`/learning/weeks/${weekId}/quiz`, { answers }),
    onSuccess: (r) => {
      setResult(r);
      setError('');
      if (r.passed) toast('Week complete');
      void queryClient.invalidateQueries({ queryKey: ['enrollment', id] });
      void queryClient.invalidateQueries({ queryKey: ['enrollments'] });
    },
    onError: (e) => setError(errMsg(e)),
  });

  if (quiz.isLoading) return <Loading />;
  if (quiz.isError) return <><PageTitle title="Quiz" /><ErrorText>{errMsg(quiz.error)}</ErrorText><Link to={`/my-courses/${id}`} className="btn-ghost w-fit">Back to course</Link></>;
  const questions = quiz.data!.questions;
  const wrong = new Map(result?.corrections.map((c) => [c.index, c.correctIndex]));

  return (
    <>
      <PageTitle title={quiz.data!.title} sub="Pick one answer for each question, then submit." />
      {result && (
        <Card className={result.passed ? 'bg-ok-bg' : 'bg-warn-bg'}>
          <h2 className="text-xl font-bold">{result.score} / {result.total} correct</h2>
          <p className="mb-3">{result.passed ? 'This week is complete. Your progress is updated.' : 'You need all 10 correct. Check the marked answers and try again.'}</p>
          {result.passed ? (
            <Link to={`/my-courses/${id}`} className="btn-primary">Back to course</Link>
          ) : (
            <button className="btn-primary" onClick={() => { setResult(null); setAnswers(Array(10).fill(null)); window.scrollTo(0, 0); }}>Try again</button>
          )}
        </Card>
      )}
      {questions.map((q, i) => (
        <Card key={q.id}>
          <fieldset disabled={!!result}>
            <legend className="mb-2 font-semibold">{i + 1}. {q.text}</legend>
            {q.options.map((o, j) => {
              const isCorrect = result && wrong.get(i) === j;
              const isWrongPick = result && wrong.has(i) && answers[i] === j;
              return (
                <label key={j} className={`mt-2 flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border p-3 ${isCorrect ? 'border-ok bg-ok-bg' : isWrongPick ? 'border-bad' : 'border-line'}`}>
                  <input type="radio" name={`q${i}`} checked={answers[i] === j} onChange={() => setAnswers(answers.map((a, k) => (k === i ? j : a)))} className="h-4 w-4 accent-[var(--accent)]" />
                  {LETTERS[j]}. {o}
                </label>
              );
            })}
          </fieldset>
        </Card>
      ))}
      {!result && (
        <Card className="flex flex-wrap items-center justify-between gap-3">
          <span>{answers.filter((a) => a !== null).length} of 10 answered</span>
          <span className="flex gap-2">
            <Link to={`/my-courses/${id}`} className="btn-ghost">Cancel</Link>
            <button className="btn-primary" disabled={answers.includes(null) || submit.isPending} onClick={() => submit.mutate()}>Submit answers</button>
          </span>
          {error && <ErrorText>{error}</ErrorText>}
        </Card>
      )}
    </>
  );
}
