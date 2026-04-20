import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { useAppSelector } from "../../redux/store"
import type { Coin } from "../../models/Coin"
import type { AiPromptData, AiRecommendation } from "../../models/AiRecommendation"
import { coinsService } from "../../services/CoinsService"
import { aiService } from "../../services/AiService"
import Header from "../layout/header/Header"
import SpinnerButton from "../common/spinnerButton/SpinnerButton"
import RecommendationCard from "./recommendationCard/RecommendationCard"
import "./Ai.css"

type CoinState = {
    recommendation: AiRecommendation | null
    loading: boolean
    error: string | null
}

export default function Ai() {
    const coins = useAppSelector(s => s.coins.coins)
    const selectedIds = useAppSelector(s => s.selectedCoins.ids)

    const selectedCoins = useMemo(
        () => selectedIds.map(id => coins.find(c => c.id === id)).filter((c): c is Coin => !!c),
        [selectedIds, coins]
    )

    const [states, setStates] = useState<Record<string, CoinState>>({})
    const [apiKey, setApiKey] = useState<string | null>(() => aiService.getStoredKey())
    const [keyInput, setKeyInput] = useState("")
    const [batchLoading, setBatchLoading] = useState(false)

    const updateState = (coinId: string, patch: Partial<CoinState>) => {
        setStates(prev => {
            const existing = prev[coinId] ?? { recommendation: null, loading: false, error: null }
            return {
                ...prev,
                [coinId]: { ...existing, ...patch }
            }
        })
    }

    async function fetchSingle(coin: Coin): Promise<AiRecommendation | null> {
        updateState(coin.id, { loading: true, error: null })
        try {
            const detail = await coinsService.getWithMarketData(coin.id)
            const md = detail.market_data
            const promptData: AiPromptData = {
                name: detail.name,
                current_price_usd: md.current_price.usd,
                market_cap_usd: md.market_cap.usd,
                volume_24h_usd: md.total_volume.usd,
                price_change_percentage_30d_in_currency: md.price_change_percentage_30d_in_currency?.usd ?? 0,
                price_change_percentage_60d_in_currency: md.price_change_percentage_60d_in_currency?.usd ?? 0,
                price_change_percentage_200d_in_currency: md.price_change_percentage_200d_in_currency?.usd ?? 0
            }
            const rec = await aiService.getRecommendation(coin.id, promptData)
            updateState(coin.id, { loading: false, recommendation: rec })
            return rec
        } catch (err) {
            const message = err instanceof Error ? err.message : "Oracle unreachable"
            updateState(coin.id, { loading: false, error: message })
            return null
        }
    }

    const handleRequest = (coin: Coin) => {
        fetchSingle(coin)
    }

    const handleRequestAll = async () => {
        if (selectedCoins.length === 0) return
        setBatchLoading(true)
        try {
            await Promise.all(selectedCoins.map(c => fetchSingle(c)))
        } finally {
            setBatchLoading(false)
        }
    }

    const handleSaveKey = () => {
        const trimmed = keyInput.trim()
        if (!trimmed) return
        aiService.setKey(trimmed)
        setApiKey(trimmed)
        setKeyInput("")
    }

    const handleClearKey = () => {
        aiService.clearKey()
        setApiKey(null)
    }

    return (
        <div className="Ai">
            <Header
                title="ORACLE"
                subtitle="Invoke a language model over your tracking slate. Each request pulls fresh 200-day trajectory metrics and asks the oracle for a verdict. Signals, not certainties."
                stats={[
                    { label: "TARGETS", value: String(selectedCoins.length).padStart(2, "0") },
                    { label: "ORACLE", value: "OPENAI · GPT-4o-mini" },
                    { label: "KEY", value: apiKey ? "SET" : "MISSING" }
                ]}
            />

            <section className="Ai-key">
                <div className="Ai-keyHead">
                    <h2 className="Ai-keyTitle">// API KEY</h2>
                    <span className={`Ai-keyStatus Ai-keyStatus--${apiKey ? "ok" : "missing"}`}>
                        {apiKey ? "● STORED IN LOCAL VAULT" : "○ NOT CONFIGURED"}
                    </span>
                </div>
                {!apiKey ? (
                    <div className="Ai-keyForm">
                        <p className="Ai-keyHint">
                            Provide an OpenAI API key from <span className="Ai-keyCode">platform.openai.com</span>. It will be stored only in your browser.
                        </p>
                        <div className="Ai-keyRow">
                            <span className="Ai-keyPrompt">sk-&gt;</span>
                            <input
                                type="password"
                                value={keyInput}
                                onChange={e => setKeyInput(e.target.value)}
                                className="Ai-keyInput"
                                placeholder="paste your key here"
                                autoComplete="off"
                            />
                            <SpinnerButton onClick={handleSaveKey} variant="primary">
                                STORE KEY
                            </SpinnerButton>
                        </div>
                    </div>
                ) : (
                    <div className="Ai-keyForm">
                        <p className="Ai-keyHint">
                            Key active · {apiKey.slice(0, 6)}···{apiKey.slice(-4)}
                        </p>
                        <div className="Ai-keyRow">
                            <SpinnerButton onClick={handleClearKey} variant="danger">
                                PURGE KEY
                            </SpinnerButton>
                        </div>
                    </div>
                )}
            </section>

            {selectedCoins.length === 0 ? (
                <div className="Ai-empty">
                    <span className="Ai-emptyGlyph">?</span>
                    <h3 className="Ai-emptyTitle">NO TARGETS</h3>
                    <p className="Ai-emptyText">
                        The oracle operates on coins in your tracking slate. Pick some on the market floor.
                    </p>
                    <Link to="/" className="Ai-emptyCta">→ OPEN MARKET</Link>
                </div>
            ) : (
                <>
                    <div className="Ai-toolbar">
                        <span className="Ai-toolbarLabel">BATCH OPERATIONS</span>
                        <SpinnerButton
                            variant="primary"
                            loading={batchLoading}
                            onClick={handleRequestAll}
                            disabled={!apiKey}
                        >
                            INVOKE ALL ORACLES
                        </SpinnerButton>
                    </div>
                    <div className="Ai-grid">
                        {selectedCoins.map(coin => {
                            const state = states[coin.id]
                            return (
                                <RecommendationCard
                                    key={coin.id}
                                    coin={coin}
                                    recommendation={state?.recommendation ?? null}
                                    loading={state?.loading ?? false}
                                    error={state?.error ?? null}
                                    onRequest={handleRequest}
                                />
                            )
                        })}
                    </div>
                </>
            )}
        </div>
    )
}
