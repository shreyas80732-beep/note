import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Sparkles, Upload, History, Download, Loader2 } from 'lucide-react';
import { API, getDeviceId, useGenerateStream } from './useStream.js';
import { payForPdf } from './razorpay.js';
import { extractPdfText } from './pdf.js';
import LegalModal, { LEGAL } from './Legal.jsx';

const btn = 'rounded bg-ink px-4 py-2.5 font-semibold text-white disabled:opacity-50';
const field = 'w-full rounded border border-ink/25 bg-white px-3 py-2.5';

// Browser "Save as PDF": only the chosen element is printed
function printEl(el) {
  el.classList.add('print-area');
  window.print();
  el.classList.remove('print-area');
}

export default function App() {
  const [view, setView] = useState('workspace');
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [saved, setSaved] = useState([]);
  const [legal, setLegal] = useState(null);
  const [paying, setPaying] = useState(false);
  const [payErr, setPayErr] = useState('');
  // A payment that was made but not yet turned into a PDF survives a refresh
  const [proof, setProof] = useState(() => JSON.parse(localStorage.getItem('nc_paid') || 'null'));
  const { text, loading, error, start } = useGenerateStream();

  const loadHistory = () =>
    fetch(`${API}/api/notes/history`, { headers: { 'x-device-id': getDeviceId() } })
      .then((r) => r.json()).then((d) => setSaved(d.notes || [])).catch(() => {});

  useEffect(() => { if (view === 'saved') loadHistory(); }, [view]);

  const generate = async () => {
    setPayErr('');
    let p = proof;
    if (!p) {
      setPaying(true);
      try {
        p = await payForPdf();
        localStorage.setItem('nc_paid', JSON.stringify(p));
        setProof(p);
      } catch (e) { setPayErr(e.message); return; }
      finally { setPaying(false); }
    }
    const ok = await start(title, notes, p);
    if (ok) { localStorage.removeItem('nc_paid'); setProof(null); }
  };

  const onFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPayErr('');
    try {
      const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
      const content = isPdf ? await extractPdfText(file) : await file.text();
      if (!content.trim()) {
        setPayErr('No readable text found. Scanned PDFs are images, so paste the text instead.');
        return;
      }
      setNotes(content);
      if (!title) setTitle(file.name.replace(/\.\w+$/, ''));
    } catch {
      setPayErr('Could not read this file. Try another one or paste the text.');
    }
    e.target.value = '';
  };

  return (
    <div className="flex min-h-screen flex-col">
      <header className="no-print flex items-center justify-between border-b border-ink/15 bg-white px-6 py-3">
        <span className="font-display text-xl font-extrabold">NoteCraft AI</span>
        <nav className="flex gap-4 text-sm">
          <button onClick={() => setView('workspace')} className="flex items-center gap-1"><Sparkles size={16} />Generate</button>
          <button onClick={() => setView('saved')} className="flex items-center gap-1"><History size={16} />Saved notes</button>
        </nav>
      </header>

      <div className="flex-1">
        {view === 'workspace' ? (
          <main className="mx-auto max-w-6xl p-6">
            <div className="no-print mb-6">
              <h1 className="font-display text-4xl font-extrabold">Paste your notes. Get exam-ready answers.</h1>
              <p className="mt-3 inline-block rounded bg-mark px-4 py-2 font-display text-lg font-extrabold">₹9 per PDF. No sign-up.</p>
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <section className="no-print space-y-3">
                <input className={field} placeholder="Title (e.g. Operating Systems – Unit 2)" value={title} onChange={(e) => setTitle(e.target.value)} />
                <textarea className={field + ' h-80'} placeholder="Paste your notes here" value={notes} onChange={(e) => setNotes(e.target.value)} />
                {proof && <p className="rounded bg-white p-3 text-sm">You already paid for one PDF. Generate to use it, no new payment needed.</p>}
                <div className="flex flex-wrap items-center gap-3">
                  <button className={btn + ' flex items-center gap-2'} onClick={generate} disabled={paying || loading || !title.trim() || !notes.trim()}>
                    {paying || loading ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
                    {proof ? 'Generate Study Material' : 'Pay ₹9 & Generate'}
                  </button>
                  <label className="flex cursor-pointer items-center gap-1 text-sm underline">
                    <Upload size={16} />Upload a PDF, .txt or .md file
                    <input type="file" accept=".pdf,.txt,.md,application/pdf,text/plain" className="sr-only" onChange={onFile} />
                  </label>
                </div>
                {(payErr || error) && <p role="alert" className="text-sm text-red-700">{payErr || error}</p>}
              </section>
              <section className="min-h-80 rounded-lg bg-white p-6" aria-live="polite">
                {text ? (
                  <>
                    <div className="notes-body prose-notes"><ReactMarkdown>{text}</ReactMarkdown></div>
                    {!loading && (
                      <button className={btn + ' no-print mt-4 flex items-center gap-2'}
                        onClick={(e) => printEl(e.currentTarget.parentElement.querySelector('.notes-body'))}>
                        <Download size={18} />Download PDF
                      </button>
                    )}
                  </>
                ) : <p className="text-ink/60">Your summary and 2, 3 and 6-mark answers will appear here as they are written.</p>}
              </section>
            </div>
          </main>
        ) : (
          <main className="mx-auto max-w-3xl space-y-4 p-6">
            <h2 className="no-print font-display text-2xl font-extrabold">Saved notes</h2>
            <p className="no-print text-sm text-ink/70">Saved on this device. Clearing your browser data removes access to them.</p>
            {saved.length === 0 && <p>Nothing saved yet. Generate your first study guide.</p>}
            {saved.map((n) => (
              <details key={n._id} className="rounded-lg bg-white p-4">
                <summary className="cursor-pointer font-semibold">{n.title} <span className="font-normal text-ink/60">– {new Date(n.createdAt).toLocaleDateString('en-IN')}</span></summary>
                <div className="notes-body prose-notes mt-3"><ReactMarkdown>{n.generatedContent}</ReactMarkdown></div>
                <button className="no-print mt-3 flex items-center gap-1 text-sm underline"
                  onClick={(e) => printEl(e.currentTarget.parentElement.querySelector('.notes-body'))}>
                  <Download size={16} />Download PDF
                </button>
              </details>
            ))}
          </main>
        )}
      </div>

      <footer className="no-print flex flex-wrap justify-center gap-5 border-t border-ink/15 bg-white px-6 py-4 text-sm">
        {Object.keys(LEGAL).map((p) => <button key={p} className="underline" onClick={() => setLegal(p)}>{p}</button>)}
      </footer>
      <LegalModal page={legal} onClose={() => setLegal(null)} />
    </div>
  );
}
