-- Chase Sapphire Preferred: $50 Hotel Credit
UPDATE "public"."benefit_definitions"
SET "description" = 'Book a hotel through Chase Travel using your Sapphire Preferred; the first $50 of hotel charges will be automatically refunded. Credit resets every account anniversary.'
WHERE "benefit_id" = 'csp_hotel';

UPDATE "public"."benefit_definitions"
SET "redemption_instructions" = 'Credify Hack (Book, Credit, Cancel Method):
To convert this into a pure $50 statement credit, book a "Fully Refundable" hotel stay costing over $50 through the portal. Wait for the $50 credit to post to your account (typically 2-7 days), then cancel the refundable reservation. The hotel charge will be refunded, but the $50 credit will remain. This bypasses portal price inflation and loyalty program restrictions. Note: You will forgo earning 5x points on the $50 portion of the initial transaction.'
WHERE "benefit_id" = 'csp_hotel';

-- Chase Sapphire Preferred: $10 DoorDash Grocery Credit
UPDATE "public"."benefit_definitions"
SET "description" = 'Use your Preferred card to get a $10 monthly credit on non-restaurant orders from DoorDash (e.g., grocery, convenience stores). This benefit runs through 2027.'
WHERE "benefit_id" = 'csp_doordash_grocery';

UPDATE "public"."benefit_definitions"
SET "redemption_instructions" = 'Credify Pro Tip (Zero-Cost Redemption):
To avoid fees and prevent credit forfeiture from canceled orders, use the "Pickup" option. For maximum safety, travel to the store, confirm your items are in stock, and only then place the mobile order for immediate pickup. This eliminates cancellation risk due to out-of-stock items, which would cause you to lose the monthly credit.'
WHERE "benefit_id" = 'csp_doordash_grocery';

-- Marriott Bonvoy Brilliant: $25 Monthly Dining Credit
UPDATE "public"."benefit_definitions"
SET "description" = 'Use your Marriott Bonvoy Brilliant card for dining purchases worldwide and receive a statement credit of up to $25 each month ($300 annually).'
WHERE "benefit_id" = 'brilliant_dining';

UPDATE "public"."benefit_definitions"
SET "redemption_instructions" = 'Credify Strategy (Set It and Forget It):
To ensure you never miss a credit, set your Bonvoy Brilliant card as the default payment method in a food delivery app like Uber Eats, Grubhub, or DoorDash. These services reliably code as "Dining," automatically triggering the credit each month on your first $25 of spend and removing the risk of miscoding from restaurants inside hotels or other venues.'
WHERE "benefit_id" = 'brilliant_dining';

-- Marriott Bonvoy Brilliant: Annual Free Night Award (85k)
UPDATE "public"."benefit_definitions"
SET "description" = 'Receive one Free Night Award each year after your card renewal month, redeemable for a one-night stay at a Marriott Bonvoy hotel valued at or under 85,000 points. You can add up to 15,000 of your own points to redeem for a night costing up to 100,000 points.'
WHERE "benefit_id" = 'brilliant_free_night_award';

UPDATE "public"."benefit_definitions"
SET "redemption_instructions" = 'Credify Insider Tip (Maximize Cash Value):
Due to Marriott''s dynamic pricing, the night with the highest points cost may not be the night with the highest cash price. When booking a multi-night stay, analyze the nightly breakdown and apply your certificate to the night with the highest dollar value to maximize your savings, not necessarily the one costing the most points.'
WHERE "benefit_id" = 'brilliant_free_night_award';

-- Hilton Honors Aspire: $50 Quarterly Airline Flight Credit
UPDATE "public"."benefit_definitions"
SET "description" = 'Receive up to $50 back in statement credits each quarter for eligible flight purchases made directly with an airline or through amextravel.com (total $200/year).'
WHERE "benefit_id" = 'aspire_flight_credit';

UPDATE "public"."benefit_definitions"
SET "redemption_instructions" = 'Credify Hack (United TravelBank Conversion):
To avoid losing this "use-it-or-lose-it" credit, purchase $50 in United Airlines TravelBank cash each quarter. This transaction is recognized by Amex as a flight purchase, triggering the credit. This converts four expiring $50 credits into a flexible $200 fund with a five-year expiration date, which can be used to book any United flight.'
WHERE "benefit_id" = 'aspire_flight_credit';

-- Hilton Honors Aspire: $200 Semi-Annual Hilton Resort Credit
UPDATE "public"."benefit_definitions"
SET "description" = 'Get up to $200 in statement credits semi-annually (Jan-Jun and Jul-Dec) for eligible purchases made directly at participating Hilton Resorts, totaling up to $400 per year.'
WHERE "benefit_id" = 'aspire_hilton_resort_credit';

