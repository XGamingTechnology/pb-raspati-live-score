import { FormEvent, useEffect, useMemo, useState } from 'react';

type Standing = {
  teamId: string;
  name: string;
  played: number;
  won: number;
  lost: number;
  points: number;
  pf: number;
  pa: number;
  diff: number;
  provisionalRank: number;
  tieUnresolved: boolean;
};

type Match = {
  id: string;
  groupCode?: 'A' | 'B';
  stage?: 'semifinal' | 'third_place' | 'final';
  teamA: string;
  teamB: string;
  scoreA: number | null;
  scoreB: number | null;
  status: 'pending' | 'completed';
  sequence?: number;
  slot?: number;
  playedAt: string | null;
};

type RecordingSession = {
  id: string;
  title: string;
  participantA: string;
  participantB: string;
  scoreA: number | null;
  scoreB: number | null;
  status: 'pending' | 'completed';
  note: string | null;
  playedAt: string | null;
};

type GroupData = {
  groupCode: 'A' | 'B';
  standings: Standing[];
  pendingMatches: Match[];
  completedMatches: Match[];
};

type Overview = {
  tournament: {
    name: string;
    totalMatches: number;
    completedMatches: number;
    remainingMatches: number;
    standingsAreFinal: boolean;
    phase: 'group' | 'semifinal' | 'finals' | 'completed';
    updatedAt: string;
  };
  regulations: {
    targetScore: number;
    switchSidesAt: number;
    deuceFrom: string;
    winBy: number;
    capScore: number;
    semifinalPairing: string;
    thirdPlace: boolean;
  };
  groups: GroupData[];
  knockout: {
    semifinals: Match[];
    thirdPlace: Match[];
    final: Match[];
  };
  recordingSessions: RecordingSession[];
};

const API_URL = import.meta.env.VITE_API_URL || '/api';

