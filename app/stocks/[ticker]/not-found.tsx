import Link from "next/link";

export default function NotFound() {
  return (
    <div className="py-12 text-center">
      <p className="mb-4 text-neutral">종목을 찾을 수 없습니다.</p>
      <Link
        href="/stocks"
        className="text-sm text-accent hover:underline"
      >
        관심종목으로 돌아가기
      </Link>
    </div>
  );
}
