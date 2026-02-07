import React, { useState, useEffect } from "react";
import {
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Copy,
  Shield,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

interface CyberpunkCredentialDisplayProps {
  label: string;
  value: string;
  isEncrypted: boolean;
  hasAccess: boolean;
  onDecrypt?: () => void;
  accountId?: string;
}

export function CyberpunkCredentialDisplay({
  label,
  value,
  isEncrypted,
  hasAccess,
  onDecrypt,
  accountId,
}: CyberpunkCredentialDisplayProps) {
  const [showValue, setShowValue] = useState(false);
  const [glitchText, setGlitchText] = useState(value);
  const [copied, setCopied] = useState(false);

  // Animated glitch effect for encrypted values
  useEffect(() => {
    if (isEncrypted && !hasAccess) {
      const glitchChars = "░▒▓█▌│║▐►◄↕↔╔╗╚╝═";
      const interval = setInterval(() => {
        const randomGlitch = value
          .split("")
          .map((char, i) =>
            Math.random() > 0.7
              ? glitchChars[Math.floor(Math.random() * glitchChars.length)]
              : char,
          )
          .join("");
        setGlitchText(randomGlitch);
      }, 500);

      return () => clearInterval(interval);
    } else {
      setGlitchText(value);
    }
  }, [isEncrypted, hasAccess, value]);

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

      // Reset copied state
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Failed to copy to clipboard");
    }
  };

  return (
    <div className="credential-container relative">
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs uppercase tracking-wider text-purple-400 font-mono">
          {label}
        </label>
        {hasAccess && (
          <button
            onClick={() => setShowValue(!showValue)}
            className="text-cyan-400 hover:text-cyan-300 transition-all duration-200 hover:scale-110"
            title={showValue ? "Hide" : "Show"}
          >
            {showValue ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>

      <div
        className={`
        relative p-3 rounded-lg border transition-all duration-300
        ${
          isEncrypted && !hasAccess
            ? "bg-black/80 border-red-500/50 cyberpunk-glow shadow-red-500/30 shadow-lg"
            : "bg-black/40 border-cyan-500/30 hover:border-cyan-500/50"
        }
      `}
      >
        {isEncrypted && !hasAccess ? (
          <div className="space-y-2">
            {/* Main cipher display */}
            <div className="font-mono text-red-400 glitch-text text-xs sm:text-sm break-all overflow-hidden">
              {glitchText}
            </div>

            {/* Authorization warning */}
            <div className="flex items-center gap-2 text-xs text-red-300 flex-wrap">
              <AlertTriangle
                size={12}
                className="animate-pulse flex-shrink-0"
              />
              <span className="uppercase tracking-widest animated-text break-words">
                ◄ AUTHORIZATION REQUIRED ►
              </span>
            </div>

            {/* Encrypted signature */}
            <div className="text-xs text-gray-500 font-mono opacity-70 break-all">
              {`[CIPHER::${Date.now().toString(16).toUpperCase().slice(-8)}::LOCKED]`}
            </div>

            {/* Matrix rain effect overlay */}
            <div className="matrix-rain-overlay"></div>
          </div>
        ) : (
          <div className="flex items-center gap-2 min-w-0">
            {hasAccess ? (
              <>
                <input
                  type={showValue ? "text" : "password"}
                  value={value}
                  readOnly
                  className="flex-1 bg-transparent text-cyan-300 font-mono outline-none text-xs sm:text-sm overflow-hidden text-ellipsis min-w-0"
                  style={{
                    fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                    maxWidth: "100%",
                  }}
                />
                <button
                  onClick={handleCopy}
                  className={`
                    transition-all duration-200 hover:scale-110 flex-shrink-0 p-1
                    ${
                      copied
                        ? "text-green-400 hover:text-green-300"
                        : "text-cyan-400 hover:text-cyan-300"
                    }
                  `}
                  title="Copy to clipboard"
                  aria-label="Copy to clipboard"
                >
                  {copied ? <Shield size={16} /> : <Copy size={16} />}
                </button>
              </>
            ) : (
              <span className="text-gray-400 font-mono text-xs sm:text-sm">
                ••••••••••••
              </span>
            )}
          </div>
        )}

        {/* Animated border effect for encrypted content */}
        {isEncrypted && !hasAccess && (
          <div className="absolute inset-0 rounded-lg pointer-events-none overflow-hidden">
            <div className="animated-border"></div>
            <div className="corner-accent top-left"></div>
            <div className="corner-accent top-right"></div>
            <div className="corner-accent bottom-left"></div>
            <div className="corner-accent bottom-right"></div>
          </div>
        )}

        {/* Scan lines effect */}
        {isEncrypted && !hasAccess && <div className="scan-lines"></div>}
      </div>

      {/* Request Access button */}
      {onDecrypt && !hasAccess && (
        <button
          onClick={onDecrypt}
          className="mt-2 text-xs text-yellow-400 hover:text-yellow-300 flex items-center gap-1 transition-all duration-200 hover:translate-x-1"
        >
          <Lock size={12} />
          Request Access
        </button>
      )}

      {/* Security indicator */}
      {hasAccess && (
        <div className="mt-1 flex items-center gap-1 text-xs text-green-400 opacity-60">
          <Shield size={10} />
          <span>Secure connection established</span>
        </div>
      )}
    </div>
  );
}
