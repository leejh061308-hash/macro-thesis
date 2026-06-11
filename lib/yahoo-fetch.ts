import { Agent, fetch as undiciFetch, type RequestInit as UndiciRequestInit } from "undici";

const yahooAgent = new Agent({
  connect: {
    family: 4,
    timeout: 8_000,
  },
  headersTimeout: 12_000,
  bodyTimeout: 12_000,
});

export async function fetchYahoo(url: string, init?: UndiciRequestInit) {
  return undiciFetch(url, {
    ...init,
    dispatcher: yahooAgent,
  });
}
