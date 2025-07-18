import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { runAllTests, logTestResults, TestSuite } from '../../lib/test-database';
import { cardService } from '../../lib/card-service';

interface DatabaseTesterProps {
  onClose?: () => void;
}

export function DatabaseTester({ onClose }: DatabaseTesterProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<TestSuite[] | null>(null);
  const [serviceStatus, setServiceStatus] = useState(cardService.getStatus());

  const runTests = async () => {
    setIsRunning(true);
    setResults(null);
    
    try {
      console.log('🧪 Running database tests...');
      const testResults = await runAllTests();
      setResults(testResults);
      logTestResults(testResults);
      
      const totalTests = testResults.reduce((sum, suite) => sum + suite.summary.total, 0);
      const totalPassed = testResults.reduce((sum, suite) => sum + suite.summary.passed, 0);
      
      Alert.alert(
        'Tests Complete',
        `${totalPassed}/${totalTests} tests passed\n\nCheck console for detailed results.`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Test execution failed:', error);
      Alert.alert('Test Error', `Failed to run tests: ${error}`);
    } finally {
      setIsRunning(false);
      setServiceStatus(cardService.getStatus());
    }
  };

  const refreshCache = async () => {
    try {
      await cardService.refresh();
      setServiceStatus(cardService.getStatus());
      Alert.alert('Success', 'Cache refreshed successfully');
    } catch (error) {
      Alert.alert('Error', `Failed to refresh cache: ${error}`);
    }
  };

  const clearCache = () => {
    cardService.clearCache();
    setServiceStatus(cardService.getStatus());
    Alert.alert('Success', 'Cache cleared');
  };

  const getStatusColor = (success: boolean) => success ? '#10B981' : '#EF4444';
  const getStatusText = (success: boolean) => success ? '✅' : '❌';

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#F9FAFB', padding: 16 }}>
      <View style={{ backgroundColor: 'white', borderRadius: 8, padding: 16, marginBottom: 16 }}>
        <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 16 }}>Database Tester</Text>
        
        {/* Service Status */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 8 }}>Service Status</Text>
          <View style={{ backgroundColor: '#F3F4F6', padding: 12, borderRadius: 6 }}>
            <Text>Initialized: {serviceStatus.isInitialized ? '✅' : '❌'}</Text>
            <Text>Loading: {serviceStatus.isLoading ? '🔄' : '✅'}</Text>
            <Text>Cards: {serviceStatus.cardsCount}</Text>
            <Text>App Schemes: {serviceStatus.appSchemesCount}</Text>
            <Text>Multi-Choice Configs: {serviceStatus.multiChoiceConfigCount}</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          <TouchableOpacity
            onPress={runTests}
            disabled={isRunning}
            style={{
              backgroundColor: isRunning ? '#9CA3AF' : '#3B82F6',
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 6,
              flex: 1,
              minWidth: 120,
            }}
          >
            <Text style={{ color: 'white', textAlign: 'center', fontWeight: '600' }}>
              {isRunning ? 'Running Tests...' : 'Run All Tests'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={refreshCache}
            style={{
              backgroundColor: '#10B981',
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 6,
              flex: 1,
              minWidth: 120,
            }}
          >
            <Text style={{ color: 'white', textAlign: 'center', fontWeight: '600' }}>
              Refresh Cache
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={clearCache}
            style={{
              backgroundColor: '#F59E0B',
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 6,
              flex: 1,
              minWidth: 120,
            }}
          >
            <Text style={{ color: 'white', textAlign: 'center', fontWeight: '600' }}>
              Clear Cache
            </Text>
          </TouchableOpacity>
        </View>

        {/* Test Results */}
        {results && (
          <View>
            <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 8 }}>Test Results</Text>
            {results.map((suite, index) => (
              <View key={index} style={{ marginBottom: 12 }}>
                <View style={{ 
                  backgroundColor: '#F3F4F6', 
                  padding: 12, 
                  borderRadius: 6,
                  borderLeftWidth: 4,
                  borderLeftColor: suite.summary.failed === 0 ? '#10B981' : '#EF4444'
                }}>
                  <Text style={{ fontWeight: '600', marginBottom: 4 }}>
                    {suite.name}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#6B7280', marginBottom: 8 }}>
                    {suite.summary.passed}/{suite.summary.total} passed • {suite.summary.totalDuration}ms
                  </Text>
                  
                  {suite.results.map((result, resultIndex) => (
                    <View key={resultIndex} style={{ 
                      flexDirection: 'row', 
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingVertical: 2 
                    }}>
                      <Text style={{ fontSize: 12, flex: 1 }}>
                        {getStatusText(result.success)} {result.name}
                      </Text>
                      <Text style={{ 
                        fontSize: 12, 
                        color: '#6B7280',
                        marginLeft: 8 
                      }}>
                        {result.duration}ms
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Close Button */}
        {onClose && (
          <TouchableOpacity
            onPress={onClose}
            style={{
              backgroundColor: '#6B7280',
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 6,
              marginTop: 16,
            }}
          >
            <Text style={{ color: 'white', textAlign: 'center', fontWeight: '600' }}>
              Close
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}