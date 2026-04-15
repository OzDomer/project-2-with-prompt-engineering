import axios from "axios"
import type { AiPromptData, AiRecommendation } from "../models/AiRecommendation"

const STORAGE_KEY = "cryptonite.openai_api_key"

export class AiService {
    private readonly url = "https://api.openai.com/v1/chat/completions"
    private readonly model = "gpt-4o-mini"

    getStoredKey(): string | null {
        return localStorage.getItem(STORAGE_KEY)
    }

    setKey(key: string): void {
        localStorage.setItem(STORAGE_KEY, key)
    }

    clearKey(): void {
        localStorage.removeItem(STORAGE_KEY)
    }

    async getRecommendation(coinId: string, data: AiPromptData): Promise<AiRecommendation> {
        const apiKey = this.getStoredKey()
        if (!apiKey) throw new Error("OpenAI API key is not set")

        const prompt = this.buildPrompt(data)
        const response = await axios.post(
            this.url,
            {
                model: this.model,
                messages: [
                    {
                        role: "system", content: 
                        `You are a cryptocurrency investment advisor. You will receive market data about a coin in the user message. Analyze the data and respond with a recommendation.
                        Respond ONLY in raw JSON. No markdown, no code blocks, no backticks, no extra text. Just the JSON object.
                        Use this exact format: {"verdict": "buy or sell", "explanation": "string", "flavor": "string"}
                        explanation: 2-4 sentences analyzing the coin's price trends, volume, and market cap based on the provided data. Explain why you reached your verdict.
                        flavor: 1-2 sentences about the coin itself — what it does, what makes it unique, or an interesting fact about it.` },
                    { role: "user", content: prompt }
                ]
            },
            {
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    "Content-Type": "application/json"
                }
            }
        )

        const text: string = response.data?.choices?.[0]?.message?.content ?? ""
        return this.parseRecommendation(coinId, text)
    }

    private buildPrompt(d: AiPromptData): string {
        return [
            "You are a disciplined crypto analyst. Based on the data below, should a retail investor buy this coin now?",
            "Reply in strict JSON: {\"verdict\":\"buy\"|\"don't buy\",\"explanation\":\"...\"}.",
            "The explanation must be 2-4 concise sentences grounded in the metrics.",
            "",
            `Coin: ${d.name}`,
            `Current price (USD): ${d.current_price_usd}`,
            `Market cap (USD): ${d.market_cap_usd}`,
            `24h volume (USD): ${d.volume_24h_usd}`,
            `30d price change %: ${d.price_change_percentage_30d_in_currency}`,
            `60d price change %: ${d.price_change_percentage_60d_in_currency}`,
            `200d price change %: ${d.price_change_percentage_200d_in_currency}`
        ].join("\n")
    }

    private parseRecommendation(coinId: string, text: string): AiRecommendation {
        const jsonMatch = text.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
            try {
                const parsed = JSON.parse(jsonMatch[0])
                const verdict = String(parsed.verdict ?? "").toLowerCase().includes("don") ? "don't buy" : "buy"
                const explanation = String(parsed.explanation ?? text)
                return { coinId, verdict, explanation }
            } catch {
                // fall through
            }
        }
        const lower = text.toLowerCase()
        const verdict: "buy" | "don't buy" = lower.includes("don't buy") || lower.includes("do not buy") ? "don't buy" : "buy"
        return { coinId, verdict, explanation: text.trim() || "No explanation returned." }
    }
}

export const aiService = new AiService()
