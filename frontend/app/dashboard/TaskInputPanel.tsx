'use client'

import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import {
  ArrowRight,
  Paperclip,
  Sparkles,
  User,
  Link2,
  ChevronDown,
  Search,
  AlertTriangle,
  Layers,
  X,
} from 'lucide-react'
import axios from 'axios'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'

interface ExecutionMode {
  id: string
  name: string
  description: string
}

interface TaskInputPanelProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  selectedMode: ExecutionMode
  onModeChange: (mode: ExecutionMode) => void
}

interface Skill {
  id: string
  name: string
  icon: string
  category: string
  description: string
}

const executionModes: ExecutionMode[] = [
  { id: 'autobrowse', name: 'Auto Browse LLM', description: 'Full browser automation' },
  { id: 'research', name: 'Research Agent', description: 'Deep web research' },
  { id: 'extraction', name: 'Extraction Agent', description: 'Data extraction focus' },
  { id: 'monitoring', name: 'Monitoring Agent', description: 'Continuous monitoring' },
]

const quickActions = [
  { id: 'extract', name: 'Extract', icon: Layers, mode: 'extraction' },
  { id: 'research', name: 'Research', icon: Search, mode: 'research' },
  { id: 'monitor', name: 'Monitor', icon: AlertTriangle, mode: 'monitoring' },
  { id: 'personal', name: 'Personal Tasks', icon: User, mode: 'autobrowse' },
]

