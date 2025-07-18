-- Migration: Populate card data from card-data.ts
-- This migration seeds the card_definitions, benefit_definitions, app_schemes, and multi_choice_perk_configs tables

-- Insert app schemes data
INSERT INTO app_schemes (scheme_key, ios_scheme, android_scheme, fallback_url, android_package, app_store_url_ios, app_store_url_android) VALUES
('uber', 'uber://', 'uber://', 'https://m.uber.com/', 'com.ubercab', 'https://apps.apple.com/app/uber/id368677368', 'https://play.google.com/store/apps/details?id=com.ubercab'),
('uberEats', 'ubereats://', 'ubereats://', 'https://www.ubereats.com/', 'com.ubercab.eats', 'https://apps.apple.com/app/uber-eats-food-delivery/id1058959277', 'https://play.google.com/store/apps/details?id=com.ubercab.eats'),
('grubhub', 'grubhub://', 'grubhub://', 'https://www.grubhub.com/', 'com.grubhub.android', 'https://apps.apple.com/app/grubhub-food-delivery/id302920553', 'https://play.google.com/store/apps/details?id=com.grubhub.android'),
('disneyPlus', 'disneyplus://', 'disneyplus://', 'https://www.disneyplus.com/', 'com.disney.disneyplus', 'https://apps.apple.com/app/id1446075923', 'https://play.google.com/store/apps/details?id=com.disney.disneyplus'),
('hulu', 'hulu://action?id=open.hulu.com', 'hulu://action?id=open.hulu.com', 'https://www.hulu.com/welcome', 'com.hulu.plus', 'https://apps.apple.com/us/app/hulu-stream-tv-shows-movies/id376510438', 'https://play.google.com/store/apps/details?id=com.hulu.plus'),
('espn', 'sportscenter://', 'espn://', 'https://www.espn.com/espnplus/', 'com.espn.score_center', 'https://apps.apple.com/app/id317469184', 'https://play.google.com/store/apps/details?id=com.espn.score_center'),
('peacock', 'peacock://', 'https://www.peacocktv.com/', 'https://www.peacocktv.com/', 'com.peacocktv.peacockandroid', 'https://apps.apple.com/us/app/peacock-tv-stream-tv-movies/id1508186374', 'https://play.google.com/store/apps/details?id=com.peacocktv.peacockandroid'),
('nytimes', 'https://www.nytimes.com/', 'https://www.nytimes.com/', 'https://www.nytimes.com/', 'com.nytimes.android', 'https://apps.apple.com/us/app/the-new-york-times/id284862083', 'https://play.google.com/store/apps/details?id=com.nytimes.android'),
('dunkin', 'dunkindonuts://', 'dunkindonuts://', 'https://www.dunkindonuts.com/', 'com.dunkinbrands.otgo', 'https://apps.apple.com/app/dunkin/id1056813463', 'https://play.google.com/store/apps/details?id=com.dunkinbrands.otgo'),
('doordash', 'doordash://', 'doordash://', 'https://www.doordash.com/', 'com.dd.doordash', 'https://apps.apple.com/app/doordash-food-delivery/id719972451', 'https://play.google.com/store/apps/details?id=com.dd.doordash'),
('instacart', 'instacart://', 'instacart://', 'https://www.instacart.com/', 'com.instacart.client', 'https://apps.apple.com/app/id545599256', 'https://play.google.com/store/apps/details?id=com.instacart.client'),
('resy', 'resy://', 'resy://', 'https://resy.com/', 'com.resy.android', 'https://apps.apple.com/app/resy/id866163372', 'https://play.google.com/store/apps/details?id=com.resy.android'),
('walmart', 'https://www.walmart.com/', 'https://www.walmart.com/', 'https://www.walmart.com/', 'com.walmart.android', 'https://apps.apple.com/us/app/walmart-shopping-grocery/id338137227', 'https://play.google.com/store/apps/details?id=com.walmart.android'),
('capitalOne', 'https://www.capitalone.com/', 'https://www.capitalone.com/', 'https://www.capitalone.com/', 'com.konylabs.capitalone', 'https://apps.apple.com/us/app/capital-one-mobile/id407558537', 'https://play.google.com/store/apps/details?id=com.konylabs.capitalone'),
('lyft', 'lyft://', 'me.lyft.android://', 'https://www.lyft.com/', 'me.lyft.android', 'https://apps.apple.com/app/lyft/id529379082', 'https://play.google.com/store/apps/details?id=me.lyft.android'),
('saks', 'https://www.saksfifthavenue.com/', 'https://www.saksfifthavenue.com/', 'https://www.saksfifthavenue.com/', 'com.saks.android', 'https://apps.apple.com/us/app/saks-fifth-avenue/id491507258', 'https://play.google.com/store/apps/details?id=com.saks.android'),
('equinox', 'equinoxplus://action?id=open.equinox.com', 'https://www.equinoxplus.com/', 'https://www.equinoxplus.com/', 'com.equinox.android', 'https://apps.apple.com/us/app/equinox/id318815572', 'https://play.google.com/store/apps/details?id=com.equinox.android'),
('wallstreetjournal', 'wsj://', 'wsj://', 'https://www.wsj.com/', 'wsj.reader_sp', 'https://apps.apple.com/us/app/the-wall-street-journal/id364387007', 'https://play.google.com/store/apps/details?id=wsj.reader_sp'),
('clear', 'clear://action?id=open.clearme.com', 'https://clearme.com/', 'https://www.clearme.com/', 'com.clearme.clear', 'https://apps.apple.com/us/app/clear/id1485522816', 'https://play.google.com/store/apps/details?id=com.clearme.clear'),
('chase', 'chase://', 'chase://', 'https://travel.chase.com/', 'com.chase.sig.android', 'https://apps.apple.com/us/app/chase-mobile/id298867247', 'https://play.google.com/store/apps/details?id=com.chase.sig.android'),
('marriott', 'marriott://', 'marriott://', 'https://www.marriott.com/', 'com.marriott.mrt', 'https://apps.apple.com/us/app/marriott-bonvoy/id1026035061', 'https://play.google.com/store/apps/details?id=com.marriott.mrt'),
('hilton', 'hiltonhonors://action?id=open.hilton.com', 'hiltonhonors://book', 'https://www.hilton.com/', 'com.hilton.android.hhonors', 'https://apps.apple.com/us/app/hilton-honors/id635150066', 'https://play.google.com/store/apps/details?id=com.hilton.android.hhonors'),
('delta', 'https://www.delta.com/stays', 'https://www.delta.com/stays', 'https://www.delta.com/', 'com.delta.mobile.android', 'https://apps.apple.com/us/app/fly-delta/id388491656', 'https://play.google.com/store/apps/details?id=com.delta.mobile.android'),
('opentable', 'opentable://', 'opentable://', 'https://www.opentable.com/', 'com.opentable', 'https://apps.apple.com/us/app/opentable/id296581815', 'https://play.google.com/store/apps/details?id=com.opentable'),
('peloton', 'https://members.onepeloton.com/classes', 'https://members.onepeloton.com/classes', 'https://www.onepeloton.com/', 'com.onepeloton.callisto', 'https://apps.apple.com/us/app/peloton-at-home-fitness/id792750948', 'https://play.google.com/store/apps/details?id=com.onepeloton.callisto'),
('stubhub', 'stubhub://', 'stubhub://', 'https://www.stubhub.com/', 'com.stubhub.mobile.android.platform', 'https://apps.apple.com/us/app/stubhub/id354425048', 'https://play.google.com/store/apps/details?id=com.stubhub.mobile.android.platform'),
('netflix', 'nflx://', 'nflx://', 'https://www.netflix.com/', 'com.netflix.mediaclient', 'https://apps.apple.com/us/app/netflix/id363590051', 'https://play.google.com/store/apps/details?id=com.netflix.mediaclient'),
('appletv', 'videos://', 'https://tv.apple.com/', 'https://tv.apple.com/', 'com.apple.atve.androidtv.appletv', 'https://apps.apple.com/us/app/apple-tv/id1174078549', 'https://play.google.com/store/apps/details?id=com.apple.atve.androidtv.appletv'),
('applemusic', 'music://', 'https://music.apple.com/', 'https://music.apple.com/', 'com.apple.android.music', 'https://apps.apple.com/us/app/apple-music/id1108187390', 'https://play.google.com/store/apps/details?id=com.apple.android.music'),
('amex', 'amex://', 'amex://', 'https://www.americanexpress.com/', 'com.americanexpress.android.acctsvcs.us', 'https://apps.apple.com/us/app/amex/id362348516', 'https://play.google.com/store/apps/details?id=com.americanexpress.android.acctsvcs.us'),
('curb', 'curb://', 'curb://', 'https://gocurb.com/', 'com.ridecharge.curb', 'https://apps.apple.com/us/app/curb-request-pay-taxi-rides/id299226386', 'https://play.google.com/store/apps/details?id=com.ridecharge.curb'),
('revel', 'revel://', 'revel://', 'https://gorevel.com/', 'com.revel.ride', 'https://apps.apple.com/us/app/revel-electric-moped-sharing/id1468872087', 'https://play.google.com/store/apps/details?id=com.revel.ride'),
('alto', 'alto://', 'alto://', 'https://ridealto.com/', 'com.ridealto.passenger', 'https://apps.apple.com/us/app/alto/id1484131955', 'https://play.google.com/store/apps/details?id=com.ridealto.passenger'),
('audible', 'audible://', 'audible://', 'https://www.audible.com/', 'com.audible.application', 'https://apps.apple.com/us/app/audible-audio-entertainment/id379693831', 'https://play.google.com/store/apps/details?id=com.audible.application'),
('fiveGuys', NULL, NULL, 'https://www.fiveguys.com/', NULL, NULL, NULL),
('cheesecakeFactory', NULL, NULL, 'https://www.thecheesecakefactory.com/', NULL, NULL, NULL),
('goldbelly', NULL, NULL, 'https://www.goldbelly.com/', NULL, NULL, NULL),
('wine', NULL, NULL, 'https://www.wine.com/', NULL, NULL, NULL),
('milkBar', NULL, NULL, 'https://milkbarstore.com/', NULL, NULL, NULL)
ON CONFLICT (scheme_key) DO NOTHING;

