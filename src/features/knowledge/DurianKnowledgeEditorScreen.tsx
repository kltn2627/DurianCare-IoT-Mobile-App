import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams } from "expo-router";
import { ArrowLeft, ImagePlus, Save, Send } from "lucide-react-native";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useDurianSafeNavigation } from "@/src/navigation/useDurianSafeNavigation";
import { KeyboardAwareScrollView } from "@/src/components/KeyboardAwareScrollView";
import { useSession } from "@/src/session/SessionContext";
import { durianTheme } from "@/src/theme/durianTheme";

import { knowledgeApi } from "./knowledgeApi";
import { canWriteKnowledge } from "./knowledgeLabels";
import type { KnowledgeArticle, KnowledgeCategoryOption, KnowledgeCoverImage, KnowledgeStatus } from "./knowledgeTypes";

type EditorMode = "create" | "edit";
type FormState = {
  author: string;
  category: string;
  content: string;
  coverImage: string | null;
  coverUpload: KnowledgeCoverImage | null;
  excerpt: string;
  featured: boolean;
  status: KnowledgeStatus;
  tags: string;
  title: string;
};

const EMPTY_FORM: FormState = { author: "", category: "", content: "", coverImage: null, coverUpload: null, excerpt: "", featured: false, status: "DRAFT", tags: "", title: "" };

