'use client';
import { useEffect, useMemo, useState } from 'react';
import { week1Evidence, attackMethods, entryPoints, sequenceCards, containmentOptions } from '@/lib/game/week1';

type Mark = 'relevant' | 'suspicious' | 'cleared' | 'unsure';
type Stage = 'briefing' | 'evidence' | 'theory' | 'containment' | 'review' | 'result';
type Attempt = { id: string; started_at: string; status: string; progress?: Record<string, unknown> | null; score?: number | null };

type Props = { initialAttempt: Attempt };

export default function Week1Game({ initialAttempt }: Props) {
  const saved = (initialAttempt.progress ?? {}) as any;
  const [stage, setStage] = useState<Stage>((saved.stage as Stage) || 'briefing');
  const [marks, setMarks] = useState<Record<string, Mark>>(saved.marks || {});
  const [viewed, setViewed] = useState<string[]>(saved.viewed || []);
  const [openEvidence, setOpenEvidence] = useState<string | null>(null);
  const [attackMethod, setAttackMethod] = useState(saved.attackMethod || '');
  const [entryPoint, setEntryPoint] = useState(saved.entryPoint || '');
  const [sequence, setSequence] = useState<string[]>(saved.sequence || sequenceCards.map(x=>x[0]));
  const [strongest, setStrongest] = useState<string[]>(saved.strongest || []);
  const [reasoning, setReasoning] = useState<string[]>(saved.reasoning || []);
  const [containment, setContainment] = useState<string[]>(saved.containment || []);
  const [hints, setHints] = useState<number>(saved.hints || 0);
  const [saveState, setSaveState] = useState('Saved');
  const [error, setError] = useState('');
  const [result, setResult] = useState<any>(initialAttempt.score ? { total_score: initialAttempt.score } : null);
  const [now, setNow] = useState(Date.now());

  useEffect(()=>{ const t=setInterval(()=>setNow(Date.now()),1000); return ()=>clearInterval(t); },[]);
  const elapsedSeconds = Math.max(0, Math.floor((now - new Date(initialAttempt.started_at).getTime())/1000));
  const timerText = `${String(Math.floor(elapsedSeconds/60)).padStart(2,'0')}:${String(elapsedSeconds%60).padStart(2,'0')}`;
  const reviewed = viewed.length;
  const canTheory = reviewed >= 7;

  const payload = useMemo(()=>({ stage, marks, viewed, attackMethod, entryPoint, sequence, strongest, reasoning, containment, hints }),[stage,marks,viewed,attackMethod,entryPoint,sequence,strongest,reasoning,containment,hints]);

  async function save(next?: Partial<typeof payload>) {
    setSaveState('Saving…'); setError('');
    try {
      const body = { attemptId: initialAttempt.id, progress: { ...payload, ...(next || {}) } };
      const r = await fetch('/api/missions/1/progress',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
      if(!r.ok) throw new Error((await r.json()).error || 'Save failed');
      setSaveState('Saved');
    } catch (e) { setSaveState('Save pending'); setError(e instanceof Error ? e.message : 'Unable to save progress.'); }
  }

  function visit(id:string){ setOpenEvidence(id); if(!viewed.includes(id)){ const nv=[...viewed,id]; setViewed(nv); void save({viewed:nv}); } }
  function mark(id:string,value:Mark){ const nm={...marks,[id]:value}; setMarks(nm); void save({marks:nm}); }
  function toggle(field:'strongest'|'reasoning'|'containment', list:string[], value:string, max:number, setter:(x:string[])=>void){ const next=list.includes(value)?list.filter(x=>x!==value):list.length<max?[...list,value]:list; setter(next); void save({[field]:next}); }
  function go(s:Stage){ setStage(s); void save({stage:s}); window.scrollTo({top:0,behavior:'smooth'}); }

  async function useHint(){ if(hints>=3) return; const n=hints+1; setHints(n); await save({hints:n}); }
  const hintText = ['Compare the suspicious email, MFA approval and unfamiliar login times.','Inspect actual link destinations, not only visible link text.','Separate the cause of the incident from actions performed after access was gained.'][Math.max(0,hints-1)];

  async function submit() {
    setError(''); setSaveState('Submitting…');
    try {
      const r = await fetch('/api/missions/1/submit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({attemptId:initialAttempt.id,attackMethod,entryPoint,sequence,strongest,reasoning,containment,hints})});
      const data=await r.json(); if(!r.ok) throw new Error(data.error||'Submission failed');
      setResult(data.score); setStage('result'); setSaveState('Submitted');
    } catch(e){ setError(e instanceof Error?e.message:'Submission failed. Your attempt remains active.'); setSaveState('Saved'); }
  }

  function header(){ return <><div className="flex flex-wrap justify-between gap-3 items-center"><div><span className="badge">MISSION 01</span><h1 className="text-3xl md:text-4xl font-black mt-2">THE BREACH</h1></div><div className="text-right"><p className="text-sm muted">Elapsed mission time</p><p className="text-2xl font-black tabular-nums">{timerText}</p><p className="text-xs muted">{saveState}</p></div></div>{error&&<div role="alert" className="mt-4 rounded-xl border border-[#6a2b37] bg-[#34151c] p-3 text-sm">⚠ {error} Your visible work has been retained.</div>}</> }

  return <main className="mx-auto max-w-6xl px-4 py-6">
    {header()}
    <nav aria-label="Mission progress" className="mt-5 flex flex-wrap gap-2 text-sm">
      {['briefing','evidence','theory','containment','review','result'].map((s,i)=><span key={s} className={`badge ${stage===s?'bg-[#173747]':''}`}>{i+1}. {s.replace('_',' ')}</span>)}
    </nav>

    {stage==='briefing' && <section className="card p-6 mt-5">
      <p className="text-sm text-[var(--danger)] font-bold">09:17 · PRIORITY SECURITY INCIDENT</p>
      <h2 className="text-2xl font-black mt-2">Case 01-0947 · Maya Bennett</h2>
      <div className="grid md:grid-cols-2 gap-4 mt-5">
        <div className="card p-4"><p className="muted text-sm">Department</p><p className="font-bold">Finance</p><p className="muted text-sm mt-3">Incident</p><p>A restricted Finance folder was accessed from an unrecognised device.</p></div>
        <blockquote className="card p-4 border-l-4 border-l-[var(--accent)]">“I’ve been at my workstation all morning. I didn’t open that folder and I haven’t logged in from another device.”</blockquote>
      </div>
      <h3 className="font-black mt-6">Your mission</h3><ol className="list-decimal ml-5 mt-2 space-y-1 muted"><li>Determine the method of compromise.</li><li>Identify the initial entry point.</li><li>Select the three strongest pieces of evidence.</li><li>Recommend the correct immediate response.</li></ol>
      <button className="btn btn-primary mt-6" onClick={()=>go('evidence')}>Enter Evidence Room</button>
    </section>}

    {stage==='evidence' && <section className="mt-5">
      <div className="flex flex-wrap justify-between gap-3 items-end"><div><h2 className="text-2xl font-black">Evidence Room</h2><p className="muted">Review at least 7 of 10 artefacts. Not everything suspicious-looking is malicious.</p></div><p className="badge">Reviewed {reviewed}/10</p></div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3 mt-4">{week1Evidence.map(e=><button type="button" key={e.id} onClick={()=>visit(e.id)} className="card p-4 text-left min-h-32 hover:border-[var(--accent)]"><p className="text-xs muted">{e.id} · {e.type.toUpperCase()}</p><p className="font-black mt-2">{e.title}</p><p className="text-xs muted mt-1">{e.subtitle}</p><p className="text-xs mt-3">{viewed.includes(e.id)?'✓ Reviewed':'Open evidence'}</p></button>)}</div>
      {openEvidence && (()=>{const e=week1Evidence.find(x=>x.id===openEvidence)!;return <div className="card p-5 mt-4"><div className="flex flex-wrap justify-between gap-2"><div><p className="text-xs muted">{e.id}</p><h3 className="text-xl font-black">{e.title}</h3><p className="text-sm muted">{e.subtitle}</p></div><button className="btn btn-secondary" onClick={()=>setOpenEvidence(null)}>Close</button></div><div className="mt-4 space-y-2">{e.body.map((p,i)=><p key={i}>{p}</p>)}</div>{e.detail&&<pre className="mt-4 whitespace-pre-wrap rounded-xl border border-[var(--line)] bg-[#061018] p-3 text-sm">{e.detail}</pre>}<fieldset className="mt-5"><legend className="font-bold">Your classification</legend><div className="flex flex-wrap gap-2 mt-2">{(['relevant','suspicious','cleared','unsure'] as Mark[]).map(m=><label key={m} className="badge cursor-pointer"><input type="radio" name={`mark-${e.id}`} checked={marks[e.id]===m} onChange={()=>mark(e.id,m)} /> {m}</label>)}</div></fieldset></div>})()}
      <div className="flex flex-wrap gap-3 mt-5"><button className="btn btn-secondary" onClick={useHint} disabled={hints>=3}>Request Intel ({hints}/3)</button>{hints>0&&<p className="card p-3 text-sm max-w-xl">INTEL: {hintText}</p>}<button className="btn btn-primary ml-auto" disabled={!canTheory} onClick={()=>go('theory')}>{canTheory?'Build Your Theory':`Review ${7-reviewed} more artefact${7-reviewed===1?'':'s'}`}</button></div>
    </section>}

    {stage==='theory' && <section className="card p-6 mt-5 space-y-6">
      <div><h2 className="text-2xl font-black">Build Your Theory</h2><p className="muted">No answer is scored until your final report is submitted.</p></div>
      <label className="block"><span className="font-bold">1. Primary attack method</span><select value={attackMethod} onChange={e=>{setAttackMethod(e.target.value);void save({attackMethod:e.target.value});}} className="mt-2 w-full rounded-xl border border-[var(--line)] bg-[#07141d] p-3"><option value="">Choose…</option>{attackMethods.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
      <label className="block"><span className="font-bold">2. Initial point of compromise</span><select value={entryPoint} onChange={e=>{setEntryPoint(e.target.value);void save({entryPoint:e.target.value});}} className="mt-2 w-full rounded-xl border border-[var(--line)] bg-[#07141d] p-3"><option value="">Choose…</option>{entryPoints.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
      <fieldset><legend className="font-bold">3. Reconstruct the attack sequence</legend><p className="text-sm muted mt-1">Use the selectors to assign each event a position from 1–5.</p><div className="grid md:grid-cols-2 gap-2 mt-3">{sequenceCards.map(([v,l])=><label key={v} className="card p-3 flex justify-between gap-3 items-center"><span>{l}</span><select aria-label={`Position for ${l}`} value={sequence.indexOf(v)+1} onChange={e=>{const pos=Number(e.target.value)-1; const arr=sequence.filter(x=>x!==v); arr.splice(pos,0,v); setSequence(arr);void save({sequence:arr});}} className="bg-[#07141d] border border-[var(--line)] rounded-lg p-2">{[1,2,3,4,5].map(n=><option key={n}>{n}</option>)}</select></label>)}</div></fieldset>
      <fieldset><legend className="font-bold">4. Select exactly three strongest pieces of evidence</legend><div className="grid sm:grid-cols-2 md:grid-cols-5 gap-2 mt-3">{week1Evidence.map(e=><label key={e.id} className="card p-3 text-sm"><input type="checkbox" checked={strongest.includes(e.id)} onChange={()=>toggle('strongest',strongest,e.id,3,setStrongest)} /> <strong>{e.id}</strong> {e.title}</label>)}</div><p className="text-sm muted mt-2">Selected {strongest.length}/3</p></fieldset>
      <fieldset><legend className="font-bold">5. Select the statements supported by the evidence</legend><div className="space-y-2 mt-2">{[['mfa_after_link','The MFA request was approved shortly after the suspicious link was accessed.'],['new_device_after_mfa','The unfamiliar device logged in immediately after MFA approval.'],['qr_bad','The QR code directed Maya to an unofficial site.'],['share_before','The external file share occurred before the account compromise.']].map(([v,l])=><label key={v} className="block card p-3"><input type="checkbox" checked={reasoning.includes(v)} onChange={()=>toggle('reasoning',reasoning,v,4,setReasoning)} /> {l}</label>)}</div></fieldset>
      <div className="flex justify-between"><button className="btn btn-secondary" onClick={()=>go('evidence')}>Back to Evidence</button><button className="btn btn-primary" disabled={!attackMethod||!entryPoint||strongest.length!==3} onClick={()=>go('containment')}>Continue to Containment</button></div>
    </section>}

    {stage==='containment' && <section className="card p-6 mt-5">
      <p className="text-sm font-bold text-[var(--danger)]">NEW ALERT · ACCOUNT REMAINS ACTIVE</p><h2 className="text-2xl font-black mt-2">Contain the Incident</h2><p className="muted mt-2">Select exactly four actions IT should take first.</p>
      <div className="grid md:grid-cols-2 gap-3 mt-5">{containmentOptions.map(([v,l])=><label key={v} className="card p-4"><input type="checkbox" checked={containment.includes(v)} onChange={()=>toggle('containment',containment,v,4,setContainment)} /> <span className="ml-2 font-bold">{l}</span></label>)}</div><p className="text-sm muted mt-3">Selected {containment.length}/4</p>
      <div className="flex justify-between mt-5"><button className="btn btn-secondary" onClick={()=>go('theory')}>Back</button><button disabled={containment.length!==4} className="btn btn-primary" onClick={()=>go('review')}>Review Final Report</button></div>
    </section>}

    {stage==='review' && <section className="card p-6 mt-5"><h2 className="text-2xl font-black">Submit Breach Report?</h2><p className="muted mt-2">Your first official completion becomes your Week 1 score. You may review the case before submitting.</p><div className="grid md:grid-cols-2 gap-3 mt-5"><div className="card p-4"><p className="muted text-sm">Attack method</p><p className="font-bold">{attackMethods.find(x=>x[0]===attackMethod)?.[1]}</p></div><div className="card p-4"><p className="muted text-sm">Entry point</p><p className="font-bold">{entryPoints.find(x=>x[0]===entryPoint)?.[1]}</p></div><div className="card p-4"><p className="muted text-sm">Strongest evidence</p><p className="font-bold">{strongest.join(', ')}</p></div><div className="card p-4"><p className="muted text-sm">Containment actions</p><p className="font-bold">{containment.length} selected</p></div></div><div className="flex flex-wrap justify-between gap-3 mt-6"><button className="btn btn-secondary" onClick={()=>go('theory')}>Return to Case</button><button className="btn btn-primary" onClick={submit}>Submit Final Report</button></div></section>}

    {stage==='result' && result && <section className="card p-6 mt-5 text-center"><p className="text-[var(--ok)] font-bold">✓ INVESTIGATION COMPLETE</p><h2 className="text-6xl font-black mt-3">{result.total_score}</h2><p className="muted">out of 1,500 points</p>{result.breakdown&&<div className="grid sm:grid-cols-2 md:grid-cols-4 gap-2 mt-6 text-left">{Object.entries(result.breakdown).map(([k,v])=><div className="card p-3" key={k}><p className="text-xs muted">{k.replaceAll('_',' ')}</p><p className="text-xl font-black">+{String(v)}</p></div>)}</div>}<div className="mt-7 border-t border-[var(--line)] pt-6"><p className="muted">One more thing…</p><h3 className="text-2xl font-black mt-2">The attacker knew too much.</h3><p className="mt-3 max-w-2xl mx-auto muted">The phishing message knew the Project Horizon name, Maya’s supervisor and the exact meeting time. Where did that information come from?</p><div className="card p-4 mt-5 max-w-lg mx-auto"><p className="text-sm muted">MISSION 02</p><p className="text-xl font-black">THE DIGITAL FOOTPRINT</p><p className="text-sm muted mt-1">Unlocks Friday, October 16 · 9:00 AM</p></div><a className="btn btn-secondary inline-flex mt-5" href="/dashboard">Return to Dashboard</a></div></section>}
  </main>;
}
