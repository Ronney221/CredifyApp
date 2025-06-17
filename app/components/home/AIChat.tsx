import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Platform,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
// FIX: Using FlatList from gesture-handler to prevent scroll gestures
// from conflicting with navigator gestures (like swipe-to-dismiss on a modal).
import { FlatList } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// --- Interface for a single message ---
interface Message {
  _id: string | number;
  text: string;
  createdAt: Date;
  user: {
    _id: string | number;
    name: string;
  };
}

// --- Define User and AI objects ---
const USER = { _id: 1, name: 'User' };
const AI = { _id: 2, name: 'AI Assistant' };

// --- Main Chat Component ---
const App = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // Set the initial welcome message
  useEffect(() => {
    setMessages([
      {
        _id: 1,
        text: 'Hello! As a pure JavaScript component, I work perfectly in Expo Go. How can I help you?',
        createdAt: new Date(),
        user: AI,
      },
    ]);
  }, []);

  // --- Message Handling ---

  // Simulate the AI's response
  const handleAIResponse = (userMessageText: string) => {
    setIsTyping(true);
    setTimeout(() => {
      let responseText = '';
      if (userMessageText.toLowerCase().includes('fact')) {
        responseText = 'The heart of a shrimp is located in its head.';
      } else if (userMessageText.toLowerCase().includes('help')) {
        responseText = 'I can answer your questions based on the logic you program for me!';
      } else {
        responseText = `I received your message: "${userMessageText}".`;
      }

      const aiResponse: Message = {
        _id: Math.random().toString(),
        text: responseText,
        createdAt: new Date(),
        user: AI,
      };
      setIsTyping(false);
      setMessages((previousMessages) => [aiResponse, ...previousMessages]);
    }, 2000); // 2-second delay to simulate "thinking"
  };

  // Handle sending a new message
  // FIX: Refactored onSend to be more robust, preventing the "double tap" issue.
  const onSend = () => {
    const trimmedText = inputText.trim();
    if (trimmedText.length === 0) {
      return;
    }

    // Dismiss the keyboard as soon as send is initiated.
    Keyboard.dismiss();

    const newMessage: Message = {
      _id: Math.random().toString(),
      text: trimmedText,
      createdAt: new Date(),
      user: USER,
    };

    // Update messages state immediately with the new message
    setMessages((previousMessages) => [newMessage, ...previousMessages]);
    
    // Call AI response with the message text
    handleAIResponse(trimmedText);

    // Clear the input field for the next message
    setInputText('');
  };

  // --- UI Rendering ---

  // Renders a single message bubble
  const renderItem = ({ item }: { item: Message }) => {
    const isAIMessage = item.user._id === AI._id;

    return (
      <View style={[styles.messageRow, { justifyContent: isAIMessage ? 'flex-start' : 'flex-end' }]}>
        <View
          style={[
            styles.messageBubble,
            isAIMessage ? styles.aiBubble : styles.userBubble,
          ]}
        >
          <Text style={isAIMessage ? styles.aiText : styles.userText}>{item.text}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          style={styles.flex_1}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderItem}
            keyExtractor={(item, index) => item?._id?.toString() ?? index.toString()}
            style={styles.messageList}
            contentContainerStyle={styles.messageListContent}
            // `inverted` is crucial for chat UIs. It starts from the bottom.
            inverted
          />

          {isTyping && (
             <View style={styles.typingIndicatorContainer}>
               <Text style={styles.typingText}>AI is typing</Text>
               <ActivityIndicator size="small" color="#999" />
             </View>
          )}

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Type your message..."
              placeholderTextColor="#999"
              multiline
              // FIX: Added onSubmitEditing to allow sending from the keyboard's return key.
              onSubmitEditing={onSend}
              blurOnSubmit={false} // Prevents keyboard from dismissing when sending via return key
            />
            <TouchableOpacity onPress={onSend} style={styles.sendButton} disabled={!inputText.trim()}>
              <Ionicons
                name="arrow-up-circle"
                size={32}
                color={inputText.trim() ? '#007AFF' : '#d1d5db'}
              />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

// --- Styles ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  flex_1: {
      flex: 1
  },
  messageList: {
    flex: 1,
  },
  messageListContent: {
    paddingHorizontal: 10,
  },
  messageRow: {
    marginVertical: 5,
    flexDirection: 'row',
  },
  messageBubble: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 20,
    maxWidth: '80%',
  },
  userBubble: {
    backgroundColor: '#007AFF',
    borderBottomRightRadius: 5,
  },
  aiBubble: {
    backgroundColor: '#E5E5EA',
    borderBottomLeftRadius: 5,
  },
  userText: {
    color: '#fff',
    fontSize: 16,
  },
  aiText: {
    color: '#000000',
    fontSize: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
    backgroundColor: '#fff',
  },
  textInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    backgroundColor: '#f1f5f9',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 16,
  },
  sendButton: {
    marginLeft: 10,
    justifyContent: 'center',
    alignItems: 'center'
  },
  typingIndicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: '#fff'
  },
  typingText: {
    color: '#999',
    fontStyle: 'italic',
    marginRight: 5,
  }
});

export default App;