-- Insert card definitions
INSERT INTO card_definitions (card_id, name, image_url, annual_fee, statement_credit, rewards_currency, network) VALUES
('amex_platinum', 'American Express Platinum', '../../assets/images/amex_plat.avif', 695.00, NULL, 'Membership Rewards', 'American Express'),
('amex_gold', 'American Express Gold', '../../assets/images/amex_gold.avif', 325.00, NULL, 'Membership Rewards', 'American Express'),
('chase_sapphire_reserve', 'Chase Sapphire Reserve', '../../assets/images/chase_sapphire_reserve.png', 795.00, NULL, 'Ultimate Rewards', 'Visa'),
('chase_sapphire_preferred', 'Chase Sapphire Preferred', '../../assets/images/chase_sapphire_preferred.png', 95.00, NULL, 'Ultimate Rewards', 'Visa'),
('marriott_bonvoy_brilliant', 'Marriott Bonvoy Brilliant', '../../assets/images/marriott_bonvoy_brilliant.avif', 650.00, NULL, 'Marriott Bonvoy Points', 'American Express'),
('hilton_aspire', 'Hilton Honors Aspire', '../../assets/images/hilton_aspire.avif', 550.00, NULL, 'Hilton Honors Points', 'American Express'),
('capital_one_venture_x', 'Capital One Venture X', '../../assets/images/venture_x.avif', 395.00, NULL, 'Capital One Miles', 'Visa'),
('blue_cash_preferred', 'Blue Cash Preferred (AmEx)', '../../assets/images/blue_cash_preferred.avif', 95.00, NULL, 'Cash Back', 'American Express'),
('delta_reserve', 'Delta SkyMiles Reserve (AmEx)', '../../assets/images/delta_reserve.avif', 650.00, NULL, 'Delta SkyMiles', 'American Express'),
('amex_green', 'American Express Green', '../../assets/images/amex_green.avif', 150.00, NULL, 'Membership Rewards', 'American Express'),
('boa_premium_rewards', 'Bank of America Premium Rewards', '../../assets/images/boa_premium_rewards.png', 95.00, NULL, 'Bank of America Rewards', 'Visa'),
('boa_premium_rewards_elite', 'Bank of America Premium Rewards Elite', '../../assets/images/boa_premium_rewards_elite.png', 550.00, NULL, 'Bank of America Rewards', 'Visa'),
('usb_altitude_reserve', 'U.S. Bank Altitude Reserve Visa Infinite', '../../assets/images/usb_altitude_reserve.png', 400.00, NULL, 'U.S. Bank Rewards', 'Visa'),
('citi_prestige', 'Citi Prestige Card', '../../assets/images/citi_prestige.jpeg', 495.00, NULL, 'Citi ThankYou Points', 'Mastercard')
ON CONFLICT (card_id) DO NOTHING;

