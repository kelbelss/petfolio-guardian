"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight, CalendarIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { format } from "date-fns"

interface CalendarProps {
    selected?: Date
    onSelect?: (date: Date | undefined) => void
    disabled?: (date: Date) => boolean
    placeholder?: string
    className?: string
    isOpen?: boolean
    onToggle?: () => void
}

export function Calendar({
    selected,
    onSelect,
    disabled,
    placeholder = "Pick a date",
    className,
    isOpen = false,
    onToggle,
}: CalendarProps) {
    const [currentMonth, setCurrentMonth] = React.useState(new Date())

    const isDisabled = (date: Date) => {
        if (disabled) return disabled(date)
        return date < new Date(new Date().setHours(0, 0, 0, 0))
    }

    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear()
        const month = date.getMonth()
        const firstDay = new Date(year, month, 1)
        const lastDay = new Date(year, month + 1, 0)
        const daysInMonth = lastDay.getDate()
        const firstDayOfWeek = firstDay.getDay()

        const days = []

        // Add empty cells for days before the first day of the month
        for (let i = 0; i < firstDayOfWeek; i++) {
            days.push(null)
        }

        // Add days of the month
        for (let i = 1; i <= daysInMonth; i++) {
            days.push(new Date(year, month, i))
        }

        return days
    }

    const days = getDaysInMonth(currentMonth)
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

    const goToPreviousMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))
    }

    const goToNextMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))
    }

    const handleDateSelect = (date: Date) => {
        if (!isDisabled(date)) {
            onSelect?.(date)
            onToggle?.() // Close calendar after selection
        }
    }

    return (
        <div className="relative">
            <Button
                variant="outline"
                onClick={onToggle}
                className={cn(
                    "w-full justify-start text-left font-normal",
                    !selected && "text-muted-foreground",
                    className
                )}
            >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selected ? format(selected, "PPP") : placeholder}
            </Button>

            {isOpen && (
                <div className="absolute top-full left-0 z-50 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-3 min-w-[280px]">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={goToPreviousMonth}
                            className="h-7 w-7 p-0"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <div className="text-sm font-medium">
                            {format(currentMonth, "MMMM yyyy")}
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={goToNextMonth}
                            className="h-7 w-7 p-0"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>

                    {/* Week days */}
                    <div className="grid grid-cols-7 gap-1 mb-2">
                        {weekDays.map((day) => (
                            <div key={day} className="text-xs text-gray-500 text-center py-1">
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Calendar grid */}
                    <div className="grid grid-cols-7 gap-1">
                        {days.map((day, index) => (
                            <div key={index} className="h-9 w-9">
                                {day ? (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className={cn(
                                            "h-9 w-9 p-0 font-normal",
                                            selected && day.toDateString() === selected.toDateString() &&
                                            "bg-emerald-600 text-emerald-50 hover:bg-emerald-600",
                                            isDisabled(day) && "text-gray-400 cursor-not-allowed",
                                            !isDisabled(day) && "hover:bg-emerald-100"
                                        )}
                                        onClick={() => handleDateSelect(day)}
                                        disabled={isDisabled(day)}
                                    >
                                        {day.getDate()}
                                    </Button>
                                ) : (
                                    <div className="h-9 w-9" />
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
} 