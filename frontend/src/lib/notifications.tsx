import { toast } from "sonner";
import { ExternalLink } from "lucide-react";

const SEPOLIA_EXPLORER = "https://sepolia.etherscan.io";

export function notifyTransaction(hash: string, status: "pending" | "success" | "error", message?: string) {
  const explorerLink = `${SEPOLIA_EXPLORER}/tx/${hash}`;

  const ViewButton = () => (
    <a
      href={explorerLink}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-1 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-md text-xs font-medium transition-colors"
      onClick={(e) => e.stopPropagation()}
    >
      View
      <ExternalLink className="w-3 h-3" />
    </a>
  );

  if (status === "pending") {
    toast.loading(
      <div className="flex flex-col gap-1">
        <p className="font-semibold">Transaction Pending</p>
        <p className="text-xs text-white/60">{message || "Waiting for confirmation..."}</p>
        <p className="text-xs text-white/40 font-mono">{hash.slice(0, 10)}...{hash.slice(-8)}</p>
      </div>,
      {
        id: hash,
        action: ViewButton(),
        duration: Infinity
      }
    );
  } else if (status === "success") {
    toast.success(
      <div className="flex flex-col gap-1">
        <p className="font-semibold">Transaction Confirmed</p>
        <p className="text-xs text-white/60">{message || "Transaction successful"}</p>
        <p className="text-xs text-white/40 font-mono">{hash.slice(0, 10)}...{hash.slice(-8)}</p>
      </div>,
      {
        id: hash,
        action: ViewButton(),
        duration: 8000
      }
    );
  } else if (status === "error") {
    toast.error(
      <div className="flex flex-col gap-1">
        <p className="font-semibold">Transaction Failed</p>
        <p className="text-xs text-white/60">{message || "Transaction reverted"}</p>
        {hash && <p className="text-xs text-white/40 font-mono">{hash.slice(0, 10)}...{hash.slice(-8)}</p>}
      </div>,
      {
        id: hash,
        action: hash ? ViewButton() : undefined,
        duration: 10000
      }
    );
  }
}

export function notifyError(title: string, description?: string) {
  toast.error(
    <div className="flex flex-col gap-1">
      <p className="font-semibold">{title}</p>
      {description && <p className="text-xs text-white/60">{description}</p>}
    </div>,
    {
      duration: 6000
    }
  );
}

export function notifySuccess(title: string, description?: string) {
  toast.success(
    <div className="flex flex-col gap-1">
      <p className="font-semibold">{title}</p>
      {description && <p className="text-xs text-white/60">{description}</p>}
    </div>,
    {
      duration: 5000
    }
  );
}
