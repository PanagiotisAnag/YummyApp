import "react-native-gesture-handler";
import React, {
  useEffect,
  useState,
  createContext,
  useContext,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
  Animated,
  Easing,
  Modal,
} from "react-native";
import { SafeAreaView, SafeAreaProvider } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColorScheme } from "react-native";
import * as Speech from "expo-speech";
import {TouchableWithoutFeedback } from "react-native";
import { Picker } from "@react-native-picker/picker";

// Firebase (??? ??O, ??? ??t? ap? t? component!)
import { db } from "./firebaseConfig";
import {
  collection,
  doc,
  endAt,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  startAt,
  where,
} from "firebase/firestore";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "./firebaseConfig";
import { useFonts } from "expo-font";


// UI / Screens
import SignInScreen from "./SignInScreen";
import ProfileScreen from "./ProfileScreen";

// Icons + fonts
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";


// App.tsx
import * as Notifications from "expo-notifications";

// Allow HTML elements on web so TS stops complaining
declare global {
  namespace JSX {
    interface IntrinsicElements {
      select: any;
      option: any;
    }
  }
}

// --- Cross-platform timer (native: expo-notifications, web: setTimeout/Web Notifications)
let _webTimer: any = null;

async function scheduleTimerNotification(title: string, minutes: number) {
  if (!minutes || minutes <= 0) return;

  const secs = Math.round(minutes * 60);

  if (Platform.OS === "web") {
    // Clear any previous
    if (_webTimer) clearTimeout(_webTimer);

    // Try Web Notifications if available
    const useWebNotif = "Notification" in window;
    if (useWebNotif && Notification.permission === "default") {
      try { await Notification.requestPermission(); } catch {}
    }

    _webTimer = setTimeout(() => {
      if (useWebNotif && Notification.permission === "granted") {
        new Notification(title, { body: "Timer finished!" });
      } else {
        alert(`${title}: Timer finished!`);
      }
      // Try a little vibration if supported
      // @ts-ignore
      if (navigator?.vibrate) navigator.vibrate(200);
    }, secs * 1000);

    return; // web done
  }

  // Native: Expo Notifications
  const trigger: Notifications.TimeIntervalTriggerInput = {
    type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
    seconds: secs,
    repeats: false,
  };

  await Notifications.scheduleNotificationAsync({
    content: { title, body: "Timer finished!" },
    trigger,
  });
}



// ...µ?sa st? component App()

export default function App() {
  const [lang, setLang] = useState<LangKey>("en");
  const [onboarded, setOnboarded] = useState<boolean | null>(null);
  const [user, setUser] = useState<User | null>(null);


  const [iconsReady] = useFonts({
    Ionicons: require("./assets/fonts/Ionicons.ttf"),
    MaterialCommunityIcons: require("./assets/fonts/MaterialCommunityIcons.ttf"),
  });

  useEffect(() => {
  (async () => {
    try {
      await Notifications.requestPermissionsAsync();
    } catch {}
  })();
}, []);


  // Fallback: a? ?????se? ? f??t?s? t?? fonts, ?se t? app ?a p??????se?
  const [iconsTimedOut, setIconsTimedOut] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setIconsTimedOut(true), 4000);
    return () => clearTimeout(id);
  }, []);



  // F??t?se ???ssa + onboarding flag
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEYS.LANG);
        if (saved && saved in locales) setLang(saved as LangKey);
      } catch {}
      try {
        const onboardedVal = await AsyncStorage.getItem(
          STORAGE_KEYS2.ONBOARDED,
        );
        setOnboarded(onboardedVal === "1");
      } catch {
        setOnboarded(false);
      } finally {
        // µ?? af?se?? t? null ?a ??at?e? t? spinner ??a p??ta
        setOnboarded((v) => (v === null ? false : v));
      }
    })();
  }, []);

  // S??d??µ? st? Firebase Auth
  useEffect(() => onAuthStateChanged(auth, setUser), []);

  const t = (k: keyof (typeof locales)["en"]) => locales[lang][k];

  // ??? render a? de? ?????µe a??µa onboarding ? (ta fonts de? e??a? ?t??µa ??? de? ??e? ???e? t? timeout)
  if (
    (Platform.OS === "web" && !iconsReady && !iconsTimedOut) ||
    onboarded === null
  ) {
    return (
      <I18nCtx.Provider value={{ lang, setLang, t }}>
        <SafeAreaProvider>
          <SafeAreaView
            style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
          >
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
            <StatusBar
              barStyle={
                Platform.OS === "ios" ? "dark-content" : "light-content"
              }
            />
            <Stack.Navigator
              screenOptions={({ navigation }) => ({
                headerLeft: () =>
                  navigation?.canGoBack?.() ? (
                    <BackButton navigation={navigation} />
                  ) : undefined,
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
          headerRight: () => <HeaderActions navigation={navigation} />,
        })}
      />

      <Stack.Screen
        name="Recipe"
        component={RecipeScreen}
        options={({ route }: any) => ({
          title: route.params?.title || "Recipe",
        })}
      />

      <Stack.Screen
        name="Onboarding"
        component={OnboardingScreen}
        options={{ title: "Preferences" }}
      />

      <Stack.Screen
        name="Languages"
        component={LanguagesScreen}
        options={{ title: "Languages" }}
      />

      <Stack.Screen
        name="Achievements"
        component={AchievementsScreen}
        options={{ title: "Achievements" }}
      />

      <Stack.Screen
        name="Favorites"
        component={FavoritesScreen}
        options={{ title: "Favorites" }}
      />

      <Stack.Screen
        name="History"
        component={HistoryScreen}
        options={{ title: "History" }}
      />

      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: "My profile" }}
      />

      {/* NEW screens */}
      <Stack.Screen
        name="ShoppingList"
        component={ShoppingListScreen}
        options={{ title: "Shopping List" }}
      />
      <Stack.Screen
        name="CookMode"
        component={CookModeScreen}
        options={{ title: "Cook Mode" }}
      />
      <Stack.Screen
        name="Stats"
        component={StatsScreen}
        options={{ title: "Stats" }}
      />
    </>
  ) : (
    <Stack.Screen
      name="SignIn"
      component={SignInScreen}
      options={{ headerShown: false }}
    />
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

    // NEW
  SHOPPING_LIST: "shopping_list_v1",
  OFFLINE_RECIPES: "offline_recipes_v1",
  NUTRITION_CACHE: "nutrition_cache_v1",


  // NEW:
  FAVORITES: "favorites_v1",
  HISTORY: "history_v1",
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
    placeholder: "π.χ. καρμπονάρα, σνακ πρωτεΐνης, γλυκό.",
    tap_view: "Πάτησε για βήματα & βίντεο",
    ingredients: "Υλικά",
    steps: "Βήματα",
    youtube: "Δες στο YouTube",
    top: "Δημοφιλείς συνταγές (τελευταίες 7 ημέρες)",
    no_data: "Δεν υπάρχουν ακόμη δεδομένα. Δες μερικές συνταγές και ξαναέλα!",
    recipe_not_found: "Η συνταγή δεν βρέθηκε.",
    recent: "Πρόσφατες αναζητήσεις",
    clear_all: "Καθαρισμός όλων",
    achievements: "Επιτεύγματα",
    unlocked: "Ξεκλειδωμένες κουζίνες",
    rule_hint:
      "Μαγείρεψε 3 διαφορετικές συνταγές από μια κουζίνα για να την ξεκλειδώσεις.",
    locked: "Κλειδωμένο",
    settings: "Ρυθμίσεις",
    choose_lang: "Επιλογή γλώσσας",
    craving: "Τι λαχταράς;",
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
    rule_hint:
      "Cozinhe 3 receitas diferentes de uma cozinha para desbloqueá-la.",
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
  t: (k: keyof (typeof locales)["en"]) => string;
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
  "American",
  "British",
  "Canadian",
  "Chinese",
  "Croatian",
  "Dutch",
  "Egyptian",
  "French",
  "Greek",
  "Indian",
  "Irish",
  "Italian",
  "Jamaican",
  "Japanese",
  "Kenyan",
  "Malaysian",
  "Mexican",
  "Moroccan",
  "Russian",
  "Spanish",
  "Thai",
  "Turkish",
  "Vietnamese",
  "Nordic",
  "Polish",
  "Portuguese",
  "Cuban",
  "Korean",
  "Filipino",
  "Peruvian",
  "Brazilian",
  "Lebanese",
  "Pakistani",
  "Tunisian",
  "Ukrainian",
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
// Master lists used by inference + filters (global)
// NEW - Shopping List types + helpers
type ShopItem = { name: string; fromMealId?: string; checked?: boolean };
// NEW - theme palette
function useThemeColors() {
  const scheme = useColorScheme();
  const dark = scheme === "dark";
  return {
    text: dark ? "#e5e7eb" : "#111827",
    bg: dark ? "#0b1220" : "#ffffff",
    card: dark ? "#111827" : "#ffffff",
    border: dark ? "#1f2937" : "#e5e7eb",
    muted: dark ? "#9ca3af" : "#6b7280",
  };
}

// Get the set of "done" (completed) recipe IDs from History
async function getDoneMealIdsSet(): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.HISTORY);
    const list: { mealId: string; ts: number }[] = raw ? JSON.parse(raw) : [];
    return new Set(list.map(x => x.mealId));
  } catch {
    return new Set();
  }
}

// Simple in-place shuffle
function shuffleInPlace<T>(arr: T[]) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

// Get a random prefix (to simulate random paging over title_lower)
// Tweaked to bias to letters/numbers you likely have.
function randomTitlePrefix() {
  const alphabet = "abcdefghijklmnopqrstuvwxyz";
  const digits = "0123456789";
  const pools = [alphabet, digits];
  const pool = pools[Math.floor(Math.random() * pools.length)];
  const len = Math.random() < 0.7 ? 1 : 2; // mostly 1-char, sometimes 2
  let s = "";
  for (let i = 0; i < len; i++) s += pool[Math.floor(Math.random() * pool.length)];
  return s;
}


