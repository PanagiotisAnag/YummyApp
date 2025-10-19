// index.ts
import { registerRootComponent } from "expo";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import App from "./App";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});


if (Platform.OS === "android") {
  Notifications.setNotificationChannelAsync("default", {
    name: "Default",
    importance: Notifications.AndroidImportance.DEFAULT,
  }).catch(() => {});
}

registerRootComponent(App);
