import axios from "axios"
import type { Coin } from "../models/Coin"
import type { CoinDetail } from "../models/CoinDetail"

export class CoinsService {
    private readonly base = "https://api.coingecko.com/api/v3/coins"

    async getTop100(): Promise<Coin[]> {
        const response = await axios.get<Coin[]>(`${this.base}/markets`, {
            params: {
                vs_currency: "usd",
                order: "market_cap_desc",
                per_page: 100,
                page: 1,
                sparkline: false
            }
        })
        return response.data
    }

    async getById(id: string): Promise<CoinDetail> {
        const response = await axios.get<CoinDetail>(`${this.base}/${id}`, {
            params: {
                localization: false,
                tickers: false,
                community_data: false,
                developer_data: false,
                sparkline: false
            }
        })
        return response.data
    }

    async getWithMarketData(id: string): Promise<CoinDetail> {
        const response = await axios.get<CoinDetail>(`${this.base}/${id}`, {
            params: {
                localization: false,
                tickers: false,
                market_data: true,
                community_data: false,
                developer_data: false,
                sparkline: false
            }
        })
        return response.data
    }
}

export const coinsService = new CoinsService()
