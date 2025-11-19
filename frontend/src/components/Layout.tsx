import { Link, useLocation } from "react-router-dom";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { LayoutDashboard, History, BookOpen, Settings, LogOut } from "lucide-react";
import { motion } from "framer-motion";

interface LayoutProps {
    children: React.ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
    const location = useLocation();

    const menuItems = [
        { icon: LayoutDashboard, label: "Dashboard", path: "/" },
        { icon: History, label: "My Bets", path: "/my-bets" },
        { icon: BookOpen, label: "Docs", path: "/docs" },
    ];

    return (
        <div className="min-h-screen bg-background text-foreground font-sans flex">
            {/* Sidebar */}
            <aside className="w-64 border-r border-white/5 bg-black/40 backdrop-blur-xl flex flex-col fixed h-full z-50">
                <div className="h-20 flex items-center px-6 border-b border-white/5">
                    <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                        <img src="/logo.png" alt="Lumen Logo" className="w-10 h-10 object-contain" />
                        <span className="text-xl font-black tracking-wider text-white">
                            LUMEN<span className="text-neon-green">.FI</span>
                        </span>
                    </Link>
                </div>

                <nav className="flex-1 p-4 space-y-2">
                    {menuItems.map((item) => {
                        const isActive = location.pathname === item.path;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 relative group ${isActive ? "text-neon-green" : "text-white/60 hover:text-white hover:bg-white/5"
                                    }`}
                            >
                                <item.icon className={`w-5 h-5 ${isActive ? "text-neon-green" : "group-hover:text-white"}`} />
                                <span className="font-medium tracking-wide">{item.label}</span>
                                {isActive && (
                                    <motion.div
                                        layoutId="sidebar-active"
                                        className="absolute inset-0 bg-neon-green/10 border border-neon-green/20 rounded-xl"
                                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                    />
                                )}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-white/5 space-y-2">
                    <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-white/60 hover:text-white hover:bg-white/5 transition-all">
                        <Settings className="w-5 h-5" />
                        <span className="font-medium">Settings</span>
                    </button>
                    <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-white/60 hover:text-red-400 hover:bg-red-500/10 transition-all">
                        <LogOut className="w-5 h-5" />
                        <span className="font-medium">Disconnect</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 ml-64 flex flex-col min-h-screen">
                {/* Topbar */}
                <header className="h-20 border-b border-white/5 bg-black/40 backdrop-blur-xl sticky top-0 z-40 px-8 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
                            <div className="w-2 h-2 rounded-full bg-neon-green animate-pulse" />
                            <span className="text-xs font-mono text-neon-green">SYSTEM OPERATIONAL</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="text-right hidden md:block">
                            <div className="text-xs text-white/40 uppercase tracking-wider">Balance</div>
                            <div className="text-sm font-mono font-bold text-white">1,245.50 USDC</div>
                        </div>
                        <ConnectButton />
                    </div>
                </header>

                <div className="p-8">
                    {children}
                </div>
            </main>
        </div>
    );
};