async function getShoppingList(): Promise<ShopItem[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.SHOPPING_LIST);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

async function setShoppingList(items: ShopItem[]) {
  await AsyncStorage.setItem(STORAGE_KEYS.SHOPPING_LIST, JSON.stringify(items));
}

async function addIngredientsToShoppingList(meal: Meal) {
  const list = await getShoppingList();
  const ings = meal.spoonIngredients?.length
    ? meal.spoonIngredients
    : Array.from({ length: 20 }, (_, i) => i + 1)
        .map((i) => ({
          ingredient: (meal as any)[`strIngredient${i}`],
          measure: (meal as any)[`strMeasure${i}`],
        }))
        .filter((x) => x.ingredient && String(x.ingredient).trim());

  const newItems: ShopItem[] = ings.map((it) => ({
    name: `${it.ingredient}${it.measure ? ` (${it.measure})` : ""}`,
    fromMealId: meal.idMeal,
    checked: false,
  }));

  const merged = [...list, ...newItems];
  await setShoppingList(merged);
}

const ALL_CUISINES = [
  "American","Chinese","French","Greek","Indian","Italian","Japanese",
  "Korean","Mediterranean","Mexican","Middle Eastern","Spanish"
];

const ALL_MEAL_TYPES = [
  "Appetizer","Breakfast","Dessert","Dinner","Lunch","Salad","Snack","Soup"
];

const ALL_DIETS = [
  "Dairy-Free","Gluten-Free","High-Protein","Keto","Low-Carb","Paleo","Vegan","Vegetarian"
];


// ---------- Inference helpers ----------
function allIngredientNamesLC(meal: Meal): string[] {
  const out: string[] = [];
  if (Array.isArray(meal.spoonIngredients) && meal.spoonIngredients.length) {
    for (const it of meal.spoonIngredients) {
      if (it?.ingredient) out.push(String(it.ingredient).toLowerCase());
    }
  } else {
    for (let i = 1; i <= 20; i++) {
      const x = (meal as any)[`strIngredient${i}`];
      if (x && String(x).trim()) out.push(String(x).toLowerCase());
    }
  }
  return out;
}

function textBagLC(meal: Meal): string {
  const title = (meal.strMeal || "").toLowerCase();
  const area = (meal.strArea || "").toLowerCase();
  const cat  = (meal.strCategory || "").toLowerCase();
  const ings = allIngredientNamesLC(meal).join(" ");
  const steps = normalizeSteps(meal.strInstructions).join(" ").toLowerCase();
  return [title, area, cat, ings, steps].join(" ");
}

// -------- Cuisine inference --------
const CUISINE_KEYWORDS: Record<string, string[]> = {
  American: ["burger","bbq","cornbread","sloppy joe","ranch","buffalo"],
  Chinese: ["soy sauce","hoisin","oyster sauce","five-spice","dumpling","wonton","lo mein","chow mein","kung pao","mapo"],
  French: ["roux","bechamel","ratatouille","bouillabaisse","coq au vin","niçoise","au gratin","crème"],
  Greek: ["feta","tzatziki","halloumi","gyro","souvlaki","orzo","olive","oregano","spanakopita","moussaka"],
  Indian: ["garam masala","curry","tikka","dal","ghee","cardamom","cumin","turmeric","paneer","biryani","masala"],
  Italian: ["pasta","parmesan","parmigiano","risotto","gnocchi","prosciutto","bolognese","marinara","pesto"],
  Japanese: ["miso","dashi","mirin","sushi","ramen","udon","tempura","teriyaki","katsu","ponzu"],
  Korean: ["gochujang","kimchi","gochugaru","bulgogi","galbi","ssamjang"],
  Mediterranean: ["olive oil","oregano","lemon","tahini","hummus","za'atar","tabbouleh"],
  Mexican: ["taco","tortilla","salsa","chipotle","adobo","queso","enchilada","pozole","carnitas","cilantro","lime"],
  "Middle Eastern": ["tahini","sumac","za'atar","shawarma","falafel","hummus","pita","labneh"],
  Spanish: ["paella","chorizo","gazpacho","tortilla española","romesco","manchego"],
  Thai: ["fish sauce","lemongrass","galangal","coconut milk","green curry","red curry","pad thai","holy basil"],
  Vietnamese: ["fish sauce","nuoc mam","pho","banh","lemongrass","mint","basil","rice noodle"]
};

function inferCuisine(meal: Meal): string | null {
  // trust strArea if it matches one of our options
  const area = meal.strArea?.trim();
  if (area && ALL_CUISINES.includes(area)) return area;

  const bag = textBagLC(meal);
  for (const [cuisine, kws] of Object.entries(CUISINE_KEYWORDS)) {
    if (kws.some(kw => bag.includes(kw))) return cuisine;
  }
  return null;
}

// -------- Meal type inference --------
const MEALTYPE_KEYWORDS: Record<string, string[]> = {
  Breakfast: ["breakfast","pancake","omelette","granola","oatmeal","french toast","scrambled"],
  Appetizer: ["appetizer","starter","dip","bruschetta","mezze","mezze"],
  Salad: ["salad","coleslaw","vinaigrette","caprese","greens"],
  Soup: ["soup","broth","gazpacho","bisque","ramen","pho","stew","chowder"],
  Snack: ["snack","bites","bars","energy balls"],
  Dessert: ["dessert","cake","brownie","cookie","ice cream","pudding","mousse","tiramisu","cheesecake"],
  Lunch: ["sandwich","wrap","burrito","panini"],
  Dinner: ["roast","casserole","steak","meatloaf","lasagna","curry"]
};

function inferMealType(meal: Meal): string | null {
  // prefer explicit category if it matches our master list
  const cat = meal.strCategory?.trim();
  if (cat && ALL_MEAL_TYPES.includes(cat)) return cat;

  const bag = textBagLC(meal);
  for (const [type, kws] of Object.entries(MEALTYPE_KEYWORDS)) {
    if (kws.some(kw => bag.includes(kw))) return type;
  }
  // fallback heuristic: if category mentions "main" treat as Dinner
  if ((cat || "").toLowerCase().includes("main")) return "Dinner";
  return null;
}

// -------- Diet inference --------
const MEAT_WORDS = ["chicken","beef","pork","lamb","turkey","bacon","ham","prosciutto","sausage","salami","veal","duck"];
const FISH_SHELLFISH = ["fish","salmon","tuna","cod","anchovy","sardine","shrimp","prawn","crab","lobster","clam","mussel","oyster","octopus","squid"];
const DAIRY_WORDS = ["milk","butter","cream","yogurt","yoghurt","cheese","parmesan","mozzarella","feta","cheddar","ricotta","ghee","labneh"];
const EGG_WORDS = ["egg","eggs"];
const GLUTEN_GRAINS = ["wheat","barley","rye","farro","spelt","bulgur","semolina","pasta","noodle","bread","bun","breadcrumbs","flour","couscous","seitan","soy sauce"];
const SUGARY_CARBS = ["sugar","honey","maple","syrup","molasses"];
const STARCHY_CARBS = ["rice","potato","tortilla","corn","bean","peas","lentil","oat","quinoa","pita","wrap","taco","noodle","pasta","bread","bun","baguette","naan"];

function hasAny(hay: string[], needles: string[]) {
  return needles.some(n => hay.some(h => h.includes(n)));
}

function inferDiets(meal: Meal): string[] {
  const ings = allIngredientNamesLC(meal);
  const diets: string[] = [];

  const hasMeat = hasAny(ings, MEAT_WORDS);
  const hasFish = hasAny(ings, FISH_SHELLFISH);
  const hasDairy = hasAny(ings, DAIRY_WORDS);
  const hasEgg = hasAny(ings, EGG_WORDS);
  const hasGluten = hasAny(ings, GLUTEN_GRAINS);

  if (!hasDairy) diets.push("Dairy-Free");
  if (!hasGluten) diets.push("Gluten-Free");

  // vegan / vegetarian
  if (!hasMeat && !hasFish && !hasDairy && !hasEgg) {
    diets.push("Vegan","Vegetarian");
  } else if (!hasMeat && !hasFish) {
    diets.push("Vegetarian");
  }

  // rough protein vs carb signals
  const proteinHits = [...MEAT_WORDS, ...FISH_SHELLFISH, "tofu","tempeh","seitan","paneer","yogurt","lentil","chickpea","bean","egg"]
    .filter(x => hasAny(ings, [x])).length;
  const carbHits = [...GLUTEN_GRAINS, ...STARCHY_CARBS, ...SUGARY_CARBS]
    .filter(x => hasAny(ings, [x])).length;

  if (proteinHits >= 2 && proteinHits >= carbHits) diets.push("High-Protein");
  if (carbHits <= 1 && !hasAny(ings, ["sugar","honey","syrup","molasses"])) diets.push("Low-Carb");

  // very loose paleo / keto
  if (!hasGluten && !hasDairy && !hasAny(ings, ["sugar","maple","syrup","molasses"])) diets.push("Paleo");
  if (!hasGluten && (diets.includes("Low-Carb") || proteinHits >= 2)) diets.push("Keto");

  // de-dup & keep only supported labels
  const allowed = new Set(ALL_DIETS);
  return Array.from(new Set(diets)).filter(d => allowed.has(d));
}

  // very loose


function extractYouTubeId(url?: string | null) {
  try {
    if (!url) return null;
    const u = new URL(url);
    if (u.hostname.includes("youtube.com")) return u.searchParams.get("v");
    if (u.hostname.includes("youtu.be"))
      return u.pathname.replace("/", "") || null;
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
    await AsyncStorage.setItem(
      STORAGE_KEYS.USAGE_LOG,
      JSON.stringify(arr.slice(-2000)),
    );
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
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([mealId, count]) => ({ mealId, count }));
}

