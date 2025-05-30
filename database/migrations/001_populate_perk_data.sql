-- Populate perk_definitions table
INSERT INTO perk_definitions (name, description, value, period_months, reset_type)
VALUES
  -- AMEX Platinum Perks
  ('Uber Cash', 'Up to $15 in Uber Cash each month for U.S. Uber rides or Uber Eats orders (extra $20 in December, totaling $200/year).', 15, 1, 'calendar'),
  ('Digital Entertainment Credit', 'Up to $20 back each month on eligible digital subscriptions. As of 2024–2025, covered services include Disney+ (and bundle with Hulu/ESPN+), Hulu, ESPN+, Peacock, The New York Times, and The Wall Street Journal.', 20, 1, 'calendar'),
  ('Walmart+ Membership Rebate', 'Full reimbursement of Walmart+ monthly membership fee ($12.95 plus applicable taxes, ~$155/year).', 12.95, 1, 'calendar'),
  ('Equinox Credit', 'Up to $25 back each month on Equinox gym memberships or Equinox+ digital fitness subscriptions (up to $300 annually).', 25, 1, 'calendar'),
  ('Saks Fifth Avenue Credit', 'Up to $50 in statement credits twice per year (Jan–Jun and Jul–Dec; $100 total annually).', 50, 6, 'anniversary'),
  ('CLEAR® Plus Credit', 'Up to $189 in statement credits per calendar year to cover CLEAR Plus membership.', 189, 12, 'calendar'),
  ('Airline Fee Credit', 'Up to $200 in statement credits per calendar year for incidental fees with one selected qualifying airline.', 200, 12, 'calendar'),
  ('Hotel Credit (FHR/THC)', 'Up to $200 back in statement credits each calendar year for prepaid hotels booked through Amex Fine Hotels + Resorts or The Hotel Collection.', 200, 12, 'calendar'),

  -- AMEX Gold Perks
  ('Uber Cash Credit', 'Up to $10 in Uber Cash each month for U.S. Uber rides or Uber Eats orders.', 10, 1, 'calendar'),
  ('Dining Credit', 'Up to $10 back each month at eligible dining partners: Grubhub/Seamless, The Cheesecake Factory, Goldbelly, Wine.com, and select Resy restaurants.', 10, 1, 'calendar'),
  ('Resy Dining Credit', 'Up to $50 in statement credits twice per year (Jan-Jun and Jul-Dec) for dining purchases at Resy-booked restaurants in the U.S.', 50, 6, 'anniversary'),
  ('Dunkin'' Credit', 'Up to $7 in statement credits each month for Dunkin'' Donuts purchases in the U.S. when you spend $7 or more.', 7, 1, 'calendar'),

  -- Chase Sapphire Reserve Perks
  ('Travel Purchase Credit', 'Up to $300 in statement credits for travel purchases each calendar year.', 300, 12, 'calendar'),
  ('DoorDash Restaurant Credit', '$5 off one eligible DoorDash restaurant order each month when paying with the Reserve card and enrolled in complimentary DashPass.', 5, 1, 'calendar'),
  ('DoorDash Non-Restaurant Credit #1', '$10 off one eligible non-restaurant order (grocery, convenience store, etc.) per month with DashPass enrollment.', 10, 1, 'calendar'),
  ('DoorDash Non-Restaurant Credit #2', 'Second $10 off eligible non-restaurant order (grocery, convenience store, etc.) per month with DashPass enrollment.', 10, 1, 'calendar'),
  ('Lyft Credit', '$10 in-app Lyft ride credit each month (April 2025 through Sept 2027). Plus earn 5x points on Lyft rides.', 10, 1, 'calendar'),

  -- Chase Sapphire Preferred Perks
  ('Hotel Credit', 'Up to $50 statement credit each account anniversary year for hotel stays booked via the Chase Ultimate Rewards travel portal.', 50, 12, 'calendar'),
  ('DoorDash Grocery Credit', '$10 monthly DoorDash credit for non-restaurant purchases (grocery stores, convenience stores, DashMart, etc.).', 10, 1, 'calendar'),

  -- Other Card Perks
  ('Capital One Travel Credit', 'Up to $300 per year in credits to offset bookings made through the Capital One Travel portal.', 300, 12, 'calendar'),
  ('Anniversary Miles Bonus', '10,000 bonus miles awarded every account anniversary (≈$100 in travel value).', 100, 12, 'calendar'),
  ('Disney Bundle Credit', 'Up to $7 back each month on Disney Bundle subscription (Disney+, Hulu, and ESPN+) when you spend $9.99 or more.', 7, 1, 'calendar');

