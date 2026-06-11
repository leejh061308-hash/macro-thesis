"use client";

import { useEffect, useState } from "react";
import type { MainNewsItem } from "@/lib/types";

function toDatetimeLocalValue(iso: string): string {
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

interface OfficialNewsFormProps {
  adminKey: string;
  onPosted: (post: MainNewsItem) => void;
  onUpdated?: (post: MainNewsItem) => void;
  onLock: () => void;
  editingPost?: MainNewsItem | null;
  onCancelEdit?: () => void;
}

export default function OfficialNewsForm({
  adminKey,
  onPosted,
  onUpdated,
  onLock,
  editingPost = null,
  onCancelEdit,
}: OfficialNewsFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [publishedAt, setPublishedAt] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!editingPost;

  useEffect(() => {
    if (!editingPost) return;

    setIsOpen(true);
    setTitle(editingPost.title);
    setSummary(editingPost.summary);
    setSourceUrl(editingPost.sourceUrl ?? "");
    setPublishedAt(toDatetimeLocalValue(editingPost.publishedAt));
    setError(null);
  }, [editingPost]);

  const resetForm = () => {
    setTitle("");
    setSummary("");
    setSourceUrl("");
    setPublishedAt("");
    setError(null);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const payload = {
        title,
        summary,
        sourceUrl: sourceUrl.trim() || null,
        publishedAt: publishedAt.trim() || undefined,
      };

      const res = await fetch("/api/official-news", {
        method: isEditing ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminKey}`,
        },
        body: JSON.stringify(
          isEditing ? { id: editingPost.id, ...payload } : payload
        ),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.error ||
            (isEditing ? "수정에 실패했습니다." : "등록에 실패했습니다.")
        );
      }

      if (isEditing) {
        onUpdated?.(data.post);
        onCancelEdit?.();
      } else {
        onPosted(data.post);
      }

      resetForm();
      setIsOpen(false);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : isEditing
            ? "수정에 실패했습니다."
            : "등록에 실패했습니다."
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
          <span>{isEditing ? "메인 뉴스 수정" : "메인 뉴스 작성"}</span>
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
            <label className="mb-1.5 block text-xs text-gray-400">요약</label>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={5}
              placeholder="이벤트 해설, 수치, 시장 반응 메모..."
              className="w-full resize-none rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm text-white placeholder:text-neutral focus:border-accent/50 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs text-gray-400">
              원문 URL (선택)
            </label>
            <input
              type="url"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="https://..."
              className="w-full rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm text-white placeholder:text-neutral focus:border-accent/50 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs text-gray-400">
              발행일 (선택)
            </label>
            <input
              type="datetime-local"
              value={publishedAt}
              onChange={(e) => setPublishedAt(e.target.value)}
              className="w-full rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm text-white focus:border-accent/50 focus:outline-none"
            />
          </div>

          {error && <p className="text-xs text-bearish">{error}</p>}

          <div className="flex gap-2">
            {isEditing && onCancelEdit && (
              <button
                type="button"
                onClick={() => {
                  onCancelEdit();
                  resetForm();
                  setIsOpen(false);
                }}
                className="flex-1 rounded-lg border border-surface-border py-2.5 text-sm text-gray-300 hover:text-white"
              >
                취소
              </button>
            )}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 rounded-lg bg-accent py-2.5 text-sm font-semibold text-surface transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {isSubmitting
                ? isEditing
                  ? "수정 중..."
                  : "등록 및 AI 분석 중..."
                : isEditing
                  ? "메인 뉴스 수정"
                  : "메인 뉴스 등록"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