function normalizeFireDoc(d: any, id: string): Meal {
  const steps = Array.isArray(d.instructions)
    ? d.instructions
    : (d.instructions ?? null);
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

function HeartButton({
  mealId,
  size = 20,
  style,
  onToggle,
}: {
  mealId: string;
  size?: number;
  style?: any;
  onToggle?: (nowFav: boolean) => void;
}) {
  const [fav, setFav] = useState<boolean>(false);

  useEffect(() => {
    (async () => setFav(await isFavorite(mealId)))();
  }, [mealId]);

  const press = async () => {
    const nowFav = await toggleFavorite(mealId);
    setFav(nowFav);
    onToggle?.(nowFav);
  };

  return (
    <TouchableOpacity onPress={press} style={[{ padding: 6 }, style]} accessibilityRole="button" accessibilityLabel={fav ? "Remove from favorites" : "Add to favorites"}>
      <Ionicons name={fav ? "heart" : "heart-outline"} size={size} color="#e11d48" />
    </TouchableOpacity>
  );
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
    query(
      collection(db, "recipes"),
      orderBy("title_lower"),
      startAt(ql),
      endAt(ql + "\uf8ff"),
      limit(24),
    ),
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
      },
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

// NEW - offline cache
async function cacheRecipe(meal: Meal) {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.OFFLINE_RECIPES);
    const map: Record<string, Meal> = raw ? JSON.parse(raw) : {};
    map[meal.idMeal] = meal;
    await AsyncStorage.setItem(STORAGE_KEYS.OFFLINE_RECIPES, JSON.stringify(map));
  } catch {}
}

async function getCachedRecipe(id: string): Promise<Meal | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.OFFLINE_RECIPES);
    const map: Record<string, Meal> = raw ? JSON.parse(raw) : {};
    return map[id] || null;
  } catch { return null; }
}


// Recommend based on prefs, else random sample across the whole collection.
// Always exclude recipes already completed (History) and dislikes.
async function fetchRecommended(n: number = 12): Promise<Meal[]> {
  // disliked ingredients list (for filtering later)
  let dislikesLC: string[] = [];
  try {
    const prefsRaw = await AsyncStorage.getItem(STORAGE_KEYS2.USER_PREFS);
    const prefs: UserPrefs | null = prefsRaw ? JSON.parse(prefsRaw) : null;
    dislikesLC = normalizeDislikes(prefs?.dislikes);

    // IDs the user already completed
    const doneSet = await getDoneMealIdsSet();

    const ref = collection(db, "recipes");
    const picks: Meal[] = [];

    // If the user has explicit tastes, prefer those — but still exclude "done".
    if (prefs?.likedAreas?.length) {
      const qy = query(ref, where("area", "in", prefs.likedAreas.slice(0, 10)), limit(n * 3));
      const s = await getDocs(qy);
      const all = s.docs.map(d => normalizeFireDoc(d.data(), d.id));
      const filtered = all
        .filter(m => !doneSet.has(m.idMeal))
        .filter(m => !mealHasDisliked(m, dislikesLC));
      shuffleInPlace(filtered);
      return filtered.slice(0, n);
    }

    if (prefs?.likedCategories?.length) {
      const qy = query(ref, where("category", "in", prefs.likedCategories.slice(0, 10)), limit(n * 3));
      const s = await getDocs(qy);
      const all = s.docs.map(d => normalizeFireDoc(d.data(), d.id));
      const filtered = all
        .filter(m => !doneSet.has(m.idMeal))
        .filter(m => !mealHasDisliked(m, dislikesLC));
      shuffleInPlace(filtered);
      return filtered.slice(0, n);
    }

    // === No tastes set: pull a few random windows by random title prefixes ===
    // We try multiple random prefixes, collect, then shuffle.
    const attempts = 5;      // how many random windows to try
    const windowSize = Math.max(n, 12); // per window
    for (let i = 0; i < attempts && picks.length < n * 4; i++) {
      const prefix = randomTitlePrefix();
      const s = await getDocs(
        query(
          ref,
          orderBy("title_lower"),
          startAt(prefix),
          endAt(prefix + "\uf8ff"),
          limit(windowSize)
        )
      );
      const rows = s.docs.map(d => normalizeFireDoc(d.data(), d.id));
      picks.push(...rows);
    }

    // If we didn’t get enough via prefix windows (e.g., skewed titles), do a general sample near the middle
    if (picks.length < n * 2) {
      const s2 = await getDocs(query(ref, orderBy("title_lower"), limit(n * 3)));
      picks.push(...s2.docs.map(d => normalizeFireDoc(d.data(), d.id)));
    }

    // Dedup by id
    const seen = new Set<string>();
    const deduped = picks.filter(m => {
      if (!m?.idMeal || seen.has(m.idMeal)) return false;
      seen.add(m.idMeal);
      return true;
    });

    // Exclude completed + dislikes, then shuffle and slice
    const filtered = deduped
      .filter(m => !doneSet.has(m.idMeal))
      .filter(m => !mealHasDisliked(m, dislikesLC));

    shuffleInPlace(filtered);
    return filtered.slice(0, n);
  } catch (e) {
    console.warn("fetchRecommended error:", e);
    // Very last resort: light fallback, still exclude done + dislikes
    try {
      const doneSet = await getDoneMealIdsSet();
      const s = await getDocs(query(collection(db, "recipes"), limit(n * 3)));
      const all = s.docs.map(d => normalizeFireDoc(d.data(), d.id));
      const filtered = all
        .filter(m => !doneSet.has(m.idMeal))
        .filter(m => !mealHasDisliked(m, dislikesLC));
      shuffleInPlace(filtered);
      return filtered.slice(0, n);
    } catch {
      return [];
    }
  }
}


async function addViewAndMaybeUnlock(area: string | null, mealId: string) {
  await logUsage({ type: "view", mealId, ts: now(), area });
  if (!area) return;

  try {
    const rawSets = await AsyncStorage.getItem(
      STORAGE_KEYS.ACHIEVEMENT_AREA_SETS,
    );
    const map: Record<string, string[]> = rawSets ? JSON.parse(rawSets) : {};
    const set = new Set(map[area] || []);
    set.add(mealId);
    map[area] = Array.from(set);
    await AsyncStorage.setItem(
      STORAGE_KEYS.ACHIEVEMENT_AREA_SETS,
      JSON.stringify(map),
    );

    if (set.size >= 3) {
      const rawUnlocked = await AsyncStorage.getItem(STORAGE_KEYS.ACHIEVEMENTS);
      const unlocked: Record<string, boolean> = rawUnlocked
        ? JSON.parse(rawUnlocked)
        : {};
      if (!unlocked[area]) {
        unlocked[area] = true;
        await AsyncStorage.setItem(
          STORAGE_KEYS.ACHIEVEMENTS,
          JSON.stringify(unlocked),
        );
      }
    }
  } catch {}
}

function normalizeSteps(input?: string | string[] | null) {
  if (!input) return [];
  if (Array.isArray(input))
    return input.map((s) => String(s).trim()).filter(Boolean);

  const raw = String(input).trim();
  if (!raw) return [];

  if (raw.startsWith("[") && raw.endsWith("]")) {
    try {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr))
        return arr.map((s: any) => String(s).trim()).filter(Boolean);
    } catch {}
  }

  return raw
    .replace(/\r/g, "\n")
    .split(/\n+|\|/g)
    .map((s) =>
      s
        .replace(/\s*&\s*/g, " & ")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter(Boolean);
}
// ------------ Favorites helpers ------------
async function getFavoriteIds(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.FAVORITES);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
async function setFavoriteIds(ids: string[]) {
  await AsyncStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(Array.from(new Set(ids))));
}
async function isFavorite(mealId: string): Promise<boolean> {
  const ids = await getFavoriteIds();
  return ids.includes(mealId);
}
async function toggleFavorite(mealId: string): Promise<boolean> {
  const ids = await getFavoriteIds();
  const has = ids.includes(mealId);
  const next = has ? ids.filter(id => id !== mealId) : [...ids, mealId];
  await setFavoriteIds(next);
  return !has; // returns the new state (true if now favorite)
}

// ------------ History helpers ------------
type HistoryItem = { mealId: string; ts: number };
async function getHistory(): Promise<HistoryItem[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.HISTORY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
async function addToHistoryOnce(mealId: string) {
  const list = await getHistory();
  if (list.some(x => x.mealId === mealId)) return; // already there
  const next = [{ mealId, ts: Date.now() }, ...list].slice(0, 500);
  await AsyncStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(next));
}


