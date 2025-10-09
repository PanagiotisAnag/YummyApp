import "react-native-gesture-handler";
import React, { useEffect, useState, createContext, useContext, useRef } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import {
  ActivityIndicator, Alert, FlatList, Image, Linking, Platform, Pressable, ScrollView,
  StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions,
  Animated, Easing,
} from "react-native";
import { SafeAreaView, SafeAreaProvider } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Firebase (ΟΛΑ ΕΔΩ, όχι κάτω από το component!)
import { db } from "./firebaseConfig";
import { collection, doc, endAt, getDoc, getDocs, limit, orderBy, query, startAt, where } from "firebase/firestore";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "./firebaseConfig";

// UI / Screens
import SignInScreen from "./SignInScreen";
import ProfileScreen from "./ProfileScreen";

// Icons + fonts
import { Ionicons } from "@expo/vector-icons";
import { useFonts } from "expo-font";


// ...μέσα στο component App()
export default function App() {
  const [lang, setLang] = useState<LangKey>("en");
  const [onboarded, setOnboarded] = useState<boolean | null>(null);
  const [user, setUser] = useState<User | null>(null);

  // Φόρτωμα Ionicons (explicit ttf για web)
  const [iconsReady] = useFonts({
    Ionicons: require("@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf"),
  });

  // Fallback: αν κολλήσει η φόρτωση των fonts, άσε το app να προχωρήσει
  const [iconsTimedOut, setIconsTimedOut] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setIconsTimedOut(true), 4000);
    return () => clearTimeout(id);
  }, []);

  // Φόρτωσε γλώσσα + onboarding flag
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEYS.LANG);
        if (saved && saved in locales) setLang(saved as LangKey);
      } catch {}
      try {
        const onboardedVal = await AsyncStorage.getItem(STORAGE_KEYS2.ONBOARDED);
        setOnboarded(onboardedVal === "1");
      } catch {
        setOnboarded(false);
      } finally {
        // μην αφήσεις το null να κρατάει το spinner για πάντα
        setOnboarded((v) => (v === null ? false : v));
      }
    })();
  }, []);

  // Συνδρομή στο Firebase Auth
  useEffect(() => onAuthStateChanged(auth, setUser), []);

  const t = (k: keyof typeof locales["en"]) => locales[lang][k];

  // ΜΗΝ render αν δεν ξέρουμε ακόμα onboarding ή (τα fonts δεν είναι έτοιμα ΚΑΙ δεν έχει λήξει το timeout)
  if ((Platform.OS === "web" && !iconsReady && !iconsTimedOut) || onboarded === null) {
  return (
    <I18nCtx.Provider value={{ lang, setLang, t }}>
      <SafeAreaProvider>
        <SafeAreaView style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator />
        </SafeAreaView>
      </SafeAreaProvider>
    </I18nCtx.Provider>
  );
}


  return (
    <I18nCtx.Provider value={{ lang, setLang, t }}>
      <AuthCtx.Provider value={{ user }}>
        <SafeAreaProvider>
          <NavigationContainer>
            <StatusBar barStyle={Platform.OS === "ios" ? "dark-content" : "light-content"} />
            <Stack.Navigator
              screenOptions={({ navigation }) => ({
                headerLeft: () =>
                  navigation?.canGoBack?.() ? <BackButton navigation={navigation} /> : undefined,
              })}
            >
              {onboarded ? (
                user ? (
                  <>
                    <Stack.Screen
                      name="Tabs"
                      component={TabsNavigator}
                      options={({ navigation }) => ({
                        headerShown: true,
                        title: "YummyApp",
                        headerRight: () => <HeaderAvatar navigation={navigation} />,
                      })}
                    />
                    <Stack.Screen
                      name="Recipe"
                      component={RecipeScreen}
                      options={({ route }: any) => ({ title: route.params?.title || "Recipe" })}
                    />
                    <Stack.Screen
                      name="Onboarding"
                      component={OnboardingScreen}
                      options={{ title: "Preferences" }}
                    />
                    <Stack.Screen name="Languages" component={LanguagesScreen} options={{ title: "Languages" }} />
                    <Stack.Screen
                      name="Achievements"
                      component={AchievementsScreen}
                      options={{ title: t("achievements") }}
                    />
                    <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: "My profile" }} />
                  </>
                ) : (
                  <Stack.Screen name="SignIn" component={SignInScreen} options={{ headerShown: false }} />
                )
              ) : (
                <Stack.Screen name="Onboarding" options={{ headerShown: false }}>
                  {() => (
                    <OnboardingScreen
                      onDone={async () => {
                        setOnboarded(true);
                        await AsyncStorage.setItem(STORAGE_KEYS2.ONBOARDED, "1");
                      }}
                    />
                  )}
                </Stack.Screen>
              )}
            </Stack.Navigator>
          </NavigationContainer>
        </SafeAreaProvider>
      </AuthCtx.Provider>
    </I18nCtx.Provider>
  );
}


type AuthValue = { user: User | null };
const AuthCtx = React.createContext<AuthValue>({ user: null });
const useAuth = () => useContext(AuthCtx);



// ----------------- Types -----------------
type Meal = {
  idMeal: string;
  strMeal: string;
  strCategory: string | null;
  strArea: string | null;
  strInstructions: string | string[] | null;
  strMealThumb: string | null;
  strYoutube: string | null;
  spoonIngredients?: { ingredient: string; measure: string }[];
  [key: string]: any;
};

const STORAGE_KEYS = {
  STEP_STATE: (id: string) => `steps:${id}`,
  USAGE_LOG: "usage_log_v1",
  RECENT: "recent_searches_v1",
  ACHIEVEMENTS: "achievements_v2",
  ACHIEVEMENT_AREA_SETS: "achievement_area_sets_v2",
  LANG: "pref_lang_v1",
} as const;

