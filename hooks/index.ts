"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { AttackType, LogEntry, Challenge, ChallengeResult } from "@/types";
import {
  ATTACK_TEMPLATES,
  COUNTRIES,
  USER_AGENTS,
  uid,
  rnd,
  fakeIp,
  fakePort,
} from "@/constants/attackData";
import { CHALLENGES } from "@/challenges";
import { normaliseAttackType } from "@/utils/format";

// ── useTimer ──────────────────────────────────────────────────────────────────

export function useTimer(isRunning: boolean): number {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const t = setInterval(() => {
      if (isRunning) setElapsed((e) => e + 1);
    }, 1000);
    return () => clearInterval(t);
  }, [isRunning]);
  return elapsed;
}

// ── useToast ──────────────────────────────────────────────────────────────────

export function useToast() {
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const show = useCallback((msg: string, ok = true) => {
    setToast({ msg, ok });
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setToast(null), 2800);
  }, []);

  return [toast, show] as const;
}

// ── useAttackSimulator ────────────────────────────────────────────────────────

export function useAttackSimulator(
  patchedTypes: Set<AttackType>,
  isRunning: boolean,
) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [alertFlash, setAlertFlash] = useState(false);
  const seenRealIds = useRef(new Set<string>());
  const patchedRef = useRef(patchedTypes);

  useEffect(() => {
    patchedRef.current = patchedTypes;
  }, [patchedTypes]);

  const flash = useCallback(() => {
    setAlertFlash(true);
    setTimeout(() => setAlertFlash(false), 600);
  }, []);

  const addLog = useCallback(
    (entry: LogEntry) => {
      setLogs((prev) => [entry, ...prev].slice(0, 150));
      if (entry.severity === "critical") flash();
    },
    [flash],
  );

  const spawnAttack = useCallback(() => {
    const available = ATTACK_TEMPLATES.filter(
      (t) => !patchedRef.current.has(t.type),
    );
    if (!available.length) return;
    const tpl = available[rnd(0, available.length)];
    addLog({
      ...tpl,
      id: uid(),
      ts: Date.now(),
      ip: fakeIp(),
      port: fakePort(),
      country: COUNTRIES[rnd(0, COUNTRIES.length)],
      userAgent: USER_AGENTS[rnd(0, USER_AGENTS.length)],
      patched: false,
      detected: false,
    });
  }, [addLog]);

  // Poll real attacks written by the app's login/search/transactions pages
  useEffect(() => {
    const poll = setInterval(() => {
      try {
        const raw = localStorage.getItem("real_attack_log");
        if (!raw) return;
        const events: any[] = JSON.parse(raw);
        const fresh = events.filter((e) => !seenRealIds.current.has(e.id));
        if (!fresh.length) return;
        fresh.forEach((e) => seenRealIds.current.add(e.id));

        const normalised = fresh
          .map(normaliseAttackType)
          .filter((e): e is LogEntry => e !== null); // drop unknown types

        normalised.forEach(addLog);
      } catch {
        /* ignore parse errors */
      }
    }, 600);
    return () => clearInterval(poll);
  }, [addLog]);

  // Periodic simulated attack spawn
  useEffect(() => {
    if (!isRunning) return;
    spawnAttack();
    const t = setInterval(spawnAttack, 6000);
    return () => clearInterval(t);
  }, [isRunning, spawnAttack]);

  return { logs, setLogs, alertFlash };
}

// ── useChallengeState ─────────────────────────────────────────────────────────
// Owns every piece of challenge-editor state so DefensePage stays clean.

export function useChallengeState() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<AttackType | null>(null);
  const [result, setResult] = useState<ChallengeResult>("idle");

  // Two-file editor state (keys are the challenge's tab names)
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [codes, setCodes] = useState<Record<string, string>>({});
  const [feedbacks, setFeedbacks] = useState<Record<string, string>>({});
  const [fileOk, setFileOk] = useState<Record<string, boolean>>({});
  const [showHint, setShowHint] = useState(false);

  // Single-snippet editor state
  const [singleCode, setSingleCode] = useState("");
  const [singleFeedback, setSingleFeedback] = useState("");

  function openChallenge(challengeType: AttackType) {
    const ch = CHALLENGES[challengeType];
    if (!ch) return;

    setType(challengeType);
    setResult("idle");
    setShowHint(false);
    setSingleFeedback("");

    if (ch.kind === "two-file") {
      setActiveTab(ch.tabs[0]);
      setCodes(Object.fromEntries(ch.tabs.map((k) => [k, ch.startCodes[k]])));
      setFeedbacks(Object.fromEntries(ch.tabs.map((k) => [k, ""])));
      setFileOk(Object.fromEntries(ch.tabs.map((k) => [k, false])));
    } else {
      setSingleCode(ch.starterCode);
    }

    setOpen(true);
  }

  function close() {
    setOpen(false);
    setType(null);
    setResult("idle");
    setShowHint(false);
    setSingleFeedback("");
    setCodes({});
    setFeedbacks({});
    setFileOk({});
    setActiveTab(null);
  }

  return {
    open,
    type,
    result,
    setResult,
    activeTab,
    setActiveTab,
    codes,
    setCodes,
    feedbacks,
    setFeedbacks,
    fileOk,
    setFileOk,
    showHint,
    setShowHint,
    singleCode,
    setSingleCode,
    singleFeedback,
    setSingleFeedback,
    openChallenge,
    close,
  };
}
