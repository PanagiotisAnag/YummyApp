// ProfileScreen.tsx
import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { signOut } from "firebase/auth";
import { auth } from "./firebaseConfig";

// ---- ΟΡΙΖΟΥΜΕ τον τύπο του Stack για σωστό navigation typing ----
type RootStackParamList = {
  SignIn: undefined;
  Tabs: undefined;
  Recipe: { mealId: string; title?: string; meal?: any } | undefined;
  Onboarding: undefined;
  Languages: undefined;
  Achievements: undefined;
  Profile: undefined;
};

type Nav = NativeStackNavigationProp<RootStackParamList>;

function Row({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.row}>
      <View style={styles.rowLeft}>
        <Ionicons name={icon} size={22} color="#111827" />
        <Text style={styles.rowText}>{label}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  // ✅ Πλήρως τυποποιημένο navigation
  const navigation = useNavigation<Nav>();

  // Παίρνουμε τον τρέχοντα χρήστη από το Firebase Auth (χωρίς context)
  const user = auth.currentUser;

  const photo = user?.photoURL || undefined;
  const title =
    user?.displayName || user?.email || user?.uid?.slice(0, 6) || "User";

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      // Καθάρισμα stack και επιστροφή στο SignIn
      navigation.reset({ index: 0, routes: [{ name: "SignIn" }] });
    } catch (e: any) {
      Alert.alert("Sign out failed", e?.message ?? String(e));
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      {/* User card */}
      <View style={styles.card}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View style={styles.avatar}>
            {photo ? (
              <Image source={{ uri: photo }} style={{ width: 64, height: 64 }} />
            ) : (
              <Text style={{ fontWeight: "800", fontSize: 22 }}>
                {title.substring(0, 1).toUpperCase()}
              </Text>
            )}
          </View>
          <View style={{ marginLeft: 12, flex: 1 }}>
            <Text style={{ fontSize: 18, fontWeight: "800" }}>{title}</Text>
            {!!user?.email && (
              <Text style={{ color: "#6b7280" }}>{user.email}</Text>
            )}
          </View>
        </View>
      </View>

      {/* Settings box */}
      <View style={styles.card}>
        <Text style={styles.boxTitle}>Settings</Text>

        <Row
          icon="language"
          label="Languages"
          onPress={() => navigation.navigate("Languages")}
        />
        <Row
          icon="restaurant"
          label="Edit tastes"
          onPress={() => navigation.navigate("Onboarding")}
        />
        <Row
          icon="trophy"
          label="Achievements"
          onPress={() => navigation.navigate("Achievements")}
        />

        <View style={styles.separator} />

        <TouchableOpacity onPress={handleSignOut} style={styles.signOutBtn}>
          <Ionicons name="log-out-outline" size={20} color="#fff" />
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16 },
  card: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: "hidden",
    backgroundColor: "#e5e7eb",
    alignItems: "center",
    justifyContent: "center",
  },
  boxTitle: { fontSize: 16, fontWeight: "700", marginBottom: 6 },
  row: {
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowLeft: { flexDirection: "row", alignItems: "center" },
  rowText: { marginLeft: 10, fontSize: 16, fontWeight: "600", color: "#111827" },
  separator: {
    height: 1,
    backgroundColor: "#eee",
    marginVertical: 8,
  },
  signOutBtn: {
    backgroundColor: "#ef4444",
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  signOutText: { color: "white", fontWeight: "700", marginLeft: 8 },
});
