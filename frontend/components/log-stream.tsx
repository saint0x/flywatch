import { useRef, useEffect, type UIEvent } from "react"
import { Terminal } from "lucide-react"
import { useLogs } from "@/hooks/use-logs"
import type { ProcessedLog } from "@/lib/types/ui"
import { formatTimestampWithMs } from "@/lib/utils/format"

interface LogStreamProps {
  hasActiveChat: boolean
}

export function LogStream({ hasActiveChat }: LogStreamProps) {
  const { logs, isConnected, shouldAutoScroll } = useLogs(100)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (shouldAutoScroll.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [logs])

  const handleScroll = (e: UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement
    const isAtBottom = Math.abs(target.scrollHeight - target.scrollTop - target.clientHeight) < 10
    shouldAutoScroll.current = isAtBottom
  }

  const getLevelColor = (level: ProcessedLog["level"]) => {
    switch (level) {
      case "info":
        return "text-blue-500"
      case "success":
        return "text-green-500"
      case "warn":
        return "text-yellow-500"
      case "error":
        return "text-red-500"
    }
  }

  const getLevelBadge = (level: ProcessedLog["level"]) => {
    switch (level) {
      case "info":
        return "INF"
      case "success":
        return "SUC"
      case "warn":
        return "WRN"
      case "error":
        return "ERR"
    }
  }

  return (
    <div className={`max-w-6xl mx-auto transition-all duration-300 ${hasActiveChat ? "mt-6" : "mt-8"}`}>
      <div className="bg-white backdrop-blur-xl border border-gray-11/10 rounded-2xl shadow-[0px_170px_48px_0px_rgba(18,_18,_19,_0.00),_0px_109px_44px_0px_rgba(18,_18,_19,_0.01),_0px_61px_37px_0px_rgba(18,_18,_19,_0.05),_0px_27px_27px_0px_rgba(18,_18,_19,_0.09),_0px_7px_15px_0px_rgba(18,_18,_19,_0.10)] overflow-hidden">
        {/* Header */}
        <div className="px-8 py-4 border-b border-gray-12/[.07] flex items-center gap-3">
          <Terminal className="w-4 h-4 text-slate-10" />
          <h2 className="text-sm font-medium text-slate-12" style={{ letterSpacing: "-0.42px" }}>
            Live Log Stream
          </h2>
          <div className="ml-auto flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-400 animate-pulse" : "bg-red-400"}`} />
            <span className="text-xs text-slate-10 font-light" style={{ letterSpacing: "-0.36px" }}>
              {isConnected ? "Connected" : "Disconnected"}
            </span>
          </div>
        </div>

        {/* Log Content */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="h-[500px] overflow-y-auto font-mono text-xs bg-white p-6"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          {logs.map((log) => (
            <div
              key={log.id}
              className="mb-1 flex items-start gap-4 hover:bg-gray-11/5 px-2 py-1 rounded-md transition-colors"
            >
              <span className={`${getLevelColor(log.level)} flex-shrink-0`} style={{ letterSpacing: "-0.36px" }}>
                {formatTimestampWithMs(log.timestamp)}
              </span>
              <span className={`${getLevelColor(log.level)} font-medium flex-shrink-0`}>
                [{getLevelBadge(log.level)}]
              </span>
              <span
                className={`${getLevelColor(log.level)} flex-shrink-0 bg-gray-11/10 px-2 py-0.5 rounded-full text-[10px]`}
              >
                {log.region}
              </span>
              <span className={`${getLevelColor(log.level)} flex-1`} style={{ letterSpacing: "-0.36px" }}>
                {log.message}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
