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
            <Stack.Screen name="approval" />
            <Stack.Screen name="diagnosis" />
            <Stack.Screen name="diagnosis-history" />
            <Stack.Screen name="diagnosis-result" />
            <Stack.Screen name="profile-edit" />
            <Stack.Screen name="avatar-management" />
            <Stack.Screen name="change-password" />
            <Stack.Screen name="notification-detail" />
            <Stack.Screen name="engineer-profile" />
            <Stack.Screen name="admin-engineer-approval" />
            <Stack.Screen name="approval-status" />
            <Stack.Screen name="engineer-registration" />
            <Stack.Screen name="ai-chat" />
            <Stack.Screen name="search-result" />
            <Stack.Screen name="traceability-detail" />
            <Stack.Screen name="farm-detail" />
            <Stack.Screen name="index" />
            <Stack.Screen name="(main)" />
          </Stack>
        </DurianNavigationGate>
      </WorkspaceProvider>
    </SessionProvider>
  );
}
