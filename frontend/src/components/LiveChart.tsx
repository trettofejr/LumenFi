import { useState, useEffect, useRef } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { motion } from "framer-motion";
import { getHistoricalPrices, subscribeToPriceUpdates, type HistoricalPrice } from "@/lib/priceService";

interface LiveChartProps {
    oraclePrice?: number | null;
}

export const LiveChart = ({ oraclePrice }: LiveChartProps) => {
    const [data, setData] = useState<HistoricalPrice[]>([]);
    const [currentPrice, setCurrentPrice] = useState<number>(0);
    const [isLoading, setIsLoading] = useState(true);
    const [priceChange, setPriceChange] = useState<{ value: number; isPositive: boolean }>({
        value: 0,
        isPositive: true
    });

    // Track oracle pushes to smooth chart updates
    const lastOraclePrice = useRef<number | null>(null);
    const pendingOracleInjection = useRef<number | null>(null);
    const oracleSeen = useRef(false);

    useEffect(() => {
        if (oraclePrice && oraclePrice !== lastOraclePrice.current) {
            setCurrentPrice(oraclePrice);
            lastOraclePrice.current = oraclePrice;
            oracleSeen.current = true;
            pendingOracleInjection.current = oraclePrice;

            // Add a data point for the oracle price
            setData(prev => {
                const newEntry: HistoricalPrice = {
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                    price: oraclePrice,
                    timestamp: Date.now()
                };
                // Keep last 50 points
                const newData = [...prev, newEntry];
                if (newData.length > 50) newData.shift();
                return newData;
            });
        }
    }, [oraclePrice]);

    useEffect(() => {
        let alive = true;

        const loadInitialData = async () => {
            try {
                const historicalData = await getHistoricalPrices("BTC/USD", 50);
                if (!alive) return;
                setData(historicalData);
                if (historicalData.length > 0 && !oracleSeen.current) {
                    setCurrentPrice(historicalData[historicalData.length - 1].price);
                }
                setIsLoading(false);
            } catch (error) {
                console.error("Failed to load initial price data:", error);
                setIsLoading(false);
            }
        };

        loadInitialData();

        const cleanupPromise = subscribeToPriceUpdates("BTC/USD", (priceData) => {
            const injected = pendingOracleInjection.current;
            const effectivePrice = injected ?? priceData.price;
            if (injected !== null) {
                pendingOracleInjection.current = null;
            }

            const newEntry: HistoricalPrice = {
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                price: effectivePrice,
                timestamp: priceData.timestamp
            };

            setData(prev => {
                const oldPrice = prev.length > 0 ? prev[prev.length - 1].price : effectivePrice;
                const change = effectivePrice - oldPrice;

                setPriceChange({
                    value: Math.abs(change),
                    isPositive: change >= 0
                });

                setCurrentPrice(effectivePrice);

                // Keep last 50 points
                const newData = [...prev.slice(-49), newEntry];
                return newData;
            });
        }, 1000);

        return () => {
            alive = false;
            cleanupPromise.then(fn => fn());
        };
    }, []);

    if (isLoading) {
        return (
            <div className="w-full h-[400px] bg-black/40 border border-white/5 rounded-xl p-4 flex items-center justify-center backdrop-blur-sm">
                <div className="text-white/60 font-mono text-sm animate-pulse">Loading price data...</div>
            </div>
        );
    }

    const displayPrice = oraclePrice ?? currentPrice;

    return (
        <div className="w-full h-[400px] bg-black/40 border border-white/5 rounded-xl p-4 relative overflow-hidden backdrop-blur-sm">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-neon-green to-transparent opacity-50" />

            <div className="flex justify-between items-center mb-4 px-2">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-neon-green animate-pulse" />
                        <span className="text-neon-green font-mono text-sm tracking-widest">LIVE</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-white font-mono text-2xl font-bold">
                            ${displayPrice.toFixed(2)}
                        </span>
                        <span className={`text-xs font-mono ${priceChange.isPositive ? 'text-neon-green' : 'text-neon-red'}`}>
                            {priceChange.isPositive ? '+' : '-'}${priceChange.value.toFixed(2)}
                        </span>
                    </div>
                </div>
                <div className="text-white/40 text-xs font-mono">BTC/USD • Binance Real-Time</div>
            </div>

            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                    <defs>
                        <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--neon-green))" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="hsl(var(--neon-green))" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis
                        dataKey="time"
                        stroke="rgba(255,255,255,0.2)"
                        tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                    />
                    <YAxis
                        domain={['auto', 'auto']}
                        stroke="rgba(255,255,255,0.2)"
                        tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                        orientation="right"
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: '#000',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '8px',
                            fontFamily: 'monospace'
                        }}
                        itemStyle={{ color: '#4ade80' }}
                        labelStyle={{ color: '#666' }}
                        formatter={(value: number) => [`$${value.toFixed(2)}`, 'Price']}
                    />
                    <Area
                        type="monotone"
                        dataKey="price"
                        stroke="hsl(var(--neon-green))"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorPrice)"
                        isAnimationActive={true}
                        animationDuration={300}
                    />
                </AreaChart>
            </ResponsiveContainer>

            {/* Scanning Line Effect */}
            <motion.div
                className="absolute top-0 bottom-0 w-px bg-neon-green/50 shadow-[0_0_10px_#4ade80]"
                animate={{ left: ["0%", "100%"] }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            />
        </div>
    );
};
