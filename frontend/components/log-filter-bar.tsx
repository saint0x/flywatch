"use client"

import { useState } from "react"
import { Search, X, Filter, ChevronDown, Check, CheckCheck, XCircle } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { LogFilters, AvailableFilterOptions, ProcessedLog, LogCategory } from "@/lib/types/ui"
import { getCategoryLabel, getCategoryEmoji } from "@/lib/utils/log-parser"

interface LogFilterBarProps {
  filters: LogFilters
  availableOptions: AvailableFilterOptions
  onFilterChange: <K extends keyof LogFilters>(key: K, value: LogFilters[K]) => void
  onClearFilters: () => void
  hasActiveFilters: boolean
  totalCount: number
  filteredCount: number
}

interface MultiSelectDropdownProps<T extends string> {
  label: string
  values: T[]
  selectedValues: T[]
  onChange: (values: T[]) => void
  getLabel?: (value: T) => string
  getColor?: (value: T) => string
  width?: string
}

function MultiSelectDropdown<T extends string>({
  label,
  values,
  selectedValues,
  onChange,
  getLabel = (v) => v,
  getColor,
  width = "min-w-[160px]",
}: MultiSelectDropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false)

  const toggleValue = (value: T) => {
    if (selectedValues.includes(value)) {
      onChange(selectedValues.filter((v) => v !== value))
    } else {
      onChange([...selectedValues, value])
    }
  }

  const selectAll = () => onChange([...values])
  const clearAll = () => onChange([])

  const hasSelection = selectedValues.length > 0
  const allSelected = selectedValues.length === values.length && values.length > 0

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className={`h-7 gap-1 text-xs ${hasSelection ? "border-blue-500/50 bg-blue-500/5" : ""}`}
      >
        {label}
        {hasSelection && (
          <Badge variant="secondary" className="ml-0.5 h-4 px-1 text-[10px]">
            {selectedValues.length}
          </Badge>
        )}
        <ChevronDown className={`h-3 w-3 opacity-50 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </Button>

      {isOpen && (
        <>
          {/* Backdrop to close dropdown */}
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

          {/* Dropdown menu */}
          <div className={`absolute top-full left-0 mt-1 z-50 ${width} bg-white border border-gray-200 rounded-md shadow-lg py-1`}>
            {/* Header with select/clear actions */}
            <div className="px-2 py-1.5 border-b border-gray-100 flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">Select {label.toLowerCase()}</span>
              {values.length > 0 && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={selectAll}
                    className={`text-[10px] px-1.5 py-0.5 rounded hover:bg-slate-100 ${allSelected ? "text-blue-500" : "text-muted-foreground"}`}
                    title="Select all"
                  >
                    <CheckCheck className="w-3 h-3" />
                  </button>
                  <button
                    onClick={clearAll}
                    className={`text-[10px] px-1.5 py-0.5 rounded hover:bg-slate-100 ${!hasSelection ? "text-muted-foreground/50" : "text-muted-foreground"}`}
                    title="Clear all"
                    disabled={!hasSelection}
                  >
                    <XCircle className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
            {values.length === 0 ? (
              <div className="px-2 py-3 text-xs text-muted-foreground text-center">No options available</div>
            ) : (
              <div className="max-h-56 overflow-y-auto">
                {values.map((value) => {
                  const isSelected = selectedValues.includes(value)
                  return (
                    <button
                      key={value}
                      onClick={() => toggleValue(value)}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 text-xs text-left hover:bg-slate-100 ${getColor?.(value) || ""}`}
                    >
                      <div
                        className={`w-4 h-4 border rounded flex items-center justify-center flex-shrink-0 ${isSelected ? "bg-blue-500 border-blue-500" : "border-gray-300"}`}
                      >
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <span className="truncate">{getLabel(value)}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function getLevelColor(level: ProcessedLog["level"]): string {
  switch (level) {
    case "info":
      return "text-blue-500"
    case "success":
      return "text-green-500"
    case "warn":
      return "text-yellow-500"
    case "error":
      return "text-red-500"
    default:
      return ""
  }
}

// Preferred order for log levels (most important first)
const LEVEL_ORDER: ProcessedLog["level"][] = ["error", "warn", "info", "success"]

function sortLevels(levels: ProcessedLog["level"][]): ProcessedLog["level"][] {
  return [...levels].sort((a, b) => LEVEL_ORDER.indexOf(a) - LEVEL_ORDER.indexOf(b))
}

function getLevelLabel(level: ProcessedLog["level"]): string {
  const labels: Record<ProcessedLog["level"], string> = {
    error: "Error",
    warn: "Warning",
    info: "Info",
    success: "Success",
  }
  return labels[level]
}

function getCategoryDisplayLabel(category: LogCategory): string {
  return `${getCategoryEmoji(category)} ${getCategoryLabel(category)}`
}

function getCategoryColorClass(category: LogCategory): string {
  const colors: Record<LogCategory, string> = {
    service: "text-yellow-600",
    repository: "text-purple-600",
    webhook: "text-blue-600",
    ratelimit: "text-indigo-600",
    config: "text-slate-600",
    analytics: "text-emerald-600",
    unknown: "text-gray-500",
  }
  return colors[category]
}

export function LogFilterBar({
  filters,
  availableOptions,
  onFilterChange,
  onClearFilters,
  hasActiveFilters,
  totalCount,
  filteredCount,
}: LogFilterBarProps) {
  return (
    <div className="flex items-center gap-2 px-6 py-2 border-b border-gray-12/[.07] bg-slate-50/50">
      <Filter className="w-3.5 h-3.5 text-slate-10 flex-shrink-0" />

      {/* Search input */}
      <div className="relative flex-shrink-0 w-40">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
        <Input
          placeholder="Search..."
          value={filters.searchQuery}
          onChange={(e) => onFilterChange("searchQuery", e.target.value)}
          className="h-7 pl-7 text-xs"
        />
      </div>

      {/* Filter dropdowns */}
      <div className="flex items-center gap-1.5">
        <MultiSelectDropdown
          label="Level"
          values={sortLevels(availableOptions.levels)}
          selectedValues={filters.levels}
          onChange={(v) => onFilterChange("levels", v)}
          getLabel={getLevelLabel}
          getColor={getLevelColor}
        />

        <MultiSelectDropdown
          label="Category"
          values={availableOptions.categories}
          selectedValues={filters.categories}
          onChange={(v) => onFilterChange("categories", v)}
          getLabel={getCategoryDisplayLabel}
          getColor={getCategoryColorClass}
          width="min-w-[180px]"
        />

        <MultiSelectDropdown
          label="Component"
          values={availableOptions.components}
          selectedValues={filters.components}
          onChange={(v) => onFilterChange("components", v)}
          width="min-w-[200px]"
        />

        <MultiSelectDropdown
          label="Region"
          values={availableOptions.regions}
          selectedValues={filters.regions}
          onChange={(v) => onFilterChange("regions", v)}
        />
      </div>

      {/* Clear filters button */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearFilters}
          className="h-7 gap-1 text-xs text-muted-foreground hover:text-foreground px-2"
        >
          <X className="w-3 h-3" />
          Clear
        </Button>
      )}

      {/* Filter count indicator */}
      <div className="ml-auto text-[11px] text-slate-10" style={{ letterSpacing: "-0.3px" }}>
        {hasActiveFilters ? (
          <span>
            <strong className="text-slate-12">{filteredCount}</strong> of {totalCount}
          </span>
        ) : (
          <span>{totalCount} logs</span>
        )}
      </div>
    </div>
  )
}