UPDATE "public"."benefit_definitions"
SET "redemption_instructions" = 'Credify Pro Move (Gift Card Conversion):
To liberate this credit from the restrictive resort list, find a participating resort that sells physical Hilton gift cards (e.g., the Hotel Del Coronado). Purchase a $200 gift card at the front desk using your Aspire card. Amex will see the qualifying resort charge and issue the credit, effectively converting the restricted credit into a flexible gift card usable at nearly any Hilton property worldwide.'
WHERE "benefit_id" = 'aspire_hilton_resort_credit';

-- Hilton Honors Aspire: Annual Free Night Reward
UPDATE "public"."benefit_definitions"
SET "description" = 'Receive one Free Night Reward each year after your Card renewal, valid for one standard room on any night of the week. To book, call Hilton or use the online chat feature for faster service.'
WHERE "benefit_id" = 'aspire_free_night';

UPDATE "public"."benefit_definitions"
SET "redemption_instructions" = 'Credify Optimization 1 ("Sixth Night Free" Stack):
For a 6-night stay, book 5 nights with points to get the 5th night free, then book a separate reservation for the 6th night using your certificate. Contact the hotel to link the reservations for a seamless stay with two free nights.

Credify Optimization 2 (Maximize Value):
Since the certificate is valid any night, check cash prices for your entire stay. Use the certificate on the most expensive night (e.g., a Tuesday in a business hub) to maximize its value, which may not be a weekend night.'
WHERE "benefit_id" = 'aspire_free_night';

-- Hilton Honors Aspire: CLEAR Plus Credit
UPDATE "public"."benefit_definitions"
SET "description" = 'Receive up to $189 in statement credits per calendar year for a CLEAR Plus membership. Pay for the membership with your Hilton Honors Aspire card, and the statement credit will be automatically applied.'
WHERE "benefit_id" = 'aspire_clear_plus_credit';

UPDATE "public"."benefit_definitions"
SET "redemption_instructions" = 'Credify Family Hack (Airline Discount + Family Stack):
To cover multiple people, first link your CLEAR account with Delta SkyMiles or United MileagePlus to get a discounted rate (e.g., $179). Pay with your Aspire card, then use the remaining credit balance to add a family member at a reduced rate, maximizing the full $189 credit across your family.'
WHERE "benefit_id" = 'aspire_clear_plus_credit';

-- Capital One Venture X: $300 Annual Travel Credit
UPDATE "public"."benefit_definitions"
SET "description" = 'Receive a $300 credit annually for travel bookings made through the Capital One Travel portal. The credit is applied automatically at checkout, reducing your purchase total.'
WHERE "benefit_id" = 'venturex_travel_credit';

UPDATE "public"."benefit_definitions"
SET "redemption_instructions" = 'Credify Freedom Hack (Airline-Direct Conversion):
To gain flexibility, book a flight costing at least $300 through the portal, applying the credit. After 24 hours, cancel the flight *directly with the airline* (not the portal). Most airlines will issue a future flight credit, converting your portal-locked credit into a more flexible airline voucher. Also, use the portal''s price match guarantee within 24 hours of booking to ensure you get the best price.'
WHERE "benefit_id" = 'venturex_travel_credit';

-- Blue Cash Preferred: Disney Bundle Credit
UPDATE "public"."benefit_definitions"
SET "description" = 'Get a $7 statement credit each month after you spend $9.99 or more on a Disney streaming service. Enrollment is required.'
WHERE "benefit_id" = 'bcp_disney_bundle';

UPDATE "public"."benefit_definitions"
SET "redemption_instructions" = 'Credify Decoder (The "$9.99+ from Disney" Rule):
The "Bundle" marketing is a suggestion, not a requirement. The credit is triggered by any single or combined charge of $9.99+ from DisneyPlus.com, Hulu.com, or Plus.espn.com. A standalone Hulu subscription or any other combination works. If your card is rejected by Disney''s site, pay via PayPal with your Blue Cash Preferred as the funding source to fix the glitch and receive the credit.'
WHERE "benefit_id" = 'bcp_disney_bundle';

-- American Express Gold: Resy Dining Credit
UPDATE "public"."benefit_definitions"
SET "description" = 'Book and dine at U.S. Resy partner restaurants to receive up to $50 in statement credits twice per year (Jan-Jun and Jul-Dec). The credit posts automatically after dining.'
WHERE "benefit_id" = 'amex_gold_resy';

