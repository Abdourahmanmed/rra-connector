export type ApiClientConfig = {
  baseUrl?: string
  defaultHeaders?: HeadersInit
}

export type ApiRequestOptions = Omit<RequestInit, "headers"> & {
  headers?: HeadersInit
}

const DEFAULT_TIMEOUT_MS = 10_000

export class ApiClient {
  private readonly baseUrl: string
  private readonly defaultHeaders: HeadersInit

  constructor(config: ApiClientConfig = {}) {
    this.baseUrl = config.baseUrl ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? ""
    this.defaultHeaders = {
      "Content-Type": "application/json",
      ...config.defaultHeaders,
    }
  }

  async request<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS)

    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        ...options,
        headers: {
          ...this.defaultHeaders,
          ...options.headers,
        },
        signal: controller.signal,
      })

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`)
      }

      if (response.status === 204) {
        return undefined as T
      }

      return (await response.json()) as T
    } finally {
      clearTimeout(timeout)
    }
  }
}

export const apiClient = new ApiClient()
