import React from "react";
import { View, Text, TouchableOpacity, Alert, Platform } from "react-native";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
} from "firebase/auth";
import { auth } from "./firebaseConfig";

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
    <View style={{ flex:1, justifyContent:"center", alignItems:"center" }}>
      <Text style={{ fontSize:22, fontWeight:"800", marginBottom:12 }}>Welcome to YummyApp</Text>
      <TouchableOpacity onPress={handleGoogle} style={{ backgroundColor:"#111827", paddingHorizontal:16, paddingVertical:12, borderRadius:10 }}>
        <Text style={{ color:"#fff", fontWeight:"700" }}>Continue with Google</Text>
      </TouchableOpacity>
    </View>
  );
}
