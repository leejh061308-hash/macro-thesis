"use client";

import { useState } from "react";
import type { OfficialNewsItem } from "@/lib/types";

const EVENT_TYPES = [
  "CPI",
  "FOMC",
  "고용지표",
  "금리",
  "GDP",
  "실적발표",
  "환율",
  "기타",
] as const;

interface OfficialNewsFormProps {
  adminKey: string;
  onPosted: (post: OfficialNewsItem) => void;
  onLock: () => void;
}

export default function OfficialNewsForm({
  adminKey,
  onPosted,
  onLock,
}: OfficialNewsFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [eventType, setEventType] = useState<string>("CPI");
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/official-news", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminKey}`,
        },
        body: JSON.stringify({ title, content, eventType }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "등록에 실패했습니다.");
      }

      onPosted(data.post);
      setTitle("");
      setContent("");
      setIsOpen(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "등록에 실패했습니다."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-xl border border-surface-border bg-surface-card p-4">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="flex flex-1 items-center justify-between text-sm font-medium text-gray-300 hover:text-white"
        >
          <span>메인 뉴스 작성</span>
          <span className="text-xs text-gray-500">{isOpen ? "닫기" : "열기"}</span>
        </button>
        <button
          type="button"
          onClick={onLock}
          className="shrink-0 rounded border border-surface-border px-2 py-1 text-[10px] text-gray-500 hover:text-gray-300"
          title="작성 잠금"
        >
          잠금
        </button>
      </div>

      {isOpen && (
        <div className="mt-4 space-y-3 border-t border-surface-border pt-4">
          <div>
            <label className="mb-1.5 block text-xs text-gray-400">제목</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 5월 미국 CPI 발표 — 전월 대비 +0.3%"
              className="w-full rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm text-white placeholder:text-neutral focus:border-accent/50 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs text-gray-400">
              이벤트 유형
            </label>
            <select
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              className="w-full rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm text-white focus:border-accent/50 focus:outline-none"
            >
              {EVENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs text-gray-400">내용</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              placeholder="이벤트 해설, 수치, 시장 반응 메모..."
              className="w-full resize-none rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm text-white placeholder:text-neutral focus:border-accent/50 focus:outline-none"
            />
          </div>

          {error && <p className="text-xs text-bearish">{error}</p>}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full rounded-lg bg-accent py-2.5 text-sm font-semibold text-surface transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {isSubmitting ? "등록 및 AI 분석 중..." : "메인 뉴스 등록"}
          </button>
        </div>
      )}
    </div>
  );
}
