declare module '#auth-utils' {
  interface User {
    email: string
    name: string
    picture?: string
  }

  interface UserSession {
    user: User
    loggedInAt: number
  }
}

export {}
