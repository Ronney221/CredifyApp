import React from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, Linking } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../constants/Colors';

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
      answer: 'Go to the "Cards" tab and tap the "+" icon in the top right. Search for your card provider and select your specific card. You&apos;ll be prompted to set up your card&apos;s renewal date and any auto-redemption preferences for recurring perks.',
    },
    {
      question: 'How does the Dashboard work?',
      answer: 'The Dashboard shows an overview of all your cards and their perks. The donut chart displays your available and redeemed perks for the current period. You can tap on any card to expand it and see detailed perk information. The action pill at the top highlights perks that need your attention.',
    },
    {
      question: 'How do I track my perks?',
      answer: 'There are several ways to track perks:\n\n1. Tap a perk to open a modal with options to:\n   - Open the associated app\n   - Mark as redeemed\n   - Mark as available\n\n2. Use auto-redemption for recurring perks like monthly credits\n\n3. Set up notifications for perk expiry reminders\n\nThe app will automatically track your savings and show them in the Dashboard.',
    },
    {
      question: 'What are auto-redemptions?',
      answer: 'Auto-redemption is a feature that automatically marks certain perks as redeemed at the start of each cycle. This is perfect for recurring credits like monthly streaming credits or dining credits. You can set up auto-redemption when adding a card or by editing an existing card&apos;s perks.',
    },
    {
      question: 'How do I manage my card renewal dates?',
      answer: 'When adding a card, you&apos;ll be prompted to set its renewal date. You can update this later by going to the "Cards" tab, tapping on the card, and selecting "Edit". Setting renewal dates helps us track your annual fee and send timely reminders.',
    },
    {
      question: 'What notifications will I receive?',
      answer: 'The app can send you:\n\n- Perk expiry reminders (configurable: 7, 3, and 1 day before expiry)\n- Card renewal reminders\n- Weekly digest of available perks\n- Monthly summary of your savings\n\nYou can manage these in your notification settings.',
    },
    {
      question: 'How do I edit or remove a card?',
      answer: 'Go to the "Cards" tab and tap on the card you want to manage. You can:\n\n- Edit card details\n- Set up auto-redemptions\n- Configure notifications\n- Remove the card\n\nTo remove a card, tap "Edit" in the top left, then tap the remove button on the card.',
    },
    {
      question: 'How is my savings calculated?',
      answer: 'The app tracks the value of perks you&apos;ve redeemed and displays your total savings in the Dashboard. This includes:\n\n- Redeemed perks (manually or auto-redeemed)\n- Partially redeemed perks\n- Perks with pending redemption\n\nThe savings are calculated per card and shown in the expanded card view.',
    },
    {
      question: 'What if I need to undo a redemption?',
      answer: 'If you accidentally mark a perk as redeemed, you can:\n\n1. Tap the perk to open the action modal\n2. Select "Mark as Available"\n\nOr, if you just redeemed it, you can tap the toast notification that appears to undo the action.',
    },
    {
      question: 'How do I add a card if I don&apos;t see it?',
      answer: 'If you don&apos;t see your card, you can add it by tapping the &apos;Add Card&apos; button in the manage cards section.',
    },
    {
      question: 'How do I manage my card&apos;s notifications?',
      answer: 'You can manage your card&apos;s notifications in the &apos;Notifications&apos; section of your profile.',
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
            Find answers to common questions about using Credify. If you can&apos;t find what you&apos;re looking for, feel free to reach out to our support team.
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
    color: Colors.light.secondaryLabel,
    textAlign: 'center',
    lineHeight: 22,
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