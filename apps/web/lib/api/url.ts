const DEFAULT_API_URL = "http://localhost:4000"

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "")
}

export function getApiBaseUrl(): string {
  return trimTrailingSlash(
    process.env.NEXT_PUBLIC_API_URL ??
      process.env.NEXT_PUBLIC_API_BASE_URL ??
      DEFAULT_API_URL
  )
}

export function toBackendUrl(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) {
    return pathOrUrl
  }

  const normalizedPath = pathOrUrl.startsWith("/")
    ? pathOrUrl
    : `/${pathOrUrl}`

  return `${getApiBaseUrl()}${normalizedPath}`
}
