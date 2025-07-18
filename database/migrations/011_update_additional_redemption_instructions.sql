-- American Express Gold: Grubhub Credit
UPDATE "public"."benefit_definitions"
SET "redemption_instructions" = 'Credify Value Hack (Pickup + Price Guarantee):
Use for pickup orders to avoid delivery fees. To maximize value, use Grubhub''s "Lowest Price Guarantee" by submitting proof of lower in-store prices; you''ll get the difference refunded plus a $5 bonus credit for a future order.'
WHERE "benefit_id" = 'amex_gold_grubhub';

-- American Express Gold: Uber Cash
UPDATE "public"."benefit_definitions"
SET "redemption_instructions" = 'Credify Smart Play (Pickup Strategy):
Credit loads automatically as Uber Cash. To maximize its value, apply it to Uber Eats pickup orders to avoid delivery fees and tips. Ensure an Amex card is selected as the final payment method for the transaction.'
WHERE "benefit_id" = 'amex_gold_uber';

-- American Express Platinum: Uber Cash
UPDATE "public"."benefit_definitions"
SET "redemption_instructions" = 'Credify Stacking Hack (Combined Balance):
Credits from Platinum and Gold cards stack in one Uber Wallet. Maximize value by using the combined balance for Uber Eats pickup orders to avoid delivery fees. An Amex card must be selected as the final payment method.'
WHERE "benefit_id" = 'platinum_uber_cash';

-- American Express Platinum: Prepaid Hotel Credit
UPDATE "public"."benefit_definitions"
SET "redemption_instructions" = 'Credify Timing Master (Charge Date Strategy):
The credit is tied to the charge date, not the stay date. To use an expiring credit, make a prepaid Fine Hotels + Resorts or The Hotel Collection booking for a future date (even in the next calendar year) before December 31st.'
WHERE "benefit_id" = 'platinum_hotel_credit';

-- American Express Platinum: Saks Fifth Avenue Credit
UPDATE "public"."benefit_definitions"
SET "redemption_instructions" = 'Credify Gift Card Hack (Physical Only):
Although terms exclude them, purchasing a physical $50 gift card in-store has consistently triggered the credit. This allows you to bank the semi-annual credits for a larger future purchase. Online gift card purchases will not work.'
WHERE "benefit_id" = 'platinum_saks';

-- American Express Platinum: Airline Fee Credit
UPDATE "public"."benefit_definitions"
SET "redemption_instructions" = 'Credify Multi-Airline Strategy:
For United, buy TravelBank cash in $50-$100 increments. For Southwest, buy and cancel sub-$100 "Wanna Get Away" fares for flight credit. For Delta, pay for a ticket mostly with a gift card, charging the remainder to the Platinum.'
WHERE "benefit_id" = 'platinum_airline_fee';

-- American Express Platinum: CLEAR Plus Credit
UPDATE "public"."benefit_definitions"
SET "redemption_instructions" = 'Credify Discount Stack (Airline Link Strategy):
Don''t pay full price. Stack the $199 credit with a discounted rate by linking your United MileagePlus or Delta SkyMiles account. This can make your membership free and leave enough credit to add a family member at a reduced rate.'
WHERE "benefit_id" = 'platinum_clear';

-- American Express Platinum: Walmart+ Membership Credit
UPDATE "public"."benefit_definitions"
SET "redemption_instructions" = 'Credify Hidden Value (Paramount+ Included):
The credit only covers a monthly membership. Maximize value by activating the included Paramount+ Essential streaming subscription, a valuable perk even if you don''t use Walmart''s core delivery services.'
WHERE "benefit_id" = 'platinum_walmart_plus';

-- American Express Platinum: Equinox Credit
UPDATE "public"."benefit_definitions"
SET "redemption_instructions" = 'Credify Digital-Only Play (App Subscription):
Instead of a full gym membership, use the credit for the Equinox+ digital-only subscription. A Platinum-exclusive annual plan is available for exactly $300, making the app completely free after the statement credit is applied.'
WHERE "benefit_id" = 'platinum_equinox';

-- American Express Platinum: Digital Entertainment Credit
UPDATE "public"."benefit_definitions"
SET "redemption_instructions" = 'Credify Annual Subscription Hack (Black Friday Strategy):
Use one month''s $20 credit to pay for a discounted annual subscription, like Peacock during a Black Friday sale. This can cover the entire year and frees up the credit for the remaining 11 months for other eligible services.'
WHERE "benefit_id" = 'platinum_digital_ent';

-- Bank of America Premium Rewards Elite: Lifestyle Convenience Credits
UPDATE "public"."benefit_definitions"
SET "redemption_instructions" = 'Credify Banking Strategy (Uber Cash Conversion):
To avoid losing unused funds at year-end, purchase Uber Cash. This triggers the statement credit for the current year and effectively banks the value into your Uber account for future, non-expiring use on rides or Uber Eats.'
WHERE "benefit_id" = 'boa_pre_lifestyle';

-- Citi Prestige: Annual Travel Credit
UPDATE "public"."benefit_definitions"
SET "redemption_instructions" = 'Credify Effortless Note (No Hack Needed):
No hack is needed. This credit automatically applies to an extremely broad range of travel purchases (airfare, hotels, tolls, parking) with no portal requirement, making it one of the easiest credits to use through organic spending.'
WHERE "benefit_id" = 'citi_prestige_travel';