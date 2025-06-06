import React from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, Linking } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../constants/Colors'; // Adjust path as needed

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
      question: 'How do I add my first credit card?',
      answer: 'Navigate to the "Cards" tab (second icon in the bottom bar). Tap the "Add New Card" button or the plus icon in the header. Search for your card provider and select your specific card. Follow the prompts to add it to your wallet.',
    },
    {
      question: 'How does perk tracking work?',
      answer: 'The app helps you track perks associated with your added cards. For most perks, you&apos;ll need to manually mark them as "Redeemed" once you&apos;ve used them. Some perks might offer an "Auto-Redeem" option if they are credits you use consistently each cycle (e.g., monthly streaming credits). You can usually open the relevant app directly from a perk item by tapping on it.',
    },
    {
      question: 'How do I mark a perk as redeemed or available?',
      answer: 'From the Dashboard, expand the card to see its perks. You can swipe a perk to the right to mark it as "Redeemed", or swipe left to mark it as "Available". Alternatively, tapping a perk will open a modal with options to open the associated app, mark as redeemed, or mark as available.',
    },
    {
      question: 'What notifications does the app send?',
      answer: 'The app can send reminders for perk expiry (e.g., 7 days before a monthly perk resets) and for card renewal dates if you&apos;ve set them up. Notification preferences can be managed in the Card settings.',
    },
    {
      question: 'My donut display or perk values are not updating immediately. What should I do?',
      answer: 'If you notice data not updating right away after an action, try pulling down to refresh the screen on the Dashboard. If the issue persists, navigating away from the Dashboard tab and back to it can also trigger a data refresh. We are continuously working to improve real-time updates!',
    },
     {
      question: 'How do I edit or remove a card?',
      answer: 'Go to the "Cards" tab. Tap on the card you wish to manage. You should see options to edit its details (like nickname or notification preferences) or remove the card entirely.',
    },
    {
      question: 'Can I customize notification reminders?',
      answer: 'Yes, for perk expiry reminders, you can typically set how many days in advance you want to be notified. These settings are usually found when editing a specific card in the "Cards" tab.',
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ title: 'Help & FAQ' }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <View style={styles.headerSection}>
          <Ionicons name="help-buoy-outline" size={48} color={Colors.light.tint} />
          <Text style={styles.title}>Help & FAQ</Text>
          <Text style={styles.subtitle}>
            Find answers to common questions about using Credify. If you can&apos;t find what you&apos;re looking for, feel free to reach out to our support.
          </Text>
        </View>

        {faqs.map((faq, index) => (
          <FAQItem key={index} question={faq.question} answer={faq.answer} />
        ))}

        <View style={styles.supportSection}>
          <Text style={styles.supportTitle}>Still Need Help?</Text>
          <Text style={styles.supportText}>
            If your question isn&apos;t answered here, please don&apos;t hesitate to contact our support team.
          </Text>
          <TouchableOpacity style={styles.contactButton} onPress={() => Linking.openURL('mailto:support@example.com?subject=CredifyApp%20Support')}>
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
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: FauxColors.textSecondary, // Using fallback
    textAlign: 'center',
    lineHeight: 22,
  },
  faqItemContainer: {
    backgroundColor: FauxColors.cardBackground, // Using fallback
    borderRadius: 12,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: FauxColors.borderColor, // Using fallback
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
    color: FauxColors.textSecondary, // Using fallback
    lineHeight: 22,
  },
  supportSection: {
    marginTop: 32,
    padding: 20,
    backgroundColor: FauxColors.cardBackground, // Using fallback
    borderRadius: 12,
    borderWidth: 1,
    borderColor: FauxColors.borderColor, // Using fallback
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
    color: FauxColors.textSecondary, // Using fallback
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