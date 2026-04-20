import { useEffect, useState } from "react"
import type { Coin } from "../../../models/Coin"
import type { CoinDetail } from "../../../models/CoinDetail"
import { coinsService } from "../../../services/CoinsService"
import Modal from "../../common/modal/Modal"
import Spinner from "../../common/spinner/Spinner"
import { formatCurrency } from "../../../util/format"
import "./MoreInfoModal.css"

interface MoreInfoModalProps {
    coin: Coin | null
    onClose: () => void
}

const CACHE = new Map<string, CoinDetail>()

export default function MoreInfoModal({ coin, onClose }: MoreInfoModalProps) {
    const [detail, setDetail] = useState<CoinDetail | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!coin) {
            setDetail(null)
            setError(null)
            return
        }
        const cached = CACHE.get(coin.id)
        if (cached) {
            const cacheTime = (cached as CoinDetail & { _ts?: number })._ts ?? 0
            if (Date.now() - cacheTime < 2 * 60 * 1000) {
                setDetail(cached)
                return
            }
        }

        let cancelled = false
        async function load() {
            if (!coin) return
            setLoading(true)
            setError(null)
            try {
                const data = await coinsService.getWithMarketData(coin.id)
                ;(data as CoinDetail & { _ts?: number })._ts = Date.now()
                CACHE.set(coin.id, data)
                if (!cancelled) setDetail(data)
            } catch (err) {
                if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load")
            } finally {
                if (!cancelled) setLoading(false)
            }
        }
        load()
        return () => {
            cancelled = true
        }
    }, [coin])

    return (
        <Modal open={!!coin} onClose={onClose} title={coin ? `${coin.name.toUpperCase()} · ${coin.symbol.toUpperCase()}` : ""} size="md">
            {loading && (
                <div className="MoreInfoModal-loading">
                    <Spinner label="fetching quote" size="lg" />
                </div>
            )}
            {error && !loading && (
                <div className="MoreInfoModal-error">
                    <span className="MoreInfoModal-errorTag">ERR</span>
                    <span>{error}</span>
                </div>
            )}
            {detail && !loading && (
                <div className="MoreInfoModal-content">
                    <div className="MoreInfoModal-identity">
                        <img src={detail.image?.large} alt="" className="MoreInfoModal-icon" />
                        <div className="MoreInfoModal-identityText">
                            <span className="MoreInfoModal-symbol">{detail.symbol.toUpperCase()}</span>
                            <span className="MoreInfoModal-name">{detail.name}</span>
                        </div>
                    </div>

                    <div className="MoreInfoModal-prices">
                        <PriceBlock label="USD" value={formatCurrency(detail.market_data.current_price.usd, "USD")} accent />
                        <PriceBlock label="EUR" value={formatCurrency(detail.market_data.current_price.eur, "EUR")} />
                        <PriceBlock label="ILS" value={formatCurrency(detail.market_data.current_price.ils, "ILS")} />
                    </div>

                    <div className="MoreInfoModal-footer">
                        <span>last refresh · {new Date().toLocaleTimeString("en-US", { hour12: false })}</span>
                        <span>source · coingecko</span>
                    </div>
                </div>
            )}
        </Modal>
    )
}

interface PriceBlockProps {
    label: string
    value: string
    accent?: boolean
}

function PriceBlock({ label, value, accent }: PriceBlockProps) {
    return (
        <div className={`MoreInfoModal-priceBlock${accent ? " MoreInfoModal-priceBlock--accent" : ""}`}>
            <span className="MoreInfoModal-priceLabel">{label}</span>
            <span className="MoreInfoModal-priceValue">{value}</span>
        </div>
    )
}
