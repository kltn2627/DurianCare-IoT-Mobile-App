import { Flag, Image as ImageIcon, MessageCircle, MoreHorizontal, Share2, Trash2 } from "lucide-react-native";
import { Linking, Pressable, Share, StyleSheet, Text, View } from "react-native";

import { DurianRemoteImage } from "@/src/components/DurianRemoteImage";
import { durianTheme } from "@/src/theme/durianTheme";

import { formatCommunityTime } from "./communityDate";
import { COMMUNITY_REACTIONS, COMMUNITY_STATUS_LABELS, reactionIcon } from "./communityLabels";
import type { CommunityPost, CommunityReactionType } from "./communityTypes";

export function CommunityPostCard({
  canDelete,
  canModerate,
  onComment,
  onDelete,
  onOpen,
  onReact,
  onReport,
  post,
}: {
  canDelete: boolean;
  canModerate: boolean;
  onComment: () => void;
  onDelete: () => void;
  onOpen: () => void;
  onReact: (type: CommunityReactionType | null) => void;
  onReport: () => void;
  post: CommunityPost;
}) {
  return (
    <Pressable onPress={onOpen} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.header}>
        <View style={styles.avatar}>{post.author.avatar ? <DurianRemoteImage feature="community-avatar" uri={post.author.avatar} style={styles.avatarImage} /> : <Text style={styles.avatarText}>{post.author.fullName.charAt(0).toUpperCase()}</Text>}</View>
        <View style={styles.identity}>
          <Text style={styles.author}>{post.author.fullName}</Text>
          <Text style={styles.meta}>{post.topic} · {formatCommunityTime(post.createdAt)}</Text>
        </View>
        <MoreHorizontal color={durianTheme.colors.muted} size={20} />
      </View>
      <Text style={styles.content}>{post.content}</Text>
      {post.tags.length ? <View style={styles.tags}>{post.tags.map((tag) => <Text key={tag} style={styles.tag}>{tag}</Text>)}</View> : null}
      <MediaPreview post={post} />
      {post.status !== "PUBLISHED" ? <Text style={styles.status}>{COMMUNITY_STATUS_LABELS[post.status]}</Text> : null}
      <View style={styles.stats}>
        <Text style={styles.stat}>{reactionIcon(post.myReaction)} {post.reactionCount}</Text>
        <Text style={styles.stat}>{post.commentCount} bình luận</Text>
        <Text style={styles.stat}>{post.shareCount} chia sẻ</Text>
      </View>
      <View style={styles.actions}>
        {COMMUNITY_REACTIONS.map((item) => (
          <Pressable key={item.type} onPress={() => onReact(post.myReaction === item.type ? null : item.type)} style={[styles.reactionButton, post.myReaction === item.type && styles.reactionButtonActive]}>
            <Text style={styles.reactionIcon}>{item.icon}</Text>
          </Pressable>
        ))}
        <Pressable onPress={onComment} style={styles.actionButton}><MessageCircle color={durianTheme.colors.moss} size={17} /><Text style={styles.actionText}>Bình luận</Text></Pressable>
        <Pressable onPress={() => void Share.share({ message: `${post.author.fullName}: ${post.content}\n\nduriancare://community/${post.id}` }).catch(() => undefined)} style={styles.iconButton}><Share2 color={durianTheme.colors.moss} size={17} /></Pressable>
        {!canDelete && !canModerate ? <Pressable onPress={onReport} style={styles.iconButton}><Flag color={durianTheme.colors.danger} size={17} /></Pressable> : null}
        {canDelete || canModerate ? <Pressable onPress={onDelete} style={styles.iconButton}><Trash2 color={durianTheme.colors.danger} size={17} /></Pressable> : null}
      </View>
    </Pressable>
  );
}

