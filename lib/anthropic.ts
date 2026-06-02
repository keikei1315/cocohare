import Anthropic from '@anthropic-ai/sdk'

export const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY?.replace(/^﻿/, '') })

export function extractJSON(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/s)
  if (fenced) return fenced[1].trim()
  const braced = text.match(/\{[\s\S]*\}/)
  if (braced) return braced[0].trim()
  return text.trim()
}
