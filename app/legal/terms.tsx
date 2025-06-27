import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';

export default function TermsScreen() {
  const router = useRouter();
  
  const handleClose = () => {
    router.back();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <View style={styles.header}>
        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color="#666" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms & Privacy</Text>
        <View style={styles.closeButton} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* TERMS OF SERVICE */}
        <Text style={styles.title}>Terms of Service</Text>
        <Text style={styles.lastUpdated}>Last updated: May 30, 2025</Text>

        <Text style={styles.paragraph}>
          Welcome to Credify (&quot;the App,&quot; &quot;we,&quot; &quot;our,&quot; or &quot;us&quot;). By installing,
          accessing, or using Credify, you agree to be bound by these Terms of
          Service (&quot;Terms&quot;). If you do not agree to these Terms, you may not use
          the App.
        </Text>

        <Text style={styles.sectionTitle}>
          1. Eligibility and Account Registration
        </Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>1.1 Age Requirement.</Text> You must be at
          least 18 years old to use Credify. By registering, you represent and
          warrant that you are at least 18.
        </Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>1.2 Account Creation.</Text> To use Credify,
          you must create an account (&quot;Account&quot;) by providing a valid email
          address and password. You are responsible for maintaining the
          confidentiality of your login credentials and for all activities that
          occur under your Account. You agree to notify us immediately of any
          unauthorized use of your Account.
        </Text>

        <Text style={styles.sectionTitle}>
          2. App Features and User Obligations
        </Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>2.1 Perk Tracking.</Text> Credify allows you
          to manually import credit-card information (card names, annual fees,
          perk categories, etc.). You are solely responsible for the accuracy,
          currency, and completeness of all data you enter. We do not have
          direct access to your full credit-card account details (e.g., account
          numbers, balances, PINs, or full transaction history).
        </Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>2.2 Perk Information.</Text> We aggregate
          publicly available data and user-provided details about common
          credit-card perks. This information may become outdated or
          inaccurate. You acknowledge that you must verify all perk details
          (e.g., redemption amounts, categories, expiration windows) with your
          card issuer. We disclaim any liability for outdated or incorrect perk
          data.
        </Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>2.3 Notifications and Reminders.</Text>{' '}
          Credify can send you notifications for approaching perk expiration or
          renewal periods. You are responsible for configuring push
          notifications or email settings. We cannot guarantee you will receive
          alerts if you disable notifications on your device.
        </Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>2.4 One-Tap Redemption.</Text> When you tap
          a perk, Credify attempts to open the associated third-party app or
          website (e.g., Uber, Grubhub, airline portals, streaming services)
          and mark it as used. We do not control those third-party services and
          are not responsible if they fail to launch, load, or redeem correctly.
        </Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>2.5 Usage Prohibitions.</Text> You agree
          not to:
        </Text>
        <Text style={styles.bulletPoint}>
          • Use Credify for any illegal purpose or in violation of any local,
          state, national, or international law.
        </Text>
        <Text style={styles.bulletPoint}>
          • Reverse-engineer, decompile, or otherwise attempt to discover the
          source code or underlying structure of the App.
        </Text>
        <Text style={styles.bulletPoint}>
          • Interfere with, disrupt, or attempt to gain unauthorized access to
          any system, network, or user data.
        </Text>

        <Text style={styles.sectionTitle}>3. Intellectual Property</Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>3.1 Ownership.</Text> Credify and all its
          intellectual property—source code, designs, logos, graphics,
          trademarks, and content—are owned by us or our licensors. All rights
          are reserved. You may not copy, modify, distribute, sell, or resell
          any portion of the App without our express written permission.
        </Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>3.2 User Content.</Text> Any data you enter
          (e.g., card nicknames, notes, custom categories) remains yours. By
          submitting User Content, you grant us a non-exclusive, worldwide,
          royalty-free license to use, reproduce, and display that content
          solely to provide and improve the App.
        </Text>

        <Text style={styles.sectionTitle}>4. Payment and Subscription</Text>
        <Text style={styles.paragraph}>
          Credify may offer both a free tier with basic features and a Premium
          subscription with advanced capabilities (e.g., customizable alerts,
          detailed analytics). Pricing, trial periods, and feature differences
          will be displayed within the App.
        </Text>
        <Text style={styles.paragraph}>
          If you subscribe to a paid plan, payment is processed through your
          device&apos;s App Store (iOS) or Google Play (Android). All billing
          inquiries, refunds, and disputes must be directed to the respective
          platform provider in accordance with their terms.
        </Text>
        <Text style={styles.paragraph}>
          Paid subscriptions (monthly or annual) automatically renew unless
          canceled at least 24 hours before the end of the current period. To
          cancel, follow instructions in your device&apos;s App Store or Google Play
          account settings.
        </Text>

        <Text style={styles.sectionTitle}>
          5. Disclaimer of Warranties
        </Text>
        <Text style={styles.paragraph}>
          THE APP IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF
          ANY KIND, EXPRESS OR IMPLIED. WE DISCLAIM ALL WARRANTIES, INCLUDING,
          BUT NOT LIMITED TO, MERCHANTABILITY, FITNESS FOR A PARTICULAR
          PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE APP WILL BE
          ERROR-FREE, UNINTERRUPTED, OR COMPLETELY SECURE.
        </Text>

        <Text style={styles.sectionTitle}>6. Limitation of Liability</Text>
        <Text style={styles.paragraph}>
          TO THE FULLEST EXTENT PERMITTED BY LAW, IN NO EVENT WILL CREDIFY (OR
          ITS PARENT, AFFILIATES, OFFICERS, DIRECTORS, EMPLOYEES, OR LICENSORS)
          BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR
          PUNITIVE DAMAGES. OUR MAXIMUM LIABILITY FOR ANY CLAIM ARISING FROM OR
          RELATED TO THESE TERMS OR THE APP SHALL NOT EXCEED THE AMOUNTS YOU PAID
          (IF ANY) TO USE THE APP IN THE 12 MONTHS PRIOR TO THE CLAIM.
        </Text>

        <Text style={styles.sectionTitle}>7. Indemnification</Text>
        <Text style={styles.paragraph}>
          You agree to indemnify, defend, and hold harmless Credify and its
          affiliates, officers, directors, employees, and agents from any
          claims, liabilities, losses, damages, and expenses (including
          reasonable attorneys&apos; fees) arising from or related to your use of
          the App, your violation of these Terms, or your infringement of any
          third-party rights.
        </Text>

        <Text style={styles.sectionTitle}>8. Termination</Text>
        <Text style={styles.paragraph}>
          We may suspend or terminate your Account and access to the App at our
          sole discretion, with or without notice, for any conduct that we
          determine violates these Terms or is harmful to other users or
          Credify. Upon termination, all rights granted to you under these
          Terms will immediately cease.
        </Text>

        <Text style={styles.sectionTitle}>
          9. Governing Law and Dispute Resolution
        </Text>
        <Text style={styles.paragraph}>
          These Terms shall be governed by and construed under the laws of the
          State of California, without regard to its conflict-of-law provisions.
          Any dispute arising out of or relating to these Terms or the App
          shall be resolved through binding arbitration in San Francisco County,
          California, under the rules of the American Arbitration Association.
        </Text>

        <Text style={styles.sectionTitle}>10. Changes to These Terms</Text>
        <Text style={styles.paragraph}>
          We may update these Terms from time to time. When we do, we will
          revise the &quot;Last updated&quot; date above and post the new Terms within the
          App. If you continue using the App after we post changes, you accept
          the revised Terms.
        </Text>

        <Text style={styles.sectionTitle}>11. Contact Us</Text>
        <Text style={styles.paragraph}>
          If you have any questions about these Terms, please contact us at:
        </Text>
        <Text style={styles.bulletPoint}>
          • Email: support@credifyapp.com
        </Text>
        <Text style={styles.bulletPoint}>
          • Address: Credify, Inc. • 1234 Market St, San Francisco, CA 94103
        </Text>

        {/* PRIVACY POLICY */}
        <Text style={[styles.title, { marginTop: 32 }]}>
          Privacy Policy
        </Text>
        <Text style={styles.lastUpdated}>Last updated: May 30, 2025</Text>

        <Text style={styles.paragraph}>
          Credify (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) values your privacy. This Privacy Policy
          explains what information we collect, how we use it, and what choices
          you have regarding your information when you use Credify (the &quot;App&quot;).
          By downloading or using the App, you agree to the terms of this
          Privacy Policy.
        </Text>

        <Text style={styles.sectionTitle}>1. Information We Collect</Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>1.1 User-Provided Information</Text>
          {'\n'}• <Text style={styles.bold}>Account Registration Data:</Text> When
          you sign up, you provide a valid email address and create a password.
          {'\n'}• <Text style={styles.bold}>Credit-Card Metadata:</Text> You
          manually input card nicknames, issuer names (e.g., &quot;Chase Sapphire
          Reserve&quot;), annual-fee amounts, and perk categories (e.g., &quot;Airline
          Credits,&quot; &quot;Dining Credits,&quot; &quot;Lounge Passes&quot;).
          {'\n'}• <Text style={styles.bold}>Perk Usage and Settings:</Text> Which
          perks you track, your custom expiration periods (monthly, quarterly,
          etc.), reminder preferences (e.g., &quot;Notify me 3 days before&quot;), and
          notes you add.
          {'\n'}• <Text style={styles.bold}>Device Information:</Text> Device
          type, operating system version, and unique device identifiers (for
          push-notification delivery).
        </Text>

        <Text style={styles.sectionTitle}>
          1.2 Automatically Collected Information
        </Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>Usage Analytics:</Text> We automatically
          record how you interact with the App—screens viewed, features used
          (e.g., tapping &quot;Uber Credit&quot; to open the Uber app), session length,
          crash reports, and performance metrics.{' '}
          {'\n'}<Text style={styles.bold}>Log Data:</Text> We collect log files
          including your IP address, device event information (e.g., crashes,
          system activity), and the date/time stamps of your requests.
        </Text>

        <Text style={styles.sectionTitle}>
          1.3 Third-Party Integration Data
        </Text>
        <Text style={styles.paragraph}>
          When you use one-tap redemption (opening a third-party app or
          website), Credify does not collect additional personal data from that
          third-party. However, your device&apos;s operating system may share
          minimal context (e.g., app open event) to enable deep linking
          functionality.
        </Text>

        <Text style={styles.sectionTitle}>2. How We Use Your Information</Text>
        <Text style={styles.paragraph}>
          We use the information we collect to:
        </Text>
        <Text style={styles.bulletPoint}>
          • <Text style={styles.bold}>Provide Core Features:</Text> Display your
          card perks, set reminders, open associated apps, and show redemption
          progress.
        </Text>
        <Text style={styles.bulletPoint}>
          • <Text style={styles.bold}>Improve the App:</Text> Analyze usage
          patterns, diagnose technical issues, and prioritize new features or
          bug fixes.
        </Text>
        <Text style={styles.bulletPoint}>
          • <Text style={styles.bold}>Communicate with You:</Text> Send push
          notifications, email updates, or customer support responses (e.g.,
          password resets, account alerts).
        </Text>
        <Text style={styles.bulletPoint}>
          • <Text style={styles.bold}>Personalize Your Experience:</Text> Remember
          your settings (cards added, reminder preferences, custom notes), and
          suggest optimizations (e.g., &quot;You&apos;re 75% toward recouping your annual
          fee on Card X this quarter&quot;).
        </Text>

        <Text style={styles.sectionTitle}>3. Data Retention</Text>
        <Text style={styles.paragraph}>
          We will retain your Account information, card metadata, perk usage,
          and device identifiers as long as your Account is active. If you
          delete your Account (via the &quot;Delete Account&quot; option in Settings or
          by contacting support@credifyapp.com), we will permanently delete your
          data within 30 days, except where retention is required by law or for
          legitimate business purposes (e.g., fraud prevention).
        </Text>

        <Text style={styles.sectionTitle}>4. Sharing Your Information</Text>
        <Text style={styles.paragraph}>
          We do <Text style={styles.bold}>not</Text> rent, sell, or share your
          personal information to third parties for marketing purposes. We may
          share your data in the following limited circumstances:
        </Text>
        <Text style={styles.bulletPoint}>
          • <Text style={styles.bold}>Service Providers and Contractors:</Text>{' '}
          We work with trusted vendors who help us deliver the App—hosting
          providers, analytics services, push-notification services. These
          parties only receive data necessary to perform their functions and
          are contractually bound to keep your information confidential.
        </Text>
        <Text style={styles.bulletPoint}>
          • <Text style={styles.bold}>Legal Compliance and Protection of
          Rights:</Text> We may disclose your information if required by law
          (e.g., in response to a subpoena, court order, or governmental
          investigation), or if we believe disclosure is necessary to protect
          our rights, the safety of others, or to investigate fraud.
        </Text>
        <Text style={styles.bulletPoint}>
          • <Text style={styles.bold}>Business Transfers:</Text> If Credify is
          acquired, merges with another entity, or sells substantially all its
          assets, your data may be transferred as part of that transaction. We
          will notify you before such a transfer takes effect.
        </Text>

        <Text style={styles.sectionTitle}>
          5. Cookies and Tracking Technologies
        </Text>
        <Text style={styles.paragraph}>
          Credify does not use traditional browser cookies (since it is a native
          mobile app). However, we do use:
        </Text>
        <Text style={styles.bulletPoint}>
          • <Text style={styles.bold}>Device Identifiers</Text> (IDFA on iOS,
          Advertising ID on Android) strictly for analytics and push-notification
          attribution, unless you opt out via your device settings.
        </Text>
        <Text style={styles.bulletPoint}>
          • <Text style={styles.bold}>Local Storage:</Text> On your device to
          store your app preferences, custom settings, and session state.
        </Text>

        <Text style={styles.sectionTitle}>
          6. Third-Party Analytics and SDKs
        </Text>
        <Text style={styles.paragraph}>
          We may embed third-party analytics SDKs (e.g., Firebase, Google
          Analytics for Firebase) to measure app performance and user
          engagement. These providers may collect usage data (e.g., screens
          viewed, session duration) and device properties. You can opt out of
          certain analytics tracking through your device&apos;s privacy controls.
        </Text>

        <Text style={styles.sectionTitle}>7. Data Security</Text>
        <Text style={styles.paragraph}>
          We take reasonable technical and organizational measures to protect
          your data from unauthorized access, alteration, or destruction. These
          measures include industry-standard encryption (in transit) and secure
          data-storage practices. However, no method of transmission or storage
          is 100% secure. We cannot guarantee absolute security.
        </Text>

        <Text style={styles.sectionTitle}>8. Children&apos;s Privacy</Text>
        <Text style={styles.paragraph}>
          Credify is not intended for children under 13. We do not knowingly
          collect or maintain personal information from users under 13. If we
          learn that we have collected data from a child under 13, we will
          promptly delete that information.
        </Text>

        <Text style={styles.sectionTitle}>
          9. Your Privacy Choices and Rights
        </Text>
        <Text style={styles.paragraph}>
          • <Text style={styles.bold}>Access and Update: </Text>You can review
          or update some of your Account information through the App&apos;s Settings.
          To delete your Account and data, contact us at
          support@credifyapp.com.{'\n'}
          • <Text style={styles.bold}>Push Notifications:</Text> You may opt
          out of push notifications by adjusting your device&apos;s notification
          settings.{'\n'}
          • <Text style={styles.bold}>Analytics Opt-Out:</Text> To opt out of
          personalized analytics, disable analytics permissions in your device&apos;s
          privacy settings or uninstall the App.{'\n'}
          • <Text style={styles.bold}>GDPR/CCPA Rights (If Applicable):</Text>{' '}
          You may request a copy of your personal data, request deletion of your
          data, request correction of inaccurate information, request that we
          limit processing, or request an export of your data. California
          residents may also ask that we not sell their data (we do not sell
          data for monetary consideration). To exercise any of these rights,
          email us at support@credifyapp.com.
        </Text>

        <Text style={styles.sectionTitle}>
          10. Third-Party Links and Services
        </Text>
        <Text style={styles.paragraph}>
          Credify may provide links to third-party websites or apps (e.g., to
          redeem perks). We do not control those services and are not responsible
          for their privacy practices or content. Please review the privacy
          policies of those third parties before sharing any personal
          information with them.
        </Text>

        <Text style={styles.sectionTitle}>11. International Users</Text>
        <Text style={styles.paragraph}>
          If you access Credify from outside the United States, please be aware
          that your information may be transferred to and processed in the
          United States, where data-protection laws may be different or less
          protective than in your country. By using the App, you consent to such
          transfers.
        </Text>

        <Text style={styles.sectionTitle}>
          12. Changes to This Privacy Policy
        </Text>
        <Text style={styles.paragraph}>
          We may update this Privacy Policy from time to time. When we do, we
          will revise the &quot;Last updated&quot; date above and post the revised policy
          within the App and on our website. If you continue using the App after
          we post changes, you accept the updated Privacy Policy.
        </Text>

        <Text style={styles.sectionTitle}>13. Contact Us</Text>
        <Text style={styles.paragraph}>
          If you have any questions or concerns about this Privacy Policy,
          please contact us at:
        </Text>
        <Text style={styles.bulletPoint}>
          • Email: privacy@credifyapp.com
        </Text>
        <Text style={styles.bulletPoint}>
          • Address: Credify, Inc. • 1234 Market St, San Francisco, CA 94103
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ccc',
    backgroundColor: '#f9f9f9',
  },
  closeButton: {
    width: 24,
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 4,
    color: '#222',
  },
  lastUpdated: {
    fontSize: 12,
    color: '#666',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 6,
    color: '#333',
  },
  paragraph: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
    color: '#444',
  },
  bulletPoint: {
    fontSize: 14,
    lineHeight: 20,
    marginLeft: 12,
    marginBottom: 8,
    color: '#444',
  },
  bold: {
    fontWeight: '600',
  },
}); 