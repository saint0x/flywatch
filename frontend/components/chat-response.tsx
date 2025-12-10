import { CheckCircle2, Zap } from "lucide-react"
import type { ChatResponse as ChatResponseType } from "@/lib/types/api"
import { formatCurrency, formatDuration } from "@/lib/utils/format"

interface ChatResponseProps {
  response: ChatResponseType
  visible: boolean
  onHover: (isHovering: boolean) => void
}

function MarkdownRenderer({ content }: { content: string }) {
  // Split by double newlines for paragraphs
  const paragraphs = content.split("\n\n")

  return (
    <div className="space-y-3">
      {paragraphs.map((paragraph, idx) => {
        // Handle headers
        if (paragraph.startsWith("## ")) {
          return (
            <h2 key={idx} className="text-base font-semibold text-slate-12 mt-4 first:mt-0">
              {paragraph.replace("## ", "")}
            </h2>
          )
        }

        if (paragraph.startsWith("# ")) {
          return (
            <h1 key={idx} className="text-lg font-bold text-slate-12 mt-4 first:mt-0">
              {paragraph.replace("# ", "")}
            </h1>
          )
        }

        // Handle bullet lists
        if (paragraph.includes("\n- ")) {
          const items = paragraph.split("\n- ").filter(Boolean)
          return (
            <ul key={idx} className="list-disc list-inside space-y-1 text-slate-11">
              {items.map((item, i) => (
                <li key={i}>{item.replace(/^-\s*/, "")}</li>
              ))}
            </ul>
          )
        }

        // Handle bold text with **
        const boldRegex = /\*\*(.*?)\*\*/g
        const parts = paragraph.split(boldRegex)

        return (
          <p key={idx} className="text-slate-11 leading-relaxed">
            {parts.map((part, i) =>
              i % 2 === 1 ? (
                <strong key={i} className="font-semibold text-slate-12">
                  {part}
                </strong>
              ) : (
                part
              ),
            )}
          </p>
        )
      })}
    </div>
  )
}

export function ChatResponse({ response, visible, onHover }: ChatResponseProps) {
  return (
    <div
      className="fixed bottom-28 left-0 right-0 px-4 pointer-events-none z-50"
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      onFocus={() => onHover(true)}
      onBlur={() => onHover(false)}
      tabIndex={0}
    >
      <div className="max-w-3xl mx-auto pointer-events-auto">
        <div
          className={`bg-gray-1/98 backdrop-blur-2xl border border-gray-11/10 rounded-2xl shadow-[0px_170px_48px_0px_rgba(18,_18,_19,_0.00),_0px_109px_44px_0px_rgba(18,_18,_19,_0.01),_0px_61px_37px_0px_rgba(18,_18,_19,_0.05),_0px_27px_27px_0px_rgba(18,_18,_19,_0.09),_0px_7px_15px_0px_rgba(18,_18,_19,_0.10)] overflow-hidden transition-all duration-300 ${
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          {/* Response Content */}
          <div className="p-6">
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-400/10 flex-shrink-0">
                <CheckCircle2 className="w-4 h-4 text-green-400" />
              </div>
              <div className="flex-1 pt-1">
                <div className="text-sm" style={{ letterSpacing: "-0.42px" }}>
                  <MarkdownRenderer content={response.response} />
                </div>
              </div>
            </div>
          </div>

          {/* Metadata Footer */}
          <div className="px-6 py-3 bg-gray-11/5 border-t border-gray-11/10 flex items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-4">
              {/* Model */}
              <div className="flex items-center gap-1.5 text-slate-10">
                <Zap className="w-3 h-3" />
                <span style={{ letterSpacing: "-0.36px" }}>{response.model}</span>
              </div>

              {/* Cost */}
              {response.cost && (
                <div className="flex items-center gap-1.5 text-slate-10">
                  <span style={{ letterSpacing: "-0.36px" }}>{formatCurrency(response.cost.total_cost_usd, 4)}</span>
                </div>
              )}

              {/* Duration */}
              <div className="text-slate-10">
                <span style={{ letterSpacing: "-0.36px" }}>{formatDuration(response.processing_time_ms)}</span>
              </div>
            </div>

            {/* Tools Called */}
            {response.tools_called.length > 0 && (
              <div className="flex items-center gap-2">
                {response.tools_called.map((tool, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-1 bg-blue-400/10 text-blue-400 rounded-full text-[10px] font-medium"
                    style={{ letterSpacing: "-0.3px" }}
                  >
                    {tool.split("(")[0]}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
