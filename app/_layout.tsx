import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

import { DurianNavigationGate } from "@/src/navigation/DurianNavigationGate";
import { SessionProvider } from "@/src/session/SessionContext";
import { WorkspaceProvider } from "@/src/workspace/WorkspaceContext";

export const unstable_settings = {
  initialRouteName: "login",
};

export default function DurianCareRootLayout() {
  return (
    <SessionProvider>
      <WorkspaceProvider>
        <DurianNavigationGate>
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="login" />
            <Stack.Screen name="register" />
            <Stack.Screen name="verify-otp" />
            <Stack.Screen name="index" />
            <Stack.Screen name="(main)" />
          </Stack>
        </DurianNavigationGate>
      </WorkspaceProvider>
    </SessionProvider>
  );
}