function MediaPreview({ post }: { post: CommunityPost }) {
  if (!post.media.length) return null;
  return (
    <View style={styles.mediaGrid}>
      {post.media.slice(0, 4).map((item, index) => (
        <Pressable key={item.id} onPress={() => item.type === "VIDEO" ? void Linking.openURL(item.url) : undefined} style={styles.mediaTile}>
          {item.type === "IMAGE" ? <DurianRemoteImage feature="community-post-media" uri={item.url} style={styles.mediaImage} /> : <View style={styles.videoTile}><ImageIcon color={durianTheme.colors.white} size={28} /><Text style={styles.videoText}>Video</Text></View>}
          {index === 3 && post.media.length > 4 ? <View style={styles.moreMedia}><Text style={styles.moreMediaText}>+{post.media.length - 3}</Text></View> : null}
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  actionButton: { alignItems: "center", backgroundColor: durianTheme.colors.mossSoft, borderRadius: 12, flexDirection: "row", gap: 6, minHeight: 38, paddingHorizontal: 10 },
  actionText: { color: durianTheme.colors.moss, fontSize: 12, fontWeight: "900" },
  actions: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 12 },
  author: { color: durianTheme.colors.ink, fontSize: 14, fontWeight: "900" },
  avatar: { alignItems: "center", backgroundColor: durianTheme.colors.moss, borderRadius: 22, height: 44, justifyContent: "center", overflow: "hidden", width: 44 },
  avatarImage: { height: "100%", width: "100%" },
  avatarText: { color: durianTheme.colors.durianYellow, fontSize: 18, fontWeight: "900" },
  card: { backgroundColor: durianTheme.colors.surface, borderColor: durianTheme.colors.border, borderRadius: durianTheme.radius.md, borderWidth: 1, marginHorizontal: durianTheme.spacing.xl, padding: durianTheme.spacing.lg, ...durianTheme.shadow.card },
  content: { color: durianTheme.colors.ink, fontSize: 14, lineHeight: 22, marginTop: 12 },
  header: { alignItems: "center", flexDirection: "row", gap: 10 },
  iconButton: { alignItems: "center", backgroundColor: durianTheme.colors.surface, borderColor: durianTheme.colors.border, borderRadius: durianTheme.radius.sm, borderWidth: 1, height: 38, justifyContent: "center", width: 38 },
  identity: { flex: 1 },
  mediaGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 12 },
  mediaImage: { height: "100%", width: "100%" },
  mediaTile: { backgroundColor: durianTheme.colors.mossSoft, borderRadius: 14, height: 128, overflow: "hidden", width: "48%" },
  meta: { color: durianTheme.colors.muted, fontSize: 11, fontWeight: "700", marginTop: 3 },
  moreMedia: { alignItems: "center", backgroundColor: "rgba(0,0,0,0.42)", bottom: 0, justifyContent: "center", left: 0, position: "absolute", right: 0, top: 0 },
  moreMediaText: { color: durianTheme.colors.white, fontSize: 24, fontWeight: "900" },
  pressed: { opacity: 0.86 },
  reactionButton: { alignItems: "center", backgroundColor: durianTheme.colors.surface, borderColor: durianTheme.colors.border, borderRadius: durianTheme.radius.sm, borderWidth: 1, height: 38, justifyContent: "center", width: 38 },
  reactionButtonActive: { backgroundColor: durianTheme.colors.warningSoft, borderColor: durianTheme.colors.durianYellow },
  reactionIcon: { fontSize: 17 },
  stat: { color: durianTheme.colors.muted, fontSize: 11, fontWeight: "800" },
  stats: { flexDirection: "row", gap: 12, marginTop: 12 },
  status: { color: durianTheme.colors.danger, fontSize: 12, fontWeight: "900", marginTop: 8 },
  tag: { color: durianTheme.colors.moss, fontSize: 12, fontWeight: "900" },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  videoText: { color: durianTheme.colors.white, fontSize: 12, fontWeight: "900" },
  videoTile: { alignItems: "center", backgroundColor: durianTheme.colors.moss, flex: 1, gap: 8, justifyContent: "center" },
});
