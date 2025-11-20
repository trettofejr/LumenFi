import "@rainbow-me/rainbowkit/styles.css";

import { PropsWithChildren, useMemo } from "react";
import { WagmiProvider } from "wagmi";
import { sepolia } from "wagmi/chains";
import { getDefaultConfig, midnightTheme, RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const config = getDefaultConfig({
  appName: "Lumen Penalty Contest",
  projectId: "LUMEN-PENALTY-CONTEST",
  chains: [sepolia],
  ssr: false
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 30_000,
      retry: 1
    }
  }
});

export function Providers({ children }: PropsWithChildren) {
  const theme = useMemo(
    () =>
      midnightTheme({
        accentColor: "#4ae4ff",
        accentColorForeground: "#040714",
        borderRadius: "large",
        overlayBlur: "small",
        fontStack: "system"
      }),
    []
  );

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={theme} modalSize="compact">
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}



