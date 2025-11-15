import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import { Layout } from "@/components/Layout";
import { Dashboard } from "@/pages/Dashboard";
import { MyBets } from "@/pages/MyBets";
import { Docs } from "@/pages/Docs";

function App() {
    return (
        <Router>
            <Layout>
                <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/my-bets" element={<MyBets />} />
                    <Route path="/docs" element={<Docs />} />
                </Routes>
            </Layout>
            <Toaster
                position="bottom-right"
                toastOptions={{
                    style: {
                        background: 'rgba(0, 0, 0, 0.9)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: '#fff',
                        backdropFilter: 'blur(10px)'
                    },
                    className: 'font-mono'
                }}
                richColors
            />
        </Router>
    );
}

export default App;