function App() {
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [adminPin, setAdminPin] = useState(() => sessionStorage.getItem('raspati_admin_pin') || '');
  const [adminMode, setAdminMode] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await fetch(`${API_URL}/tournament/overview`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
      setError('');
    } catch (e: any) {
      setError(e.message || 'Gagal mengambil data');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const timer = setInterval(() => load(true), 5000);
    return () => clearInterval(timer);
  }, []);

  const summary = useMemo(() => data?.tournament, [data]);

  const activateAdmin = () => {
    const pin = window.prompt('Masukkan PIN panitia:', adminPin);
    if (!pin) return false;
    setAdminPin(pin);
    sessionStorage.setItem('raspati_admin_pin', pin);
    setAdminMode(true);
    return true;
  };

  const adminRequest = async (url: string, options: RequestInit = {}) => {
    if (!adminPin) {
      activateAdmin();
      throw new Error('Aktifkan Mode Panitia lalu ulangi tindakan.');
    }
    const res = await fetch(url, {
      ...options,
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        'x-admin-pin': adminPin,
        ...(options.headers || {}),
      },
    });
    const payload = await res.json();
    if (!res.ok) throw new Error(Array.isArray(payload.message) ? payload.message.join(', ') : payload.message || 'Permintaan gagal');
    setData(payload);
  };

  const saveScore = async (match: Match, scoreA: number, scoreB: number, kind: 'group' | 'knockout') => {
    setSavingId(match.id);
    try {
      const path = kind === 'group' ? `matches/${match.id}` : `knockout/${match.id}`;
      await adminRequest(`${API_URL}/tournament/${path}`, {
        method: 'PATCH',
        body: JSON.stringify({ scoreA, scoreB }),
      });
    } catch (e: any) {
      alert(e.message || 'Gagal menyimpan skor');
    } finally {
      setSavingId(null);
    }
  };

  const resetScore = async (match: Match, kind: 'group' | 'knockout') => {
    if (!window.confirm(`Batalkan hasil ${match.teamA} vs ${match.teamB}?`)) return;
    setSavingId(match.id);
    try {
      const path = kind === 'group' ? `matches/${match.id}/score` : `knockout/${match.id}/score`;
      await adminRequest(`${API_URL}/tournament/${path}`, { method: 'DELETE' });
    } catch (e: any) {
      alert(e.message || 'Gagal membatalkan skor');
    } finally {
      setSavingId(null);
    }
  };

  const createSession = async (payload: { title: string; participantA: string; participantB: string; note?: string }) => {
    try {
      await adminRequest(`${API_URL}/tournament/sessions`, { method: 'POST', body: JSON.stringify(payload) });
    } catch (e: any) {
      alert(e.message || 'Gagal membuat sesi');
    }
  };

  const saveSessionScore = async (session: RecordingSession, scoreA: number, scoreB: number) => {
    setSavingId(session.id);
    try {
      await adminRequest(`${API_URL}/tournament/sessions/${session.id}/score`, {
        method: 'PATCH', body: JSON.stringify({ scoreA, scoreB }),
      });
    } catch (e: any) {
      alert(e.message || 'Gagal menyimpan skor sesi');
    } finally {
      setSavingId(null);
    }
  };

  const resetSession = async (session: RecordingSession) => {
    setSavingId(session.id);
    try {
      await adminRequest(`${API_URL}/tournament/sessions/${session.id}/score`, { method: 'DELETE' });
    } catch (e: any) {
      alert(e.message || 'Gagal mereset sesi');
    } finally {
      setSavingId(null);
    }
  };

  const deleteSession = async (session: RecordingSession) => {
    if (!window.confirm(`Hapus sesi “${session.title}”?`)) return;
    try {
      await adminRequest(`${API_URL}/tournament/sessions/${session.id}`, { method: 'DELETE' });
    } catch (e: any) {
      alert(e.message || 'Gagal menghapus sesi');
    }
  };

  if (loading && !data) return <div className="center-state">Memuat turnamen…</div>;
  if (error && !data) return <div className="center-state error">{error}</div>;
  if (!data) return null;

  return (
    <div className="app-shell">
      <header className="hero">
        <div>
          <div className="brand-chip">RASPATI PLUS · BADMINTON CLUB</div>
          <h1>Live Score Turnamen Internal</h1>
          <p>Klasemen, bagan semifinal/final otomatis, dan sesi pencatatan mandiri.</p>
        </div>
        <div className="hero-actions">
          <button className="btn ghost" onClick={() => load()}>Refresh</button>
          <button className={`btn ${adminMode ? 'dark' : 'primary'}`} onClick={() => adminMode ? setAdminMode(false) : activateAdmin()}>
            {adminMode ? 'Tutup Mode Panitia' : 'Mode Panitia'}
          </button>
        </div>
      </header>

      <section className="summary-grid">
        <SummaryCard label="Pertandingan grup" value={`${summary?.completedMatches}/${summary?.totalMatches}`} />
        <SummaryCard label="Fase turnamen" value={phaseLabel(summary?.phase)} accent />
        <SummaryCard label="Sistem skor" value={`${data.regulations.targetScore} pts · cap ${data.regulations.capScore}`} />
      </section>

      <div className="notice regulation-notice">
        <strong>Regulasi:</strong> 1 game sampai 42 · pindah sisi di 21 · deuce mulai 41-41 wajib unggul 2 · maksimum 45. Semifinal otomatis: A1 vs B2 dan B1 vs A2.
      </div>

      {summary?.standingsAreFinal && (
        <KnockoutPanel
          knockout={data.knockout}
          adminMode={adminMode}
          savingId={savingId}
          onSave={(m, a, b) => saveScore(m, a, b, 'knockout')}
          onReset={(m) => resetScore(m, 'knockout')}
        />
      )}

      {!summary?.standingsAreFinal && (
        <div className="notice">Klasemen masih sementara. Bagan semifinal dibuat otomatis setelah seluruh pertandingan grup selesai dan tie-break sudah pasti.</div>
      )}

      <main className="content-grid">
        {data.groups.map((group) => (
          <GroupPanel
            key={group.groupCode}
            group={group}
            adminMode={adminMode}
            savingId={savingId}
            onSave={(m, a, b) => saveScore(m, a, b, 'group')}
            onReset={(m) => resetScore(m, 'group')}
          />
        ))}
      </main>

      <RecordingSessionsPanel
        sessions={data.recordingSessions}
        adminMode={adminMode}
        savingId={savingId}
        onCreate={createSession}
        onSave={saveSessionScore}
        onReset={resetSession}
        onDelete={deleteSession}
      />

      <footer>Update otomatis setiap 5 detik · Menang grup 3 poin · Tie-break: head-to-head → selisih poin → PF → keputusan panitia.</footer>
    </div>
  );
}

function phaseLabel(phase?: Overview['tournament']['phase']) {
  if (phase === 'semifinal') return 'SEMIFINAL';
  if (phase === 'finals') return 'FINAL / JUARA 3';
  if (phase === 'completed') return 'SELESAI';
  return 'PENYISIHAN';
}

