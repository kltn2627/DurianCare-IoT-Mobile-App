import { ArrowLeft, Send, Trash2 } from "lucide-react-native";
import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useDurianSafeNavigation } from "@/src/navigation/useDurianSafeNavigation";
import { KeyboardAwareScrollView } from "@/src/components/KeyboardAwareScrollView";
import { useSession } from "@/src/session/SessionContext";
import { durianTheme } from "@/src/theme/durianTheme";

import { CommunityPostCard } from "./CommunityPostCard";
import { communityApi } from "./communityApi";
import { formatCommunityTime } from "./communityDate";
import { canModerateCommunity } from "./communityLabels";
import type { CommunityComment, CommunityPost, CommunityReactionType } from "./communityTypes";

export function DurianCommunityPostDetailScreen() {
  const { postId } = useLocalSearchParams<{ postId?: string | string[] }>();
  const id = Array.isArray(postId) ? postId[0] : postId;
  const navigation = useDurianSafeNavigation();
  const { session } = useSession();
  const [post, setPost] = useState<CommunityPost | null>(null);
  const [comment, setComment] = useState("");
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const isAdmin = canModerateCommunity(session?.user.backendRole);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError("");
    try {
      setPost(await communityApi.detail(id));
    } catch (loadError) {
      setError(messageOf(loadError));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const run = useCallback(async (action: () => Promise<CommunityPost | void>) => {
    setBusy(true);
    try {
      const updated = await action();
      if (updated) setPost(updated);
      else navigation.replace("/(main)/community");
    } catch (actionError) {
      Alert.alert("Không thực hiện được", messageOf(actionError));
    } finally {
      setBusy(false);
    }
  }, [navigation]);

  const submitComment = useCallback(async (parentId?: string) => {
    if (!post) return;
    const content = parentId ? replyDrafts[parentId]?.trim() : comment.trim();
    if (!content) return;
    await run(async () => {
      const updated = await communityApi.comment(post.id, content, parentId);
      if (parentId) setReplyDrafts((current) => ({ ...current, [parentId]: "" }));
      else setComment("");
      return updated;
    });
  }, [comment, post, replyDrafts, run]);

  if (loading) {
    return <SafeAreaView style={styles.center}><ActivityIndicator color={durianTheme.colors.moss} /><Text style={styles.emptyText}>Đang tải bài viết...</Text></SafeAreaView>;
  }

  if (!post) {
    return <SafeAreaView style={styles.center}><Text style={styles.errorText}>{error || "Không tìm thấy bài viết."}</Text><Pressable onPress={() => navigation.replace("/(main)/community")} style={styles.primaryButton}><Text style={styles.primaryButtonText}>Về cộng đồng</Text></Pressable></SafeAreaView>;
  }

  const canDeletePost = post.author.id === session?.user.id || isAdmin;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.replace("/(main)/community")} style={styles.iconButton}><ArrowLeft color={durianTheme.colors.mossDark} size={20} /></Pressable>
        <Text style={styles.topTitle}>Chi tiết bài viết</Text>
        <View style={styles.iconButtonGhost} />
      </View>
      <KeyboardAwareScrollView contentContainerStyle={styles.content}>
        <CommunityPostCard
          canDelete={canDeletePost}
          canModerate={isAdmin}
          onComment={() => undefined}
          onDelete={() => confirmDelete(post, () => void run(async () => { await communityApi.delete(post.id); }))}
          onOpen={() => undefined}
          onReact={(type: CommunityReactionType | null) => void run(() => communityApi.react(post.id, type))}
          onReport={() => void run(() => communityApi.report(post.id))}
          post={post}
        />
        <View style={styles.commentBox}>
          <TextInput multiline onChangeText={setComment} placeholder="Viết bình luận..." placeholderTextColor={durianTheme.colors.muted} style={styles.commentInput} value={comment} />
          <Pressable disabled={busy || !comment.trim()} onPress={() => void submitComment()} style={[styles.sendButton, (busy || !comment.trim()) && styles.disabled]}><Send color={durianTheme.colors.white} size={18} /></Pressable>
        </View>
        <Text style={styles.sectionTitle}>Bình luận ({post.commentCount})</Text>
        {post.comments.length ? post.comments.map((item) => (
          <CommentNode
            canDelete={(authorId) => isAdmin || post.author.id === session?.user.id || authorId === session?.user.id}
            comment={item}
            key={item.id}
            onDelete={(commentId) => void run(() => communityApi.deleteComment(post.id, commentId))}
            onReply={(commentId) => void submitComment(commentId)}
            replyDraft={replyDrafts[item.id] ?? ""}
            setReplyDraft={(value) => setReplyDrafts((current) => ({ ...current, [item.id]: value }))}
          />
        )) : <Text style={styles.emptyText}>Chưa có bình luận.</Text>}
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

function CommentNode({ canDelete, comment, onDelete, onReply, replyDraft, setReplyDraft }: { canDelete: (authorId: string) => boolean; comment: CommunityComment; onDelete: (commentId: string) => void; onReply: (commentId: string) => void; replyDraft: string; setReplyDraft: (value: string) => void }) {
  return (
    <View style={styles.commentCard}>
      <View style={styles.commentHeader}><Text style={styles.commentAuthor}>{comment.author.fullName}</Text><Text style={styles.commentTime}>{formatCommunityTime(comment.createdAt)}</Text></View>
      <Text style={styles.commentContent}>{comment.content}</Text>
      <View style={styles.commentActions}>
        <TextInput onChangeText={setReplyDraft} placeholder="Trả lời..." style={styles.replyInput} value={replyDraft} />
        <Pressable onPress={() => onReply(comment.id)} style={styles.replyButton}><Send color={durianTheme.colors.moss} size={15} /></Pressable>
        {canDelete(comment.author.id) ? <Pressable onPress={() => onDelete(comment.id)} style={styles.replyButton}><Trash2 color={durianTheme.colors.danger} size={15} /></Pressable> : null}
      </View>
      {comment.replies.map((reply) => <View key={reply.id} style={styles.replyCard}><Text style={styles.commentAuthor}>{reply.author.fullName}</Text><Text style={styles.commentContent}>{reply.content}</Text>{canDelete(reply.author.id) ? <Pressable onPress={() => onDelete(reply.id)}><Text style={styles.deleteText}>Xóa</Text></Pressable> : null}</View>)}
    </View>
  );
}

function confirmDelete(post: CommunityPost, onConfirm: () => void) {
  Alert.alert("Ẩn bài viết?", "Backend sẽ chuyển trạng thái bài sang HIDDEN.", [
    { text: "Hủy", style: "cancel" },
    { onPress: onConfirm, style: "destructive", text: "Ẩn bài" },
  ]);
}

function messageOf(error: unknown) {
  return error instanceof Error ? error.message : "Không thể xử lý bài viết.";
}

const styles = StyleSheet.create({
  center: { alignItems: "center", backgroundColor: durianTheme.colors.canvas, flex: 1, gap: 12, justifyContent: "center", padding: 24 },
  commentActions: { alignItems: "center", flexDirection: "row", gap: 8, marginTop: 10 },
  commentAuthor: { color: durianTheme.colors.ink, fontSize: 13, fontWeight: "900" },
  commentBox: { alignItems: "center", backgroundColor: durianTheme.colors.surface, borderColor: "#E4E1D1", borderRadius: 18, borderWidth: 1, flexDirection: "row", gap: 8, marginHorizontal: 16, padding: 10 },
  commentCard: { backgroundColor: durianTheme.colors.surface, borderColor: "#E4E1D1", borderRadius: 16, borderWidth: 1, marginHorizontal: 16, padding: 13 },
  commentContent: { color: durianTheme.colors.ink, fontSize: 13, lineHeight: 20, marginTop: 6 },
  commentHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  commentInput: { color: durianTheme.colors.ink, flex: 1, fontSize: 13, maxHeight: 100, minHeight: 42 },
  commentTime: { color: durianTheme.colors.muted, fontSize: 11, fontWeight: "700" },
  content: { gap: 12, paddingBottom: 38, paddingTop: 12 },
  deleteText: { color: durianTheme.colors.danger, fontSize: 12, fontWeight: "900", marginTop: 5 },
  disabled: { opacity: 0.5 },
  emptyText: { color: durianTheme.colors.muted, fontSize: 13, fontWeight: "800", lineHeight: 20, textAlign: "center" },
  errorText: { color: durianTheme.colors.danger, fontSize: 14, fontWeight: "900", textAlign: "center" },
  iconButton: { alignItems: "center", backgroundColor: durianTheme.colors.durianYellow, borderRadius: 14, height: 42, justifyContent: "center", width: 42 },
  iconButtonGhost: { height: 42, width: 42 },
  primaryButton: { backgroundColor: durianTheme.colors.moss, borderRadius: 14, paddingHorizontal: 18, paddingVertical: 12 },
  primaryButtonText: { color: durianTheme.colors.white, fontWeight: "900" },
  replyButton: { alignItems: "center", backgroundColor: durianTheme.colors.mossSoft, borderRadius: 11, height: 36, justifyContent: "center", width: 36 },
  replyCard: { backgroundColor: "#F7F5EA", borderRadius: 13, marginLeft: 18, marginTop: 10, padding: 10 },
  replyInput: { backgroundColor: "#F7F5EA", borderRadius: 12, color: durianTheme.colors.ink, flex: 1, minHeight: 36, paddingHorizontal: 10 },
  safeArea: { backgroundColor: durianTheme.colors.canvas, flex: 1 },
  sectionTitle: { color: durianTheme.colors.ink, fontSize: 17, fontWeight: "900", marginHorizontal: 16, marginTop: 8 },
  sendButton: { alignItems: "center", backgroundColor: durianTheme.colors.moss, borderRadius: 14, height: 44, justifyContent: "center", width: 44 },
  topBar: { alignItems: "center", backgroundColor: durianTheme.colors.moss, flexDirection: "row", minHeight: 62, paddingHorizontal: 14 },
  topTitle: { color: durianTheme.colors.white, flex: 1, fontSize: 16, fontWeight: "900", textAlign: "center" },
});
