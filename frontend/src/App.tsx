import { useEffect, useMemo, useState } from 'react';

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
  groupCode: 'A' | 'B';
  teamA: string;
  teamB: string;
  scoreA: number | null;
  scoreB: number | null;
  status: 'pending' | 'completed';
  sequence: number;
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
    updatedAt: string;
  };
  groups: GroupData[];
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
    if (!pin) return;
    setAdminPin(pin);
    sessionStorage.setItem('raspati_admin_pin', pin);
    setAdminMode(true);
  };

  const saveScore = async (match: Match, scoreA: number, scoreB: number) => {
    if (!adminPin) return activateAdmin();
    setSavingId(match.id);
    try {
      const res = await fetch(`${API_URL}/tournament/matches/${match.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-pin': adminPin,
        },
        body: JSON.stringify({ scoreA, scoreB }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(Array.isArray(payload.message) ? payload.message.join(', ') : payload.message || 'Gagal menyimpan');
      setData(payload);
    } catch (e: any) {
      alert(e.message || 'Gagal menyimpan skor');
    } finally {
      setSavingId(null);
    }
  };

  const resetScore = async (match: Match) => {
    if (!adminPin) return activateAdmin();
    if (!window.confirm(`Batalkan hasil ${match.teamA} vs ${match.teamB}?`)) return;
    setSavingId(match.id);
    try {
      const res = await fetch(`${API_URL}/tournament/matches/${match.id}/score`, {
        method: 'DELETE',
        headers: { 'x-admin-pin': adminPin },
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.message || 'Gagal membatalkan skor');
      setData(payload);
    } catch (e: any) {
      alert(e.message || 'Gagal membatalkan skor');
    } finally {
      setSavingId(null);
    }
  };

  if (loading && !data) return <div className="center-state">Memuat klasemen…</div>;
  if (error && !data) return <div className="center-state error">{error}</div>;
  if (!data) return null;

  return (
    <div className="app-shell">
      <header className="hero">
        <div>
          <div className="brand-chip">RASPATI PLUS · BADMINTON CLUB</div>
          <h1>Live Score Turnamen Internal</h1>
          <p>Pencatatan skor dan klasemen sementara yang otomatis terhitung.</p>
        </div>
        <div className="hero-actions">
          <button className="btn ghost" onClick={() => load()}>Refresh</button>
          <button className={`btn ${adminMode ? 'dark' : 'primary'}`} onClick={() => adminMode ? setAdminMode(false) : activateAdmin()}>
            {adminMode ? 'Tutup Mode Panitia' : 'Mode Panitia'}
          </button>
        </div>
      </header>

      <section className="summary-grid">
        <SummaryCard label="Pertandingan selesai" value={`${summary?.completedMatches}/${summary?.totalMatches}`} />
        <SummaryCard label="Sisa pertandingan" value={String(summary?.remainingMatches)} />
        <SummaryCard label="Status klasemen" value={summary?.standingsAreFinal ? 'FINAL' : 'SEMENTARA'} accent />
      </section>

      {!summary?.standingsAreFinal && (
        <div className="notice">
          Klasemen masih sementara karena jumlah pertandingan tiap pasangan belum tentu sama. Peringkat final ditetapkan setelah seluruh laga grup selesai.
        </div>
      )}

      <main className="content-grid">
        {data.groups.map((group) => (
          <GroupPanel key={group.groupCode} group={group} adminMode={adminMode} savingId={savingId} onSave={saveScore} onReset={resetScore} />
        ))}
      </main>

      <footer>
        Update otomatis setiap 5 detik · Menang 3 poin · Kalah 0 poin · Tie-break final: head-to-head → selisih poin → PF → keputusan panitia.
      </footer>
    </div>
  );
}

function SummaryCard({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`summary-card ${accent ? 'accent' : ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function GroupPanel({ group, adminMode, savingId, onSave, onReset }: {
  group: GroupData;
  adminMode: boolean;
  savingId: string | null;
  onSave: (match: Match, scoreA: number, scoreB: number) => void;
  onReset: (match: Match) => void;
}) {
  return (
    <section className="group-panel">
      <div className="section-heading">
        <div>
          <span className="eyebrow">GROUP {group.groupCode}</span>
          <h2>Klasemen Sementara</h2>
        </div>
        <span className="match-count">{group.pendingMatches.length} laga tersisa</span>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th><th>Pasangan</th><th>M</th><th>W</th><th>L</th><th>Pts</th><th>PF</th><th>PA</th><th>+/-</th>
            </tr>
          </thead>
          <tbody>
            {group.standings.map((row) => (
              <tr key={row.teamId}>
                <td><span className="rank">{row.provisionalRank}{row.tieUnresolved ? '*' : ''}</span></td>
                <td className="team-name">{row.name}</td>
                <td>{row.played}</td><td>{row.won}</td><td>{row.lost}</td>
                <td><strong>{row.points}</strong></td><td>{row.pf}</td><td>{row.pa}</td>
                <td className={row.diff > 0 ? 'positive' : row.diff < 0 ? 'negative' : ''}>{row.diff > 0 ? '+' : ''}{row.diff}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="tiny-note">* tie-break belum final karena head-to-head di antara tim dengan poin sama belum seluruhnya dimainkan.</div>

      <div className="subsection-title">Sisa Pertandingan</div>
      <div className="match-list">
        {group.pendingMatches.length === 0 && <div className="empty">Semua pertandingan grup sudah selesai.</div>}
        {group.pendingMatches.map((match) => (
          <ScoreRow key={match.id} match={match} adminMode={adminMode} saving={savingId === match.id} onSave={onSave} />
        ))}
      </div>

      <div className="subsection-title">Hasil Tercatat</div>
      <div className="results-list">
        {group.completedMatches.map((match) => (
          <div className="result-row" key={match.id}>
            <span>{match.teamA}</span>
            <strong>{match.scoreA} – {match.scoreB}</strong>
            <span>{match.teamB}</span>
            {adminMode && <button className="link-btn" disabled={savingId === match.id} onClick={() => onReset(match)}>koreksi</button>}
          </div>
        ))}
      </div>
    </section>
  );
}

function ScoreRow({ match, adminMode, saving, onSave }: { match: Match; adminMode: boolean; saving: boolean; onSave: (m: Match, a: number, b: number) => void }) {
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  return (
    <div className="score-row">
      <div className="score-team left">{match.teamA}</div>
      {adminMode ? (
        <div className="score-inputs">
          <input inputMode="numeric" value={a} onChange={(e) => setA(e.target.value.replace(/\D/g, '').slice(0,2))} placeholder="0" />
          <span>:</span>
          <input inputMode="numeric" value={b} onChange={(e) => setB(e.target.value.replace(/\D/g, '').slice(0,2))} placeholder="0" />
          <button className="mini-btn" disabled={saving || a === '' || b === ''} onClick={() => onSave(match, Number(a), Number(b))}>{saving ? '...' : 'Simpan'}</button>
        </div>
      ) : (
        <div className="vs">VS</div>
      )}
      <div className="score-team right">{match.teamB}</div>
    </div>
  );
}

export default App;
