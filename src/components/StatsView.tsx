import React, { useState, useMemo } from 'react';
import { GlobalStatsPayload, PlayerStats, MatchHistoryItem } from '../types/checkers.js';
import {
  Trophy,
  Flame,
  Swords,
  History,
  TrendingUp,
  Search,
  Users,
  Award,
  Clock,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';

interface StatsViewProps {
  stats: GlobalStatsPayload | null;
  onClose?: () => void;
  initialPlayerName?: string;
}

export const StatsView: React.FC<StatsViewProps> = ({ stats, onClose, initialPlayerName = '' }) => {
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'history' | 'h2h'>('leaderboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [h2hPlayer1, setH2hPlayer1] = useState(initialPlayerName);
  const [h2hPlayer2, setH2hPlayer2] = useState('');

  const leaderboard = stats?.leaderboard || [];
  const recentMatches = stats?.recentMatches || [];

  // Filtered leaderboard
  const filteredLeaderboard = useMemo(() => {
    if (!searchQuery.trim()) return leaderboard;
    const q = searchQuery.toLowerCase();
    return leaderboard.filter((p) => p.name.toLowerCase().includes(q));
  }, [leaderboard, searchQuery]);

  // Head-to-Head calculation
  const h2hData = useMemo(() => {
    if (!h2hPlayer1.trim() || !h2hPlayer2.trim()) return null;
    const p1 = h2hPlayer1.trim().toLowerCase();
    const p2 = h2hPlayer2.trim().toLowerCase();

    const matchesBetween = recentMatches.filter((m) => {
      const red = m.redPlayer.toLowerCase();
      const black = m.blackPlayer.toLowerCase();
      return (red === p1 && black === p2) || (red === p2 && black === p1);
    });

    let p1Wins = 0;
    let p2Wins = 0;
    let draws = 0;

    matchesBetween.forEach((m) => {
      const win = m.winner.toLowerCase();
      if (win === p1) p1Wins++;
      else if (win === p2) p2Wins++;
      else draws++;
    });

    return {
      p1Name: h2hPlayer1.trim(),
      p2Name: h2hPlayer2.trim(),
      p1Wins,
      p2Wins,
      draws,
      totalGames: matchesBetween.length,
      matches: matchesBetween,
    };
  }, [h2hPlayer1, h2hPlayer2, recentMatches]);

  return (
    <div className="w-full max-w-4xl mx-auto bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
      {/* Top Header */}
      <div className="p-4 sm:p-6 bg-gradient-to-r from-stone-900 via-amber-950/30 to-stone-900 border-b border-stone-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h2 className="text-xl font-bold text-stone-100">
              Estadísticas y Clasificación en Vivo
            </h2>
            <span className="flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800/40 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              En vivo
            </span>
          </div>
          <p className="text-xs text-stone-400 mt-1">
            Histórico global de victorias, rachas y enfrentamientos sincronizados en tiempo real.
          </p>
        </div>

        {/* Global Summary Counts */}
        <div className="flex items-center gap-3 text-xs">
          <div className="bg-stone-800/80 px-3 py-1.5 rounded-xl border border-stone-700/60">
            <span className="text-stone-400 block text-[10px]">Partidas Totales</span>
            <span className="font-mono font-bold text-amber-300 text-sm">
              {stats?.totalGamesEver || 0}
            </span>
          </div>
          <div className="bg-stone-800/80 px-3 py-1.5 rounded-xl border border-stone-700/60">
            <span className="text-stone-400 block text-[10px]">Jugadores</span>
            <span className="font-mono font-bold text-stone-200 text-sm">
              {leaderboard.length}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-stone-800 bg-stone-950/60 px-4 pt-2">
        <button
          onClick={() => setActiveTab('leaderboard')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition cursor-pointer ${
            activeTab === 'leaderboard'
              ? 'border-amber-500 text-amber-400 bg-amber-950/20'
              : 'border-transparent text-stone-400 hover:text-stone-200'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Tabla de Líderes</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition cursor-pointer ${
            activeTab === 'history'
              ? 'border-amber-500 text-amber-400 bg-amber-950/20'
              : 'border-transparent text-stone-400 hover:text-stone-200'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Histórico de Partidas ({recentMatches.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('h2h')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition cursor-pointer ${
            activeTab === 'h2h'
              ? 'border-amber-500 text-amber-400 bg-amber-950/20'
              : 'border-transparent text-stone-400 hover:text-stone-200'
          }`}
        >
          <Swords className="w-4 h-4" />
          <span>Comparador Cara a Cara</span>
        </button>
      </div>

      {/* Tab 1: Leaderboard */}
      {activeTab === 'leaderboard' && (
        <div className="p-4 sm:p-6 flex-1 flex flex-col">
          {/* Search bar */}
          <div className="flex items-center justify-between mb-4 gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-stone-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar jugador en el ranking..."
                className="w-full bg-stone-950 border border-stone-800 rounded-xl pl-9 pr-3 py-2 text-xs text-stone-100 placeholder-stone-600 focus:outline-none focus:border-amber-500"
              />
            </div>
            <span className="text-xs text-stone-500 hidden sm:inline">
              Mostrando {filteredLeaderboard.length} jugadores
            </span>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto rounded-xl border border-stone-800 bg-stone-950/40">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-900/90 text-stone-400 uppercase text-[10px] tracking-wider border-b border-stone-800">
                <tr>
                  <th className="py-3 px-3">#</th>
                  <th className="py-3 px-3">Jugador</th>
                  <th className="py-3 px-3 text-center">Partidas</th>
                  <th className="py-3 px-3 text-center text-amber-400 font-bold">Victorias</th>
                  <th className="py-3 px-3 text-center">Derrotas</th>
                  <th className="py-3 px-3 text-center">Empates</th>
                  <th className="py-3 px-3 text-center">% Victorias</th>
                  <th className="py-3 px-3 text-center">Racha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/60 font-mono text-stone-300">
                {filteredLeaderboard.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-stone-500 font-sans">
                      No se encontraron jugadores con ese nombre.
                    </td>
                  </tr>
                ) : (
                  filteredLeaderboard.map((p, idx) => {
                    const isTop1 = idx === 0;
                    const isTop2 = idx === 1;
                    const isTop3 = idx === 2;

                    return (
                      <tr
                        key={p.name}
                        className="hover:bg-stone-850/50 transition-colors"
                      >
                        <td className="py-2.5 px-3 font-bold">
                          {isTop1 ? (
                            <span className="text-amber-400 font-bold flex items-center gap-1">
                              🥇 1
                            </span>
                          ) : isTop2 ? (
                            <span className="text-stone-300 font-bold flex items-center gap-1">
                              🥈 2
                            </span>
                          ) : isTop3 ? (
                            <span className="text-amber-600 font-bold flex items-center gap-1">
                              🥉 3
                            </span>
                          ) : (
                            <span className="text-stone-500">{idx + 1}</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-sans font-medium text-stone-100">
                          <button
                            onClick={() => {
                              setH2hPlayer1(p.name);
                              setActiveTab('h2h');
                            }}
                            className="hover:text-amber-400 hover:underline cursor-pointer flex items-center gap-1.5"
                            title="Ver comparador con este jugador"
                          >
                            <span>{p.name}</span>
                          </button>
                        </td>
                        <td className="py-2.5 px-3 text-center text-stone-400">
                          {p.gamesPlayed}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-amber-400">
                          {p.wins}
                        </td>
                        <td className="py-2.5 px-3 text-center text-stone-500">
                          {p.losses}
                        </td>
                        <td className="py-2.5 px-3 text-center text-stone-500">
                          {p.draws}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                              p.winRate >= 60
                                ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40'
                                : p.winRate >= 40
                                ? 'bg-amber-950/60 text-amber-300 border border-amber-800/40'
                                : 'bg-stone-900 text-stone-400 border border-stone-800'
                            }`}
                          >
                            {p.winRate}%
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {p.currentStreak > 1 ? (
                            <span className="inline-flex items-center gap-1 text-amber-400 font-bold text-[11px]">
                              <Flame className="w-3.5 h-3.5 fill-amber-400" />
                              {p.currentStreak}W
                            </span>
                          ) : (
                            <span className="text-stone-500 text-[11px]">{p.currentStreak}W</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Recent Matches History */}
      {activeTab === 'history' && (
        <div className="p-4 sm:p-6 flex-1 flex flex-col space-y-3">
          {recentMatches.length === 0 ? (
            <div className="text-center py-12 text-stone-500 text-xs">
              Aún no hay partidas registradas en el histórico. ¡Juega una partida para inaugurarlo!
            </div>
          ) : (
            recentMatches.map((m) => {
              const dateStr = new Date(m.date).toLocaleString([], {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={m.id}
                  className="bg-stone-950/70 border border-stone-800 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:border-stone-700 transition"
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 text-xs">
                      {/* Red Player */}
                      <span className="flex items-center gap-1 font-semibold text-stone-200">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-600 inline-block" />
                        {m.redPlayer}
                      </span>
                      <span className="text-stone-500 font-bold text-[10px]">VS</span>
                      {/* Black Player */}
                      <span className="flex items-center gap-1 font-semibold text-stone-200">
                        <span className="w-2.5 h-2.5 rounded-full bg-stone-950 border border-stone-500 inline-block" />
                        {m.blackPlayer}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-stone-400">
                      <span>Sala: <strong className="text-stone-300">{m.roomName}</strong></span>
                      <span>·</span>
                      <span>{m.totalMoves} jugadas</span>
                      <span>·</span>
                      <span>Duración: {Math.round(m.durationSeconds / 60)} min</span>
                    </div>
                  </div>

                  {/* Outcome */}
                  <div className="flex items-center gap-3 self-end sm:self-center">
                    <div className="text-right">
                      <div className="flex items-center gap-1.5 text-xs font-bold">
                        <Trophy className="w-3.5 h-3.5 text-amber-400" />
                        <span className="text-amber-300">
                          {m.winner === 'Empate' ? 'Empate' : `Ganó: ${m.winner}`}
                        </span>
                      </div>
                      <div className="text-[10px] text-stone-500">{m.winReason}</div>
                    </div>

                    <div className="text-[10px] text-stone-500 font-mono text-right border-l border-stone-800 pl-3">
                      {dateStr}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Tab 3: Head to Head Explorer */}
      {activeTab === 'h2h' && (
        <div className="p-4 sm:p-6 flex-1 flex flex-col space-y-5">
          <div className="bg-stone-950/60 p-4 rounded-xl border border-stone-800">
            <h3 className="text-xs font-bold text-stone-200 mb-3 uppercase tracking-wider">
              Compara el récord directo entre dos rivales
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-[11px] text-stone-400 mb-1">Primer Jugador</label>
                <input
                  type="text"
                  value={h2hPlayer1}
                  onChange={(e) => setH2hPlayer1(e.target.value)}
                  placeholder="Ej. Henry"
                  className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-1.5 text-xs text-stone-100 placeholder-stone-600 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] text-stone-400 mb-1">Segundo Jugador</label>
                <input
                  type="text"
                  value={h2hPlayer2}
                  onChange={(e) => setH2hPlayer2(e.target.value)}
                  placeholder="Ej. Sofia Master"
                  className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-1.5 text-xs text-stone-100 placeholder-stone-600 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Quick selector buttons from leaderboard */}
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-stone-400">
              <span>Sugerencias:</span>
              {leaderboard.slice(0, 4).map((p) => (
                <button
                  key={p.name}
                  onClick={() => {
                    if (!h2hPlayer1) setH2hPlayer1(p.name);
                    else setH2hPlayer2(p.name);
                  }}
                  className="px-2 py-0.5 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 cursor-pointer"
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          {/* H2H Result Panel */}
          {h2hData ? (
            <div className="bg-stone-950/80 border border-stone-800 rounded-xl p-5 flex flex-col items-center">
              <div className="flex items-center justify-between w-full max-w-md mb-4 text-center">
                <div className="flex-1">
                  <span className="font-bold text-sm text-stone-100 block truncate">
                    {h2hData.p1Name}
                  </span>
                  <span className="text-3xl font-mono font-black text-rose-400">
                    {h2hData.p1Wins}
                  </span>
                  <span className="text-[10px] text-stone-500 block">victorias</span>
                </div>

                <div className="px-4 text-stone-500 font-mono text-lg font-bold">
                  VS
                  {h2hData.draws > 0 && (
                    <span className="block text-[10px] font-normal text-stone-400">
                      ({h2hData.draws} empates)
                    </span>
                  )}
                </div>

                <div className="flex-1">
                  <span className="font-bold text-sm text-stone-100 block truncate">
                    {h2hData.p2Name}
                  </span>
                  <span className="text-3xl font-mono font-black text-stone-300">
                    {h2hData.p2Wins}
                  </span>
                  <span className="text-[10px] text-stone-500 block">victorias</span>
                </div>
              </div>

              <div className="text-xs text-stone-400 mb-4">
                Total de encuentros registrados entre ambos: <strong>{h2hData.totalGames}</strong>
              </div>

              {/* Matches list between both */}
              {h2hData.matches.length > 0 && (
                <div className="w-full space-y-2 mt-2 pt-3 border-t border-stone-800">
                  <div className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider mb-1">
                    Encuentros disputados
                  </div>
                  {h2hData.matches.map((m) => (
                    <div
                      key={m.id}
                      className="p-2 bg-stone-900/60 rounded-lg border border-stone-800 text-xs flex items-center justify-between"
                    >
                      <div className="text-stone-300">
                        {m.redPlayer} (Rojas) vs {m.blackPlayer} (Negras)
                      </div>
                      <div className="text-amber-300 font-bold">
                        🏆 {m.winner}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-xs text-stone-500">
              Escribe o selecciona el nombre de dos jugadores para ver su récord histórico mutuo.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