function SummaryCard({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return <div className={`summary-card ${accent ? 'accent' : ''}`}><span>{label}</span><strong>{value}</strong></div>;
}

function KnockoutPanel({ knockout, adminMode, savingId, onSave, onReset }: {
  knockout: Overview['knockout'];
  adminMode: boolean;
  savingId: string | null;
  onSave: (m: Match, a: number, b: number) => void;
  onReset: (m: Match) => void;
}) {
  return (
    <section className="knockout-panel">
      <div className="section-heading"><div><span className="eyebrow">BABAK GUGUR</span><h2>Bagan Otomatis</h2></div><span className="match-count">A1×B2 · B1×A2</span></div>
      <div className="bracket-grid">
        <div className="bracket-column"><h3>Semifinal</h3>{knockout.semifinals.map((m) => <BracketMatch key={m.id} label={`SF ${m.slot}`} match={m} adminMode={adminMode} saving={savingId === m.id} onSave={onSave} onReset={onReset} />)}</div>
        <div className="bracket-column"><h3>Juara 3</h3>{knockout.thirdPlace.length ? knockout.thirdPlace.map((m) => <BracketMatch key={m.id} label="Perebutan Juara 3" match={m} adminMode={adminMode} saving={savingId === m.id} onSave={onSave} onReset={onReset} />) : <div className="bracket-placeholder">Terbentuk setelah semifinal selesai</div>}</div>
        <div className="bracket-column final-column"><h3>Final</h3>{knockout.final.length ? knockout.final.map((m) => <BracketMatch key={m.id} label="FINAL" match={m} adminMode={adminMode} saving={savingId === m.id} onSave={onSave} onReset={onReset} />) : <div className="bracket-placeholder">Pemenang SF1 vs pemenang SF2</div>}</div>
      </div>
    </section>
  );
}

function BracketMatch({ label, match, adminMode, saving, onSave, onReset }: {
  label: string; match: Match; adminMode: boolean; saving: boolean;
  onSave: (m: Match, a: number, b: number) => void; onReset: (m: Match) => void;
}) {
  return <div className="bracket-card"><div className="bracket-label">{label}</div><ScoreEntry match={match} adminMode={adminMode} saving={saving} onSave={onSave} />{match.status === 'completed' && adminMode && <button className="link-btn" onClick={() => onReset(match)}>koreksi hasil</button>}</div>;
}

function GroupPanel({ group, adminMode, savingId, onSave, onReset }: {
  group: GroupData; adminMode: boolean; savingId: string | null;
  onSave: (match: Match, scoreA: number, scoreB: number) => void; onReset: (match: Match) => void;
}) {
  return (
    <section className="group-panel">
      <div className="section-heading"><div><span className="eyebrow">GROUP {group.groupCode}</span><h2>{group.pendingMatches.length ? 'Klasemen Sementara' : 'Klasemen Akhir'}</h2></div><span className="match-count">{group.pendingMatches.length} laga tersisa</span></div>
      <div className="table-wrap"><table><thead><tr><th>#</th><th>Pasangan</th><th>M</th><th>W</th><th>L</th><th>Pts</th><th>PF</th><th>PA</th><th>+/-</th></tr></thead><tbody>{group.standings.map((row) => <tr key={row.teamId}><td><span className="rank">{row.provisionalRank}{row.tieUnresolved ? '*' : ''}</span></td><td className="team-name">{row.name}</td><td>{row.played}</td><td>{row.won}</td><td>{row.lost}</td><td><strong>{row.points}</strong></td><td>{row.pf}</td><td>{row.pa}</td><td className={row.diff > 0 ? 'positive' : row.diff < 0 ? 'negative' : ''}>{row.diff > 0 ? '+' : ''}{row.diff}</td></tr>)}</tbody></table></div>
      <div className="tiny-note">* tie-break belum final jika head-to-head antar tim dengan poin sama belum lengkap.</div>
      {group.pendingMatches.length > 0 && <><div className="subsection-title">Sisa Pertandingan</div><div className="match-list">{group.pendingMatches.map((match) => <ScoreEntry key={match.id} match={match} adminMode={adminMode} saving={savingId === match.id} onSave={onSave} />)}</div></>}
      <div className="subsection-title">Hasil Tercatat</div><div className="results-list">{group.completedMatches.map((match) => <div className="result-row" key={match.id}><span>{match.teamA}</span><strong>{match.scoreA} – {match.scoreB}</strong><span>{match.teamB}</span>{adminMode && <button className="link-btn" disabled={savingId === match.id} onClick={() => onReset(match)}>koreksi</button>}</div>)}</div>
    </section>
  );
}

function ScoreEntry({ match, adminMode, saving, onSave }: { match: Match; adminMode: boolean; saving: boolean; onSave: (m: Match, a: number, b: number) => void }) {
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  if (match.status === 'completed') return <div className="score-row completed"><div className="score-team left">{match.teamA}</div><strong className="completed-score">{match.scoreA} : {match.scoreB}</strong><div className="score-team right">{match.teamB}</div></div>;
  return <div className="score-row"><div className="score-team left">{match.teamA}</div>{adminMode ? <div className="score-inputs"><input inputMode="numeric" value={a} onChange={(e) => setA(e.target.value.replace(/\D/g, '').slice(0,2))} placeholder="0" /><span>:</span><input inputMode="numeric" value={b} onChange={(e) => setB(e.target.value.replace(/\D/g, '').slice(0,2))} placeholder="0" /><button className="mini-btn" disabled={saving || a === '' || b === ''} onClick={() => onSave(match, Number(a), Number(b))}>{saving ? '...' : 'Simpan'}</button></div> : <div className="vs">VS</div>}<div className="score-team right">{match.teamB}</div></div>;
}

function RecordingSessionsPanel({ sessions, adminMode, savingId, onCreate, onSave, onReset, onDelete }: {
  sessions: RecordingSession[]; adminMode: boolean; savingId: string | null;
  onCreate: (p: { title: string; participantA: string; participantB: string; note?: string }) => void;
  onSave: (s: RecordingSession, a: number, b: number) => void; onReset: (s: RecordingSession) => void; onDelete: (s: RecordingSession) => void;
}) {
  return (
    <section className="sessions-panel">
      <div className="section-heading"><div><span className="eyebrow">PENCATATAN BEBAS</span><h2>Sesi Pencatatan Sendiri</h2></div><span className="match-count">{sessions.length} sesi</span></div>
      <p className="section-copy">Buat pertandingan tambahan tanpa memengaruhi klasemen atau bagan turnamen—misalnya sparring, exhibition, uji coba, atau pertandingan internal lain.</p>
      {adminMode && <SessionForm onCreate={onCreate} />}
      <div className="session-grid">{sessions.length === 0 && <div className="empty">Belum ada sesi pencatatan tambahan.</div>}{sessions.map((s) => <SessionCard key={s.id} session={s} adminMode={adminMode} saving={savingId === s.id} onSave={onSave} onReset={onReset} onDelete={onDelete} />)}</div>
    </section>
  );
}

function SessionForm({ onCreate }: { onCreate: (p: { title: string; participantA: string; participantB: string; note?: string }) => void }) {
  const [title, setTitle] = useState(''); const [a, setA] = useState(''); const [b, setB] = useState(''); const [note, setNote] = useState('');
  const submit = (e: FormEvent) => { e.preventDefault(); if (!title || !a || !b) return; onCreate({ title, participantA: a, participantB: b, note: note || undefined }); setTitle(''); setA(''); setB(''); setNote(''); };
  return <form className="session-form" onSubmit={submit}><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nama sesi, mis. Sparring Malam" /><input value={a} onChange={(e) => setA(e.target.value)} placeholder="Peserta / pasangan A" /><input value={b} onChange={(e) => setB(e.target.value)} placeholder="Peserta / pasangan B" /><input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Catatan (opsional)" /><button className="btn primary" type="submit">+ Buat Sesi</button></form>;
}

function SessionCard({ session, adminMode, saving, onSave, onReset, onDelete }: {
  session: RecordingSession; adminMode: boolean; saving: boolean;
  onSave: (s: RecordingSession, a: number, b: number) => void; onReset: (s: RecordingSession) => void; onDelete: (s: RecordingSession) => void;
}) {
  const match: Match = { id: session.id, teamA: session.participantA, teamB: session.participantB, scoreA: session.scoreA, scoreB: session.scoreB, status: session.status, playedAt: session.playedAt };
  return <div className="session-card"><div className="session-card-head"><strong>{session.title}</strong>{session.note && <span>{session.note}</span>}</div><ScoreEntry match={match} adminMode={adminMode} saving={saving} onSave={(_, a, b) => onSave(session, a, b)} />{adminMode && <div className="session-actions">{session.status === 'completed' && <button className="link-btn" onClick={() => onReset(session)}>reset skor</button>}<button className="link-btn danger" onClick={() => onDelete(session)}>hapus sesi</button></div>}</div>;
}

export default App;
