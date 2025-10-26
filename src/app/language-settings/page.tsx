"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { ArrowLeft, Check, Globe } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useLanguage, SUPPORTED_LANGUAGES, Language } from "@/contexts/language-context"
import { toast } from "sonner"

export default function LanguageSettingsPage() {
  const router = useRouter()
  const { currentLanguage, setLanguage, getLanguageInfo, t } = useLanguage()
  const [selectedLanguage, setSelectedLanguage] = useState<Language>(currentLanguage)

  const handleLanguageChange = (language: Language) => {
    setSelectedLanguage(language)
  }

  const handleSave = () => {
    setLanguage(selectedLanguage)
    toast.success(t("language.languageChanged"))
    router.back()
  }

  const handleCancel = () => {
    router.back()
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Header */}
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              className="p-2"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{t("language.languageSettings")}</h1>
              <p className="text-muted-foreground">{t("language.chooseLanguage")}</p>
            </div>
          </div>

          {/* Current Language Display */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                {t("language.currentLanguage")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <div className="text-2xl">
                  {getLanguageInfo(currentLanguage)?.nativeName}
                </div>
                <div>
                  <div className="font-medium">{getLanguageInfo(currentLanguage)?.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {getLanguageInfo(currentLanguage)?.nativeName}
                  </div>
                </div>
                <div className="ml-auto">
                  <Check className="h-5 w-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Language Selection */}
          <Card>
            <CardHeader>
              <CardTitle>{t("language.selectLanguage")}</CardTitle>
              <CardDescription>
                {t("language.chooseLanguage")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {SUPPORTED_LANGUAGES.map((language) => (
                  <motion.div
                    key={language.code}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <button
                      onClick={() => handleLanguageChange(language.code)}
                      className={`w-full p-4 rounded-lg border-2 transition-all duration-200 ${
                        selectedLanguage === language.code
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50 hover:bg-muted/50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="text-xl">
                            {language.nativeName}
                          </div>
                          <div className="text-left">
                            <div className="font-medium">{language.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {language.nativeName}
                            </div>
                          </div>
                        </div>
                        {selectedLanguage === language.code && (
                          <Check className="h-5 w-5 text-primary" />
                        )}
                      </div>
                    </button>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={handleCancel}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleSave} disabled={selectedLanguage === currentLanguage}>
              {t("common.save")}
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
