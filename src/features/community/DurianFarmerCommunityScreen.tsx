import { Heart, MessageCircle, Plus, RefreshCw, Send, Users, X } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DurianScreenHeader } from "@/src/components/DurianScreenHeader";
import { useSession } from "@/src/session/SessionContext";
import { durianTheme } from "@/src/theme/durianTheme";

import {
  addCommentToPost,
  createCommunityPost,
  fetchCommunityFeed,
  reactToPost,
  type CommunityPostDTO,
} from "./communityApi";

export function DurianFarmerCommunity() {
  const { session } = useSession();
  const [posts, setPosts] = useState<CommunityPostDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openComments, setOpenComments] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState("");
  const [showComposer, setShowComposer] = useState(false);
  const [postTopic, setPostTopic] = useState("");
  const [postContent, setPostContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadFeed = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const page = await fetchCommunityFeed(0, 20);
      setPosts(page.content);
    } catch {
      setError("Không tải được bài viết. Kiểm tra kết nối mạng.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  async function toggleLike(postId: string) {
    const post = posts.find((p) => p.id === postId);
    const hasReacted = post?.myReaction != null;
    try {
      const updated = await reactToPost(postId, hasReacted ? null : "LIKE");
      setPosts((current) => current.map((p) => (p.id === postId ? updated : p)));
    } catch {
      // optimistic revert not needed — just leave state unchanged
    }
  }

  async function addComment(postId: string) {
    const comment = commentDraft.trim();
    if (!comment) return;
    setCommentDraft("");
    try {
      const updated = await addCommentToPost(postId, comment);
      setPosts((current) => current.map((p) => (p.id === postId ? updated : p)));
    } catch {
      setCommentDraft(comment);
    }
  }

  async function publishPost() {
    const content = postContent.trim();
    if (!content || submitting) return;
    setSubmitting(true);
    try {
      const created = await createCommunityPost(content, postTopic.trim() || undefined);
      setPosts((current) => [created, ...current]);
      setPostTopic("");
      setPostContent("");
      setShowComposer(false);
    } catch {
      // keep composer open so user can retry
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <DurianScreenHeader
        eyebrow="MẠNG LƯỚI NHÀ NÔNG"
        icon={Users}
        title="Cộng đồng DurianCare"
        subtitle="Chia sẻ ảnh bệnh lá và trao đổi kinh nghiệm canh tác cùng nhà nông."
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.toolbarRow}>
          <Pressable onPress={() => setShowComposer((value) => !value)} style={styles.createButton}>
            {showComposer ? (
              <X color={durianTheme.colors.mossDark} size={20} />
            ) : (
              <Plus color={durianTheme.colors.mossDark} size={20} />
            )}
            <Text style={styles.createButtonText}>
              {showComposer ? "Đóng trình soạn bài" : "Đăng tình trạng vườn"}
            </Text>
          </Pressable>
          <Pressable
            disabled={loading}
            hitSlop={8}
            onPress={loadFeed}
            style={({ pressed }) => [styles.refreshButton, pressed && styles.pressed]}
          >
            <RefreshCw color={durianTheme.colors.moss} size={18} />
          </Pressable>
        </View>

        {showComposer ? (
          <View style={styles.postComposer}>
            <Text style={styles.composerTitle}>Tạo bài viết mới</Text>
            <TextInput
              onChangeText={setPostTopic}
              placeholder="Chủ đề, ví dụ: Cháy lá Khu A"
              placeholderTextColor={durianTheme.colors.muted}
              style={styles.postTitleInput}
              value={postTopic}
            />
            <TextInput
              multiline
              onChangeText={setPostContent}
              placeholder="Mô tả tình trạng lá và kinh nghiệm cần trao đổi..."
              placeholderTextColor={durianTheme.colors.muted}
              style={styles.postContentInput}
              value={postContent}
            />
            <Pressable
              disabled={submitting || !postContent.trim()}
              onPress={publishPost}
              style={[styles.publishButton, (submitting || !postContent.trim()) && styles.disabled]}
            >
              {submitting ? (
                <ActivityIndicator color={durianTheme.colors.mossDark} size="small" />
              ) : (
                <Send color={durianTheme.colors.mossDark} size={18} />
              )}
              <Text style={styles.publishButtonText}>Đăng bài</Text>
            </Pressable>
          </View>
        ) : null}

        {loading && posts.length === 0 ? (
          <ActivityIndicator color={durianTheme.colors.moss} style={styles.loader} />
        ) : error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : posts.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>Chưa có bài viết nào trong cộng đồng.</Text>
          </View>
        ) : null}

        {posts.map((post) => {
          const isLiked = post.myReaction != null;
          const commentsVisible = openComments === post.id;
          const firstImage = post.media.find((m) => m.type === "IMAGE");
          return (
            <View key={post.id} style={styles.postCard}>
              <View style={styles.authorRow}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{(post.author.name ?? "?").charAt(0)}</Text>
                </View>
                <View style={styles.authorCopy}>
                  <Text style={styles.author}>{post.author.name}</Text>
                  {post.topic ? <Text style={styles.location}>{post.topic}</Text> : null}
                </View>
                <Text style={styles.time}>
                  {post.createdAt ? new Date(post.createdAt).toLocaleDateString("vi-VN") : ""}
                </Text>
              </View>

              {firstImage ? (
                <Image resizeMode="cover" source={{ uri: firstImage.url }} style={styles.postImage} />
              ) : null}

              <View style={styles.postBody}>
                {post.tags.length > 0 ? (
                  <View style={styles.tag}>
                    <Text style={styles.tagText}>{post.tags[0]}</Text>
                  </View>
                ) : null}
                <Text style={styles.postContent}>{post.content}</Text>

                <View style={styles.actions}>
                  <Pressable onPress={() => toggleLike(post.id)} style={styles.action}>
                    <Heart
                      color={isLiked ? durianTheme.colors.danger : durianTheme.colors.moss}
                      fill={isLiked ? durianTheme.colors.danger : "transparent"}
                      size={20}
                    />
                    <Text style={styles.actionText}>{post.reactionCount} Thích</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setOpenComments(commentsVisible ? null : post.id)}
                    style={styles.action}
                  >
                    <MessageCircle color={durianTheme.colors.moss} size={20} />
                    <Text style={styles.actionText}>{post.commentCount} Bình luận</Text>
                  </Pressable>
                </View>

                {commentsVisible ? (
                  <View style={styles.comments}>
                    {post.comments.map((comment) => (
                      <View key={comment.id} style={styles.commentBubble}>
                        <Text style={styles.commentAuthor}>{comment.author.name}</Text>
                        <Text style={styles.commentText}>{comment.content}</Text>
                      </View>
                    ))}
                    <View style={styles.commentComposer}>
                      <TextInput
                        onChangeText={setCommentDraft}
                        placeholder="Chia sẻ kinh nghiệm..."
                        placeholderTextColor={durianTheme.colors.muted}
                        style={styles.commentInput}
                        value={commentDraft}
                      />
                      <Pressable onPress={() => addComment(post.id)} style={styles.commentSend}>
                        <Send color={durianTheme.colors.mossDark} size={17} />
                      </Pressable>
                    </View>
                  </View>
                ) : null}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  action: { alignItems: "center", flexDirection: "row", gap: 7 },
  actionText: { color: durianTheme.colors.muted, fontSize: 12, fontWeight: "800" },
  actions: {
    borderTopColor: durianTheme.colors.mossSoft,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 24,
    paddingTop: 14,
  },
  disabled: { opacity: 0.5 },
  emptyCard: { alignItems: "center", paddingVertical: 32 },
  emptyText: { color: durianTheme.colors.muted, fontSize: 14, lineHeight: 21 },
  errorCard: {
    backgroundColor: "#FBE9E5",
    borderRadius: 14,
    padding: 14,
  },
  errorText: { color: durianTheme.colors.danger, fontSize: 13, lineHeight: 20 },
  loader: { paddingVertical: 32 },
  pressed: { opacity: 0.82, transform: [{ scale: 0.98 }] },
  refreshButton: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.mossSoft,
    borderRadius: 20,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  toolbarRow: { alignItems: "center", flexDirection: "row", gap: 10 },
  author: { color: durianTheme.colors.ink, fontSize: 14, fontWeight: "900" },
  authorCopy: { flex: 1 },
  authorRow: { alignItems: "center", flexDirection: "row", gap: 10, padding: 16 },
  avatar: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.moss,
    borderRadius: 22,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  avatarText: { color: durianTheme.colors.durianYellow, fontSize: 18, fontWeight: "900" },
  commentAuthor: { color: durianTheme.colors.moss, fontSize: 10, fontWeight: "900" },
  commentBubble: { backgroundColor: durianTheme.colors.canvas, borderRadius: 12, gap: 3, padding: 10 },
  commentComposer: { alignItems: "center", flexDirection: "row", gap: 8 },
  commentInput: {
    backgroundColor: durianTheme.colors.canvas,
    borderRadius: 15,
    color: durianTheme.colors.ink,
    flex: 1,
    fontSize: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  commentSend: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.durianYellow,
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  comments: { gap: 8 },
  commentText: { color: durianTheme.colors.ink, fontSize: 12, lineHeight: 17 },
  composerTitle: { color: durianTheme.colors.ink, fontSize: 16, fontWeight: "900" },
  content: { gap: 16, padding: 18, paddingBottom: 40 },
  createButton: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.durianYellow,
    borderRadius: durianTheme.radius.md,
    flex: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    paddingVertical: 14,
  },
  createButtonText: { color: durianTheme.colors.mossDark, fontSize: 13, fontWeight: "900" },
  location: { color: durianTheme.colors.muted, fontSize: 11, marginTop: 2 },
  postBody: { gap: 13, padding: 16 },
  postCard: { backgroundColor: durianTheme.colors.surface, borderRadius: durianTheme.radius.lg, overflow: "hidden" },
  postComposer: {
    backgroundColor: durianTheme.colors.surface,
    borderRadius: durianTheme.radius.md,
    gap: 11,
    padding: 16,
  },
  postContent: { color: durianTheme.colors.ink, fontSize: 14, lineHeight: 22 },
  postContentInput: {
    backgroundColor: durianTheme.colors.canvas,
    borderRadius: 13,
    color: durianTheme.colors.ink,
    fontSize: 13,
    minHeight: 100,
    padding: 12,
    textAlignVertical: "top",
  },
  postImage: { height: 250, width: "100%" },
  postTitleInput: {
    backgroundColor: durianTheme.colors.canvas,
    borderRadius: 13,
    color: durianTheme.colors.ink,
    fontSize: 13,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  publishButton: {
    alignItems: "center",
    backgroundColor: durianTheme.colors.durianYellow,
    borderRadius: 13,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    paddingVertical: 12,
  },
  publishButtonText: { color: durianTheme.colors.mossDark, fontSize: 12, fontWeight: "900" },
  safeArea: { backgroundColor: durianTheme.colors.canvas, flex: 1 },
  tag: {
    alignSelf: "flex-start",
    backgroundColor: durianTheme.colors.mossSoft,
    borderRadius: durianTheme.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  tagText: { color: durianTheme.colors.moss, fontSize: 10, fontWeight: "900" },
  time: { color: durianTheme.colors.muted, fontSize: 10 },
});