UPDATE "public"."benefit_definitions"
SET "redemption_instructions" = 'Credify Hack 1 (Takeout & Walk-In):
You don''t need a reservation. The credit triggers on any charge from a listed Resy restaurant. Use the Resy app as a directory, then place a takeout order or pay in person.

Credify Hack 2 (Gift Card Conversion):
To bank the credit, purchase a digital gift card from a Resy partner restaurant that uses the Toast payment platform (toasttab.com). The charge codes as a direct restaurant purchase, triggering the credit and letting you use the value anytime.'
WHERE "benefit_id" = 'amex_gold_resy';

-- American Express Gold: Dunkin' Credit
UPDATE "public"."benefit_definitions"
SET "description" = 'Receive up to $7 in statement credits each month for Dunkin'' Donuts purchases in the U.S. when you spend $7 or more.'
WHERE "benefit_id" = 'amex_gold_dunkin';

UPDATE "public"."benefit_definitions"
SET "redemption_instructions" = 'Credify Banking Tip (App Reload Method):
To avoid losing the monthly credit, open the Dunkin'' app each month and reload your digital card with exactly $7 using your Gold card. This banks the value for later use. The accumulated balance can also be used at participating Baskin-Robbins locations.'
WHERE "benefit_id" = 'amex_gold_dunkin';

-- Chase Sapphire Reserve: The Edit by Chase Travel Credit
UPDATE "public"."benefit_definitions"
SET "description" = 'Receive a $250 statement credit for prepaid hotel bookings of at least two nights made through "The Edit by Chase Travel" portal. This benefit is available twice per year (Jan-Jun and Jul-Dec).'
WHERE "benefit_id" = 'csr_the_edit_credit_h1' OR "benefit_id" = 'csr_the_edit_credit_h2';

UPDATE "public"."benefit_definitions"
SET "redemption_instructions" = 'Credify Timing Hack:
The credit is triggered by the *charge date*, not the stay date. You can book a trip far in advance to use a credit before it expires. For example, in June, you can book a stay for October to utilize the Jan-Jun credit. Avoid "stay splitting" (booking consecutive 2-night stays) as the hotel will likely merge them, voiding the second on-site property credit.'
WHERE "benefit_id" = 'csr_the_edit_credit_h1' OR "benefit_id" = 'csr_the_edit_credit_h2';

-- Chase Sapphire Reserve: Exclusive Tables Dining Credit
UPDATE "public"."benefit_definitions"
SET "description" = 'Receive a $150 statement credit twice per year (Jan-Jun and Jul-Dec) for dining experiences at "Sapphire Reserve Exclusive Tables" restaurants.'
WHERE "benefit_id" = 'csr_dining_credit_h1' OR "benefit_id" = 'csr_dining_credit_h2';

UPDATE "public"."benefit_definitions"
SET "redemption_instructions" = 'Credify Reality Check:
This benefit is extremely limited. The list of participating restaurants is very small and concentrated in a few major cities. Before dining, you must verify the restaurant is on the specific "Exclusive Tables" list provided by Chase, not the broader Visa Dining Collection. No reservation is required; simply pay with your CSR at an eligible restaurant to trigger the credit.'
WHERE "benefit_id" = 'csr_dining_credit_h1' OR "benefit_id" = 'csr_dining_credit_h2';

-- Chase Sapphire Reserve: StubHub / viagogo Credit
UPDATE "public"."benefit_definitions"
SET "description" = 'Receive a $150 statement credit twice per year (Jan-Jun and Jul-Dec) for event tickets purchased through StubHub or viagogo. Benefit requires activation.'
WHERE "benefit_id" = 'csr_stubhub_credit_h1' OR "benefit_id" = 'csr_stubhub_credit_h2';

UPDATE "public"."benefit_definitions"
SET "redemption_instructions" = 'Credify Warning:
This credit functions as a discount, not free money. Due to high fees on the platform for both buying and selling, attempting to liquidate the credit by reselling tickets will result in a significant loss (often 25-30%). Best used only if you are an existing StubHub user who can offset the cost of a planned purchase.'
WHERE "benefit_id" = 'csr_stubhub_credit_h1' OR "benefit_id" = 'csr_stubhub_credit_h2';

-- Chase Sapphire Reserve: DoorDash Restaurant Credit ($5)
UPDATE "public"."benefit_definitions"
SET "description" = 'Receive a $5 monthly promo credit for an eligible DoorDash restaurant order. Requires complimentary DashPass enrollment.'
WHERE "benefit_id" = 'csr_doordash_restaurant';

