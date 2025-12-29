export default defineOAuthGoogleEventHandler({
  config: {
    scope: ['email', 'profile']
  },
  async onSuccess(event, { user }) {
    const authorized = await isAuthorizedEmail(user.email)

    if (!authorized) {
      console.warn(`Unauthorized login attempt: ${user.email}`)
      throw createError({
        statusCode: 403,
        message: 'This Google account is not authorized.'
      })
    }

    await updateLastLogin(user.email, user.name, user.picture)

    await setUserSession(event, {
      user: {
        email: user.email,
        name: user.name,
        picture: user.picture
      },
      loggedInAt: Date.now()
    }, {
      maxAge: 60 * 60 * 24 * 30
    })

    return sendRedirect(event, '/')
  },
  onError(event, error) {
    console.error('Google OAuth error:', error)
    return sendRedirect(event, '/login?error=oauth_failed')
  }
})
