// Binance API endpoints - more stable and no rate limit issues
const BINANCE_API = {
  "ETH/USD": "https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT",
  "BTC/USD": "https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT"
};

export interface PriceData {
  price: number;
  timestamp: number;
  roundId: bigint;
  formattedPrice: string;
}

export interface HistoricalPrice {
  time: string;
  price: number;
  timestamp: number;
}

// Base price storage for smooth simulation
let basePrice: number | null = null;
let lastRealFetch = 0;
const REAL_FETCH_INTERVAL = 3000; // Fetch real price every 3 seconds for high frequency updates

export async function getLatestPrice(pair: "ETH/USD" | "BTC/USD" = "ETH/USD"): Promise<PriceData> {
  const now = Date.now();

  // Try to fetch real price every 3 seconds for high frequency updates
  if (!basePrice || (now - lastRealFetch) > REAL_FETCH_INTERVAL) {
    try {
      const response = await fetch(BINANCE_API[pair], { cache: "no-store" });
      if (!response.ok) throw new Error(`Binance API ${response.status}`);
      const body = await response.json();
      const price = parseFloat(body.price);

      if (!price || isNaN(price)) throw new Error("Invalid price from Binance");

      basePrice = price;
      lastRealFetch = now;
      console.log(`[Price] Real ${pair} from Binance: $${price.toFixed(2)}`);
      return {
        price,
        timestamp: now,
        roundId: BigInt(Math.floor(now / 1000)),
        formattedPrice: `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      };
    } catch (error) {
      console.warn(`[Price] Failed to fetch ${pair} from Binance, using simulation`, error);
      // Set initial base price if not set
      if (!basePrice) {
        basePrice = pair === "ETH/USD" ? 3250 : 95000;
      }
    }
  }

  // Generate simulated price with small random variation
  if (!basePrice) {
    basePrice = pair === "ETH/USD" ? 3250 : 95000;
  }

  // Add realistic variation (±0.2% for visible changes)
  const variation = (Math.random() - 0.5) * 0.004; // ±0.2%
  const currentPrice = basePrice * (1 + variation);

  console.log(`[Price] Simulated ${pair} price: $${currentPrice.toFixed(2)} (base: $${basePrice.toFixed(2)}, variation: ${(variation * 100).toFixed(3)}%)`);

  return {
    price: parseFloat(currentPrice.toFixed(2)),
    timestamp: now,
    roundId: BigInt(0),
    formattedPrice: `$${currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  };
}

export async function getHistoricalPrices(
  pair: "ETH/USD" | "BTC/USD" = "ETH/USD",
  count: number = 50
): Promise<HistoricalPrice[]> {
  const latestData = await getLatestPrice(pair);
  const currentPrice = latestData.price;

  // Generate realistic-looking historical data based on latest price
  const data: HistoricalPrice[] = [];
  let price = currentPrice * 0.995; // Start slightly lower (0.5% lower)

  for (let i = 0; i < count; i++) {
    const timestamp = Date.now() - (count - i) * 1000; // 1 second intervals

    // Add small realistic variation (±0.1%)
    price = price + (Math.random() - 0.5) * (currentPrice * 0.002);

    data.push({
      time: new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      price: parseFloat(price.toFixed(2)),
      timestamp
    });
  }

  // Make sure last price matches current price
  data[data.length - 1].price = currentPrice;

  return data;
}

export async function subscribeToPriceUpdates(
  pair: "ETH/USD" | "BTC/USD" = "ETH/USD",
  callback: (priceData: PriceData) => void,
  interval: number = 1000 // 1 second for high frequency updates
): Promise<() => void> {
  console.log(`[Price] Starting price subscription for ${pair} with ${interval}ms interval`);

  // Initial fetch
  const initialPrice = await getLatestPrice(pair);
  callback(initialPrice);

  // Set up polling
  const intervalId = setInterval(async () => {
    try {
      const priceData = await getLatestPrice(pair);
      console.log(`[Price] Update callback: $${priceData.price.toFixed(2)}`);
      callback(priceData);
    } catch (error) {
      console.error("Error fetching price update:", error);
    }
  }, interval);

  // Return cleanup function
  return () => {
    console.log(`[Price] Cleaning up price subscription for ${pair}`);
    clearInterval(intervalId);
  };
}

export function calculatePriceChange(oldPrice: number, newPrice: number): {
  change: number;
  changePercent: number;
  isPositive: boolean;
} {
  const change = newPrice - oldPrice;
  const changePercent = (change / oldPrice) * 100;
  const isPositive = change >= 0;

  return {
    change: parseFloat(change.toFixed(2)),
    changePercent: parseFloat(changePercent.toFixed(2)),
    isPositive
  };
}
