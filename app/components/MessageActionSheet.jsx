import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import EmojiPicker from "rn-emoji-keyboard";
import { useAppColors } from "../hooks/colors";
import AppModal from "./AppModal";

export const REACTIONS = ["❤️", "😆", "😮", "😢", "😡", "👍"];

const ACTIONS = [
  { key: "copy", label: "Copier", icon: "copy-outline" },
  { key: "edit", label: "Modifier", icon: "create-outline" },
  { key: "forward", label: "Transférer", icon: "arrow-redo-outline" },
  { key: "reply", label: "Répondre", icon: "arrow-undo-outline" },
  {
    key: "delete",
    label: "Supprimer",
    icon: "trash-outline",
    destructive: true,
  },
];

function ActionIcon({ item, color }) {
  return (
    <Ionicons
      name={item.icon}
      size={item.key === "copy" ? 14 : 18}
      color={color}
    />
  );
}

export default function MessageActionSheet({
  visible,
  onClose,
  onReact,
  onAction,
  message,
  userId,
  reaction,
}) {
  const { colors } = useAppColors();
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);

  const availableActions = ACTIONS.filter((action) => {
    if (action.key === "copy" && message?.contentType !== "text") {
      return false;
    }

    if (
      action.key === "edit" &&
      (message?.contentType !== "text" || message?.user._id !== userId)
    ) {
      return false;
    }

    if (action.key === "delete" && message?.user._id !== userId) {
      return false;
    }

    return true;
  });

  return (
    <AppModal visible={visible} onClose={onClose} position="bottom">
      <View style={styles.reactionsRow}>
        {REACTIONS.map((emoji) => (
          <TouchableOpacity
            key={emoji}
            style={[
              styles.reactionButton,
              reaction === emoji && {
                backgroundColor: colors.border,
              },
            ]}
            onPress={() => {
              onReact?.(emoji);
              onClose();
            }}
          >
            <Text
              style={[
                styles.reactionEmoji,
                reaction === emoji && {
                  fontSize: 26,
                },
              ]}
            >
              {emoji}
            </Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={styles.reactionButton}
          onPress={() => setEmojiPickerOpen(true)}
        >
          <View style={[styles.moreButton, { backgroundColor: colors.border }]}>
            <Ionicons name="add" size={20} color={colors.text} />
          </View>
        </TouchableOpacity>
      </View>

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      {availableActions.map((item) => (
        <TouchableOpacity
          key={item.key}
          style={styles.actionRow}
          onPress={() => {
            onAction?.(item.key);
            onClose();
          }}
        >
          <View
            style={[styles.actionIconWrap, { backgroundColor: colors.border }]}
          >
            <ActionIcon
              item={item}
              color={item.destructive ? colors.danger : colors.text}
            />
          </View>
          <Text
            style={[
              styles.actionLabel,
              { color: item.destructive ? colors.danger : colors.text },
            ]}
          >
            {item.label}
          </Text>
        </TouchableOpacity>
      ))}

      <EmojiPicker
        open={emojiPickerOpen}
        onClose={() => setEmojiPickerOpen(false)}
        onEmojiSelected={(emojiObject) => {
          onReact?.(emojiObject.emoji);
          setEmojiPickerOpen(false);
          onClose();
        }}
        theme={{
          backdrop: "rgba(0,0,0,0.5)",
          knob: colors.border,
          container: colors.card,
          header: colors.text,
          skinTonesContainer: colors.background,
          category: {
            icon: colors.text,
            iconActive: colors.primary,
            container: colors.background,
            containerActive: colors.border,
          },
        }}
      />
    </AppModal>
  );
}

const styles = StyleSheet.create({
  reactionsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  reactionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  reactionEmoji: {
    fontSize: 30,
  },
  moreButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginBottom: 8,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  actionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  actionLabel: {
    fontSize: 16,
  },
});
