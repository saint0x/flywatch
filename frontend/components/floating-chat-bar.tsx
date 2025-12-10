import { useState, type FormEvent } from "react"

interface FloatingChatBarProps {
  onSendMessage: (message: string) => void
  isLoading?: boolean
}

export function FloatingChatBar({ onSendMessage, isLoading = false }: FloatingChatBarProps) {
  const [message, setMessage] = useState("")

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (message.trim() && !isLoading) {
      onSendMessage(message)
      setMessage("")
    }
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 px-4 pb-6 pointer-events-none">
      <div className="max-w-3xl mx-auto pointer-events-auto">
        <div className="bg-gray-1/95 backdrop-blur-2xl border border-gray-11/10 rounded-2xl shadow-[0px_170px_48px_0px_rgba(18,_18,_19,_0.00),_0px_109px_44px_0px_rgba(18,_18,_19,_0.01),_0px_61px_37px_0px_rgba(18,_18,_19,_0.05),_0px_27px_27px_0px_rgba(18,_18,_19,_0.09),_0px_7px_15px_0px_rgba(18,_18,_19,_0.10)] p-2">
          <form onSubmit={handleSubmit} className="relative">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                                placeholder="Ask about system health, logs, or metrics..."
                disabled={isLoading}
                className="flex-1 bg-transparent border-none outline-none text-sm text-slate-12 placeholder:text-gray-9 px-4 py-2 disabled:opacity-50"
                style={{ letterSpacing: "-0.42px" }}
              />
              <button
                type="submit"
                disabled={!message.trim() || isLoading}
                className="h-10 px-5 bg-gray-12 text-gray-1 rounded-full text-sm font-medium transition-all hover:bg-slate-12 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ letterSpacing: "-0.42px" }}
              >
                {isLoading ? "Thinking..." : "Send"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
