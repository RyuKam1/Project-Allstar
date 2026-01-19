-- Reset tables to ensure new schema changes apply
DROP TABLE IF EXISTS business_venues CASCADE;
DROP TABLE IF EXISTS claim_requests CASCADE;
DROP TABLE IF EXISTS external_booking_clicks CASCADE;

-- Business Venues Table (Extends venues)
CREATE TABLE IF NOT EXISTS business_venues (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  venue_id UUID REFERENCES community_locations(id) ON DELETE CASCADE UNIQUE, -- One-to-one with community_locations
  business_owner_id UUID REFERENCES auth.users(id), -- Owner of the business account
  
  -- Business Status
  status TEXT DEFAULT 'pending_verification' CHECK (status IN ('pending_verification', 'verified', 'suspended')),
  claimed_at TIMESTAMPTZ DEFAULT NOW(),
  verified_at TIMESTAMPTZ,
  
  -- Configuration
  operating_hours JSONB DEFAULT '{}'::jsonb, -- Store opening/closing times per day
  subscription_tier TEXT DEFAULT 'free', 
  
  -- Booking Configuration (The key external link part)
  booking_config JSONB DEFAULT '{
    "method": "external_link", 
    "url": "", 
    "label": "Book Now", 
    "phone": ""
  }'::jsonb,
  
  custom_rules TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Claim Requests (For claiming existing community venues)
CREATE TABLE IF NOT EXISTS claim_requests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  venue_id UUID REFERENCES community_locations(id) ON DELETE CASCADE,
  requester_id UUID REFERENCES auth.users(id),
  business_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  verification_documents TEXT[], -- Array of URLs to uploaded docs
  
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- External Booking Tracking (For the "Return Loop")
CREATE TABLE IF NOT EXISTS external_booking_clicks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  venue_id UUID REFERENCES community_locations(id),
  target_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies

-- business_venues: Public read, Owner write
ALTER TABLE business_venues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public venues are viewable by everyone" 
ON business_venues FOR SELECT 
USING (true);

CREATE POLICY "Owners can update their own venue" 
ON business_venues FOR UPDATE 
USING (auth.uid() = business_owner_id);

-- claim_requests: User can see their own
ALTER TABLE claim_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create claims" 
ON claim_requests FOR INSERT 
WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Users can view their own claims" 
ON claim_requests FOR SELECT 
USING (auth.uid() = requester_id);

-- external_booking_clicks: Insert only (for analytics/logic)
ALTER TABLE external_booking_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can record clicks" 
ON external_booking_clicks FOR INSERT 
WITH CHECK (auth.uid() = user_id);