UPDATE "public"."benefit_definitions"
SET "redemption_instructions" = 'Credify Value Maximizer (Pickup Imperative):
To maximize value, place a pickup order. This avoids all delivery fees, service fees, and driver tips, ensuring your $5 credit is applied directly to the cost of your food and not service charges.'
WHERE "benefit_id" = 'csr_doordash_restaurant';

-- Chase Sapphire Reserve: DoorDash Non-Restaurant Credit ($10 x2)
UPDATE "public"."benefit_definitions"
SET "description" = 'Receive two $10 monthly promo credits for eligible non-restaurant orders (e.g., grocery, convenience stores). Requires DashPass enrollment.'
WHERE "benefit_id" = 'csr_doordash_non_restaurant_1' OR "benefit_id" = 'csr_doordash_non_restaurant_2';

UPDATE "public"."benefit_definitions"
SET "redemption_instructions" = 'Credify Arbitrage Play (Convenience Store Arbitrage):
Use these credits for pickup orders at convenience or grocery stores like 7-Eleven or Wawa. This allows you to acquire snacks, drinks, or household items for little to no out-of-pocket cost, converting this benefit into a "sundries" credit. You may need to manually select the promo credit at checkout.'
WHERE "benefit_id" = 'csr_doordash_non_restaurant_1' OR "benefit_id" = 'csr_doordash_non_restaurant_2';

-- Chase Sapphire Reserve: Peloton Membership Credit
UPDATE "public"."benefit_definitions"
SET "description" = 'Receive up to $10 in monthly statement credits toward a Peloton All-Access, App+, or App One membership.'
WHERE "benefit_id" = 'csr_peloton_credit';

UPDATE "public"."benefit_definitions"
SET "redemption_instructions" = 'Credify Setup Alert:
The credit is only triggered if your membership is billed directly by Peloton. If your subscription is billed through a third party like the Apple App Store or Google Play Store, you are *ineligible* for the credit. You must log into your Peloton account and ensure your CSR is the direct payment method.'
WHERE "benefit_id" = 'csr_peloton_credit';

-- Chase Sapphire Reserve: Lyft Credit
UPDATE "public"."benefit_definitions"
SET "description" = 'Receive a $10 in-app Lyft ride credit each month. Add your Sapphire Reserve as the payment method in the Lyft app to activate.'
WHERE "benefit_id" = 'csr_lyft';

UPDATE "public"."benefit_definitions"
SET "redemption_instructions" = 'Credify Gotcha Alert:
The credit is not valid for Lyft bike or scooter rentals. To receive the credit, you must pay for the ride directly with your CSR card stored in the app. Paying via a digital wallet like Apple Pay or PayPal, even if linked to your CSR, will make the ride ineligible for the credit.'
WHERE "benefit_id" = 'csr_lyft';

-- Chase Sapphire Reserve: Apple Services Credit
UPDATE "public"."benefit_definitions"
SET "description" = 'Receive complimentary individual subscriptions to Apple TV+ and Apple Music by activating through your Chase account.'
WHERE "benefit_id" = 'csr_apple_subscriptions';

UPDATE "public"."benefit_definitions"
SET "redemption_instructions" = 'Credify Compatibility Check:
This benefit provides free *individual* subscriptions. It is incompatible with and provides no value against existing Apple One or Apple Music Family plans. To use it, you would need to cancel your bundle and repurchase other services a la carte, which is impractical for most users.'
WHERE "benefit_id" = 'csr_apple_subscriptions';

-- Delta SkyMiles Reserve: Resy Dining Credit
UPDATE "public"."benefit_definitions"
SET "description" = 'Receive up to $20 in statement credits each month for eligible purchases at U.S. restaurants on Resy. Enrollment is required.'
WHERE "benefit_id" = 'delta_resy';

UPDATE "public"."benefit_definitions"
SET "redemption_instructions" = 'Credify Pro Move (Gift Card Conversion):
To convert this monthly credit into a non-expiring balance, purchase a digital gift card from a Resy partner restaurant that uses the Toast payment platform (toasttab.com). The transaction reliably codes as a direct restaurant purchase, triggering the credit and allowing you to bank the value for a larger future meal.'
WHERE "benefit_id" = 'delta_resy';

-- Delta SkyMiles Reserve: Rideshare Credit
UPDATE "public"."benefit_definitions"
SET "description" = 'Get up to $10 in statement credits each month on U.S. rideshare purchases with select providers (Uber, Lyft, etc.). Enrollment is required.'
WHERE "benefit_id" = 'delta_rideshare';

