const CURRENCY_CODE_REGEX = /^[A-Z]{3}$/

export const DEFAULT_CURRENCY_CODE = "DJF"

function normalizeCurrencyInput(currencyCode: unknown): string | null {
  if (typeof currencyCode !== "string") {
    return null
  }

  const normalized = currencyCode.trim().toUpperCase()
  if (!CURRENCY_CODE_REGEX.test(normalized)) {
    return null
  }

  return normalized
}

export function isValidCurrencyCode(currencyCode: unknown): boolean {
  const normalized = normalizeCurrencyInput(currencyCode)
  if (!normalized) {
    return false
  }

  try {
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: normalized,
    })
    return true
  } catch {
    return false
  }
}

export function getSafeCurrencyCode(currencyCode: unknown): string {
  const normalized = normalizeCurrencyInput(currencyCode)
  if (!normalized) {
    return DEFAULT_CURRENCY_CODE
  }

  return isValidCurrencyCode(normalized) ? normalized : DEFAULT_CURRENCY_CODE
}

export function getCurrencyFormatter(currencyCode: unknown): Intl.NumberFormat {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: getSafeCurrencyCode(currencyCode),
    maximumFractionDigits: 2,
  })
}