-- Populate perk_eligible_services table
INSERT INTO perk_eligible_services (perk_id, service_name, service_url, app_deep_link)
SELECT 
  pd.id,
  'Uber',
  'https://www.uber.com',
  'uber://'
FROM perk_definitions pd
WHERE pd.name IN ('Uber Cash', 'Uber Cash Credit');

INSERT INTO perk_eligible_services (perk_id, service_name, service_url, app_deep_link)
SELECT 
  pd.id,
  'Uber Eats',
  'https://www.ubereats.com',
  'ubereats://'
FROM perk_definitions pd
WHERE pd.name IN ('Uber Cash', 'Uber Cash Credit');

INSERT INTO perk_eligible_services (perk_id, service_name, service_url, app_deep_link)
SELECT 
  pd.id,
  'Disney+',
  'https://www.disneyplus.com',
  'disneyplus://'
FROM perk_definitions pd
WHERE pd.name IN ('Digital Entertainment Credit', 'Disney Bundle Credit');

INSERT INTO perk_eligible_services (perk_id, service_name, service_url, app_deep_link)
SELECT 
  pd.id,
  'Hulu',
  'https://www.hulu.com',
  'hulu://'
FROM perk_definitions pd
WHERE pd.name IN ('Digital Entertainment Credit', 'Disney Bundle Credit');

INSERT INTO perk_eligible_services (perk_id, service_name, service_url, app_deep_link)
SELECT 
  pd.id,
  'ESPN+',
  'https://plus.espn.com',
  'sportscenter://'
FROM perk_definitions pd
WHERE pd.name IN ('Digital Entertainment Credit', 'Disney Bundle Credit');

INSERT INTO perk_eligible_services (perk_id, service_name, service_url, app_deep_link)
SELECT 
  pd.id,
  'Grubhub',
  'https://www.grubhub.com',
  'grubhub://'
FROM perk_definitions pd
WHERE pd.name = 'Dining Credit';

INSERT INTO perk_eligible_services (perk_id, service_name, service_url, app_deep_link)
SELECT 
  pd.id,
  'DoorDash',
  'https://www.doordash.com',
  'doordash://'
FROM perk_definitions pd
WHERE pd.name IN ('DoorDash Restaurant Credit', 'DoorDash Non-Restaurant Credit #1', 'DoorDash Non-Restaurant Credit #2', 'DoorDash Grocery Credit');

INSERT INTO perk_eligible_services (perk_id, service_name, service_url, app_deep_link)
SELECT 
  pd.id,
  'Lyft',
  'https://www.lyft.com',
  'lyft://'
FROM perk_definitions pd
WHERE pd.name = 'Lyft Credit';

INSERT INTO perk_eligible_services (perk_id, service_name, service_url, app_deep_link)
SELECT 
  pd.id,
  'Dunkin''',
  'https://www.dunkindonuts.com',
  'dunkindonuts://'
FROM perk_definitions pd
WHERE pd.name = 'Dunkin'' Credit';

INSERT INTO perk_eligible_services (perk_id, service_name, service_url, app_deep_link)
SELECT 
  pd.id,
  'Resy',
  'https://resy.com',
  'resy://'
FROM perk_definitions pd
WHERE pd.name = 'Resy Dining Credit'; 