export function DurianKnowledgeEditorScreen({ mode }: { mode: EditorMode }) {
  const navigation = useDurianSafeNavigation();
  const { session } = useSession();
  const role = session?.user.backendRole;
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const articleId = Array.isArray(id) ? id[0] : id;
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [categories, setCategories] = useState<KnowledgeCategoryOption[]>([]);
  const [loading, setLoading] = useState(mode === "edit");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canPublishDirectly = role === "ADMIN";
  const canSubmit = useMemo(() => Boolean(form.title.trim() && form.category.trim() && form.excerpt.trim() && form.content.trim()), [form.category, form.content, form.excerpt, form.title]);

  const update = <Key extends keyof FormState>(key: Key, value: FormState[Key]) => setForm((current) => ({ ...current, [key]: value }));

  useEffect(() => {
    void (async () => {
      setLoading(mode === "edit");
      try {
        const options = await knowledgeApi.categoryOptions();
        setCategories(options);
        if (!form.category && options[0]?.value) update("category", options[0].value);
        if (mode === "edit" && articleId) {
          const source = role === "ADMIN" ? await knowledgeApi.listAdmin({ page: 0, size: 100, sort: "updatedAt,desc" }) : await knowledgeApi.listMine({ page: 0, size: 100, sort: "updatedAt,desc" });
          const article = source.articles.find((item) => item.id === articleId || item.slug === articleId);
          if (!article) throw new Error("Không tìm thấy bài có quyền chỉnh sửa.");
          setForm(fromArticle(article));
        }
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Không tải được form Knowledge.");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [articleId, mode, role]);

  const pickCover = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Cần quyền ảnh", "Cho phép DurianCare chọn ảnh bìa bài viết.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.86 });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const name = asset.fileName ?? `knowledge-cover-${Date.now()}.jpg`;
    update("coverImage", asset.uri);
    update("coverUpload", { name, type: asset.mimeType ?? "image/jpeg", uri: asset.uri });
  }, []);

  const save = useCallback(async (status: KnowledgeStatus) => {
    if (!canSubmit) {
      Alert.alert("Thiếu thông tin", "Vui lòng nhập đủ tiêu đề, danh mục, tóm tắt và nội dung.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      let saved = await knowledgeApi.save({
        author: form.author.trim(),
        category: form.category.trim(),
        content: form.content.trim(),
        excerpt: form.excerpt.trim(),
        featured: canPublishDirectly ? form.featured : false,
        status,
        tags: form.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
        title: form.title.trim(),
      }, mode === "edit" ? articleId : null);
      if (form.coverUpload) {
        saved = await knowledgeApi.uploadCover(saved.id, form.coverUpload);
      }
      Alert.alert("Đã lưu", status === "DRAFT" ? "Bản nháp đã được lưu." : "Bài đã được gửi theo workflow backend.");
      navigation.replace("/(main)/knowledge/my-articles");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Không lưu được bài viết.");
    } finally {
      setSaving(false);
    }
  }, [articleId, canPublishDirectly, canSubmit, form, mode, navigation]);

  if (!canWriteKnowledge(role)) {
    return <SafeAreaView style={styles.center}><Text style={styles.title}>Bạn không có quyền tạo bài Knowledge.</Text></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.replace("/(main)/knowledge/my-articles")} style={styles.iconButton}><ArrowLeft color={durianTheme.colors.mossDark} size={20} /></Pressable>
        <Text style={styles.topTitle}>{mode === "edit" ? "Sửa bài Knowledge" : "Tạo bài Knowledge"}</Text>
        <View style={styles.iconButtonGhost} />
      </View>
      <KeyboardAwareScrollView contentContainerStyle={styles.content}>
        {loading ? <ActivityIndicator color={durianTheme.colors.moss} /> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Field label="Tiêu đề"><TextInput onChangeText={(value) => update("title", value)} placeholder="Tên bài viết" style={styles.input} value={form.title} /></Field>
        <Field label="Tác giả hiển thị"><TextInput onChangeText={(value) => update("author", value)} placeholder={session?.user.name ?? "Tên tác giả"} style={styles.input} value={form.author} /></Field>
        <Field label="Danh mục">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
            {categories.map((item) => <Pressable key={item.value} onPress={() => update("category", item.value)} style={[styles.categoryButton, form.category === item.value && styles.categoryButtonActive]}><Text style={[styles.categoryText, form.category === item.value && styles.categoryTextActive]}>{item.label}</Text></Pressable>)}
          </ScrollView>
        </Field>
        <Field label="Tóm tắt"><TextInput multiline onChangeText={(value) => update("excerpt", value)} placeholder="Tối đa 600 ký tự theo backend" style={[styles.input, styles.textAreaSmall]} value={form.excerpt} /></Field>
        <Field label="Nội dung"><TextInput multiline onChangeText={(value) => update("content", value)} placeholder="Có thể nhập plain text hoặc HTML đơn giản giống Web." style={[styles.input, styles.textArea]} value={form.content} /></Field>
        <Field label="Tags"><TextInput onChangeText={(value) => update("tags", value)} placeholder="Ví dụ: cháy lá, phòng trị, mùa mưa" style={styles.input} value={form.tags} /></Field>
        <Field label="Ảnh bìa">
          {form.coverImage ? <Image source={{ uri: form.coverImage }} style={styles.coverPreview} /> : null}
          <Pressable onPress={() => void pickCover()} style={styles.secondaryButton}><ImagePlus color={durianTheme.colors.moss} size={18} /><Text style={styles.secondaryText}>Chọn ảnh bìa</Text></Pressable>
        </Field>
        <View style={styles.actions}>
          <Pressable disabled={saving} onPress={() => void save("DRAFT")} style={[styles.secondaryButton, saving && styles.disabled]}><Save color={durianTheme.colors.moss} size={18} /><Text style={styles.secondaryText}>Lưu nháp</Text></Pressable>
          <Pressable disabled={saving} onPress={() => void save(canPublishDirectly ? "PUBLISHED" : "REVIEW")} style={[styles.primaryButton, saving && styles.disabled]}>{saving ? <ActivityIndicator color={durianTheme.colors.white} /> : <Send color={durianTheme.colors.white} size={18} />}<Text style={styles.primaryText}>{canPublishDirectly ? "Xuất bản" : "Gửi duyệt"}</Text></Pressable>
        </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

function fromArticle(article: KnowledgeArticle): FormState {
  return { author: article.author, category: article.category, content: article.content, coverImage: article.coverImage, coverUpload: null, excerpt: article.excerpt, featured: article.featured, status: article.status, tags: article.tags.join(", "), title: article.title };
}

function Field({ children, label }: { children: ReactNode; label: string }) {
  return <View style={styles.field}><Text style={styles.label}>{label}</Text>{children}</View>;
}

const styles = StyleSheet.create({
  actions: { flexDirection: "row", gap: 10 },
  categoryButton: { backgroundColor: durianTheme.colors.surface, borderColor: "#E4E1D1", borderRadius: durianTheme.radius.pill, borderWidth: 1, paddingHorizontal: 13, paddingVertical: 10 },
  categoryButtonActive: { backgroundColor: durianTheme.colors.moss, borderColor: durianTheme.colors.moss },
  categoryRow: { gap: 8 },
  categoryText: { color: durianTheme.colors.moss, fontSize: 12, fontWeight: "900" },
  categoryTextActive: { color: durianTheme.colors.white },
  center: { alignItems: "center", backgroundColor: durianTheme.colors.canvas, flex: 1, justifyContent: "center", padding: 24 },
  content: { gap: 15, padding: 18, paddingBottom: 42 },
  coverPreview: { borderRadius: 18, height: 180, width: "100%" },
  disabled: { opacity: 0.55 },
  error: { backgroundColor: "#FFF1ED", borderRadius: 14, color: durianTheme.colors.danger, fontSize: 13, fontWeight: "800", lineHeight: 20, padding: 12 },
  field: { gap: 8 },
  iconButton: { alignItems: "center", backgroundColor: durianTheme.colors.durianYellow, borderRadius: 14, height: 42, justifyContent: "center", width: 42 },
  iconButtonGhost: { height: 42, width: 42 },
  input: { backgroundColor: durianTheme.colors.surface, borderColor: "#E4E1D1", borderRadius: 15, borderWidth: 1, color: durianTheme.colors.ink, fontSize: 14, lineHeight: 20, paddingHorizontal: 13, paddingVertical: 12 },
  label: { color: durianTheme.colors.ink, fontSize: 13, fontWeight: "900", lineHeight: 18 },
  primaryButton: { alignItems: "center", backgroundColor: durianTheme.colors.moss, borderRadius: 15, flex: 1, flexDirection: "row", gap: 8, justifyContent: "center", minHeight: 48 },
  primaryText: { color: durianTheme.colors.white, fontSize: 14, fontWeight: "900" },
  safeArea: { backgroundColor: durianTheme.colors.canvas, flex: 1 },
  secondaryButton: { alignItems: "center", backgroundColor: durianTheme.colors.surface, borderColor: "#DDE6DA", borderRadius: 15, borderWidth: 1, flex: 1, flexDirection: "row", gap: 8, justifyContent: "center", minHeight: 48, paddingHorizontal: 12 },
  secondaryText: { color: durianTheme.colors.moss, fontSize: 14, fontWeight: "900" },
  textArea: { minHeight: 220, textAlignVertical: "top" },
  textAreaSmall: { minHeight: 92, textAlignVertical: "top" },
  title: { color: durianTheme.colors.ink, fontSize: 18, fontWeight: "900", lineHeight: 25, textAlign: "center" },
  topBar: { alignItems: "center", backgroundColor: durianTheme.colors.moss, flexDirection: "row", minHeight: 62, paddingHorizontal: 14 },
  topTitle: { color: durianTheme.colors.white, flex: 1, fontSize: 16, fontWeight: "900", textAlign: "center" },
});
