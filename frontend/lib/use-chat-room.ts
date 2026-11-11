"use client";
import * as React from "react";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ChatMsg {
  id: string;
  cycle_id: string;
  sender_id: string;
  sender_name: string;
  sender_role: string;
  text: string;
  sent_at: string; // ISO-8601
}

export type ChatStatus =
  | "idle"         // not connected yet
  | "connecting"   // opening WS
  | "open"         // connected and ready
  | "reconnecting" // dropped, retrying
  | "error";       // terminal failure

type ServerMsg =
  | { type: "history";          messages: ChatMsg[] }
  | { type: "chat-message";     message: ChatMsg }
  | { type: "chat-typing";      user_id: string; name: string }
  | { type: "chat-peer-joined"; user: { id: string; name: string; role: string } }
  | { type: "chat-peer-left";   user: { id: string; name: string; role: string } }
  | { type: "pong" };

const MAX_RECONNECTS   = 6;
const PING_MS          = 25_000;
const TYPING_DEBOUNCE  = 2_000; // ms until typing indicator clears

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useChatRoom(cycleId: string, chatWsUrl: string | null) {
  const [status,       setStatus]       = React.useState<ChatStatus>("idle");
  const [messages,     setMessages]     = React.useState<ChatMsg[]>([]);
  const [typingName,   setTypingName]   = React.useState<string | null>(null);
  const [unread,       setUnread]       = React.useState(0);

  // Ref-based so callbacks never go stale
  const wsRef           = React.useRef<WebSocket | null>(null);
  const reconnectsRef   = React.useRef(0);
  const pingTimerRef    = React.useRef<ReturnType<typeof setInterval>  | null>(null);
  const retryTimerRef   = React.useRef<ReturnType<typeof setTimeout>   | null>(null);
  const typingTimerRef  = React.useRef<ReturnType<typeof setTimeout>   | null>(null);
  const sessionRef      = React.useRef(0);
  const panelOpenRef    = React.useRef(false); // set by the UI; suppresses unread bump

  // ── Helpers ───────────────────────────────────────────────────────────────

  const send = React.useCallback((obj: unknown) => {
    const ws = wsRef.current;
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(obj));
    }
  }, []);

  const teardown = React.useCallback(() => {
    if (pingTimerRef.current)   clearInterval(pingTimerRef.current);
    if (retryTimerRef.current)  clearTimeout(retryTimerRef.current);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    pingTimerRef.current = retryTimerRef.current = typingTimerRef.current = null;

    const ws = wsRef.current;
    wsRef.current = null;
    if (ws) {
      try {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "leave" }));
        ws.close(1000);
      } catch { /* already closing */ }
    }
  }, []);

  // ── Main connection effect ─────────────────────────────────────────────────

  React.useEffect(() => {
    // Don't connect until we have a URL (ticket fetch happens in useVideoRoom)
    if (!chatWsUrl) return;

    const sid = ++sessionRef.current;
    const stale = () => sessionRef.current !== sid;

    const scheduleReconnect = () => {
      reconnectsRef.current += 1;
      if (reconnectsRef.current > MAX_RECONNECTS) {
        setStatus("error");
        return;
      }
      setStatus("reconnecting");
      retryTimerRef.current = setTimeout(() => {
        if (!stale()) connect();
      }, Math.min(1_000 * reconnectsRef.current, 6_000));
    };

    const connect = () => {
      if (stale()) return;
      setStatus("connecting");

      const ws = new WebSocket(chatWsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        reconnectsRef.current = 0;
        if (pingTimerRef.current) clearInterval(pingTimerRef.current);
        pingTimerRef.current = setInterval(() => send({ type: "ping" }), PING_MS);
        setStatus("open");
      };

      ws.onmessage = (ev) => {
        if (wsRef.current !== ws) return;
        let msg: ServerMsg;
        try { msg = JSON.parse(ev.data as string) as ServerMsg; } catch { return; }

        switch (msg.type) {
          case "history":
            setMessages(msg.messages);
            break;

          case "chat-message":
            setMessages((prev) => {
              // Deduplicate (echo from server)
              if (prev.some((m) => m.id === msg.message.id)) return prev;
              return [...prev, msg.message];
            });
            if (!panelOpenRef.current) {
              setUnread((n) => n + 1);
            }
            break;

          case "chat-typing":
            setTypingName(msg.name);
            if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
            typingTimerRef.current = setTimeout(() => setTypingName(null), TYPING_DEBOUNCE);
            break;

          case "chat-peer-joined":
          case "chat-peer-left":
            // Optionally used by the UI for join/leave toasts
            break;

          case "pong":
            break;
        }
      };

      ws.onclose = (ev) => {
        if (pingTimerRef.current) clearInterval(pingTimerRef.current);
        if (wsRef.current !== ws || stale()) return;
        wsRef.current = null;
        // 4001 = invalid ticket; 4009 = replaced — both terminal
        if (ev.code === 4001 || ev.code === 4009) {
          setStatus("error");
        } else {
          scheduleReconnect();
        }
      };
    };

    connect();

    return () => {
      sessionRef.current += 1;
      teardown();
    };
  }, [chatWsUrl, send, teardown]);

  // ── Public API ─────────────────────────────────────────────────────────────

  const sendMessage = React.useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    send({ type: "chat-message", text: trimmed });
  }, [send]);

  const sendTyping = React.useCallback(() => {
    send({ type: "chat-typing" });
  }, [send]);

  /** Call when the chat panel opens/closes so unread count can reset */
  const setPanelOpen = React.useCallback((open: boolean) => {
    panelOpenRef.current = open;
    if (open) setUnread(0);
  }, []);

  return {
    status,
    messages,
    typingName,
    unread,
    sendMessage,
    sendTyping,
    setPanelOpen,
  };
}
