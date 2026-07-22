/**
 * Supabase Database type definitions.
 * Mirrors the schema in supabase/migrations/001_initial_schema.sql.
 *
 * To auto-generate from a live project:
 *   npx supabase gen types typescript --project-id <id> > server/services/supabase/types.ts
 */
export interface Database {
  public: {
    Tables: {
      case_studies: {
        Row: {
          id: string
          title: string
          client: string
          industry: string
          summary: string
          tags: string[]
          file_name: string
          file_path: string | null
          status: 'processing' | 'indexed' | 'error'
          uploaded_at: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['case_studies']['Row'], 'id' | 'created_at' | 'uploaded_at'> & {
          id?: string
          uploaded_at?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['case_studies']['Insert']>
      }
      case_study_slides: {
        Row: {
          id: string
          case_study_id: string
          slide_index: number
          title: string
          content: string
          image_url: string | null
          tags: string[]
          embedding: number[] | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['case_study_slides']['Row'], 'id' | 'created_at' | 'embedding'> & {
          id?: string
          created_at?: string
          embedding?: number[] | null
        }
        Update: Partial<Database['public']['Tables']['case_study_slides']['Insert']>
      }
      rfp_documents: {
        Row: {
          id: string
          title: string
          client: string
          industry: string
          deadline: string | null
          file_name: string
          file_path: string | null
          content: string
          analysis: unknown | null
          embedding: number[] | null
          status: 'uploaded' | 'analyzing' | 'analyzed' | 'error'
          uploaded_at: string
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['rfp_documents']['Row'], 'id' | 'created_at' | 'uploaded_at'> & {
          id?: string
          uploaded_at?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['rfp_documents']['Insert']>
      }
      proposals: {
        Row: {
          id: string
          rfp_id: string | null
          title: string
          status: 'pending' | 'generating' | 'completed' | 'error'
          selected_case_study_ids: string[]
          pptx_url: string | null
          pptx_path: string | null
          pdf_url: string | null
          pdf_path: string | null
          pdf_status: 'not_requested' | 'completed' | 'error'
          pdf_error_message: string | null
          error_message: string | null
          created_at: string
          completed_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['proposals']['Row'], 'created_at'> & {
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['proposals']['Insert']>
      }
    }
  }
}

// Shorthand row types
export type CaseStudyRow   = Database['public']['Tables']['case_studies']['Row']
export type SlideRow        = Database['public']['Tables']['case_study_slides']['Row']
export type RfpRow          = Database['public']['Tables']['rfp_documents']['Row']
export type ProposalRow     = Database['public']['Tables']['proposals']['Row']
