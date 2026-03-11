import { describe, expect, it } from 'vitest'
import {
  ensureProviderPrefix,
  extractProvider,
  getProviderModels,
  stripProviderPrefix,
  supportsEmbeddings,
  supportsStreaming,
  supportsToolUse,
  supportsVision,
} from '../src/providers'

describe('providers', () => {
  describe('ensureProviderPrefix', () => {
    it('should add prefix when missing', () => {
      expect(ensureProviderPrefix('openai', 'gpt-4o')).toBe('openai/gpt-4o')
      expect(ensureProviderPrefix('anthropic', 'claude-sonnet-4-20250514')).toBe(
        'anthropic/claude-sonnet-4-20250514',
      )
    })

    it('should not double-prefix', () => {
      expect(ensureProviderPrefix('openai', 'openai/gpt-4o')).toBe('openai/gpt-4o')
    })

    it('should not modify if already has another provider prefix', () => {
      expect(ensureProviderPrefix('openai', 'anthropic/claude-sonnet-4-20250514')).toBe(
        'anthropic/claude-sonnet-4-20250514',
      )
    })

    it('should return as-is for unknown providers', () => {
      expect(ensureProviderPrefix('unknown', 'some-model')).toBe('some-model')
    })
  })

  describe('extractProvider', () => {
    it('should extract provider from prefixed model', () => {
      expect(extractProvider('openai/gpt-4o')).toBe('openai')
      expect(extractProvider('anthropic/claude-sonnet-4-20250514')).toBe('anthropic')
      expect(extractProvider('google/gemini-2.0-flash')).toBe('google')
    })

    it('should return undefined for unprefixed models', () => {
      expect(extractProvider('gpt-4o')).toBeUndefined()
    })
  })

  describe('stripProviderPrefix', () => {
    it('should strip known prefixes', () => {
      expect(stripProviderPrefix('openai/gpt-4o')).toBe('gpt-4o')
      expect(stripProviderPrefix('anthropic/claude-sonnet-4-20250514')).toBe('claude-sonnet-4-20250514')
    })

    it('should return as-is if no prefix', () => {
      expect(stripProviderPrefix('gpt-4o')).toBe('gpt-4o')
    })
  })

  describe('getProviderModels', () => {
    it('should return models for known providers', () => {
      const models = getProviderModels('openai')
      expect(models.length).toBeGreaterThan(0)
      expect(models).toContain('gpt-4o')
    })

    it('should return empty array for unknown providers', () => {
      expect(getProviderModels('unknown')).toEqual([])
    })
  })

  describe('capability queries', () => {
    it('should report embedding support', () => {
      expect(supportsEmbeddings('openai')).toBe(true)
      expect(supportsEmbeddings('cohere')).toBe(true)
      expect(supportsEmbeddings('groq')).toBe(false)
    })

    it('should report streaming support', () => {
      expect(supportsStreaming('openai')).toBe(true)
      expect(supportsStreaming('anthropic')).toBe(true)
    })

    it('should report tool use support', () => {
      expect(supportsToolUse('openai')).toBe(true)
      expect(supportsToolUse('anthropic')).toBe(true)
      expect(supportsToolUse('together')).toBe(false)
    })

    it('should report vision support', () => {
      expect(supportsVision('openai')).toBe(true)
      expect(supportsVision('anthropic')).toBe(true)
      expect(supportsVision('google')).toBe(true)
      expect(supportsVision('mistral')).toBe(false)
    })
  })
})
