import { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Animated,
  Modal,
  Alert,
  AppState,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Link, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle } from "react-native-svg";
import {
  getMedications,
  Medication,
  getTodaysDoses,
  recordDose,
  DoseHistory,
} from "../utils/storage";
import { useFocusEffect } from "@react-navigation/native";
import {
  registerForPushNotificationsAsync,
  scheduleMedicationReminder,
} from "../utils/notifications";

const { width, height } = Dimensions.get("window");

// Create animated circle component
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const QUICK_ACTIONS = [
  {
    icon: "add" as const,
    label: "Add Medicine",
    route: "/medications/add" as const,
    color: "#FF6B6B",
    gradient: ["#FF8E8E", "#FF6B6B"] as [string, string],
  },
  {
    icon: "calendar" as const,
    label: "Schedule",
    route: "/calendar" as const,
    color: "#4ECDC4",
    gradient: ["#6EE7DE", "#4ECDC4"] as [string, string],
  },
  {
    icon: "time" as const,
    label: "History",
    route: "/history" as const,
    color: "#45B7D1",
    gradient: ["#67C5DB", "#45B7D1"] as [string, string],
  },
  {
    icon: "refresh" as const,
    label: "Refills",
    route: "/refills" as const,
    color: "#F7DC6F",
    gradient: ["#F9E79F", "#F7DC6F"] as [string, string],
  },
  {
    icon: "chatbubbles" as const,
    label: "MedAssist",
    route: "/chatbot" as const,
    color: "#BB8FCE",
    gradient: ["#CBA6E0", "#BB8FCE"] as [string, string],
  },
];

interface CircularProgressProps {
  progress: number;
  totalDoses: number;
  completedDoses: number;
}