-- Insert benefit definitions for American Express Platinum
INSERT INTO benefit_definitions (benefit_id, card_definition_id, name, value, period, period_months, reset_type, description, redemption_instructions, app_scheme, categories) 
SELECT 
    'platinum_uber_cash',
    cd.id,
    'Uber Cash',
    15.00,
    'monthly',
    1,
    'calendar',
    'Receive $15 in Uber Cash for U.S. rides or Uber Eats orders each month, plus a $20 bonus in December, for a total of $200 annually.',
    'To activate, add your Platinum Card as a payment method in your Uber account. The Uber Cash is automatically added to your account on the first day of each month and expires at the end of that month. Unused amounts do not roll over.',
    'uber',
    ARRAY['Transportation', 'Dining']
FROM card_definitions cd WHERE cd.card_id = 'amex_platinum'
ON CONFLICT (benefit_id) DO NOTHING;

INSERT INTO benefit_definitions (benefit_id, card_definition_id, name, value, period, period_months, reset_type, description, redemption_instructions, app_scheme, categories) 
SELECT 
    'platinum_digital_ent',
    cd.id,
    'Digital Entertainment Credit',
    20.00,
    'monthly',
    1,
    'calendar',
    'Up to $20 per month (totaling $240 per year) in statement credits for eligible digital subscriptions. Covered services include Audible, Disney+, The Disney Bundle, ESPN+, Hulu, Peacock, The New York Times, and The Wall Street Journal.',
    'You must enroll in this benefit first via your Amex account. Then, simply use your Platinum Card to pay for the eligible subscriptions. The credit is automatically applied as a statement credit.',
    'disneyPlus',
    ARRAY['Bills & Utilities', 'Entertainment']
FROM card_definitions cd WHERE cd.card_id = 'amex_platinum'
ON CONFLICT (benefit_id) DO NOTHING;

INSERT INTO benefit_definitions (benefit_id, card_definition_id, name, value, period, period_months, reset_type, description, redemption_instructions, app_scheme, categories) 
SELECT 
    'platinum_walmart_plus',
    cd.id,
    'Walmart+ Membership Credit',
    12.95,
    'monthly',
    1,
    'calendar',
    'Receive a statement credit that covers the full cost of a Walmart+ monthly membership ($12.95 plus applicable sales tax).',
    'Use your Platinum Card to pay for a Walmart+ monthly membership. This benefit does not cover the annual membership. A key value of this perk is that a Walmart+ membership also includes a complimentary Paramount+ subscription.',
    'walmart',
    ARRAY['Shopping', 'Grocery', 'Entertainment']
FROM card_definitions cd WHERE cd.card_id = 'amex_platinum'
ON CONFLICT (benefit_id) DO NOTHING;

INSERT INTO benefit_definitions (benefit_id, card_definition_id, name, value, period, period_months, reset_type, description, redemption_instructions, app_scheme, categories) 
SELECT 
    'platinum_equinox',
    cd.id,
    'Equinox Credit',
    300.00,
    'annual',
    12,
    'calendar',
    'Receive up to $300 in statement credits annually for eligible Equinox memberships.',
    'Enrollment is required. Use your Platinum Card to pay for an Equinox All Access, Destination, E by Equinox, or Equinox+ membership. The credit is applied monthly based on your charges, up to the annual maximum of $300.',
    'equinox',
    ARRAY['Fitness', 'Wellness']
FROM card_definitions cd WHERE cd.card_id = 'amex_platinum'
ON CONFLICT (benefit_id) DO NOTHING;

-- Additional Platinum benefits
INSERT INTO benefit_definitions (benefit_id, card_definition_id, name, value, period, period_months, reset_type, description, redemption_instructions, app_scheme, categories) 
SELECT 
    'platinum_saks',
    cd.id,
    'Saks Fifth Avenue Credit',
    50.00,
    'semi_annual',
    6,
    'calendar',
    'Receive up to $50 in statement credits semi-annually (Jan-Jun and Jul-Dec) for purchases at Saks Fifth Avenue.',
    'Enrollment required. Use your Platinum Card at Saks Fifth Avenue stores or saks.com. The credit is automatically applied. Unused credits do not roll over.',
    'saks',
    ARRAY['Shopping']
FROM card_definitions cd WHERE cd.card_id = 'amex_platinum'
ON CONFLICT (benefit_id) DO NOTHING;

INSERT INTO benefit_definitions (benefit_id, card_definition_id, name, value, period, period_months, reset_type, description, redemption_instructions, app_scheme, categories) 
SELECT 
    'platinum_airline_fee',
    cd.id,
    'Airline Fee Credit',
    200.00,
    'annual',
    12,
    'calendar',
    'Up to $200 in statement credits annually for incidental fees with one selected airline.',
    'Select your qualifying airline in your Amex account. Use your card for eligible incidental fees like checked bags, seat selection, and in-flight purchases. Does not cover airfare.',
    'amex',
    ARRAY['Travel', 'Flights']
FROM card_definitions cd WHERE cd.card_id = 'amex_platinum'
ON CONFLICT (benefit_id) DO NOTHING;

INSERT INTO benefit_definitions (benefit_id, card_definition_id, name, value, period, period_months, reset_type, description, redemption_instructions, app_scheme, categories) 
SELECT 
    'platinum_hotel_credit',
    cd.id,
    'Prepaid Hotel Credit',
    200.00,
    'annual',
    12,
    'calendar',
    'Up to $200 in statement credits each year for prepaid Fine Hotels + Resorts or The Hotel Collection bookings through Amex Travel.',
    'Book a prepaid stay of at least 2 consecutive nights through American Express Travel. The credit is applied automatically. Bookings also include perks like room upgrades, late checkout, and property credits.',
    'amex',
    ARRAY['Travel', 'Lodging']
