import { useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { startSmsImport, stopSmsImport } from "../services/smsImportService";

export default function SmsImportBootstrap() {
  const { user } = useAuth();

  useEffect(() => {
    let active = true;

    async function run() {
      if (!user?.uid) {
        await stopSmsImport();
        return;
      }
      const result = await startSmsImport(user.uid);
      if (!active) return;
      if (!result?.enabled && result?.reason && result.reason !== "not_android") {
        console.warn(`SMS import not enabled: ${result.reason}`);
      }
    }

    run();
    return () => {
      active = false;
      void stopSmsImport();
    };
  }, [user?.uid]);

  return null;
}
