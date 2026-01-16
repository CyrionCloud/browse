'use client'

import { useState, useMemo } from 'react'
import { Card, Input } from '@/components/ui'
import { cn } from '@/lib/utils'
import {
  Search,
  ChevronDown,
  ChevronRight,
  Hash,
  Type,
  Link,
  Box,
  Image,
  LayoutList,
  FileText,
  Globe,
  Copy,
  Check,
  TreeDeciduous,
} from 'lucide-react'
import type { DomTree, DomElement, SessionStatus } from '@autobrowse/shared'

interface DOMTreeViewerProps {
  domTree: DomTree | null
  sessionStatus: SessionStatus
}

interface DOMNodeProps {
  element: DomElement
  depth: number
  searchQuery: string
  expandedNodes: Set<string>
  onToggle: (id: string) => void
  onSelectElement: (element: DomElement) => void
}

const tagIcons: Record<string, typeof Box> = {
  a: Link,
  img: Image,
  input: Type,
  button: Box,
  div: LayoutList,
  span: FileText,
  p: FileText,
  h1: Hash,
  h2: Hash,
  h3: Hash,
  h4: Hash,
  h5: Hash,
  h6: Hash,
}

function DOMNode({
  element,
  depth,
  searchQuery,
  expandedNodes,
  onToggle,
  onSelectElement,
}: DOMNodeProps) {
  const hasChildren = element.children && element.children.length > 0
  const isExpanded = expandedNodes.has(element.id)
  const Icon = tagIcons[element.tag.toLowerCase()] || Box

  const matchesSearch = searchQuery
    ? element.tag.toLowerCase().includes(searchQuery.toLowerCase()) ||
      element.text?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      element.attributes.id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      element.attributes.class?.toLowerCase().includes(searchQuery.toLowerCase())
    : false

  return (
    <div>
      <div
        className={cn(
          'flex items-center gap-1 py-1 px-2 hover:bg-surface-elevated cursor-pointer transition-colors',
          matchesSearch && 'bg-accent/10'
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={() => onSelectElement(element)}
      >
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onToggle(element.id)
            }}
            className="p-0.5 text-muted-foreground hover:text-foreground"
          >
            {isExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </button>
        ) : (
          <span className="w-4" />
        )}

        <Icon className="h-3 w-3 text-accent" />

        <span className="text-xs font-mono">
          <span className="text-accent">&lt;{element.tag.toLowerCase()}</span>
           {element.attributes.id && (
            <span className="text-success"> id="{element.attributes.id}"</span>
          )}
          {element.attributes.class && (
            <span className="text-warning"> class="{truncateClass(element.attributes.class)}"</span>
          )}
          <span className="text-accent">&gt;</span>
        </span>

        {element.text && (
          <span className="text-xs text-muted-foreground truncate ml-1 max-w-[200px]">
            {element.text}
          </span>
        )}
      </div>

      {hasChildren && isExpanded && (
        <div>
          {element.children!.map((child) => (
            <DOMNode
              key={child.id}
              element={child}
              depth={depth + 1}
              searchQuery={searchQuery}
              expandedNodes={expandedNodes}
              onToggle={onToggle}
              onSelectElement={onSelectElement}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function truncateClass(className: string): string {
  const classes = className.split(' ')
  if (classes.length <= 3) return className
  return `${classes.slice(0, 3).join(' ')}...`
}

export function DOMTreeViewer({ domTree, sessionStatus }: DOMTreeViewerProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())
  const [selectedElement, setSelectedElement] = useState<DomElement | null>(null)
  const [copiedSelector, setCopiedSelector] = useState(false)

  const totalElements = useMemo(() => {
    if (!domTree) return 0
    const count = (elements: DomElement[]): number =>
      elements.reduce(
        (acc, el) => acc + 1 + (el.children ? count(el.children) : 0),
        0
      )
    return count(domTree.elements)
  }, [domTree])

  const toggleNode = (id: string) => {
    setExpandedNodes((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  const expandAll = () => {
    if (!domTree) return
    const getAllIds = (elements: DomElement[]): string[] =>
      elements.flatMap((el) => [
        el.id,
        ...(el.children ? getAllIds(el.children) : []),
      ])
    setExpandedNodes(new Set(getAllIds(domTree.elements)))
  }

  const collapseAll = () => {
    setExpandedNodes(new Set())
  }

  const getSelector = (element: DomElement): string => {
    if (element.attributes.id) return `#${element.attributes.id}`
    if (element.attributes.class) {
      const classes = element.attributes.class.split(' ')[0]
      return `${element.tag.toLowerCase()}.${classes}`
    }
    return element.tag.toLowerCase()
  }

  const copySelector = async (element: DomElement) => {
    const selector = getSelector(element)
    await navigator.clipboard.writeText(selector)
    setCopiedSelector(true)
    setTimeout(() => setCopiedSelector(false), 2000)
  }

  return (
    <Card className="h-full flex flex-col overflow-hidden">
      <div className="p-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search elements..."
            className="pl-10"
          />
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-muted-foreground">
            {totalElements} elements
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={expandAll}
              className="text-xs text-accent hover:underline"
            >
              Expand all
            </button>
            <span className="text-muted-foreground">/</span>
            <button
              onClick={collapseAll}
              className="text-xs text-accent hover:underline"
            >
              Collapse all
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-auto">
          {domTree ? (
            <div className="py-2">
              {domTree.elements.map((element) => (
                <DOMNode
                  key={element.id}
                  element={element}
                  depth={0}
                  searchQuery={searchQuery}
                  expandedNodes={expandedNodes}
                  onToggle={toggleNode}
                  onSelectElement={setSelectedElement}
                />
              ))}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-4">
              <TreeDeciduous className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-sm font-medium">No DOM tree available</p>
              <p className="text-xs mt-1 text-center">
                {sessionStatus === 'pending' && 'Start the session to capture DOM'}
                {sessionStatus === 'active' && 'Waiting for DOM extraction...'}
                {sessionStatus === 'completed' && 'DOM was not captured'}
                {sessionStatus === 'failed' && 'Session failed before DOM capture'}
              </p>
            </div>
          )}
        </div>

        {selectedElement && (
          <div className="w-72 border-l border-border p-3 overflow-auto bg-surface-elevated">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-foreground">Element Details</h4>
              <button
                onClick={() => setSelectedElement(null)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Close
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-muted-foreground">Tag:</span>
                <span className="ml-2 text-accent">{selectedElement.tag}</span>
              </div>

              {selectedElement.attributes.id && (
                <div>
                  <span className="text-muted-foreground">ID:</span>
                  <span className="ml-2 text-emerald-400">
                    {selectedElement.attributes.id}
                  </span>
                </div>
              )}

              {selectedElement.attributes.class && (
                <div>
                  <span className="text-muted-foreground">Classes:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedElement.attributes.class.split(' ').map((cls, i) => (
                      <span
                        key={i}
                        className="px-1.5 py-0.5 bg-warning/10 text-warning"
                      >
                        {cls}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selectedElement.text && (
                <div>
                  <span className="text-muted-foreground">Text:</span>
                  <p className="mt-1 text-foreground bg-surface p-2">
                    {selectedElement.text}
                  </p>
                </div>
              )}

              {selectedElement.boundingBox && (
                <div>
                  <span className="text-muted-foreground">Bounding Box:</span>
                  <div className="mt-1 grid grid-cols-2 gap-1 text-foreground">
                    <span>x: {selectedElement.boundingBox.x}</span>
                    <span>y: {selectedElement.boundingBox.y}</span>
                    <span>w: {selectedElement.boundingBox.width}</span>
                    <span>h: {selectedElement.boundingBox.height}</span>
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-border">
                <span className="text-muted-foreground">Selector:</span>
                <div className="flex items-center gap-2 mt-1">
                  <code className="flex-1 px-2 py-1 bg-surface text-accent truncate">
                    {getSelector(selectedElement)}
                  </code>
                  <button
                    onClick={() => copySelector(selectedElement)}
                    className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-surface transition-colors"
                    title="Copy selector"
                  >
                    {copiedSelector ? (
                      <Check className="h-3 w-3 text-emerald-400" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {domTree && (
        <div className="p-2 border-t border-border text-xs text-muted-foreground flex items-center gap-2">
          <Globe className="h-3 w-3" />
          <span className="truncate">{domTree.url}</span>
        </div>
      )}
    </Card>
  )
}
