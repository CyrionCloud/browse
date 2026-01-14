'use client'

import Link from 'next/link'
import { Button, Card, CardContent } from '@/components/ui'
import { Bot, Zap, Shield, Globe, ArrowRight, Play } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <Bot className="h-8 w-8 text-accent" />
              <span className="font-bold text-xl text-foreground">AutoBrowse</span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/login">
                <Button variant="ghost">Sign In</Button>
              </Link>
              <Link href="/dashboard">
                <Button>Get Started</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main>
        <section className="py-20 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl font-bold tracking-tight text-foreground mb-6">
              Automate Your Browser with <span className="text-accent">AI</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Tell AutoBrowse what you want to accomplish, and our AI-powered agent
              will navigate, click, type, and extract data from websites for you.
            </p>
            <div className="flex items-center justify-center gap-4">
              <Link href="/dashboard">
                <Button size="lg">
                  <Play className="h-5 w-5 mr-2" />
                  Start Automating
                </Button>
              </Link>
              <Link href="#features">
                <Button variant="outline" size="lg">
                  Learn More
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <section id="features" className="py-20 px-4 border-t border-border">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-3xl font-bold text-center text-foreground mb-12">
              Everything You Need for Browser Automation
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              <Card>
                <CardContent className="p-6">
                  <Zap className="h-10 w-10 text-accent mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    AI-Powered Automation
                  </h3>
                  <p className="text-muted-foreground">
                    Describe your task in plain English and let Claude AI plan and
                    execute the browser actions for you.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <Globe className="h-10 w-10 text-accent mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    Multi-Site Support
                  </h3>
                  <p className="text-muted-foreground">
                    Automate tasks across any website with intelligent element
                    detection and interaction handling.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <Shield className="h-10 w-10 text-accent mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    Secure and Private
                  </h3>
                  <p className="text-muted-foreground">
                    Your data stays local. All browser automation happens in
                    secure environments with full control.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="py-20 px-4 border-t border-border">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center text-foreground mb-8">
              Ready to Get Started?
            </h2>
            <div className="text-center">
              <Link href="/dashboard">
                <Button size="lg">
                  Create Your First Automation
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="py-8 px-4 border-t border-border">
        <div className="max-w-7xl mx-auto text-center text-sm text-muted-foreground">
          <p>Built with Next.js, Playwright, and Claude AI</p>
        </div>
      </footer>
    </div>
  )
}
