import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Search, MapPin, Filter, Star, DollarSign } from "lucide-react-native";
import * as Location from "expo-location";
import { router } from "expo-router";

interface Category {
  category_id: string;
  category_name: string;
}

interface Professional {
  user_id: string;
  username: string;
  category_name: string;
  category_price: number;
  location: string | null;
  average_rating: number;
  total_reviews: number;
}

export default function ClientSearch() {
  const { userProfile } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<Location.LocationObject | null>(
    null
  );

  useEffect(() => {
    loadCategories();
    requestLocationPermission();
  }, []);

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("category_name");
      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error("Error loading categories:", error);
      Alert.alert("Error", "Could not load categories");
    }
  };

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Location Permission",
          "Location access is needed to find professionals near you"
        );
        return;
      }
      const currentLocation = await Location.getCurrentPositionAsync({});
      setLocation(currentLocation);
    } catch (error) {
      console.error("Error getting location:", error);
    }
  };

  const searchProfessionals = async (categoryId?: string) => {
    setLoading(true);
    try {
      let query = supabase
        .from("professional_jobs")
        .select(
          `
          user_id,
          category_price,
          users!inner ( username ),
          categories!inner ( category_name )
        `
        )
        .eq("is_active", true);

      if (categoryId) {
        query = query.eq("category_id", categoryId);
      }

      if (searchQuery.trim()) {
        query = query.ilike(
          "categories.category_name",
          `%${searchQuery.trim()}%`
        );
      }

      const { data, error } = await query.order("category_price", {
        ascending: true,
      });

      if (error) throw error;

      const transformed = (data || []).map((item: any) => ({
        user_id: item.user_id,
        username: item.users.username,
        category_name: item.categories.category_name,
        category_price: item.category_price,
        location: null,
        average_rating: 4.5,
        total_reviews: 12,
      }));

      setProfessionals(transformed);
    } catch (error) {
      console.error("Search error:", error);
      Alert.alert("Error", "Failed to search professionals");
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryPress = (categoryId: string) => {
    setSearchQuery("");
    searchProfessionals(categoryId);
  };

  const handleContactPress = (id: string) => {
    router.push({ pathname: "/messages", params: { id } });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Find Services</Text>
        <Text style={styles.subtitle}>
          Hello {userProfile?.username}! What are you looking for?
        </Text>

        <View style={styles.searchContainer}>
          <TouchableOpacity onPress={() => searchProfessionals()}>
            <Search size={20} color="#6B7280" style={styles.searchIcon} />
          </TouchableOpacity>

          <TextInput
            style={styles.searchInput}
            placeholder="Search for services..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9CA3AF"
            returnKeyType="search"
            onSubmitEditing={() => searchProfessionals()}
          />

          <TouchableOpacity
            onPress={() => searchProfessionals()}
            style={styles.filterButton}
          >
            <Filter size={20} color="#2563EB" />
          </TouchableOpacity>
        </View>

        {location && (
          <View style={styles.locationContainer}>
            <MapPin size={16} color="#10B981" />
            <Text style={styles.locationText}>
              Location enabled – finding nearby professionals
            </Text>
          </View>
        )}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Popular Categories</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoriesScroll}
          >
            {categories.map((category) => (
              <TouchableOpacity
                key={category.category_id}
                style={styles.categoryCard}
                onPress={() => handleCategoryPress(category.category_id)}
              >
                <Text style={styles.categoryName}>
                  {category.category_name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {loading && (
          <ActivityIndicator
            size="large"
            color="#2563EB"
            style={{ marginTop: 20 }}
          />
        )}

        {!loading && professionals.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Available Professionals</Text>
            {professionals.map((p) => (
              <TouchableOpacity
                key={p.user_id}
                style={styles.professionalCard}
                onPress={() => handleContactPress(p.user_id)}
              >
                <View style={styles.professionalHeader}>
                  <View style={styles.professionalInfo}>
                    <Text style={styles.professionalName}>{p.username}</Text>
                    <Text style={styles.professionalCategory}>
                      {p.category_name}
                    </Text>
                  </View>
                  <View style={styles.professionalPrice}>
                    <DollarSign size={16} color="#10B981" />
                    <Text style={styles.priceText}>${p.category_price}</Text>
                  </View>
                </View>
                <View style={styles.professionalFooter}>
                  <View style={styles.rating}>
                    <Star size={16} color="#F59E0B" fill="#F59E0B" />
                    <Text style={styles.ratingText}>
                      {p.average_rating} ({p.total_reviews} reviews)
                    </Text>
                  </View>
                  {p.location && (
                    <View style={styles.distance}>
                      <MapPin size={16} color="#6B7280" />
                      <Text style={styles.distanceText}>{p.location}</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {!loading && professionals.length === 0 && (
          <View style={styles.emptyState}>
            <Search size={48} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>Start Your Search</Text>
            <Text style={styles.emptyDescription}>
              Select a category or type a search term above to find
              professionals.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  header: {
    backgroundColor: "white",
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  title: { fontSize: 28, fontWeight: "700", color: "#111827", marginBottom: 4 },
  subtitle: { fontSize: 16, color: "#6B7280", marginBottom: 20 },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 16, paddingVertical: 12, color: "#111827" },
  filterButton: { padding: 8 },
  locationContainer: { flexDirection: "row", alignItems: "center" },
  locationText: {
    fontSize: 14,
    color: "#10B981",
    marginLeft: 6,
    fontWeight: "500",
  },
  content: { flex: 1 },
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  categoriesScroll: { paddingLeft: 20 },
  categoryCard: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    marginRight: 12,
  },
  categoryName: { color: "white", fontSize: 14, fontWeight: "600" },
  professionalCard: {
    backgroundColor: "white",
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  professionalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  professionalInfo: { flex: 1 },
  professionalName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  professionalCategory: { fontSize: 14, color: "#6B7280" },
  professionalPrice: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  priceText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#10B981",
    marginLeft: 4,
  },
  professionalFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rating: { flexDirection: "row", alignItems: "center" },
  ratingText: { fontSize: 14, color: "#6B7280", marginLeft: 6 },
  distance: { flexDirection: "row", alignItems: "center" },
  distanceText: { fontSize: 14, color: "#6B7280", marginLeft: 4 },
  emptyState: {
    alignItems: "center",
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#111827",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 24,
  },
});