export function TaskInputPanel({ value, onChange, onSubmit, selectedMode, onModeChange }: TaskInputPanelProps) {
  const [isModeDropdownOpen, setIsModeDropdownOpen] = useState(false)
  const [showSkillsMenu, setShowSkillsMenu] = useState(false)
  const [skills, setSkills] = useState<Skill[]>([])
  const [selectedSkills, setSelectedSkills] = useState<Skill[]>([])
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadSkills()
  }, [])

  const loadSkills = async () => {
    try {
      const { data } = await axios.get(`${API_BASE}/skills/user/all`)
      setSkills(data.filter((s: any) => s.is_active))
    } catch (error) {
      console.error('Failed to load skills:', error)
    }
  }

  const handleSelectSkill = (skill: Skill) => {
    if (!selectedSkills.find(s => s.id === skill.id)) {
      setSelectedSkills([...selectedSkills, skill])
    }
    setShowSkillsMenu(false)
  }

  const handleRemoveSkill = (skillId: string) => {
    setSelectedSkills(selectedSkills.filter(s => s.id !== skillId))
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setUploadedFiles([...uploadedFiles, ...Array.from(e.target.files)])
    }
  }

  const handleRemoveFile = (index: number) => {
    setUploadedFiles(uploadedFiles.filter((_, i) => i !== index))
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="flex items-center justify-center mb-4">
          <span className="inline-flex items-center px-3 py-1 text-xs font-medium bg-accent/10 text-accent border border-accent/20">
            Pay As You Go · Upgrade
          </span>
        </div>

        <h1 className="text-2xl font-semibold text-center text-foreground mb-8">
          What task should I handle?
        </h1>

        <div className="w-full max-w-4xl relative bg-surface border border-border p-5 shadow-lg">
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Message Browser Use..."
            className="w-full min-h-[140px] bg-transparent text-foreground placeholder:text-muted-foreground resize-none focus:outline-none text-base"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                onSubmit()
              }
            }}
          />

          {/* Selected Skills Display */}
          {selectedSkills.length > 0 && (
            <div className="mb-4">
              <div className="flex flex-wrap gap-2">
                {selectedSkills.map((skill) => (
                  <div key={skill.id} className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-lg border border-blue-500/30">
                    <span className="text-sm">{skill.icon}</span>
                    <span className="text-sm font-medium">{skill.name}</span>
                    <button
                      onClick={() => handleRemoveSkill(skill.id)}
                      className="text-blue-300 hover:text-blue-100 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Uploaded Files Display */}
          {uploadedFiles.length > 0 && (
            <div className="mb-4">
              <div className="flex flex-wrap gap-2">
                {uploadedFiles.map((file, index) => (
                  <div key={index} className="flex items-center gap-2 px-3 py-1.5 bg-surface-elevated rounded-lg border border-border">
                    <Paperclip className="w-3 h-3 text-muted-foreground" />
                    <span className="text-sm text-foreground">{file.name}</span>
                    <button
                      onClick={() => handleRemoveFile(index)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-border/50">
            <div className="flex items-center gap-1">
              {/* File Upload Button (1st icon) */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-2 text-muted-foreground hover:text-foreground hover:bg-surface-elevated transition-colors"
                title="Attach files"
              >
                <Paperclip className="h-4 w-4" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileUpload}
              />

              {/* Skills Selector Button (2nd icon) */}
              <div className="relative">
                <button
                  onClick={() => setShowSkillsMenu(!showSkillsMenu)}
                  className="p-2 text-muted-foreground hover:text-accent hover:bg-surface-elevated transition-colors"
                  title="Select skill"
                >
                  <Sparkles className="h-4 w-4" />
                </button>

                {/* Skills Dropdown */}
                {showSkillsMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowSkillsMenu(false)}
                    />
                    <div className="absolute bottom-full left-0 mb-2 w-64 bg-surface border border-border rounded-lg shadow-xl max-h-64 overflow-y-auto z-20">
                      <div className="p-2 border-b border-border">
                        <p className="text-xs font-medium text-foreground">Select a Skill</p>
                      </div>
                      {skills.length > 0 ? (
                        skills.map((skill) => (
                          <button
                            key={skill.id}
                            onClick={() => handleSelectSkill(skill)}
                            className="w-full flex items-center gap-2 p-2 hover:bg-surface-elevated transition-colors text-left"
                            disabled={selectedSkills.some(s => s.id === skill.id)}
                          >
                            <span className="text-lg">{skill.icon}</span>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-foreground">{skill.name}</p>
                              <p className="text-xs text-muted-foreground truncate">{skill.category}</p>
                            </div>
                            {selectedSkills.some(s => s.id === skill.id) && (
                              <span className="text-xs text-accent">✓</span>
                            )}
                          </button>
                        ))
                      ) : (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                          No skills available
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Placeholder buttons for future features */}
              <button className="p-2 text-muted-foreground hover:text-foreground hover:bg-surface-elevated transition-colors">
                <User className="h-4 w-4" />
              </button>
              <button className="p-2 text-muted-foreground hover:text-foreground hover:bg-surface-elevated transition-colors">
                <Link2 className="h-4 w-4" />
              </button>
            </div>

            <div className="relative">
              <button
                onClick={() => setIsModeDropdownOpen(!isModeDropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-surface-elevated transition-colors"
              >
                <span>{selectedMode.name}</span>
                <ChevronDown className="h-3 w-3" />
              </button>

              {isModeDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setIsModeDropdownOpen(false)}
                  />
                  <div className="absolute bottom-full right-0 mb-2 w-56 bg-surface border border-border shadow-xl overflow-hidden z-20">
                    {executionModes.map((mode) => (
                      <button
                        key={mode.id}
                        onClick={() => {
                          onModeChange(mode)
                          setIsModeDropdownOpen(false)
                        }}
                        className={cn(
                          'w-full px-4 py-3 text-left hover:bg-surface-elevated transition-colors',
                          selectedMode.id === mode.id && 'bg-accent/10'
                        )}
                      >
                        <p className="text-sm font-medium text-foreground">{mode.name}</p>
                        <p className="text-xs text-muted-foreground">{mode.description}</p>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={onSubmit}
          disabled={!value.trim()}
          className={cn(
            'w-full max-w-4xl h-12 flex items-center justify-center gap-2 transition-colors mt-4',
            value.trim()
              ? 'bg-accent text-white hover:bg-accent-hover'
              : 'bg-surface-elevated text-muted-foreground cursor-not-allowed'
          )}
        >
          <span>Start Task</span>
          <ArrowRight className="h-4 w-4" />
        </button>

        <div className="flex flex-wrap justify-center gap-2 pt-6">
          {quickActions.map((action) => (
            <button
              key={action.id}
              className="flex items-center gap-2 px-4 py-2 bg-surface border border-border text-sm text-muted-foreground hover:text-foreground hover:border-accent/50 transition-colors"
              onClick={() => {
                onChange(`${action.name} `)
              }}
            >
              <action.icon className="h-4 w-4" />
              <span>{action.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
