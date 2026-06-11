import OpenAI from "openai";

export function getApiKey(): string {
  return process.env.OPENAI_API_KEY?.trim() ?? "";
}

export function getOpenAIClient(): OpenAI {
  return new OpenAI({ apiKey: getApiKey() });
}

export function validateApiKey(apiKey: string): string | null {
  if (!apiKey) {
    return "OpenAI API 키가 설정되지 않았습니다. .env.local 파일에 OPENAI_API_KEY를 추가해주세요.";
  }
  if (!apiKey.startsWith("sk-") || apiKey === "sk-your-api-key-here") {
    return "OpenAI API 키가 올바르지 않습니다. .env.local에 실제 API 키(sk-로 시작)를 입력했는지 확인해주세요.";
  }
  return null;
}

export function mapOpenAIError(message: string, apiKey: string): string {
  if (message.includes("Incorrect API key")) {
    const suffix = apiKey.slice(-4);
    return [
      "OpenAI API 키가 거부되었습니다.",
      "1) 결제 등록 후 새 API 키를 발급했는지 확인",
      "2) .env.local에 키만 한 줄로 저장했는지 확인 (따옴표 없이)",
      "3) 저장 후 서버 재시작 (Ctrl+C → npm run dev)",
      `현재 서버가 읽은 키 끝 4자리: ...${suffix}`,
    ].join(" ");
  }
  if (
    message.includes("insufficient_quota") ||
    message.includes("billing") ||
    message.includes("exceeded your current quota")
  ) {
    return "OpenAI 결제/크레딧 문제입니다. Billing 페이지에서 결제 수단과 잔액을 확인해주세요.";
  }
  if (message.includes("timed out") || message.includes("timeout")) {
    return "OpenAI 응답 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.";
  }
  return message;
}
