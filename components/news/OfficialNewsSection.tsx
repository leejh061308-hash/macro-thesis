"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import OfficialNewsCard from "@/components/news/OfficialNewsCard";
import OfficialNewsForm from "@/components/news/OfficialNewsForm";
import type { OfficialNewsItem } from "@/lib/types";

const ADMIN_KEY_STORAGE = "macrolens_admin_key";
const TITLE_TAP_WINDOW_MS = 600;

function authHeaders(key: string): HeadersInit {
  return { Authorization: `Bearer ${key}` };
}

export default function OfficialNewsSection() {
  const [posts, setPosts] = useState<OfficialNewsItem[]>([]);
  const [canWrite, setCanWrite] = useState(false);
  const [adminKey, setAdminKey] = useState("");
  const [showUnlock, setShowUnlock] = useState(false);
  const [unlockInput, setUnlockInput] = useState("");
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const tapCountRef = useRef(0);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const adminKeyRef = useRef("");

  useEffect(() => {
    adminKeyRef.current = adminKey;
  }, [adminKey]);

  const verifyKey = useCallback(async (key: string): Promise<boolean> => {
    try {
      const res = await fetch("/api/official-news/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({ key }),
      });
      const data = await res.json();
      return !!data.canWrite;
    } catch {
      return false;
    }
  }, []);

  const unlock = useCallback(
    async (key: string) => {
      const trimmed = key.trim();
      if (!trimmed) return false;

      const valid = await verifyKey(trimmed);
      if (!valid) return false;

      sessionStorage.setItem(ADMIN_KEY_STORAGE, trimmed);
      setAdminKey(trimmed);
      setCanWrite(true);
      setShowUnlock(false);
      setUnlockInput("");
      setUnlockError(null);
      return true;
    },
    [verifyKey]
  );

  const lock = useCallback(() => {
    sessionStorage.removeItem(ADMIN_KEY_STORAGE);
    setAdminKey("");
    setCanWrite(false);
    setShowUnlock(false);
    setUnlockInput("");
    setUnlockError(null);
  }, []);

  const loadPendingAnalysis = useCallback(async (items: OfficialNewsItem[]) => {
    const pendingIds = items
      .filter((item) => item.aiAnalysisPending && !item.aiAnalysis)
      .map((item) => item.id);

    if (pendingIds.length === 0) return;

    try {
      const res = await fetch("/api/official-news/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: pendingIds }),
      });

      if (!res.ok) return;

      const data = await res.json();
      const analyses = (data.analyses ?? {}) as Record<number, string>;

      if (Object.keys(analyses).length === 0) return;

      setPosts((prev) =>
        prev.map((item) =>
          analyses[item.id]
            ? {
                ...item,
                aiAnalysis: analyses[item.id],
                aiAnalysisPending: false,
              }
            : item
        )
      );
    } catch {
      // 분석 실패해도 게시글은 유지
    }
  }, []);

  const loadPosts = useCallback(
    async (key?: string) => {
      setIsLoading(true);
      try {
        const authKey = key ?? adminKeyRef.current;
        const headers: HeadersInit = authKey ? authHeaders(authKey) : {};
        const res = await fetch("/api/official-news", {
          cache: "no-store",
          headers,
        });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "메인 뉴스 로딩 실패");
        }

        const items: OfficialNewsItem[] = data.posts ?? [];
        setPosts(items);
        if (authKey) {
          setCanWrite(!!data.canWrite);
        }
        loadPendingAnalysis(items);
      } catch {
        setPosts([]);
      } finally {
        setIsLoading(false);
      }
    },
    [loadPendingAnalysis]
  );

  useEffect(() => {
    const init = async () => {
      const saved = sessionStorage.getItem(ADMIN_KEY_STORAGE);
      if (saved) {
        const valid = await verifyKey(saved);
        if (valid) {
          setAdminKey(saved);
          setCanWrite(true);
          await loadPosts(saved);
          return;
        }
        sessionStorage.removeItem(ADMIN_KEY_STORAGE);
      }
      await loadPosts();
    };

    init();
  }, [loadPosts, verifyKey]);

  const handleTitleTap = () => {
    tapCountRef.current += 1;

    if (tapTimerRef.current) clearTimeout(tapTimerRef.current);

    if (tapCountRef.current >= 3) {
      tapCountRef.current = 0;
      setShowUnlock((prev) => !prev);
      setUnlockError(null);
      return;
    }

    tapTimerRef.current = setTimeout(() => {
      tapCountRef.current = 0;
    }, TITLE_TAP_WINDOW_MS);
  };

  const handleUnlockSubmit = async () => {
    setUnlockError(null);
    const ok = await unlock(unlockInput);
    if (!ok) {
      setUnlockError("인증에 실패했습니다.");
      return;
    }
    await loadPosts(unlockInput.trim());
  };

  const handlePosted = (post: OfficialNewsItem) => {
    setPosts((prev) => [post, ...prev]);
    if (post.aiAnalysisPending) {
      loadPendingAnalysis([post]);
    }
  };

  const handleDelete = async (id: number) => {
    if (!adminKey) return;
    if (!window.confirm("이 메인 뉴스를 삭제할까요?")) return;

    setDeletingId(id);
    setActionMessage(null);

    try {
      const res = await fetch(`/api/official-news?id=${id}`, {
        method: "DELETE",
        headers: authHeaders(adminKey),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "메인 뉴스 삭제에 실패했습니다.");
      }

      setPosts((prev) => prev.filter((item) => item.id !== id));
      setActionMessage("메인 뉴스를 삭제했습니다.");
    } catch (err) {
      setActionMessage(
        err instanceof Error ? err.message : "메인 뉴스 삭제에 실패했습니다."
      );
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
    if (!actionMessage) return;
    const timer = setTimeout(() => setActionMessage(null), 3000);
    return () => clearTimeout(timer);
  }, [actionMessage]);

  return (
    <section className="space-y-3">
      <div>
        <h2
          className="text-lg font-bold text-white select-none"
          onClick={handleTitleTap}
        >
          메인 뉴스
        </h2>
        <p className="text-[11px] text-gray-500">
          {canWrite && adminKey
            ? "관리자 모드 · 작성·삭제 가능"
            : "AI 매크로 분석 추가"}
        </p>
      </div>

      {showUnlock && !canWrite && (
        <div className="rounded-xl border border-surface-border bg-surface-card p-4">
          <input
            type="password"
            value={unlockInput}
            onChange={(e) => setUnlockInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleUnlockSubmit()}
            placeholder="인증 키"
            className="w-full rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm text-white placeholder:text-neutral focus:border-accent/50 focus:outline-none"
          />
          {unlockError && (
            <p className="mt-2 text-xs text-bearish">{unlockError}</p>
          )}
          <button
            type="button"
            onClick={handleUnlockSubmit}
            className="mt-3 w-full rounded-lg border border-surface-border py-2 text-xs text-gray-300 hover:border-accent/40 hover:text-accent"
          >
            확인
          </button>
        </div>
      )}

      {canWrite && adminKey && (
        <OfficialNewsForm
          adminKey={adminKey}
          onPosted={handlePosted}
          onLock={lock}
        />
      )}

      {actionMessage && (
        <div className="rounded-lg border border-accent/30 bg-accent/10 px-4 py-2.5 text-sm text-accent">
          {actionMessage}
        </div>
      )}

      {isLoading && (
        <div className="h-32 animate-pulse rounded-xl border border-accent/20 bg-accent/5" />
      )}

      {!isLoading && posts.length === 0 && (
        <div className="rounded-xl border border-dashed border-surface-border px-4 py-8 text-center text-sm text-gray-500">
          등록된 메인 뉴스가 없습니다.
        </div>
      )}

      {!isLoading &&
        posts.map((item) => (
          <OfficialNewsCard
            key={item.id}
            item={item}
            canDelete={canWrite && !!adminKey}
            onDelete={handleDelete}
            isDeleting={deletingId === item.id}
          />
        ))}
    </section>
  );
}