function CircularProgress({
  progress,
  totalDoses,
  completedDoses,
}: CircularProgressProps) {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const size = 140;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: progress,
      duration: 2000,
      useNativeDriver: true,
    }).start();
  }, [progress]);

  const strokeDashoffset = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });

  return (
    <View style={styles.progressContainer}>
      <Svg width={size} height={size} style={styles.progressRing}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#F0F4F8"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#4ECDC4"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.progressTextContainer}>
        <Text style={styles.progressPercentage}>
          {Math.round(progress * 100)}%
        </Text>
        <Text style={styles.progressLabel}>Complete</Text>
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const [showNotifications, setShowNotifications] = useState(false);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [todaysMedications, setTodaysMedications] = useState<Medication[]>([]);
  const [completedDoses, setCompletedDoses] = useState(0);
  const [doseHistory, setDoseHistory] = useState<DoseHistory[]>([]);
  const [progress, setProgress] = useState(0);

  const handleLogout = () => {
    // Navigate to auth screen
    router.replace('/auth');
  };

  const loadMedications = useCallback(async () => {
    try {
      const [allMedications, todaysDoses] = await Promise.all([
        getMedications(),
        getTodaysDoses(),
      ]);

      setDoseHistory(todaysDoses);
      setMedications(allMedications);

      // Filter medications for today
      const today = new Date();
      const todayMeds = allMedications.filter((med) => {
        const startDate = new Date(med.startDate);
        const durationDays = parseInt(med.duration.split(" ")[0]);

        // For ongoing medications or if within duration
        if (
          durationDays === -1 ||
          (today >= startDate &&
            today <=
            new Date(
              startDate.getTime() + durationDays * 24 * 60 * 60 * 1000
            ))
        ) {
          return true;
        }
        return false;
      });

      setTodaysMedications(todayMeds);

      // Calculate total expected doses for today based on frequency
      const totalExpectedDoses = todayMeds.reduce((total, med) => {
        switch (med.frequency) {
          case "Once daily":
            return total + 1;
          case "Twice daily":
            return total + 2;
          case "Three times daily":
            return total + 3;
          case "Four times daily":
            return total + 4;
          case "As needed":
            return total + 0;
          default:
            return total + med.times.length;
        }
      }, 0);

      // Calculate completed doses
      const completed = todaysDoses.filter((dose) => dose.taken).length;
      setCompletedDoses(completed);

      // Update progress calculation based on actual total doses
      const progress = totalExpectedDoses > 0 ? completed / totalExpectedDoses : 0;
      setProgress(progress);

    } catch (error) {
      console.error("Error loading medications:", error);
    }
  }, []);

  const setupNotifications = async () => {
    try {
      const token = await registerForPushNotificationsAsync();
      if (!token) {
        console.log("Failed to get push notification token");
        return;
      }

      // Schedule reminders for all medications
      const medications = await getMedications();
      for (const medication of medications) {
        if (medication.reminderEnabled) {
          await scheduleMedicationReminder(medication);
        }
      }
    } catch (error) {
      console.error("Error setting up notifications:", error);
    }
  };

  // Use useEffect for initial load
  useEffect(() => {
    loadMedications();
    setupNotifications();

    // Handle app state changes for notifications
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") {
        loadMedications();
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Use useFocusEffect for subsequent updates
  useFocusEffect(
    useCallback(() => {
      const unsubscribe = () => {
        // Cleanup if needed
      };

      loadMedications();
      return () => unsubscribe();
    }, [loadMedications])
  );

  const handleTakeDose = async (medication: Medication) => {
    try {
      await recordDose(medication.id, true, new Date().toISOString());
      await loadMedications(); // Reload data after recording dose
    } catch (error) {
      console.error("Error recording dose:", error);
      Alert.alert("Error", "Failed to record dose. Please try again.");
    }
  };

  const isDoseTaken = (medicationId: string) => {
    return doseHistory.some(
      (dose) => dose.medicationId === medicationId && dose.taken
    );
  };

  // Helper for pill icons row
  const totalExpectedDoses = todaysMedications.reduce((total, med) => {
    switch (med.frequency) {
      case "Once daily":
        return total + 1;
      case "Twice daily":
        return total + 2;
      case "Three times daily":
        return total + 3;
      case "Four times daily":
        return total + 4;
      case "As needed":
        return total + 0;
      default:
        return total + med.times.length;
    }
  }, 0);

  // Pills row: filled for completed, outline for remaining
  const renderPillIcons = () => {
    const maxDisplay = 8;
    const pills = [];

    for (let i = 0; i < Math.min(totalExpectedDoses, maxDisplay); i++) {
      pills.push(
        <View
          key={i}
          style={[
            styles.pillIcon,
            { backgroundColor: i < completedDoses ? "#4ECDC4" : "#F0F4F8" }
          ]}
        >
          <Ionicons
            name="medical"
            size={16}
            color={i < completedDoses ? "white" : "#BDC3C7"}
          />
        </View>
      );
    }

    if (totalExpectedDoses > maxDisplay) {
      pills.push(
        <View key="more" style={styles.morePills}>
          <Text style={styles.morePillsText}>+{totalExpectedDoses - maxDisplay}</Text>
        </View>
      );
    }

    return <View style={styles.pillsRow}>{pills}</View>;
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  return (
    <View style={styles.container}>
      {/* Custom Header */}
      <View style={styles.customHeader}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greetingText}>{getGreeting()}</Text>
            <Text style={styles.nameText}>Take care of yourself</Text>
          </View>
          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={styles.bellButton}
              onPress={() => setShowNotifications(true)}
            >
              <Ionicons name="notifications" size={24} color="#2C3E50" />
              {todaysMedications.length > 0 && (
                <View style={styles.bellBadge}>
                  <Text style={styles.bellBadgeText}>{todaysMedications.length}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleLogout}
            >
              <Ionicons name="log-out-outline" size={24} color="#2C3E50" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Progress Card */}
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>Today's Progress</Text>
            <Text style={styles.progressSubtitle}>
              {completedDoses} of {totalExpectedDoses} medications taken
            </Text>
          </View>

          <View style={styles.progressContent}>
            <CircularProgress
              progress={progress}
              totalDoses={totalExpectedDoses}
              completedDoses={completedDoses}
            />
            <View style={styles.progressStats}>
              {renderPillIcons()}
              <Text style={styles.statsText}>
                {totalExpectedDoses > 0
                  ? `${Math.round(progress * 100)}% completed`
                  : "No medications today"}
              </Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            {QUICK_ACTIONS.map((action, index) => (
              <Link href={action.route as any} key={action.label} asChild>
                <TouchableOpacity style={styles.actionCard}>
                  <View style={[styles.actionIconContainer, { backgroundColor: action.color }]}>
                    <Ionicons name={action.icon} size={24} color="white" />
                  </View>
                  <Text style={styles.actionText}>{action.label}</Text>
                </TouchableOpacity>
              </Link>
            ))}
          </View>
        </View>

        {/* Today's Medications */}
        <View style={styles.medicationsSection}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Today's Medications</Text>
            <Link href="/calendar" asChild>
              <TouchableOpacity>
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            </Link>
          </View>

          {todaysMedications.length === 0 ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIconContainer}>
                <Ionicons name="medical-outline" size={48} color="#BDC3C7" />
              </View>
              <Text style={styles.emptyTitle}>No medications today</Text>
              <Text style={styles.emptySubtitle}>You're all set for today!</Text>
              <Link href="/medications/add" asChild>
                <TouchableOpacity style={styles.addButton}>
                  <Ionicons name="add" size={20} color="white" />
                  <Text style={styles.addButtonText}>Add Medication</Text>
                </TouchableOpacity>
              </Link>
            </View>
          ) : (
            todaysMedications.map((medication, index) => {
              const taken = isDoseTaken(medication.id);
              return (
                <View key={medication.id} style={styles.medicationCard}>
                  <View style={styles.medicationLeft}>
                    <View style={[styles.medicationIcon, { backgroundColor: `${medication.color}20` }]}>
                      <Ionicons name="medical" size={20} color={medication.color} />
                    </View>
                    <View style={styles.medicationInfo}>
                      <Text style={styles.medicationName}>{medication.name}</Text>
                      <Text style={styles.medicationDosage}>{medication.dosage}</Text>
                      <View style={styles.timeRow}>
                        <Ionicons name="time-outline" size={14} color="#7F8C8D" />
                        <Text style={styles.medicationTime}>{medication.times[0]}</Text>
                      </View>
                    </View>
                  </View>

                  {taken ? (
                    <View style={styles.completedBadge}>
                      <Ionicons name="checkmark-circle" size={20} color="#27AE60" />
                      <Text style={styles.completedText}>Done</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[styles.takeButton, { backgroundColor: medication.color }]}
                      onPress={() => handleTakeDose(medication)}
                    >
                      <Text style={styles.takeButtonText}>Take</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Notifications Modal */}
      <Modal
        visible={showNotifications}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowNotifications(false)}
      >
        <View style={styles.modalBackground}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Notifications</Text>
              <TouchableOpacity
                onPress={() => setShowNotifications(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close-circle" size={28} color="#7F8C8D" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              {todaysMedications.map((medication) => (
                <View key={medication.id} style={styles.notificationCard}>
                  <View style={[styles.notificationIconContainer, { backgroundColor: medication.color }]}>
                    <Ionicons name="medical" size={20} color="white" />
                  </View>
                  <View style={styles.notificationInfo}>
                    <Text style={styles.notificationTitle}>{medication.name}</Text>
                    <Text style={styles.notificationSubtitle}>{medication.dosage}</Text>
                    <Text style={styles.notificationTime}>Scheduled: {medication.times[0]}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFBFC",
  },
  customHeader: {
    backgroundColor: "white",
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F4F8",
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  greetingText: {
    fontSize: 24,
    fontWeight: "700",
    color: "#2C3E50",
    marginBottom: 4,
  },
  nameText: {
    fontSize: 16,
    color: "#7F8C8D",
    fontWeight: "400",
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bellButton: {
    padding: 8,
    marginRight: 8,
  },
  logoutButton: {
    padding: 8,
  },
  bellBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: "#FF6B6B",
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  bellBadgeText: {
    color: "white",
    fontSize: 10,
    fontWeight: "bold",
  },
  scrollContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  progressCard: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 24,
    marginTop: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  progressHeader: {
    marginBottom: 20,
  },
  progressTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#2C3E50",
    marginBottom: 4,
  },
  progressSubtitle: {
    fontSize: 14,
    color: "#7F8C8D",
  },
  progressContent: {
    alignItems: "center",
  },
  progressContainer: {
    position: "relative",
    marginBottom: 20,
  },
  progressTextContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  progressPercentage: {
    fontSize: 28,
    fontWeight: "800",
    color: "#2C3E50",
  },
  progressLabel: {
    fontSize: 12,
    color: "#7F8C8D",
    marginTop: 2,
  },
  progressRing: {
    transform: [{ rotate: "-90deg" }],
  },
  progressStats: {
    alignItems: "center",
  },
  pillsRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 12,
  },
  pillIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 3,
  },
  morePills: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#4ECDC4",
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 3,
  },
  morePillsText: {
    color: "white",
    fontSize: 10,
    fontWeight: "bold",
  },
  statsText: {
    fontSize: 14,
    color: "#7F8C8D",
    fontWeight: "500",
  },
  actionsSection: {
    marginTop: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#2C3E50",
    marginBottom: 16,
  },
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  actionCard: {
    width: (width - 56) / 2, // (total width - padding - gap) / 2
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  actionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  actionText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2C3E50",
    textAlign: "center",
  },
  medicationsSection: {
    marginTop: 32,
    marginBottom: 40,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  viewAllText: {
    fontSize: 14,
    color: "#4ECDC4",
    fontWeight: "600",
  },
  emptyCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#F8F9FA",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2C3E50",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#7F8C8D",
    marginBottom: 24,
    textAlign: "center",
  },
  addButton: {
    flexDirection: "row",
    backgroundColor: "#4ECDC4",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    alignItems: "center",
  },
  addButtonText: {
    color: "white",
    fontWeight: "600",
    marginLeft: 8,
  },
  medicationCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  medicationLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  medicationIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  medicationInfo: {
    flex: 1,
  },
  medicationName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2C3E50",
    marginBottom: 4,
  },
  medicationDosage: {
    fontSize: 14,
    color: "#7F8C8D",
    marginBottom: 4,
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  medicationTime: {
    fontSize: 12,
    color: "#7F8C8D",
    marginLeft: 4,
  },
  completedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F8F5",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  completedText: {
    color: "#27AE60",
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
  },
  takeButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  takeButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  modalBackground: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "white",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: height * 0.7,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F4F8",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#2C3E50",
  },
  modalCloseButton: {
    padding: 4,
  },
  modalContent: {
    padding: 20,
  },
  notificationCard: {
    flexDirection: "row",
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  notificationIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  notificationInfo: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2C3E50",
    marginBottom: 4,
  },
  notificationSubtitle: {
    fontSize: 14,
    color: "#7F8C8D",
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 12,
    color: "#95A5A6",
  },
});