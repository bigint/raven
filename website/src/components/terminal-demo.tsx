'use client'

import { useEffect, useRef, useState } from 'react'

interface TerminalLine {
  type: 'command' | 'output'
  text: string
  delay?: number
}

const lines: TerminalLine[] = [
  {
    type: 'command',
    text: 'curl -LO https://github.com/bigint-studio/raven/releases/latest/download/raven-darwin-arm64',
    delay: 40,
  },
  {
    type: 'command',
    text: 'chmod +x raven-darwin-arm64 && mv raven-darwin-arm64 /usr/local/bin/raven',
    delay: 40,
  },
  { type: 'command', text: 'raven serve', delay: 60 },
  { type: 'output', text: '\u2713 Raven AI Gateway started on :8080', delay: 0 },
  { type: 'output', text: '\u2713 50+ providers ready', delay: 0 },
  { type: 'output', text: '\u2713 Dashboard at http://localhost:8080/dashboard', delay: 0 },
]

export function TerminalDemo() {
  const [visibleLines, setVisibleLines] = useState<number>(0)
  const [typedChars, setTypedChars] = useState<number>(0)
  const [isTyping, setIsTyping] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)
  const hasStarted = useRef(false)

  useEffect(() => {
    if (hasStarted.current) return
    hasStarted.current = true

    let lineIndex = 0
    let charIndex = 0

    const typeNextChar = () => {
      if (lineIndex >= lines.length) {
        setIsTyping(false)
        return
      }

      const currentLine = lines[lineIndex]

      if (currentLine.type === 'output') {
        setVisibleLines(lineIndex + 1)
        lineIndex++
        setTimeout(typeNextChar, 300)
        return
      }

      if (charIndex === 0) {
        setVisibleLines(lineIndex + 1)
      }

      if (charIndex < currentLine.text.length) {
        charIndex++
        setTypedChars(charIndex)
        setTimeout(typeNextChar, currentLine.delay ?? 40)
      } else {
        lineIndex++
        charIndex = 0
        setTypedChars(0)
        setTimeout(typeNextChar, 600)
      }
    }

    setTimeout(typeNextChar, 800)
  }, [])

  let commandIndex = -1

  return (
    <div className="w-full max-w-2xl mx-auto rounded-xl border border-border overflow-hidden bg-[#1E1E1E] shadow-2xl shadow-black/40">
      <div className="flex items-center gap-2 px-4 py-3 bg-[#2D2D2D] border-b border-border">
        <div className="w-3 h-3 rounded-full bg-[#FF5F57]" />
        <div className="w-3 h-3 rounded-full bg-[#FEBC2E]" />
        <div className="w-3 h-3 rounded-full bg-[#28C840]" />
        <span className="ml-2 text-xs text-muted">Terminal</span>
      </div>
      <div ref={containerRef} className="p-5 font-mono text-sm leading-relaxed overflow-x-auto">
        {lines.map((line, i) => {
          if (i >= visibleLines) return null

          if (line.type === 'command') {
            commandIndex++
            const isCurrentlyTyping = isTyping && commandIndex === countCommands(visibleLines, lines) - 1
            const displayText = isCurrentlyTyping ? line.text.slice(0, typedChars) : line.text

            return (
              <div key={`line-${line.text.slice(0, 20)}`} className="flex gap-2 mb-1">
                <span className="token-prompt select-none">$</span>
                <span className="text-foreground">
                  {displayText}
                  {isCurrentlyTyping && (
                    <span className="inline-block w-2 h-4 bg-foreground ml-0.5 align-middle" style={{ animation: 'blink 1s step-end infinite' }} />
                  )}
                </span>
              </div>
            )
          }

          return (
            <div key={`line-${line.text.slice(0, 20)}`} className="mb-1 token-success">
              {line.text}
            </div>
          )
        })}
        {visibleLines === 0 && (
          <div className="flex gap-2">
            <span className="token-prompt select-none">$</span>
            <span className="inline-block w-2 h-4 bg-foreground" style={{ animation: 'blink 1s step-end infinite' }} />
          </div>
        )}
      </div>
    </div>
  )
}

function countCommands(upTo: number, allLines: TerminalLine[]): number {
  let count = 0
  for (let i = 0; i < upTo && i < allLines.length; i++) {
    if (allLines[i].type === 'command') count++
  }
  return count
}
