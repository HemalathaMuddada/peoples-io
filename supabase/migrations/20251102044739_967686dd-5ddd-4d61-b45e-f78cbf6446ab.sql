-- Fix match_score column to support 0-100 percentage scores
ALTER TABLE public.job_matches 
ALTER COLUMN match_score TYPE integer USING match_score::integer;