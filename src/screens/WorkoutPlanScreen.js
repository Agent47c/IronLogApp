import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Platform, StatusBar, } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, commonStyles } from '../utils/theme';
import WorkoutPlanService from '../services/workoutPlanService';
import { showAlert } from '../components/CustomAlertDialog';
import GlowingButton from '../components/GlowingButton';
import { useSession } from '../context/SessionContext'; // Added import
import ActiveSessionBanner from '../components/ActiveSessionBanner';

export default function WorkoutPlanScreen({ navigation }) {
  const { activeSession } = useSession(); // Added activeSession destructuring
  const [plans, setPlans] = useState([]);
  const [activePlanId, setActivePlanId] = useState(null);

  useFocusEffect(
    useCallback(() => {
      loadPlans();
    }, [])
  );

  const loadPlans = async () => {
    try {
      const allPlans = await WorkoutPlanService.getAllPlans();
      setPlans(allPlans);
      const active = allPlans.find(p => p.is_active);
      if (active) setActivePlanId(active.id);
    } catch (error) {
      console.error('Error loading plans:', error);
    }
  };

  // Check if a plan is blocked from editing due to active session
  const isEditBlocked = (planId) => {
    return activeSession && activeSession.planId === planId;
  };

  const showSessionBlockAlert = () => {
    showAlert({
      type: 'warning',
      title: '⚠️ Active Session',
      message: 'You are currently in an active workout session.\nPlease finish or cancel this session before editing the plan.',
      buttons: [
        { text: 'Go Back', style: 'cancel' },
        {
          text: 'Finish Session',
          onPress: () => navigation.navigate('SessionTracker', {
            sessionId: activeSession.sessionId,
            planId: activeSession.planId,
            workoutId: activeSession.workoutId,
          }),
        },
      ],
    });
  };

  const setActive = async (planId) => {
    await WorkoutPlanService.setActivePlan(planId);
    await loadPlans();
  };

  const deletePlan = (planId) => {
    showAlert({
      type: 'destructive',
      title: 'Delete Plan',
      message: 'Are you sure you want to delete this plan? This action cannot be undone.',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive', onPress: async () => {
            await WorkoutPlanService.deletePlan(planId);
            await loadPlans();
          }
        }
      ],
    });
  };

  const showPlanOptions = (plan) => {
    const options = [
      {
        text: 'Edit',
        onPress: () => {
          if (isEditBlocked(plan.id)) {
            showSessionBlockAlert();
            return;
          }
          navigation.navigate('PlanBuilder', { planId: plan.id });
        },
      },
    ];

    if (!plan.is_active) {
      options.unshift({
        text: 'Set as Active',
        onPress: () => setActive(plan.id),
      });
    }

    options.push(
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deletePlan(plan.id),
      },
      {
        text: 'Cancel',
        style: 'cancel',
      }
    );

    showAlert({
      type: 'info',
      title: plan.name || 'Plan Options',
      message: 'Choose an action',
      buttons: options,
    });
  };

  const renderPlan = ({ item }) => (
    <View style={[styles.planCard, item.is_active && styles.planCardActive]}>
      <TouchableOpacity
        style={styles.planMainContent}
        onPress={() => {
          if (isEditBlocked(item.id)) {
            showSessionBlockAlert();
            return;
          }
          navigation.navigate('PlanBuilder', { planId: item.id });
        }}
        activeOpacity={0.7}
      >
        <View style={styles.planContent}>
          <Text style={styles.planName}>{item.name || 'Unnamed Plan'}</Text>
          <Text style={styles.planType}>{item.type || 'Custom'}</Text>
          {item.description && <Text style={styles.planDesc}>{item.description}</Text>}
        </View>
      </TouchableOpacity>
      <View style={styles.planActions}>
        {!!item.is_active && <Text style={styles.activeLabel}>✓ Active</Text>}
        <TouchableOpacity onPress={() => showPlanOptions(item)} style={styles.moreButton}>
          <Text style={styles.moreIcon}>⋮</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const defaultPaddingTop = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : SPACING.md;

  // Show centered empty state when no plans
  if (plans.length === 0) {
    return (
      <View style={[commonStyles.container, styles.emptyContainer]}>
        <Text style={styles.emptyIcon}>📋</Text>
        <Text style={styles.emptyTitle}>No Workout Plans</Text>
        <Text style={styles.emptySubtitle}>Create your first workout plan to get started</Text>
        <GlowingButton
          onPress={() => navigation.navigate('PlanBuilder')}
          glowColor={COLORS.primary}
          style={{ marginTop: SPACING.lg }}
        >
          + Create New Plan
        </GlowingButton>
      </View>
    );
  }

  return (
    <View style={commonStyles.container}>

      {/* Standard Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.navigate('Home');
            }
          }}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Workout Plans</Text>
        <View style={styles.headerButton} />
      </View>

      <ActiveSessionBanner />
      <FlatList
        data={plans}
        renderItem={renderPlan}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={[
          styles.listContent,
          { paddingTop: activeSession ? 0 : defaultPaddingTop }
        ]}

        ListFooterComponent={
          <GlowingButton
            onPress={() => navigation.navigate('PlanBuilder')}
            glowColor={COLORS.primary}
            style={{ marginTop: SPACING.md }}
          >
            + Create New Plan
          </GlowingButton>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  listContent: {
    padding: SPACING.md,
    paddingBottom: 100,
    paddingTop: SPACING.sm, // Reduced, header takes care of top spacing
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + SPACING.sm : SPACING.md,
    paddingBottom: SPACING.sm,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    zIndex: 10,
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  emptyIcon: {
    fontSize: 80,
    marginBottom: SPACING.md,
  },
  emptyTitle: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xl,
    textAlign: 'center',
  },
  createButton: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center',
    marginTop: SPACING.md,
    marginBottom: SPACING.md,
  },
  createButtonCentered: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
    alignItems: 'center',
  },
  createButtonText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.background,
  },
  planCard: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.md,
    borderWidth: 2,
    borderColor: 'transparent',
    flexDirection: 'row',
    overflow: 'hidden',
  },
  planCardActive: {
    borderColor: COLORS.primary,
  },
  planMainContent: {
    flex: 1,
    padding: SPACING.md,

  },
  planContent: {
    flex: 1
  },
  planName: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text,
  },
  planType: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  planDesc: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  planActions: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    borderLeftWidth: 1,
    borderLeftColor: COLORS.border,
  },
  actionButton: {
    marginBottom: SPACING.sm,
  },
  actionText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.accent,
    fontWeight: FONT_WEIGHTS.semibold,
  },
  activeLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.success,
    fontWeight: FONT_WEIGHTS.bold,
    marginBottom: SPACING.sm,
  },
  moreButton: {
    padding: SPACING.sm,
  },
  moreIcon: {
    fontSize: FONT_SIZES.xxl,
    color: COLORS.textSecondary,
    fontWeight: FONT_WEIGHTS.bold,
  },
});