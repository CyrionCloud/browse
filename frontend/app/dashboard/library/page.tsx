'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, Button } from '@/components/ui'
import {
    Upload,
    FileText,
    Image,
    File,
    Trash2,
    Download,
    Search,
    Filter,
    FolderOpen,
    Plus,
    X,
    FileSpreadsheet,
    FileCode
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface LibraryFile {
    id: string
    filename: string
    original_name: string
    file_type: string
    file_size: number
    category: string
    description?: string
    tags: string[]
    created_at: string
}

const FILE_CATEGORIES = [
    { id: 'all', name: 'All Files', icon: FolderOpen },
    { id: 'resume', name: 'Resumes', icon: FileText },
    { id: 'document', name: 'Documents', icon: File },
    { id: 'image', name: 'Images', icon: Image },
    { id: 'spreadsheet', name: 'Spreadsheets', icon: FileSpreadsheet },
    { id: 'other', name: 'Other', icon: FileCode },
]

function getFileIcon(fileType: string) {
    const imageTypes = ['png', 'jpg', 'jpeg', 'gif', 'webp']
    const spreadsheetTypes = ['csv', 'xls', 'xlsx']
    const codeTypes = ['json', 'xml', 'md']

    if (imageTypes.includes(fileType)) return Image
    if (spreadsheetTypes.includes(fileType)) return FileSpreadsheet
    if (codeTypes.includes(fileType)) return FileCode
    if (fileType === 'pdf') return FileText
    return File
}

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    })
}