const STORAGE_KEYS2 = {
  USER_PREFS: "user_prefs_v1",
  ONBOARDED: "onboarded_v1",
} as const;

type UserPrefs = {
  likedAreas: string[];
  likedCategories: string[];
  diets: string[];
  dislikes: string[];
};

type UsageEvent =
  | { type: "view"; mealId: string; area?: string | null; ts: number }
  | { type: "search"; query: string; ts: number };

const now = () => Date.now();
const withinLastDays = (ts: number, days: number) => now() - ts <= days * 864e5;

// Navigation shells
const Stack = createNativeStackNavigator();
const Tabs = createBottomTabNavigator();

// ----------------- i18n -----------------
const locales = {
  en: {
    search: "Search",
    search_recipes: "Search recipes",
    placeholder: "e.g. Carbonara, protein snacks, sweet…",
    tap_view: "Tap to view steps & video",
    ingredients: "Ingredients",
    steps: "Steps",
    youtube: "Watch on YouTube",
    top: "Top recipes (last 7 days)",
    no_data: "No data yet. View some recipes and come back!",
    recipe_not_found: "Recipe not found.",
    recent: "Recent searches",
    clear_all: "Clear all",
    achievements: "Achievements",
    unlocked: "Unlocked cuisines",
    rule_hint: "Cook 3 different recipes from a cuisine to unlock it.",
    locked: "Locked",
    settings: "Settings",
    choose_lang: "Choose Language",
    craving: "What are you craving?",
    progress: "Progress",
  },
  el: {
    search: "Αναζήτηση",
    search_recipes: "Αναζήτηση συνταγών",
    placeholder: "π.χ. Καρμπονάρα, σνακ πρωτεΐνης, γλυκό…",
    tap_view: "Πάτησε για βήματα & βίντεο",
    ingredients: "Υλικά",
    steps: "Βήματα",
    youtube: "Δες στο YouTube",
    top: "Κορυφαίες συνταγές (τελευταίες 7 ημέρες)",
    no_data: "Δεν υπάρχουν δεδομένα ακόμα. Δες μερικές συνταγές και ξαναέλα!",
    recipe_not_found: "Η συνταγή δεν βρέθηκε.",
    recent: "Πρόσφατες αναζητήσεις",
    clear_all: "Καθαρισμός όλων",
    achievements: "Επιτεύγματα",
    unlocked: "Ξεκλειδωμένες κουζίνες",
    rule_hint: "Μαγείρεψε 3 διαφορετικές συνταγές από μία κουζίνα για να την ξεκλειδώσεις.",
    locked: "Κλειδωμένο",
    settings: "Ρυθμίσεις",
    choose_lang: "Επιλογή γλώσσας",
    craving: "Τι τραβάει η όρεξή σου;",
    progress: "Πρόοδος",
  },
  it: {
    search: "Cerca",
    search_recipes: "Cerca ricette",
    placeholder: "es. Carbonara, snack proteici, dolce…",
    tap_view: "Tocca per vedere i passi e il video",
    ingredients: "Ingredienti",
    steps: "Passaggi",
    youtube: "Guarda su YouTube",
    top: "Ricette top (ultimi 7 giorni)",
    no_data: "Nessun dato. Guarda alcune ricette e torna!",
    recipe_not_found: "Ricetta non trovata.",
    recent: "Ricerche recenti",
    clear_all: "Cancella tutto",
    achievements: "Obiettivi",
    unlocked: "Cucine sbloccate",
    rule_hint: "Cucina 3 ricette diverse di una cucina per sbloccarla.",
    locked: "Bloccato",
    settings: "Impostazioni",
    choose_lang: "Scegli lingua",
    craving: "Cosa ti va?",
    progress: "Progresso",
  },
  "pt-br": {
    search: "Buscar",
    search_recipes: "Buscar receitas",
    placeholder: "ex. Carbonara, lanches proteicos, doce…",
    tap_view: "Toque para ver passos e vídeo",
    ingredients: "Ingredientes",
    steps: "Passos",
    youtube: "Assistir no YouTube",
    top: "Receitas top (últimos 7 dias)",
    no_data: "Sem dados ainda. Veja algumas receitas e volte!",
    recipe_not_found: "Receita não encontrada.",
    recent: "Pesquisas recentes",
    clear_all: "Limpar tudo",
    achievements: "Conquistas",
    unlocked: "Cozinhas desbloqueadas",
    rule_hint: "Cozinhe 3 receitas diferentes de uma cozinha para desbloqueá-la.",
    locked: "Bloqueado",
    settings: "Configurações",
    choose_lang: "Escolher idioma",
    craving: "O que você quer comer?",
    progress: "Progresso",
  },
} as const;

type LangKey = keyof typeof locales;
type I18nValue = {
  lang: LangKey;
  setLang: (l: LangKey) => void;
  t: (k: keyof typeof locales["en"]) => string;
};
const I18nCtx = createContext<I18nValue>({
  lang: "en",
  setLang: () => {},
  t: (k) => locales.en[k],
});
const useT = () => useContext(I18nCtx).t;
const useLang = () => useContext(I18nCtx);

// ----------------- Known cuisines (Achievements) -----------------
const KNOWN_AREAS: string[] = [
  "American","British","Canadian","Chinese","Croatian","Dutch","Egyptian","French","Greek","Indian","Irish",
  "Italian","Jamaican","Japanese","Kenyan","Malaysian","Mexican","Moroccan","Russian","Spanish","Thai","Turkish",
  "Vietnamese","Nordic","Polish","Portuguese","Cuban","Korean","Filipino","Peruvian","Brazilian","Lebanese",
  "Pakistani","Tunisian","Ukrainian"
];

