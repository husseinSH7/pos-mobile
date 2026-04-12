import React from "react";
import {
  FlatList,
  TouchableOpacity,
  Text,
  StyleSheet,
} from "react-native";
import { COLORS } from "../utils/colors";

interface Category {
  id: string;
  name: string;
}

interface CategoryTabsProps {
  categories: Category[];
  selected: string | null;
  onSelect: (id: string) => void;
}

export default function CategoryTabs({ categories, selected, onSelect }: CategoryTabsProps) {
  return (
    <FlatList
      horizontal
      data={categories}
      keyExtractor={(item) => item.id}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => {
        const isActive = selected === item.id;
        return (
          <TouchableOpacity
            style={[styles.tab, isActive && styles.tabActive]}
            onPress={() => onSelect(item.id)}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
              {item.name}
            </Text>
          </TouchableOpacity>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  tab: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 8,
  },
  tabActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  tabText: {
    color: COLORS.muted,
    fontWeight: "600",
    fontSize: 13,
  },
  tabTextActive: {
    color: "#fff",
  },
});