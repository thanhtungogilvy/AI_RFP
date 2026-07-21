import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

describe('004_production_reliability migration', () => {
  it('adds durable proposal artifacts, unique slide indexes, and case-study search', async () => {
    const sql = await readFile(new URL('../../../../supabase/migrations/004_production_reliability.sql', import.meta.url), 'utf8')

    expect(sql).toContain('unique (case_study_id, slide_index)')
    expect(sql).toContain('add column if not exists pdf_path')
    expect(sql).toContain('add column if not exists pdf_status')
    expect(sql).toContain('create or replace function public.search_case_studies')
  })
})
