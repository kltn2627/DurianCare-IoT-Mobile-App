import { Link, Stack } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { durianTheme } from "@/src/theme/durianTheme";

export default function DurianNotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Không tìm thấy" }} />
      <View style={styles.container}>
        <Text style={styles.title}>Lối này chưa dẫn tới vườn sầu riêng.</Text>
        <Link href="/" style={styles.link}>Quay về trạm quét</Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.canvas,
    flex: 1,
    gap: 18,
    justifyContent: "center",
    padding: durianTheme.spacing.xl,
  },
  link: { color: durianTheme.colors.moss, fontSize: 16, fontWeight: "800" },
  title: {
    color: durianTheme.colors.ink,
    fontSize: 22,
    fontWeight: "900",
    textAlign: "center",
  },
});