FROM card_definitions cd WHERE cd.card_id = 'amex_platinum'
ON CONFLICT (benefit_id) DO NOTHING;

-- Insert benefit definitions for American Express Gold
INSERT INTO benefit_definitions (benefit_id, card_definition_id, name, value, period, period_months, reset_type, description, redemption_instructions, app_scheme, categories) 
SELECT 
    'amex_gold_uber',
    cd.id,
    'Uber Cash',
    10.00,
    'monthly',
    1,
    'calendar',
    'Receive up to $10 in Uber Cash each month, totaling $120 per year. This can be used for both U.S. Uber rides and U.S. Uber Eats orders.',
    'To receive the benefit, add your Gold Card as a payment method in your Uber account. The $10 in Uber Cash will be automatically deposited into your account on the first of each month. Credits do not roll over and expire at the end of the month.',
    'uber',
    ARRAY['Transportation', 'Dining']
FROM card_definitions cd WHERE cd.card_id = 'amex_gold'
ON CONFLICT (benefit_id) DO NOTHING;

INSERT INTO benefit_definitions (benefit_id, card_definition_id, name, value, period, period_months, reset_type, description, redemption_instructions, app_scheme, categories) 
SELECT 
    'amex_gold_grubhub',
    cd.id,
    'Grubhub Credit',
    10.00,
    'monthly',
    1,
    'calendar',
    'Receive up to $10 in statement credits each month for purchases at Grubhub, Five Guys, The Cheesecake Factory, Goldbelly, Wine.com, and Milk Bar.',
    'You must first enroll in the benefit through your American Express online account. Then, simply use your Gold Card to pay at any of the eligible partners. The statement credit is applied automatically. Unused amounts do not roll over.',
    'grubhub',
    ARRAY['Dining']
FROM card_definitions cd WHERE cd.card_id = 'amex_gold'
ON CONFLICT (benefit_id) DO NOTHING;

INSERT INTO benefit_definitions (benefit_id, card_definition_id, name, value, period, period_months, reset_type, description, redemption_instructions, app_scheme, categories) 
SELECT 
    'amex_gold_resy',
    cd.id,
    'Resy Dining Credit',
    50.00,
    'semi_annual',
    6,
    'calendar',
    'Up to $50 in statement credits twice per year (Jan-Jun and Jul-Dec) for dining purchases at Resy-booked restaurants in the U.S.',
    'Book and dine at Resy partner restaurants. No special code needed; credit posts automatically after dining.',
    'resy',
    ARRAY['Dining']
FROM card_definitions cd WHERE cd.card_id = 'amex_gold'
ON CONFLICT (benefit_id) DO NOTHING;

INSERT INTO benefit_definitions (benefit_id, card_definition_id, name, value, period, period_months, reset_type, description, redemption_instructions, app_scheme, categories) 
SELECT 
    'amex_gold_dunkin',
    cd.id,
    'Dunkin'' Credit',
    7.00,
    'monthly',
    1,
    'calendar',
    'Up to $7 in statement credits each month for Dunkin'' Donuts purchases in the U.S. when you spend $7 or more.',
    'Enroll your card and use it at Dunkin'' Donuts. Credit appears on statement after qualifying purchase.',
    'dunkin',
    ARRAY['Dining', 'Coffee']
FROM card_definitions cd WHERE cd.card_id = 'amex_gold'
ON CONFLICT (benefit_id) DO NOTHING;

-- Insert benefit definitions for Chase Sapphire Reserve
INSERT INTO benefit_definitions (benefit_id, card_definition_id, name, value, period, period_months, reset_type, description, redemption_instructions, app_scheme, categories) 
SELECT 
    'csr_the_edit_credit_h1',
    cd.id,
    'The Edit by Chase Travel Credit',
    250.00,
    'semi_annual',
    6,
    'calendar',
    '$250 statement credit for prepaid hotel bookings of at least two nights made through "The Edit by Chase Travel" portal. Valid from January 1 to June 30.',
    'Credit is automatically applied to eligible bookings. Purchases reimbursed with this credit do not earn points.',
    'chase',
    ARRAY['Travel', 'Lodging']
FROM card_definitions cd WHERE cd.card_id = 'chase_sapphire_reserve'
ON CONFLICT (benefit_id) DO NOTHING;

INSERT INTO benefit_definitions (benefit_id, card_definition_id, name, value, period, period_months, reset_type, description, redemption_instructions, app_scheme, categories) 
SELECT 
    'csr_dining_credit_h1',
    cd.id,
    'Exclusive Tables Dining Credit',
    150.00,
    'semi_annual',
    6,
    'calendar',
    '$150 statement credit for dining experiences booked through the "Sapphire Reserve Exclusive Tables" platform on OpenTable. Valid from January 1 to June 30.',
    'Credit is automatically applied for dining experiences booked via the "Sapphire Reserve Exclusive Tables" program.',
    'opentable',
    ARRAY['Dining']
FROM card_definitions cd WHERE cd.card_id = 'chase_sapphire_reserve'
ON CONFLICT (benefit_id) DO NOTHING;

-- Chase Sapphire Reserve H2 benefits
INSERT INTO benefit_definitions (benefit_id, card_definition_id, name, value, period, period_months, reset_type, description, redemption_instructions, app_scheme, categories, start_date, end_date) 
SELECT 
    'csr_the_edit_credit_h2',
    cd.id,
    'The Edit by Chase Travel Credit (H2)',
    250.00,
    'semi_annual',
    6,
    'calendar',
    '$250 statement credit for prepaid hotel bookings of at least two nights made through "The Edit by Chase Travel" portal. Valid from July 1 to December 31.',
    'Credit is automatically applied to eligible bookings. Purchases reimbursed with this credit do not earn points.',
    'chase',
    ARRAY['Travel', 'Lodging'],
    '2024-07-01'::DATE,
    '2024-12-31'::DATE
FROM card_definitions cd WHERE cd.card_id = 'chase_sapphire_reserve'
ON CONFLICT (benefit_id) DO NOTHING;

