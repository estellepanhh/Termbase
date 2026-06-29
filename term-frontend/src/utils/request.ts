import axios from 'axios'
import { message } from 'antd'

const service = axios.create({
  baseURL: '/',
  timeout: 15000,
})

// 响应拦截：提取 data 并统一错误处理
service.interceptors.response.use(
  (res) => {
    const data = res.data
    if (data.code && data.code !== 200) {
      message.error(data.msg || '请求失败')
      return Promise.reject(new Error(data.msg || '请求失败'))
    }
    return data
  },
  (error) => {
    const msg =
      error.response?.data?.msg || error.message || '网络错误，请检查后端服务'
    message.error(msg)
    return Promise.reject(error)
  },
)

export default service
