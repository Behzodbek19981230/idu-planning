import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Loader2, UploadCloud, UserPlus } from 'lucide-react';
import { api } from '../../lib/api.js';
import { downloadCredentialsCsv } from '../../lib/credentials.js';
import { Badge, ErrorBox, PageHeader } from '../../components/ui.jsx';

export default function ImportPage() {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [mode, setMode] = useState('replace');
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);

  const pick = (f) => {
    if (!f) return;
    if (!/\.xlsx$/i.test(f.name)) {
      setError(new Error('Faqat .xlsx formatidagi fayl qabul qilinadi'));
      return;
    }
    setFile(f);
    setPreview(null);
    setResult(null);
    setError(null);
  };

  const send = async (dryRun) => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('mode', mode);
    fd.append('dryRun', String(dryRun));
    setBusy(true);
    setError(null);
    try {
      const data = await api.post('/admin/schedule/import', fd);
      if (dryRun) setPreview(data);
      else {
        setResult(data);
        setPreview(null);
        setFile(null);
      }
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Jadvalni import qilish"
        subtitle="Excel (.xlsx) faylidan dars jadvalini yuklang"
        actions={
          <button className="btn-secondary" onClick={() => api.download('/admin/schedule/template', 'dars-jadvali-shablon.xlsx').catch(setError)}>
            <Download className="h-4 w-4" /> Shablon
          </button>
        }
      />

      {result ? (
        <ImportResult result={result} onAgain={reset} />
      ) : (
        <div className="space-y-4">
          <label
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              pick(e.dataTransfer.files[0]);
            }}
            className={`card flex cursor-pointer flex-col items-center border-2 border-dashed px-6 py-10 text-center transition ${
              dragging ? 'border-indigo-500 bg-indigo-50' : 'hover:border-indigo-300'
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              onChange={(e) => pick(e.target.files[0])}
            />
            {file ? (
              <>
                <FileSpreadsheet className="mb-2 h-10 w-10 text-emerald-600" />
                <p className="break-all font-medium">{file.name}</p>
                <p className="text-sm text-slate-500">{(file.size / 1024).toFixed(0)} KB · boshqa fayl tanlash uchun bosing</p>
              </>
            ) : (
              <>
                <UploadCloud className="mb-2 h-10 w-10 text-indigo-500" />
                <p className="font-medium">Faylni tanlang yoki shu yerga tashlang</p>
                <p className="text-sm text-slate-500">Faqat .xlsx, 10 MB gacha</p>
              </>
            )}
          </label>

          <fieldset className="card grid gap-2 p-4 sm:grid-cols-2">
            <legend className="sr-only">Import rejimi</legend>
            {[
              ['replace', 'Almashtirish', "Eski jadval to'liq o'chiriladi va yangisi yoziladi"],
              ['append', "Qo'shish", "Mavjud jadvalga yangi darslar qo'shiladi"],
            ].map(([value, title, desc]) => (
              <label
                key={value}
                className={`flex cursor-pointer gap-3 rounded-xl border p-3 transition ${
                  mode === value ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200'
                }`}
              >
                <input
                  type="radio"
                  name="mode"
                  value={value}
                  checked={mode === value}
                  onChange={() => {
                    setMode(value);
                    setPreview(null);
                  }}
                  className="mt-1 accent-indigo-600"
                />
                <span>
                  <span className="block text-sm font-medium">{title}</span>
                  <span className="block text-xs text-slate-500">{desc}</span>
                </span>
              </label>
            ))}
          </fieldset>

          <ErrorBox error={error} />

          {preview && <PreviewSummary preview={preview} />}

          <div className="flex flex-col gap-2 sm:flex-row">
            {!preview ? (
              <button className="btn-primary flex-1 py-3" disabled={!file || busy} onClick={() => send(true)}>
                {busy && <Loader2 className="h-4 w-4 animate-spin" />} Faylni tekshirish
              </button>
            ) : (
              <>
                <button className="btn-secondary py-3" onClick={reset} disabled={busy}>
                  Bekor qilish
                </button>
                <button className="btn-primary flex-1 py-3" disabled={busy || !preview.lessonsCount} onClick={() => send(false)}>
                  {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                  Tasdiqlash va {preview.lessonsCount} ta darsni yuklash
                </button>
              </>
            )}
          </div>

          <FormatHelp />
        </div>
      )}
    </div>
  );
}

function PreviewSummary({ preview }) {
  return (
    <div className="card space-y-4 p-4">
      <h2 className="font-semibold">Tekshiruv natijasi</h2>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-emerald-50 p-3">
          <div className="text-xl font-bold text-emerald-700">{preview.lessonsCount}</div>
          <div className="text-xs text-emerald-700">dars</div>
        </div>
        <div className="rounded-xl bg-indigo-50 p-3">
          <div className="text-xl font-bold text-indigo-700">{preview.matchedTeachers}</div>
          <div className="text-xs text-indigo-700">mavjud o'qituvchi</div>
        </div>
        <div className="rounded-xl bg-amber-50 p-3">
          <div className="text-xl font-bold text-amber-700">{preview.newTeachers.length}</div>
          <div className="text-xs text-amber-700">yangi o'qituvchi</div>
        </div>
      </div>

      {Object.keys(preview.sheets || {}).length > 0 && (
        <div className="text-sm">
          <p className="mb-1.5 font-medium">Varaqlar (kurslar)</p>
          <ul className="flex flex-wrap gap-1.5">
            {Object.entries(preview.sheets).map(([name, count]) => (
              <li key={name}>
                <Badge tone="indigo">
                  {name}: {count}
                </Badge>
              </li>
            ))}
            {preview.skippedSheets?.map((name) => (
              <li key={name} title="Bu varaq guruhlar jadvali emas, o'tkazib yuborildi">
                <Badge>{name}: o'tkazildi</Badge>
              </li>
            ))}
          </ul>
        </div>
      )}

      {preview.mode === 'replace' && (
        <p className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          Tasdiqlansa, hozirgi jadvaldagi barcha darslar o'chirilib, yangi fayldagilar bilan almashtiriladi.
        </p>
      )}

      {preview.newTeachers.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer font-medium">
            <UserPlus className="mr-1 inline h-4 w-4" /> Yangi o'qituvchilar uchun login/parol yaratiladi ({preview.newTeachers.length})
          </summary>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {preview.newTeachers.map((n) => (
              <li key={n}>
                <Badge>{n}</Badge>
              </li>
            ))}
          </ul>
        </details>
      )}

      {preview.errorsCount > 0 && (
        <div className="text-sm">
          <p className="mb-2 flex items-center gap-1.5 font-medium text-red-700">
            <AlertTriangle className="h-4 w-4" /> {preview.errorsCount} ta qator o'tkazib yuboriladi:
          </p>
          <ul className="max-h-60 space-y-1 overflow-y-auto rounded-xl bg-red-50 p-3 text-red-800">
            {preview.errors.map((e, i) => (
              <li key={i}>
                <span className="font-medium">{e.where}:</span> {e.message}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ImportResult({ result, onAgain }) {
  return (
    <div className="space-y-4">
      <div className="card flex items-start gap-3 border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <p className="font-semibold">Jadval muvaffaqiyatli yuklandi</p>
          <p className="text-sm">
            {result.lessonsCount} ta dars saqlandi
            {result.errorsCount > 0 && `, ${result.errorsCount} ta qator o'tkazib yuborildi`}.
          </p>
        </div>
      </div>

      {result.credentials.length > 0 && (
        <div className="card p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-semibold">Yangi o'qituvchilar login/parollari</h2>
              <p className="text-sm text-red-600">Parollar faqat hozir ko'rsatiladi — yuklab oling yoki nusxa oling!</p>
            </div>
            <button className="btn-primary" onClick={() => downloadCredentialsCsv(result.credentials)}>
              <Download className="h-4 w-4" /> Excel (CSV)
            </button>
          </div>
          <ul className="-mx-4 divide-y divide-slate-100 border-t border-slate-100 text-sm">
            {result.credentials.map((c) => (
              <li key={c.username} className="grid gap-x-4 px-4 py-2.5 sm:grid-cols-[1fr_10rem_8rem]">
                <span className="font-medium">{c.fullName}</span>
                <span className="text-slate-600">
                  <span className="text-slate-400 sm:hidden">Login: </span>
                  <span className="font-mono">{c.username}</span>
                </span>
                <span className="text-slate-600">
                  <span className="text-slate-400 sm:hidden">Parol: </span>
                  <span className="font-mono">{c.password}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <button className="btn-secondary" onClick={onAgain}>Yana fayl yuklash</button>
        <Link to="/admin/schedule" className="btn-primary">Jadvalni ko'rish</Link>
      </div>
    </div>
  );
}

function FormatHelp() {
  return (
    <details className="card p-4 text-sm text-slate-600">
      <summary className="cursor-pointer font-medium text-slate-800">Excel fayl formati</summary>
      <div className="mt-3 space-y-3">
        <div>
          <p className="font-medium text-slate-800">1. Fakultet jadvali (to'r ko'rinishi)</p>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            <li>Sarlavha qatori: <b>Kun</b> | <b>Juftlik</b> | <b>Vaqti</b> | guruhlar (Uz-11-26, Ru-1-26 ...).</li>
            <li>
              Katak: <span className="font-mono text-xs">Fan nomi (A)</span> / <span className="font-mono text-xs">kat.o'qit R.Sobirov</span> /{' '}
              <span className="font-mono text-xs">Xona: 401</span>. (M) — ma'ruza, (A) — amaliy, (S) — seminar.
            </li>
            <li>Bir nechta guruh ustida birlashtirilgan katak — bitta dars, barcha guruhlar bilan.</li>
            <li>"MUSTAQIL TA'LIM" va bo'sh kataklar o'tkazib yuboriladi.</li>
          </ul>
        </div>
        <div>
          <p className="font-medium text-slate-800">2. Ro'yxat ko'rinishi (shablon)</p>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            <li>Har bir qator — bitta dars: <b>O'qituvchi</b>, <b>Kun</b>, <b>Fan</b>, <b>Juftlik</b> yoki vaqt, Guruh, Xona ...</li>
          </ul>
        </div>
        <p>
          O'qituvchi jadvaldagi nomi (masalan, <span className="font-mono text-xs">R.Sobirov</span>) bo'yicha mavjud hisobga bog'lanadi; yangi
          nom uchun login/parol avtomatik yaratiladi.
        </p>
      </div>
    </details>
  );
}
