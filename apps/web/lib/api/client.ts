import axios from "axios"
import { getApiBaseUrl } from "@/lib/api/url"

const API_BASE_URL = getApiBaseUrl()

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
})
