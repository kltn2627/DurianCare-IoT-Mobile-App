import { Heart, MessageCircle, Plus, Send, Users, X } from "lucide-react-native";
import { useState } from "react";
import {
  Image,
  ImageSourcePropType,
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

type FarmerPost = {
  author: string;
  comments: string[];
  content: string;
  id: string;
  image: ImageSourcePropType;
  likes: number;
  location: string;
  tag: string;
  time: string;
};

const initialPosts: FarmerPost[] = [
  {
    author: "Chú Bảy Vườn Ri6",
    comments: ["Nên kiểm tra thêm mặt dưới lá và độ ẩm trong tán."],
    content:
      "Sau ba ngày mưa liên tục, các đốm tròn màu nâu cam xuất hiện nhiều hơn trên lá già. Mọi người thường xử lý bước đầu thế nào?",
    id: "algal-spot",
    image: require("../../../assets/images/community/algal-leaf-spot.jpg"),
    likes: 24,
    location: "Cai Lậy, Tiền Giang",
    tag: "Đốm rong",
    time: "2 giờ trước",
  },
  {
    author: "Nhà vườn Cô Lan",
    comments: ["Cần tỉa thông tán và tránh tưới muộn vào chiều tối."],
    content:
      "Mép lá đang khô nhanh ở Khu B. Tôi đã đánh dấu cây và gửi ảnh cho kỹ sư để theo dõi thêm.",
    id: "leaf-blight",
    image: require("../../../assets/images/community/leaf-blight.jpg"),
    likes: 18,
    location: "Châu Thành, Bến Tre",
    tag: "Cháy lá",
    time: "Hôm qua",
  },
];

export function DurianFarmerCommunity() {
  const { session } = useSession();
  const [posts, setPosts] = useState(initialPosts);
  const [likedPostIds, setLikedPostIds] = useState<string[]>([]);
  const [openComments, setOpenComments] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState("");
  const [showComposer, setShowComposer] = useState(false);
  const [postTitle, setPostTitle] = useState("");
  const [postContent, setPostContent] = useState("");

  function toggleLike(postId: string) {
    setLikedPostIds((current) =>
      current.includes(postId)
        ? current.filter((id) => id !== postId)
        : [...current, postId],
    );
  }

  function addComment(postId: string) {
    const comment = commentDraft.trim();
    if (!comment) return;
    setPosts((current) =>
      current.map((post) =>
        post.id === postId ? { ...post, comments: [...post.comments, comment] } : post,
      ),
    );
    setCommentDraft("");
  }

  function publishPost() {
    const content = postContent.trim();
    if (!content) return;

    setPosts((current) => [
      {
        author: session?.user.name ?? "Nhà nông DurianCare",
        comments: [],
        content,
        id: `post-${Date.now()}`,
        image: require("../../../assets/images/community/leaf-blight.jpg"),
        likes: 0,
        location: "Khu A - Vườn An Nhiên",
        tag: postTitle.trim() || "Theo dõi bệnh lá",
        time: "Vừa đăng",
      },
      ...current,
    ]);
    setPostTitle("");
    setPostContent("");
    setShowComposer(false);
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

        {showComposer ? (
          <View style={styles.postComposer}>
            <Text style={styles.composerTitle}>Tạo bài viết mới</Text>
            <TextInput
              onChangeText={setPostTitle}
              placeholder="Chủ đề, ví dụ: Cháy lá Khu A"
              placeholderTextColor={durianTheme.colors.muted}
              style={styles.postTitleInput}
              value={postTitle}
            />
            <TextInput
              multiline
              onChangeText={setPostContent}
              placeholder="Mô tả tình trạng lá và kinh nghiệm cần trao đổi..."
              placeholderTextColor={durianTheme.colors.muted}
              style={styles.postContentInput}
              value={postContent}
            />
            <View style={styles.attachmentNote}>
              <Text style={styles.attachmentNoteText}>
                Ảnh bệnh lá sẽ được đính kèm từ bộ nhớ thiết bị trước khi đăng bài.
              </Text>
            </View>
            <Pressable onPress={publishPost} style={styles.publishButton}>
              <Send color={durianTheme.colors.mossDark} size={18} />
              <Text style={styles.publishButtonText}>Đăng bài</Text>
            </Pressable>
          </View>
        ) : null}

        {posts.map((post) => {
          const isLiked = likedPostIds.includes(post.id);
          const commentsVisible = openComments === post.id;
          return (
            <View key={post.id} style={styles.postCard}>
              <View style={styles.authorRow}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{post.author.charAt(0)}</Text>
                </View>
                <View style={styles.authorCopy}>
                  <Text style={styles.author}>{post.author}</Text>
                  <Text style={styles.location}>{post.location}</Text>
                </View>
                <Text style={styles.time}>{post.time}</Text>
              </View>

              <Image resizeMode="cover" source={post.image} style={styles.postImage} />

              <View style={styles.postBody}>
                <View style={styles.tag}>
                  <Text style={styles.tagText}>{post.tag}</Text>
                </View>
                <Text style={styles.postContent}>{post.content}</Text>

                <View style={styles.actions}>
                  <Pressable onPress={() => toggleLike(post.id)} style={styles.action}>
                    <Heart
                      color={isLiked ? durianTheme.colors.danger : durianTheme.colors.moss}
                      fill={isLiked ? durianTheme.colors.danger : "transparent"}
                      size={20}
                    />
                    <Text style={styles.actionText}>
                      {post.likes + (isLiked ? 1 : 0)} Thích
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setOpenComments(commentsVisible ? null : post.id)}
                    style={styles.action}
                  >
                    <MessageCircle color={durianTheme.colors.moss} size={20} />
                    <Text style={styles.actionText}>{post.comments.length} Bình luận</Text>
                  </Pressable>
                </View>

                {commentsVisible ? (
                  <View style={styles.comments}>
                    {post.comments.map((comment, index) => (
                      <View key={`${post.id}-${index}`} style={styles.commentBubble}>
                        <Text style={styles.commentAuthor}>Nhà nông DurianCare</Text>
                        <Text style={styles.commentText}>{comment}</Text>
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
  attachmentNote: {
    backgroundColor: durianTheme.colors.mossSoft,
    borderRadius: 11,
    padding: 10,
  },
  attachmentNoteText: { color: durianTheme.colors.moss, fontSize: 11, lineHeight: 16 },
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
