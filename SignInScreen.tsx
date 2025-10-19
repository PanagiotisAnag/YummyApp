import React from "react";
import { View, Text, TouchableOpacity, Alert, Platform, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
} from "firebase/auth";
import { auth } from "./firebaseConfig";

const appLogo = require("./assets/icon.png");

export default function SignInScreen() {
  const handleGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      if (Platform.OS === "web") {
        try {
          await signInWithPopup(auth, provider);
          return;
        } catch (e: any) {
          const code = e?.code ?? "unknown";
          const msg = e?.message ?? "";
          console.warn("Popup sign-in error:", code, msg, e);

          if (code === "auth/popup-blocked" || code === "auth/cancelled-popup-request") {
            await signInWithRedirect(auth, provider);
            return;
          }

          // ⭐ SHOW THE REAL ERROR
          Alert.alert("Google sign-in failed", `${code}\n${msg}`);
          return;
        }
      }

      Alert.alert("Google sign-in", "Native Google flow not set up for this build");
    } catch (e: any) {
      const code = e?.code ?? "unknown";
      const msg = e?.message ?? "";
      console.error("Google sign-in failed:", code, msg, e);
      Alert.alert("Google sign-in failed", `${code}\n${msg}`);
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 24 }}>
      <Image source={appLogo} style={{ width: 96, height: 96, borderRadius: 24, marginBottom: 16 }} />
      <Text style={{ fontSize: 22, fontWeight: "800", marginBottom: 20 }}>Welcome to YummyApp</Text>
      <TouchableOpacity
        onPress={handleGoogle}
        style={{
          backgroundColor: "#111827",
          paddingHorizontal: 20,
          paddingVertical: 12,
          borderRadius: 12,
          flexDirection: "row",
          alignItems: "center",
        }}
        accessibilityRole="button"
        accessibilityLabel="Continue with Google"
      >
        <Ionicons name="logo-google" size={20} color="#fff" style={{ marginRight: 10 }} />
        <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>Continue with Google</Text>
      </TouchableOpacity>
    </View>
  );
}
