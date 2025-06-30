export type User = {
  id: string
  email: string
  first_name: string
  last_name: string
  phone?: string
  role: 'user' | 'admin' 
  created_at: string
  updated_at: string
}

export type UserSession = {
  access_token: string
  refresh_token: string
  user: User
}