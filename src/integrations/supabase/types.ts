export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      achievement_definitions: {
        Row: {
          achievement_key: string
          category: string
          created_at: string
          description: string
          icon: string
          id: string
          name: string
          points: number
          requirement_type: string
          requirement_value: number
        }
        Insert: {
          achievement_key: string
          category: string
          created_at?: string
          description: string
          icon: string
          id?: string
          name: string
          points?: number
          requirement_type: string
          requirement_value: number
        }
        Update: {
          achievement_key?: string
          category?: string
          created_at?: string
          description?: string
          icon?: string
          id?: string
          name?: string
          points?: number
          requirement_type?: string
          requirement_value?: number
        }
        Relationships: []
      }
      activity_log: {
        Row: {
          activity_type: string
          created_at: string
          id: string
          metadata: Json | null
          points_earned: number
          user_id: string
        }
        Insert: {
          activity_type: string
          created_at?: string
          id?: string
          metadata?: Json | null
          points_earned?: number
          user_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          points_earned?: number
          user_id?: string
        }
        Relationships: []
      }
      admin_settings: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          setting_key: string
          setting_value: Json
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      agency_client_relationships: {
        Row: {
          agency_org_id: string
          approved_at: string | null
          approved_by: string | null
          contract_terms: string | null
          created_at: string
          created_by: string | null
          employer_org_id: string
          end_date: string | null
          id: string
          notes: string | null
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          agency_org_id: string
          approved_at?: string | null
          approved_by?: string | null
          contract_terms?: string | null
          created_at?: string
          created_by?: string | null
          employer_org_id: string
          end_date?: string | null
          id?: string
          notes?: string | null
          start_date?: string
          status?: string
          updated_at?: string
        }
        Update: {
          agency_org_id?: string
          approved_at?: string | null
          approved_by?: string | null
          contract_terms?: string | null
          created_at?: string
          created_by?: string | null
          employer_org_id?: string
          end_date?: string | null
          id?: string
          notes?: string | null
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agency_client_relationships_agency_org_id_fkey"
            columns: ["agency_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_client_relationships_employer_org_id_fkey"
            columns: ["employer_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_tasks: {
        Row: {
          completed_at: string | null
          created_at: string | null
          error: string | null
          id: string
          input_json: Json | null
          org_id: string
          output_json: Json | null
          status: Database["public"]["Enums"]["task_status"] | null
          type: Database["public"]["Enums"]["task_type"]
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          error?: string | null
          id?: string
          input_json?: Json | null
          org_id: string
          output_json?: Json | null
          status?: Database["public"]["Enums"]["task_status"] | null
          type: Database["public"]["Enums"]["task_type"]
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          error?: string | null
          id?: string
          input_json?: Json | null
          org_id?: string
          output_json?: Json | null
          status?: Database["public"]["Enums"]["task_status"] | null
          type?: Database["public"]["Enums"]["task_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_tasks_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          content: string
          created_at: string | null
          created_by: string | null
          expires_at: string | null
          id: string
          published: boolean | null
          target_audience: string | null
          title: string
          type: string | null
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          published?: boolean | null
          target_audience?: string | null
          title: string
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          published?: boolean | null
          target_audience?: string | null
          title?: string
          type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      api_rate_limits: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          request_count: number
          user_id: string
          window_start: string
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: string
          request_count?: number
          user_id: string
          window_start?: string
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: string
          request_count?: number
          user_id?: string
          window_start?: string
        }
        Relationships: []
      }
      application_documents: {
        Row: {
          application_id: string
          content: string
          created_at: string | null
          document_type: string
          id: string
        }
        Insert: {
          application_id: string
          content: string
          created_at?: string | null
          document_type: string
          id?: string
        }
        Update: {
          application_id?: string
          content?: string
          created_at?: string | null
          document_type?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_documents_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "job_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      application_events: {
        Row: {
          application_id: string
          created_at: string | null
          event_date: string | null
          event_type: string
          id: string
          metadata: Json | null
        }
        Insert: {
          application_id: string
          created_at?: string | null
          event_date?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
        }
        Update: {
          application_id?: string
          created_at?: string | null
          event_date?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "application_events_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "job_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      application_metrics: {
        Row: {
          application_id: string
          created_at: string | null
          id: string
          interview_granted: boolean | null
          response_received: boolean | null
          resume_version_id: string | null
          time_to_response_hours: number | null
          updated_at: string | null
          views: number | null
        }
        Insert: {
          application_id: string
          created_at?: string | null
          id?: string
          interview_granted?: boolean | null
          response_received?: boolean | null
          resume_version_id?: string | null
          time_to_response_hours?: number | null
          updated_at?: string | null
          views?: number | null
        }
        Update: {
          application_id?: string
          created_at?: string | null
          id?: string
          interview_granted?: boolean | null
          response_received?: boolean | null
          resume_version_id?: string | null
          time_to_response_hours?: number | null
          updated_at?: string | null
          views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "application_metrics_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "job_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_metrics_resume_version_id_fkey"
            columns: ["resume_version_id"]
            isOneToOne: false
            referencedRelation: "resume_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      application_reminders: {
        Row: {
          application_id: string
          completed: boolean | null
          created_at: string | null
          id: string
          notes: string | null
          reminder_date: string
          reminder_type: string
        }
        Insert: {
          application_id: string
          completed?: boolean | null
          created_at?: string | null
          id?: string
          notes?: string | null
          reminder_date: string
          reminder_type: string
        }
        Update: {
          application_id?: string
          completed?: boolean | null
          created_at?: string | null
          id?: string
          notes?: string | null
          reminder_date?: string
          reminder_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_reminders_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "job_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          id: string
          meta_json: Json | null
          org_id: string | null
          target_id: string | null
          target_type: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          meta_json?: Json | null
          org_id?: string | null
          target_id?: string | null
          target_type?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          meta_json?: Json | null
          org_id?: string | null
          target_id?: string | null
          target_type?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_connections: {
        Row: {
          access_token: string
          created_at: string
          email: string
          id: string
          provider: string
          refresh_token: string | null
          token_expiry: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string
          email: string
          id?: string
          provider: string
          refresh_token?: string | null
          token_expiry?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string
          email?: string
          id?: string
          provider?: string
          refresh_token?: string | null
          token_expiry?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      candidate_availability: {
        Row: {
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          is_recurring: boolean
          notes: string | null
          profile_id: string
          specific_date: string | null
          start_time: string
          timezone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          is_recurring?: boolean
          notes?: string | null
          profile_id: string
          specific_date?: string | null
          start_time: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          is_recurring?: boolean
          notes?: string | null
          profile_id?: string
          specific_date?: string | null
          start_time?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidate_availability_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_availability_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_certifications: {
        Row: {
          certification_name: string
          created_at: string | null
          credential_id: string | null
          credential_url: string | null
          description: string | null
          expiry_date: string | null
          id: string
          issue_date: string | null
          issuing_organization: string
          profile_id: string
          updated_at: string | null
        }
        Insert: {
          certification_name: string
          created_at?: string | null
          credential_id?: string | null
          credential_url?: string | null
          description?: string | null
          expiry_date?: string | null
          id?: string
          issue_date?: string | null
          issuing_organization: string
          profile_id: string
          updated_at?: string | null
        }
        Update: {
          certification_name?: string
          created_at?: string | null
          credential_id?: string | null
          credential_url?: string | null
          description?: string | null
          expiry_date?: string | null
          id?: string
          issue_date?: string | null
          issuing_organization?: string
          profile_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candidate_certifications_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_certifications_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_communications: {
        Row: {
          application_id: string | null
          body: string
          clicked_at: string | null
          id: string
          opened_at: string | null
          recipient_email: string
          sent_at: string | null
          sent_by: string | null
          subject: string
          template_id: string | null
        }
        Insert: {
          application_id?: string | null
          body: string
          clicked_at?: string | null
          id?: string
          opened_at?: string | null
          recipient_email: string
          sent_at?: string | null
          sent_by?: string | null
          subject: string
          template_id?: string | null
        }
        Update: {
          application_id?: string | null
          body?: string
          clicked_at?: string | null
          id?: string
          opened_at?: string | null
          recipient_email?: string
          sent_at?: string | null
          sent_by?: string | null
          subject?: string
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candidate_communications_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "job_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_communications_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "message_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_profiles: {
        Row: {
          company_culture_preferences: string[] | null
          company_values: string[] | null
          created_at: string | null
          current_title: string | null
          employment_type_prefs:
            | Database["public"]["Enums"]["employment_type"][]
            | null
          expertise_areas: string[] | null
          headline: string | null
          id: string
          is_available_for_mentorship: boolean | null
          linkedin_url: string | null
          location: string | null
          mentor_bio: string | null
          mentor_pricing: string | null
          mentorship_capacity: number | null
          org_id: string
          profile_score: number | null
          resume_primary_id: string | null
          salary_range_max: number | null
          salary_range_min: number | null
          seniority: Database["public"]["Enums"]["seniority_level"] | null
          target_locations: string[] | null
          target_titles: string[] | null
          team_size_preference: string | null
          updated_at: string | null
          user_id: string
          video_intro_duration: number | null
          video_intro_url: string | null
          work_authorization: string[] | null
          work_environment_preference: string | null
          work_style_preferences: string[] | null
          years_experience: number | null
        }
        Insert: {
          company_culture_preferences?: string[] | null
          company_values?: string[] | null
          created_at?: string | null
          current_title?: string | null
          employment_type_prefs?:
            | Database["public"]["Enums"]["employment_type"][]
            | null
          expertise_areas?: string[] | null
          headline?: string | null
          id?: string
          is_available_for_mentorship?: boolean | null
          linkedin_url?: string | null
          location?: string | null
          mentor_bio?: string | null
          mentor_pricing?: string | null
          mentorship_capacity?: number | null
          org_id: string
          profile_score?: number | null
          resume_primary_id?: string | null
          salary_range_max?: number | null
          salary_range_min?: number | null
          seniority?: Database["public"]["Enums"]["seniority_level"] | null
          target_locations?: string[] | null
          target_titles?: string[] | null
          team_size_preference?: string | null
          updated_at?: string | null
          user_id: string
          video_intro_duration?: number | null
          video_intro_url?: string | null
          work_authorization?: string[] | null
          work_environment_preference?: string | null
          work_style_preferences?: string[] | null
          years_experience?: number | null
        }
        Update: {
          company_culture_preferences?: string[] | null
          company_values?: string[] | null
          created_at?: string | null
          current_title?: string | null
          employment_type_prefs?:
            | Database["public"]["Enums"]["employment_type"][]
            | null
          expertise_areas?: string[] | null
          headline?: string | null
          id?: string
          is_available_for_mentorship?: boolean | null
          linkedin_url?: string | null
          location?: string | null
          mentor_bio?: string | null
          mentor_pricing?: string | null
          mentorship_capacity?: number | null
          org_id?: string
          profile_score?: number | null
          resume_primary_id?: string | null
          salary_range_max?: number | null
          salary_range_min?: number | null
          seniority?: Database["public"]["Enums"]["seniority_level"] | null
          target_locations?: string[] | null
          target_titles?: string[] | null
          team_size_preference?: string | null
          updated_at?: string | null
          user_id?: string
          video_intro_duration?: number | null
          video_intro_url?: string | null
          work_authorization?: string[] | null
          work_environment_preference?: string | null
          work_style_preferences?: string[] | null
          years_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "candidate_profiles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_projects: {
        Row: {
          created_at: string | null
          description: string | null
          end_date: string | null
          github_url: string | null
          id: string
          image_url: string | null
          is_featured: boolean | null
          profile_id: string
          project_url: string | null
          start_date: string | null
          technologies: string[] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          github_url?: string | null
          id?: string
          image_url?: string | null
          is_featured?: boolean | null
          profile_id: string
          project_url?: string | null
          start_date?: string | null
          technologies?: string[] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          github_url?: string | null
          id?: string
          image_url?: string | null
          is_featured?: boolean | null
          profile_id?: string
          project_url?: string | null
          start_date?: string | null
          technologies?: string[] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candidate_projects_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_projects_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      career_goals: {
        Row: {
          category: string
          completed_at: string | null
          created_at: string | null
          description: string | null
          id: string
          milestones: Json | null
          profile_id: string
          progress: number | null
          status: string
          target_date: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          category: string
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          milestones?: Json | null
          profile_id: string
          progress?: number | null
          status?: string
          target_date?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          category?: string
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          milestones?: Json | null
          profile_id?: string
          progress?: number | null
          status?: string
          target_date?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "career_goals_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "career_goals_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      client_recruiter_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          created_at: string
          id: string
          recruiter_id: string
          relationship_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          created_at?: string
          id?: string
          recruiter_id: string
          relationship_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          created_at?: string
          id?: string
          recruiter_id?: string
          relationship_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_recruiter_assignments_recruiter_id_fkey"
            columns: ["recruiter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_recruiter_assignments_recruiter_id_fkey"
            columns: ["recruiter_id"]
            isOneToOne: false
            referencedRelation: "profiles_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_recruiter_assignments_relationship_id_fkey"
            columns: ["relationship_id"]
            isOneToOne: false
            referencedRelation: "agency_client_relationships"
            referencedColumns: ["id"]
          },
        ]
      }
      community_comment_likes: {
        Row: {
          comment_id: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_comment_likes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "community_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      community_comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          like_count: number | null
          parent_comment_id: string | null
          post_id: string
          profile_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          like_count?: number | null
          parent_comment_id?: string | null
          post_id: string
          profile_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          like_count?: number | null
          parent_comment_id?: string | null
          post_id?: string
          profile_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "community_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_comments_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_comments_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      community_post_likes: {
        Row: {
          created_at: string | null
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_posts: {
        Row: {
          category: string
          comment_count: number | null
          content: string
          created_at: string | null
          id: string
          is_locked: boolean | null
          is_pinned: boolean | null
          like_count: number | null
          profile_id: string
          tags: string[] | null
          title: string
          updated_at: string | null
          user_id: string
          view_count: number | null
        }
        Insert: {
          category: string
          comment_count?: number | null
          content: string
          created_at?: string | null
          id?: string
          is_locked?: boolean | null
          is_pinned?: boolean | null
          like_count?: number | null
          profile_id: string
          tags?: string[] | null
          title: string
          updated_at?: string | null
          user_id: string
          view_count?: number | null
        }
        Update: {
          category?: string
          comment_count?: number | null
          content?: string
          created_at?: string | null
          id?: string
          is_locked?: boolean | null
          is_pinned?: boolean | null
          like_count?: number | null
          profile_id?: string
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          user_id?: string
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "community_posts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_posts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      company_culture_data: {
        Row: {
          company_name: string
          created_at: string | null
          culture_scores: Json | null
          id: string
          last_updated: string | null
          review_summary: string | null
          total_reviews: number | null
        }
        Insert: {
          company_name: string
          created_at?: string | null
          culture_scores?: Json | null
          id?: string
          last_updated?: string | null
          review_summary?: string | null
          total_reviews?: number | null
        }
        Update: {
          company_name?: string
          created_at?: string | null
          culture_scores?: Json | null
          id?: string
          last_updated?: string | null
          review_summary?: string | null
          total_reviews?: number | null
        }
        Relationships: []
      }
      company_insight_votes: {
        Row: {
          created_at: string
          helpful: boolean
          id: string
          insight_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          helpful: boolean
          id?: string
          insight_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          helpful?: boolean
          id?: string
          insight_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_insight_votes_insight_id_fkey"
            columns: ["insight_id"]
            isOneToOne: false
            referencedRelation: "company_insights"
            referencedColumns: ["id"]
          },
        ]
      }
      company_insights: {
        Row: {
          company_name: string
          content: string
          created_at: string
          helpful_count: number | null
          id: string
          insight_type: string
          metadata: Json | null
          reported_count: number | null
          source_type: string | null
          submitted_by: string | null
          title: string
          updated_at: string
          verified: boolean | null
        }
        Insert: {
          company_name: string
          content: string
          created_at?: string
          helpful_count?: number | null
          id?: string
          insight_type: string
          metadata?: Json | null
          reported_count?: number | null
          source_type?: string | null
          submitted_by?: string | null
          title: string
          updated_at?: string
          verified?: boolean | null
        }
        Update: {
          company_name?: string
          content?: string
          created_at?: string
          helpful_count?: number | null
          id?: string
          insight_type?: string
          metadata?: Json | null
          reported_count?: number | null
          source_type?: string | null
          submitted_by?: string | null
          title?: string
          updated_at?: string
          verified?: boolean | null
        }
        Relationships: []
      }
      company_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          org_id: string
          role: Database["public"]["Enums"]["app_role"]
          team_id: string | null
          token: string
          updated_at: string | null
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          org_id: string
          role: Database["public"]["Enums"]["app_role"]
          team_id?: string | null
          token?: string
          updated_at?: string | null
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          org_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          team_id?: string | null
          token?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_invitations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_invitations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      company_review_votes: {
        Row: {
          created_at: string
          helpful: boolean
          id: string
          review_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          helpful: boolean
          id?: string
          review_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          helpful?: boolean
          id?: string
          review_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_review_votes_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "company_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      company_reviews: {
        Row: {
          advice_to_management: string | null
          anonymous: boolean | null
          company_name: string
          cons: string | null
          created_at: string
          employment_status: string | null
          helpful_count: number | null
          id: string
          job_title: string | null
          pros: string | null
          rating_career_growth: number | null
          rating_compensation: number | null
          rating_culture: number | null
          rating_management: number | null
          rating_overall: number
          rating_work_life: number | null
          reported_count: number | null
          submitted_by: string | null
          updated_at: string
          verified: boolean | null
          would_recommend: boolean | null
        }
        Insert: {
          advice_to_management?: string | null
          anonymous?: boolean | null
          company_name: string
          cons?: string | null
          created_at?: string
          employment_status?: string | null
          helpful_count?: number | null
          id?: string
          job_title?: string | null
          pros?: string | null
          rating_career_growth?: number | null
          rating_compensation?: number | null
          rating_culture?: number | null
          rating_management?: number | null
          rating_overall: number
          rating_work_life?: number | null
          reported_count?: number | null
          submitted_by?: string | null
          updated_at?: string
          verified?: boolean | null
          would_recommend?: boolean | null
        }
        Update: {
          advice_to_management?: string | null
          anonymous?: boolean | null
          company_name?: string
          cons?: string | null
          created_at?: string
          employment_status?: string | null
          helpful_count?: number | null
          id?: string
          job_title?: string | null
          pros?: string | null
          rating_career_growth?: number | null
          rating_compensation?: number | null
          rating_culture?: number | null
          rating_management?: number | null
          rating_overall?: number
          rating_work_life?: number | null
          reported_count?: number | null
          submitted_by?: string | null
          updated_at?: string
          verified?: boolean | null
          would_recommend?: boolean | null
        }
        Relationships: []
      }
      company_signup_requests: {
        Row: {
          company_name: string
          company_size: string | null
          company_type: Database["public"]["Enums"]["organization_type"]
          company_website: string | null
          created_at: string | null
          created_org_id: string | null
          id: string
          industry: string | null
          message: string | null
          rejection_reason: string | null
          requester_email: string
          requester_name: string
          requester_phone: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          company_name: string
          company_size?: string | null
          company_type: Database["public"]["Enums"]["organization_type"]
          company_website?: string | null
          created_at?: string | null
          created_org_id?: string | null
          id?: string
          industry?: string | null
          message?: string | null
          rejection_reason?: string | null
          requester_email: string
          requester_name: string
          requester_phone?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          company_name?: string
          company_size?: string | null
          company_type?: Database["public"]["Enums"]["organization_type"]
          company_website?: string | null
          created_at?: string | null
          created_org_id?: string | null
          id?: string
          industry?: string | null
          message?: string | null
          rejection_reason?: string | null
          requester_email?: string
          requester_name?: string
          requester_phone?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_signup_requests_created_org_id_fkey"
            columns: ["created_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      company_status_tracker: {
        Row: {
          affected_departments: string[] | null
          company_name: string
          created_at: string
          description: string | null
          employee_count_impact: number | null
          end_date: string | null
          id: string
          severity: string | null
          source_url: string | null
          start_date: string
          status_type: string
          submitted_by: string | null
          updated_at: string
          verified: boolean | null
        }
        Insert: {
          affected_departments?: string[] | null
          company_name: string
          created_at?: string
          description?: string | null
          employee_count_impact?: number | null
          end_date?: string | null
          id?: string
          severity?: string | null
          source_url?: string | null
          start_date: string
          status_type: string
          submitted_by?: string | null
          updated_at?: string
          verified?: boolean | null
        }
        Update: {
          affected_departments?: string[] | null
          company_name?: string
          created_at?: string
          description?: string | null
          employee_count_impact?: number | null
          end_date?: string | null
          id?: string
          severity?: string | null
          source_url?: string | null
          start_date?: string
          status_type?: string
          submitted_by?: string | null
          updated_at?: string
          verified?: boolean | null
        }
        Relationships: []
      }
      company_watchlist: {
        Row: {
          company_name: string
          created_at: string | null
          id: string
          notes: string | null
          notify_on_posting: boolean | null
          profile_id: string
        }
        Insert: {
          company_name: string
          created_at?: string | null
          id?: string
          notes?: string | null
          notify_on_posting?: boolean | null
          profile_id: string
        }
        Update: {
          company_name?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          notify_on_posting?: boolean | null
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_watchlist_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_watchlist_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      connection_job_matches: {
        Row: {
          connection_id: string
          contacted_at: string | null
          created_at: string | null
          id: string
          job_posting_id: string
          match_strength: number | null
          match_type: string
          notes: string | null
          outreach_status: string | null
          profile_id: string
          updated_at: string | null
        }
        Insert: {
          connection_id: string
          contacted_at?: string | null
          created_at?: string | null
          id?: string
          job_posting_id: string
          match_strength?: number | null
          match_type: string
          notes?: string | null
          outreach_status?: string | null
          profile_id: string
          updated_at?: string | null
        }
        Update: {
          connection_id?: string
          contacted_at?: string | null
          created_at?: string | null
          id?: string
          job_posting_id?: string
          match_strength?: number | null
          match_type?: string
          notes?: string | null
          outreach_status?: string | null
          profile_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "connection_job_matches_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "linkedin_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "connection_job_matches_job_posting_id_fkey"
            columns: ["job_posting_id"]
            isOneToOne: false
            referencedRelation: "job_postings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "connection_job_matches_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "connection_job_matches_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      connection_requests: {
        Row: {
          created_at: string
          employee_network_id: string
          id: string
          message: string
          requester_profile_id: string
          responded_at: string | null
          response_message: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          employee_network_id: string
          id?: string
          message: string
          requester_profile_id: string
          responded_at?: string | null
          response_message?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          employee_network_id?: string
          id?: string
          message?: string
          requester_profile_id?: string
          responded_at?: string | null
          response_message?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "connection_requests_employee_network_id_fkey"
            columns: ["employee_network_id"]
            isOneToOne: false
            referencedRelation: "employee_network"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "connection_requests_requester_profile_id_fkey"
            columns: ["requester_profile_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "connection_requests_requester_profile_id_fkey"
            columns: ["requester_profile_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_ratings: {
        Row: {
          conversation_id: string | null
          created_at: string | null
          feedback: string | null
          id: string
          rating: number | null
          user_id: string | null
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string | null
          feedback?: string | null
          id?: string
          rating?: number | null
          user_id?: string | null
        }
        Update: {
          conversation_id?: string | null
          created_at?: string | null
          feedback?: string | null
          id?: string
          rating?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversation_ratings_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string | null
          id: string
          org_id: string
          title: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          org_id: string
          title?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          org_id?: string
          title?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          created_at: string | null
          estimated_hours: number | null
          id: string
          provider: string
          tags: string[] | null
          title: string
          url: string | null
        }
        Insert: {
          created_at?: string | null
          estimated_hours?: number | null
          id?: string
          provider: string
          tags?: string[] | null
          title: string
          url?: string | null
        }
        Update: {
          created_at?: string | null
          estimated_hours?: number | null
          id?: string
          provider?: string
          tags?: string[] | null
          title?: string
          url?: string | null
        }
        Relationships: []
      }
      email_signatures: {
        Row: {
          company: string | null
          created_at: string
          custom_html: string | null
          disclaimer: string | null
          email: string | null
          full_name: string
          id: string
          is_active: boolean | null
          is_default: boolean | null
          logo_url: string | null
          name: string
          phone: string | null
          social_links: Json | null
          title: string | null
          updated_at: string
          user_id: string
          website: string | null
        }
        Insert: {
          company?: string | null
          created_at?: string
          custom_html?: string | null
          disclaimer?: string | null
          email?: string | null
          full_name: string
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          logo_url?: string | null
          name: string
          phone?: string | null
          social_links?: Json | null
          title?: string | null
          updated_at?: string
          user_id: string
          website?: string | null
        }
        Update: {
          company?: string | null
          created_at?: string
          custom_html?: string | null
          disclaimer?: string | null
          email?: string | null
          full_name?: string
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          logo_url?: string | null
          name?: string
          phone?: string | null
          social_links?: Json | null
          title?: string | null
          updated_at?: string
          user_id?: string
          website?: string | null
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          created_at: string
          created_by: string | null
          html_content: string
          id: string
          is_active: boolean
          org_id: string
          subject: string
          template_type: string
          updated_at: string
          variables: Json | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          html_content: string
          id?: string
          is_active?: boolean
          org_id: string
          subject: string
          template_type: string
          updated_at?: string
          variables?: Json | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          html_content?: string
          id?: string
          is_active?: boolean
          org_id?: string
          subject?: string
          template_type?: string
          updated_at?: string
          variables?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "email_templates_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      embeddings: {
        Row: {
          created_at: string | null
          dims: number | null
          id: string
          org_id: string
          owner_id: string
          owner_type: string
          vector: string | null
        }
        Insert: {
          created_at?: string | null
          dims?: number | null
          id?: string
          org_id: string
          owner_id: string
          owner_type: string
          vector?: string | null
        }
        Update: {
          created_at?: string | null
          dims?: number | null
          id?: string
          org_id?: string
          owner_id?: string
          owner_type?: string
          vector?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "embeddings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_network: {
        Row: {
          availability_status: string | null
          bio: string | null
          can_provide_referral: boolean | null
          company_name: string
          contact_preference: string | null
          created_at: string
          department: string | null
          id: string
          job_title: string | null
          linkedin_url: string | null
          profile_id: string
          response_rate: number | null
          specialties: string[] | null
          updated_at: string
          willing_to_chat: boolean | null
          years_at_company: number | null
        }
        Insert: {
          availability_status?: string | null
          bio?: string | null
          can_provide_referral?: boolean | null
          company_name: string
          contact_preference?: string | null
          created_at?: string
          department?: string | null
          id?: string
          job_title?: string | null
          linkedin_url?: string | null
          profile_id: string
          response_rate?: number | null
          specialties?: string[] | null
          updated_at?: string
          willing_to_chat?: boolean | null
          years_at_company?: number | null
        }
        Update: {
          availability_status?: string | null
          bio?: string | null
          can_provide_referral?: boolean | null
          company_name?: string
          contact_preference?: string | null
          created_at?: string
          department?: string | null
          id?: string
          job_title?: string | null
          linkedin_url?: string | null
          profile_id?: string
          response_rate?: number | null
          specialties?: string[] | null
          updated_at?: string
          willing_to_chat?: boolean | null
          years_at_company?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_network_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_network_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      event_analytics: {
        Row: {
          created_at: string
          event_category: string | null
          event_title: string
          event_url: string
          id: string
          interaction_type: string
          source_url: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_category?: string | null
          event_title: string
          event_url: string
          id?: string
          interaction_type: string
          source_url?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_category?: string | null
          event_title?: string
          event_url?: string
          id?: string
          interaction_type?: string
          source_url?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      event_cache: {
        Row: {
          created_at: string
          id: string
          markdown_content: string
          metadata: Json | null
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          markdown_content: string
          metadata?: Json | null
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          markdown_content?: string
          metadata?: Json | null
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      favorite_events: {
        Row: {
          created_at: string
          event_date: string | null
          event_description: string | null
          event_location: string | null
          event_title: string
          event_url: string
          id: string
          source_url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_date?: string | null
          event_description?: string | null
          event_location?: string | null
          event_title: string
          event_url: string
          id?: string
          source_url: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_date?: string | null
          event_description?: string | null
          event_location?: string | null
          event_title?: string
          event_url?: string
          id?: string
          source_url?: string
          user_id?: string
        }
        Relationships: []
      }
      feature_flags: {
        Row: {
          created_at: string | null
          description: string | null
          enabled: boolean | null
          flag_name: string
          id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          enabled?: boolean | null
          flag_name: string
          id?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          enabled?: boolean | null
          flag_name?: string
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      follow_up_emails: {
        Row: {
          application_id: string
          body: string
          created_at: string
          id: string
          sent_at: string | null
          status: string
          subject: string
          suggestion_id: string | null
          tone: string | null
          updated_at: string
        }
        Insert: {
          application_id: string
          body: string
          created_at?: string
          id?: string
          sent_at?: string | null
          status?: string
          subject: string
          suggestion_id?: string | null
          tone?: string | null
          updated_at?: string
        }
        Update: {
          application_id?: string
          body?: string
          created_at?: string
          id?: string
          sent_at?: string | null
          status?: string
          subject?: string
          suggestion_id?: string | null
          tone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "follow_up_emails_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "job_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_up_emails_suggestion_id_fkey"
            columns: ["suggestion_id"]
            isOneToOne: false
            referencedRelation: "follow_up_suggestions"
            referencedColumns: ["id"]
          },
        ]
      }
      follow_up_suggestions: {
        Row: {
          application_id: string
          completed_at: string | null
          created_at: string
          follow_up_type: string
          id: string
          priority: string
          reason: string | null
          snoozed_until: string | null
          status: string
          suggested_date: string
          updated_at: string
        }
        Insert: {
          application_id: string
          completed_at?: string | null
          created_at?: string
          follow_up_type: string
          id?: string
          priority?: string
          reason?: string | null
          snoozed_until?: string | null
          status?: string
          suggested_date: string
          updated_at?: string
        }
        Update: {
          application_id?: string
          completed_at?: string | null
          created_at?: string
          follow_up_type?: string
          id?: string
          priority?: string
          reason?: string | null
          snoozed_until?: string | null
          status?: string
          suggested_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "follow_up_suggestions_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "job_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_answers: {
        Row: {
          answer_text: string
          created_at: string | null
          helpful_count: number | null
          id: string
          question_id: string
          submitted_by: string | null
          updated_at: string | null
          upvotes: number | null
        }
        Insert: {
          answer_text: string
          created_at?: string | null
          helpful_count?: number | null
          id?: string
          question_id: string
          submitted_by?: string | null
          updated_at?: string | null
          upvotes?: number | null
        }
        Update: {
          answer_text?: string
          created_at?: string | null
          helpful_count?: number | null
          id?: string
          question_id?: string
          submitted_by?: string | null
          updated_at?: string | null
          upvotes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "interview_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "interview_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_feedback: {
        Row: {
          additional_notes: string | null
          areas_for_improvement: string | null
          created_at: string
          id: string
          interview_id: string
          rating_communication: number | null
          rating_culture_fit: number | null
          rating_overall: number
          rating_problem_solving: number | null
          rating_technical: number | null
          recommendation: string
          strengths: string | null
          submitted_by: string
          updated_at: string
        }
        Insert: {
          additional_notes?: string | null
          areas_for_improvement?: string | null
          created_at?: string
          id?: string
          interview_id: string
          rating_communication?: number | null
          rating_culture_fit?: number | null
          rating_overall: number
          rating_problem_solving?: number | null
          rating_technical?: number | null
          recommendation: string
          strengths?: string | null
          submitted_by: string
          updated_at?: string
        }
        Update: {
          additional_notes?: string | null
          areas_for_improvement?: string | null
          created_at?: string
          id?: string
          interview_id?: string
          rating_communication?: number | null
          rating_culture_fit?: number | null
          rating_overall?: number
          rating_problem_solving?: number | null
          rating_technical?: number | null
          recommendation?: string
          strengths?: string | null
          submitted_by?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "interview_feedback_interview_id_fkey"
            columns: ["interview_id"]
            isOneToOne: false
            referencedRelation: "interviews"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_prep: {
        Row: {
          application_id: string
          company_research: Json | null
          created_at: string | null
          id: string
          interview_date: string | null
          preparation_notes: string | null
          questions: Json | null
          updated_at: string | null
        }
        Insert: {
          application_id: string
          company_research?: Json | null
          created_at?: string | null
          id?: string
          interview_date?: string | null
          preparation_notes?: string | null
          questions?: Json | null
          updated_at?: string | null
        }
        Update: {
          application_id?: string
          company_research?: Json | null
          created_at?: string | null
          id?: string
          interview_date?: string | null
          preparation_notes?: string | null
          questions?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "interview_prep_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "job_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_questions: {
        Row: {
          category: string | null
          company: string | null
          created_at: string | null
          difficulty: string | null
          id: string
          job_role: string
          question: string
          submitted_by: string | null
          updated_at: string | null
          upvotes: number | null
          verified: boolean | null
        }
        Insert: {
          category?: string | null
          company?: string | null
          created_at?: string | null
          difficulty?: string | null
          id?: string
          job_role: string
          question: string
          submitted_by?: string | null
          updated_at?: string | null
          upvotes?: number | null
          verified?: boolean | null
        }
        Update: {
          category?: string | null
          company?: string | null
          created_at?: string | null
          difficulty?: string | null
          id?: string
          job_role?: string
          question?: string
          submitted_by?: string | null
          updated_at?: string | null
          upvotes?: number | null
          verified?: boolean | null
        }
        Relationships: []
      }
      interview_schedules: {
        Row: {
          application_id: string | null
          completed_at: string | null
          created_at: string
          duration_minutes: number
          feedback: string | null
          id: string
          interview_type: string
          interviewer_email: string | null
          interviewer_name: string | null
          location: string | null
          notes: string | null
          preparation_checklist: Json | null
          profile_id: string
          reminder_sent: boolean | null
          scheduled_at: string
          status: string
          timezone: string
          updated_at: string
        }
        Insert: {
          application_id?: string | null
          completed_at?: string | null
          created_at?: string
          duration_minutes?: number
          feedback?: string | null
          id?: string
          interview_type: string
          interviewer_email?: string | null
          interviewer_name?: string | null
          location?: string | null
          notes?: string | null
          preparation_checklist?: Json | null
          profile_id: string
          reminder_sent?: boolean | null
          scheduled_at: string
          status?: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          application_id?: string | null
          completed_at?: string | null
          created_at?: string
          duration_minutes?: number
          feedback?: string | null
          id?: string
          interview_type?: string
          interviewer_email?: string | null
          interviewer_name?: string | null
          location?: string | null
          notes?: string | null
          preparation_checklist?: Json | null
          profile_id?: string
          reminder_sent?: boolean | null
          scheduled_at?: string
          status?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "interview_schedules_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "job_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_schedules_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_schedules_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      interviews: {
        Row: {
          application_id: string
          completed_at: string | null
          created_at: string
          duration_minutes: number | null
          id: string
          interview_type: string
          interviewer_email: string | null
          interviewer_name: string | null
          location: string | null
          meeting_link: string | null
          notes: string | null
          scheduled_at: string
          status: string
          updated_at: string
        }
        Insert: {
          application_id: string
          completed_at?: string | null
          created_at?: string
          duration_minutes?: number | null
          id?: string
          interview_type: string
          interviewer_email?: string | null
          interviewer_name?: string | null
          location?: string | null
          meeting_link?: string | null
          notes?: string | null
          scheduled_at: string
          status?: string
          updated_at?: string
        }
        Update: {
          application_id?: string
          completed_at?: string | null
          created_at?: string
          duration_minutes?: number | null
          id?: string
          interview_type?: string
          interviewer_email?: string | null
          interviewer_name?: string | null
          location?: string | null
          meeting_link?: string | null
          notes?: string | null
          scheduled_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "interviews_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "job_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      invitation_audit_log: {
        Row: {
          action: string
          created_at: string
          id: string
          invitation_id: string
          metadata: Json | null
          new_values: Json | null
          old_values: Json | null
          performed_by: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          invitation_id: string
          metadata?: Json | null
          new_values?: Json | null
          old_values?: Json | null
          performed_by?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          invitation_id?: string
          metadata?: Json | null
          new_values?: Json | null
          old_values?: Json | null
          performed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invitation_audit_log_invitation_id_fkey"
            columns: ["invitation_id"]
            isOneToOne: false
            referencedRelation: "company_invitations"
            referencedColumns: ["id"]
          },
        ]
      }
      job_alerts: {
        Row: {
          alert_name: string
          created_at: string
          enabled: boolean
          filters: Json
          frequency: string
          id: string
          last_sent_at: string | null
          profile_id: string
          updated_at: string
        }
        Insert: {
          alert_name: string
          created_at?: string
          enabled?: boolean
          filters?: Json
          frequency?: string
          id?: string
          last_sent_at?: string | null
          profile_id: string
          updated_at?: string
        }
        Update: {
          alert_name?: string
          created_at?: string
          enabled?: boolean
          filters?: Json
          frequency?: string
          id?: string
          last_sent_at?: string | null
          profile_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_alerts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_alerts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      job_applications: {
        Row: {
          applied_at: string | null
          company: string
          created_at: string | null
          deleted_at: string | null
          id: string
          job_posting_id: string | null
          job_title: string
          notes: string | null
          profile_id: string
          status: Database["public"]["Enums"]["application_status"] | null
          team_id: string | null
          updated_at: string | null
        }
        Insert: {
          applied_at?: string | null
          company: string
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          job_posting_id?: string | null
          job_title: string
          notes?: string | null
          profile_id: string
          status?: Database["public"]["Enums"]["application_status"] | null
          team_id?: string | null
          updated_at?: string | null
        }
        Update: {
          applied_at?: string | null
          company?: string
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          job_posting_id?: string | null
          job_title?: string
          notes?: string | null
          profile_id?: string
          status?: Database["public"]["Enums"]["application_status"] | null
          team_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_applications_job_posting_id_fkey"
            columns: ["job_posting_id"]
            isOneToOne: false
            referencedRelation: "job_postings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_applications_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_applications_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_applications_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      job_matches: {
        Row: {
          created_at: string | null
          id: string
          job_posting_id: string
          match_score: number | null
          profile_id: string
          reasons: string[] | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          job_posting_id: string
          match_score?: number | null
          profile_id: string
          reasons?: string[] | null
        }
        Update: {
          created_at?: string | null
          id?: string
          job_posting_id?: string
          match_score?: number | null
          profile_id?: string
          reasons?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "job_matches_job_posting_id_fkey"
            columns: ["job_posting_id"]
            isOneToOne: false
            referencedRelation: "job_postings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_matches_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_matches_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      job_postings: {
        Row: {
          company: string
          created_at: string | null
          description: string | null
          employer_org_id: string | null
          external_id: string | null
          id: string
          location: string | null
          org_id: string
          posted_by_agency: boolean | null
          posted_date: string | null
          posting_org_id: string | null
          remote: boolean | null
          salary_max: number | null
          salary_min: number | null
          seniority: Database["public"]["Enums"]["seniority_level"] | null
          skills_extracted: string[] | null
          source: string | null
          team_id: string | null
          title: string
          updated_at: string | null
          url: string | null
        }
        Insert: {
          company: string
          created_at?: string | null
          description?: string | null
          employer_org_id?: string | null
          external_id?: string | null
          id?: string
          location?: string | null
          org_id: string
          posted_by_agency?: boolean | null
          posted_date?: string | null
          posting_org_id?: string | null
          remote?: boolean | null
          salary_max?: number | null
          salary_min?: number | null
          seniority?: Database["public"]["Enums"]["seniority_level"] | null
          skills_extracted?: string[] | null
          source?: string | null
          team_id?: string | null
          title: string
          updated_at?: string | null
          url?: string | null
        }
        Update: {
          company?: string
          created_at?: string | null
          description?: string | null
          employer_org_id?: string | null
          external_id?: string | null
          id?: string
          location?: string | null
          org_id?: string
          posted_by_agency?: boolean | null
          posted_date?: string | null
          posting_org_id?: string | null
          remote?: boolean | null
          salary_max?: number | null
          salary_min?: number | null
          seniority?: Database["public"]["Enums"]["seniority_level"] | null
          skills_extracted?: string[] | null
          source?: string | null
          team_id?: string | null
          title?: string
          updated_at?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_postings_employer_org_id_fkey"
            columns: ["employer_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_postings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_postings_posting_org_id_fkey"
            columns: ["posting_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_postings_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      job_targets: {
        Row: {
          created_at: string | null
          geo: string[] | null
          id: string
          keywords: string[] | null
          must_have_skills: string[] | null
          nice_to_have_skills: string[] | null
          profile_id: string
          remote_ok: boolean | null
          role_name: string
          salary_target: number | null
          seniority: Database["public"]["Enums"]["seniority_level"] | null
        }
        Insert: {
          created_at?: string | null
          geo?: string[] | null
          id?: string
          keywords?: string[] | null
          must_have_skills?: string[] | null
          nice_to_have_skills?: string[] | null
          profile_id: string
          remote_ok?: boolean | null
          role_name: string
          salary_target?: number | null
          seniority?: Database["public"]["Enums"]["seniority_level"] | null
        }
        Update: {
          created_at?: string | null
          geo?: string[] | null
          id?: string
          keywords?: string[] | null
          must_have_skills?: string[] | null
          nice_to_have_skills?: string[] | null
          profile_id?: string
          remote_ok?: boolean | null
          role_name?: string
          salary_target?: number | null
          seniority?: Database["public"]["Enums"]["seniority_level"] | null
        }
        Relationships: [
          {
            foreignKeyName: "job_targets_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_targets_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      leaderboard_cohorts: {
        Row: {
          cohort_type: string
          created_at: string
          criteria: Json
          description: string | null
          id: string
          name: string
        }
        Insert: {
          cohort_type: string
          created_at?: string
          criteria?: Json
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          cohort_type?: string
          created_at?: string
          criteria?: Json
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      learning_activity_log: {
        Row: {
          activity_type: string
          course_id: string | null
          created_at: string | null
          duration_minutes: number | null
          id: string
          learning_path_id: string | null
          notes: string | null
          profile_id: string
        }
        Insert: {
          activity_type: string
          course_id?: string | null
          created_at?: string | null
          duration_minutes?: number | null
          id?: string
          learning_path_id?: string | null
          notes?: string | null
          profile_id: string
        }
        Update: {
          activity_type?: string
          course_id?: string | null
          created_at?: string | null
          duration_minutes?: number | null
          id?: string
          learning_path_id?: string | null
          notes?: string | null
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_activity_log_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "learning_path_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_activity_log_learning_path_id_fkey"
            columns: ["learning_path_id"]
            isOneToOne: false
            referencedRelation: "learning_paths"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_activity_log_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_activity_log_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_badges: {
        Row: {
          badge_key: string
          category: string
          created_at: string | null
          description: string
          icon: string
          id: string
          name: string
          points: number | null
          requirement_type: string
          requirement_value: number
          tier: string
        }
        Insert: {
          badge_key: string
          category: string
          created_at?: string | null
          description: string
          icon: string
          id?: string
          name: string
          points?: number | null
          requirement_type: string
          requirement_value: number
          tier: string
        }
        Update: {
          badge_key?: string
          category?: string
          created_at?: string | null
          description?: string
          icon?: string
          id?: string
          name?: string
          points?: number | null
          requirement_type?: string
          requirement_value?: number
          tier?: string
        }
        Relationships: []
      }
      learning_path_courses: {
        Row: {
          completed: boolean | null
          completed_at: string | null
          course_id: string | null
          created_at: string | null
          difficulty: string | null
          estimated_hours: number | null
          id: string
          is_free: boolean | null
          last_accessed_at: string | null
          learning_path_id: string
          notes: string | null
          order_index: number
          provider: string | null
          time_spent_minutes: number | null
          title: string | null
          url: string | null
        }
        Insert: {
          completed?: boolean | null
          completed_at?: string | null
          course_id?: string | null
          created_at?: string | null
          difficulty?: string | null
          estimated_hours?: number | null
          id?: string
          is_free?: boolean | null
          last_accessed_at?: string | null
          learning_path_id: string
          notes?: string | null
          order_index?: number
          provider?: string | null
          time_spent_minutes?: number | null
          title?: string | null
          url?: string | null
        }
        Update: {
          completed?: boolean | null
          completed_at?: string | null
          course_id?: string | null
          created_at?: string | null
          difficulty?: string | null
          estimated_hours?: number | null
          id?: string
          is_free?: boolean | null
          last_accessed_at?: string | null
          learning_path_id?: string
          notes?: string | null
          order_index?: number
          provider?: string | null
          time_spent_minutes?: number | null
          title?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "learning_path_courses_learning_path_id_fkey"
            columns: ["learning_path_id"]
            isOneToOne: false
            referencedRelation: "learning_paths"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_paths: {
        Row: {
          completed_at: string | null
          completion_percentage: number | null
          created_at: string | null
          description: string | null
          estimated_hours: number | null
          id: string
          profile_id: string
          progress: number | null
          skill_gap_id: string | null
          skill_mastery_score: number | null
          started_at: string | null
          status: string
          title: string
          total_time_spent_minutes: number | null
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          completion_percentage?: number | null
          created_at?: string | null
          description?: string | null
          estimated_hours?: number | null
          id?: string
          profile_id: string
          progress?: number | null
          skill_gap_id?: string | null
          skill_mastery_score?: number | null
          started_at?: string | null
          status?: string
          title: string
          total_time_spent_minutes?: number | null
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          completion_percentage?: number | null
          created_at?: string | null
          description?: string | null
          estimated_hours?: number | null
          id?: string
          profile_id?: string
          progress?: number | null
          skill_gap_id?: string | null
          skill_mastery_score?: number | null
          started_at?: string | null
          status?: string
          title?: string
          total_time_spent_minutes?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "learning_paths_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_paths_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_paths_skill_gap_id_fkey"
            columns: ["skill_gap_id"]
            isOneToOne: false
            referencedRelation: "skill_gaps"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_streaks: {
        Row: {
          created_at: string | null
          current_streak: number | null
          id: string
          last_activity_date: string | null
          longest_streak: number | null
          profile_id: string
          total_learning_days: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          current_streak?: number | null
          id?: string
          last_activity_date?: string | null
          longest_streak?: number | null
          profile_id: string
          total_learning_days?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          current_streak?: number | null
          id?: string
          last_activity_date?: string | null
          longest_streak?: number | null
          profile_id?: string
          total_learning_days?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "learning_streaks_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "candidate_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_streaks_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "candidate_profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      linkedin_connections: {
        Row: {
          avatar_url: string | null
          connection_degree: number
          created_at: string | null
          current_company: string | null
          current_title: string | null
          full_name: string
          headline: string | null
          id: string
          last_synced_at: string | null
          linkedin_id: string
          location: string | null
          mutual_connections: number | null
          profile_id: string
          profile_url: string | null
        }
        Insert: {
          avatar_url?: string | null
          connection_degree?: number
          created_at?: string | null
          current_company?: string | null
          current_title?: string | null
          full_name: string
          headline?: string | null
          id?: string
          last_synced_at?: string | null
          linkedin_id: string
          location?: string | null
          mutual_connections?: number | null
          profile_id: string
          profile_url?: string | null
        }
        Update: {
          avatar_url?: string | null
          connection_degree?: number
          created_at?: string | null
          current_company?: string | null
          current_title?: string | null
          full_name?: string
          headline?: string | null
          id?: string
          last_synced_at?: string | null
          linkedin_id?: string
          location?: string | null
          mutual_connections?: number | null
          profile_id?: string
          profile_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "linkedin_connections_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "linkedin_connections_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      linkedin_optimization_suggestions: {
        Row: {
          created_at: string
          generated_at: string
          id: string
          overall_score: number | null
          profile_id: string
          suggestions: Json
        }
        Insert: {
          created_at?: string
          generated_at?: string
          id?: string
          overall_score?: number | null
          profile_id: string
          suggestions: Json
        }
        Update: {
          created_at?: string
          generated_at?: string
          id?: string
          overall_score?: number | null
          profile_id?: string
          suggestions?: Json
        }
        Relationships: [
          {
            foreignKeyName: "linkedin_optimization_suggestions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "linkedin_optimization_suggestions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      linkedin_snapshots: {
        Row: {
          created_at: string | null
          critique_json: Json | null
          id: string
          org_id: string
          parsed_json: Json | null
          profile_id: string | null
          profile_url: string | null
          raw_text: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          critique_json?: Json | null
          id?: string
          org_id: string
          parsed_json?: Json | null
          profile_id?: string | null
          profile_url?: string | null
          raw_text?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          critique_json?: Json | null
          id?: string
          org_id?: string
          parsed_json?: Json | null
          profile_id?: string | null
          profile_url?: string | null
          raw_text?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "linkedin_snapshots_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "linkedin_snapshots_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "linkedin_snapshots_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      match_generation_queue: {
        Row: {
          created_at: string | null
          id: string
          job_posting_id: string | null
          processed_at: string | null
          profile_id: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          job_posting_id?: string | null
          processed_at?: string | null
          profile_id?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          job_posting_id?: string | null
          processed_at?: string | null
          profile_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "match_generation_queue_job_posting_id_fkey"
            columns: ["job_posting_id"]
            isOneToOne: false
            referencedRelation: "job_postings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_generation_queue_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_generation_queue_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      mentor_analytics: {
        Row: {
          articles_published: number | null
          average_rating: number | null
          badges_earned: number | null
          id: string
          mentor_id: string
          resources_shared: number | null
          successful_referrals: number | null
          total_hours: number | null
          total_mentees: number | null
          total_referrals: number | null
          total_reviews: number | null
          total_sessions: number | null
          updated_at: string | null
        }
        Insert: {
          articles_published?: number | null
          average_rating?: number | null
          badges_earned?: number | null
          id?: string
          mentor_id: string
          resources_shared?: number | null
          successful_referrals?: number | null
          total_hours?: number | null
          total_mentees?: number | null
          total_referrals?: number | null
          total_reviews?: number | null
          total_sessions?: number | null
          updated_at?: string | null
        }
        Update: {
          articles_published?: number | null
          average_rating?: number | null
          badges_earned?: number | null
          id?: string
          mentor_id?: string
          resources_shared?: number | null
          successful_referrals?: number | null
          total_hours?: number | null
          total_mentees?: number | null
          total_referrals?: number | null
          total_reviews?: number | null
          total_sessions?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      mentor_articles: {
        Row: {
          content: string
          cover_image_url: string | null
          created_at: string | null
          excerpt: string | null
          id: string
          like_count: number | null
          mentor_id: string
          published: boolean | null
          published_at: string | null
          tags: string[] | null
          title: string
          updated_at: string | null
          view_count: number | null
        }
        Insert: {
          content: string
          cover_image_url?: string | null
          created_at?: string | null
          excerpt?: string | null
          id?: string
          like_count?: number | null
          mentor_id: string
          published?: boolean | null
          published_at?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
          view_count?: number | null
        }
        Update: {
          content?: string
          cover_image_url?: string | null
          created_at?: string | null
          excerpt?: string | null
          id?: string
          like_count?: number | null
          mentor_id?: string
          published?: boolean | null
          published_at?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          view_count?: number | null
        }
        Relationships: []
      }
      mentor_availability_slots: {
        Row: {
          created_at: string | null
          day_of_week: number
          end_time: string
          id: string
          is_booked: boolean | null
          is_recurring: boolean | null
          mentor_id: string
          specific_date: string | null
          start_time: string
          timezone: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          day_of_week: number
          end_time: string
          id?: string
          is_booked?: boolean | null
          is_recurring?: boolean | null
          mentor_id: string
          specific_date?: string | null
          start_time: string
          timezone?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          day_of_week?: number
          end_time?: string
          id?: string
          is_booked?: boolean | null
          is_recurring?: boolean | null
          mentor_id?: string
          specific_date?: string | null
          start_time?: string
          timezone?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      mentor_badges: {
        Row: {
          badge_name: string
          badge_type: string
          description: string | null
          earned_at: string | null
          icon: string | null
          id: string
          mentor_id: string
          metadata: Json | null
        }
        Insert: {
          badge_name: string
          badge_type: string
          description?: string | null
          earned_at?: string | null
          icon?: string | null
          id?: string
          mentor_id: string
          metadata?: Json | null
        }
        Update: {
          badge_name?: string
          badge_type?: string
          description?: string | null
          earned_at?: string | null
          icon?: string | null
          id?: string
          mentor_id?: string
          metadata?: Json | null
        }
        Relationships: []
      }
      mentor_network_connections: {
        Row: {
          connection_company: string | null
          connection_email: string | null
          connection_linkedin: string | null
          connection_name: string
          connection_title: string | null
          created_at: string | null
          id: string
          introduced_at: string | null
          introduction_notes: string | null
          introduction_status: string | null
          mentee_id: string
          mentor_id: string
        }
        Insert: {
          connection_company?: string | null
          connection_email?: string | null
          connection_linkedin?: string | null
          connection_name: string
          connection_title?: string | null
          created_at?: string | null
          id?: string
          introduced_at?: string | null
          introduction_notes?: string | null
          introduction_status?: string | null
          mentee_id: string
          mentor_id: string
        }
        Update: {
          connection_company?: string | null
          connection_email?: string | null
          connection_linkedin?: string | null
          connection_name?: string
          connection_title?: string | null
          created_at?: string | null
          id?: string
          introduced_at?: string | null
          introduction_notes?: string | null
          introduction_status?: string | null
          mentee_id?: string
          mentor_id?: string
        }
        Relationships: []
      }
      mentor_referrals: {
        Row: {
          company_name: string
          created_at: string | null
          id: string
          job_posting_id: string | null
          job_title: string
          mentee_id: string
          mentor_id: string
          referral_notes: string | null
          referral_status: string | null
          submitted_at: string | null
          updated_at: string | null
        }
        Insert: {
          company_name: string
          created_at?: string | null
          id?: string
          job_posting_id?: string | null
          job_title: string
          mentee_id: string
          mentor_id: string
          referral_notes?: string | null
          referral_status?: string | null
          submitted_at?: string | null
          updated_at?: string | null
        }
        Update: {
          company_name?: string
          created_at?: string | null
          id?: string
          job_posting_id?: string | null
          job_title?: string
          mentee_id?: string
          mentor_id?: string
          referral_notes?: string | null
          referral_status?: string | null
          submitted_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mentor_referrals_job_posting_id_fkey"
            columns: ["job_posting_id"]
            isOneToOne: false
            referencedRelation: "job_postings"
            referencedColumns: ["id"]
          },
        ]
      }
      mentor_resources: {
        Row: {
          content_url: string | null
          created_at: string | null
          description: string | null
          download_count: number | null
          file_path: string | null
          id: string
          is_public: boolean | null
          mentor_id: string
          resource_type: string
          tags: string[] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          content_url?: string | null
          created_at?: string | null
          description?: string | null
          download_count?: number | null
          file_path?: string | null
          id?: string
          is_public?: boolean | null
          mentor_id: string
          resource_type: string
          tags?: string[] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          content_url?: string | null
          created_at?: string | null
          description?: string | null
          download_count?: number | null
          file_path?: string | null
          id?: string
          is_public?: boolean | null
          mentor_id?: string
          resource_type?: string
          tags?: string[] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      mentor_reviews: {
        Row: {
          created_at: string | null
          helpful_count: number | null
          id: string
          mentee_id: string
          mentor_id: string
          rating: number
          review_text: string | null
          session_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          helpful_count?: number | null
          id?: string
          mentee_id: string
          mentor_id: string
          rating: number
          review_text?: string | null
          session_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          helpful_count?: number | null
          id?: string
          mentee_id?: string
          mentor_id?: string
          rating?: number
          review_text?: string | null
          session_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mentor_reviews_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "mentorship_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      mentorship_certificates: {
        Row: {
          certificate_url: string | null
          description: string | null
          id: string
          is_verified: boolean | null
          issued_at: string | null
          mentee_id: string
          mentor_id: string
          mentorship_request_id: string
          program_name: string
          skills_acquired: string[] | null
          total_hours: number | null
          total_sessions: number | null
          verification_code: string | null
        }
        Insert: {
          certificate_url?: string | null
          description?: string | null
          id?: string
          is_verified?: boolean | null
          issued_at?: string | null
          mentee_id: string
          mentor_id: string
          mentorship_request_id: string
          program_name: string
          skills_acquired?: string[] | null
          total_hours?: number | null
          total_sessions?: number | null
          verification_code?: string | null
        }
        Update: {
          certificate_url?: string | null
          description?: string | null
          id?: string
          is_verified?: boolean | null
          issued_at?: string | null
          mentee_id?: string
          mentor_id?: string
          mentorship_request_id?: string
          program_name?: string
          skills_acquired?: string[] | null
          total_hours?: number | null
          total_sessions?: number | null
          verification_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mentorship_certificates_mentorship_request_id_fkey"
            columns: ["mentorship_request_id"]
            isOneToOne: false
            referencedRelation: "mentorship_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      mentorship_progress: {
        Row: {
          completed_at: string | null
          created_at: string | null
          id: string
          mentorship_request_id: string
          milestone_description: string | null
          milestone_title: string
          notes: string | null
          status: string
          target_date: string | null
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          mentorship_request_id: string
          milestone_description?: string | null
          milestone_title: string
          notes?: string | null
          status?: string
          target_date?: string | null
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          mentorship_request_id?: string
          milestone_description?: string | null
          milestone_title?: string
          notes?: string | null
          status?: string
          target_date?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mentorship_progress_mentorship_request_id_fkey"
            columns: ["mentorship_request_id"]
            isOneToOne: false
            referencedRelation: "mentorship_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      mentorship_requests: {
        Row: {
          created_at: string
          id: string
          mentee_id: string
          mentor_id: string
          message: string | null
          responded_at: string | null
          response_message: string | null
          status: Database["public"]["Enums"]["mentorship_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          mentee_id: string
          mentor_id: string
          message?: string | null
          responded_at?: string | null
          response_message?: string | null
          status?: Database["public"]["Enums"]["mentorship_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          mentee_id?: string
          mentor_id?: string
          message?: string | null
          responded_at?: string | null
          response_message?: string | null
          status?: Database["public"]["Enums"]["mentorship_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentorship_requests_mentee_id_fkey"
            columns: ["mentee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentorship_requests_mentee_id_fkey"
            columns: ["mentee_id"]
            isOneToOne: false
            referencedRelation: "profiles_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentorship_requests_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentorship_requests_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "profiles_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      mentorship_sessions: {
        Row: {
          completed_at: string | null
          created_at: string
          duration_minutes: number
          id: string
          meeting_link: string | null
          mentor_notes: string | null
          mentorship_request_id: string
          notes: string | null
          scheduled_at: string
          status: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          duration_minutes?: number
          id?: string
          meeting_link?: string | null
          mentor_notes?: string | null
          mentorship_request_id: string
          notes?: string | null
          scheduled_at: string
          status?: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          duration_minutes?: number
          id?: string
          meeting_link?: string | null
          mentor_notes?: string | null
          mentorship_request_id?: string
          notes?: string | null
          scheduled_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentorship_sessions_mentorship_request_id_fkey"
            columns: ["mentorship_request_id"]
            isOneToOne: false
            referencedRelation: "mentorship_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      message_templates: {
        Row: {
          body: string
          category: string
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          name: string
          subject: string
          updated_at: string | null
        }
        Insert: {
          body: string
          category: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          subject: string
          updated_at?: string | null
        }
        Update: {
          body?: string
          category?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          subject?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          read: boolean | null
          recipient_id: string
          sender_id: string
          thread_id: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          read?: boolean | null
          recipient_id: string
          sender_id: string
          thread_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          read?: boolean | null
          recipient_id?: string
          sender_id?: string
          thread_id?: string | null
        }
        Relationships: []
      }
      mock_interviews: {
        Row: {
          answers: Json | null
          completed_at: string | null
          created_at: string | null
          difficulty: string
          duration_minutes: number | null
          feedback: Json | null
          id: string
          job_title: string
          profile_id: string
          questions: Json
          score: number | null
          status: string
        }
        Insert: {
          answers?: Json | null
          completed_at?: string | null
          created_at?: string | null
          difficulty?: string
          duration_minutes?: number | null
          feedback?: Json | null
          id?: string
          job_title: string
          profile_id: string
          questions?: Json
          score?: number | null
          status?: string
        }
        Update: {
          answers?: Json | null
          completed_at?: string | null
          created_at?: string | null
          difficulty?: string
          duration_minutes?: number | null
          feedback?: Json | null
          id?: string
          job_title?: string
          profile_id?: string
          questions?: Json
          score?: number | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "mock_interviews_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mock_interviews_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      negotiation_sessions: {
        Row: {
          company: string | null
          conversation_history: Json | null
          created_at: string | null
          current_offer: number | null
          final_result: string | null
          id: string
          job_title: string
          outcome: string | null
          target_salary: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          company?: string | null
          conversation_history?: Json | null
          created_at?: string | null
          current_offer?: number | null
          final_result?: string | null
          id?: string
          job_title: string
          outcome?: string | null
          target_salary?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          company?: string | null
          conversation_history?: Json | null
          created_at?: string | null
          current_offer?: number | null
          final_result?: string | null
          id?: string
          job_title?: string
          outcome?: string | null
          target_salary?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      notification_events: {
        Row: {
          channel: string
          created_at: string
          event_type: string
          id: string
          metadata: Json | null
          notification_id: string
          user_id: string
        }
        Insert: {
          channel: string
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json | null
          notification_id: string
          user_id: string
        }
        Update: {
          channel?: string
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          notification_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_events_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          created_at: string
          email_enabled: boolean
          id: string
          in_app_enabled: boolean
          notification_type: string
          push_enabled: boolean
          sound_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_enabled?: boolean
          id?: string
          in_app_enabled?: boolean
          notification_type: string
          push_enabled?: boolean
          sound_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_enabled?: boolean
          id?: string
          in_app_enabled?: boolean
          notification_type?: string
          push_enabled?: boolean
          sound_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          channel: Database["public"]["Enums"]["notification_channel"] | null
          created_at: string | null
          id: string
          org_id: string
          payload_json: Json | null
          read_at: string | null
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          channel?: Database["public"]["Enums"]["notification_channel"] | null
          created_at?: string | null
          id?: string
          org_id: string
          payload_json?: Json | null
          read_at?: string | null
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          channel?: Database["public"]["Enums"]["notification_channel"] | null
          created_at?: string | null
          id?: string
          org_id?: string
          payload_json?: Json | null
          read_at?: string | null
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          company_name: string | null
          company_size: string | null
          company_website: string | null
          created_at: string | null
          description: string | null
          id: string
          industry: string | null
          logo_url: string | null
          name: string
          plan: Database["public"]["Enums"]["subscription_plan"] | null
          seats: number | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          type: Database["public"]["Enums"]["organization_type"] | null
          updated_at: string | null
        }
        Insert: {
          company_name?: string | null
          company_size?: string | null
          company_website?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          industry?: string | null
          logo_url?: string | null
          name: string
          plan?: Database["public"]["Enums"]["subscription_plan"] | null
          seats?: number | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          type?: Database["public"]["Enums"]["organization_type"] | null
          updated_at?: string | null
        }
        Update: {
          company_name?: string | null
          company_size?: string | null
          company_website?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          industry?: string | null
          logo_url?: string | null
          name?: string
          plan?: Database["public"]["Enums"]["subscription_plan"] | null
          seats?: number | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          type?: Database["public"]["Enums"]["organization_type"] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      peer_mentorship_connections: {
        Row: {
          created_at: string | null
          focus_areas: string[] | null
          id: string
          last_session_at: string | null
          meeting_frequency: string | null
          mentee_id: string
          mentor_id: string
          request_message: string | null
          status: string | null
          total_sessions: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          focus_areas?: string[] | null
          id?: string
          last_session_at?: string | null
          meeting_frequency?: string | null
          mentee_id: string
          mentor_id: string
          request_message?: string | null
          status?: string | null
          total_sessions?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          focus_areas?: string[] | null
          id?: string
          last_session_at?: string | null
          meeting_frequency?: string | null
          mentee_id?: string
          mentor_id?: string
          request_message?: string | null
          status?: string | null
          total_sessions?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "peer_mentorship_connections_mentee_id_fkey"
            columns: ["mentee_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "peer_mentorship_connections_mentee_id_fkey"
            columns: ["mentee_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "peer_mentorship_connections_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "peer_mentorship_connections_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      peer_mentorship_sessions: {
        Row: {
          connection_id: string
          created_at: string | null
          duration_minutes: number | null
          id: string
          mentee_feedback: string | null
          mentor_feedback: string | null
          notes: string | null
          scheduled_at: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          connection_id: string
          created_at?: string | null
          duration_minutes?: number | null
          id?: string
          mentee_feedback?: string | null
          mentor_feedback?: string | null
          notes?: string | null
          scheduled_at: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          connection_id?: string
          created_at?: string | null
          duration_minutes?: number | null
          id?: string
          mentee_feedback?: string | null
          mentor_feedback?: string | null
          notes?: string | null
          scheduled_at?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "peer_mentorship_sessions_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "peer_mentorship_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_stage_history: {
        Row: {
          application_id: string
          changed_at: string | null
          changed_by: string | null
          duration_in_stage: unknown
          from_stage: Database["public"]["Enums"]["application_status"] | null
          id: string
          notes: string | null
          to_stage: Database["public"]["Enums"]["application_status"]
        }
        Insert: {
          application_id: string
          changed_at?: string | null
          changed_by?: string | null
          duration_in_stage?: unknown
          from_stage?: Database["public"]["Enums"]["application_status"] | null
          id?: string
          notes?: string | null
          to_stage: Database["public"]["Enums"]["application_status"]
        }
        Update: {
          application_id?: string
          changed_at?: string | null
          changed_by?: string | null
          duration_in_stage?: unknown
          from_stage?: Database["public"]["Enums"]["application_status"] | null
          id?: string
          notes?: string | null
          to_stage?: Database["public"]["Enums"]["application_status"]
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_stage_history_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "job_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_achievements: {
        Row: {
          achievement_name: string
          achievement_type: string
          created_at: string | null
          earned_at: string
          id: string
          profile_id: string
        }
        Insert: {
          achievement_name: string
          achievement_type: string
          created_at?: string | null
          earned_at?: string
          id?: string
          profile_id: string
        }
        Update: {
          achievement_name?: string
          achievement_type?: string
          created_at?: string | null
          earned_at?: string
          id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_achievements_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_achievements_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_skills: {
        Row: {
          created_at: string | null
          evidence_text: string | null
          id: string
          level: number | null
          profile_id: string
          skill_id: string
        }
        Insert: {
          created_at?: string | null
          evidence_text?: string | null
          id?: string
          level?: number | null
          profile_id: string
          skill_id: string
        }
        Update: {
          created_at?: string | null
          evidence_text?: string | null
          id?: string
          level?: number | null
          profile_id?: string
          skill_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_skills_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_skills_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_skills_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          org_id: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          org_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          org_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      recommendations: {
        Row: {
          completed: boolean | null
          created_at: string | null
          id: string
          priority: number | null
          profile_id: string
          provider: string | null
          reason: string | null
          title: string
          type: string
          url: string | null
        }
        Insert: {
          completed?: boolean | null
          created_at?: string | null
          id?: string
          priority?: number | null
          profile_id: string
          provider?: string | null
          reason?: string | null
          title: string
          type: string
          url?: string | null
        }
        Update: {
          completed?: boolean | null
          created_at?: string | null
          id?: string
          priority?: number | null
          profile_id?: string
          provider?: string | null
          reason?: string | null
          title?: string
          type?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recommendations_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendations_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      recruiter_badges: {
        Row: {
          badge_level: string
          badge_type: string
          created_at: string
          earned_at: string
          id: string
          metadata: Json | null
          period_end: string
          period_start: string
          recruiter_id: string
        }
        Insert: {
          badge_level: string
          badge_type: string
          created_at?: string
          earned_at?: string
          id?: string
          metadata?: Json | null
          period_end: string
          period_start: string
          recruiter_id: string
        }
        Update: {
          badge_level?: string
          badge_type?: string
          created_at?: string
          earned_at?: string
          id?: string
          metadata?: Json | null
          period_end?: string
          period_start?: string
          recruiter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recruiter_badges_recruiter_id_fkey"
            columns: ["recruiter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruiter_badges_recruiter_id_fkey"
            columns: ["recruiter_id"]
            isOneToOne: false
            referencedRelation: "profiles_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      recruiter_client_feedback: {
        Row: {
          categories: Json | null
          created_at: string
          employer_org_id: string
          feedback_text: string | null
          id: string
          rating: number
          recruiter_id: string
          relationship_id: string
          submitted_by: string
          updated_at: string
        }
        Insert: {
          categories?: Json | null
          created_at?: string
          employer_org_id: string
          feedback_text?: string | null
          id?: string
          rating: number
          recruiter_id: string
          relationship_id: string
          submitted_by: string
          updated_at?: string
        }
        Update: {
          categories?: Json | null
          created_at?: string
          employer_org_id?: string
          feedback_text?: string | null
          id?: string
          rating?: number
          recruiter_id?: string
          relationship_id?: string
          submitted_by?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recruiter_client_feedback_relationship_id_fkey"
            columns: ["relationship_id"]
            isOneToOne: false
            referencedRelation: "agency_client_relationships"
            referencedColumns: ["id"]
          },
        ]
      }
      recruiter_performance: {
        Row: {
          active_clients_count: number
          applications_processed: number
          client_satisfaction_score: number | null
          created_at: string
          id: string
          jobs_posted: number
          period_end: string
          period_start: string
          placements_count: number
          recruiter_id: string
          response_time_hours: number | null
          revenue_generated: number
          updated_at: string
        }
        Insert: {
          active_clients_count?: number
          applications_processed?: number
          client_satisfaction_score?: number | null
          created_at?: string
          id?: string
          jobs_posted?: number
          period_end: string
          period_start: string
          placements_count?: number
          recruiter_id: string
          response_time_hours?: number | null
          revenue_generated?: number
          updated_at?: string
        }
        Update: {
          active_clients_count?: number
          applications_processed?: number
          client_satisfaction_score?: number | null
          created_at?: string
          id?: string
          jobs_posted?: number
          period_end?: string
          period_start?: string
          placements_count?: number
          recruiter_id?: string
          response_time_hours?: number | null
          revenue_generated?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recruiter_performance_recruiter_id_fkey"
            columns: ["recruiter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recruiter_performance_recruiter_id_fkey"
            columns: ["recruiter_id"]
            isOneToOne: false
            referencedRelation: "profiles_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          created_at: string | null
          id: string
          referred_id: string
          referrer_id: string
          status: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          referred_id: string
          referrer_id: string
          status?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          referred_id?: string
          referrer_id?: string
          status?: string | null
        }
        Relationships: []
      }
      resume_review_feedback: {
        Row: {
          created_at: string | null
          feedback: string
          id: string
          improvements: string[] | null
          is_helpful_count: number | null
          rating: number | null
          review_request_id: string
          reviewer_id: string
          strengths: string[] | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          feedback: string
          id?: string
          improvements?: string[] | null
          is_helpful_count?: number | null
          rating?: number | null
          review_request_id: string
          reviewer_id: string
          strengths?: string[] | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          feedback?: string
          id?: string
          improvements?: string[] | null
          is_helpful_count?: number | null
          rating?: number | null
          review_request_id?: string
          reviewer_id?: string
          strengths?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "resume_review_feedback_review_request_id_fkey"
            columns: ["review_request_id"]
            isOneToOne: false
            referencedRelation: "resume_review_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resume_review_feedback_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resume_review_feedback_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      resume_review_requests: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          requester_id: string
          resume_id: string
          review_count: number | null
          status: string | null
          target_role: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          requester_id: string
          resume_id: string
          review_count?: number | null
          status?: string | null
          target_role?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          requester_id?: string
          resume_id?: string
          review_count?: number | null
          status?: string | null
          target_role?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "resume_review_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resume_review_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resume_review_requests_resume_id_fkey"
            columns: ["resume_id"]
            isOneToOne: false
            referencedRelation: "resumes"
            referencedColumns: ["id"]
          },
        ]
      }
      resume_versions: {
        Row: {
          created_at: string | null
          id: string
          pdf_url: string | null
          resume_id: string
          sections_json: Json
          tags: string[] | null
          title: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          pdf_url?: string | null
          resume_id: string
          sections_json: Json
          tags?: string[] | null
          title: string
        }
        Update: {
          created_at?: string | null
          id?: string
          pdf_url?: string | null
          resume_id?: string
          sections_json?: Json
          tags?: string[] | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "resume_versions_resume_id_fkey"
            columns: ["resume_id"]
            isOneToOne: false
            referencedRelation: "resumes"
            referencedColumns: ["id"]
          },
        ]
      }
      resumes: {
        Row: {
          ats_feedback: Json | null
          ats_score: number | null
          created_at: string | null
          file_name: string | null
          file_url: string | null
          id: string
          org_id: string
          parsed_json: Json | null
          profile_id: string | null
          source: string | null
          text_content: string | null
          user_id: string
        }
        Insert: {
          ats_feedback?: Json | null
          ats_score?: number | null
          created_at?: string | null
          file_name?: string | null
          file_url?: string | null
          id?: string
          org_id: string
          parsed_json?: Json | null
          profile_id?: string | null
          source?: string | null
          text_content?: string | null
          user_id: string
        }
        Update: {
          ats_feedback?: Json | null
          ats_score?: number | null
          created_at?: string | null
          file_name?: string | null
          file_url?: string | null
          id?: string
          org_id?: string
          parsed_json?: Json | null
          profile_id?: string | null
          source?: string | null
          text_content?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "resumes_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resumes_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resumes_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      role_change_requests: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          justification: string | null
          new_role: Database["public"]["Enums"]["app_role"] | null
          org_id: string | null
          previous_role: string | null
          reason: string | null
          rejection_reason: string | null
          request_type: string
          requested_by: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          target_user_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          justification?: string | null
          new_role?: Database["public"]["Enums"]["app_role"] | null
          org_id?: string | null
          previous_role?: string | null
          reason?: string | null
          rejection_reason?: string | null
          request_type: string
          requested_by: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          target_user_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          justification?: string | null
          new_role?: Database["public"]["Enums"]["app_role"] | null
          org_id?: string | null
          previous_role?: string | null
          reason?: string | null
          rejection_reason?: string | null
          request_type?: string
          requested_by?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          target_user_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_change_requests_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_job_searches: {
        Row: {
          created_at: string | null
          filters: Json
          id: string
          name: string
          notify_enabled: boolean | null
          profile_id: string
        }
        Insert: {
          created_at?: string | null
          filters: Json
          id?: string
          name: string
          notify_enabled?: boolean | null
          profile_id: string
        }
        Update: {
          created_at?: string | null
          filters?: Json
          id?: string
          name?: string
          notify_enabled?: boolean | null
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_job_searches_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_job_searches_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_emails: {
        Row: {
          body: string
          completed_at: string | null
          created_at: string
          created_by: string
          error_message: string | null
          failed_count: number | null
          id: string
          metadata: Json | null
          recipients: Json
          scheduled_for: string
          sent_count: number | null
          started_at: string | null
          status: string
          subject: string
          template_id: string | null
          total_count: number
          updated_at: string
        }
        Insert: {
          body: string
          completed_at?: string | null
          created_at?: string
          created_by: string
          error_message?: string | null
          failed_count?: number | null
          id?: string
          metadata?: Json | null
          recipients: Json
          scheduled_for: string
          sent_count?: number | null
          started_at?: string | null
          status?: string
          subject: string
          template_id?: string | null
          total_count: number
          updated_at?: string
        }
        Update: {
          body?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string
          error_message?: string | null
          failed_count?: number | null
          id?: string
          metadata?: Json | null
          recipients?: Json
          scheduled_for?: string
          sent_count?: number | null
          started_at?: string | null
          status?: string
          subject?: string
          template_id?: string | null
          total_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_emails_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "message_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_notifications: {
        Row: {
          channel: string
          created_at: string
          data: Json | null
          error_message: string | null
          id: string
          message: string
          notification_type: string
          scheduled_for: string
          sent_at: string | null
          status: string
          title: string
          user_id: string
        }
        Insert: {
          channel: string
          created_at?: string
          data?: Json | null
          error_message?: string | null
          id?: string
          message: string
          notification_type: string
          scheduled_for: string
          sent_at?: string | null
          status?: string
          title: string
          user_id: string
        }
        Update: {
          channel?: string
          created_at?: string
          data?: Json | null
          error_message?: string | null
          id?: string
          message?: string
          notification_type?: string
          scheduled_for?: string
          sent_at?: string | null
          status?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      session_notes: {
        Row: {
          action_items: Json | null
          created_at: string | null
          created_by: string
          id: string
          key_topics: string[] | null
          next_steps: string | null
          notes: string
          session_id: string
          updated_at: string | null
        }
        Insert: {
          action_items?: Json | null
          created_at?: string | null
          created_by: string
          id?: string
          key_topics?: string[] | null
          next_steps?: string | null
          notes: string
          session_id: string
          updated_at?: string | null
        }
        Update: {
          action_items?: Json | null
          created_at?: string | null
          created_by?: string
          id?: string
          key_topics?: string[] | null
          next_steps?: string | null
          notes?: string
          session_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "session_notes_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "mentorship_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      skill_assessments: {
        Row: {
          assessment_notes: string | null
          created_at: string | null
          current_level: number | null
          id: string
          improvement_plan: string | null
          mentor_id: string | null
          next_review_date: string | null
          profile_id: string
          resources_recommended: Json | null
          skill_name: string
          target_level: number | null
          updated_at: string | null
        }
        Insert: {
          assessment_notes?: string | null
          created_at?: string | null
          current_level?: number | null
          id?: string
          improvement_plan?: string | null
          mentor_id?: string | null
          next_review_date?: string | null
          profile_id: string
          resources_recommended?: Json | null
          skill_name: string
          target_level?: number | null
          updated_at?: string | null
        }
        Update: {
          assessment_notes?: string | null
          created_at?: string | null
          current_level?: number | null
          id?: string
          improvement_plan?: string | null
          mentor_id?: string | null
          next_review_date?: string | null
          profile_id?: string
          resources_recommended?: Json | null
          skill_name?: string
          target_level?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "skill_assessments_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skill_assessments_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      skill_endorsements: {
        Row: {
          created_at: string | null
          endorsed_by: string | null
          endorsement_date: string | null
          endorsement_note: string | null
          id: string
          profile_id: string
          skill_name: string
        }
        Insert: {
          created_at?: string | null
          endorsed_by?: string | null
          endorsement_date?: string | null
          endorsement_note?: string | null
          id?: string
          profile_id: string
          skill_name: string
        }
        Update: {
          created_at?: string | null
          endorsed_by?: string | null
          endorsement_date?: string | null
          endorsement_note?: string | null
          id?: string
          profile_id?: string
          skill_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "skill_endorsements_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skill_endorsements_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      skill_gaps: {
        Row: {
          created_at: string | null
          gap_score: number | null
          id: string
          job_target_id: string | null
          profile_id: string
          rationale: string | null
          skill_id: string
        }
        Insert: {
          created_at?: string | null
          gap_score?: number | null
          id?: string
          job_target_id?: string | null
          profile_id: string
          rationale?: string | null
          skill_id: string
        }
        Update: {
          created_at?: string | null
          gap_score?: number | null
          id?: string
          job_target_id?: string | null
          profile_id?: string
          rationale?: string | null
          skill_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "skill_gaps_job_target_id_fkey"
            columns: ["job_target_id"]
            isOneToOne: false
            referencedRelation: "job_targets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skill_gaps_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skill_gaps_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skill_gaps_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
        ]
      }
      skills: {
        Row: {
          category: string | null
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      success_stories: {
        Row: {
          application_count: number | null
          comment_count: number | null
          company: string
          created_at: string | null
          id: string
          interview_count: number | null
          is_featured: boolean | null
          job_title: string
          like_count: number | null
          profile_id: string
          salary_range: string | null
          story: string
          tags: string[] | null
          timeline_weeks: number | null
          tips: string[] | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          application_count?: number | null
          comment_count?: number | null
          company: string
          created_at?: string | null
          id?: string
          interview_count?: number | null
          is_featured?: boolean | null
          job_title: string
          like_count?: number | null
          profile_id: string
          salary_range?: string | null
          story: string
          tags?: string[] | null
          timeline_weeks?: number | null
          tips?: string[] | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          application_count?: number | null
          comment_count?: number | null
          company?: string
          created_at?: string | null
          id?: string
          interview_count?: number | null
          is_featured?: boolean | null
          job_title?: string
          like_count?: number | null
          profile_id?: string
          salary_range?: string | null
          story?: string
          tags?: string[] | null
          timeline_weeks?: number | null
          tips?: string[] | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "success_stories_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "success_stories_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      success_story_comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          profile_id: string
          story_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          profile_id: string
          story_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          profile_id?: string
          story_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "success_story_comments_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "success_story_comments_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "success_story_comments_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "success_stories"
            referencedColumns: ["id"]
          },
        ]
      }
      success_story_likes: {
        Row: {
          created_at: string | null
          id: string
          story_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          story_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          story_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "success_story_likes_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "success_stories"
            referencedColumns: ["id"]
          },
        ]
      }
      system_metrics: {
        Row: {
          created_at: string | null
          id: string
          metric_type: string
          metric_value: Json
          recorded_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          metric_type: string
          metric_value: Json
          recorded_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          metric_type?: string
          metric_value?: Json
          recorded_at?: string | null
        }
        Relationships: []
      }
      team_activity_log: {
        Row: {
          action_type: string
          created_at: string
          id: string
          metadata: Json | null
          target_user_id: string | null
          team_id: string
          user_id: string
        }
        Insert: {
          action_type: string
          created_at?: string
          id?: string
          metadata?: Json | null
          target_user_id?: string | null
          team_id: string
          user_id: string
        }
        Update: {
          action_type?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          target_user_id?: string | null
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_activity_log_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          role: Database["public"]["Enums"]["team_role"]
          team_id: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["team_role"]
          team_id: string
          token?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["team_role"]
          team_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_invitations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          id: string
          invited_by: string | null
          joined_at: string
          role: Database["public"]["Enums"]["team_role"]
          team_id: string
          user_id: string
        }
        Insert: {
          id?: string
          invited_by?: string | null
          joined_at?: string
          role?: Database["public"]["Enums"]["team_role"]
          team_id: string
          user_id: string
        }
        Update: {
          id?: string
          invited_by?: string | null
          joined_at?: string
          role?: Database["public"]["Enums"]["team_role"]
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          avatar_url: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          org_id: string
          settings: Json | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          org_id: string
          settings?: Json | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          org_id?: string
          settings?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_achievements: {
        Row: {
          achievement_key: string
          earned_at: string
          id: string
          progress: number | null
          user_id: string
        }
        Insert: {
          achievement_key: string
          earned_at?: string
          id?: string
          progress?: number | null
          user_id: string
        }
        Update: {
          achievement_key?: string
          earned_at?: string
          id?: string
          progress?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_key_fkey"
            columns: ["achievement_key"]
            isOneToOne: false
            referencedRelation: "achievement_definitions"
            referencedColumns: ["achievement_key"]
          },
        ]
      }
      user_cohorts: {
        Row: {
          cohort_id: string
          id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          cohort_id: string
          id?: string
          joined_at?: string
          user_id: string
        }
        Update: {
          cohort_id?: string
          id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_cohorts_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "leaderboard_cohorts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_learning_badges: {
        Row: {
          badge_id: string
          earned_at: string | null
          id: string
          profile_id: string
        }
        Insert: {
          badge_id: string
          earned_at?: string | null
          id?: string
          profile_id: string
        }
        Update: {
          badge_id?: string
          earned_at?: string | null
          id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_learning_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "learning_badges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_learning_badges_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_learning_badges_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      user_points: {
        Row: {
          created_at: string
          id: string
          level: number
          points_to_next_level: number
          total_points: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          level?: number
          points_to_next_level?: number
          total_points?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          level?: number
          points_to_next_level?: number
          total_points?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          org_id: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          org_id?: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          org_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_streaks: {
        Row: {
          activity_type: string
          created_at: string
          current_streak: number
          id: string
          last_activity_date: string
          longest_streak: number
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_type?: string
          created_at?: string
          current_streak?: number
          id?: string
          last_activity_date?: string
          longest_streak?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string
          current_streak?: number
          id?: string
          last_activity_date?: string
          longest_streak?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      candidate_profiles_public: {
        Row: {
          created_at: string | null
          current_title: string | null
          employment_type_prefs:
            | Database["public"]["Enums"]["employment_type"][]
            | null
          headline: string | null
          id: string | null
          linkedin_url: string | null
          location: string | null
          org_id: string | null
          profile_score: number | null
          resume_primary_id: string | null
          seniority: Database["public"]["Enums"]["seniority_level"] | null
          target_locations: string[] | null
          target_titles: string[] | null
          updated_at: string | null
          user_id: string | null
          work_authorization: string[] | null
          years_experience: number | null
        }
        Insert: {
          created_at?: string | null
          current_title?: string | null
          employment_type_prefs?:
            | Database["public"]["Enums"]["employment_type"][]
            | null
          headline?: string | null
          id?: string | null
          linkedin_url?: string | null
          location?: string | null
          org_id?: string | null
          profile_score?: number | null
          resume_primary_id?: string | null
          seniority?: Database["public"]["Enums"]["seniority_level"] | null
          target_locations?: string[] | null
          target_titles?: string[] | null
          updated_at?: string | null
          user_id?: string | null
          work_authorization?: string[] | null
          years_experience?: number | null
        }
        Update: {
          created_at?: string | null
          current_title?: string | null
          employment_type_prefs?:
            | Database["public"]["Enums"]["employment_type"][]
            | null
          headline?: string | null
          id?: string | null
          linkedin_url?: string | null
          location?: string | null
          org_id?: string | null
          profile_score?: number | null
          resume_primary_id?: string | null
          seniority?: Database["public"]["Enums"]["seniority_level"] | null
          target_locations?: string[] | null
          target_titles?: string[] | null
          updated_at?: string | null
          user_id?: string | null
          work_authorization?: string[] | null
          years_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "candidate_profiles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      event_analytics_summary: {
        Row: {
          count: number | null
          date: string | null
          event_category: string | null
          interaction_type: string | null
        }
        Relationships: []
      }
      profiles_directory: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          id: string | null
          org_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          id?: string | null
          org_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          id?: string | null
          org_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      recruiter_activity_timeline: {
        Row: {
          activity_type: string | null
          application_id: string | null
          created_at: string | null
          id: string | null
          metadata: Json | null
          recipient_email: string | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      accept_company_invitation: {
        Args: { invitation_token: string }
        Returns: Json
      }
      approve_company_signup_request: {
        Args: { admin_user_id: string; request_id: string }
        Returns: Json
      }
      calculate_next_optimal_send_time: {
        Args: {
          p_min_delay_minutes?: number
          p_notification_type?: string
          p_user_id: string
        }
        Returns: string
      }
      calculate_profile_strength: {
        Args: { p_profile_id: string }
        Returns: number
      }
      cleanup_old_rate_limits: { Args: never; Returns: undefined }
      execute_role_change_request: {
        Args: { request_id: string }
        Returns: Json
      }
      get_auth_triggers_info: {
        Args: never
        Returns: {
          enabled: boolean
          name: string
        }[]
      }
      get_notification_analytics: {
        Args: { p_end_date?: string; p_start_date?: string; p_user_id?: string }
        Returns: {
          channel: string
          click_rate: number
          click_through_rate: number
          delivery_rate: number
          notification_type: string
          open_rate: number
          total_clicked: number
          total_delivered: number
          total_failed: number
          total_opened: number
          total_sent: number
        }[]
      }
      get_notification_engagement_trends: {
        Args: {
          p_end_date?: string
          p_granularity?: string
          p_start_date?: string
        }
        Returns: {
          open_rate: number
          time_bucket: string
          total_clicked: number
          total_opened: number
          total_sent: number
        }[]
      }
      get_team_role: {
        Args: { _team_id: string; _user_id: string }
        Returns: Database["public"]["Enums"]["team_role"]
      }
      get_user_engagement_patterns: {
        Args: { p_user_id: string }
        Returns: {
          avg_response_time_minutes: number
          best_day: string
          best_hour: number
          preferred_channel: string
          total_engagements: number
        }[]
      }
      get_user_engagement_summary: {
        Args: { p_user_id: string }
        Returns: {
          average_open_rate: number
          least_engaged_type: string
          most_engaged_type: string
          preferred_channel: string
          total_clicked: number
          total_notifications_received: number
          total_opened: number
        }[]
      }
      get_user_optimal_send_time: {
        Args: { p_notification_type?: string; p_user_id: string }
        Returns: {
          avg_open_rate: number
          day_of_week: number
          engagement_score: number
          hour_of_day: number
        }[]
      }
      get_user_org: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _org_id?: string
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_team_role: {
        Args: {
          _role: Database["public"]["Enums"]["team_role"]
          _team_id: string
          _user_id: string
        }
        Returns: boolean
      }
      is_team_member: {
        Args: { _team_id: string; _user_id: string }
        Returns: boolean
      }
      queue_email_notification: {
        Args: {
          p_org_id: string
          p_payload: Json
          p_type: string
          p_user_id: string
        }
        Returns: string
      }
      refresh_event_analytics_summary: { Args: never; Returns: undefined }
      repair_user_data: { Args: never; Returns: Json }
      resend_invitation: {
        Args: { admin_user_id: string; invitation_id: string }
        Returns: Json
      }
      send_session_reminders: { Args: never; Returns: undefined }
      update_learning_streak: {
        Args: { p_profile_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role:
        | "platform_admin"
        | "org_admin"
        | "coach"
        | "candidate"
        | "mentor"
        | "hiring_manager"
        | "recruiter"
        | "agency_admin"
      application_status:
        | "planned"
        | "applied"
        | "interview"
        | "offer"
        | "rejected"
        | "new"
        | "screening"
        | "phone_screen"
        | "technical_interview"
        | "final_interview"
        | "hired"
      employment_type: "full_time" | "part_time" | "contract" | "internship"
      mentorship_status:
        | "pending"
        | "accepted"
        | "declined"
        | "completed"
        | "cancelled"
      notification_channel: "email" | "in_app"
      notification_type:
        | "resume_parsed"
        | "job_match"
        | "application_reminder"
        | "coach_feedback"
        | "welcome"
        | "agency_job_posted"
        | "application_submitted"
        | "interview_scheduled"
        | "session_scheduled"
        | "session_reminder"
        | "feedback_request"
        | "resume_analysis_complete"
        | "achievement_unlocked"
        | "learning_streak_milestone"
        | "goal_progress_update"
        | "mentorship_request_received"
        | "mentorship_request_response"
        | "job_match_alert"
        | "message"
        | "achievement"
        | "interview_reminder"
        | "application_deadline"
        | "follow_up_reminder"
        | "weekly_digest"
        | "coaching_session"
        | "learning_milestone"
        | "company_insight"
        | "company_invitation"
      organization_type: "CANDIDATE_ORG" | "EMPLOYER" | "AGENCY" | "RECRUITING"
      seniority_level: "entry" | "mid" | "senior" | "lead" | "executive"
      subscription_plan: "free" | "pro" | "enterprise"
      task_status: "pending" | "in_progress" | "completed" | "failed"
      task_type:
        | "analyze_resume"
        | "generate_resume"
        | "linkedin_rewrite"
        | "job_match"
        | "interview_prep"
      team_role: "team_owner" | "team_admin" | "team_member"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "platform_admin",
        "org_admin",
        "coach",
        "candidate",
        "mentor",
        "hiring_manager",
        "recruiter",
        "agency_admin",
      ],
      application_status: [
        "planned",
        "applied",
        "interview",
        "offer",
        "rejected",
        "new",
        "screening",
        "phone_screen",
        "technical_interview",
        "final_interview",
        "hired",
      ],
      employment_type: ["full_time", "part_time", "contract", "internship"],
      mentorship_status: [
        "pending",
        "accepted",
        "declined",
        "completed",
        "cancelled",
      ],
      notification_channel: ["email", "in_app"],
      notification_type: [
        "resume_parsed",
        "job_match",
        "application_reminder",
        "coach_feedback",
        "welcome",
        "agency_job_posted",
        "application_submitted",
        "interview_scheduled",
        "session_scheduled",
        "session_reminder",
        "feedback_request",
        "resume_analysis_complete",
        "achievement_unlocked",
        "learning_streak_milestone",
        "goal_progress_update",
        "mentorship_request_received",
        "mentorship_request_response",
        "job_match_alert",
        "message",
        "achievement",
        "interview_reminder",
        "application_deadline",
        "follow_up_reminder",
        "weekly_digest",
        "coaching_session",
        "learning_milestone",
        "company_insight",
        "company_invitation",
      ],
      organization_type: ["CANDIDATE_ORG", "EMPLOYER", "AGENCY", "RECRUITING"],
      seniority_level: ["entry", "mid", "senior", "lead", "executive"],
      subscription_plan: ["free", "pro", "enterprise"],
      task_status: ["pending", "in_progress", "completed", "failed"],
      task_type: [
        "analyze_resume",
        "generate_resume",
        "linkedin_rewrite",
        "job_match",
        "interview_prep",
      ],
      team_role: ["team_owner", "team_admin", "team_member"],
    },
  },
} as const