// ---------- Small UI helpers ----------
function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
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
        selected
          ? { backgroundColor: "#111827", borderColor: "#111827" }
          : { borderColor: "#e5e7eb" },
      ]}
    >
      <Text
        style={{ color: selected ? "white" : "#111827", fontWeight: "600" }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

// ----------------- Onboarding (Wizard) -----------------
function OnboardingScreen({
  navigation,
  onDone,
}: {
  navigation?: any;
  onDone?: () => void;
}) {
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
    "Greek",
    "Italian",
    "Mexican",
    "Chinese",
    "Indian",
    "Japanese",
    "Thai",
    "French",
    "Spanish",
    "American",
    "Middle Eastern",
    "Turkish",
    "Korean",
    "Vietnamese",
  ];
  const CATEGORIES = [
    "Dessert",
    "Seafood",
    "Pasta",
    "Beef",
    "Chicken",
    "Vegan",
    "Vegetarian",
    "Breakfast",
    "Soup",
    "Salad",
    "Snack",
    "Bread",
    "Sauce",
  ];
  const DIETS = [
    "High protein",
    "Low carb",
    "Vegetarian",
    "Vegan",
    "Gluten free",
    "Dairy free",
  ];

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
      navigation.reset({
        index: 0,
        routes: [{ name: "Tabs", params: { screen: "Search" } }],
      });
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
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        {index > 0 ? (
          <TouchableOpacity
            onPress={goBack}
            style={[
              styles.btn,
              { height: 36, paddingHorizontal: 12, backgroundColor: "#6b7280" },
            ]}
          >
            <Text style={styles.btnText}>Back</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 72 }} />
        )}

        <TouchableOpacity
          onPress={skipAll}
          style={[
            styles.btn,
            { height: 36, paddingHorizontal: 12, backgroundColor: "#6b7280" },
          ]}
        >
          <Text style={styles.btnText}>Skip all</Text>
        </TouchableOpacity>
      </View>

      <Text style={{ fontSize: 26, fontWeight: "800", marginBottom: 6 }}>
        Tell us your taste
      </Text>
      <Text style={{ color: "#6b7280", marginBottom: 14 }}>
        We’ll personalize your home feed.
      </Text>

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
              <Text
                style={{ fontSize: 18, fontWeight: "700", marginBottom: 8 }}
              >
                {step.title}
              </Text>
              <ScrollView
                style={{ maxHeight: 380 }}
                contentContainerStyle={{ paddingBottom: 16 }}
              >
                {step.content}
              </ScrollView>
            </View>
          ))}
        </Animated.View>
      </View>

      {/* Bottom buttons */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginTop: 12,
        }}
      >
        <TouchableOpacity
          onPress={skipStep}
          style={[
            styles.btn,
            { flex: 1, backgroundColor: "#6b7280", marginRight: 8 },
          ]}
        >
          <Text style={styles.btnText}>Skip</Text>
        </TouchableOpacity>

        {index < steps.length - 1 ? (
          <TouchableOpacity onPress={goNext} style={[styles.btn, { flex: 1 }]}>
            <Text style={styles.btnText}>Next</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={finish}
            style={[styles.btn, { flex: 1, backgroundColor: "#16a34a" }]}
          >
            <Text style={styles.btnText}>Finish</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}


// --- counts ---
function stepCount(meal: Meal): number {
  const steps = normalizeSteps(meal.strInstructions);
  return steps.length;
}

function ingredientCount(meal: Meal): number {
  if (Array.isArray(meal.spoonIngredients) && meal.spoonIngredients.length) {
    return meal.spoonIngredients.filter(
      (it) => it && String(it.ingredient || "").trim()
    ).length;
  }
  let n = 0;
  for (let i = 1; i <= 20; i++) {
    const v = (meal as any)[`strIngredient${i}`];
    if (v && String(v).trim()) n++;
  }
  return n;
}

// --- difficulty from STEPS ---
function getDifficulty(meal: Meal): "Easy" | "Medium" | "Hard" {
  const s = stepCount(meal);
  if (s <= 4) return "Easy";
  if (s <= 7) return "Medium";
  return "Hard";
}

// --- time inference from INGREDIENTS (used only when prepMinutes is missing) ---
/** Returns 15, 30, 60 (bucket cap) based on ingredient count; null if cannot infer */
function inferredPrepMinutes(meal: Meal): 15 | 30 | 60 | null {
  const n = ingredientCount(meal);
  if (n <= 5) return 15;
  if (n <= 8) return 30;
  return 60;
}

function DifficultyBadge({ meal, style }: { meal: Meal; style?: any }) {
  const diff = getDifficulty(meal);
  const bg = diff === "Easy" ? "#86efac" : diff === "Medium" ? "#facc15" : "#f87171";
  return (
    <View
      style={[
        {
          alignSelf: "flex-start",
          backgroundColor: bg,
          borderRadius: 10,
          paddingHorizontal: 8,
          paddingVertical: 3,
        },
        style,
      ]}
    >
      <Text style={{ color: "#111827", fontWeight: "700", fontSize: 12 }}>
        {diff}
      </Text>
    </View>
  );
}
// NEW - naive nutrition fetch with cache
async function fetchNutritionForMeal(meal: Meal): Promise<{ calories?: number; protein?: number; carbs?: number; fat?: number } | null> {
  try {
    const cacheRaw = await AsyncStorage.getItem(STORAGE_KEYS.NUTRITION_CACHE);
    const cache: Record<string, any> = cacheRaw ? JSON.parse(cacheRaw) : {};
    if (cache[meal.idMeal]) return cache[meal.idMeal];

    const lines = (meal.spoonIngredients?.length
      ? meal.spoonIngredients.map(i => `${i.measure || ""} ${i.ingredient}`).join("\n")
      : Array.from({ length: 20 }, (_, i) => (meal as any)[`strIngredient${i+1}`]).filter(Boolean).join("\n")
    );

    // replace with your credentials
    const APP_ID = "__EDAMAM_APP_ID__";
    const APP_KEY = "__EDAMAM_APP_KEY__";

    // if you don’t want network here, return null
    const res = await fetch("https://api.edamam.com/api/nutrition-details?app_id="+APP_ID+"&app_key="+APP_KEY, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ingr: lines.split("\n").filter(Boolean) })
    });
    if (!res.ok) return null;
    const data = await res.json();

    const out = {
      calories: data.calories,
      protein: data.totalNutrients?.PROCNT?.quantity,
      carbs: data.totalNutrients?.CHOCDF?.quantity,
      fat: data.totalNutrients?.FAT?.quantity,
    };
    cache[meal.idMeal] = out;
    await AsyncStorage.setItem(STORAGE_KEYS.NUTRITION_CACHE, JSON.stringify(cache));
    return out;
  } catch { return null; }
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
  const [prefs, setPrefs] = useState<UserPrefs | null>(null);

  // ---- Filters state ----
  type Filters = {
    cuisine?: string | null;
    mealType?: string | null;
    difficulty?: string | null;
    diet?: string | null;
    maxMinutes?: number | null;
  };
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    cuisine: null,
    mealType: null,
    difficulty: null,
    diet: null,
    maxMinutes: null,
  });

  // Master lists
  const ALL_CUISINES = ["American","Chinese","French","Greek","Indian","Italian","Japanese","Korean","Mediterranean","Mexican","Middle Eastern","Spanish"];
  const ALL_MEAL_TYPES = ["Appetizer","Breakfast","Dessert","Dinner","Lunch","Salad","Snack","Soup"];
  const ALL_DIETS = ["Dairy-Free","Gluten-Free","High-Protein","Keto","Low-Carb","Paleo","Vegan","Vegetarian"];

  // Options shown
  const CUISINE_OPTIONS = useMemo(
    () => ["All Cuisines", ...(prefs?.likedAreas?.length ? prefs.likedAreas : ALL_CUISINES)],
    [prefs]
  );
  const MEALTYPE_OPTIONS = useMemo(
    () => ["All Meal Types", ...(prefs?.likedCategories?.length ? prefs.likedCategories : ALL_MEAL_TYPES)],
    [prefs]
  );
  const DIET_OPTIONS = useMemo(
    () => ["All Dietary Options", ...(prefs?.diets?.length ? prefs.diets : ALL_DIETS)],
    [prefs]
  );
  const DIFFICULTY_OPTIONS: string[] = ["All Difficulties","Easy","Medium","Hard"];
  const TIME_OPTIONS = [
    { label: "Any Time", value: null },
    { label: "15 min or less", value: 15 },
    { label: "30 min or less", value: 30 },
    { label: "1 hour or less", value: 60 },
  ];

  // Mood presets used in header chips
  const MOOD_PRESETS = [
    { label: "Quick lunch", filters: { mealType: "Lunch", maxMinutes: 15 } },
    { label: "High protein", filters: { diet: "High-Protein" } },
    { label: "Date night", filters: { mealType: "Dinner" } },
  ];

  // apply filters to one meal
  function passesFilters(m: Meal): boolean {
    const inferredCuisine = inferCuisine(m) ?? m.strArea ?? null;
    const inferredMealType = inferMealType(m) ?? m.strCategory ?? null;
    const inferredDietList = inferDiets(m);
    const bag = textBagLC(m);

    if (filters.cuisine && filters.cuisine !== "All Cuisines") {
      if ((inferredCuisine || "").toLowerCase() !== filters.cuisine.toLowerCase()) return false;
    }

    if (filters.mealType && filters.mealType !== "All Meal Types") {
      const want = filters.mealType.toLowerCase();
      const inferredOK = (inferredMealType || "").toLowerCase() === want;
      const lunchKW = ["lunch","sandwich","wrap","burrito","panini"];
      const dinnerKW = ["dinner","roast","casserole","steak","lasagna","curry"];
      const snackKW  = ["snack","bites","bars","energy balls"];
      const breakfastKW = ["breakfast","pancake","omelette","granola","oatmeal","french toast","scrambled"];
      const saladKW = ["salad","coleslaw","vinaigrette","caprese","greens"];
      const soupKW  = ["soup","broth","gazpacho","bisque","ramen","pho","stew","chowder"];
      const dessertKW = ["dessert","cake","brownie","cookie","ice cream","pudding","mousse","tiramisu","cheesecake"];
      const appetizerKW = ["appetizer","starter","dip","bruschetta","mezze"];
      const kwMap: Record<string,string[]> = {
        lunch: lunchKW, dinner: dinnerKW, snack: snackKW, breakfast: breakfastKW,
        salad: saladKW, soup: soupKW, dessert: dessertKW, appetizer: appetizerKW,
      };
      const kwOK = (kwMap[want] ?? []).some(k => bag.includes(k));
      if (!inferredOK && !kwOK) return false;
    }

    if (filters.difficulty && filters.difficulty !== "All Difficulties") {
      if (getDifficulty(m).toLowerCase() !== filters.difficulty.toLowerCase()) return false;
    }

    if (filters.diet && filters.diet !== "All Dietary Options") {
      if (!inferredDietList.map(x => x.toLowerCase()).includes(filters.diet.toLowerCase())) return false;
    }

    if (filters.maxMinutes != null) {
      const mins = (m as any).prepMinutes as number | undefined;
      if (typeof mins === "number") {
        if (mins > filters.maxMinutes) return false;
      } else {
        const bucket = inferredPrepMinutes(m);
        if (bucket == null || bucket > filters.maxMinutes) return false;
      }
    }

    return true;
  }

  // load dislikes + recent + recommended
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEYS2.USER_PREFS);
        const p: UserPrefs | null = raw ? JSON.parse(raw) : null;
        setPrefs(p);
        setDislikesLC(normalizeDislikes(p?.dislikes));
      } catch {}
      try {
        const rawRecent = await AsyncStorage.getItem(STORAGE_KEYS.RECENT);
        setRecent(rawRecent ? JSON.parse(rawRecent) : []);
      } catch {}
      try {
        const r = await fetchRecommended(24);
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
    setQ(term);
    if (!term) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const rows = await withTimeout(searchRecipesPrefix(term), 8000);
      const filtered = rows.filter((m) => !mealHasDisliked(m, dislikesLC));
      setResults(filtered);
    } catch {
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

  const handleFiltersPress = () => setFiltersOpen((v) => !v);


  // data for list
  const baseData = q ? results : reco;
  const data = baseData.filter(passesFilters);

  // ---- HEADER (kept small & safe) ----
  const SearchHeader: React.FC = () => (
    <View>
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
        <TouchableOpacity onPress={handleFiltersPress} style={styles.filterBtn}>
          <Ionicons name="funnel-outline" size={18} color="#111827" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onSearch(q)} style={styles.btn}>
          <Text style={styles.btnText}>{t("search")}</Text>
        </TouchableOpacity>
      </View>
      {/* INLINE FILTERS PANEL */}
{filtersOpen && (
  <View style={styles.filterPanel}>
    <Text style={styles.filterTitle}>Filters</Text>

    <View style={styles.filterGrid}>
      {/* Cuisine */}
      <View style={styles.filterField}>
        <Text style={styles.filterLabel}>Cuisine</Text>
        <View style={styles.pickerWrap}>
          <Picker
            selectedValue={filters.cuisine ?? "All Cuisines"}
            onValueChange={(v) =>
              setFilters((f) => ({ ...f, cuisine: v === "All Cuisines" ? null : String(v) }))
            }
            mode="dropdown"
          >
            {CUISINE_OPTIONS.map((c) => (
              <Picker.Item key={c} label={c} value={c} />
            ))}
          </Picker>
        </View>
      </View>

      {/* Meal Type */}
      <View style={styles.filterField}>
        <Text style={styles.filterLabel}>Meal Type</Text>
        <View style={styles.pickerWrap}>
          <Picker
            selectedValue={filters.mealType ?? "All Meal Types"}
            onValueChange={(v) =>
              setFilters((f) => ({ ...f, mealType: v === "All Meal Types" ? null : String(v) }))
            }
            mode="dropdown"
          >
            {MEALTYPE_OPTIONS.map((c) => (
              <Picker.Item key={c} label={c} value={c} />
            ))}
          </Picker>
        </View>
      </View>

      {/* Difficulty */}
      <View style={styles.filterField}>
        <Text style={styles.filterLabel}>Difficulty</Text>
        <View style={styles.pickerWrap}>
          <Picker
            selectedValue={filters.difficulty ?? "All Difficulties"}
            onValueChange={(v) =>
              setFilters((f) => ({ ...f, difficulty: v === "All Difficulties" ? null : String(v) }))
            }
            mode="dropdown"
          >
            {["All Difficulties", ...DIFFICULTY_OPTIONS.filter(d => d !== "All Difficulties")].map((d) => (
              <Picker.Item key={d} label={d} value={d} />
            ))}
          </Picker>
        </View>
      </View>

      {/* Diet */}
      <View style={styles.filterField}>
        <Text style={styles.filterLabel}>Dietary</Text>
        <View style={styles.pickerWrap}>
          <Picker
            selectedValue={filters.diet ?? "All Dietary Options"}
            onValueChange={(v) =>
              setFilters((f) => ({ ...f, diet: v === "All Dietary Options" ? null : String(v) }))
            }
            mode="dropdown"
          >
            {DIET_OPTIONS.map((d) => (
              <Picker.Item key={d} label={d} value={d} />
            ))}
          </Picker>
        </View>
      </View>

      {/* Max time */}
      <View style={styles.filterField}>
        <Text style={styles.filterLabel}>Max Prep Time (minutes)</Text>
        <View style={styles.pickerWrap}>
          <Picker
            selectedValue={filters.maxMinutes ?? null}
            onValueChange={(v) =>
              setFilters((f) => ({ ...f, maxMinutes: v as number | null }))
            }
            mode="dropdown"
          >
            {TIME_OPTIONS.map((opt) => (
              <Picker.Item key={String(opt.value)} label={opt.label} value={opt.value} />
            ))}
          </Picker>
        </View>
      </View>
    </View>

    <View style={{ flexDirection: "row", marginTop: 12 }}>
      <TouchableOpacity
        onPress={() => setFiltersOpen(false)}
        style={[styles.btn, { flex: 1 }]}
      >
        <Text style={styles.btnText}>Apply</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() =>
          setFilters({ cuisine: null, mealType: null, difficulty: null, diet: null, maxMinutes: null })
        }
        style={[styles.btn, { flex: 1, marginLeft: 8, backgroundColor: "#6b7280" }]}
      >
        <Text style={styles.btnText}>Reset</Text>
      </TouchableOpacity>
    </View>
  </View>
)}



      {/* Craving chips */}
      {!q && (
        <View style={{ marginTop: 6 }}>
          <Text style={styles.muted}>{t("craving")}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 4, paddingRight: 8 }}>
            {["Protein snacks", "Sweet", "Chinese", "Tacos"].map((s) => (
              <Pressable key={s} onPress={() => onSearch(s)} style={styles.recentChip}>
                <Text style={styles.recentChipText}>{s}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Recent searches */}
      {recent.length > 0 && (
        <View style={styles.recentBox}>
          <View style={styles.recentHeader}>
            <Text style={styles.recentTitle}>{t("recent")}</Text>
            <TouchableOpacity onPress={clearRecent}>
              <Text style={styles.clearBtn}>{t("clear_all")}</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 4, paddingRight: 8 }}>
            {recent.map((r) => (
              <Pressable key={r} onPress={() => onSearch(r)} style={styles.recentChip}>
                <Text style={styles.recentChipText}>{r}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Explore by mood */}
      <View style={{ marginTop: 6 }}>
        <Text style={styles.muted}>Explore by mood</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 4, paddingRight: 8 }}>
          {MOOD_PRESETS.map((p) => (
            <Pressable
              key={p.label}
              onPress={() =>
                setFilters({
                  cuisine: null, mealType: null, difficulty: null, diet: null, maxMinutes: null,
                  ...p.filters,
                })
              }
              style={styles.recentChip}
            >
              <Text style={styles.recentChipText}>{p.label}</Text>
            </Pressable>
          ))}
          <Pressable
            onPress={() => {
              const pool = data.length ? data : (q ? results : reco);
              if (!pool.length) return;
              const pick = pool[Math.floor(Math.random() * pool.length)];
              navigation.navigate("Recipe", { mealId: pick.idMeal, title: pick.strMeal, meal: pick });
            }}
            style={[styles.recentChip, { backgroundColor: "#dbeafe" }]}
          >
            <Text style={styles.recentChipText}>Surprise me ??</Text>
          </Pressable>
        </ScrollView>
      </View>

      {!q && results.length === 0 && reco.length > 0 && (
        <Text style={[styles.h2, { marginTop: 12 }]}>Recommended</Text>
      )}

      {loading && <ActivityIndicator style={{ marginTop: 16 }} />}
    </View>
  );

  // ---- MAIN RENDER ----
  return (
    <SafeAreaView style={[styles.screen, { flex: 1 }]}>
      <FlatList
        data={data}
        keyExtractor={(i) => i.idMeal}
        showsVerticalScrollIndicator
        contentContainerStyle={{ paddingVertical: 12, paddingBottom: 32 }}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        scrollEnabled={Platform.OS === "web" || !filtersOpen}
        ListHeaderComponent={<SearchHeader />}
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
              <View style={{ position: "relative", marginRight: 12 }}>
                <Image
                  source={item.strMealThumb ? { uri: item.strMealThumb } : undefined}
                  style={{ width: 96, height: 96, borderRadius: 12 }}
                />
                <DifficultyBadge meal={item} style={{ position: "absolute", right: 6, top: 6 }} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{item.strMeal}</Text>
                <View style={styles.rowGap8}>
                  {!!item.strArea && (
                    <View style={styles.pill}><Text style={styles.pillText}>{item.strArea}</Text></View>
                  )}
                  {!!item.strCategory && (
                    <View style={styles.pill}><Text style={styles.pillText}>{item.strCategory}</Text></View>
                  )}
                </View>
                <Text numberOfLines={1} style={styles.muted}>{t("tap_view")}</Text>
              </View>
              <HeartButton mealId={item.idMeal} style={{ alignSelf: "center", marginLeft: 6 }} />
            </View>
          </Pressable>
        )}
        ListEmptyComponent={() => (
          <Text style={{ marginTop: 16, color: "#6b7280" }}>{t("placeholder")}</Text>
        )}
      />
    </SafeAreaView>
  );
}