// --- connectivity probe: read 1 doc to verify Firestore access ---
async function pingFirestore(): Promise<void> {
  try {
    const s = await getDocs(query(collection(db, "recipes"), limit(1)));
    if (s.empty) {
      console.warn("[PING] Connected to Firestore, but 'recipes' is empty.");
    } else {
      console.log("[PING] OK — sample doc id:", s.docs[0].id);
    }
  } catch (e: any) {
    console.error("[PING] CANNOT READ FIRESTORE:", e?.code || e?.message || e);
    Alert.alert("Firestore error", String(e?.code || e?.message || e));
  }
}

// ----------------- Helpers -----------------

function extractYouTubeId(url?: string | null) {
  try {
    if (!url) return null;
    const u = new URL(url);
    if (u.hostname.includes("youtube.com")) return u.searchParams.get("v");
    if (u.hostname.includes("youtu.be")) return u.pathname.replace("/", "") || null;
    return null;
  } catch {
    return null;
  }
}

function bestImage(d: any): string | null {
  if (d.image) return String(d.image);
  const yt = extractYouTubeId(d.youtube);
  if (yt) return `https://img.youtube.com/vi/${yt}/hqdefault.jpg`;
  return null;
}

async function logUsage(ev: UsageEvent) {
  try {
    const existing = await AsyncStorage.getItem(STORAGE_KEYS.USAGE_LOG);
    const arr: UsageEvent[] = existing ? JSON.parse(existing) : [];
    arr.push(ev);
    await AsyncStorage.setItem(STORAGE_KEYS.USAGE_LOG, JSON.stringify(arr.slice(-2000)));
  } catch {}
}

async function getWeeklyTop(mealIds: string[]) {
  const existing = await AsyncStorage.getItem(STORAGE_KEYS.USAGE_LOG);
  const arr: UsageEvent[] = existing ? JSON.parse(existing) : [];
  const counts = new Map<string, number>();
  for (const ev of arr) {
    if (ev.type === "view" && withinLastDays(ev.ts, 7)) {
      if (mealIds.length === 0 || mealIds.includes(ev.mealId)) {
        counts.set(ev.mealId, (counts.get(ev.mealId) || 0) + 1);
      }
    }
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([mealId, count]) => ({ mealId, count }));
}

function normalizeFireDoc(d: any, id: string): Meal {
  const steps = Array.isArray(d.instructions) ? d.instructions : (d.instructions ?? null);
  return {
    idMeal: id,
    strMeal: d.title || d.strMeal || "",
    strCategory: d.category ?? null,
    strArea: d.area ?? null,
    strInstructions: steps,
    strMealThumb: bestImage(d) ?? d.strMealThumb ?? null,
    strYoutube: d.youtube ?? null,
    spoonIngredients: Array.isArray(d.ingredients)
      ? d.ingredients.map((it: any) => ({
          ingredient: it.ingredient || it.name || "",
          measure: it.measure || it.amount || "",
        }))
      : undefined,
  };
}

// dislikes helpers
function normalizeDislikes(arr?: string[]) {
  return (arr || []).map((s) => s.toLowerCase().trim()).filter(Boolean);
}
function mealHasDisliked(meal: Meal, dislikesLC: string[]) {
  if (!dislikesLC.length) return false;
  const ingNames: string[] = [];

  if (Array.isArray(meal.spoonIngredients) && meal.spoonIngredients.length) {
    for (const it of meal.spoonIngredients) {
      if (it?.ingredient) ingNames.push(String(it.ingredient).toLowerCase());
    }
  } else {
    for (let i = 1; i <= 20; i++) {
      const n = (meal as any)[`strIngredient${i}`];
      if (n && String(n).trim()) ingNames.push(String(n).toLowerCase());
    }
  }

  const titleLC = String(meal.strMeal || "").toLowerCase();

  for (const bad of dislikesLC) {
    if (ingNames.some((x) => x.includes(bad))) return true;
    if (bad && titleLC.includes(bad)) return true;
  }
  return false;
}

// --------- FAST SEARCH: single indexed prefix on title_lower ---------
async function searchRecipesPrefix(term: string): Promise<Meal[]> {
  const ql = term.trim().toLowerCase();
  if (!ql) return [];
  const s = await getDocs(
    query(collection(db, "recipes"), orderBy("title_lower"), startAt(ql), endAt(ql + "\uf8ff"), limit(24))
  );
  return s.docs.map((d) => normalizeFireDoc(d.data(), d.id));
}

function withTimeout<T>(p: Promise<T>, ms = 8000): Promise<T> {
  return new Promise((resolve, reject) => {
    const id = setTimeout(() => reject(new Error("timeout")), ms);
    p.then(
      (v) => {
        clearTimeout(id);
        resolve(v);
      },
      (e) => {
        clearTimeout(id);
        reject(e);
      }
    );
  });
}

async function getMealById(mealId: string): Promise<Meal | null> {
  try {
    const d = await getDoc(doc(db, "recipes", mealId));
    if (!d.exists()) return null;
    return normalizeFireDoc(d.data(), d.id);
  } catch (e) {
    console.warn("getMealById error:", e);
    return null;
  }
}

