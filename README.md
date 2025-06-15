# Credify: Your Smart Credit Card Companion 🚀

**Stop leaving money on the table. Credify is the ultimate app for tracking, managing, and maximizing your credit card benefits, ensuring you get every dollar of value from your annual fees.**

![1-portrait](https://github.com/user-attachments/assets/3c13b338-c85f-43d9-856f-0c534a8f9ada)

![2-left](https://github.com/user-attachments/assets/f036e115-bde7-4aa7-8f79-3636cbf191d3)

## What is Credify? 🤔

Are you juggling multiple credit cards with a dizzying array of perks? From monthly dining credits and streaming subscriptions to annual travel stipends, it's nearly impossible to keep track of it all. You're paying for these benefits through annual fees—it's time to start using them.

Credify is your intelligent command center for credit card perks. We make it effortless to:

* **See Everything in One Place:** Add your credit cards and instantly see a unified dashboard of all your available benefits—monthly, quarterly, and annual.
* **Never Miss a Deadline:** Get smart, customizable reminders before any perk expires. We'll notify you when it's time to use your credits.
* **Redeem with a Single Tap:** Our app deep-links directly to the merchant apps and websites you need (like Uber, Grubhub, and airline portals), so you can redeem and track perks in seconds.
* **Track Your ROI:** Watch your savings add up! Credify visualizes your progress toward breaking even on annual fees, showing you the real-time value you've redeemed.

---

### **Update: Version 1.1 Features (Released 06/15/2025)**

This release focuses on a more robust user experience, deeper insights, and seamless integration.

*   **Revamped Onboarding Experience:** A step-by-step wizard that guides you through adding your cards, setting renewal dates, and instantly showing your potential annual savings.
*   **Enhanced Dashboard:** A more intuitive interface to view, sort, and filter your perks by card, category, or expiration date.
*   **Social Logins:** Sign up and log in faster with support for Apple and Google accounts.
*   **Interactive UI:**
    *   **Draggable Card Lists:** Organize your cards in the dashboard exactly how you want them.
    *   **Context Menus:** Long-press on a perk or card for quick actions.
    *   **Modern Bottom Sheets:** A clean, native feel for menus and selection options.
*   **Deeper Insights:** The new 'Insights' tab provides more detailed analytics on your redemption habits and which cards are giving you the most value.

---

## Key Features ✨

* **Flexible Card Management:**
  * Add any credit card with annual fees
  * Set custom renewal dates and reminder preferences
  * Track multiple cards in one unified dashboard

* **Comprehensive Perk Tracking:**
  * View all benefits by category (dining, travel, entertainment, etc.)
  * Filter by timeframe (monthly, quarterly, semi-annual, annual)
  * Track redemption status and history

* **Intelligent Redemption System:**
  * One-tap deep linking to merchant apps and websites
  * Smart status tracking (Available, Pending, Redeemed)
  * Automatic redemption marking with manual override options

* **Progress & Analytics:**
  * Visual dashboards showing redemption progress and total savings
  * Annual fee break-even tracking
  * Card-by-card value comparison to identify your most valuable cards
  * Cumulative savings metrics over time

* **Customizable Notifications:**
  * Flexible reminder windows (3 days, 7 days, 1 day before deadlines)
  * Perk expiration alerts
  * Renewal date notifications
  * Custom notification preferences per card

* **Secure Authentication:**
  * Sign in with Email, Google, or Apple
  * Secure handling of all user data via Supabase

* **User Experience:**
  * Clean, intuitive interface
  * Dark/Light mode support
  * Haptic feedback
  * Celebration animations for redemptions
  * Progress visualizations

## Why Use Credify? 💰

* **Maximize Value:** Stop letting the benefits you pay for expire.
* **Save Time:** All your card perks, organized in one beautiful dashboard.
* **Stay Organized:** Smart notifications keep you on top of every deadline.
* **Redeem Effortlessly:** One tap to open the right app and track your usage.
* **Make Smarter Decisions:** See exactly which cards are providing the most value.
* **Break Even, Faster:** Visually track your progress toward offsetting your annual fees.

## Technology Stack 💻

Built with a modern, reliable, and scalable technology stack:

* **Frontend:**
  * React Native with Expo
  * TypeScript for type safety
  * Expo Router for file-based navigation
  * Lottie for smooth animations
  * **Moti & Reanimated:** for fluid, performant animations.

* **State Management:**
  * React Context for global state
  * Hooks for local state
  * Async Storage for persistence

* **Backend & Auth:**
  * Supabase for authentication, database, and real-time sync
  * Secure user data handling with social logins (Apple, Google)

* **Core Functionality:**
  * **Expo SDK:** Access to native device APIs like Haptics, Notifications, and Secure Storage.
  * **Deep Linking:** For seamless integration with other apps.
  * **Push Notifications:** For timely reminders and alerts.
  * **Analytics & Tracking:** To help you understand your benefits.

## Getting Started 🚀

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   ```
   Add your Supabase credentials to `.env`

3. **Start development:**
   ```bash
   npx expo start
   ```

4. **Run on device/simulator:**
   ```bash
   # iOS
   npx expo run:ios
   
   # Android
   npx expo run:android
   ```

## Contributing 🤝

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## License 📄

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

*Built with ❤️ by the Credify team* 