function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ flex: 1, marginRight: 10, marginBottom: 12 }}>
      <Text style={{ fontWeight: "700", marginBottom: 6 }}>{label}</Text>
      <Pressable
        onPress={() => setOpen(true)}
        style={{
          height: 42,
          borderWidth: 1,
          borderColor: "#d1d5db",
          borderRadius: 10,
          paddingHorizontal: 12,
          alignItems: "center",
          flexDirection: "row",
          justifyContent: "space-between",
          backgroundColor: "white",
        }}
      >
        <Text numberOfLines={1} style={{ flex: 1 }}>{value}</Text>
        <Ionicons name="chevron-down" size={18} color="#111827" />
      </Pressable>

      {/* simple per-field picker modal */}
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={modalStyles.backdrop} onPress={() => setOpen(false)} />
        <View style={[modalStyles.sheet, { maxHeight: 360 }]}>
          <Text style={[styles.h2, { marginBottom: 8 }]}>{label}</Text>
          <ScrollView>
            {options.map((opt) => (
              <Pressable
                key={opt}
                onPress={() => {
                  onChange(opt);
                  setOpen(false);
                }}
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  borderRadius: 8,
                  marginBottom: 6,
                  backgroundColor: opt === value ? "#eef2ff" : "#f9fafb",
                }}
              >
                <Text style={{ fontWeight: opt === value ? "700" : "500" }}>{opt}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <TouchableOpacity onPress={() => setOpen(false)} style={[styles.btn, { marginTop: 8 }]}>
            <Text style={styles.btnText}>Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}
