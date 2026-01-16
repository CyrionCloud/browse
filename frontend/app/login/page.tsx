'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Bot, CheckCircle } from 'lucide-react'
import { Button, Input, Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui'
import { useAuth } from '@/hooks/useAuth'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { signIn, signInWithOAuth } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // Check for messages in URL params
  useEffect(() => {
    const confirmed = searchParams.get('confirmed')
    const passwordReset = searchParams.get('password_reset')
    const authError = searchParams.get('error')

    if (confirmed === 'true') {
      setSuccessMessage('Email confirmed! You can now sign in.')
    } else if (passwordReset === 'true') {
      setSuccessMessage('Password reset successful! You can now sign in with your new password.')
    } else if (authError) {
      setError('Authentication failed. Please try again.')
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const result = await signIn(email, password)
      if (result.success) {
        // Use hard navigation to ensure cookies are properly read by middleware
        const redirectTo = searchParams.get('redirectTo') || '/dashboard'
        window.location.href = redirectTo
      } else {
        setError(result.error || 'Failed to sign in')
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleOAuthSignIn = async (provider: 'github' | 'google') => {
    setError('')
    try {
      const result = await signInWithOAuth(provider)
      if (!result.success) {
        setError(result.error || `Failed to sign in with ${provider}`)
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Link href="/" className="flex items-center gap-2">
              <Bot className="h-10 w-10 text-accent" />
            </Link>
          </div>
          <CardTitle className="text-2xl">Welcome Back</CardTitle>
          <CardDescription>
            Sign in to your AutoBrowse account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {successMessage && (
              <div className="p-3 rounded-lg bg-accent/15 border border-accent/25 text-accent text-sm flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                {successMessage}
              </div>
            )}

            {error && (
              <div className="p-3 rounded-lg bg-error/15 border border-error/25 text-error-muted text-sm">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm text-muted-foreground">Password</label>
                <Link href="/forgot-password" className="text-sm text-accent hover:underline">
                  Forgot password?
                </Link>
              </div>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
              />
            </div>

            <Button type="submit" className="w-full" isLoading={isLoading}>
              Sign In
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-card text-muted-foreground">Or continue with</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              onClick={() => handleOAuthSignIn('github')}
              type="button"
            >
              GitHub
            </Button>
            <Button
              variant="outline"
              onClick={() => handleOAuthSignIn('google')}
              type="button"
            >
              Google
            </Button>
          </div>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Do not have an account?{' '}
            <Link href="/signup" className="text-accent hover:underline">
              Sign up
            </Link>
          </p>
      </CardContent>
    </Card>
  </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginForm />
    </Suspense>
  )
}
