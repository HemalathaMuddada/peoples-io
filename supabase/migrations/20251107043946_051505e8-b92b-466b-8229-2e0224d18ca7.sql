-- Add tags column to resume_versions table
ALTER TABLE resume_versions 
ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';

-- Add index for better tag search performance
CREATE INDEX IF NOT EXISTS idx_resume_versions_tags 
ON resume_versions USING GIN(tags);