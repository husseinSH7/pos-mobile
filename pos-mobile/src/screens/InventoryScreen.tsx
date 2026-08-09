import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Search, AlertTriangle, Package, TrendingUp, TrendingDown } from 'lucide-react-native';

interface Ingredient {
  id: string;
  name: string;
  currentStock: number;
  minStock: number;
  unit: string;
  category: string;
  lastUpdated: string;
}

interface Recipe {
  id: string;
  name: string;
  ingredients: {
    ingredientId: string;
    quantity: number;
  }[];
}

export default function InventoryScreen() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [filteredIngredients, setFilteredIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [showLowStock, setShowLowStock] = useState(false);

  useEffect(() => {
    // Mock data - replace with actual API calls
    setTimeout(() => {
      const mockIngredients: Ingredient[] = [
        { id: '1', name: 'Beef Patty', currentStock: 45, minStock: 20, unit: 'pcs', category: 'Meat', lastUpdated: '2024-01-16' },
        { id: '2', name: 'Chicken Breast', currentStock: 12, minStock: 15, unit: 'pcs', category: 'Meat', lastUpdated: '2024-01-16' },
        { id: '3', name: 'Lettuce', currentStock: 8, minStock: 10, unit: 'heads', category: 'Vegetables', lastUpdated: '2024-01-15' },
        { id: '4', name: 'Tomato', currentStock: 25, minStock: 20, unit: 'pcs', category: 'Vegetables', lastUpdated: '2024-01-16' },
        { id: '5', name: 'Cheese Slice', currentStock: 150, minStock: 50, unit: 'pcs', category: 'Dairy', lastUpdated: '2024-01-16' },
        { id: '6', name: 'Burger Bun', currentStock: 80, minStock: 40, unit: 'pcs', category: 'Bakery', lastUpdated: '2024-01-16' },
        { id: '7', name: 'French Fries', currentStock: 5, minStock: 15, unit: 'kg', category: 'Frozen', lastUpdated: '2024-01-14' },
        { id: '8', name: 'Ketchup', currentStock: 3, minStock: 5, unit: 'bottles', category: 'Condiments', lastUpdated: '2024-01-15' },
        { id: '9', name: 'Onion', currentStock: 30, minStock: 25, unit: 'pcs', category: 'Vegetables', lastUpdated: '2024-01-16' },
        { id: '10', name: 'Pickles', currentStock: 20, minStock: 10, unit: 'jars', category: 'Condiments', lastUpdated: '2024-01-16' },
      ];

      setIngredients(mockIngredients);
      setFilteredIngredients(mockIngredients);
      setLoading(false);
    }, 1000);
  }, []);

  useEffect(() => {
    let filtered = ingredients;

    if (searchQuery) {
      filtered = filtered.filter(ingredient =>
        ingredient.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedCategory !== 'ALL') {
      filtered = filtered.filter(ingredient => ingredient.category === selectedCategory);
    }

    if (showLowStock) {
      filtered = filtered.filter(ingredient => ingredient.currentStock <= ingredient.minStock);
    }

    setFilteredIngredients(filtered);
  }, [searchQuery, selectedCategory, showLowStock, ingredients]);

  const categories = ['ALL', ...Array.from(new Set(ingredients.map(i => i.category)))];

  const handleAdjustStock = (ingredientId: string, adjustment: number) => {
    setIngredients(ingredients.map(ingredient =>
      ingredient.id === ingredientId
        ? { ...ingredient, currentStock: Math.max(0, ingredient.currentStock + adjustment) }
        : ingredient
    ));
  };

  const getStockStatus = (ingredient: Ingredient) => {
    if (ingredient.currentStock <= ingredient.minStock * 0.5) {
      return { status: 'Critical', color: '#ef4444' };
    } else if (ingredient.currentStock <= ingredient.minStock) {
      return { status: 'Low', color: '#f59e0b' };
    }
    return { status: 'OK', color: '#10b981' };
  };

  const lowStockCount = ingredients.filter(i => i.currentStock <= i.minStock).length;
  const criticalStockCount = ingredients.filter(i => i.currentStock <= i.minStock * 0.5).length;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#f97316" />
        <Text style={styles.loadingText}>Loading inventory...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Inventory</Text>
        <View style={styles.headerStats}>
          <View style={[styles.statBadge, { backgroundColor: '#ef4444' }]}>
            <AlertTriangle size={16} color="white" />
            <Text style={styles.statText}>{criticalStockCount} Critical</Text>
          </View>
          <View style={[styles.statBadge, { backgroundColor: '#f59e0b' }]}>
            <Package size={16} color="white" />
            <Text style={styles.statText}>{lowStockCount} Low Stock</Text>
          </View>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Search size={20} color="#9ca3af" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search ingredients..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#9ca3af"
        />
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
          {categories.map((category) => (
            <TouchableOpacity
              key={category}
              style={[
                styles.categoryChip,
                selectedCategory === category && styles.categoryChipActive,
              ]}
              onPress={() => setSelectedCategory(category)}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  selectedCategory === category && styles.categoryChipTextActive,
                ]}
              >
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <TouchableOpacity
          style={[styles.filterButton, showLowStock && styles.filterButtonActive]}
          onPress={() => setShowLowStock(!showLowStock)}
        >
          <AlertTriangle size={16} color={showLowStock ? '#f97316' : '#9ca3af'} />
          <Text style={[styles.filterButtonText, showLowStock && styles.filterButtonTextActive]}>
            Low Stock Only
          </Text>
        </TouchableOpacity>
      </View>

      {/* Inventory List */}
      <FlatList
        data={filteredIngredients}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const stockStatus = getStockStatus(item);
          return (
            <View style={styles.ingredientCard}>
              <View style={styles.ingredientHeader}>
                <View style={styles.ingredientInfo}>
                  <Text style={styles.ingredientName}>{item.name}</Text>
                  <Text style={styles.ingredientCategory}>{item.category}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: stockStatus.color + '20' }]}>
                  <Text style={[styles.statusText, { color: stockStatus.color }]}>
                    {stockStatus.status}
                  </Text>
                </View>
              </View>

              <View style={styles.stockInfo}>
                <View style={styles.stockValue}>
                  <Text style={styles.stockAmount}>{item.currentStock}</Text>
                  <Text style={styles.stockUnit}>{item.unit}</Text>
                </View>
                <Text style={styles.stockLabel}>
                  Min: {item.minStock} {item.unit}
                </Text>
              </View>

              <View style={styles.stockActions}>
                <TouchableOpacity
                  style={styles.stockActionButton}
                  onPress={() => handleAdjustStock(item.id, -1)}
                >
                  <TrendingDown size={20} color="#ef4444" />
                  <Text style={styles.stockActionText}>-1</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.stockActionButton}
                  onPress={() => handleAdjustStock(item.id, 1)}
                >
                  <TrendingUp size={20} color="#10b981" />
                  <Text style={styles.stockActionText}>+1</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.stockActionButton}
                  onPress={() => {
                    Alert.prompt(
                      'Adjust Stock',
                      `Enter adjustment for ${item.name}`,
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'OK',
                          onPress: (value) => {
                            const adjustment = parseInt(value || '0', 10);
                            if (!isNaN(adjustment)) {
                              handleAdjustStock(item.id, adjustment);
                            }
                          },
                        },
                      ],
                      'plain-text',
                      '0'
                    );
                  }}
                >
                  <Package size={20} color="#f97316" />
                  <Text style={styles.stockActionText}>Custom</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.lastUpdated}>Last updated: {item.lastUpdated}</Text>
            </View>
          );
        }}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Package size={48} color="#9ca3af" />
            <Text style={styles.emptyText}>No ingredients found</Text>
          </View>
        }
      />
    </View>
  );
}

import { ScrollView } from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  header: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },
  headerStats: {
    flexDirection: 'row',
    gap: 8,
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  statText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    margin: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  filtersContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  categoryScroll: {
    marginBottom: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: '#f97316',
    borderColor: '#f97316',
  },
  categoryChipText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  categoryChipTextActive: {
    color: '#ffffff',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 6,
    alignSelf: 'flex-start',
  },
  filterButtonActive: {
    backgroundColor: '#fff7ed',
    borderColor: '#f97316',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: '#f97316',
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  ingredientCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  ingredientHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  ingredientInfo: {
    flex: 1,
  },
  ingredientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  ingredientCategory: {
    fontSize: 14,
    color: '#6b7280',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  stockInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  stockValue: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  stockAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
  },
  stockUnit: {
    fontSize: 16,
    color: '#6b7280',
  },
  stockLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  stockActions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  stockActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 4,
  },
  stockActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  lastUpdated: {
    fontSize: 12,
    color: '#9ca3af',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
});
