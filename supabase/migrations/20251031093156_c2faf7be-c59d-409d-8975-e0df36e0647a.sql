-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_org_id UUID;
BEGIN
  -- Create organization for new user
  INSERT INTO public.organizations (name)
  VALUES (COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email) || '''s Organization')
  RETURNING id INTO new_org_id;

  -- Create profile
  INSERT INTO public.profiles (id, org_id, email, full_name)
  VALUES (
    NEW.id,
    new_org_id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name'
  );

  -- Assign candidate role
  INSERT INTO public.user_roles (user_id, org_id, role)
  VALUES (NEW.id, new_org_id, 'candidate');

  RETURN NEW;
END;
$$;

-- Trigger for new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Add some demo job postings for testing
DO $$
DECLARE
  demo_org_id UUID;
  demo_user_id UUID;
BEGIN
  -- Get first organization
  SELECT id INTO demo_org_id FROM organizations LIMIT 1;
  
  IF demo_org_id IS NOT NULL THEN
    -- Insert demo jobs
    INSERT INTO job_postings (org_id, title, company, location, remote, description, seniority, salary_min, salary_max, skills_extracted, source, posted_date)
    VALUES
      (demo_org_id, 'Senior Product Manager', 'TechCorp Inc', 'San Francisco, CA', true, 
       'Lead product strategy for our core platform. 5+ years PM experience required. Excellent stakeholder management and data-driven decision making.', 
       'senior', 120000, 180000, ARRAY['Product Management', 'Data Analysis', 'Leadership', 'SQL'], 'demo', NOW()),
      
      (demo_org_id, 'Full Stack Engineer', 'StartupXYZ', 'Remote', true,
       'Build scalable web applications with React and Node.js. 3+ years experience. Must be comfortable with AWS and modern CI/CD.',
       'mid', 100000, 150000, ARRAY['React', 'Node.js', 'AWS', 'TypeScript', 'Docker'], 'demo', NOW()),
      
      (demo_org_id, 'Data Scientist', 'Analytics Co', 'New York, NY', false,
       'Apply machine learning to solve business problems. PhD or Masters in quantitative field. Python, SQL, and cloud experience required.',
       'senior', 130000, 190000, ARRAY['Python', 'Machine Learning', 'SQL', 'Data Analysis'], 'demo', NOW()),
      
      (demo_org_id, 'UX Designer', 'Design Studio', 'Los Angeles, CA', true,
       'Create delightful user experiences for web and mobile. 4+ years experience. Strong portfolio required.',
       'mid', 90000, 130000, ARRAY['UI/UX Design', 'Figma', 'User Research', 'Prototyping'], 'demo', NOW()),
      
      (demo_org_id, 'DevOps Engineer', 'Cloud Solutions', 'Austin, TX', true,
       'Build and maintain cloud infrastructure. Kubernetes, Terraform, and AWS expertise needed. 3+ years experience.',
       'mid', 110000, 160000, ARRAY['Kubernetes', 'AWS', 'Terraform', 'Docker', 'CI/CD'], 'demo', NOW())
    ON CONFLICT DO NOTHING;
  END IF;
END $$;