import type { MultiFactorStrategyId, UniverseId } from "./types";
import { QUANT_UNIVERSE } from "./universe";

/** Nasdaq 100 주요 구성종목 (S&P500과 중복 제외 후 추가) */
export const NASDAQ100_EXTRA: { ticker: string; name: string }[] = [
  { ticker: "ASML", name: "ASML" },
  { ticker: "AZN", name: "AstraZeneca" },
  { ticker: "BIIB", name: "Biogen" },
  { ticker: "BKNG", name: "Booking Holdings" },
  { ticker: "CCEP", name: "Coca-Cola Europacific" },
  { ticker: "CDW", name: "CDW" },
  { ticker: "CHTR", name: "Charter Communications" },
  { ticker: "CMCSA", name: "Comcast" },
  { ticker: "CPRT", name: "Copart" },
  { ticker: "CRWD", name: "CrowdStrike" },
  { ticker: "CSGP", name: "CoStar Group" },
  { ticker: "CSX", name: "CSX" },
  { ticker: "CTAS", name: "Cintas" },
  { ticker: "CTSH", name: "Cognizant" },
  { ticker: "DDOG", name: "Datadog" },
  { ticker: "DXCM", name: "DexCom" },
  { ticker: "EA", name: "Electronic Arts" },
  { ticker: "EXC", name: "Exelon" },
  { ticker: "FANG", name: "Diamondback Energy" },
  { ticker: "FAST", name: "Fastenal" },
  { ticker: "FTNT", name: "Fortinet" },
  { ticker: "GFS", name: "GlobalFoundries" },
  { ticker: "IDXX", name: "IDEXX Laboratories" },
  { ticker: "ILMN", name: "Illumina" },
  { ticker: "INTU", name: "Intuit" },
  { ticker: "KDP", name: "Keurig Dr Pepper" },
  { ticker: "KHC", name: "Kraft Heinz" },
  { ticker: "LULU", name: "Lululemon" },
  { ticker: "MAR", name: "Marriott" },
  { ticker: "MCHP", name: "Microchip Technology" },
  { ticker: "MELI", name: "MercadoLibre" },
  { ticker: "MNST", name: "Monster Beverage" },
  { ticker: "MRVL", name: "Marvell Technology" },
  { ticker: "MSTR", name: "MicroStrategy" },
  { ticker: "NXPI", name: "NXP Semiconductors" },
  { ticker: "ODFL", name: "Old Dominion Freight" },
  { ticker: "ON", name: "ON Semiconductor" },
  { ticker: "PAYX", name: "Paychex" },
  { ticker: "PCAR", name: "Paccar" },
  { ticker: "PDD", name: "PDD Holdings" },
  { ticker: "PYPL", name: "PayPal" },
  { ticker: "ROST", name: "Ross Stores" },
  { ticker: "SBUX", name: "Starbucks" },
  { ticker: "SHOP", name: "Shopify" },
  { ticker: "TEAM", name: "Atlassian" },
  { ticker: "TMUS", name: "T-Mobile US" },
  { ticker: "TTD", name: "Trade Desk" },
  { ticker: "TTWO", name: "Take-Two Interactive" },
  { ticker: "VRSK", name: "Verisk Analytics" },
  { ticker: "WBD", name: "Warner Bros Discovery" },
  { ticker: "WDAY", name: "Workday" },
  { ticker: "XEL", name: "Xcel Energy" },
  { ticker: "ZS", name: "Zscaler" },
];

function dedupe(stocks: { ticker: string; name: string }[]) {
  const seen = new Set<string>();
  return stocks.filter((s) => {
    if (seen.has(s.ticker)) return false;
    seen.add(s.ticker);
    return true;
  });
}

export const SP500_UNIVERSE = QUANT_UNIVERSE;

export const NASDAQ100_UNIVERSE = dedupe([
  ...QUANT_UNIVERSE.filter((s) =>
    [
      "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA", "AVGO",
      "COST", "NFLX", "AMD", "ADBE", "PEP", "CSCO", "INTC", "QCOM",
      "TXN", "AMGN", "HON", "SBUX", "BKNG", "GILD", "ISRG", "ADI",
      "REGN", "VRTX", "LRCX", "KLAC", "SNPS", "CDNS", "MU", "PANW",
      "NOW", "CRM", "ORCL", "CMCSA",
    ].includes(s.ticker)
  ),
  ...NASDAQ100_EXTRA,
]);

export const COMBINED_UNIVERSE = dedupe([
  ...QUANT_UNIVERSE,
  ...NASDAQ100_EXTRA,
]);

export function getUniverseStocks(id: UniverseId = "combined") {
  switch (id) {
    case "sp500":
      return SP500_UNIVERSE;
    case "nasdaq100":
      return NASDAQ100_UNIVERSE;
    case "combined":
    default:
      return COMBINED_UNIVERSE;
  }
}

export function getUniverseTickers(id: UniverseId = "combined"): string[] {
  return getUniverseStocks(id).map((s) => s.ticker);
}

export const UNIVERSE_LABELS: Record<UniverseId, string> = {
  combined: "S&P500 + Nasdaq100",
  sp500: "S&P 500",
  nasdaq100: "Nasdaq 100",
};

export const ALL_MULTI_FACTOR_IDS: MultiFactorStrategyId[] = [
  "value-quality",
  "quality-momentum",
  "value-momentum",
  "all-factor",
];

export function isValidMultiFactorId(id: string): id is MultiFactorStrategyId {
  return ALL_MULTI_FACTOR_IDS.includes(id as MultiFactorStrategyId);
}

export const REBALANCE_FREQUENCIES = [
  "monthly",
  "quarterly",
  "semiannual",
  "annual",
] as const;

export const PORTFOLIO_SIZES = [10, 20, 50, 100] as const;
