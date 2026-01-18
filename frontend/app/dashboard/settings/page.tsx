'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Switch, Badge } from '@/components/ui'
import { useAuth } from '@/hooks/useAuth'
import { useAppStore } from '@/store/useAppStore'
import { settingsApi, AVAILABLE_MODELS, type UserSettings, type ModelId } from '@/lib/api'
import { cn } from '@/lib/utils'
import {
  User,
  Key,
  Bell,
  Shield,
  Palette,
  Cpu,
  Globe,
  CreditCard,
  ChevronRight,
  Check,
  Copy,
  Eye,
  EyeOff,
  Settings,
  Zap,
  Save,
  Loader2,
} from 'lucide-react'

interface SettingsSectionProps {
  title: string
  description: string
  icon: typeof User
  children: React.ReactNode
}

function SettingsSection({ title, description, icon: Icon, children }: SettingsSectionProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
            <Icon className="h-5 w-5 text-accent" />
          </div>
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">{children}</CardContent>
    </Card>
  )
}

export default function SettingsPage() {
  const { user } = useAuth()
  const { wsConnected, agentConfig, setAgentConfig } = useAppStore()
  const [showApiKey, setShowApiKey] = useState(false)
  const [copied, setCopied] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [settings, setSettings] = useState<UserSettings>({
    model: 'deepseek-chat',
    maxSteps: 50,
    vision: true,
    thinking: true,
    highlightElements: true,
    notifications: true,
    emailAlerts: false,
    proxyEnabled: false,
    proxyLocation: 'auto',
  })

  const [originalSettings, setOriginalSettings] = useState<UserSettings | null>(null)

  // Load settings on mount
  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setIsLoading(true)
      const loadedSettings = await settingsApi.get()
      setSettings(loadedSettings)
      setOriginalSettings(loadedSettings)

      // Also sync to zustand store for dashboard to use
      setAgentConfig({
        ...agentConfig,
        maxSteps: loadedSettings.maxSteps,
        vision: loadedSettings.vision,
        thinking: loadedSettings.thinking,
        highlightElements: loadedSettings.highlightElements,
      })
    } catch (error) {
      console.error('Failed to load settings:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setIsSaving(true)
      setSaveMessage(null)
      await settingsApi.save(settings)
      setOriginalSettings(settings)
      setHasChanges(false)

      // Sync settings to zustand store so dashboard uses updated values
      setAgentConfig({
        ...agentConfig,
        maxSteps: settings.maxSteps,
        vision: settings.vision,
        thinking: settings.thinking,
        highlightElements: settings.highlightElements,
      })

      console.log('Settings saved and synced to store:', { maxSteps: settings.maxSteps })
      setSaveMessage({ type: 'success', text: 'Settings saved successfully!' })
      setTimeout(() => setSaveMessage(null), 3000)
    } catch (error) {
      console.error('Failed to save settings:', error)
      setSaveMessage({ type: 'error', text: 'Failed to save settings. Please try again.' })
    } finally {
      setIsSaving(false)
    }
  }

  const mockApiKey = 'ab_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'

  const handleCopyApiKey = async () => {
    try {
      await navigator.clipboard.writeText(mockApiKey)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  const updateSetting = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
    setHasChanges(true)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your account and automation preferences
          </p>
        </div>
        <div className="flex items-center gap-3">
          {saveMessage && (
            <span className={cn(
              'text-sm',
              saveMessage.type === 'success' ? 'text-emerald-400' : 'text-red-400'
            )}>
              {saveMessage.text}
            </span>
          )}
          <Button
            variant="accent"
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>
      </div>

      <SettingsSection
        title="Profile"
        description="Your account information"
        icon={User}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-border">
            <div>
              <p className="text-sm font-medium text-foreground">Email</p>
              <p className="text-sm text-muted-foreground">
                {user?.email || 'guest@example.com'}
              </p>
            </div>
            <Button variant="outline" size="sm">Edit</Button>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-border">
            <div>
              <p className="text-sm font-medium text-foreground">Connection Status</p>
              <div className="flex items-center gap-2 mt-1">
                <div
                  className={cn(
                    'w-2 h-2 rounded-full',
                    wsConnected ? 'bg-emerald-400' : 'bg-muted-foreground'
                  )}
                />
                <span className="text-sm text-muted-foreground">
                  {wsConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium text-foreground">Subscription</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline">Free Plan</Badge>
                <span className="text-sm text-muted-foreground">245 credits remaining</span>
              </div>
            </div>
            <Button variant="accent" size="sm">
              <Zap className="h-4 w-4 mr-2" />
              Upgrade
            </Button>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection
        title="API Key"
        description="Your API key for external integrations"
        icon={Key}
      >
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <Input
                type={showApiKey ? 'text' : 'password'}
                value={mockApiKey}
                readOnly
                className="pr-20 font-mono text-sm"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <button
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="p-1 hover:bg-surface-hover rounded"
                >
                  {showApiKey ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
                <button
                  onClick={handleCopyApiKey}
                  className="p-1 hover:bg-surface-hover rounded"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <Copy className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
              </div>
            </div>
          </div>
          <Button variant="outline" size="sm">
            Regenerate API Key
          </Button>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Agent Configuration"
        description="Configure the AI automation settings"
        icon={Cpu}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-border">
            <div>
              <p className="text-sm font-medium text-foreground">AI Model</p>
              <p className="text-sm text-muted-foreground">
                Choose the AI model for automation (DeepSeek recommended)
              </p>
            </div>
            <select
              value={settings.model}
              onChange={(e) => updateSetting('model', e.target.value as ModelId)}
              className="h-9 rounded-lg border border-border bg-surface px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <optgroup label="DeepSeek (Recommended)">
                <option value="deepseek-chat">DeepSeek Chat</option>
                <option value="deepseek-reasoner">DeepSeek Reasoner</option>
              </optgroup>
              <optgroup label="Anthropic Claude">
                <option value="claude-sonnet">Claude Sonnet 4.5</option>
              </optgroup>
              <optgroup label="OpenAI">
                <option value="gpt-4">GPT-4</option>
              </optgroup>
              <optgroup label="Google">
                <option value="gemini-pro">Gemini Pro</option>
              </optgroup>
            </select>
          </div>

          <div className="flex items-center justify-between py-3 border-b border-border">
            <div>
              <p className="text-sm font-medium text-foreground">Max Steps</p>
              <p className="text-sm text-muted-foreground">
                Maximum actions per session
              </p>
            </div>
            <Input
              type="number"
              value={settings.maxSteps}
              onChange={(e) => updateSetting('maxSteps', parseInt(e.target.value) || 50)}
              className="w-24 text-center"
              min={1}
              max={200}
            />
          </div>

          <div className="flex items-center justify-between py-3 border-b border-border">
            <div>
              <p className="text-sm font-medium text-foreground">Vision Mode</p>
              <p className="text-sm text-muted-foreground">
                Enable visual page understanding
              </p>
            </div>
            <Switch
              checked={settings.vision}
              onCheckedChange={(checked) => updateSetting('vision', checked)}
            />
          </div>

          <div className="flex items-center justify-between py-3 border-b border-border">
            <div>
              <p className="text-sm font-medium text-foreground">Thinking Mode</p>
              <p className="text-sm text-muted-foreground">
                Show AI reasoning process
              </p>
            </div>
            <Switch
              checked={settings.thinking}
              onCheckedChange={(checked) => updateSetting('thinking', checked)}
            />
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium text-foreground">Highlight Elements</p>
              <p className="text-sm text-muted-foreground">
                Visually highlight interacted elements
              </p>
            </div>
            <Switch
              checked={settings.highlightElements}
              onCheckedChange={(checked) => updateSetting('highlightElements', checked)}
            />
          </div>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Notifications"
        description="Manage your notification preferences"
        icon={Bell}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-border">
            <div>
              <p className="text-sm font-medium text-foreground">Push Notifications</p>
              <p className="text-sm text-muted-foreground">
                Browser notifications for session updates
              </p>
            </div>
            <Switch
              checked={settings.notifications}
              onCheckedChange={(checked) => updateSetting('notifications', checked)}
            />
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium text-foreground">Email Alerts</p>
              <p className="text-sm text-muted-foreground">
                Receive email for completed sessions
              </p>
            </div>
            <Switch
              checked={settings.emailAlerts}
              onCheckedChange={(checked) => updateSetting('emailAlerts', checked)}
            />
          </div>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Proxy Settings"
        description="Configure proxy for browser automation"
        icon={Globe}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-border">
            <div>
              <p className="text-sm font-medium text-foreground">Enable Proxy</p>
              <p className="text-sm text-muted-foreground">
                Route browser traffic through proxy
              </p>
            </div>
            <Switch
              checked={settings.proxyEnabled}
              onCheckedChange={(checked) => updateSetting('proxyEnabled', checked)}
            />
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium text-foreground">Proxy Location</p>
              <p className="text-sm text-muted-foreground">
                Select proxy server location
              </p>
            </div>
            <select
              value={settings.proxyLocation}
              onChange={(e) => updateSetting('proxyLocation', e.target.value)}
              disabled={!settings.proxyEnabled}
              className="h-9 rounded-lg border border-border bg-surface px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
            >
              <option value="us">United States</option>
              <option value="eu">Europe</option>
              <option value="asia">Asia Pacific</option>
            </select>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Security"
        description="Account security and privacy"
        icon={Shield}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-border">
            <div>
              <p className="text-sm font-medium text-foreground">Two-Factor Authentication</p>
              <p className="text-sm text-muted-foreground">
                Add an extra layer of security
              </p>
            </div>
            <Button variant="outline" size="sm">Enable</Button>
          </div>

          <div className="flex items-center justify-between py-3 border-b border-border">
            <div>
              <p className="text-sm font-medium text-foreground">Active Sessions</p>
              <p className="text-sm text-muted-foreground">
                Manage your active sessions
              </p>
            </div>
            <Button variant="outline" size="sm">View All</Button>
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium text-foreground">Delete Account</p>
              <p className="text-sm text-muted-foreground">
                Permanently delete your account and data
              </p>
            </div>
            <Button variant="destructive" size="sm">Delete</Button>
          </div>
        </div>
      </SettingsSection>
    </div>
  )
}
