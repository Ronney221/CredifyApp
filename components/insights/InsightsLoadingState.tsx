import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../../constants/Colors';
import LottieView from 'lottie-react-native';

interface InsightsLoadingStateProps {
  onRetry: () => void;
}

const InsightsLoadingState: React.FC<InsightsLoadingStateProps> = ({ onRetry }) => {
  const [retryCount, setRetryCount] = useState(0);
  const [showRetryButton, setShowRetryButton] = useState(false);
  const lottieRef = useRef<LottieView>(null);
  const maxRetries = 3;
  const baseDelay = 2000; // 2 seconds

  useEffect(() => {
    if (lottieRef.current) {
      lottieRef.current.play();
    }

    // Exponential backoff logic
    if (retryCount < maxRetries) {
      const delay = Math.min(baseDelay * Math.pow(2, retryCount), 10000); // Cap at 10 seconds
      const timer = setTimeout(() => {
        onRetry();
        setRetryCount(prev => prev + 1);
      }, delay);

      return () => clearTimeout(timer);
    } else {
      setShowRetryButton(true);
    }
  }, [retryCount, onRetry]);

  const handleManualRetry = () => {
    setRetryCount(0);
    setShowRetryButton(false);
    onRetry();
  };

  return (
    <View style={styles.loadingContainer}>
      <LottieView
        ref={lottieRef}
        source={require('../../assets/animations/credit_card_animation.json')}
        autoPlay
        loop
        style={styles.lottieAnimation}
      />
      <Text style={styles.loadingText}>Loading your insights...</Text>
      {showRetryButton && (
        <TouchableOpacity 
          style={styles.retryButton} 
          onPress={handleManualRetry}
        >
          <Text style={styles.retryButtonText}>Retry Loading</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.light.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#8e8e93',
    textAlign: 'center',
  },
  lottieAnimation: {
    width: 200,
    height: 200,
  },
  retryButton: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: Colors.light.tint,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default InsightsLoadingState;