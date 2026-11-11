"use client";
import * as React from "react";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface MentorMatchItem {
  mentor_id:               string;
  mentor_name:             string;
  title:                   string | null;
  company:                 string | null;
  domain:                  string | null;
  bio:                     string | null;
  skills:                  string | null;
  capacity:                number;
  match_score:             number;      // 1–100
  match_reasons:           string[];
  suggested_icebreaker:    string;
  recommended_focus_areas: string[];
  similarity:              number;      // 0–1
}

export interface MentorMatchResponse {
  query_summary:               string;
  total_candidates_evaluated:  number;
  recommendations:             MentorMatchItem[];
}

export interface MatchRequest {
  target_role:          string;
  semester:             string;
  skills_and_interests: string;
  bio?:                 string;
}

export type MatchStatus = "idle" | "loading" | "success" | "error";

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useMentorMatch() {
  const [status,  setStatus]  = React.useState<MatchStatus>("idle");
  const [result,  setResult]  = React.useState<MentorMatchResponse | null>(null);
  const [error,   setError]   = React.useState<string | null>(null);

  const runMatch = React.useCallback(async (req: MatchRequest) => {
    setStatus("loading");
    setError(null);
    setResult(null);

    try {
      const res  = await fetch("/api/ai-match/mentors", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(req),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(data?.error ?? "AI matching failed.");
        setStatus("error");
        return;
      }

      setResult(data as MentorMatchResponse);
      setStatus("success");
    } catch {
      setError("Could not reach the server.");
      setStatus("error");
    }
  }, []);

  const reset = React.useCallback(() => {
    setStatus("idle");
    setResult(null);
    setError(null);
  }, []);

  return { status, result, error, runMatch, reset };
}
