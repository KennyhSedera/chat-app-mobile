import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Image, Modal, StyleSheet, View } from "react-native";
import { useAppColors } from "../hooks/colors";

const ImageViewer = ({ visible, image, onClose }) => {
  const { colors } = useAppColors();
  return (
    <Modal
      visible={visible}
      transparent
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View
        style={[
          styles.container,
          {
            backgroundColor: `${colors.card}ef`,
          },
        ]}
      >
        <Ionicons
          name="close"
          size={25}
          color={colors.text}
          onPress={onClose}
          style={{ position: "absolute", top: 35, right: 10, zIndex: 1 }}
        />
        <Image
          source={{ uri: image }}
          style={{ width: "100%", height: "100%" }}
          resizeMode="contain"
        />
      </View>
    </Modal>
  );
};

export default ImageViewer;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
    height: "100%",
    position: "relative",
  },
});
