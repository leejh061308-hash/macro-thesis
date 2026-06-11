import StockDetailView from "@/components/stocks/StockDetailView";
import { normalizeTicker } from "@/lib/tickers";

export default async function StockDetailPage({
  params,
}: {
  params: Promise<{ ticker: string }>;
}) {
  const { ticker } = await params;
  return <StockDetailView ticker={normalizeTicker(ticker)} />;
}
