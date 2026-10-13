import { useState, useEffect, useRef, useCallback } from 'react';
import {
  RoomState,
  GlobalStatsPayload,
  RoomSummary,
  PlayerColor,
  Position,
  MoveStep,
  ChatMessage,
} from '../types/checkers.js';
import { sounds } from '../utils/soundEffects.js';
import confetti from 'canvas-confetti';

interface UseCheckersSocketReturn {
  isConnected: boolean;
  roomState: RoomState | null;
  myRole: 'red' | 'black' | 'spectator' | null;
  myUserId: string | null;
  globalStats: GlobalStatsPayload | null;
  availableRooms: RoomSummary[];
  joinRoom: (roomId: string, playerName: string, roomName?: string) => void;
  sendMove: (from: Position, to: Position) => void;
  sendChat: (text: string) => void;
  requestRematch: () => void;
  offerDraw: () => void;
  acceptDraw: () => void;
  surrender: () => void;
  leaveRoom: () => void;
  endChainTurn: () => void;
  refreshStats: () => void;
  refreshRooms: () => void;
  lastError: string | null;
  clearError: () => void;
}

export function useCheckersSocket(): UseCheckersSocketReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [myRole, setMyRole] = useState<'red' | 'black' | 'spectator' | null>(null);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [globalStats, setGlobalStats] = useState<GlobalStatsPayload | null>(null);
  const [availableRooms, setAvailableRooms] = useState<RoomSummary[]>([]);
  const [lastError, setLastError] = useState<string | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const usingHttpRef = useRef<boolean>(false);
  const activeRoomIdRef = useRef<string | null>(null);
  const activeUserIdRef = useRef<string | null>(null);
  const activePlayerNameRef = useRef<string>('');
  const roomVersionRef = useRef<number>(0);
  const myRoleRef = useRef<'red' | 'black' | 'spectator' | null>(null);
  const prevRoomStateRef = useRef<RoomState | null>(null);

  useEffect(() => {
    myRoleRef.current = myRole;
  }, [myRole]);

  useEffect(() => {
    activeUserIdRef.current = myUserId;
  }, [myUserId]);

  // Sound and celebration effects for state transitions
  const handleRoomStateChange = useCallback((newState: RoomState) => {
    setRoomState((prevState) => {
      if (prevState) {
        // Pieces count differences
        const redDiff = prevState.redPiecesCount - newState.redPiecesCount;
        const blackDiff = prevState.blackPiecesCount - newState.blackPiecesCount;
        const wasCapture = redDiff > 0 || blackDiff > 0;

        // King promotion check
        const lastMoveRecord = newState.moveHistory[newState.moveHistory.length - 1];
        if (lastMoveRecord?.isKingPromotion) {
          sounds.playCrown();
        } else if (wasCapture) {
          sounds.playCapture();
        } else if (newState.moveHistory.length > prevState.moveHistory.length) {
          sounds.playMove();
        }

        // Turn notification
        if (
          newState.status === 'playing' &&
          prevState.turn !== newState.turn &&
          myRoleRef.current &&
          newState.turn === myRoleRef.current
        ) {
          sounds.playTurnNotification();
        }
      }

      // Victory notification & confetti
      if (
        prevState?.status !== 'ended' &&
        newState.status === 'ended' &&
        newState.winner
      ) {
        if (newState.winner !== 'draw') {
          sounds.playVictory();
          try {
            confetti({
              particleCount: 100,
              spread: 70,
              origin: { y: 0.6 },
            });
          } catch {}
        }
      }

      prevRoomStateRef.current = newState;
      return newState;
    });
  }, []);

  // HTTP API: Fetch Global Stats
  const fetchStatsHttp = useCallback(async () => {
    try {
      const res = await fetch('/api/stats');
      if (res.ok) {
        const data = await res.json();
        setGlobalStats(data);
        setIsConnected(true);
      }
    } catch (e) {
      console.warn('HTTP stats fetch err:', e);
    }
  }, []);

  // HTTP API: Fetch Rooms
  const fetchRoomsHttp = useCallback(async () => {
    try {
      const res = await fetch('/api/rooms');
      if (res.ok) {
        const data = await res.json();
        setAvailableRooms(data || []);
        setIsConnected(true);
      }
    } catch (e) {
      console.warn('HTTP rooms fetch err:', e);
    }
  }, []);

  // HTTP API: Poll active room
  const pollActiveRoom = useCallback(async () => {
    const roomId = activeRoomIdRef.current;
    if (!roomId) return;

    try {
      const res = await fetch(`/api/rooms/${roomId}?version=${roomVersionRef.current}`);
      if (res.ok) {
        const data = await res.json();
        if (data.modified && data.roomState) {
          roomVersionRef.current = data.version || roomVersionRef.current + 1;
          handleRoomStateChange(data.roomState);
        }
        setIsConnected(true);
      }
    } catch (e) {
      console.warn('Poll room err:', e);
    }
  }, [handleRoomStateChange]);

  // Try WebSocket first, but immediately use HTTP for initial load
  const connect = useCallback(() => {
    if (typeof window === 'undefined') return;

    // Load initial stats & rooms via HTTP immediately
    fetchStatsHttp();
    fetchRoomsHttp();

    // Check if WebSocket is possible
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;

    try {
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        usingHttpRef.current = false;
        setIsConnected(true);
        setLastError(null);
        ws.send(JSON.stringify({ type: 'get_stats' }));
        ws.send(JSON.stringify({ type: 'get_rooms' }));
      };

      ws.onclose = () => {
        // Fallback to HTTP API
        usingHttpRef.current = true;
      };

      ws.onerror = () => {
        // Fallback to HTTP API
        usingHttpRef.current = true;
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          switch (msg.type) {
            case 'stats_update':
              setGlobalStats(msg.payload);
              break;
            case 'rooms_update':
              setAvailableRooms(msg.payload || []);
              break;
            case 'joined_role':
              setMyRole(msg.payload.role);
              setMyUserId(msg.payload.userId);
              break;
            case 'room_state':
              handleRoomStateChange(msg.payload);
              break;
            case 'chat_message': {
              const chatMsg: ChatMessage = msg.payload;
              setRoomState((prev) => {
                if (!prev) return prev;
                const exists = prev.chat.some((c) => c.id === chatMsg.id);
                if (exists) return prev;
                return {
                  ...prev,
                  chat: [...prev.chat, chatMsg].slice(-50),
                };
              });
              break;
            }
            case 'error':
              setLastError(msg.message || 'Ocurrió un error');
              break;
            default:
              break;
          }
        } catch (err) {
          console.error('WS msg error:', err);
        }
      };
    } catch (e) {
      usingHttpRef.current = true;
    }
  }, [fetchStatsHttp, fetchRoomsHttp, handleRoomStateChange]);

  // Initial connect & interval polling
  useEffect(() => {
    connect();

    // Polling intervals:
    // If in room: poll room every 900ms
    // If in lobby: poll rooms & stats every 3500ms
    const interval = setInterval(() => {
      if (activeRoomIdRef.current) {
        pollActiveRoom();
      } else {
        fetchRoomsHttp();
      }
    }, 1000);

    return () => {
      clearInterval(interval);
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [connect, pollActiveRoom, fetchRoomsHttp]);

  // Actions
  const joinRoom = useCallback(
    async (roomId: string, playerName: string, roomName?: string) => {
      const cleanRoomId = roomId.trim().toUpperCase();
      activeRoomIdRef.current = cleanRoomId;
      activePlayerNameRef.current = playerName;

      // Try WS
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(
          JSON.stringify({
            type: 'join_room',
            roomId: cleanRoomId,
            playerName,
            roomName: roomName || cleanRoomId,
          })
        );
        return;
      }

      // HTTP fallback
      try {
        const res = await fetch('/api/rooms/join', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roomId: cleanRoomId,
            playerName,
            roomName: roomName || cleanRoomId,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          setMyRole(data.role);
          setMyUserId(data.userId);
          roomVersionRef.current = data.version || 1;
          handleRoomStateChange(data.roomState);
        } else {
          const err = await res.json();
          setLastError(err.error || 'No se pudo entrar a la sala');
        }
      } catch (e) {
        setLastError('Error de conexión al entrar a la sala');
      }
    },
    [handleRoomStateChange]
  );

  const sendRoomActionHttp = useCallback(
    async (type: string, extraPayload: Record<string, any> = {}) => {
      const roomId = activeRoomIdRef.current;
      if (!roomId) return;

      try {
        const res = await fetch(`/api/rooms/${roomId}/action`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type,
            userId: activeUserIdRef.current,
            playerName: activePlayerNameRef.current,
            ...extraPayload,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.roomState) {
            roomVersionRef.current = data.version || roomVersionRef.current + 1;
            handleRoomStateChange(data.roomState);
          }
        } else {
          const err = await res.json();
          setLastError(err.error || 'Error al ejecutar acción');
        }
      } catch (e) {
        setLastError('Error de red al enviar jugada');
      }
    },
    [handleRoomStateChange]
  );

  const sendMove = useCallback(
    (from: Position, to: Position) => {
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({ type: 'move', from, to }));
      } else {
        sendRoomActionHttp('move', { from, to });
      }
    },
    [sendRoomActionHttp]
  );

  const sendChat = useCallback(
    (text: string) => {
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({ type: 'chat_message', text }));
      } else {
        sendRoomActionHttp('chat_message', { text });
      }
    },
    [sendRoomActionHttp]
  );

  const requestRematch = useCallback(() => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'request_rematch' }));
    } else {
      sendRoomActionHttp('request_rematch');
    }
  }, [sendRoomActionHttp]);

  const offerDraw = useCallback(() => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'offer_draw' }));
    } else {
      sendRoomActionHttp('offer_draw');
    }
  }, [sendRoomActionHttp]);

  const acceptDraw = useCallback(() => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'accept_draw' }));
    } else {
      sendRoomActionHttp('accept_draw');
    }
  }, [sendRoomActionHttp]);

  const surrender = useCallback(() => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'surrender' }));
    } else {
      sendRoomActionHttp('surrender');
    }
  }, [sendRoomActionHttp]);

  const leaveRoom = useCallback(() => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'leave_room' }));
    } else {
      sendRoomActionHttp('leave_room');
    }
    activeRoomIdRef.current = null;
    setRoomState(null);
    setMyRole(null);
  }, [sendRoomActionHttp]);

  const endChainTurn = useCallback(() => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'end_chain_turn' }));
    } else {
      sendRoomActionHttp('end_chain_turn');
    }
  }, [sendRoomActionHttp]);

  const refreshStats = useCallback(() => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'get_stats' }));
    } else {
      fetchStatsHttp();
    }
  }, [fetchStatsHttp]);

  const refreshRooms = useCallback(() => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'get_rooms' }));
    } else {
      fetchRoomsHttp();
    }
  }, [fetchRoomsHttp]);

  const clearError = useCallback(() => {
    setLastError(null);
  }, []);

  return {
    isConnected,
    roomState,
    myRole,
    myUserId,
    globalStats,
    availableRooms,
    joinRoom,
    sendMove,
    sendChat,
    requestRematch,
    offerDraw,
    acceptDraw,
    surrender,
    leaveRoom,
    endChainTurn,
    refreshStats,
    refreshRooms,
    lastError,
    clearError,
  };
}