// Put this near the existing Select component (same file).
function SelectInput({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  // Web: inline HTML <select>
  if (Platform.OS === "web") {
    return (
      <View style={styles.filterField}>
        <Text style={styles.filterLabel}>{label}</Text>
        <View style={styles.pickerWrap}>
          <select
            value={value}
            onChange={(e: any) => onChange(e.target.value)}
            style={{
              width: "100%",
              height: 42,
              borderWidth: 1,
              borderColor: "#d1d5db",
              borderRadius: 10,
              paddingLeft: 10,
              background: "white",
              outline: "none",
            } as any}
          >
            {options.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </View>
      </View>
    );
  }

  // iOS/Android: reuse your existing modal Select
  // (Select already renders its own label + modal)
  return (
    <View style={styles.filterField}>
      <Select label={label} value={value} options={options} onChange={onChange} />
    </View>
  );
}



const modalStyles = StyleSheet.create({
  backdrop: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  sheet: {
    position: "absolute",
    top: Platform.OS === "web" ? 80 : 100,
    left: 16,
    right: 16,
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 12,
  },
});



// ----------------- Recipe -----------------
function RecipeScreen({ route, navigation }: any) {
  const { mealId, meal: passedMeal } = route.params || {};
  const [meal, setMeal] = useState<Meal | null>(passedMeal || null);
  const [loading, setLoading] = useState(!passedMeal);
  const [stepState, setStepState] = useState<boolean[]>([]);
  const [isFav, setIsFav] = useState<boolean>(false);

  // OPTIONAL nutrition panel state
  const [nutrition, setNutrition] = useState<any>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (!passedMeal) {
          setLoading(true);
          // try network
          const m = await getMealById(mealId);
          if (!mounted) return;
          if (m) {
            setMeal(m);
            // cache for offline
            cacheRecipe(m).catch(() => {});
          } else {
            // fallback to offline cache
            const cached = await getCachedRecipe(mealId);
            if (!mounted) return;
            setMeal(cached);
          }
          setLoading(false);
        }
      } catch {
        if (!mounted) return;
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [mealId, passedMeal]);

  // load step checkboxes state
  useEffect(() => {
    (async () => {
      if (!meal) return;
      const steps = normalizeSteps(meal.strInstructions);
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.STEP_STATE(meal.idMeal));
      setStepState(raw ? JSON.parse(raw) : new Array(steps.length).fill(false));
    })();
  }, [meal]);

  // load favorite state whenever meal changes
  useEffect(() => {
    (async () => {
      if (!meal) return;
      const fav = await isFavorite(meal.idMeal);
      setIsFav(fav);
    })();
  }, [meal]);

  // header heart button
  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={async () => {
            if (!meal) return;
            const nowFav = await toggleFavorite(meal.idMeal);
            setIsFav(nowFav);
          }}
          style={{ marginRight: 12 }}
          accessibilityRole="button"
          accessibilityLabel={isFav ? "Remove from favorites" : "Add to favorites"}
        >
          <Ionicons name={isFav ? "heart" : "heart-outline"} size={22} color="#e11d48" />
        </TouchableOpacity>
      ),
    });
  }, [navigation, meal, isFav]);

  // usage log & achievements
  useEffect(() => {
    (async () => {
      if (!meal) return;
      await addViewAndMaybeUnlock(meal.strArea ?? null, meal.idMeal);
    })();
  }, [meal]);

  // OPTIONAL: nutrition (approx)
  useEffect(() => {
    (async () => {
      if (!meal) return;
      const n = await fetchNutritionForMeal(meal);
      setNutrition(n);
    })();
  }, [meal]);

  const toggleStep = async (idx: number) => {
    const next = [...stepState];
    next[idx] = !next[idx];
    setStepState(next);
    if (meal) {
      await AsyncStorage.setItem(STORAGE_KEYS.STEP_STATE(meal.idMeal), JSON.stringify(next));
      const allChecked = next.length > 0 && next.every(Boolean);
      if (allChecked) await addToHistoryOnce(meal.idMeal);
    }
  };

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

  // parse minutes from current step text
  const parseStepMinutes = (text: string): number | null => {
    const s = text.toLowerCase();
    let m = s.match(/(\d+)\s*-\s*(\d+)\s*min/);
    if (m) return parseInt(m[2], 10);
    m = s.match(/(\d+)\s*(?:minutes|minute|min)\b/);
    if (m) return parseInt(m[1], 10);
    return null;
  };

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        {meal.strMealThumb ? (
          <Image
            source={{ uri: meal.strMealThumb }}
            style={{ width: "100%", height: 220, borderRadius: 16, marginBottom: 12 }}
          />
        ) : null}

        <Text style={{ fontSize: 24, fontWeight: "800", marginBottom: 6 }}>
          {meal.strMeal}
        </Text>

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
          <DifficultyBadge meal={meal} />
        </View>

        {/* OPTIONAL Nutrition */}
        {nutrition && (
          <>
            <Text style={styles.h2}>Nutrition (approx)</Text>
            <Text style={styles.muted}>
              {Math.round(nutrition.calories || 0)} kcal •
              {" "}Protein {Math.round(nutrition.protein || 0)} g •
              {" "}Carbs {Math.round(nutrition.carbs || 0)} g •
              {" "}Fat {Math.round(nutrition.fat || 0)} g
            </Text>
          </>
        )}

        <Text style={styles.h2}>Ingredients</Text>
        {ings.map((ing, i) => (
          <Text key={i} style={styles.li}>
            • {ing.ingredient} {ing.measure ? `(${ing.measure})` : ""}
          </Text>
        ))}

        {/* Add to Shopping List button (INSIDE RecipeScreen) */}
        <TouchableOpacity
          onPress={async () => {
            await addIngredientsToShoppingList(meal);
            Alert.alert("Added", "Ingredients added to your Shopping List.");
          }}
          style={[styles.btn, { marginTop: 12, backgroundColor: "#16a34a" }]}
        >
          <Text style={styles.btnText}>Add Ingredients to Shopping List</Text>
        </TouchableOpacity>

        <Text style={styles.h2}>Steps</Text>
        {steps.length === 0 ? (
          <Text style={styles.muted}>No steps provided.</Text>
        ) : (
          steps.map((s, i) => (
            <View
              key={i}
              style={[
                styles.stepRow,
                stepState[i] ? styles.stepRowDone : undefined,
              ]}
            >
              <Pressable
                onPress={() => toggleStep(i)}
                style={[
                  styles.checkbox,
                  stepState[i] ? styles.checkboxChecked : undefined,
                ]}
              />
              <Text
                style={[
                  styles.stepText,
                  stepState[i] ? styles.stepTextDone : undefined,
                ]}
              >
                {s}
              </Text>

              {/* Quick timer if step mentions minutes */}
              {parseStepMinutes(s) ? (
                <TouchableOpacity
                  onPress={() => scheduleTimerNotification("Step timer", parseStepMinutes(s)!)}
                  style={[styles.btn, { height: 36, marginLeft: 8 }]}
                >
                  <Text style={styles.btnText}>{parseStepMinutes(s)} min</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ))
        )}

        {/* Start Cook Mode button */}
        <TouchableOpacity
          onPress={() => navigation.navigate("CookMode", { meal })}
          style={[styles.btn, { marginTop: 12 }]}
        >
          <Text style={styles.btnText}>Start Cook Mode</Text>
        </TouchableOpacity>

        {!!meal.strYoutube && (
          <TouchableOpacity
            onPress={() => Linking.openURL(meal.strYoutube!)}
            style={[styles.btn, { marginTop: 12 }]}
          >
            <Text style={styles.btnText}>Watch on YouTube</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}


// NEW
const MOOD_PRESETS = [
  { label: "Quick Lunch", filters: { mealType: "Lunch", maxMinutes: 15 } },
  { label: "Date Night", filters: { mealType: "Dinner" } },
  { label: "High Protein", filters: { diet: "High-Protein" } },
  { label: "Vegan Comfort", filters: { diet: "Vegan" } },
  { label: "15-min Magic", filters: { maxMinutes: 15 } },
];


// ----------------- Top -----------------
function TopScreen({ navigation }: any) {
  const t = useT();
  const [list, setList] = useState<{ meal: Meal; count: number; mealId: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTop = useCallback(async () => {
    setLoading(true);
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.USAGE_LOG);
    const events: UsageEvent[] = raw ? JSON.parse(raw) : [];

    const ids = Array.from(
      new Set(
        events
          .filter(
            (e): e is Extract<UsageEvent, { type: "view" }> =>
              e.type === "view" && withinLastDays(e.ts, 7)
          )
          .map((e) => e.mealId)
      )
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
  }, []);

  useEffect(() => { loadTop(); }, [loadTop]);

  // Refresh when returning to this tab
  useEffect(() => {
    const unsub = navigation.addListener("focus", loadTop);
    return unsub;
  }, [navigation, loadTop]);

  return (
    <SafeAreaView style={[styles.screen, { flex: 1 }]}>
      <View style={styles.sectionHeaderRow}>
        <Ionicons name="flame-outline" size={22} color="#111827" style={{ marginRight: 8 }} />
        <Text style={styles.h1}>{t("top")}</Text>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 24 }} />
      ) : list.length === 0 ? (
        <Text style={styles.muted}>{t("no_data")}</Text>
      ) : (
        <FlatList
          data={list}
          keyExtractor={(i) => i.mealId}
          showsVerticalScrollIndicator
          contentContainerStyle={{ paddingBottom: 32 }}
          renderItem={({ item, index }) => (
            <Pressable
              style={styles.card}
              onPress={() =>
                navigation.navigate("Recipe", {
                  mealId: item.mealId,
                  title: item.meal.strMeal,
                  meal: item.meal,
                })
              }
            >
              <View style={{ flexDirection: "row" }}>
  <View style={{ position: "relative", marginRight: 12 }}>
    <Image
      source={item.meal.strMealThumb ? { uri: item.meal.strMealThumb } : undefined}
      style={{ width: 80, height: 80, borderRadius: 10 }}
    />
    <DifficultyBadge meal={item.meal} style={{ position: "absolute", right: 6, top: 6 }} />
  </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>
                    {index + 1}. {item.meal.strMeal}
                  </Text>
                  <Text style={styles.muted}>Views this week: {item.count}</Text>
                </View>
                <HeartButton mealId={item.mealId} style={{ alignSelf: "center", marginLeft: 6 }} />
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
        const rawS = await AsyncStorage.getItem(
          STORAGE_KEYS.ACHIEVEMENT_AREA_SETS,
        );
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
              <View
                key={area}
                style={[
                  styles.achItem,
                  isUnlocked ? styles.achUnlocked : styles.achLocked,
                ]}
              >
                <Text
                  style={[
                    styles.achTitle,
                    isUnlocked ? styles.achTitleUnlocked : undefined,
                  ]}
                >
                  {isUnlocked ? "? " : "?? "} {area}
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
          style={[
            styles.btn,
            {
              marginBottom: 8,
              backgroundColor: lang === l ? "#16a34a" : "#111827",
            },
          ]}
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
      <View style={styles.sectionHeaderRow}>
        <Ionicons
          name="settings-outline"
          size={22}
          color="#111827"
          style={{ marginRight: 8 }}
        />
        <Text style={styles.h1}>{t("settings")}</Text>
      </View>

      <TouchableOpacity
        onPress={() => navigation.navigate("Languages")}
        style={[styles.card, styles.settingsItem]}
      >
        <Ionicons
          name="globe-outline"
          size={22}
          color="#111827"
          style={styles.settingsIcon}
        />
        <View style={{ flex: 1 }}>
          <Text style={styles.settingsTitle}>Languages</Text>
          <Text style={styles.muted}>Change the app language</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => navigation.navigate("Onboarding")}
        style={[styles.card, styles.settingsItem]}
      >
        <View style={styles.settingsIconCombo}>
          <MaterialCommunityIcons
            name="chili-mild-outline"
            size={22}
            color="#111827"
          />
          <Ionicons
            name="create-outline"
            size={14}
            color="#111827"
            style={[styles.settingsIconOverlay, { right: -4, bottom: -4 }]}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.settingsTitle}>Edit tastes</Text>
          <Text style={styles.muted}>
            Update your cuisine, category & diet preferences
          </Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => navigation.navigate("Achievements")}
        style={[styles.card, styles.settingsItem]}
      >
        <View style={styles.settingsIconCombo}>
          <MaterialCommunityIcons
            name="medal-outline"
            size={22}
            color="#111827"
          />
          <MaterialCommunityIcons
            name="star-four-points-outline"
            size={12}
            color="#111827"
            style={[styles.settingsIconOverlay, { top: -4, right: -6 }]}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.settingsTitle}>{t("achievements")}</Text>
          <Text style={styles.muted}>View unlocked cuisines and progress</Text>
        </View>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

function BackButton({ navigation }: any) {
  return (
    <TouchableOpacity
      onPress={() => navigation.goBack()}
      style={{ marginLeft: 8 }}
    >
      <Ionicons name="arrow-back" size={24} color="black" />
    </TouchableOpacity>
  );
}




function FavoritesScreen({ navigation }: any) {
  const [items, setItems] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);

  const loadFavs = useCallback(async () => {
    setLoading(true);
    const ids = await getFavoriteIds();
    const meals = (await Promise.all(ids.map((id) => getMealById(id)))).filter(Boolean) as Meal[];
    setItems(meals);
    setLoading(false);
  }, []);

  useEffect(() => {
    const unsub = navigation.addListener("focus", loadFavs);
    return unsub;
  }, [navigation, loadFavs]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.screen, { flex: 1 }]}>
        <ActivityIndicator style={{ marginTop: 24 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.screen, { flex: 1 }]}>
      <Text style={styles.h1}>Favorites</Text>
      {items.length === 0 ? (
        <Text style={styles.muted}>No favorites yet.</Text>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.idMeal}
          showsVerticalScrollIndicator
          contentContainerStyle={{ paddingBottom: 32 }}
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
  <View style={{ position: "relative", marginRight: 12 }}>
    <Image
      source={item.strMealThumb ? { uri: item.strMealThumb } : undefined}
      style={{ width: 96, height: 96, borderRadius: 12 }}
    />
    <DifficultyBadge meal={item} style={{ position: "absolute", right: 6, top: 6 }} />
  </View>
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
                </View>
                <TouchableOpacity
                  onPress={async () => {
                    await toggleFavorite(item.idMeal);
                    loadFavs(); // refresh list
                  }}
                  style={{ alignSelf: "center", padding: 6 }}
                >
                  <Ionicons name="heart" size={20} color="#e11d48" />
                </TouchableOpacity>
              </View>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

// NEW - Shopping List screen
function ShoppingListScreen() {
  const [items, setItems] = useState<ShopItem[]>([]);
  const [newItem, setNewItem] = useState("");

  const load = useCallback(async () => setItems(await getShoppingList()), []);
  useEffect(() => { load(); }, [load]);

  const toggle = async (idx: number) => {
    const next = [...items];
    next[idx].checked = !next[idx].checked;
    setItems(next);
    await setShoppingList(next);
  };

  const remove = async (idx: number) => {
    const next = items.filter((_, i) => i !== idx);
    setItems(next);
    await setShoppingList(next);
  };

  const addManual = async () => {
    const txt = newItem.trim();
    if (!txt) return;
    const next = [...items, { name: txt, checked: false }];
    setItems(next);
    setNewItem("");
    await setShoppingList(next);
  };

  return (
    <SafeAreaView style={[styles.screen, { flex: 1 }]}>
      <Text style={styles.h1}>Shopping List</Text>

      <View style={[styles.searchRow, { marginBottom: 12 }]}>
        <TextInput
          value={newItem}
          onChangeText={setNewItem}
          placeholder="Add item..."
          style={[styles.input, { marginRight: 8 }]}
          onSubmitEditing={addManual}
        />
        <TouchableOpacity onPress={addManual} style={styles.btn}>
          <Text style={styles.btnText}>Add</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={items}
        keyExtractor={(_, i) => String(i)}
        renderItem={({ item, index }) => (
          <View style={[styles.card, { flexDirection: "row", alignItems: "center" }]}>
            <Pressable
              onPress={() => toggle(index)}
              style={[
                styles.checkbox,
                item.checked ? styles.checkboxChecked : undefined,
                { marginRight: 12 }
              ]}
            />
            <Text style={[{ flex: 1 }, item.checked ? styles.stepTextDone : undefined]}>
              {item.name}
            </Text>
            <TouchableOpacity onPress={() => remove(index)} style={{ padding: 6 }}>
              <Ionicons name="trash-outline" size={20} color="#ef4444" />
            </TouchableOpacity>
          </View>
        )}
      />
    </SafeAreaView>
  );
}



function HistoryScreen({ navigation }: any) {
  const t = useT();
  const [items, setItems] = useState<{ meal: Meal; ts: number }[]>([]);
  const [loading, setLoading] = useState(true);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    const hist = await getHistory(); // [{ mealId, ts }]
    hist.sort((a, b) => b.ts - a.ts);
    const meals = await Promise.all(hist.map(async (h) => ({ ts: h.ts, meal: await getMealById(h.mealId) })));
    setItems(meals.filter((x) => x.meal) as { meal: Meal; ts: number }[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    const unsub = navigation.addListener("focus", loadHistory);
    return unsub;
  }, [navigation, loadHistory]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.screen, { flex: 1 }]}>
        <ActivityIndicator style={{ marginTop: 24 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.screen, { flex: 1 }]}>
      <Text style={styles.h1}>History</Text>
      {items.length === 0 ? (
        <Text style={styles.muted}>Finish all steps in a recipe to save it here.</Text>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.meal.idMeal}
          showsVerticalScrollIndicator
          contentContainerStyle={{ paddingBottom: 32 }}
          renderItem={({ item }) => (
            <Pressable
              style={styles.card}
              onPress={() =>
                navigation.navigate("Recipe", {
                  mealId: item.meal.idMeal,
                  title: item.meal.strMeal,
                  meal: item.meal,
                })
              }
            >
              <View style={{ flexDirection: "row" }}>
  <View style={{ position: "relative", marginRight: 12 }}>
    <Image
      source={item.meal.strMealThumb ? { uri: item.meal.strMealThumb } : undefined}
      style={{ width: 96, height: 96, borderRadius: 12 }}
    />
    <DifficultyBadge meal={item.meal} style={{ position: "absolute", right: 6, top: 6 }} />
  </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{item.meal.strMeal}</Text>
                  <View style={styles.rowGap8}>
                    {!!item.meal.strArea && (
                      <View style={styles.pill}>
                        <Text style={styles.pillText}>{item.meal.strArea}</Text>
                      </View>
                    )}
                    {!!item.meal.strCategory && (
                      <View style={styles.pill}>
                        <Text style={styles.pillText}>{item.meal.strCategory}</Text>
                      </View>
                    )}
                  </View>
                  <Text numberOfLines={1} style={styles.muted}>{t("tap_view")}</Text>
                </View>
                <HeartButton mealId={item.meal.idMeal} style={{ alignSelf: "center", marginLeft: 6 }} />
              </View>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

// NEW - Stats screen
function StatsScreen() {
  const [views7, setViews7] = useState(0);
  const [unique, setUnique] = useState(0);
  const [favCount, setFavCount] = useState(0);

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.USAGE_LOG);
      const events: UsageEvent[] = raw ? JSON.parse(raw) : [];
      const recent = events.filter((e) => e.type === "view" && withinLastDays(e.ts, 7));
      setViews7(recent.length);
      setUnique(new Set(recent.map((e: any) => e.mealId)).size);

      const favs = await getFavoriteIds();
      setFavCount(favs.length);
    })();
  }, []);

  return (
    <SafeAreaView style={[styles.screen, { flex: 1 }]}>
      <Text style={styles.h1}>Your Weekly Stats</Text>
      <View style={styles.card}><Text style={styles.cardTitle}>Views (7d)</Text><Text>{views7}</Text></View>
      <View style={styles.card}><Text style={styles.cardTitle}>Unique recipes</Text><Text>{unique}</Text></View>
      <View style={styles.card}><Text style={styles.cardTitle}>Favorites total</Text><Text>{favCount}</Text></View>
    </SafeAreaView>
  );
}


