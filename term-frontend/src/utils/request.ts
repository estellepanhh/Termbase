import axios from 'axios'
import { message } from 'antd'
import { getAuthToken } from '../services/authApi'

const service = axios.create({
  baseURL: '/',
  timeout: 15000,
})

service.interceptors.request.use((config) => {
  const token = getAuthToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 响应拦截：提取 data 并统一错误处理
service.interceptors.response.use(
  (res) => {
    const data = res.data
    if (data.code && data.code !== 200) {
      const errorMessage = data.message || data.msg || '请求失败'
      message.error(errorMessage)
      return Promise.reject(new Error(errorMessage))
    }
    return data
  },
  (error) => {
    const msg =
      error.response?.data?.message ||
      error.response?.data?.msg ||
      error.message ||
      '网络错误，请检查后端服务'
    message.error(msg)
    return Promise.reject(error)
  },
)

export default service
