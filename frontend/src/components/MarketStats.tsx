import { useState, useEffect } from "react";
import { getLatestPrice, subscribeToPriceUpdates, calculatePriceChange } from "@/lib/priceService";
import { TrendingUp, TrendingDown, DollarSign, Activity } from "lucide-react";

interface Stat {
    label: string;
    value: string;
    icon: React.ReactNode;
    color: string;
    isLive?: boolean;
}

export const MarketStats = () => {
    const [currentPrice, setCurrentPrice] = useState<number>(0);
    const [priceChange24h, setPriceChange24h] = useState<{ value: number; isPositive: boolean }>({
        value: 0,
        isPositive: true
    });

    useEffect(() => {
        // Load initial price
        const loadInitialPrice = async () => {
            try {
                const priceData = await getLatestPrice("BTC/USD");
                setCurrentPrice(priceData.price);

                // Simulate 24h price (mock data for now)
                const price24hAgo = priceData.price * 0.97; // -3% from current
                const change = calculatePriceChange(price24hAgo, priceData.price);
                setPriceChange24h({
                    value: Math.abs(change.changePercent),
                    isPositive: change.isPositive
                });
            } catch (error) {
                console.error("Failed to load price:", error);
            }
        };

        loadInitialPrice();

        // Subscribe to updates
        const cleanup = subscribeToPriceUpdates("BTC/USD", (priceData) => {
            setCurrentPrice(priceData.price);
        }, 1000); // Update every 1 second

        return () => {
            cleanup.then(fn => fn());
        };
    }, []);

    const stats: Stat[] = [
        {
            label: "Current Price",
            value: currentPrice > 0 ? `$${currentPrice.toFixed(2)}` : "Loading...",
            icon: <DollarSign className="w-4 h-4" />,
            color: "text-white",
            isLive: true
        },
        {
            label: "24h Change",
            value: `${priceChange24h.isPositive ? '+' : '-'}${priceChange24h.value.toFixed(2)}%`,
            icon: priceChange24h.isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />,
            color: priceChange24h.isPositive ? "text-neon-green" : "text-neon-red"
        },
        {
            label: "Total Volume",
            value: "$1.2M",
            icon: <Activity className="w-4 h-4" />,
            color: "text-neon-blue"
        },
        {
            label: "Active Bets",
            value: "127",
            icon: <Activity className="w-4 h-4" />,
            color: "text-yellow-400"
        }
    ];

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map((stat, i) => (
                <div
                    key={i}
                    className="bg-black/40 border border-white/5 p-4 rounded-xl backdrop-blur-sm hover:border-white/10 transition-all duration-300 hover:scale-105 group relative overflow-hidden"
                >
                    {stat.isLive && (
                        <div className="absolute top-2 right-2">
                            <div className="flex items-center gap-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse" />
                                <span className="text-[10px] text-neon-green font-mono">LIVE</span>
                            </div>
                        </div>
                    )}
                    <div className="flex items-center gap-2 mb-2">
                        <div className={`${stat.color} opacity-60`}>{stat.icon}</div>
                        <div className="text-xs text-white/40 uppercase tracking-wider font-medium">
                            {stat.label}
                        </div>
                    </div>
                    <div className={`text-2xl font-mono font-bold ${stat.color} tracking-tight`}>
                        {stat.value}
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-tr from-white/0 to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>
            ))}
        </div>
    );
};
