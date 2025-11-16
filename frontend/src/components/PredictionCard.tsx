import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ArrowUpRight, ArrowDownRight, Zap } from "lucide-react";
import { motion } from "framer-motion";

export const PredictionCard = () => {
    const [direction, setDirection] = useState<"up" | "down" | null>(null);
    const [leverage, setLeverage] = useState([1]);
    const [amount, setAmount] = useState("");

    return (
        <Card className="bg-black/40 border-white/10 backdrop-blur-md p-6 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            <div className="relative z-10 space-y-6">
                <div className="flex justify-between items-center">
                    <h3 className="text-xl font-bold text-white tracking-tight">PREDICT BTC PRICE</h3>
                    <div className="flex items-center gap-2 text-xs font-mono text-white/40">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        LIVE
                    </div>
                </div>

                {/* Direction Selection */}
                <div className="grid grid-cols-2 gap-4">
                    <button
                        onClick={() => setDirection("up")}
                        className={`relative p-4 rounded-xl border transition-all duration-300 flex flex-col items-center gap-2 group/btn ${direction === "up"
                                ? "bg-neon-green/10 border-neon-green text-neon-green shadow-[0_0_20px_rgba(74,222,128,0.2)]"
                                : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:border-white/30"
                            }`}
                    >
                        <ArrowUpRight className="w-8 h-8" />
                        <span className="font-bold tracking-wider">LONG</span>
                        {direction === "up" && (
                            <motion.div
                                layoutId="active-glow"
                                className="absolute inset-0 bg-neon-green/20 blur-xl -z-10"
                            />
                        )}
                    </button>

                    <button
                        onClick={() => setDirection("down")}
                        className={`relative p-4 rounded-xl border transition-all duration-300 flex flex-col items-center gap-2 group/btn ${direction === "down"
                                ? "bg-neon-red/10 border-neon-red text-neon-red shadow-[0_0_20px_rgba(239,68,68,0.2)]"
                                : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:border-white/30"
                            }`}
                    >
                        <ArrowDownRight className="w-8 h-8" />
                        <span className="font-bold tracking-wider">SHORT</span>
                        {direction === "down" && (
                            <motion.div
                                layoutId="active-glow"
                                className="absolute inset-0 bg-neon-red/20 blur-xl -z-10"
                            />
                        )}
                    </button>
                </div>

                {/* Leverage Slider */}
                <div className="space-y-4">
                    <div className="flex justify-between text-sm">
                        <span className="text-white/60">Leverage</span>
                        <span className="text-neon-blue font-mono font-bold">{leverage}x</span>
                    </div>
                    <Slider
                        value={leverage}
                        onValueChange={setLeverage}
                        max={100}
                        step={1}
                        className="py-4"
                    />
                </div>

                {/* Amount Input */}
                <div className="space-y-2">
                    <label className="text-sm text-white/60">Stake Amount (ETH)</label>
                    <div className="relative">
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="0.01"
                            step="0.01"
                            min="0.01"
                            className="w-full bg-black/50 border border-white/10 rounded-lg p-4 text-white font-mono focus:outline-none focus:border-neon-blue transition-colors"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 font-mono">ETH</span>
                    </div>
                    <div className="text-xs text-white/40 font-mono">
                        Minimum: 0.01 ETH
                    </div>
                </div>

                {/* Submit Button */}
                <Button
                    className={`w-full h-14 text-lg font-bold tracking-widest transition-all duration-300 ${direction
                            ? direction === "up"
                                ? "bg-neon-green text-black hover:bg-green-400 shadow-[0_0_20px_rgba(74,222,128,0.4)]"
                                : "bg-neon-red text-white hover:bg-red-600 shadow-[0_0_20px_rgba(239,68,68,0.4)]"
                            : "bg-white/10 text-white/40 cursor-not-allowed"
                        }`}
                    disabled={!direction || !amount}
                >
                    <Zap className="w-5 h-5 mr-2 fill-current" />
                    CONFIRM PREDICTION
                </Button>
            </div>
        </Card>
    );
};