// NEW - get top liked areas/types from user behavior
async function personalizedSeeds(): Promise<{ areas: string[]; categories: string[] }> {
  const favIds = await getFavoriteIds();
  const favs = (await Promise.all(favIds.map(id => getMealById(id)))).filter((m): m is Meal => !!m);
  const hist = await getHistory();

  const histMeals = (await Promise.all(hist.map(async h => await getMealById(h.mealId))))
    .filter((m): m is Meal => !!m);

  // helper to count most frequent strings
  const topStrings = (arr: (string | null | undefined)[]) => {
    const m = new Map<string, number>();
    for (const v of arr) {
      if (!v) continue;
      m.set(v, (m.get(v) || 0) + 1);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k);
  };

  const areas = topStrings([
    ...favs.map(f => f.strArea),
    ...histMeals.map(m => m.strArea),
  ]).slice(0, 3);

  const categories = topStrings([
    ...favs.map(f => f.strCategory),
    ...histMeals.map(m => m.strCategory),
  ]).slice(0, 3);

  return { areas, categories };
}




// NEW - parse "Bake for 20 minutes" -> 20
function parseStepMinutes(text: string): number | null {
  const s = text.toLowerCase();
  // common patterns: "for 20 min", "20 minutes", "bake 15-20 minutes"
  let m = s.match(/(\d+)\s*-\s*(\d+)\s*min/);
  if (m) return parseInt(m[2], 10);
  m = s.match(/(\d+)\s*(?:minutes|minute|min)\b/);
  if (m) return parseInt(m[1], 10);
  return null;
}



