// import React, { useState } from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   TextInput,
//   TouchableOpacity,
//   Alert,
//   ActivityIndicator,
// } from 'react-native';
// import { SafeAreaView } from 'react-native-safe-area-context';
// import { useRouter } from 'expo-router';
// import { useAuth } from '../../contexts/AuthContext';
// import { Ionicons } from '@expo/vector-icons';

// export default function ForgotPasswordScreen() {
//   const router = useRouter();
//   const { resetPassword } = useAuth();
  
//   const [email, setEmail] = useState('');
//   const [isLoading, setIsLoading] = useState(false);

//   const handleResetPassword = async () => {
//     if (!email) {
//       Alert.alert('Error', 'Please enter your email address');
//       return;
//     }

//     setIsLoading(true);
//     const { error } = await resetPassword(email);
    
//     if (error) {
//       Alert.alert('Error', error.message);
//     } else {
//       Alert.alert(
//         'Success',
//         'Password reset email sent! Please check your email for instructions.',
//         [{ text: 'OK', onPress: () => router.push('/(auth)/login' as any) }]
//       );
//     }
//     setIsLoading(false);
//   };

//   const navigateToLogin = () => {
//     router.push('/(auth)/login' as any);
//   };

//   return (
//     <SafeAreaView style={styles.container}>
//       <View style={styles.header}>
//         <TouchableOpacity onPress={navigateToLogin} style={styles.backButton}>
//           <Ionicons name="arrow-back" size={24} color="#007aff" />
//         </TouchableOpacity>
//       </View>

//       <View style={styles.content}>
//         <View style={styles.textContainer}>
//           <Text style={styles.title}>Forgot Password?</Text>
//           <Text style={styles.subtitle}>
//             Enter your email address and we&apos;ll send you a link to reset your password.
//           </Text>
//         </View>

//         <View style={styles.form}>
//           <View style={styles.inputContainer}>
//             <Text style={styles.label}>Email</Text>
//             <TextInput
//               style={styles.input}
//               value={email}
//               onChangeText={setEmail}
//               placeholder="Enter your email"
//               placeholderTextColor="#999"
//               keyboardType="email-address"
//               autoCapitalize="none"
//               autoComplete="email"
//             />
//           </View>

//           <TouchableOpacity
//             style={styles.resetButton}
//             onPress={handleResetPassword}
//             disabled={isLoading}
//           >
//             {isLoading ? (
//               <ActivityIndicator color="#ffffff" />
//             ) : (
//               <Text style={styles.resetButtonText}>Send Reset Link</Text>
//             )}
//           </TouchableOpacity>

//           <View style={styles.loginContainer}>
//             <Text style={styles.loginText}>Remember your password? </Text>
//             <TouchableOpacity onPress={navigateToLogin}>
//               <Text style={styles.loginLink}>Sign In</Text>
//             </TouchableOpacity>
//           </View>
//         </View>
//       </View>
//     </SafeAreaView>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#ffffff',
//   },
//   header: {
//     paddingHorizontal: 20,
//     paddingTop: 10,
//     paddingBottom: 20,
//   },
//   backButton: {
//     width: 40,
//     height: 40,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   content: {
//     flex: 1,
//     paddingHorizontal: 20,
//     justifyContent: 'center',
//   },
//   textContainer: {
//     marginBottom: 40,
//     alignItems: 'center',
//   },
//   title: {
//     fontSize: 28,
//     fontWeight: 'bold',
//     color: '#1c1c1e',
//     marginBottom: 12,
//   },
//   subtitle: {
//     fontSize: 16,
//     color: '#666666',
//     textAlign: 'center',
//     lineHeight: 22,
//   },
//   form: {
//     width: '100%',
//   },
//   inputContainer: {
//     marginBottom: 30,
//   },
//   label: {
//     fontSize: 16,
//     fontWeight: '600',
//     color: '#1c1c1e',
//     marginBottom: 8,
//   },
//   input: {
//     borderWidth: 1,
//     borderColor: '#e1e1e1',
//     borderRadius: 12,
//     paddingHorizontal: 16,
//     paddingVertical: 14,
//     fontSize: 16,
//     backgroundColor: '#f8f9fa',
//   },
//   resetButton: {
//     backgroundColor: '#007aff',
//     borderRadius: 12,
//     paddingVertical: 16,
//     alignItems: 'center',
//     marginBottom: 30,
//   },
//   resetButtonText: {
//     color: '#ffffff',
//     fontSize: 16,
//     fontWeight: '600',
//   },
//   loginContainer: {
//     flexDirection: 'row',
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   loginText: {
//     fontSize: 14,
//     color: '#666666',
//   },
//   loginLink: {
//     fontSize: 14,
//     color: '#007aff',
//     fontWeight: '600',
//   },
// }); 