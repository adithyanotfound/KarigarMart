"use client"

import { useLanguage, SUPPORTED_LANGUAGES, Language } from "@/contexts/language-context"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Globe } from "lucide-react"

interface LanguageSelectorProps {
  className?: string
  showIcon?: boolean
}

export function LanguageSelector({ className = "", showIcon = true }: LanguageSelectorProps) {
  const { currentLanguage, setLanguage, t } = useLanguage()

  const handleLanguageChange = (value: string) => {
    setLanguage(value as Language)
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {showIcon && <Globe className="h-4 w-4 text-gray-500" />}
      <Select value={currentLanguage} onValueChange={handleLanguageChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder={t("language.selectLanguage")} />
        </SelectTrigger>
        <SelectContent>
          {SUPPORTED_LANGUAGES.map((language) => (
            <SelectItem key={language.code} value={language.code}>
              <div className="flex items-center gap-2">
                <span className="text-sm">{language.nativeName}</span>
                <span className="text-xs text-gray-500">({language.name})</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
