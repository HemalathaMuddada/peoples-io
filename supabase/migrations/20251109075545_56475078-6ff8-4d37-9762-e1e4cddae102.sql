-- Create function to automatically check and award badges based on performance
CREATE OR REPLACE FUNCTION public.check_and_award_recruiter_badges()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_recruiter_id UUID;
  v_user_id UUID;
  v_org_id UUID;
BEGIN
  v_recruiter_id := NEW.recruiter_id;
  
  -- Get user_id and org_id for the recruiter
  SELECT user_id, org_id INTO v_user_id, v_org_id
  FROM profiles
  WHERE id = v_recruiter_id;
  
  -- First Placement Badge
  IF NEW.total_placements >= 1 THEN
    INSERT INTO recruiter_badges (recruiter_id, badge_type, badge_name, description)
    VALUES (
      v_recruiter_id,
      'milestone',
      'First Placement',
      'Congratulations on your first successful placement!'
    )
    ON CONFLICT (recruiter_id, badge_type, badge_name) DO NOTHING;
  END IF;
  
  -- Rising Star Badge (5 placements)
  IF NEW.total_placements >= 5 THEN
    INSERT INTO recruiter_badges (recruiter_id, badge_type, badge_name, description)
    VALUES (
      v_recruiter_id,
      'achievement',
      'Rising Star',
      'Achieved 5 successful placements'
    )
    ON CONFLICT (recruiter_id, badge_type, badge_name) DO NOTHING;
  END IF;
  
  -- Top Performer Badge (10 placements)
  IF NEW.total_placements >= 10 THEN
    INSERT INTO recruiter_badges (recruiter_id, badge_type, badge_name, description)
    VALUES (
      v_recruiter_id,
      'achievement',
      'Top Performer',
      'Achieved 10 successful placements'
    )
    ON CONFLICT (recruiter_id, badge_type, badge_name) DO NOTHING;
  END IF;
  
  -- Elite Recruiter Badge (25 placements)
  IF NEW.total_placements >= 25 THEN
    INSERT INTO recruiter_badges (recruiter_id, badge_type, badge_name, description)
    VALUES (
      v_recruiter_id,
      'achievement',
      'Elite Recruiter',
      'Achieved 25 successful placements'
    )
    ON CONFLICT (recruiter_id, badge_type, badge_name) DO NOTHING;
  END IF;
  
  -- Legend Badge (50 placements)
  IF NEW.total_placements >= 50 THEN
    INSERT INTO recruiter_badges (recruiter_id, badge_type, badge_name, description)
    VALUES (
      v_recruiter_id,
      'achievement',
      'Placement Legend',
      'Achieved 50 successful placements!'
    )
    ON CONFLICT (recruiter_id, badge_type, badge_name) DO NOTHING;
  END IF;
  
  -- Client Favorite Badge (avg satisfaction >= 4.5)
  IF NEW.avg_client_satisfaction >= 4.5 AND NEW.total_placements >= 3 THEN
    INSERT INTO recruiter_badges (recruiter_id, badge_type, badge_name, description)
    VALUES (
      v_recruiter_id,
      'quality',
      'Client Favorite',
      'Maintained 4.5+ client satisfaction rating'
    )
    ON CONFLICT (recruiter_id, badge_type, badge_name) DO NOTHING;
  END IF;
  
  -- Excellence Badge (avg satisfaction >= 4.8)
  IF NEW.avg_client_satisfaction >= 4.8 AND NEW.total_placements >= 5 THEN
    INSERT INTO recruiter_badges (recruiter_id, badge_type, badge_name, description)
    VALUES (
      v_recruiter_id,
      'quality',
      'Excellence Award',
      'Maintained 4.8+ client satisfaction rating'
    )
    ON CONFLICT (recruiter_id, badge_type, badge_name) DO NOTHING;
  END IF;
  
  -- Revenue Generator Badge ($50k+)
  IF NEW.total_revenue >= 50000 THEN
    INSERT INTO recruiter_badges (recruiter_id, badge_type, badge_name, description)
    VALUES (
      v_recruiter_id,
      'revenue',
      'Revenue Generator',
      'Generated $50,000+ in revenue'
    )
    ON CONFLICT (recruiter_id, badge_type, badge_name) DO NOTHING;
  END IF;
  
  -- Revenue Master Badge ($100k+)
  IF NEW.total_revenue >= 100000 THEN
    INSERT INTO recruiter_badges (recruiter_id, badge_type, badge_name, description)
    VALUES (
      v_recruiter_id,
      'revenue',
      'Revenue Master',
      'Generated $100,000+ in revenue'
    )
    ON CONFLICT (recruiter_id, badge_type, badge_name) DO NOTHING;
  END IF;
  
  -- Million Dollar Badge ($1M+)
  IF NEW.total_revenue >= 1000000 THEN
    INSERT INTO recruiter_badges (recruiter_id, badge_type, badge_name, description)
    VALUES (
      v_recruiter_id,
      'revenue',
      'Million Dollar Club',
      'Generated $1,000,000+ in revenue!'
    )
    ON CONFLICT (recruiter_id, badge_type, badge_name) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to automatically award badges when performance is updated
DROP TRIGGER IF EXISTS trigger_award_recruiter_badges ON recruiter_performance;
CREATE TRIGGER trigger_award_recruiter_badges
  AFTER INSERT OR UPDATE ON recruiter_performance
  FOR EACH ROW
  EXECUTE FUNCTION check_and_award_recruiter_badges();

-- Create function to send badge notification email
CREATE OR REPLACE FUNCTION public.send_badge_notification_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_user_id UUID;
  v_org_id UUID;
  v_recruiter_name TEXT;
BEGIN
  -- Get user details
  SELECT p.id, p.org_id, p.full_name
  INTO v_user_id, v_org_id, v_recruiter_name
  FROM profiles p
  WHERE p.id = NEW.recruiter_id;
  
  IF v_user_id IS NOT NULL THEN
    -- Queue email notification
    PERFORM queue_email_notification(
      v_user_id,
      v_org_id,
      'badge_awarded',
      jsonb_build_object(
        'recruiterName', v_recruiter_name,
        'badgeName', NEW.badge_name,
        'badgeType', NEW.badge_type,
        'description', NEW.description,
        'awardedDate', to_char(NEW.earned_at, 'FMMonth DD, YYYY')
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to send email when badge is awarded
DROP TRIGGER IF EXISTS trigger_send_badge_notification ON recruiter_badges;
CREATE TRIGGER trigger_send_badge_notification
  AFTER INSERT ON recruiter_badges
  FOR EACH ROW
  EXECUTE FUNCTION send_badge_notification_email();