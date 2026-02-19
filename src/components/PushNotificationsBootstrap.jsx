import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { arrayUnion, doc, serverTimestamp, setDoc } from "firebase/firestore";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase/firebase";
import { getEnabledPushAreas, normalizeNotificationPrefs } from "../utils/pushAreas";

export default function PushNotificationsBootstrap() {
  const { user, profile } = useAuth();

  useEffect(() => {
    if (!user?.uid) return;
    if (Capacitor.getPlatform() === "web") return;
    const notificationPrefs = normalizeNotificationPrefs(profile?.notificationPrefs);
    const enabledAreas = getEnabledPushAreas(notificationPrefs).map((area) => area.id);

    let active = true;

    async function saveToken(tokenValue) {
      if (!active || !tokenValue) return;
      const ref = doc(db, "users", user.uid);
      await setDoc(
        ref,
        {
          pushTokens: arrayUnion(tokenValue),
          pushNotificationsEnabled: !!notificationPrefs.enabled,
          pushNotificationPrefs: notificationPrefs,
          pushAreas: enabledAreas,
          pushPlatform: Capacitor.getPlatform(),
          lastPushTokenAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    }

    async function initPush() {
      try {
        if (!notificationPrefs.enabled) {
          await PushNotifications.removeAllListeners();
          await PushNotifications.unregister().catch(() => {});
          return;
        }

        await PushNotifications.createChannel({
          id: "sapa-reminders",
          name: "SapaTracker Reminders",
          description: "Coach nudges, bills and loan reminders",
          importance: 4,
          visibility: 1,
          vibration: true,
        }).catch(() => {});

        const existingPerm = await PushNotifications.checkPermissions();
        let receive = existingPerm.receive;

        if (receive !== "granted") {
          const requested = await PushNotifications.requestPermissions();
          receive = requested.receive;
        }

        if (receive !== "granted") {
          return;
        }

        await PushNotifications.removeAllListeners();

        await PushNotifications.addListener("registration", async (token) => {
          try {
            await saveToken(token?.value);
            toast.success("Push notifications enabled");
          } catch (err) {
            console.error("Push token save failed:", err);
          }
        });

        await PushNotifications.addListener("registrationError", (err) => {
          console.error("Push registration error:", err);
          toast.error("Push registration failed");
        });

        await PushNotifications.addListener("pushNotificationReceived", (notification) => {
          const title = notification?.title || "SapaTracker";
          const body = notification?.body || "You have a new notification";
          toast.info(`${title}: ${body}`);
        });

        await PushNotifications.addListener("pushNotificationActionPerformed", (event) => {
          const route = event?.notification?.data?.route;
          if (typeof route === "string" && route.startsWith("/")) {
            window.location.assign(route);
          }
        });

        await PushNotifications.register();
      } catch (err) {
        console.error("Push init failed:", err);
      }
    }

    initPush();

    return () => {
      active = false;
      PushNotifications.removeAllListeners().catch(() => {});
    };
  }, [user?.uid, profile?.notificationPrefs]);

  return null;
}