INSERT INTO benefit_definitions (benefit_id, card_definition_id, name, value, period, period_months, reset_type, description, redemption_instructions, app_scheme, categories, start_date, end_date) 
SELECT 
    'csr_dining_credit_h2',
    cd.id,
    'Exclusive Tables Dining Credit (H2)',
    150.00,
    'semi_annual',
    6,
    'calendar',
    '$150 statement credit for dining experiences booked through the "Sapphire Reserve Exclusive Tables" platform on OpenTable. Valid from July 1 to December 31.',
    'Credit is automatically applied for dining experiences booked via the "Sapphire Reserve Exclusive Tables" program.',
    'opentable',
    ARRAY['Dining'],
    '2024-07-01'::DATE,
    '2024-12-31'::DATE
FROM card_definitions cd WHERE cd.card_id = 'chase_sapphire_reserve'
ON CONFLICT (benefit_id) DO NOTHING;

INSERT INTO benefit_definitions (benefit_id, card_definition_id, name, value, period, period_months, reset_type, description, redemption_instructions, app_scheme, categories, start_date, end_date) 
SELECT 
    'csr_stubhub_credit_h2',
    cd.id,
    'StubHub/viagogo Credit (H2)',
    150.00,
    'semi_annual',
    6,
    'calendar',
    '$150 statement credit for event tickets purchased through StubHub or viagogo. Valid from July 1 to December 31.',
    'Purchase tickets on StubHub or viagogo using your Sapphire Reserve card. Credit is automatically applied.',
    'stubhub',
    ARRAY['Entertainment'],
    '2024-07-01'::DATE,
    '2024-12-31'::DATE
FROM card_definitions cd WHERE cd.card_id = 'chase_sapphire_reserve'
ON CONFLICT (benefit_id) DO NOTHING;

-- Insert benefit definitions for Chase Sapphire Preferred
INSERT INTO benefit_definitions (benefit_id, card_definition_id, name, value, period, period_months, reset_type, description, redemption_instructions, app_scheme, categories) 
SELECT 
    'csp_hotel',
    cd.id,
    'Hotel Credit',
    50.00,
    'annual',
    12,
    'calendar',
    'Up to $50 statement credit each account anniversary year for hotel stays booked via the Chase Ultimate Rewards travel portal.',
    'Book a hotel through Chase Travel using your Sapphire Preferred; the first $50 of hotel charges will be automatically refunded. Credit resets every account anniversary.',
    'chase',
    ARRAY['Travel', 'Lodging']
FROM card_definitions cd WHERE cd.card_id = 'chase_sapphire_preferred'
ON CONFLICT (benefit_id) DO NOTHING;

INSERT INTO benefit_definitions (benefit_id, card_definition_id, name, value, period, period_months, reset_type, description, redemption_instructions, app_scheme, categories) 
SELECT 
    'csp_doordash_grocery',
    cd.id,
    'DoorDash Grocery Credit',
    10.00,
    'monthly',
    1,
    'calendar',
    '$10 monthly DoorDash credit for non-restaurant purchases (grocery stores, convenience stores, DashMart, etc.) through 2027.',
    'Use your Preferred card with DashPass activated. You''ll see a $10 off promo automatically for eligible non-restaurant orders each month. Credit does not roll over.',
    'doordash',
    ARRAY['Grocery']
FROM card_definitions cd WHERE cd.card_id = 'chase_sapphire_preferred'
ON CONFLICT (benefit_id) DO NOTHING;

-- Insert benefit definitions for Marriott Bonvoy Brilliant
INSERT INTO benefit_definitions (benefit_id, card_definition_id, name, value, period, period_months, reset_type, description, redemption_instructions, app_scheme, categories) 
SELECT 
    'brilliant_dining',
    cd.id,
    'Dining Credit',
    25.00,
    'monthly',
    1,
    'calendar',
    '$25 dining statement credit each month (up to $300 per year) at restaurants worldwide.',
    'Use your Marriott Bonvoy Brilliant card for dining purchases worldwide. Credits are applied automatically to your statement.',
    'marriott',
    ARRAY['Dining']
FROM card_definitions cd WHERE cd.card_id = 'marriott_bonvoy_brilliant'
ON CONFLICT (benefit_id) DO NOTHING;

INSERT INTO benefit_definitions (benefit_id, card_definition_id, name, value, period, period_months, reset_type, description, redemption_instructions, app_scheme, categories) 
SELECT 
    'brilliant_free_night_award',
    cd.id,
    'Annual Free Night Award',
    765.00,
    'annual',
    12,
    'anniversary',
    'Receive one Free Night Award each year after your card renewal month. The award can be used for a one-night stay at a participating Marriott Bonvoy hotel with a redemption level at or under 85,000 points. You can top off the award with up to 15,000 of your own points.',
    'The Free Night Award will be automatically deposited into your Marriott Bonvoy account 8-12 weeks after your card renewal month. To use it, log in to your Marriott Bonvoy account and select the award at the time of booking. The award expires one year from the date of issuance. Be aware that some properties may charge resort fees, which are not covered by the award.',
    'marriott',
    ARRAY['Travel', 'Lodging']
FROM card_definitions cd WHERE cd.card_id = 'marriott_bonvoy_brilliant'
ON CONFLICT (benefit_id) DO NOTHING;

-- Insert benefit definitions for Hilton Honors Aspire
INSERT INTO benefit_definitions (benefit_id, card_definition_id, name, value, period, period_months, reset_type, description, redemption_instructions, app_scheme, categories) 
SELECT 
    'aspire_flight_credit',
    cd.id,
    'Airline Flight Credit',
    50.00,
    'quarterly',
    3,
    'calendar',
    'Up to $50 back in statement credits each quarter on eligible flight purchases (total $200 yr).',
    'Use your Hilton Honors Aspire card to purchase flights directly from airlines or through authorized travel agencies. Credits are applied automatically to your statement.',
    'amex',
    ARRAY['Travel', 'Flights']
FROM card_definitions cd WHERE cd.card_id = 'hilton_aspire'
ON CONFLICT (benefit_id) DO NOTHING;

