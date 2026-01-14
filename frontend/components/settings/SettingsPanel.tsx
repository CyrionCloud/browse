'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent, Input, Switch, Button } from '@/components/ui'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui'
import { Settings, User, Zap, Globe, Shield, Save } from 'lucide-react'
import type { AgentConfig } from '@autobrowse/shared'

interface AgentSettingsProps {
  config: AgentConfig
  onSave: (config: AgentConfig) => void
}

export function AgentSettings({ config, onSave }: AgentSettingsProps) {
  const [localConfig, setLocalConfig] = useState(config)
  const [hasChanges, setHasChanges] = useState(false)

  const handleChange = (updates: Partial<AgentConfig>) => {
    setLocalConfig((prev) => ({ ...prev, ...updates }))
    setHasChanges(true)
  }

  const handleSave = () => {
    onSave(localConfig)
    setHasChanges(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary-500" />
          Agent Configuration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm text-text-secondary">Model</label>
            <select
              value={localConfig.model}
              onChange={(e) => handleChange({ model: e.target.value as AgentConfig['model'] })}
              className="w-full h-10 rounded-lg border border-dark-border bg-dark-surface px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="browser-use-llm">Browser Use LLM</option>
              <option value="claude-sonnet-4.5">Claude Sonnet 4.5</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-text-secondary">Max Steps</label>
            <Input
              type="number"
              value={localConfig.maxSteps}
              onChange={(e) => handleChange({ maxSteps: parseInt(e.target.value) })}
              min={1}
              max={100}
            />
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="text-sm font-medium text-foreground">Options</h4>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Vision</p>
              <p className="text-xs text-text-muted">Enable visual understanding</p>
            </div>
            <Switch
              checked={localConfig.vision}
              onCheckedChange={(checked) => handleChange({ vision: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Thinking</p>
              <p className="text-xs text-text-muted">Show agent reasoning</p>
            </div>
            <Switch
              checked={localConfig.thinking}
              onCheckedChange={(checked) => handleChange({ thinking: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Highlight Elements</p>
              <p className="text-xs text-text-muted">Visual feedback for actions</p>
            </div>
            <Switch
              checked={localConfig.highlightElements}
              onCheckedChange={(checked) => handleChange({ highlightElements: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Hash Mode</p>
              <p className="text-xs text-text-muted">Anonymous element selection</p>
            </div>
            <Switch
              checked={localConfig.hashMode}
              onCheckedChange={(checked) => handleChange({ hashMode: checked })}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm text-text-secondary">Proxy Location</label>
          <Input
            value={localConfig.proxyLocation}
            onChange={(e) => handleChange({ proxyLocation: e.target.value })}
            placeholder="e.g., us-east-1, or leave empty for direct"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm text-text-secondary">Allowed Domains</label>
          <Input
            value={localConfig.allowedDomains.join(', ')}
            onChange={(e) =>
              handleChange({
                allowedDomains: e.target.value.split(',').map((d) => d.trim()).filter(Boolean),
              })
            }
            placeholder="e.g., example.com, another.com"
          />
        </div>

        <Button onClick={handleSave} disabled={!hasChanges} className="w-full">
          <Save className="h-4 w-4 mr-2" />
          Save Configuration
        </Button>
      </CardContent>
    </Card>
  )
}

interface UserSettingsProps {
  email: string
  onSignOut: () => void
}

export function UserSettings({ email, onSignOut }: UserSettingsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5 text-primary-500" />
          Account Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <label className="text-sm text-text-secondary">Email</label>
          <Input value={email} disabled />
        </div>

        <div className="pt-4 border-t border-dark-border">
          <Button variant="destructive" onClick={onSignOut} className="w-full">
            <Shield className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

interface SettingsPanelProps {
  agentConfig: AgentConfig
  onAgentConfigSave: (config: AgentConfig) => void
  userEmail: string
  onSignOut: () => void
}

export function SettingsPanel({
  agentConfig,
  onAgentConfigSave,
  userEmail,
  onSignOut,
}: SettingsPanelProps) {
  return (
    <Tabs defaultValue="agent" className="w-full">
      <TabsList className="w-full grid grid-cols-2">
        <TabsTrigger value="agent" className="flex items-center gap-2">
          <Zap className="h-4 w-4" />
          Agent
        </TabsTrigger>
        <TabsTrigger value="account" className="flex items-center gap-2">
          <User className="h-4 w-4" />
          Account
        </TabsTrigger>
      </TabsList>

      <TabsContent value="agent" className="mt-4">
        <AgentSettings config={agentConfig} onSave={onAgentConfigSave} />
      </TabsContent>

      <TabsContent value="account" className="mt-4">
        <UserSettings email={userEmail} onSignOut={onSignOut} />
      </TabsContent>
    </Tabs>
  )
}
