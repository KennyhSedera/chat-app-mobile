import avatar from "@/assets/images/download.png";
import { Ionicons } from "@expo/vector-icons";
import { Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../contexts/AuthContext";
import { useAppColors } from "../hooks/colors";

const HomeScreen = () => {
  const { colors } = useAppColors();
  const { user: currentUser } = useAuth();

  const RenderItem = ({ item }) => {
    return (
      <View
        style={{
          marginTop: 6,
          gap: 6,
          padding: 14,
          backgroundColor: colors.card,
          borderRadius: 20,
          minHeight: 200,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginVertical: 4,
          }}
        >
          <Image
            source={{ uri: currentUser.avatar }}
            style={{
              width: 30,
              height: 30,
              borderRadius: 50,
              marginRight: 10,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          />
          <View>
            <Text
              style={[{ color: colors.text, fontSize: 14, fontWeight: "bold" }]}
            >
              {currentUser?.name}
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 10 }}>
              {currentUser?.email}
            </Text>
          </View>
        </View>
        <Image source={avatar} style={{ width: "100%", borderRadius: 10 }} />
        <View style={{ flexDirection: "row", gap: 6 }}>
          <Ionicons name="heart-outline" size={20} color={colors.text} />
          <Ionicons name="chatbubble-outline" size={18} color={colors.text} />
        </View>
        <Text>
          Lorem ipsum dolor, sit amet consectetur adipisicing elit. Culpa
          quaerat impedit sit veniam cupiditate eius tenetur assumenda, quidem
          ut cumque maxime excepturi dolorem? Aliquam at quia magni velit autem
          tempore!
        </Text>
      </View>
    );
  };

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 80 }}
    >
      <View
        style={[
          styles.searchInput,
          { borderColor: colors.border, backgroundColor: colors.card },
        ]}
      >
        <Ionicons name="search" size={22} color={colors.text} />
        <Text style={[{ color: colors.placeholder }]}>
          Rechercher quelque chose ....
        </Text>
      </View>

      <RenderItem />
      <RenderItem />
      <RenderItem />
      <RenderItem />
      <RenderItem />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 6 },
  searchInput: {
    padding: 10,
    paddingHorizontal: 20,
    borderRadius: 50,
    marginTop: 12,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
});

export default HomeScreen;