INSERT INTO benefit_definitions (benefit_id, card_definition_id, name, value, period, period_months, reset_type, description, redemption_instructions, app_scheme, categories) 
SELECT 
    'aspire_hilton_resort_credit',
    cd.id,
    'Hilton Resort Credit',
    200.00,
    'semi_annual',
    6,
    'calendar',
    'Get up to $200 in statement credits semi-annually for eligible purchases made directly at participating Hilton Resorts. This provides a total of up to $400 in resort credits per calendar year. The credit periods are January-June and July-December.',
    'To use this credit, charge eligible purchases, including room rates and incidental charges like dining and spa treatments, to your room at a participating Hilton Resort and pay with your Hilton Honors Aspire card at checkout. A list of participating resorts is available on the Hilton website. Advance purchase or non-refundable rates may not be eligible. Unused semi-annual credits do not roll over.',
    'hilton',
    ARRAY['Travel']
FROM card_definitions cd WHERE cd.card_id = 'hilton_aspire'
ON CONFLICT (benefit_id) DO NOTHING;

INSERT INTO benefit_definitions (benefit_id, card_definition_id, name, value, period, period_months, reset_type, description, redemption_instructions, app_scheme, categories, is_anniversary_benefit, estimated_value) 
SELECT 
    'aspire_free_night',
    cd.id,
    'Annual Free Night Reward',
    1000.00,
    'annual',
    12,
    'anniversary',
    'Receive one Free Weekend Night Reward each year after your Card renewal anniversary. Valid at almost all Hilton properties worldwide with no blackout dates.',
    'The Free Weekend Night Reward will be automatically added to your Hilton Honors account 8-12 weeks after your Card renewal anniversary. Book your stay through Hilton.com or the Hilton app and apply the certificate at checkout. Valid for stays on Friday, Saturday, or Sunday nights only. The certificate expires 12 months from issuance.',
    'hilton',
    ARRAY['Travel', 'Lodging'],
    true,
    1000.00
FROM card_definitions cd WHERE cd.card_id = 'hilton_aspire'
ON CONFLICT (benefit_id) DO NOTHING;

-- Insert benefit definitions for Capital One Venture X
INSERT INTO benefit_definitions (benefit_id, card_definition_id, name, value, period, period_months, reset_type, description, redemption_instructions, app_scheme, categories) 
SELECT 
    'venturex_travel_credit',
    cd.id,
    'Capital One Travel Credit',
    300.00,
    'annual',
    12,
    'calendar',
    'Receive a $300 statement credit annually for travel bookings made through the Capital One Travel portal. This credit is flexible and can be applied to flights, hotels, and rental cars.',
    'Simply use your Venture X card to pay for a booking on the Capital One Travel portal. The credit is automatically applied as a statement credit to your account. The credit can be used in one go or across multiple bookings. Unused credit does not roll over past your card anniversary date. To maximize value, compare prices, as the portal offers price matching within 24 hours of booking.',
    'capitalOne',
    ARRAY['Travel']
FROM card_definitions cd WHERE cd.card_id = 'capital_one_venture_x'
ON CONFLICT (benefit_id) DO NOTHING;

-- Insert benefit definitions for Blue Cash Preferred
INSERT INTO benefit_definitions (benefit_id, card_definition_id, name, value, period, period_months, reset_type, description, redemption_instructions, app_scheme, categories) 
SELECT 
    'bcp_disney_bundle',
    cd.id,
    'Disney Bundle Credit',
    7.00,
    'monthly',
    1,
    'calendar',
    'Get a $7 statement credit each month after you spend $9.99 or more on an eligible subscription to The Disney Bundle. This can reduce the cost of subscriptions that include Disney+, Hulu, and ESPN+.',
    'You must first enroll in the benefit through your American Express online account. Then, use your Blue Cash Preferred card to pay for your monthly Disney Bundle subscription of $9.99 or more. The statement credit will be applied automatically. Unused credits do not roll over.',
    'disneyPlus',
    ARRAY['Bills & Utilities', 'Entertainment']
FROM card_definitions cd WHERE cd.card_id = 'blue_cash_preferred'
ON CONFLICT (benefit_id) DO NOTHING;

-- Insert benefit definitions for Delta SkyMiles Reserve
INSERT INTO benefit_definitions (benefit_id, card_definition_id, name, value, period, period_months, reset_type, description, redemption_instructions, app_scheme, categories) 
SELECT 
    'delta_resy',
    cd.id,
    'Resy Dining Credit',
    20.00,
    'monthly',
    1,
    'calendar',
    'Receive up to $20 in statement credits each month for eligible purchases at U.S. restaurants on Resy. This amounts to a total of up to $240 per calendar year.',
    'Enrollment is required through your American Express online account. After enrolling, use your Delta Reserve card to pay at eligible U.S. restaurants that offer reservations through Resy.com or the Resy app. The credit is applied automatically. Unused monthly credits do not roll over.',
    'resy',
    ARRAY['Dining']
FROM card_definitions cd WHERE cd.card_id = 'delta_reserve'
ON CONFLICT (benefit_id) DO NOTHING;

INSERT INTO benefit_definitions (benefit_id, card_definition_id, name, value, period, period_months, reset_type, description, redemption_instructions, app_scheme, categories) 
SELECT 
    'delta_rideshare',
    cd.id,
    'Rideshare Credit',
    10.00,
    'monthly',
    1,
    'calendar',
    'Get up to $10 in statement credits each month on U.S. rideshare purchases with select providers, totaling up to $120 per year.',
    'Enrollment is required via your Amex account. Use your card to pay for eligible U.S. rideshare services like Uber, Lyft, Curb, Revel, and Alto. The credit is applied automatically. Unused monthly credits are forfeited.',
    'uber',
    ARRAY['Transportation']
FROM card_definitions cd WHERE cd.card_id = 'delta_reserve'
ON CONFLICT (benefit_id) DO NOTHING;

INSERT INTO benefit_definitions (benefit_id, card_definition_id, name, value, period, period_months, reset_type, description, redemption_instructions, app_scheme, categories) 
SELECT 
    'delta_stays_credit',
    cd.id,
    'Delta Stays Credit',
    200.00,
    'annual',
    12,
    'calendar',
    'Receive up to $200 back annually on prepaid stays booked directly with Delta Stays.',
    'Book a prepaid stay of 2+ nights at deltastays.com using your Delta Reserve card. Statement credits post automatically within 8-12 weeks. Booking must be prepaid in full at time of reservation.',
    'delta',
    ARRAY['Travel', 'Lodging']
