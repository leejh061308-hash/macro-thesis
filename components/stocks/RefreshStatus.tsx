interface RefreshStatusProps {
  lastUpdated: Date | null;
  isRefreshing: boolean;
  intervalSec: number;
}

export default function RefreshStatus({
  lastUpdated,
  isRefreshing,
  intervalSec,
}: RefreshStatusProps) {
  const timeLabel = lastUpdated
    ? lastUpdated.toLocaleTimeString("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : null;

  return (
    <p className="text-xs text-neutral flex items-center gap-1.5">
      {isRefreshing && (
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
      )}
      {intervalSec}초마다 자동 갱신
      {timeLabel && <span className="text-gray-500">· {timeLabel}</span>}
    </p>
  );
}
