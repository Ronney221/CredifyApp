import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { MotiView } from 'moti';

interface ManageCardsContainerProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  showSaveButton?: boolean;
  onSave?: () => void;
  isSaving?: boolean;
  saveButtonText?: string;
  saveButtonDisabled?: boolean;
  isDraggable?: boolean;
  onContainerPress?: () => void;
}

export const ManageCardsContainer: React.FC<ManageCardsContainerProps> = ({
  title,
  subtitle,
  children,
  showSaveButton = false,
  onSave,
  isSaving = false,
  saveButtonText = "Save Changes",
  saveButtonDisabled = false,
  isDraggable = false,
  onContainerPress,
}) => {
  const contentContainer = (
    <MotiView
      from={{ opacity: 0, translateY: 50 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 200 }}
      style={styles.mainCardContainer}
    >
      <View style={styles.headerSection}>
        <Text style={styles.mainCardTitle}>{title}</Text>
        {subtitle && (
          <Text style={styles.mainCardSubtitle}>{subtitle}</Text>
        )}
      </View>
      
      <View style={styles.contentSection}>
        {children}
      </View>
    </MotiView>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {isDraggable ? (
        <View style={styles.draggableContentContainer}>
          {onContainerPress ? (
            <TouchableOpacity style={styles.containerPressable} onPress={onContainerPress} activeOpacity={1}>
              {contentContainer}
            </TouchableOpacity>
          ) : (
            contentContainer
          )}
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContentContainer}>
          {onContainerPress ? (
            <TouchableOpacity style={styles.containerPressable} onPress={onContainerPress} activeOpacity={1}>
              {contentContainer}
            </TouchableOpacity>
          ) : (
            contentContainer
          )}
        </ScrollView>
      )}

      {showSaveButton && (
        <MotiView 
          style={styles.footer}
          from={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ type: 'timing', duration: 200, delay: 300 }}
        >
          <TouchableOpacity 
            style={[styles.saveButton, (saveButtonDisabled || isSaving) && styles.saveButtonDisabled]} 
            onPress={onSave}
            disabled={saveButtonDisabled || isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.saveButtonText}>{saveButtonText}</Text>
            )}
          </TouchableOpacity>
        </MotiView>
      )}
    </SafeAreaView>
  );
};


export default ManageCardsContainer;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f2f2f7',
  },
  scrollContentContainer: {
    flexGrow: 1,
    justifyContent: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  mainCardContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.00,
    elevation: 2,
    overflow: 'hidden',
  },
  headerSection: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 20,
  },
  mainCardTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: Colors.light.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  mainCardSubtitle: {
    fontSize: 16,
    color: Colors.light.icon,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 8,
  },
  contentSection: {
    width: '100%',
  },
  footer: {
    padding: 20,
    paddingBottom: 88,
    backgroundColor: '#f2f2f7',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#c7c7cc',
  },
  saveButton: {
    backgroundColor: Colors.light.tint,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: {width:0, height:2},
    elevation: 4,
  },
  saveButtonDisabled: {
    backgroundColor: Colors.light.icon,
    opacity: 0.5,
    shadowOpacity: 0,
    elevation: 0,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '600',
  },
  draggableContentContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  containerPressable: {
    flex: 1,
  },
}); 