FROM card_definitions cd WHERE cd.card_id = 'delta_reserve'
ON CONFLICT (benefit_id) DO NOTHING;

-- Insert benefit definitions for American Express Green
INSERT INTO benefit_definitions (benefit_id, card_definition_id, name, value, period, period_months, reset_type, description, redemption_instructions, app_scheme, categories) 
SELECT 
    'green_clear',
    cd.id,
    'CLEAR Plus Credit Green',
    189.00,
    'annual',
    12,
    'calendar',
    'Receive up to $189 in statement credits per calendar year, enough to cover the full cost of a CLEAR Plus membership for expedited airport security.',
    'Simply use your American Express Green card to pay for your CLEAR Plus membership. The statement credit will be applied automatically to your account, typically within 6-8 weeks. To maximize this benefit, ensure CLEAR is available at airports you frequently use.',
    'clear',
    ARRAY['Travel', 'Flights']
FROM card_definitions cd WHERE cd.card_id = 'amex_green'
ON CONFLICT (benefit_id) DO NOTHING;

-- Insert benefit definitions for Bank of America Premium Rewards
INSERT INTO benefit_definitions (benefit_id, card_definition_id, name, value, period, period_months, reset_type, description, redemption_instructions, app_scheme, categories) 
SELECT 
    'boa_pr_airline_incidental',
    cd.id,
    'Airline Incidental Credit',
    100.00,
    'annual',
    12,
    'calendar',
    'Receive up to $100 in statement credits annually for qualifying airline incidental fees. This helps to significantly offset the annual fee.',
    'The credit is automatically applied to your statement when you use your card for qualifying fees. Qualifying charges include seat upgrades, checked baggage fees, in-flight food and entertainment, and airline lounge access fees. It does not cover tickets, award fees, mileage purchases, or gift cards. It is also important to note that charges from some airlines, like Spirit and Allegiant, may not qualify. The credit resets every calendar year.',
    'amex',
    ARRAY['Travel', 'Flights']
FROM card_definitions cd WHERE cd.card_id = 'boa_premium_rewards'
ON CONFLICT (benefit_id) DO NOTHING;

-- Insert benefit definitions for Bank of America Premium Rewards Elite
INSERT INTO benefit_definitions (benefit_id, card_definition_id, name, value, period, period_months, reset_type, description, redemption_instructions, app_scheme, categories) 
SELECT 
    'boa_pre_airline_incidental',
    cd.id,
    'Airline Incidental Credits',
    300.00,
    'annual',
    12,
    'calendar',
    'Up to $300 annually in statement credits for qualifying airline incidental fees. This credit helps substantially offset the annual fee.',
    'The credit is automatically applied to your statement for qualifying charges. Qualifying fees include seat upgrades, checked baggage, in-flight food and entertainment, and airline lounge day passes. It does not cover the cost of airfare, mileage purchases, or gift cards. The credit resets each calendar year.',
    'amex',
    ARRAY['Travel', 'Flights']
FROM card_definitions cd WHERE cd.card_id = 'boa_premium_rewards_elite'
ON CONFLICT (benefit_id) DO NOTHING;

INSERT INTO benefit_definitions (benefit_id, card_definition_id, name, value, period, period_months, reset_type, description, redemption_instructions, app_scheme, categories) 
SELECT 
    'boa_pre_lifestyle',
    cd.id,
    'Lifestyle Convenience Credits',
    150.00,
    'annual',
    12,
    'calendar',
    'Up to $150 annually in statement credits for lifestyle purchases. This flexible credit applies to a wide range of everyday services.',
    'Credits post automatically when you use your card for eligible purchases. Confirmed eligible services include food delivery (DoorDash, Grubhub), ride-hailing (Uber, Lyft), streaming (Netflix, Hulu, Disney+), and fitness subscriptions. Some services like YouTube TV and Audible have been reported by users as not qualifying. The credit resets each calendar year.',
    'uber',
    ARRAY['Shopping', 'Dining', 'Transportation', 'Fitness']
FROM card_definitions cd WHERE cd.card_id = 'boa_premium_rewards_elite'
ON CONFLICT (benefit_id) DO NOTHING;

-- Insert benefit definitions for U.S. Bank Altitude Reserve
INSERT INTO benefit_definitions (benefit_id, card_definition_id, name, value, period, period_months, reset_type, description, redemption_instructions, app_scheme, categories) 
SELECT 
    'usb_ar_travel_dining',
    cd.id,
    'Travel & Dining Credit',
    325.00,
    'annual',
    12,
    'calendar',
    'Receive up to $325 in automatic statement credits for purchases made directly from airlines, hotels, car rental companies, taxis, limousines, passenger trains, cruise lines, restaurants, takeout, and food delivery services.',
    'This is one of the easiest credits to use. Simply use your Altitude Reserve card for any eligible travel or dining purchase and the credits will be applied automatically until you reach the $325 maximum for your cardmember year. This benefit effectively reduces the annual fee to $75 if fully utilized.',
    'amex',
    ARRAY['Travel', 'Dining']
FROM card_definitions cd WHERE cd.card_id = 'usb_altitude_reserve'
ON CONFLICT (benefit_id) DO NOTHING;

-- Insert benefit definitions for Citi Prestige
INSERT INTO benefit_definitions (benefit_id, card_definition_id, name, value, period, period_months, reset_type, description, redemption_instructions, app_scheme, categories) 
SELECT 
    'citi_prestige_travel',
    cd.id,
    'Annual Travel Credit',
    250.00,
    'annual',
    12,
    'calendar',
    'Up to $250 in statement credits for travel purchases each year. This is a highly flexible credit that applies to a wide range of purchases coding as travel. IMPORTANT: The Citi Prestige card is no longer available to new applicants; this benefit is for existing cardholders.',
    'No activation is needed. Simply use your card for travel purchases, including airfare, hotels, car rentals, cruise lines, travel agencies, taxis, ride-hailing services, tolls, and parking. The credit is automatically applied to your statement until you have received the full $250. The benefit resets on January 1st each year.',
    'amex',
    ARRAY['Travel']
