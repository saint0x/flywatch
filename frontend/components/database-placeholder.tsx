import { Database } from "lucide-react"

export function DatabasePlaceholder() {
  return (
    <div className="flex flex-col items-center justify-center h-64 max-w-6xl mx-auto">
      <div className="bg-gray-1/85 backdrop-blur-xl border border-gray-11/10 rounded-2xl p-8 shadow-[0px_27px_27px_0px_rgba(18,_18,_19,_0.09),_0px_7px_15px_0px_rgba(18,_18,_19,_0.10)]">
        <div className="flex flex-col items-center gap-4">
          <div className="text-slate-10">
            <Database className="w-12 h-12" />
          </div>
          <div className="text-center">
            <h3 className="text-lg font-medium text-slate-12" style={{ letterSpacing: "-0.5px" }}>
              Database Explorer
            </h3>
            <p className="text-sm text-slate-10 mt-1" style={{ letterSpacing: "-0.36px" }}>
              Coming soon
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