export default function LibraryPage() {
    const [files, setFiles] = useState<LibraryFile[]>([])
    const [loading, setLoading] = useState(true)
    const [uploading, setUploading] = useState(false)
    const [selectedCategory, setSelectedCategory] = useState('all')
    const [searchQuery, setSearchQuery] = useState('')
    const [showUploadModal, setShowUploadModal] = useState(false)
    const [uploadData, setUploadData] = useState({
        category: 'document',
        description: '',
        tags: ''
    })

    const fetchFiles = useCallback(async () => {
        try {
            const url = selectedCategory === 'all'
                ? '/api/library'
                : `/api/library?category=${selectedCategory}`

            const response = await fetch(`http://localhost:8000${url}`)
            const data = await response.json()
            setFiles(data.data || [])
        } catch (error) {
            console.error('Failed to fetch files:', error)
        } finally {
            setLoading(false)
        }
    }, [selectedCategory])

    useEffect(() => {
        fetchFiles()
    }, [fetchFiles])

    const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const formData = new FormData(e.currentTarget)

        setUploading(true)
        try {
            const response = await fetch('http://localhost:8000/api/library/upload', {
                method: 'POST',
                body: formData
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.detail || 'Upload failed')
            }

            setShowUploadModal(false)
            setUploadData({ category: 'document', description: '', tags: '' })
            fetchFiles()
        } catch (error: any) {
            alert(error.message || 'Failed to upload file')
        } finally {
            setUploading(false)
        }
    }

    const handleDelete = async (fileId: string, fileName: string) => {
        if (!confirm(`Delete "${fileName}"?`)) return

        try {
            const response = await fetch(`http://localhost:8000/api/library/${fileId}`, {
                method: 'DELETE'
            })

            if (!response.ok) throw new Error('Delete failed')

            fetchFiles()
        } catch (error) {
            alert('Failed to delete file')
        }
    }

    const handleDownload = async (fileId: string) => {
        try {
            const response = await fetch(`http://localhost:8000/api/library/${fileId}/download`)
            const data = await response.json()

            if (data.data?.url) {
                window.open(data.data.url, '_blank')
            }
        } catch (error) {
            alert('Failed to get download link')
        }
    }

    const filteredFiles = files.filter(file =>
        file.original_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        file.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        file.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    )

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">My Library</h1>
                    <p className="text-muted-foreground mt-1">
                        Store your resumes, documents, and files for easy access during automation tasks
                    </p>
                </div>
                <Button onClick={() => setShowUploadModal(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Upload File
                </Button>
            </div>

            {/* Categories & Search */}
            <div className="flex flex-col sm:flex-row gap-4">
                {/* Category Tabs */}
                <div className="flex gap-2 overflow-x-auto pb-2">
                    {FILE_CATEGORIES.map((cat) => (
                        <button
                            key={cat.id}
                            onClick={() => setSelectedCategory(cat.id)}
                            className={cn(
                                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap',
                                selectedCategory === cat.id
                                    ? 'bg-accent text-accent-foreground'
                                    : 'bg-surface-elevated text-muted-foreground hover:text-foreground hover:bg-surface-hover'
                            )}
                        >
                            <cat.icon className="w-4 h-4" />
                            {cat.name}
                        </button>
                    ))}
                </div>

                {/* Search */}
                <div className="relative flex-1 max-w-md ml-auto">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search files..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-surface-elevated border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                </div>
            </div>

            {/* Files Grid */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
                </div>
            ) : filteredFiles.length === 0 ? (
                <Card className="p-12 text-center">
                    <FolderOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">No files yet</h3>
                    <p className="text-muted-foreground mb-4">
                        Upload your first file to get started
                    </p>
                    <Button onClick={() => setShowUploadModal(true)}>
                        <Upload className="w-4 h-4 mr-2" />
                        Upload File
                    </Button>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredFiles.map((file) => {
                        const FileIcon = getFileIcon(file.file_type)
                        return (
                            <Card key={file.id} className="p-4 group hover:border-accent/50 transition-colors">
                                <div className="flex items-start gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                                        <FileIcon className="w-5 h-5 text-accent" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-medium text-foreground truncate" title={file.original_name}>
                                            {file.original_name}
                                        </h3>
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            {formatFileSize(file.file_size)} • {formatDate(file.created_at)}
                                        </p>
                                        {file.description && (
                                            <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                                                {file.description}
                                            </p>
                                        )}
                                        {file.tags.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-2">
                                                {file.tags.slice(0, 3).map((tag, i) => (
                                                    <span key={i} className="px-2 py-0.5 text-xs bg-surface-hover rounded-full text-muted-foreground">
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-2 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDownload(file.id)}
                                        className="flex-1"
                                    >
                                        <Download className="w-4 h-4 mr-1" />
                                        Download
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDelete(file.id, file.original_name)}
                                        className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </Card>
                        )
                    })}
                </div>
            )}

            {/* Upload Modal */}
            {showUploadModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <Card className="w-full max-w-md p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-foreground">Upload File</h2>
                            <button
                                onClick={() => setShowUploadModal(false)}
                                className="p-1 hover:bg-surface-hover rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5 text-muted-foreground" />
                            </button>
                        </div>

                        <form onSubmit={handleUpload} className="space-y-4">
                            {/* File Input */}
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">
                                    File
                                </label>
                                <input
                                    type="file"
                                    name="file"
                                    required
                                    accept=".pdf,.doc,.docx,.txt,.md,.csv,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.webp,.json,.xml"
                                    className="w-full px-4 py-2 bg-surface-elevated border border-border rounded-lg text-foreground file:mr-4 file:py-1 file:px-4 file:rounded-lg file:border-0 file:bg-accent file:text-accent-foreground file:cursor-pointer"
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                    Max 10MB. PDF, DOC, TXT, MD, CSV, images, and more.
                                </p>
                            </div>

                            {/* Category */}
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">
                                    Category
                                </label>
                                <select
                                    name="category"
                                    value={uploadData.category}
                                    onChange={(e) => setUploadData({ ...uploadData, category: e.target.value })}
                                    className="w-full px-4 py-2 bg-surface-elevated border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                                >
                                    <option value="resume">Resume</option>
                                    <option value="document">Document</option>
                                    <option value="image">Image</option>
                                    <option value="spreadsheet">Spreadsheet</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">
                                    Description (optional)
                                </label>
                                <textarea
                                    name="description"
                                    value={uploadData.description}
                                    onChange={(e) => setUploadData({ ...uploadData, description: e.target.value })}
                                    placeholder="Brief description of this file..."
                                    rows={2}
                                    className="w-full px-4 py-2 bg-surface-elevated border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent resize-none"
                                />
                            </div>

                            {/* Tags */}
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">
                                    Tags (optional)
                                </label>
                                <input
                                    type="text"
                                    name="tags"
                                    value={uploadData.tags}
                                    onChange={(e) => setUploadData({ ...uploadData, tags: e.target.value })}
                                    placeholder="job-search, 2024, tech"
                                    className="w-full px-4 py-2 bg-surface-elevated border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                    Separate tags with commas
                                </p>
                            </div>

                            {/* Submit */}
                            <div className="flex gap-3 pt-2">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => setShowUploadModal(false)}
                                    className="flex-1"
                                >
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={uploading} className="flex-1">
                                    {uploading ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                                            Uploading...
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="w-4 h-4 mr-2" />
                                            Upload
                                        </>
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
