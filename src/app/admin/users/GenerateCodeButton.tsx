"use client";

import { useState } from "react";

export function GenerateCodeButton({
  userId,
  hasCode,
}: {
  userId: string;
  hasCode: boolean;
}) {
  const [code, setCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const generate = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/invite`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        setCode(data.code);
      }
    } finally {
      setLoading(false);
    }
  };

  const copy = () => {
    if (code) {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (code) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="font-mono font-bold text-yellow-300 bg-yellow-900/30 border border-yellow-700/40 rounded px-2 py-0.5 text-sm tracking-widest">
          {code}
        </span>
        <button
          onClick={copy}
          className="text-gray-400 hover:text-white transition-colors text-xs"
          title="העתק"
        >
          {copied ? "✓" : "📋"}
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={generate}
      disabled={loading}
      className={`text-xs px-2 py-1 rounded font-medium transition-colors ${
        hasCode
          ? "bg-gray-800 text-gray-300 hover:bg-gray-700"
          : "bg-blue-900/50 text-blue-300 hover:bg-blue-800/50 border border-blue-700/40"
      }`}
    >
      {loading ? "..." : hasCode ? "חדש" : "צור קוד"}
    </button>
  );
}
