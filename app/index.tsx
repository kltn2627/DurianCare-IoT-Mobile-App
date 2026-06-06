import { ActivityIndicator, StyleSheet, View } from "react-native";

import { durianTheme } from "@/src/theme/durianTheme";

export default function DurianLaunchScreen() {
  return (
    <View style={styles.container}>
      <ActivityIndicator color={durianTheme.colors.durianYellow} size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.moss,
    flex: 1,
    justifyContent: "center",
  },
});
