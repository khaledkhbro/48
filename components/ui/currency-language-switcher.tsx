"use client"

import { useState, useEffect } from "react"
import { DollarSign, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { currencyService, type Currency } from "@/lib/currency"
import { useAuth } from "@/contexts/auth-context"
import { toast } from "sonner"

interface CurrencyLanguageSwitcherProps {
  variant?: "compact" | "full"
}

export function CurrencyLanguageSwitcher({ variant = "compact" }: CurrencyLanguageSwitcherProps) {
  const { user } = useAuth()
  const [currencies, setCurrencies] = useState<Currency[]>([])
  const [currentCurrency, setCurrentCurrency] = useState<Currency | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadData()
  }, [user])

  const loadData = async () => {
    try {
      // Load currencies
      const currenciesData = await currencyService.getCurrencies()
      setCurrencies(currenciesData)

      // Set current preferences
      if (user) {
        try {
          const userCurrency = await currencyService.getUserCurrency(user.id)
          setCurrentCurrency(userCurrency)
        } catch (error) {
          // Fallback to USD
          const usdCurrency = currenciesData.find((c) => c.code === "USD")
          setCurrentCurrency(usdCurrency || currenciesData[0])
        }
      } else {
        // Default to USD for non-logged in users
        const usdCurrency = currenciesData.find((c) => c.code === "USD")
        setCurrentCurrency(usdCurrency || currenciesData[0])
      }
    } catch (error) {
      console.error("Error loading currency data:", error)
    }
  }

  const handleCurrencyChange = async (currency: Currency) => {
    if (!user) {
      // For non-logged in users, just update local state
      setCurrentCurrency(currency)
      localStorage.setItem("preferred_currency", currency.code)
      toast.success(`Currency changed to ${currency.name}`)
      return
    }

    setLoading(true)
    try {
      await currencyService.setUserCurrency(currency.code, user.id)
      setCurrentCurrency(currency)
      toast.success(`Currency changed to ${currency.name}`)
    } catch (error) {
      console.error("Error updating currency:", error)
      toast.error("Failed to update currency preference")
    } finally {
      setLoading(false)
    }
  }

  if (variant === "compact") {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 px-2 text-xs">
            <DollarSign className="h-3 w-3 mr-1" />
            {currentCurrency?.code || "USD"}
            <ChevronDown className="h-3 w-3 ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel>Currency</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {currencies.map((currency) => (
            <DropdownMenuItem
              key={currency.id}
              onClick={() => handleCurrencyChange(currency)}
              className="cursor-pointer"
              disabled={loading}
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm">{currency.code}</span>
                  <span className="text-sm">{currency.symbol}</span>
                </div>
                {currentCurrency?.code === currency.code && (
                  <Badge variant="default" className="text-xs">
                    Current
                  </Badge>
                )}
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  // Full variant for settings pages
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Currency</label>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="w-full justify-between bg-transparent">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              <span>{currentCurrency?.name || "US Dollar"}</span>
              <span className="text-gray-500">({currentCurrency?.code || "USD"})</span>
            </div>
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-full">
          {currencies.map((currency) => (
            <DropdownMenuItem
              key={currency.id}
              onClick={() => handleCurrencyChange(currency)}
              className="cursor-pointer"
              disabled={loading}
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <span className="font-mono">{currency.code}</span>
                  <span>{currency.symbol}</span>
                  <span>{currency.name}</span>
                </div>
                {currentCurrency?.code === currency.code && <Badge variant="default">Current</Badge>}
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
