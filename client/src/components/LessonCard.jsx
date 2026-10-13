import { BookOpen, Building2, Clock, DoorOpen, User, Users } from 'lucide-react';
import { Badge } from './ui.jsx';
import { WEEK_LABEL } from '../lib/schedule.js';

const STATUS_STYLE = {
  now: 'border-indigo-500 ring-4 ring-indigo-100',
  next: 'border-indigo-300',
  past: 'opacity-55',
};

export default function LessonCard({ lesson, status, note, showTeacher = false, dimmed = false }) {
  return (
    <article className={`card relative flex gap-4 p-4 ${STATUS_STYLE[status] || ''} ${dimmed ? 'opacity-50' : ''}`}>
      <div className="flex w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-indigo-50 py-2 text-indigo-700">
        <span className="text-base font-bold leading-none">{lesson.startTime}</span>
        <span className="my-1 h-3 w-px bg-indigo-200" />
        <span className="text-xs leading-none">{lesson.endTime}</span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          {status === 'now' && <Badge tone="indigo">Hozir</Badge>}
          {status === 'next' && <Badge tone="green">Keyingi</Badge>}
          {lesson.pairNumber && <Badge>{lesson.pairNumber}-juftlik</Badge>}
          {lesson.lessonType && <Badge tone="amber">{lesson.lessonType}</Badge>}
          {WEEK_LABEL[lesson.weekType] && <Badge tone="red">{WEEK_LABEL[lesson.weekType]}</Badge>}
        </div>

        <h3 className="mt-1.5 flex items-start gap-1.5 font-semibold leading-snug text-slate-900">
          <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
          {lesson.subject}
        </h3>

        <dl className="mt-2 grid grid-cols-1 gap-x-4 gap-y-1 text-sm text-slate-600 sm:grid-cols-2">
          {(lesson.room || lesson.building) && (
            <div className="flex items-center gap-1.5">
              <DoorOpen className="h-4 w-4 shrink-0 text-slate-400" />
              <span className="font-medium text-slate-800">{lesson.room ? `${lesson.room}-xona` : '—'}</span>
              {lesson.building && (
                <span className="flex items-center gap-1 text-slate-500">
                  <Building2 className="ml-1 h-3.5 w-3.5" />
                  {lesson.building}
                </span>
              )}
            </div>
          )}
          {lesson.groupName && (
            <div className="flex items-start gap-1.5 sm:col-span-2">
              <Users className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              <span>
                {lesson.groupName}
                {lesson.sheetName && <span className="text-slate-400"> · {lesson.sheetName}</span>}
              </span>
            </div>
          )}
          {showTeacher && lesson.teacher && (
            <div className="flex items-center gap-1.5 sm:col-span-2">
              <User className="h-4 w-4 shrink-0 text-slate-400" />
              {lesson.teacher.fullName}
            </div>
          )}
        </dl>

        {note && (
          <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-indigo-600">
            <Clock className="h-3.5 w-3.5" />
            {note}
          </p>
        )}
      </div>
    </article>
  );
}
