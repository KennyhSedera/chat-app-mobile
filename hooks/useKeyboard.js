import React, { useEffect, useState } from "react";
import { Keyboard, KeyboardAvoidingView, Platform } from "react-native";

// Custom hook for keyboard visibility
export const useKeyboard = () => {
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      "keyboardDidShow",
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
        setIsKeyboardVisible(true);
      }
    );

    const keyboardDidHideListener = Keyboard.addListener(
      "keyboardDidHide",
      () => {
        setKeyboardHeight(0);
        setIsKeyboardVisible(false);
      }
    );

    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
    };
  }, []);

  return { keyboardHeight, isKeyboardVisible };
};

// KeyboardAware component for chat screens
export const KeyboardAwareView = ({ children, style }) => {
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[{ flex: 1 }, style]}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0} // Adjust for tab bar
    >
      {children}
    </KeyboardAvoidingView>
  );
};
