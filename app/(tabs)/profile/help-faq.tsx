import React from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, Linking } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../constants/Colors';
import BackButton from '../../../components/ui/BackButton';

// Fallback colors - ideally, add these to your Colors.ts
const FauxColors = {
  textSecondary: '#6c757d',
  cardBackground: '#ffffff',
  borderColor: '#dee2e6',
};

interface FAQItemProps {
  question: string;
  answer: string;
}

const FAQItem: React.FC<FAQItemProps> = ({ question, answer }) => {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <View style={styles.faqItemContainer}>
      <TouchableOpacity style={styles.questionContainer} onPress={() => setIsOpen(!isOpen)} activeOpacity={0.7}>
        <Text style={styles.questionText}>{question}</Text>
        <Ionicons name={isOpen ? 'chevron-up-outline' : 'chevron-down-outline'} size={20} color={Colors.light.text} />
      </TouchableOpacity>
      {isOpen && (
        <View style={styles.answerContainer}>
          <Text style={styles.answerText}>{answer}</Text>
        </View>
      )}
    </View>
  );
};

export default function HelpFAQScreen() {
  const router = useRouter();

  const faqs = [
    {
      question: 'How do I use swipe gestures on perks?',
      answer: 'Credify uses intuitive swipe gestures to quickly manage your perks:\n\n• Swipe RIGHT on available perks → Mark as used/redeemed\n• Swipe LEFT on redeemed perks → Mark as available (undo)\n\nEach swipe reveals action buttons that you can tap. You can also tap any perk to see all available actions in a detailed view.',
    },
    {
      question: 'What is Credify and how does it work?',
      answer: 'Credify is your AI-powered command center for credit card perks. It helps you track, manage, and maximize your credit card benefits in one place. The app shows a unified dashboard of all your available benefits—monthly, quarterly, and annual—and helps ensure you get every dollar of value from your annual fees.',
    },
    {
      question: 'How do I add my first credit card?',
      answer: 'Our step-by-step onboarding wizard will guide you through adding your first card. You can also:\n\n1. Go to Profile > Manage Cards\n2. Tap the "+" icon in the top right\n3. Search for your card provider and select your specific card\n4. Set your card\'s renewal date\n5. Configure any auto-redemption preferences for recurring perks',
    },
    {
      question: 'How does the AI Assistant work?',
      answer: 'The AI Assistant is your personal financial advisor. You can:\n\n- Ask questions about your card benefits\n- Get personalized advice on which card to use\n- Receive summaries of your spending habits\n- Get help understanding complex perks\n\nJust tap the chat icon on your dashboard to start a conversation.',
    },
    {
      question: 'How do I track and redeem perks?',
      answer: 'Credify makes perk tracking and redemption easy:\n\n1. Dashboard View: See all your cards and available perks\n2. One-Tap Redemption: Tap a perk to:\n   - Open the associated merchant app\n   - Mark as redeemed\n   - Set partial redemption amounts\n3. Auto-Redemption: Set up automatic tracking for recurring perks\n4. Progress Tracking: Watch your savings add up in real-time\n5. Smart Notifications: Get reminders before perks expire',
    },
    {
      question: 'What insights and analytics are available?',
      answer: 'The Insights tab provides detailed analytics including:\n\n- 6-month history of perk redemptions\n- ROI leaderboard showing your best-performing cards\n- Category-based spending analysis\n- Progress toward breaking even on annual fees\n- Monthly and yearly savings summaries',
    },
    {
      question: 'How do notifications work?',
      answer: 'You can customize various notification types in Profile > Notification Preferences:\n\n- Perk expiry reminders (7, 3, and 1 day before)\n- Card renewal alerts\n- Monthly perk reset reminders\n- Weekly digest of available perks\n- Quarterly and annual perk summaries',
    },
    {
      question: 'How do I manage my cards?',
      answer: 'Go to Profile > Manage Cards to:\n\n- Add new cards\n- Reorder cards by dragging\n- Update renewal dates\n- Configure auto-redemptions\n- Remove cards\n\nYou can also quickly access card management from the dashboard by tapping the card icon.',
    },
    {
      question: 'How is my ROI calculated?',
      answer: 'Credify tracks your return on investment by:\n\n1. Monitoring all redeemed perks\n2. Calculating the actual value received\n3. Comparing against your annual fees\n4. Showing progress toward breaking even\n\nView detailed ROI analytics in the Insights tab.',
    },
    {
      question: 'What if I need to undo a redemption?',
      answer: 'To undo a redemption:\n\n1. Tap the perk to open the action modal\n2. Select "Mark as Available"\n\nOr, if you just redeemed it:\n- Tap the undo button in the toast notification that appears',
    },
    {
      question: 'Is my data secure?',
      answer: 'Yes! Credify takes security seriously:\n\n- All data is encrypted\n- We use secure social logins (Apple, Google)\n- We never store your actual credit card numbers\n- You can enable biometric authentication\n- Your chat history with the AI assistant is private',
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ title: 'Help & FAQ', headerShown: true, headerLeft: () => <BackButton label="Profile" /> }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {faqs.map((faq, index) => (
          <FAQItem key={index} question={faq.question} answer={faq.answer} />
        ))}

        <View style={styles.supportSection}>
          <Text style={styles.supportTitle}>Still Need Help?</Text>
          <Text style={styles.supportText}>
            If your question isn&apos;t answered here, please don&apos;t hesitate to contact our support team.
          </Text>
          <TouchableOpacity 
            style={styles.contactButton} 
            onPress={() => Linking.openURL('mailto:ronneydo1@gmail.com?subject=CredifyApp%20Support')}
          >
            <Text style={styles.contactButtonText}>Contact Support</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingVertical: 24,
    paddingHorizontal: 16,
    paddingBottom: 80,
  },
  faqItemContainer: {
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.light.separator,
    overflow: 'hidden',
  },
  questionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  questionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginRight: 8,
  },
  answerContainer: {
    paddingTop: 8,
    paddingBottom: 12,
  },
  answerText: {
    fontSize: 15,
    color: Colors.light.secondaryLabel,
    lineHeight: 22,
  },
  supportSection: {
    marginTop: 32,
    padding: 20,
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.separator,
    alignItems: 'center',
  },
  supportTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: 12,
  },
  supportText: {
    fontSize: 16,
    color: Colors.light.secondaryLabel,
    textAlign: 'center',
    lineHeight: 23,
    marginBottom: 20,
  },
  contactButton: {
    backgroundColor: Colors.light.tint,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
}); 