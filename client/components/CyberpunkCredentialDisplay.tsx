import { useState } from "react";
import { Eye, EyeOff, Lock, Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface CyberpunkCredentialDisplayProps {
  label: string;
  value: string;
  isEncrypted: boolean;
  hasAccess: boolean;
  onDecrypt?: () => void;
  /** "readout" renders the value large, as the relay's headline number (OTP). */
  variant?: "row" | "readout";
  /** ISO date or epoch ms — when known, the readout states when the code dies. Null means
   *  "no live code", which is the shape the API sends for a placeholder row. */
  expiresAt?: string | number | null;
}

function expiryLabel(expiresAt?: string | number | null) {
  if (!expiresAt) return null;
  const at = typeof expiresAt === "number" ? expiresAt : Date.parse(expiresAt);
  if (!Number.isFinite(at)) return null;
  const left = Math.max(0, at - Date.now());
  const mm = Math.floor(left / 60000);
  const ss = Math.floor((left % 60000) / 1000);
  return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

export function CyberpunkCredentialDisplay({
  label,
  value,
  isEncrypted,
  hasAccess,
  onDecrypt,
  variant = "row",
  expiresAt,
}: CyberpunkCredentialDisplayProps) {
  const [showValue, setShowValue] = useState(false);
  const [copied, setCopied] = useState(false);
  const locked = isEncrypted && !hasAccess;

  const handleCopy = async () => {
    if (!hasAccess || !value) return;

    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success(`${label} copied to clipboard`);

      // Auto-clear clipboard after 30 seconds for security
      setTimeout(() => {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText("");
        }
      }, 30000);

      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  const copyButton = (
    <button
      onClick={handleCopy}
      className="grid size-[26px] flex-none place-items-center rounded-md border border-line-2 text-ink-3 transition-colors duration-150 ease-standard hover:text-ink"
      title="Copy to clipboard"
      aria-label="Copy to clipboard"
    >
      {copied ? <Check size={13} /> : <Copy size={13} />}
    </button>
  );

  const labelNode = (
    <span className="font-mono text-2xs tracking-label text-ink-3 uppercase">
      {label}
    </span>
  );

  if (locked) {
    return (
      <div className="rounded-lg border border-line bg-panel-2 px-3 py-2.5">
        {labelNode}
        <p className="mt-1.5 font-mono text-xs break-all text-ink-3">{value}</p>
        <div className="mt-2 flex items-center justify-between gap-3">
          <span className="font-mono text-2xs tracking-[0.08em] text-alarm uppercase">
            Authorization required
          </span>
          {onDecrypt && (
            <button
              onClick={onDecrypt}
              className="inline-flex items-center gap-1.5 font-mono text-2xs tracking-label text-ink-2 uppercase transition-colors duration-150 ease-standard hover:text-ink"
            >
              <Lock size={11} />
              Request access
            </button>
          )}
        </div>
      </div>
    );
  }

  if (variant === "readout") {
    const expires = expiryLabel(expiresAt);
    return (
      <div className="rounded-lg border border-line bg-panel-2 px-3.5 py-3">
        <div className="flex items-center gap-2.5">
          {labelNode}
          <span className="rounded-sm bg-signal px-1.5 py-0.5 font-mono text-2xs tracking-[0.08em] text-signal-ink uppercase">
            Live
          </span>
          <span className="ml-auto">{copyButton}</span>
        </div>
        <p className="mt-2 font-mono text-xl tabular-nums break-all text-ink">
          {value || "—"}
        </p>
        <div className="mt-2.5 h-0.5 overflow-hidden rounded-xs bg-white/[0.09]">
          <div className="h-full origin-left bg-signal animate-countdown motion-reduce:animate-none" />
        </div>
        {expires && (
          <p className="mt-2 font-mono text-2xs tracking-[0.05em] text-ink-3 uppercase">
            expires <b className="font-medium text-ink-2">{expires}</b> · pushed over
            socket
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-line bg-panel-2 px-3 py-2">
      <div className="flex items-center gap-2">
        {labelNode}
        <span className="ml-auto flex items-center gap-1.5">
          {hasAccess && (
            <button
              onClick={() => setShowValue(!showValue)}
              className="grid size-[26px] flex-none place-items-center rounded-md border border-line-2 text-ink-3 transition-colors duration-150 ease-standard hover:text-ink"
              title={showValue ? "Hide" : "Show"}
              aria-label={showValue ? "Hide value" : "Show value"}
            >
              {showValue ? <EyeOff size={13} /> : <Eye size={13} />}
            </button>
          )}
          {hasAccess && copyButton}
        </span>
      </div>
      <input
        type={showValue ? "text" : "password"}
        value={value}
        readOnly
        aria-label={label}
        className="mt-1.5 w-full min-w-0 bg-transparent font-mono text-sm text-ink outline-none"
      />
    </div>
  );
}
