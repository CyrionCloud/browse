'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, Button } from '@/components/ui'
import {
    Key,
    CreditCard,
    Lock,
    Smartphone,
    Plus,
    X,
    Trash2,
    Eye,
    EyeOff,
    Globe,
    User,
    Copy,
    Check
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Credential {
    id: string
    credential_type: 'password' | 'credit_card' | 'secret' | '2fa'
    name: string
    website_url?: string
    username?: string
    encrypted_value: string
    extra_data?: any
    tags: string[]
    notes?: string
    created_at: string
}

const CREDENTIAL_TYPES = [
    { id: 'password', name: 'Passwords', icon: Key },
    { id: 'credit_card', name: 'Credit Cards', icon: CreditCard },
    { id: 'secret', name: 'Secrets', icon: Lock },
    { id: '2fa', name: '2FA', icon: Smartphone },
]

function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    })
}

export default function CredentialsPage() {
    const [credentials, setCredentials] = useState<Credential[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedType, setSelectedType] = useState('password')
    const [showModal, setShowModal] = useState(false)
    const [modalType, setModalType] = useState<string>('password')
    const [saving, setSaving] = useState(false)
    const [copiedId, setCopiedId] = useState<string | null>(null)

    const fetchCredentials = useCallback(async () => {
        try {
            const response = await fetch(`http://localhost:8000/api/credentials?credential_type=${selectedType}`)
            const data = await response.json()
            setCredentials(data.data || [])
        } catch (error) {
            console.error('Failed to fetch credentials:', error)
        } finally {
            setLoading(false)
        }
    }, [selectedType])

    useEffect(() => {
        fetchCredentials()
    }, [fetchCredentials])

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Delete "${name}"?`)) return

        try {
            await fetch(`http://localhost:8000/api/credentials/${id}`, { method: 'DELETE' })
            fetchCredentials()
        } catch (error) {
            alert('Failed to delete credential')
        }
    }

    const handleCopy = async (id: string) => {
        try {
            const response = await fetch(`http://localhost:8000/api/credentials/${id}/decrypt`)
            const data = await response.json()
            if (data.data?.value) {
                await navigator.clipboard.writeText(data.data.value)
                setCopiedId(id)
                setTimeout(() => setCopiedId(null), 2000)
            }
        } catch (error) {
            alert('Failed to copy credential')
        }
    }

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const formData = new FormData(e.currentTarget)

        setSaving(true)
        try {
            let endpoint = ''
            let body: any = {}

            switch (modalType) {
                case 'password':
                    endpoint = '/api/credentials/password'
                    body = {
                        name: formData.get('name'),
                        website_url: formData.get('website_url'),
                        username: formData.get('username'),
                        password: formData.get('password'),
                        notes: formData.get('notes'),
                        tags: formData.get('tags')?.toString().split(',').map(t => t.trim()).filter(Boolean) || []
                    }
                    break
                case 'credit_card':
                    endpoint = '/api/credentials/credit-card'
                    body = {
                        name: formData.get('name'),
                        card_number: formData.get('card_number'),
                        expiry: formData.get('expiry'),
                        cvv: formData.get('cvv'),
                        cardholder_name: formData.get('cardholder_name'),
                        notes: formData.get('notes'),
                        tags: []
                    }
                    break
                case 'secret':
                    endpoint = '/api/credentials/secret'
                    body = {
                        name: formData.get('name'),
                        secret_value: formData.get('secret_value'),
                        notes: formData.get('notes'),
                        tags: formData.get('tags')?.toString().split(',').map(t => t.trim()).filter(Boolean) || []
                    }
                    break
                case '2fa':
                    endpoint = '/api/credentials/2fa'
                    body = {
                        name: formData.get('name'),
                        secret_key: formData.get('secret_key'),
                        website_url: formData.get('website_url'),
                        notes: formData.get('notes'),
                        tags: []
                    }
                    break
            }

            const response = await fetch(`http://localhost:8000${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.detail || 'Failed to save')
            }

            setShowModal(false)
            setSelectedType(modalType)
            fetchCredentials()
        } catch (error: any) {
            alert(error.message || 'Failed to save credential')
        } finally {
            setSaving(false)
        }
    }

    const openAddModal = (type: string) => {
        setModalType(type)
        setShowModal(true)
    }

    const renderCredentialCard = (cred: Credential) => {
        const TypeIcon = CREDENTIAL_TYPES.find(t => t.id === cred.credential_type)?.icon || Key

        return (
            <Card key={cred.id} className="p-4 group hover:border-accent/50 transition-colors">
                <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                        <TypeIcon className="w-5 h-5 text-accent" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-foreground truncate">{cred.name}</h3>
                        {cred.website_url && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                                <Globe className="w-3 h-3" />
                                <span className="truncate">{cred.website_url}</span>
                            </div>
                        )}
                        {cred.username && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                                <User className="w-3 h-3" />
                                <span>{cred.username}</span>
                            </div>
                        )}
                        {cred.extra_data?.last_four && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                                •••• {cred.extra_data.last_four}
                            </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                            Added {formatDate(cred.created_at)}
                        </p>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopy(cred.id)}
                        className="flex-1"
                    >
                        {copiedId === cred.id ? (
                            <><Check className="w-4 h-4 mr-1 text-green-500" /> Copied</>
                        ) : (
                            <><Copy className="w-4 h-4 mr-1" /> Copy</>
                        )}
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(cred.id, cred.name)}
                        className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                    >
                        <Trash2 className="w-4 h-4" />
                    </Button>
                </div>
            </Card>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Credentials</h1>
                    <p className="text-muted-foreground mt-1">
                        Securely store passwords, credit cards, secrets, and 2FA codes for automation
                    </p>
                </div>
                <Button onClick={() => openAddModal(selectedType)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add
                </Button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2 border-b border-border">
                {CREDENTIAL_TYPES.map((type) => (
                    <button
                        key={type.id}
                        onClick={() => setSelectedType(type.id)}
                        className={cn(
                            'flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-medium transition-colors whitespace-nowrap border-b-2 -mb-[2px]',
                            selectedType === type.id
                                ? 'border-accent text-accent bg-surface-elevated'
                                : 'border-transparent text-muted-foreground hover:text-foreground'
                        )}
                    >
                        <type.icon className="w-4 h-4" />
                        {type.name}
                    </button>
                ))}
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
                </div>
            ) : credentials.length === 0 ? (
                <Card className="p-12 text-center">
                    <Lock className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">
                        No {CREDENTIAL_TYPES.find(t => t.id === selectedType)?.name.toLowerCase()} stored yet
                    </h3>
                    <p className="text-muted-foreground mb-4">
                        Add your first credential to get started
                    </p>
                    <Button onClick={() => openAddModal(selectedType)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add {CREDENTIAL_TYPES.find(t => t.id === selectedType)?.name.slice(0, -1)}
                    </Button>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {credentials.map(renderCredentialCard)}
                </div>
            )}

            {/* Add Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <Card className="w-full max-w-md p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-foreground">
                                Add {CREDENTIAL_TYPES.find(t => t.id === modalType)?.name.slice(0, -1)}
                            </h2>
                            <button
                                onClick={() => setShowModal(false)}
                                className="p-1 hover:bg-surface-hover rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5 text-muted-foreground" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Common: Name */}
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">Name *</label>
                                <input
                                    type="text"
                                    name="name"
                                    required
                                    placeholder="e.g. GitHub, Personal Gmail"
                                    className="w-full px-4 py-2 bg-surface-elevated border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                                />
                            </div>

                            {/* Password Fields */}
                            {modalType === 'password' && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-2">Website URL</label>
                                        <input type="url" name="website_url" placeholder="https://github.com"
                                            className="w-full px-4 py-2 bg-surface-elevated border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-2">Username</label>
                                        <input type="text" name="username" placeholder="john@example.com"
                                            className="w-full px-4 py-2 bg-surface-elevated border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-2">Password *</label>
                                        <input type="password" name="password" required
                                            className="w-full px-4 py-2 bg-surface-elevated border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent" />
                                    </div>
                                </>
                            )}

                            {/* Credit Card Fields */}
                            {modalType === 'credit_card' && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-2">Card Number *</label>
                                        <input type="text" name="card_number" required placeholder="4242 4242 4242 4242"
                                            className="w-full px-4 py-2 bg-surface-elevated border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-foreground mb-2">Expiry *</label>
                                            <input type="text" name="expiry" required placeholder="MM/YY"
                                                className="w-full px-4 py-2 bg-surface-elevated border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-foreground mb-2">CVV *</label>
                                            <input type="password" name="cvv" required placeholder="123"
                                                className="w-full px-4 py-2 bg-surface-elevated border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-2">Cardholder Name</label>
                                        <input type="text" name="cardholder_name" placeholder="John Doe"
                                            className="w-full px-4 py-2 bg-surface-elevated border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent" />
                                    </div>
                                </>
                            )}

                            {/* Secret Fields */}
                            {modalType === 'secret' && (
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-2">Secret Value *</label>
                                    <textarea name="secret_value" required rows={3} placeholder="API key, token, or any secret..."
                                        className="w-full px-4 py-2 bg-surface-elevated border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent resize-none" />
                                </div>
                            )}

                            {/* 2FA Fields */}
                            {modalType === '2fa' && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-2">TOTP Secret Key *</label>
                                        <input type="text" name="secret_key" required placeholder="JBSWY3DPEHPK3PXP"
                                            className="w-full px-4 py-2 bg-surface-elevated border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent" />
                                        <p className="text-xs text-muted-foreground mt-1">The secret key from your authenticator setup</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-2">Website URL</label>
                                        <input type="url" name="website_url" placeholder="https://github.com"
                                            className="w-full px-4 py-2 bg-surface-elevated border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent" />
                                    </div>
                                </>
                            )}

                            {/* Notes */}
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">Notes</label>
                                <textarea name="notes" rows={2} placeholder="Optional notes..."
                                    className="w-full px-4 py-2 bg-surface-elevated border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent resize-none" />
                            </div>

                            {/* Tags for password/secret */}
                            {(modalType === 'password' || modalType === 'secret') && (
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-2">Tags</label>
                                    <input type="text" name="tags" placeholder="work, personal, api"
                                        className="w-full px-4 py-2 bg-surface-elevated border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent" />
                                    <p className="text-xs text-muted-foreground mt-1">Separate with commas</p>
                                </div>
                            )}

                            {/* Submit */}
                            <div className="flex gap-3 pt-2">
                                <Button type="button" variant="ghost" onClick={() => setShowModal(false)} className="flex-1">
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={saving} className="flex-1">
                                    {saving ? (
                                        <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" /> Saving...</>
                                    ) : (
                                        <><Lock className="w-4 h-4 mr-2" /> Save Securely</>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}
        </div>
    )
}