UPDATE "public"."benefit_definitions"
SET "redemption_instructions" = 'Credify Advanced Play (Uber Eats Conversion):
To use this credit for food delivery, create an "Uber Family" profile and add a second person (P2). Set your Delta Reserve card as the default family payment method. When P2 orders from Uber Eats using this shared payment, the charge is often miscoded as "Rideshare," successfully triggering the credit.'
WHERE "benefit_id" = 'delta_rideshare';

-- Delta SkyMiles Reserve: Delta Stays Credit
UPDATE "public"."benefit_definitions"
SET "description" = 'Receive up to $200 back annually on prepaid hotel or vacation rental bookings made through the Delta Stays portal.'
WHERE "benefit_id" = 'delta_stays_credit';

UPDATE "public"."benefit_definitions"
SET "redemption_instructions" = 'Credify Price Guardian (Value Preservation Check):
The Delta Stays portal can have inflated prices that erode the value of the credit. Before booking, always perform a rigorous price comparison against the hotel''s direct website and other travel sites. Only book if the price is competitive to ensure the $200 credit is a true discount. Remember that these bookings typically don''t earn hotel loyalty points or status benefits.'
WHERE "benefit_id" = 'delta_stays_credit';

-- American Express Green: CLEAR Plus Credit
UPDATE "public"."benefit_definitions"
SET "description" = 'Receive up to $189 in statement credits per calendar year for a CLEAR Plus membership. Simply use your Amex Green card to pay for the membership, and the credit will be automatically applied.'
WHERE "benefit_id" = 'green_clear';

UPDATE "public"."benefit_definitions"
SET "redemption_instructions" = 'Credify Family Hack (Airline Discount + Family Stack):
To cover multiple people, first link your CLEAR account with a free loyalty account from Delta SkyMiles or United MileagePlus to get a discounted membership rate (e.g., $179). Pay with your Green card, then use the remaining credit balance from the $189 pool to add a family member at a reduced rate, maximizing the full credit.'
WHERE "benefit_id" = 'green_clear';

-- Bank of America Premium Rewards: Airline Incidental Credit
UPDATE "public"."benefit_definitions"
SET "description" = 'Receive a statement credit annually for qualifying airline incidental fees like checked baggage, seat upgrades, and lounge access. The credit is automatically applied, and unlike other cards, you do not have to pre-select a qualifying airline.'
WHERE "benefit_id" = 'boa_pre_airline_incidental';

UPDATE "public"."benefit_definitions"
SET "redemption_instructions" = 'Credify Hack (United TravelBank Conversion):
The most reliable way to convert this incidental credit into a direct airfare subsidy is to load funds into a **United Airlines TravelBank** account. These transactions are consistently reimbursed, effectively turning your credit into a flexible fund for future United flights.'
WHERE "benefit_id" = 'boa_pre_airline_incidental';

-- Bank of America Preferred Rewards: Airline Incidental Credit
UPDATE "public"."benefit_definitions"
SET "description" = 'Receive a statement credit annually for qualifying airline incidental fees like checked baggage, seat upgrades, and lounge access. The credit is automatically applied, and unlike other cards, you do not have to pre-select a qualifying airline.'
WHERE "benefit_id" = 'boa_pr_airline_incidental';

UPDATE "public"."benefit_definitions"
SET "redemption_instructions" = 'Credify Hack (United TravelBank Conversion):
The most reliable way to convert this incidental credit into a direct airfare subsidy is to load funds into a **United Airlines TravelBank** account. These transactions are consistently reimbursed, effectively turning your credit into a flexible fund for future United flights.'
WHERE "benefit_id" = 'boa_pr_airline_incidental';

-- US Bank Altitude Reserve: Travel and Dining Credit
UPDATE "public"."benefit_definitions"
SET "description" = 'Receive up to $325 in automatic statement credits for purchases made directly from airlines, hotels, car rentals, restaurants, takeout, and food delivery services.'
WHERE "benefit_id" = 'usb_ar_travel_dining';

UPDATE "public"."benefit_definitions"
SET "redemption_instructions" = 'Credify Simplicity Note (Effortless Redemption):
This "anti-hack" credit is designed for maximum simplicity. The list of eligible travel and dining merchants is so broad that the credit is consumed effortlessly through normal spending with no special effort or tracking required. Its value is in its certainty, effectively acting as an automatic reduction of the annual fee.'
WHERE "benefit_id" = 'usb_ar_travel_dining';