FROM card_definitions cd WHERE cd.card_id = 'citi_prestige'
ON CONFLICT (benefit_id) DO NOTHING;

-- Insert multi-choice perk configurations
INSERT INTO multi_choice_perk_configs (parent_perk_name, label, target_perk_name) VALUES
('Digital Entertainment Credit', 'Open Disney+', 'Disney+ Credit'),
('Digital Entertainment Credit', 'Open Hulu', 'Hulu Credit'),
('Digital Entertainment Credit', 'Open ESPN+', 'ESPN+ Credit'),
('Digital Entertainment Credit', 'Open Peacock', 'Peacock Credit'),
('Digital Entertainment Credit', 'Open NYTimes', 'NYTimes Credit'),
('Digital Entertainment Credit', 'Open Wall Street Journal', 'WSJ Credit'),
('Apple Services Credit', 'Open Apple TV+', 'Apple TV+ Credit'),
('Apple Services Credit', 'Open Apple Music', 'Apple Music Credit'),
('Uber Cash', 'Open Uber Rides', 'Uber Ride Credit'),
('Uber Cash', 'Open Uber Eats', 'Uber Eats Credit'),
('Dining Credit', 'Open Grubhub', 'Grubhub Credit'),
('Dining Credit', 'Open Resy', 'Resy Credit'),
('Dining Credit', 'View Other Options', 'Dining Info'),
('Lifestyle Convenience Credits', 'Open Uber', 'Uber Credit'),
('Lifestyle Convenience Credits', 'Open Lyft', 'Lyft Credit'),
('Lifestyle Convenience Credits', 'Open DoorDash', 'DoorDash Credit'),
('Lifestyle Convenience Credits', 'Open Grubhub', 'Grubhub Credit'),
('Lifestyle Convenience Credits', 'Open Hulu', 'Hulu Credit'),
('Lifestyle Convenience Credits', 'Open Disney+', 'Disney+ Credit'),
('Lifestyle Convenience Credits', 'Open Netflix', 'Netflix Credit'),
('Lifestyle Convenience Credits', 'Open Peloton', 'Peloton Credit'),
('Lifestyle Convenience Credits', 'Open Equinox', 'Equinox Credit'),
('Disney Bundle Credit', 'Open Disney+', 'Disney+ Credit'),
('Disney Bundle Credit', 'Open Hulu', 'Hulu Credit'),
('Disney Bundle Credit', 'Open ESPN+', 'ESPN+ Credit'),
-- Additional multi-choice configurations for Rideshare Credit
('Rideshare Credit', 'Open Uber', 'Uber Rideshare Credit'),
('Rideshare Credit', 'Open Lyft', 'Lyft Credit'),
('Rideshare Credit', 'Open Curb', 'Curb Credit'),
('Rideshare Credit', 'Open Revel', 'Revel Credit'),
('Rideshare Credit', 'Open Alto', 'Alto Credit')
ON CONFLICT DO NOTHING;

-- Insert eligible services for benefits
-- Amex Gold Grubhub+ benefit eligible services
INSERT INTO benefit_eligible_services (benefit_definition_id, service_name, service_url)
SELECT 
    bd.id,
    service.name,
    service.url
FROM benefit_definitions bd
CROSS JOIN (VALUES 
    ('Grubhub', 'https://www.grubhub.com/'),
    ('Five Guys', 'https://www.fiveguys.com/'),
    ('The Cheesecake Factory', 'https://www.thecheesecakefactory.com/'),
    ('Goldbelly', 'https://www.goldbelly.com/'),
    ('Wine.com', 'https://www.wine.com/'),
    ('Milk Bar', 'https://milkbarstore.com/')
) AS service(name, url)
WHERE bd.benefit_id = 'amex_gold_grubhub';

-- Digital Entertainment Credit eligible services
INSERT INTO benefit_eligible_services (benefit_definition_id, service_name, service_url)
SELECT 
    bd.id,
    service.name,
    service.url
FROM benefit_definitions bd
CROSS JOIN (VALUES 
    ('Audible', 'https://www.audible.com/'),
    ('Disney+', 'https://www.disneyplus.com/'),
    ('The Disney Bundle', 'https://www.disneyplus.com/'),
    ('ESPN+', 'https://www.espn.com/espnplus/'),
    ('Hulu', 'https://www.hulu.com/'),
    ('Peacock', 'https://www.peacocktv.com/'),
    ('The New York Times', 'https://www.nytimes.com/'),
    ('The Wall Street Journal', 'https://www.wsj.com/')
) AS service(name, url)
WHERE bd.benefit_id = 'platinum_digital_ent';

-- Rideshare Credit eligible services
INSERT INTO benefit_eligible_services (benefit_definition_id, service_name, service_url, app_deep_link)
SELECT 
    bd.id,
    service.name,
    service.url,
    service.deeplink
FROM benefit_definitions bd
CROSS JOIN (VALUES 
    ('Uber', 'https://www.uber.com/', 'uber://'),
    ('Lyft', 'https://www.lyft.com/', 'lyft://'),
    ('Curb', 'https://gocurb.com/', 'curb://'),
    ('Revel', 'https://gorevel.com/', 'revel://'),
    ('Alto', 'https://ridealto.com/', 'alto://')
) AS service(name, url, deeplink)
WHERE bd.benefit_id = 'delta_rideshare';

-- Lifestyle Convenience Credits eligible services
INSERT INTO benefit_eligible_services (benefit_definition_id, service_name, service_url)
SELECT 
    bd.id,
    service.name,
    service.url
FROM benefit_definitions bd
CROSS JOIN (VALUES 
    ('DoorDash', 'https://www.doordash.com/'),
    ('Grubhub', 'https://www.grubhub.com/'),
    ('Uber', 'https://www.uber.com/'),
    ('Lyft', 'https://www.lyft.com/'),
    ('Netflix', 'https://www.netflix.com/'),
    ('Hulu', 'https://www.hulu.com/'),
    ('Disney+', 'https://www.disneyplus.com/'),
    ('Peloton', 'https://www.onepeloton.com/'),
    ('Equinox', 'https://www.equinoxplus.com/')
) AS service(name, url)
WHERE bd.benefit_id = 'boa_pre_lifestyle'; 