// NEW - Cook Mode (step-by-step)

function CookModeScreen({ route, navigation }: any) {
  const { meal } = route.params as { meal: Meal };
  const steps = normalizeSteps(meal.strInstructions);
  const [i, setI] = useState(0);

  const say = (text: string) => {
    try { Speech.speak(text, { rate: 1.0 }); } catch {}
  };

  useEffect(() => { if (steps[i]) say(steps[i]); }, [i]);

  const current = steps[i] || "";
  const mins = parseStepMinutes(current);
  const atLast = i >= Math.max(steps.length - 1, 0);

  return (
    <SafeAreaView style={[styles.screen, { flex: 1 }]}>
      {/* ... other UI ... */}
      <View style={{ flexDirection: "row", marginTop: 12 }}>
        <TouchableOpacity
          onPress={() => setI(Math.max(0, i - 1))}
          style={[styles.btn, { flex: 1, backgroundColor: "#6b7280", marginRight: 8 }]}
        >
          <Text style={styles.btnText}>Previous</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            if (atLast) {
              Alert.alert("Done", "All steps completed.");
              navigation.goBack?.();
              return;
            }
            setI(i + 1);
          }}
          style={[styles.btn, { flex: 1 }]}
        >
          <Text style={styles.btnText}>{atLast ? "Finish" : "Next"}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
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
        tabBarIcon: ({ color, size = 20 }) => {
          const iconName =
            route.name === "Search"
              ? ("search-outline" as const)
              : ("flame-outline" as const); // Top
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarLabelStyle: { fontWeight: "600" },
      })}
    >
      <Tabs.Screen
        name="Search"
        component={SearchScreen}
        options={{ title: t("search"), tabBarLabel: t("search") }}
      />
      <Tabs.Screen
        name="Top"
        component={TopScreen}
        options={{ title: t("top") ?? "Top", tabBarLabel: t("top") ?? "Top" }}
      />
    </Tabs.Navigator>
  );
}



function HeaderAvatar({ navigation }: any) {
  const { user } = useAuth();
  if (!user) return null;

  const src = user.photoURL || undefined;
  return (
    <TouchableOpacity
      onPress={() => navigation.navigate("Profile")}
      style={{ marginRight: 12 }}
    >
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
            {(user.displayName || user.email || "?")
              .substring(0, 1)
              .toUpperCase()}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

function HeaderActions({ navigation }: any) {
  const quickButtons = [
    {
      key: "favorites",
      label: "Favorites",
      onPress: () => navigation.navigate("Favorites"),
      renderIcon: () => <Ionicons name="heart-outline" size={18} color="#111827" />,
    },
    {
      key: "history",
      label: "History",
      onPress: () => navigation.navigate("History"),
      renderIcon: () => <MaterialCommunityIcons name="history" size={18} color="#111827" />,
    },
    // NEW
    {
      key: "shopping",
      label: "List",
      onPress: () => navigation.navigate("ShoppingList"),
      renderIcon: () => <Ionicons name="cart-outline" size={18} color="#111827" />,
    },
    // (optional)
    // {
    //   key: "stats",
    //   label: "Stats",
    //   onPress: () => navigation.navigate("Stats"),
    //   renderIcon: () => <Ionicons name="stats-chart-outline" size={18} color="#111827" />,
    // },
  ];

  return (
    <View style={styles.headerActionsRow}>
      {quickButtons.map((btn) => (
        <TouchableOpacity
          key={btn.key}
          onPress={btn.onPress}
          style={styles.headerActionButton}
          accessibilityRole="button"
          accessibilityLabel={btn.label}
        >
          {btn.renderIcon()}
          <Text style={styles.headerActionText}>{btn.label}</Text>
        </TouchableOpacity>
      ))}
      <HeaderAvatar navigation={navigation} />
    </View>
  );
}


// ----------------- Styles -----------------
const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },
  screenCenter: { flex: 1, alignItems: "center", justifyContent: "center" },
  h1: { fontSize: 28, fontWeight: "700", marginVertical: 12 },
  h2: { fontSize: 20, fontWeight: "700", marginTop: 16, marginBottom: 8 },
  filterActions: { flexDirection: "row", alignItems: "center", marginTop: 12 },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  settingsItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
  },
  settingsIcon: { marginRight: 12 },
  settingsIconCombo: {
    width: 26,
    height: 26,
    marginRight: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  settingsIconOverlay: { position: "absolute" },
  settingsTitle: { fontSize: 18, fontWeight: "700" },
  headerActionsRow: { flexDirection: "row", alignItems: "center" },
  headerActionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    marginRight: 8,
  },
  headerActionText: { marginLeft: 6, fontWeight: "600", color: "#111827" },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchRow: { flexDirection: "row", alignItems: "center" },
  filterBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#d1d5db",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
    backgroundColor: "#fff",
  },
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
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#9ca3af",
    marginRight: 8,
  },
  checkboxChecked: { backgroundColor: "#111827", borderColor: "#111827" },

  suggestionBox: {
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    marginVertical: 8,
    padding: 8,
  },
  suggestionRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 6,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  suggestionImg: { width: 40, height: 40, borderRadius: 6, marginRight: 10 },
  suggestionText: { fontSize: 16 },

  recentBox: { marginTop: 8 },
  recentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
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
    // --- Filter panel styles ---
    // --- Filter panel styles ---
  filterPanel: {
    marginTop: 12,
    backgroundColor: "white",
    borderRadius: 16,
    padding: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    borderWidth: Platform.OS === "web" ? 1 : 0,
    borderColor: "#e5e7eb",
  },
  filterTitle: { fontSize: 18, fontWeight: "700", marginBottom: 8 },
  filterGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -6,
  },
  filterField: {
    width: Platform.OS === "web" ? "33.3333%" : "100%",
    paddingHorizontal: 6,
    marginBottom: 10,
  },
  filterLabel: { fontWeight: "700", marginBottom: 6 },
  pickerWrap: {
    height: 44,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    backgroundColor: "white",
    justifyContent: "center",
    paddingHorizontal: 6,
  },

});