// Recommend based on prefs, else first N (ordered), then filter dislikes
async function fetchRecommended(n: number = 12): Promise<Meal[]> {
  try {
    const prefsRaw = await AsyncStorage.getItem(STORAGE_KEYS2.USER_PREFS);
    const prefs: UserPrefs | null = prefsRaw ? JSON.parse(prefsRaw) : null;
    const dislikesLC = normalizeDislikes(prefs?.dislikes);

    const ref = collection(db, "recipes");
    let qy;
    if (prefs?.likedAreas?.length) {
      qy = query(ref, where("area", "in", prefs.likedAreas.slice(0, 10)), limit(n));
    } else if (prefs?.likedCategories?.length) {
      qy = query(ref, where("category", "in", prefs.likedCategories.slice(0, 10)), limit(n));
    } else {
      qy = query(ref, orderBy("title_lower"), limit(n));
    }
    const s = await getDocs(qy);
    const all = s.docs.map((d) => normalizeFireDoc(d.data(), d.id));
    return all.filter((m) => !mealHasDisliked(m, dislikesLC));
  } catch (e) {
    console.warn("fetchRecommended error:", e);
    try {
      const s = await getDocs(query(collection(db, "recipes"), limit(n)));
      const all = s.docs.map((d) => normalizeFireDoc(d.data(), d.id));
      // fallback dislikes check
      let dislikesLC: string[] = [];
      try {
        const rawPrefs = await AsyncStorage.getItem(STORAGE_KEYS2.USER_PREFS);
        const prefs: UserPrefs | null = rawPrefs ? JSON.parse(rawPrefs) : null;
        dislikesLC = normalizeDislikes(prefs?.dislikes);
      } catch {}
      return all.filter((m) => !mealHasDisliked(m, dislikesLC));
    } catch {
      return [];
    }
  }
}

async function addViewAndMaybeUnlock(area: string | null, mealId: string) {
  await logUsage({ type: "view", mealId, ts: now(), area });
  if (!area) return;

  try {
    const rawSets = await AsyncStorage.getItem(STORAGE_KEYS.ACHIEVEMENT_AREA_SETS);
    const map: Record<string, string[]> = rawSets ? JSON.parse(rawSets) : {};
    const set = new Set(map[area] || []);
    set.add(mealId);
    map[area] = Array.from(set);
    await AsyncStorage.setItem(STORAGE_KEYS.ACHIEVEMENT_AREA_SETS, JSON.stringify(map));

    if (set.size >= 3) {
      const rawUnlocked = await AsyncStorage.getItem(STORAGE_KEYS.ACHIEVEMENTS);
      const unlocked: Record<string, boolean> = rawUnlocked ? JSON.parse(rawUnlocked) : {};
      if (!unlocked[area]) {
        unlocked[area] = true;
        await AsyncStorage.setItem(STORAGE_KEYS.ACHIEVEMENTS, JSON.stringify(unlocked));
      }
    }
  } catch {}
}

function normalizeSteps(input?: string | string[] | null) {
  if (!input) return [];
  if (Array.isArray(input)) return input.map((s) => String(s).trim()).filter(Boolean);

  const raw = String(input).trim();
  if (!raw) return [];

  if (raw.startsWith("[") && raw.endsWith("]")) {
    try {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return arr.map((s: any) => String(s).trim()).filter(Boolean);
    } catch {}
  }

  return raw
    .replace(/\r/g, "\n")
    .split(/\n+|\|/g)
    .map((s) => s.replace(/\s*&\s*/g, " & ").replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

// ---------- Small UI helpers ----------
function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        {
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderRadius: 999,
          borderWidth: 1,
          marginRight: 8,
          marginBottom: 8,
        },
        selected ? { backgroundColor: "#111827", borderColor: "#111827" } : { borderColor: "#e5e7eb" },
      ]}
    >
      <Text style={{ color: selected ? "white" : "#111827", fontWeight: "600" }}>{label}</Text>
    </Pressable>
  );
}

// ----------------- Onboarding (Wizard) -----------------
function OnboardingScreen({ navigation, onDone }: { navigation?: any; onDone?: () => void }) {
  const [prefs, setPrefs] = useState<UserPrefs>({
    likedAreas: [],
    likedCategories: [],
    diets: [],
    dislikes: [],
  });
  const [dislikeInput, setDislikeInput] = useState("");
  const [index, setIndex] = useState(0);

  const { width } = useWindowDimensions();
  const translateX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS2.USER_PREFS);
      if (raw) setPrefs(JSON.parse(raw));
    })();
  }, []);

  const AREAS = [
    "Greek","Italian","Mexican","Chinese","Indian","Japanese","Thai",
    "French","Spanish","American","Middle Eastern","Turkish","Korean","Vietnamese",
  ];
  const CATEGORIES = [
    "Dessert","Seafood","Pasta","Beef","Chicken","Vegan",
    "Vegetarian","Breakfast","Soup","Salad","Snack","Bread","Sauce",
  ];
  const DIETS = ["High protein","Low carb","Vegetarian","Vegan","Gluten free","Dairy free"];

  const steps = [
    {
      key: "areas",
      title: "Favorite cuisines",
      content: (
        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
          {AREAS.map((a) => (
            <Chip
              key={a}
              label={a}
              selected={prefs.likedAreas.includes(a)}
              onPress={() =>
                setPrefs((p) => {
                  const s = new Set(p.likedAreas);
                  s.has(a) ? s.delete(a) : s.add(a);
                  return { ...p, likedAreas: Array.from(s) };
                })
              }
            />
          ))}
        </View>
      ),
    },
    {
      key: "categories",
      title: "Favorite categories",
      content: (
        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
          {CATEGORIES.map((c) => (
            <Chip
              key={c}
              label={c}
              selected={prefs.likedCategories.includes(c)}
              onPress={() =>
                setPrefs((p) => {
                  const s = new Set(p.likedCategories);
                  s.has(c) ? s.delete(c) : s.add(c);
                  return { ...p, likedCategories: Array.from(s) };
                })
              }
            />
          ))}
        </View>
      ),
    },
    {
      key: "diets",
      title: "Diets (optional)",
      content: (
        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
          {DIETS.map((d) => (
            <Chip
              key={d}
              label={d}
              selected={prefs.diets.includes(d)}
              onPress={() =>
                setPrefs((p) => {
                  const s = new Set(p.diets);
                  s.has(d) ? s.delete(d) : s.add(d);
                  return { ...p, diets: Array.from(s) };
                })
              }
            />
          ))}
        </View>
      ),
    },
    {
      key: "dislikes",
      title: "Things you dislike (optional)",
      content: (
        <>
          <TextInput
            placeholder="e.g. olives, cilantro"
            value={dislikeInput}
            onChangeText={setDislikeInput}
            onBlur={() =>
              setPrefs((p) => ({
                ...p,
                dislikes: dislikeInput
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              }))
            }
            style={[styles.input, { marginTop: 6 }]}
          />
          {!!prefs.dislikes.length && (
            <Text style={{ marginTop: 6, color: "#6b7280" }}>
              Added: {prefs.dislikes.join(", ")}
            </Text>
          )}
        </>
      ),
    },
  ];

  useEffect(() => {
    translateX.setValue(-index * width);
  }, [width, index, translateX]);

  const animateTo = (next: number) => {
    Animated.timing(translateX, {
      toValue: -next * width,
      duration: 250,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start(() => setIndex(next));
  };

  const goNext = () => animateTo(Math.min(index + 1, steps.length - 1));
  const goBack = () => animateTo(Math.max(index - 1, 0));
  const skipStep = () => goNext();

  const goToHome = () => {
    if (navigation?.reset) {
      navigation.reset({ index: 0, routes: [{ name: "Tabs", params: { screen: "Search" } }] });
    }
    onDone && onDone();
  };

  const finish = async () => {
    await AsyncStorage.setItem(STORAGE_KEYS2.USER_PREFS, JSON.stringify(prefs));
    await AsyncStorage.setItem(STORAGE_KEYS2.ONBOARDED, "1");
    goToHome();
  };

  const skipAll = async () => {
    await AsyncStorage.setItem(STORAGE_KEYS2.ONBOARDED, "1");
    goToHome();
  };

  return (
    <SafeAreaView style={[styles.screen, { paddingTop: 16 }]}>
      {/* Top bar with Back / Skip all */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        {index > 0 ? (
          <TouchableOpacity
            onPress={goBack}
            style={[styles.btn, { height: 36, paddingHorizontal: 12, backgroundColor: "#6b7280" }]}
          >
            <Text style={styles.btnText}>Back</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 72 }} />
        )}

        <TouchableOpacity
          onPress={skipAll}
          style={[styles.btn, { height: 36, paddingHorizontal: 12, backgroundColor: "#6b7280" }]}
        >
          <Text style={styles.btnText}>Skip all</Text>
        </TouchableOpacity>
      </View>

      <Text style={{ fontSize: 26, fontWeight: "800", marginBottom: 6 }}>Tell us your taste</Text>
      <Text style={{ color: "#6b7280", marginBottom: 14 }}>We’ll personalize your home feed.</Text>

      {/* Slider */}
      <View style={{ overflow: "hidden", borderRadius: 16 }}>
        <Animated.View
          style={{
            width: steps.length * width,
            flexDirection: "row",
            transform: [{ translateX }],
          }}
        >
          {steps.map((step) => (
            <View key={step.key} style={{ width, paddingRight: 12 }}>
              <Text style={{ fontSize: 18, fontWeight: "700", marginBottom: 8 }}>{step.title}</Text>
              <ScrollView style={{ maxHeight: 380 }} contentContainerStyle={{ paddingBottom: 16 }}>
                {step.content}
              </ScrollView>
            </View>
          ))}
        </Animated.View>
      </View>

      {/* Bottom buttons */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 12 }}>
        <TouchableOpacity
          onPress={skipStep}
          style={[styles.btn, { flex: 1, backgroundColor: "#6b7280", marginRight: 8 }]}
        >
          <Text style={styles.btnText}>Skip</Text>
        </TouchableOpacity>

        {index < steps.length - 1 ? (
          <TouchableOpacity onPress={goNext} style={[styles.btn, { flex: 1 }]}>
            <Text style={styles.btnText}>Next</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={finish} style={[styles.btn, { flex: 1, backgroundColor: "#16a34a" }]}>
            <Text style={styles.btnText}>Finish</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

// ----------------- Search -----------------
function SearchScreen({ navigation }: any) {
  const t = useT();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Meal[]>([]);
  const [suggestions, setSuggestions] = useState<Meal[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [reco, setReco] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(false);
  const [dislikesLC, setDislikesLC] = useState<string[]>([]);

  // load dislikes + recent + recommended
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEYS2.USER_PREFS);
        const prefs: UserPrefs | null = raw ? JSON.parse(raw) : null;
        setDislikesLC(normalizeDislikes(prefs?.dislikes));
      } catch {}
      try {
        const rawRecent = await AsyncStorage.getItem(STORAGE_KEYS.RECENT);
        setRecent(rawRecent ? JSON.parse(rawRecent) : []);
      } catch {}
      try {
        const r = await fetchRecommended(12);
        setReco(r);
      } catch {}
      pingFirestore();
    })();
  }, []);

  // debounced suggestions
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setSuggestions([]);
      return;
    }
    const tmr = setTimeout(async () => {
      const rows = await searchRecipesPrefix(term);
      const filtered = rows.filter((m) => !mealHasDisliked(m, dislikesLC));
      setSuggestions(filtered.slice(0, 8));
    }, 250);
    return () => clearTimeout(tmr);
  }, [q, dislikesLC]);

  const clearRecent = async () => {
    setRecent([]);
    await AsyncStorage.setItem(STORAGE_KEYS.RECENT, JSON.stringify([]));
  };

  const onSearch = async (text: string) => {
    const term = text.trim();
    if (!term) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const rows = await withTimeout(searchRecipesPrefix(term), 8000);
      const filtered = rows.filter((m) => !mealHasDisliked(m, dislikesLC));
      setResults(filtered);
    } catch (e) {
      console.error("search error/timeout", e);
      Alert.alert("Network", "Search took too long or failed. Check Firestore/connection.");
      setResults([]);
    } finally {
      setLoading(false);
    }

    const next = [term, ...recent.filter((x) => x.toLowerCase() !== term.toLowerCase())].slice(0, 10);
    setRecent(next);
    AsyncStorage.setItem(STORAGE_KEYS.RECENT, JSON.stringify(next));
    logUsage({ type: "search", query: term, ts: Date.now() });
  };

  return (
    <SafeAreaView style={styles.screen}>
      <Text style={styles.h1}>{t("search_recipes")}</Text>

      <View style={styles.searchRow}>
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder={t("placeholder")}
          style={[styles.input, { marginRight: 8 }]}
          returnKeyType="search"
          onSubmitEditing={() => onSearch(q)}
        />
        <TouchableOpacity onPress={() => onSearch(q)} style={styles.btn}>
          <Text style={styles.btnText}>{t("search")}</Text>
        </TouchableOpacity>
      </View>

      {suggestions.length > 0 && (
        <View style={styles.suggestionBox}>
          {suggestions.map((s) => (
            <Pressable
              key={s.idMeal}
              onPress={() => navigation.navigate("Recipe", { mealId: s.idMeal, title: s.strMeal, meal: s })}
              style={styles.suggestionRow}
            >
              <Image source={{ uri: s.strMealThumb || undefined }} style={styles.suggestionImg} />
              <Text style={styles.suggestionText}>{s.strMeal}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {!q && (
        <View style={{ marginTop: 6 }}>
          <Text style={styles.muted}>{t("craving")}</Text>
          <View style={styles.recentChips}>
            {["Protein snacks", "Sweet", "Chinese", "Tacos"].map((s) => (
              <Pressable key={s} onPress={() => onSearch(s)} style={styles.recentChip}>
                <Text style={styles.recentChipText}>{s}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {recent.length > 0 && (
        <View style={styles.recentBox}>
          <View style={styles.recentHeader}>
            <Text style={styles.recentTitle}>{t("recent")}</Text>
            <TouchableOpacity onPress={clearRecent}>
              <Text style={styles.clearBtn}>{t("clear_all")}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.recentChips}>
            {recent.map((r) => (
              <Pressable key={r} onPress={() => onSearch(r)} style={styles.recentChip}>
                <Text style={styles.recentChipText}>{r}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {!q && results.length === 0 && reco.length > 0 && (
        <View style={{ marginTop: 12 }}>
          <Text style={styles.h2}>Recommended</Text>
          {reco.map((item) => (
            <Pressable
              key={item.idMeal}
              style={styles.card}
              onPress={() => navigation.navigate("Recipe", { mealId: item.idMeal, title: item.strMeal, meal: item })}
            >
              <View style={{ flexDirection: "row" }}>
                <Image
                  source={{ uri: item.strMealThumb || undefined }}
                  style={{ width: 96, height: 96, borderRadius: 12, marginRight: 12 }}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{item.strMeal}</Text>
                </View>
              </View>
            </Pressable>
          ))}
        </View>
      )}

      {loading && <ActivityIndicator style={{ marginTop: 16 }} />}

      <FlatList
        data={results}
        keyExtractor={(i) => i.idMeal}
        contentContainerStyle={{ paddingVertical: 12 }}
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() =>
              navigation.navigate("Recipe", {
                mealId: item.idMeal,
                title: item.strMeal,
                meal: item,
              })
            }
          >
            <View style={{ flexDirection: "row" }}>
              <Image
                source={{ uri: item.strMealThumb || undefined }}
                style={{ width: 96, height: 96, borderRadius: 12, marginRight: 12 }}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{item.strMeal}</Text>
                <View style={styles.rowGap8}>
                  {!!item.strArea && (
                    <View style={styles.pill}>
                      <Text style={styles.pillText}>{item.strArea}</Text>
                    </View>
                  )}
                  {!!item.strCategory && (
                    <View style={styles.pill}>
                      <Text style={styles.pillText}>{item.strCategory}</Text>
                    </View>
                  )}
                </View>
                <Text numberOfLines={1} style={styles.muted}>
                  {t("tap_view")}
                </Text>
              </View>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={() => <Text style={{ marginTop: 16, color: "#6b7280" }}>{t("placeholder")}</Text>}
      />
    </SafeAreaView>
  );
}

// ----------------- Recipe -----------------
function RecipeScreen({ route }: any) {
  const { mealId, meal: passedMeal } = route.params || {};
  const [meal, setMeal] = useState<Meal | null>(passedMeal || null);
  const [loading, setLoading] = useState(!passedMeal);
  const [stepState, setStepState] = useState<boolean[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!passedMeal) {
        setLoading(true);
        const m = await getMealById(mealId);
        if (mounted) {
          setMeal(m);
          setLoading(false);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, [mealId, passedMeal]);

  useEffect(() => {
    (async () => {
      if (!meal) return;
      const steps = normalizeSteps(meal.strInstructions);
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.STEP_STATE(mealId));
      setStepState(raw ? JSON.parse(raw) : new Array(steps.length).fill(false));
    })();
  }, [mealId, meal]);

  const toggleStep = async (idx: number) => {
    const next = [...stepState];
    next[idx] = !next[idx];
    setStepState(next);
    await AsyncStorage.setItem(STORAGE_KEYS.STEP_STATE(mealId), JSON.stringify(next));
  };

  useEffect(() => {
    (async () => {
      if (!meal) return;
      await addViewAndMaybeUnlock(meal.strArea ?? null, mealId);
    })();
  }, [meal, mealId]);

  if (loading || !meal) {
    return (
      <SafeAreaView style={styles.screenCenter}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  const steps = normalizeSteps(meal.strInstructions);
  const ings =
    meal.spoonIngredients?.length
      ? meal.spoonIngredients
      : Array.from({ length: 20 }, (_, i) => i + 1)
          .map((i) => ({
            ingredient: (meal as any)[`strIngredient${i}`],
            measure: (meal as any)[`strMeasure${i}`],
          }))
          .filter((x) => x.ingredient && String(x.ingredient).trim());

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        {meal.strMealThumb ? (
          <Image source={{ uri: meal.strMealThumb }} style={{ width: "100%", height: 220, borderRadius: 16, marginBottom: 12 }} />
        ) : null}
        <Text style={{ fontSize: 24, fontWeight: "800", marginBottom: 6 }}>{meal.strMeal}</Text>
        <View style={styles.rowGap8}>
          {!!meal.strArea && (
            <View style={styles.pill}>
              <Text style={styles.pillText}>{meal.strArea}</Text>
            </View>
          )}
          {!!meal.strCategory && (
            <View style={styles.pill}>
              <Text style={styles.pillText}>{meal.strCategory}</Text>
            </View>
          )}
        </View>

        <Text style={styles.h2}>Ingredients</Text>
        {ings.map((ing, i) => (
          <Text key={i} style={styles.li}>
            • {ing.ingredient} {ing.measure ? `(${ing.measure})` : ""}
          </Text>
        ))}

        <Text style={styles.h2}>Steps</Text>
        {steps.length === 0 ? (
          <Text style={styles.muted}>No steps provided.</Text>
        ) : (
          steps.map((s, i) => (
            <View key={i} style={[styles.stepRow, stepState[i] ? styles.stepRowDone : undefined]}>
              <Pressable
                onPress={() => toggleStep(i)}
                style={[styles.checkbox, stepState[i] ? styles.checkboxChecked : undefined]}
              />
              <Text style={[styles.stepText, stepState[i] ? styles.stepTextDone : undefined]}>{s}</Text>
            </View>
          ))
        )}

        {!!meal.strYoutube && (
          <TouchableOpacity onPress={() => Linking.openURL(meal.strYoutube!)} style={[styles.btn, { marginTop: 12 }]}>
            <Text style={styles.btnText}>Watch on YouTube</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ----------------- Top -----------------
function TopScreen({ navigation }: any) {
  const t = useT();
  const [list, setList] = useState<{ meal: Meal; count: number; mealId: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.USAGE_LOG);
      const events: UsageEvent[] = raw ? JSON.parse(raw) : [];
      const ids = Array.from(
        new Set(events.filter((e) => e.type === "view" && withinLastDays(e.ts, 7)).map((e: any) => e.mealId))
      ).filter(Boolean) as string[];

      if (ids.length === 0) {
        setList([]);
        setLoading(false);
        return;
      }

      const counts = await getWeeklyTop(ids);
      const meals = await Promise.all(counts.map(async (c) => ({ c, m: await getMealById(c.mealId) })));
      const packed = meals
        .filter((x) => !!x.m)
        .map((x) => ({ meal: x.m as Meal, count: x.c.count, mealId: x.c.mealId }));
      setList(packed);
      setLoading(false);
    })();
  }, []);

  return (
    <SafeAreaView style={styles.screen}>
      <Text style={styles.h1}>{t("top")}</Text>
      {loading ? (
        <ActivityIndicator style={{ marginTop: 24 }} />
      ) : list.length === 0 ? (
        <Text style={styles.muted}>{t("no_data")}</Text>
      ) : (
        <FlatList
          data={list}
          keyExtractor={(i) => i.mealId}
          renderItem={({ item, index }) => (
            <Pressable
              style={styles.card}
              onPress={() => navigation.navigate("Recipe", { mealId: item.mealId, title: item.meal.strMeal, meal: item.meal })}
            >
              <View style={{ flexDirection: "row" }}>
                <Image
                  source={{ uri: item.meal.strMealThumb || undefined }}
                  style={{ width: 80, height: 80, borderRadius: 10, marginRight: 12 }}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>
                    {index + 1}. {item.meal.strMeal}
                  </Text>
                  <Text style={styles.muted}>Views this week: {item.count}</Text>
                </View>
              </View>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

// ----------------- Achievements -----------------
function AchievementsScreen() {
  const t = useT();
  const [unlocked, setUnlocked] = useState<Record<string, boolean>>({});
  const [areaSets, setAreaSets] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const rawU = await AsyncStorage.getItem(STORAGE_KEYS.ACHIEVEMENTS);
        const rawS = await AsyncStorage.getItem(STORAGE_KEYS.ACHIEVEMENT_AREA_SETS);
        setUnlocked(rawU ? JSON.parse(rawU) : {});
        setAreaSets(rawS ? JSON.parse(rawS) : {});
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <SafeAreaView style={styles.screen}>
      <Text style={styles.h1}>{t("achievements")}</Text>
      <Text style={{ marginBottom: 6 }}>{t("rule_hint")}</Text>
      <Text style={{ marginBottom: 8 }}>{t("progress")}</Text>

      {loading ? (
        <ActivityIndicator />
      ) : (
        <View>
          {KNOWN_AREAS.map((area) => {
            const set = new Set(areaSets[area] || []);
            const count = Math.min(3, set.size);
            const isUnlocked = !!unlocked[area];
            return (
              <View key={area} style={[styles.achItem, isUnlocked ? styles.achUnlocked : styles.achLocked]}>
                <Text style={[styles.achTitle, isUnlocked ? styles.achTitleUnlocked : undefined]}>
                  {isUnlocked ? "✅ " : "🔒 "} {area}
                </Text>
                <Text style={styles.muted}>{count}/3</Text>
              </View>
            );
          })}
        </View>
      )}
    </SafeAreaView>
  );
}

// ----------------- Settings -----------------
function LanguagesScreen() {
  const { lang, setLang } = useLang();
  return (
    <SafeAreaView style={styles.screen}>
      <Text style={styles.h1}>Languages</Text>
      {(Object.keys(locales) as LangKey[]).map((l) => (
        <TouchableOpacity
          key={l}
          onPress={async () => {
            setLang(l);
            await AsyncStorage.setItem(STORAGE_KEYS.LANG, l);
          }}
          style={[styles.btn, { marginBottom: 8, backgroundColor: lang === l ? "#16a34a" : "#111827" }]}
        >
          <Text style={styles.btnText}>{l.toUpperCase()}</Text>
        </TouchableOpacity>
      ))}
    </SafeAreaView>
  );
}

function SettingsScreen({ navigation }: any) {
  const t = useT();
  return (
    <SafeAreaView style={styles.screen}>
      <Text style={styles.h1}>{t("settings")}</Text>

      <TouchableOpacity onPress={() => navigation.navigate("Languages")} style={[styles.card, { paddingVertical: 16 }]}>
        <Text style={{ fontSize: 18, fontWeight: "700" }}>Languages</Text>
        <Text style={styles.muted}>Change the app language</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate("Onboarding")} style={[styles.card, { paddingVertical: 16 }]}>
        <Text style={{ fontSize: 18, fontWeight: "700" }}>Edit tastes</Text>
        <Text style={styles.muted}>Update your cuisine, category & diet preferences</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate("Achievements")} style={[styles.card, { paddingVertical: 16 }]}>
        <Text style={{ fontSize: 18, fontWeight: "700" }}>{t("achievements")}</Text>
        <Text style={styles.muted}>View unlocked cuisines and progress</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

function BackButton({ navigation }: any) {
  return (
    <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginLeft: 8 }}>
      <Ionicons name="arrow-back" size={24} color="black" />
    </TouchableOpacity>
  );
}

// --- ONLY Search & Top in the bottom tabs ---
function TabsNavigator() {
  const t = useT();
  return (
    <Tabs.Navigator
      initialRouteName="Search"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size }) => {
          const icon = route.name === "Search" ? "search" : "flame-outline";
          return <Ionicons name={icon as any} size={size} color={color} />;
        },
      })}
    >
      <Tabs.Screen name="Search" component={SearchScreen} options={{ title: t("search") }} />
      <Tabs.Screen name="Top" component={TopScreen} options={{ title: "Top" }} />
    </Tabs.Navigator>
  );
}


function HeaderAvatar({ navigation }: any) {
  const { user } = useAuth();
   if (!user) return null;

  const src = user.photoURL || undefined;
  return (
    <TouchableOpacity onPress={() => navigation.navigate("Profile")} style={{ marginRight: 12 }}>
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          overflow: "hidden",
          backgroundColor: "#ddd",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {src ? (
          <Image source={{ uri: src }} style={{ width: 32, height: 32 }} />
        ) : (
          <Text style={{ fontWeight: "700" }}>
            {(user.displayName || user.email || "?").substring(0, 1).toUpperCase()}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}


// ----------------- Styles -----------------
const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },
  screenCenter: { flex: 1, alignItems: "center", justifyContent: "center" },
  h1: { fontSize: 28, fontWeight: "700", marginVertical: 12 },
  h2: { fontSize: 20, fontWeight: "700", marginTop: 16, marginBottom: 8 },
  input: { flex: 1, borderWidth: 1, borderColor: "#ddd", borderRadius: 12, paddingHorizontal: 12, height: 44 },
  searchRow: { flexDirection: "row", alignItems: "center" },
  btn: {
    backgroundColor: "#111827",
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: { color: "white", fontWeight: "600" },

  card: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  cardTitle: { fontSize: 18, fontWeight: "700", marginBottom: 6 },
  muted: { color: "#6b7280" },

  rowGap8: { flexDirection: "row", flexWrap: "wrap" },
  pill: {
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    marginRight: 8,
    marginBottom: 8,
  },
  pillText: { color: "#374151", fontWeight: "600" },
  li: { fontSize: 16, marginBottom: 4 },

  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
    backgroundColor: "white",
  },
  stepRowDone: { backgroundColor: "#ecfccb", borderColor: "#d9f99d" },
  stepText: { flex: 1, fontSize: 16 },
  stepTextDone: { textDecorationLine: "line-through", color: "#4b5563" },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: "#9ca3af", marginRight: 8 },
  checkboxChecked: { backgroundColor: "#111827", borderColor: "#111827" },

  suggestionBox: { backgroundColor: "#f9fafb", borderRadius: 12, marginVertical: 8, padding: 8 },
  suggestionRow: { flexDirection: "row", alignItems: "center", padding: 6, borderBottomWidth: 1, borderColor: "#eee" },
  suggestionImg: { width: 40, height: 40, borderRadius: 6, marginRight: 10 },
  suggestionText: { fontSize: 16 },

  recentBox: { marginTop: 8 },
  recentHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  recentTitle: { fontWeight: "700", marginBottom: 6 },
  clearBtn: { color: "red", fontWeight: "600" },
  recentChips: { flexDirection: "row", flexWrap: "wrap", marginTop: 6 },
  recentChip: {
    backgroundColor: "#e5e7eb",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  recentChipText: { color: "#111827" },

  achItem: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  achUnlocked: { backgroundColor: "#dcfce7", borderColor: "#86efac" },
  achLocked: { backgroundColor: "#f3f4f6", borderColor: "#e5e7eb" },
  achTitle: { fontWeight: "700" },
  achTitleUnlocked: { color: "#065f46" },
});
