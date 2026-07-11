/* oxlint-disable eslint-plugin-react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  BrowserRouter,
  Navigate,
  NavLink,
  Route,
  Routes,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  BookOpen,
  ChefHat,
  CircleUserRound,
  Heart,
  Home,
  LogOut,
  Moon,
  Plus,
  Search,
  ShoppingBasket,
  Sparkles,
  Sun,
  Trash2,
  Calendar,
  ChevronRight,
  ChevronLeft,
  X,
  Clock,
  PlusCircle,
  AlertTriangle,
  FileText,
  Video,
  Globe,
  Mic,
  Tag,
  Camera,
} from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import { supabase, supabaseConfigured } from "./lib/supabase";
import { consolidateIngredients, type IngredientInput } from "./lib/shopping";
import {
  deleteLocalRecipe,
  getLocalRecipe,
  getLocalRecipes,
  saveLocalRecipe,
} from "./lib/local-store";
import { LoadingOverlay, ToastViewport } from "./components/feedback";
import { notify } from "./components/feedback-events";
import { RecipeTools } from "./components/recipe-tools";
import { OrganizerPage } from "./pages/OrganizerPage";
import { PlanningPage } from "./pages/PlanningPage";
import { CookModePage } from "./pages/CookModePage";
import { SharedRecipePage } from "./pages/SharedRecipePage";
import { readableQuantity, scaleQuantity } from "./lib/product";
import { ConfirmDialog, BottomSheet, LoadingButton, PromptDialog } from "./components/ui";
import { PantrySuggestions } from "./components/pantry-suggestions";
import { PwaUpdateBanner } from "./components/pwa-update-banner";
import "./index.css";



type Recipe = {
  id: string;
  title: string;
  description: string | null;
  servings: number | null;
  status: string;
  source_platform: string | null;
  source_url?: string | null;
  is_favorite?: boolean;
  created_at: string;
  recipe_ingredients?: Ingredient[];
  recipe_steps?: Step[];
};

type Ingredient = IngredientInput & {
  id: string;
  quantity_text: string | null;
  unit?: string | null;
  notes: string | null;
  sector: string;
  position: number;
};

type Step = { id: string; instruction: string; position: number };

// Context for global state sharing (jobs, active list, theme)
type AppContextType = {
  session: Session | null;
  activeJobs: any[];
  startImport: (type: "url" | "text" | "audio", content: string, file: File | null, title?: string) => Promise<void>;
  activeList: any;
  setActiveList: React.Dispatch<React.SetStateAction<any>>;
  fetchActiveList: () => Promise<void>;
  theme: string;
  setTheme: (theme: string) => void;
};

const AppContext = createContext<AppContextType | null>(null);

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp deve ser usado dentro de AppContextProvider");
  return ctx;
}

function monday(date = new Date()) {
  const copy = new Date(date);
  const day = (copy.getDay() + 6) % 7;
  copy.setDate(copy.getDate() - day);
  return copy.toISOString().slice(0, 10);
}

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(!supabaseConfigured);
  const [activeJobs, setActiveJobs] = useState<any[]>([]);
  const [activeList, setActiveList] = useState<any>(null);
  const [theme, setTheme] = useState(localStorage.getItem("kooki-theme") ?? "system");

  useEffect(() => {
    localStorage.setItem("kooki-theme", theme);
    document.documentElement.classList.toggle(
      "dark",
      theme === "dark" ||
        (theme === "system" && matchMedia("(prefers-color-scheme: dark)").matches),
    );
  }, [theme]);

  const fetchActiveList = async () => {
    if (!supabase) return;
    const { data } = await supabase
      .from("shopping_lists")
      .select("*, shopping_list_items(*)")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (data) {
      // Sort list items by position
      data.shopping_list_items.sort((a: any, b: any) => a.position - b.position);
    }
    setActiveList(data ?? null);
  };

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  // Fetch active jobs and listen to postgres changes
  useEffect(() => {
    if (!session) return;
    
    const fetchActiveJobs = async () => {
      const { data } = await supabase!
        .from("recipe_import_jobs")
        .select("*")
        .in("status", [
          "pending",
          "validating",
          "checking_limit",
          "checking_cache",
          "extracting",
          "transcribing",
          "structuring",
          "validating_output",
          "saving"
        ])
        .order("created_at", { ascending: false });
      setActiveJobs(data ?? []);
    };

    void fetchActiveJobs();
    void fetchActiveList();

    const channel = supabase!.channel("import-jobs-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "recipe_import_jobs" }, (payload) => {
        const job = payload.new as any;
        if (payload.eventType === "INSERT") {
          setActiveJobs(prev => [job, ...prev]);
        } else if (payload.eventType === "UPDATE") {
          if (["completed", "failed", "cancelled", "needs_review", "needs_manual_input"].includes(job.status)) {
            setActiveJobs(prev => prev.filter(j => j.id !== job.id));
            if (job.status === "completed") {
              notify("success", "Receita importada com sucesso!", "Ela já está no seu acervo.");
            } else if (job.status === "needs_review") {
              notify("info", "Receita requer revisão", "Vá até Organizar para revisar.");
            } else if (job.status === "failed") {
              notify("error", "Falha na importação", job.error_message || "Tente novamente ou use texto manual.");
            }
          } else {
            setActiveJobs(prev => prev.map(j => j.id === job.id ? job : j));
          }
        }
      })
      .subscribe();

    return () => {
      void supabase?.removeChannel(channel);
    };
  }, [session]);

  const startImport = async (type: "url" | "text" | "audio", content: string, file: File | null, title?: string) => {
    if (!supabase) {
      notify("error", "Offline", "Apenas salvamento local disponível");
      return;
    }

    try {
      let audioPath: string | undefined;
      if (type === "audio" && file) {
        notify("info", "Enviando arquivo...", file.name);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Sessão inválida. Faça login novamente.");
        
        const path = `${user.id}/${crypto.randomUUID()}-${file.name.replace(/[^\w.-]+/g, "-")}`;
        const { data: signed, error: signError } = await supabase.storage
          .from("recipe-audio")
          .createSignedUploadUrl(path);
        
        if (signError) throw signError;
        
        const { error: uploadError } = await supabase.storage
          .from("recipe-audio")
          .uploadToSignedUrl(path, signed.token, file, {
            contentType: file.type || "application/octet-stream",
          });
        
        if (uploadError) throw uploadError;
        audioPath = path;
      }

      notify("info", "Iniciando processamento", "Sua receita está sendo organizada pela IA.");
      
      const { data, error: invokeError } = await supabase.functions.invoke(
        "import-recipe",
        {
          body: {
            inputType: type,
            sourceUrl: type === "url" ? content : null,
            rawText: type === "text" ? content : null,
            storagePath: audioPath,
            title: title || null,
          },
        },
      );

      if (invokeError) throw invokeError;
      
      const result = data as { success?: boolean; job_id?: string };
      if (!result.success || !result.job_id) {
        throw new Error("Não foi possível registrar o job.");
      }

    } catch (err: any) {
      console.error(err);
      notify("error", "Erro ao iniciar importação", err.message || "Tente novamente.");
    }
  };

  if (!ready) return <State title="Preparando sua cozinha…" />;

  return (
    <AppContext.Provider value={{ session, activeJobs, startImport, activeList, setActiveList, fetchActiveList, theme, setTheme }}>
      <BrowserRouter>
        <Routes>
          <Route path="/compartilhada/:token" element={<SharedRecipePage />} />
          <Route
            path="/login"
            element={session ? <Navigate to="/" /> : <Login />}
          />
          <Route
            path="/*"
            element={
              session || !supabaseConfigured ? (
                <Shell session={session} />
              ) : (
                <Navigate to="/login" />
              )
            }
          />
        </Routes>
      </BrowserRouter>
      <PwaUpdateBanner />
      <ToastViewport />
    </AppContext.Provider>
  );
}

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState("Entrando…");

  async function run(
    title: string,
    action: () => Promise<{ error: Error | null }>,
    success: string,
  ) {
    setBusy(true);
    setStage(title);
    const { error } = await action();
    setBusy(false);
    if (error) notify("error", "Não foi possível continuar", error.message);
    else notify("success", success);
  }

  async function signUp() {
    if (!supabase) return;
    await run(
      "Criando sua conta…",
      async () => {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: location.origin },
        });
        return { error };
      },
      "Conta criada. Verifique seu e-mail.",
    );
  }

  async function passwordLogin() {
    if (!supabase) return;
    await run(
      "Entrando na sua cozinha…",
      async () => {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        return { error };
      },
      "Login realizado",
    );
  }

  async function magic() {
    if (!supabase) return;
    await run(
      "Enviando link seguro…",
      async () => {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: location.origin },
        });
        return { error };
      },
      "Magic Link enviado",
    );
  }

  async function google() {
    setBusy(true);
    setStage("Abrindo o Google…");
    const { error } = await supabase!.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: location.origin },
    });
    if (error) {
      setBusy(false);
      notify("error", "Falha no login com Google", error.message);
    }
  }

  return (
    <main className="login">
      <div className="brand mb-6 text-3xl font-bold flex justify-center">
        <ChefHat /> Kooki
      </div>
      <section className="auth-card">
        <span className="eyebrow">SEU LIVRO DE RECEITAS INTELIGENTE</span>
        <h1 className="text-2xl mb-4 font-serif font-bold text-text-primary">Organize o que você ama cozinhar.</h1>
        <p className="text-text-secondary text-sm mb-6">
          Transforme links, textos e áudios em receitas claras e listas de compras com inteligência artificial.
        </p>
        <button className="button w-full mb-3" disabled={busy} onClick={google}>
          Continuar com Google
        </button>
        <div className="divider text-xs text-text-secondary my-4">ou utilize seu e-mail</div>
        <label className="mb-3">
          E-mail
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="voce@exemplo.com"
          />
        </label>
        <label className="mb-4">
          Senha
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            placeholder="Mínimo 8 caracteres"
          />
        </label>
        <div className="flex flex-col gap-2">
          <button
            className="button"
            disabled={busy || !email || !password}
            onClick={passwordLogin}
          >
            Entrar
          </button>
          <button
            className="button secondary"
            disabled={busy || !email || password.length < 8}
            onClick={signUp}
          >
            Criar conta
          </button>
          <button
            className="button secondary text-xs py-1 min-h-0"
            disabled={busy || !email}
            onClick={magic}
          >
            Receber link por e-mail (Magic Link)
          </button>
        </div>
        <small className="block text-center text-[10px] text-text-secondary mt-6">
          Ao continuar, você aceita nossos Termos e Política de Privacidade.
        </small>
      </section>
      <LoadingOverlay open={busy} title={stage} />
    </main>
  );
}

function Shell({ session }: { session: Session | null }) {
  const [logoutConfirm, setLogoutConfirm] = useState(false);
  const navigate = useNavigate();

  async function logout() {
    setLogoutConfirm(false);
    await supabase?.auth.signOut();
    notify("success", "Sessão encerrada");
    navigate("/login");
  }

  return (
    <div className="shell">
      {/* Desktop Sidebar */}
      <aside>
        <div className="brand mb-4">
          <ChefHat /> Kooki
        </div>
        <div className="nav-list">
          <Navigation />
        </div>
        <button className="nav logout" onClick={() => setLogoutConfirm(true)}>
          <LogOut /> Sair
        </button>
      </aside>

      {/* Main Content Area */}
      <main className="content">
        <Routes>
          <Route index element={<Dashboard />} />
          <Route path="receitas" element={<Recipes />} />
          <Route path="receitas/nova" element={<RecipeEditor />} />
          <Route path="receitas/:id" element={<RecipeDetail />} />
          <Route path="receitas/:id/cozinha" element={<CookModePage />} />
          <Route path="organizar" element={<OrganizerPage />} />
          <Route path="planejamento" element={<PlanningPage />} />
          <Route path="compras" element={<Shopping />} />
          <Route path="perfil" element={<Profile session={session} />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>

      {/* Mobile Bottom Bar */}
      <nav className="bottom pb-safe">
        <Navigation />
      </nav>

      {/* Reusable Confirm Dialog for Logout */}
      <ConfirmDialog
        isOpen={logoutConfirm}
        title="Sair do Kooki"
        description="Tem certeza que deseja encerrar sua sessão?"
        confirmLabel="Sair"
        cancelLabel="Permanecer"
        isDestructive={true}
        onConfirm={logout}
        onCancel={() => setLogoutConfirm(false)}
      />
    </div>
  );
}

function Navigation() {
  return (
    <>
      <NavLink className="nav" to="/" end>
        <Home />
        <span>Início</span>
      </NavLink>
      <NavLink className="nav" to="/receitas">
        <BookOpen />
        <span>Receitas</span>
      </NavLink>
      <NavLink className="nav" to="/compras">
        <ShoppingBasket />
        <span>Compras</span>
      </NavLink>
      <NavLink className="nav" to="/planejamento">
        <Calendar />
        <span>Planejar</span>
      </NavLink>
      <NavLink className="nav" to="/perfil">
        <CircleUserRound />
        <span>Perfil</span>
      </NavLink>
    </>
  );
}

// 1. DYNAMIC PREMIUM HOME DASHBOARD
function Dashboard() {
  const navigate = useNavigate();
  const { activeJobs, startImport, activeList } = useApp();
  
  const [usage, setUsage] = useState(0);
  const [reviews, setReviews] = useState(0);
  const [categories, setCategories] = useState<any[]>([]);
  const [favorites, setFavorites] = useState<Recipe[]>([]);
  const [urlInput, setUrlInput] = useState("");
  const [importing, setImporting] = useState(false);
  const [todayItems, setTodayItems] = useState<any[]>([]);

  // Time-based greeting helper
  const greeting = useMemo(() => {
    const hours = new Date().getHours();
    if (hours < 12) return "Bom dia";
    if (hours < 18) return "Boa tarde";
    return "Boa noite";
  }, []);

  const loadDashboardData = async () => {
    if (!supabase) return;
    
    // Usage
    const { data: usageVal } = await supabase.rpc("get_monthly_usage");
    setUsage(Number(usageVal ?? 0));

    // Reviews count
    const { count } = await supabase
      .from("recipe_import_jobs")
      .select("*", { count: "exact", head: true })
      .in("status", ["needs_review", "needs_manual_input", "failed"]);
    setReviews(count ?? 0);

    // Categories
    const { data: catRows } = await supabase
      .from("categories")
      .select("id,name,icon,recipe_categories(count)")
      .order("position")
      .limit(6);
    setCategories(catRows ?? []);

    // Favorites
    const { data: favRows } = await supabase
      .from("recipes")
      .select("*")
      .eq("is_favorite", true)
      .neq("status", "archived")
      .order("created_at", { ascending: false })
      .limit(4);
    setFavorites(favRows ?? []);

    // Today's meal plan
    const jsDay = new Date().getDay();
    const currentDayIndex = jsDay === 0 ? 6 : jsDay - 1; // Mon=0, Sun=6
    const { data: plan } = await supabase
      .from("meal_plans")
      .select("id")
      .eq("week_start", monday())
      .maybeSingle();

    if (plan) {
      const { data: items } = await supabase
        .from("meal_plan_items")
        .select("*,recipes(title)")
        .eq("meal_plan_id", plan.id)
        .eq("day_of_week", currentDayIndex);
      setTodayItems(items ?? []);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Detect URL platform helper
  const platform = useMemo(() => {
    const url = urlInput.trim().toLowerCase();
    if (url.includes("instagram.com")) return "instagram";
    if (url.includes("tiktok.com")) return "tiktok";
    if (url.includes("youtube.com") || url.includes("youtu.be")) return "youtube";
    if (url.startsWith("http://") || url.startsWith("https://")) return "generic";
    return "";
  }, [urlInput]);

  async function handleQuickImport(e: React.FormEvent) {
    e.preventDefault();
    if (!urlInput.trim()) return;
    setImporting(true);
    await startImport("url", urlInput.trim(), null);
    setUrlInput("");
    setImporting(false);
  }

  const mealLabels: Record<string, string> = {
    breakfast: "Café da Manhã",
    lunch: "Almoço",
    snack: "Lanche",
    dinner: "Jantar",
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto">
      {/* Greeting and Header */}
      <header className="page-header flex flex-col items-start gap-1">
        <span className="eyebrow">{greeting}, COZINHEIRO(A)</span>
        <h1 className="text-3xl font-serif font-bold text-text-primary">O que vamos preparar hoje?</h1>
      </header>

      {/* PLATFORM-DETECTING QUICK IMPORT BAR */}
      <section className="bg-surface border border-border p-5 rounded-2xl shadow-sm flex flex-col gap-4">
        <h3 className="text-base font-serif font-semibold">Importar de Link</h3>
        <form onSubmit={handleQuickImport} className="flex gap-2 items-center">
          <div className="relative flex-grow">
            <input
              type="text"
              placeholder="Cole o link (Instagram, TikTok, YouTube ou Blog)..."
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              className="pl-10 pr-10"
              disabled={importing}
            />
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center text-text-secondary">
              {platform === "instagram" && <Video className="w-5 h-5 text-pink-500 animate-pulse" />}
              {platform === "tiktok" && <Video className="w-5 h-5 text-black dark:text-white animate-pulse" />}
              {platform === "youtube" && <Video className="w-5 h-5 text-red-500 animate-pulse" />}
              {platform === "generic" && <Globe className="w-5 h-5 text-blue-500 animate-pulse" />}
              {!platform && <Search className="w-5 h-5" />}
            </div>
            {urlInput && (
              <button
                type="button"
                onClick={() => setUrlInput("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary p-0.5"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <LoadingButton type="submit" loading={importing} disabled={!urlInput || !platform}>
            Organizar
          </LoadingButton>
        </form>
        {platform && (
          <p className="text-[11px] text-text-secondary flex items-center gap-1.5 font-medium">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            Link de {platform === "generic" ? "Blog/Site" : platform} reconhecido! A IA vai estruturar a receita.
          </p>
        )}
      </section>

      {/* QUICK ACTIONS ROW */}
      <section>
        <h2 className="text-lg mb-3">Ações rápidas</h2>
        <div className="quick">
          <button onClick={() => navigate("/receitas/nova?mode=manual")}>
            <Plus />
            Criar Manual
          </button>
          <button onClick={() => navigate("/receitas/nova?mode=audio")}>
            <Mic />
            Áudio ou Vídeo
          </button>
          <button onClick={() => navigate("/receitas/nova?mode=text")}>
            <FileText />
            Colar Texto
          </button>
          <button onClick={() => navigate("/planejamento")}>
            <Calendar />
            Organizar Semana
          </button>
          <button onClick={() => navigate("/compras")}>
            <ShoppingBasket />
            Lista de Compras
          </button>
        </div>
      </section>

      {/* BACKGROUND JOBS IN PROGRESS */}
      {activeJobs.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg">Processando em segundo plano</h2>
          <div className="flex flex-col gap-3">
            {activeJobs.map((job) => (
              <div key={job.id} className="p-4 bg-surface-muted border border-border rounded-xl flex items-center justify-between">
                <div className="flex-grow pr-4">
                  <div className="flex justify-between items-center mb-1">
                    <strong className="text-sm font-semibold capitalize flex items-center gap-2">
                      <Clock className="w-4 h-4 text-primary animate-spin" />
                      Importando {job.source_platform || "Receita"}
                    </strong>
                    <span className="text-xs text-primary font-bold">Processando</span>
                  </div>
                  <p className="text-xs text-text-secondary">{job.current_stage || "Preparando..."}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* NEEDS REVIEW BANNER */}
      {reviews > 0 && (
        <button
          className="review-banner flex items-center justify-between p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-xl text-amber-800 dark:text-amber-300 font-medium text-sm text-left hover:scale-[1.01]"
          onClick={() => navigate("/organizar?tab=imports")}
        >
          <span className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            Você tem {reviews} importação(ões) que precisam de revisão manual.
          </span>
          <span className="font-semibold underline flex items-center">Revisar <ChevronRight className="w-4 h-4" /></span>
        </button>
      )}

      {/* TODAY'S PLAN */}
      <section className="bg-surface border border-border p-5 rounded-2xl shadow-sm">
        <h2 className="text-lg mb-3">Para cozinhar hoje</h2>
        {todayItems.length === 0 ? (
          <div className="text-center py-4 text-text-secondary text-sm">
            Nenhuma refeição planejada para hoje.
            <NavLink to="/planejamento" className="text-primary font-semibold block mt-1 hover:underline">
              Planejar refeições →
            </NavLink>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {todayItems.map((item) => (
              <div key={item.id} className="flex justify-between items-center p-3 bg-surface-muted rounded-xl">
                <div>
                  <span className="text-[10px] text-primary font-bold uppercase">{mealLabels[item.meal_type] || item.meal_type}</span>
                  <strong className="block text-sm text-text-primary mt-0.5">{item.recipes?.title || item.manual_name}</strong>
                </div>
                {item.recipe_id && (
                  <NavLink to={`/receitas/${item.recipe_id}`} className="button secondary px-3 py-1.5 min-h-0 text-xs font-semibold">
                    Ver Receita
                  </NavLink>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ACTIVE SHOPPING LIST STATUS */}
      <section className="bg-surface border border-border p-5 rounded-2xl shadow-sm">
        <h2 className="text-lg mb-3">Lista de compras ativa</h2>
        {activeList ? (
          <NavLink to="/compras" className="block text-decoration-none color-inherit hover:scale-[1.01]">
            <div className="flex justify-between items-center mb-2">
              <strong className="text-sm font-serif font-bold text-text-primary">{activeList.name}</strong>
              <span className="text-xs text-primary font-bold">
                {activeList.shopping_list_items?.filter((i: any) => i.checked).length ?? 0} de {activeList.shopping_list_items?.length ?? 0} itens
              </span>
            </div>
            <div className="w-full bg-surface-muted h-2.5 rounded-full overflow-hidden mb-1">
              <div
                className="bg-primary h-full rounded-full transition-all duration-300"
                style={{
                  width: `${
                    activeList.shopping_list_items?.length > 0
                      ? ((activeList.shopping_list_items.filter((i: any) => i.checked).length) /
                          activeList.shopping_list_items.length) *
                        100
                      : 0
                  }%`,
                }}
              />
            </div>
            <span className="text-xs text-text-secondary">Toque para ver a lista completa.</span>
          </NavLink>
        ) : (
          <div className="text-center py-4 text-text-secondary text-sm">
            Nenhuma lista ativa.
            <NavLink to="/compras" className="text-primary font-semibold block mt-1 hover:underline">
              Criar lista de compras →
            </NavLink>
          </div>
        )}
      </section>

      {/* CATEGORIES */}
      {categories.length > 0 && (
        <section>
          <h2 className="text-lg mb-3">Categorias</h2>
          <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => navigate(`/receitas?category=${c.id}`)}
                className="flex items-center gap-2 px-4 py-3 bg-surface border border-border rounded-xl shadow-sm hover:border-primary whitespace-nowrap"
              >
                <ChefHat className="w-4 h-4 text-primary" />
                <span className="text-xs font-semibold text-text-primary">{c.name}</span>
                <span className="text-[10px] text-text-secondary">({c.recipe_categories?.[0]?.count ?? 0})</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* FAVORITE RECIPES */}
      {favorites.length > 0 && (
        <section>
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg">Receitas favoritas</h2>
            <NavLink to="/receitas?favorites=true" className="text-xs text-primary font-bold hover:underline">Ver todas</NavLink>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {favorites.map((recipe) => (
              <NavLink
                to={`/receitas/${recipe.id}`}
                key={recipe.id}
                className="flex items-center gap-3 p-3 bg-surface border border-border rounded-xl hover:border-primary text-decoration-none color-inherit transition shadow-sm"
              >
                <div className="w-12 h-12 bg-surface-muted rounded-lg flex items-center justify-center text-primary flex-shrink-0">
                  <ChefHat className="w-6 h-6" />
                </div>
                <div className="truncate">
                  <strong className="block text-sm text-text-primary font-semibold truncate">{recipe.title}</strong>
                  <span className="text-[10px] text-text-secondary capitalize">{recipe.source_platform || "manual"}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-text-secondary ml-auto flex-shrink-0" />
              </NavLink>
            ))}
          </div>
        </section>
      )}

      {/* PANTRY SUGGESTIONS BANNER */}
      <PantrySuggestions />

      {/* ACCOUNT LIMIT / PROGRESS */}
      <section className="usage">
        <div>
          <span className="text-sm text-text-primary font-bold block">Plano gratuito</span>
          <span className="text-xs text-text-secondary">Limite de importações mensais por IA</span>
        </div>
        <strong>{usage} / 15</strong>
        <progress max="15" value={usage} />
      </section>
    </div>
  );
}

// 2. RECIPES LIST WITH SLIDING BOTTOM SHEETS FOR FILTERS ON MOBILE
function Recipes() {
  type RichRecipe = Recipe & {
    recipe_ingredients?: Array<Ingredient & { name: string }>;
    recipe_categories?: Array<{ category_id: string }>;
    recipe_tags?: Array<{ tag_id: string }>;
  };
  
  type Category = {
    id: string;
    name: string;
    icon?: string;
    recipe_categories?: Array<{ count: number }>;
  };

  type Tag = {
    id: string;
    name: string;
  };

  const [items, setItems] = useState<RichRecipe[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"all" | "categories">("all");
  const [favorites, setFavorites] = useState(() => searchParams.get("favorites") === "true");
  const [selectedCategory, setSelectedCategory] = useState(() => searchParams.get("category") ?? "");
  const [selectedTag, setSelectedTag] = useState("");
  const [platform, setPlatform] = useState("");
  
  // Drawer state for mobile filters
  const [filterDrawer, setFilterDrawer] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setItems(getLocalRecipes());
      setLoading(false);
      return;
    }
    
    Promise.all([
      supabase
        .from("recipes")
        .select("*,recipe_ingredients(*),recipe_categories(category_id),recipe_tags(tag_id)")
        .neq("status", "archived")
        .order("created_at", { ascending: false }),
      supabase
        .from("categories")
        .select("id,name,icon,recipe_categories(count)")
        .order("position"),
      supabase
        .from("tags")
        .select("id,name")
        .order("name"),
    ]).then(([recipesResult, categoriesResult, tagsResult]) => {
      setItems((recipesResult.data as RichRecipe[]) ?? []);
      setCategories((categoriesResult.data as Category[]) ?? []);
      setTags((tagsResult.data as Tag[]) ?? []);
      setLoading(false);
    });
  }, []);


  const filtered = items.filter(
    (recipe) =>
      (!query ||
        recipe.title.toLowerCase().includes(query.toLowerCase()) ||
        recipe.recipe_ingredients?.some((item) =>
          item.name.toLowerCase().includes(query.toLowerCase()),
        )) &&
      (!favorites || recipe.is_favorite) &&
      (!platform || recipe.source_platform === platform) &&
      (!selectedCategory ||
        recipe.recipe_categories?.some((item) => item.category_id === selectedCategory)) &&
      (!selectedTag ||
        recipe.recipe_tags?.some((item) => item.tag_id === selectedTag)),
  );

  async function favorite(recipe: RichRecipe) {
    if (!supabase) return;
    const next = !recipe.is_favorite;
    
    // Optimistic Update
    setItems((values) =>
      values.map((item) => (item.id === recipe.id ? { ...item, is_favorite: next } : item)),
    );
    
    const { error } = await supabase
      .from("recipes")
      .update({ is_favorite: next })
      .eq("id", recipe.id);
      
    if (error) {
      // Rollback
      setItems((values) =>
        values.map((item) => (item.id === recipe.id ? { ...item, is_favorite: !next } : item)),
      );
      notify("error", "Erro ao atualizar favorito", error.message);
    } else {
      notify("success", next ? "Adicionada aos favoritos" : "Removida dos favoritos");
    }
  }

  const hasActiveFilters = query || platform || favorites || selectedCategory || selectedTag;

  function clearFilters() {
    setQuery("");
    setPlatform("");
    setFavorites(false);
    setSelectedCategory("");
    setSelectedTag("");
    setFilterDrawer(false);
  }

  const filterContent = (
    <div className="flex flex-col gap-4">
      <label>
        Origem do link
        <select value={platform} onChange={(e) => setPlatform(e.target.value)}>
          <option value="">Todas as origens</option>
          <option value="instagram">Instagram</option>
          <option value="tiktok">TikTok</option>
          <option value="youtube">YouTube</option>
          <option value="manual">Manual</option>
          <option value="blog">Blog/Site</option>
        </select>
      </label>

      <label>
        Categoria
        <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
          <option value="">Todas as categorias</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      <label>
        Tag
        <select value={selectedTag} onChange={(e) => setSelectedTag(e.target.value)}>
          <option value="">Todas as tags</option>
          {tags.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </label>

      <button
        className={`button secondary flex items-center justify-center gap-2 ${favorites ? "active" : ""}`}
        onClick={() => setFavorites((val) => !val)}
      >
        <Heart fill={favorites ? "currentColor" : "none"} className="w-4 h-4 text-primary" />
        Apenas Favoritas
      </button>

      {hasActiveFilters && (
        <button className="button danger mt-2" onClick={clearFilters}>
          Limpar todos os filtros
        </button>
      )}
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-5">
      <Header
        title="Minhas receitas"
        action={
          <NavLink className="button" to="/receitas/nova">
            <Plus />
            Adicionar
          </NavLink>
        }
      />

      <div className="tabs">
        <button className={view === "all" ? "active" : ""} onClick={() => setView("all")}>
          Todas
        </button>
        <button className={view === "categories" ? "active" : ""} onClick={() => setView("categories")}>
          Categorias
        </button>
      </div>

      {view === "categories" ? (
        <div className="category-grid">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => {
                setSelectedCategory(category.id);
                setView("all");
              }}
            >
              <ChefHat className="text-primary w-6 h-6" />
              <strong>{category.name}</strong>
              <span>{category.recipe_categories?.[0]?.count ?? 0} receitas</span>
            </button>
          ))}
        </div>
      ) : (
        <>
          {/* Filter Bar */}
          <div className="flex gap-2 items-center">
            <div className="relative flex-grow">
              <input
                className="search pl-10"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar por título ou ingrediente…"
              />
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary w-5 h-5" />
            </div>

            {/* Desktop Filters */}
            <div className="hidden md:flex gap-2">
              <select value={platform} onChange={(e) => setPlatform(e.target.value)} className="w-[160px]">
                <option value="">Origens</option>
                <option value="instagram">Instagram</option>
                <option value="tiktok">TikTok</option>
                <option value="youtube">YouTube</option>
                <option value="manual">Manual</option>
                <option value="blog">Blog</option>
              </select>
              <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="w-[160px]">
                <option value="">Categorias</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <select value={selectedTag} onChange={(e) => setSelectedTag(e.target.value)} className="w-[160px]">
                <option value="">Tags</option>
                {tags.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              <button
                className={`icon-button ${favorites ? "text-primary border-primary bg-primary/10" : ""}`}
                onClick={() => setFavorites((val) => !val)}
                aria-label="Filtrar favoritas"
              >
                <Heart fill={favorites ? "currentColor" : "none"} />
              </button>
              {hasActiveFilters && (
                <button className="button secondary px-3 min-h-0" onClick={clearFilters}>
                  Limpar
                </button>
              )}
            </div>

            {/* Mobile Filters Button */}
            <button className="md:hidden icon-button" onClick={() => setFilterDrawer(true)}>
              <Tag />
            </button>
          </div>

          {/* Active Chips Row */}
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-xs text-text-secondary font-semibold">Filtros ativos:</span>
              {query && (
                <span className="bg-surface-muted text-xs px-2.5 py-1 rounded-full border border-border flex items-center gap-1.5 text-text-primary">
                  Busca: "{query}" <X className="w-3 h-3 cursor-pointer" onClick={() => setQuery("")} />
                </span>
              )}
              {platform && (
                <span className="bg-surface-muted text-xs px-2.5 py-1 rounded-full border border-border flex items-center gap-1.5 text-text-primary capitalize">
                  Origem: {platform} <X className="w-3 h-3 cursor-pointer" onClick={() => setPlatform("")} />
                </span>
              )}
              {selectedCategory && (
                <span className="bg-surface-muted text-xs px-2.5 py-1 rounded-full border border-border flex items-center gap-1.5 text-text-primary">
                  Cat: {categories.find((c) => c.id === selectedCategory)?.name}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedCategory("")} />
                </span>
              )}
              {favorites && (
                <span className="bg-surface-muted text-xs px-2.5 py-1 rounded-full border border-border flex items-center gap-1.5 text-text-primary">
                  Favoritas <X className="w-3 h-3 cursor-pointer" onClick={() => setFavorites(false)} />
                </span>
              )}
              {selectedTag && (
                <span className="bg-surface-muted text-xs px-2.5 py-1 rounded-full border border-border flex items-center gap-1.5 text-text-primary">
                  Tag: {tags.find((t) => t.id === selectedTag)?.name || "Selecionada"} <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedTag("")} />
                </span>
              )}
              <button className="text-xs text-primary font-bold hover:underline" onClick={clearFilters}>
                Limpar todos
              </button>
            </div>
          )}

          {loading ? (
            <div className="skeleton-list">
              <i />
              <i />
              <i />
            </div>
          ) : filtered.length === 0 ? (
            <State title="Nenhuma receita encontrada" text="Tente mudar os filtros ou importe uma nova receita." />
          ) : (
            <div className="recipe-grid">
              {filtered.map((recipe) => (
                <article className="recipe-card" key={recipe.id}>
                  <NavLink className="recipe-card-link" to={`/receitas/${recipe.id}`}>
                    <div className="recipe-art">
                      <ChefHat />
                    </div>
                    <div className="recipe-card-content">
                      <span className="recipe-card-tag">{recipe.source_platform ?? "manual"}</span>
                      <h3>{recipe.title}</h3>
                      <p>{recipe.description ?? "Receita salva no seu acervo."}</p>
                    </div>
                  </NavLink>
                  <button
                    className={`favorite-card ${recipe.is_favorite ? "active" : ""}`}
                    aria-label={recipe.is_favorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                    onClick={() => favorite(recipe)}
                  >
                    <Heart fill={recipe.is_favorite ? "currentColor" : "none"} className="w-4 h-4" />
                    <span>{recipe.is_favorite ? "Favorita" : "Favoritar"}</span>
                  </button>
                </article>
              ))}
            </div>
          )}

          {/* Filter Drawer for Mobile */}
          <BottomSheet isOpen={filterDrawer} onClose={() => setFilterDrawer(false)} title="Filtrar Receitas">
            {filterContent}
          </BottomSheet>
        </>
      )}
    </div>
  );
}

// 3. RECIPE CREATION/IMPORT PAGE WITH DRAWER/SHEETS
function RecipeEditor() {
  const navigate = useNavigate();
  const { startImport } = useApp();
  const [mode, setMode] = useState<"manual" | "url" | "text" | "audio">("manual");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [media, setMedia] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (error) notify("error", "Não foi possível importar", error);
  }, [error]);

  async function save() {
    setBusy(true);
    setError("");

    if (!supabase) {
      if (mode === "audio") {
        setError("Áudio e vídeo requerem o backend Supabase.");
        setBusy(false);
        return;
      }
      try {
        const recipe = saveLocalRecipe({
          title,
          description: content,
          sourceUrl: mode === "url" ? content : undefined,
        });
        notify("success", "Receita salva localmente");
        navigate(`/receitas/${recipe.id}`);
      } catch {
        setError("Informe um link HTTP ou HTTPS válido.");
      }
      setBusy(false);
      return;
    }

    if (mode === "manual") {
      const { data, error: e } = await supabase
        .from("recipes")
        .insert({
          title: title.trim(),
          description: content.trim() || null,
          status: "ready",
          source_platform: "manual",
        })
        .select("id")
        .single();

      if (e) {
        setError(e.message);
      } else {
        notify("success", "Receita salva com sucesso!");
        navigate(`/receitas/${data.id}`);
      }
      setBusy(false);
    } else {
      try {
        await startImport(mode === "url" ? "url" : mode, content, media, title);
        notify("info", "Processamento em andamento", "Você pode navegar para outras páginas.");
        navigate("/");
      } catch (err: any) {
        setError(err.message || "Tente novamente.");
        setBusy(false);
      }
    }
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6">
      <Header title="Adicionar receita" />

      <div className="tabs">
        {(["manual", "url", "text", "audio"] as const).map((x) => (
          <button className={mode === x ? "active" : ""} onClick={() => setMode(x)} key={x}>
            {
              {
                manual: "Manual",
                url: "Link",
                text: "Texto",
                audio: "Áudio/Vídeo",
              }[x]
            }
          </button>
        ))}
      </div>

      <section className="form-card">
        <label>
          Título da receita
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex.: Bolo de cenoura da vovó"
          />
        </label>

        {mode !== "audio" && (
          <label>
            {mode === "url" ? "Link da receita" : "Ingredientes e modo de preparo"}
            <textarea
              rows={8}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={
                mode === "url"
                  ? "Cole o link completo aqui..."
                  : "Digite ou cole os ingredientes e instruções de preparo..."
              }
            />
          </label>
        )}

        {mode === "url" && (
          <p className="notice">
            Instagram, TikTok, YouTube: o Kooki baixa a mídia, transcreve e organiza a receita automaticamente usando inteligência artificial.
          </p>
        )}

        {mode === "audio" && (
          <>
            <label>
              Arquivo de áudio ou vídeo
              <input
                type="file"
                accept="audio/*,video/mp4,video/webm,video/quicktime"
                onChange={(e) => setMedia(e.target.files?.[0] ?? null)}
              />
            </label>
            <p className="notice">
              Formatos de vídeo ou áudio até 100 MB. O arquivo é mantido privado e deletado após a transcrição estruturada pela IA.
            </p>
          </>
        )}

        {error && <p className="error">{error}</p>}

        <LoadingButton
          loading={busy}
          disabled={busy || (!title && mode === "manual") || (mode === "audio" ? !media : !content)}
          onClick={save}
        >
          {mode === "manual" ? "Salvar receita" : "Importar e Organizar"}
        </LoadingButton>
      </section>
    </div>
  );
}

// 4. RECIPE DETAIL WITH SCALE PORTIONS AND COLLAPSIBLE ACCIDENT DETAILS
function RecipeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [recipe, setRecipe] = useState<Recipe | null>(() =>
    !supabase && id ? getLocalRecipe(id) : null,
  );
  const [targetServings, setTargetServings] = useState<number | null>(null);
  
  // Custom dialog state instead of window.confirm
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    supabase
      .from("recipes")
      .select("*,recipe_ingredients(*),recipe_steps(*)")
      .eq("id", id)
      .single()
      .then(({ data, error }) => {
        if (error) {
          notify("error", "Erro ao carregar receita", error.message);
        } else {
          const loaded = data as Recipe;
          setRecipe(loaded);
          setTargetServings(loaded.servings);
        }
      });
  }, [id]);

  if (!recipe) return <State title="Carregando receita…" />;

  async function remove() {
    setDeleteConfirm(false);
    if (supabase) {
      const { error } = await supabase.from("recipes").delete().eq("id", recipe.id);
      if (error) {
        notify("error", "Não foi possível excluir", error.message);
        return;
      }
    } else {
      deleteLocalRecipe(recipe.id);
    }
    notify("success", "Receita excluída");
    navigate("/receitas");
  }

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-4 pb-12">
      <Header
        title={recipe.title}
        action={
          <button
            className="icon-button danger"
            aria-label="Excluir receita"
            onClick={() => setDeleteConfirm(true)}
          >
            <Trash2 className="w-5 h-5" />
          </button>
        }
      />

      {recipe.status === "needs_review" && (
        <div className="notice mb-4">
          <AlertTriangle className="w-5 h-5" />
          Algumas informações parecem incompletas. Por favor, revise as etapas.
        </div>
      )}

      {recipe.description && <p className="text-text-secondary text-lg font-light italic">{recipe.description}</p>}

      {recipe.source_url && (
        <p className="text-sm">
          <a
            href={recipe.source_url}
            target="_blank"
            rel="noreferrer"
            className="text-primary font-semibold hover:underline flex items-center gap-1"
          >
            Ver conteúdo original <Globe className="w-4 h-4" />
          </a>
        </p>
      )}

      {/* Portions Adjuster */}
      {recipe.servings && (
        <div className="servings flex items-center justify-between">
          <span className="text-sm text-text-secondary font-semibold">Rendimento ajustado</span>
          <div className="flex items-center gap-4">
            <button
              onClick={() =>
                setTargetServings((value) => Math.max(1, (value ?? recipe.servings!) - 1))
              }
              aria-label="Diminuir porções"
            >
              −
            </button>
            <strong>{targetServings ?? recipe.servings} porções</strong>
            <button
              onClick={() => setTargetServings((value) => (value ?? recipe.servings!) + 1)}
              aria-label="Aumentar porções"
            >
              +
            </button>
            {targetServings !== recipe.servings && (
              <button
                className="text-xs text-primary font-bold border-none bg-transparent hover:underline cursor-pointer"
                onClick={() => setTargetServings(recipe.servings)}
              >
                Restaurar
              </button>
            )}
          </div>
        </div>
      )}

      {/* Ingredients and Method in Two Columns */}
      <div className="detail-grid">
        <section>
          <h2>Ingredientes</h2>
          {recipe.recipe_ingredients?.length ? (
            <ul className="check-list">
              {recipe.recipe_ingredients
                .sort((a, b) => a.position - b.position)
                .map((ingredient) => {
                  const adjusted = scaleQuantity(
                    ingredient.quantity,
                    recipe.servings,
                    targetServings,
                  );
                  return (
                    <li key={ingredient.id}>
                      <label>
                        <input type="checkbox" />
                        <span>
                          {adjusted !== null
                            ? `${readableQuantity(adjusted)} ${ingredient.unit ?? ""}`
                            : ingredient.quantity_text}{" "}
                          {ingredient.name}
                        </span>
                      </label>
                    </li>
                  );
                })}
            </ul>
          ) : (
            <State title="Nenhum ingrediente cadastrado." />
          )}
        </section>

        <section>
          <h2>Modo de preparo</h2>
          {recipe.recipe_steps?.length ? (
            <ol className="flex flex-col gap-4 list-decimal pl-4">
              {recipe.recipe_steps
                .sort((a, b) => a.position - b.position)
                .map((step) => (
                  <li key={step.id} className="pl-2 text-text-primary leading-relaxed text-sm">
                    {step.instruction}
                  </li>
                ))}
            </ol>
          ) : (
            <State title="Nenhuma etapa cadastrada." />
          )}
        </section>
      </div>

      <div className="flex gap-4 mt-6">
        <button
          className="button flex-grow"
          onClick={() => navigate(`/receitas/${recipe.id}/cozinha`)}
        >
          <ChefHat />
          Iniciar Modo Cozinha
        </button>
      </div>

      <RecipeTools
        recipeId={recipe.id}
        isFavorite={Boolean(recipe.is_favorite)}
        onFavorite={(value) =>
          setRecipe((current) => (current ? { ...current, is_favorite: value } : current))
        }
      />

      <ConfirmDialog
        isOpen={deleteConfirm}
        title="Excluir Receita"
        description="Tem certeza que deseja excluir esta receita definitivamente do seu acervo?"
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        isDestructive={true}
        onConfirm={remove}
        onCancel={() => setDeleteConfirm(false)}
      />
    </div>
  );
}

// 5. SHOPPING LIST CREATOR FLOW AND DETAILED ACTIVE LIST CHECKLIST
function Shopping() {
  const { activeList, setActiveList, fetchActiveList } = useApp();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  
  // Creation state
  const [creationStep, setCreationStep] = useState<"idle" | "select" | "review">("idle");
  const [selectedRecipes, setSelectedRecipes] = useState<string[]>([]);
  const [portionsOverride, setPortionsOverride] = useState<Record<string, number>>({});
  const [listName, setListName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Review & Edit state
  const [reviewItems, setReviewItems] = useState<any[]>([]);
  
  // Custom dialogs state
  const [concludeConfirm, setConcludeConfirm] = useState(false);
  const [editItemModal, setEditItemModal] = useState<any>(null);
  
  // Collapsible sectors
  const [collapsedSectors, setCollapsedSectors] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!supabase) return;
    supabase
      .from("recipes")
      .select("*, recipe_ingredients(*)")
      .eq("status", "ready")
      .then(({ data }) => {
        setRecipes((data as Recipe[]) ?? []);
      });
  }, []);

  // Filter recipes for selection list
  const filteredRecipes = recipes.filter(r => 
    r.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group active list items by sector
  const itemsBySector = useMemo(() => {
    if (!activeList || !activeList.shopping_list_items) return {};
    const grouped: Record<string, any[]> = {};
    activeList.shopping_list_items.forEach((item: any) => {
      const sec = item.sector || "Outros";
      if (!grouped[sec]) grouped[sec] = [];
      grouped[sec].push(item);
    });
    return grouped;
  }, [activeList]);

  // Portions handler for list creation
  function setRecipePortion(recipeId: string, value: number) {
    setPortionsOverride(prev => ({
      ...prev,
      [recipeId]: Math.max(1, value)
    }));
  }

  // Consolidation for review step
  function generateConsolidatedReview() {
    const rawIngredients: any[] = [];
    
    recipes.forEach(r => {
      if (selectedRecipes.includes(r.id)) {
        const factor = (portionsOverride[r.id] || r.servings || 1) / (r.servings || 1);
        const ingredients = r.recipe_ingredients ?? [];
        ingredients.forEach(ing => {
          rawIngredients.push({
            ...ing,
            quantity: ing.quantity ? ing.quantity * factor : null,
          });
        });
      }
    });

    const consolidated = consolidateIngredients(rawIngredients);
    
    // Add sector field based on original ingredient or fallback
    const reviewList = consolidated.map((entry, index) => {
      const orig = rawIngredients.find(ri => ri.normalized_name === entry.normalizedName);
      return {
        id: crypto.randomUUID(), // Temp client ID for keys/edits
        name: entry.name,
        normalized_name: entry.normalizedName,
        quantity: entry.quantity,
        unit: entry.unit,
        sector: orig?.sector || "Outros",
        position: index
      };
    });

    setReviewItems(reviewList);
    setListName(`Compras ${new Date().toLocaleDateString("pt-BR")}`);
    setCreationStep("review");
  }

  // Optimistic Toggle Check
  async function toggleCheck(itemId: string, currentChecked: boolean) {
    if (!supabase || !activeList) return;
    const nextChecked = !currentChecked;

    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(30);
    }

    // 1. Optimistic Update
    setActiveList((prev: any) => ({
      ...prev,
      shopping_list_items: prev.shopping_list_items.map((i: any) => 
        i.id === itemId ? { ...i, checked: nextChecked } : i
      )
    }));

    // 2. DB Update
    const { error } = await supabase
      .from("shopping_list_items")
      .update({ checked: nextChecked })
      .eq("id", itemId);

    if (error) {
      // Revert
      setActiveList((prev: any) => ({
        ...prev,
        shopping_list_items: prev.shopping_list_items.map((i: any) => 
          i.id === itemId ? { ...i, checked: currentChecked } : i
        )
      }));
      notify("error", "Erro ao salvar item", error.message);
    }
  }

  // Delete Item with Toast Undo Action
  async function deleteListItem(itemId: string) {
    if (!supabase || !activeList) return;
    const item = activeList.shopping_list_items.find((i: any) => i.id === itemId);
    if (!item) return;

    // 1. Optimistic remove
    setActiveList((prev: any) => ({
      ...prev,
      shopping_list_items: prev.shopping_list_items.filter((i: any) => i.id !== itemId)
    }));

    // 2. DB delete
    const { error } = await supabase
      .from("shopping_list_items")
      .delete()
      .eq("id", itemId);

    if (error) {
      // Revert
      setActiveList((prev: any) => ({
        ...prev,
        shopping_list_items: [...prev.shopping_list_items, item].sort((a,b) => a.position - b.position)
      }));
      notify("error", "Não foi possível deletar o item", error.message);
    } else {
      notify(
        "info",
        "Item removido da lista",
        undefined,
        "Desfazer",
        async () => {
          // Re-insert item
          const { data: restored, error: insertError } = await supabase!
            .from("shopping_list_items")
            .insert({
              shopping_list_id: activeList.id,
              name: item.name,
              normalized_name: item.normalized_name,
              quantity: item.quantity,
              unit: item.unit,
              sector: item.sector,
              checked: item.checked,
              position: item.position
            })
            .select()
            .single();

          if (insertError) {
            notify("error", "Erro ao desfazer exclusão", insertError.message);
          } else {
            setActiveList((prev: any) => ({
              ...prev,
              shopping_list_items: [...prev.shopping_list_items, restored].sort((a,b) => a.position - b.position)
            }));
            notify("success", "Item restaurado!");
          }
        }
      );
    }
  }

  // Edit list item (Quantity, Unit, Name, Sector)
  async function saveItemEdits(updatedItem: any) {
    if (!supabase) return;
    
    const { error } = await supabase
      .from("shopping_list_items")
      .update({
        name: updatedItem.name.trim(),
        quantity: updatedItem.quantity ? Number(updatedItem.quantity) : null,
        unit: updatedItem.unit.trim() || null,
        sector: updatedItem.sector
      })
      .eq("id", updatedItem.id);

    if (error) {
      notify("error", "Erro ao atualizar item", error.message);
    } else {
      notify("success", "Item atualizado!");
      setEditItemModal(null);
      await fetchActiveList();
    }
  }

  // Save the complete generated list
  async function saveGeneratedList() {
    if (!supabase || !reviewItems.length) return;
    
    // Create new list
    const { data: list, error: listError } = await supabase
      .from("shopping_lists")
      .insert({
        name: listName.trim() || "Lista de compras",
        status: "active"
      })
      .select()
      .single();

    if (listError || !list) {
      notify("error", "Erro ao gerar lista", listError?.message);
      return;
    }

    // Insert items
    const { error: itemsError } = await supabase
      .from("shopping_list_items")
      .insert(
        reviewItems.map((entry, index) => ({
          shopping_list_id: list.id,
          name: entry.name,
          normalized_name: entry.normalized_name,
          quantity: entry.quantity,
          unit: entry.unit,
          sector: entry.sector,
          position: index
        }))
      );

    if (itemsError) {
      notify("error", "Erro ao salvar itens da lista", itemsError.message);
    } else {
      notify("success", "Lista criada com sucesso!");
      setCreationStep("idle");
      await fetchActiveList();
    }
  }

  // Conclude active list
  async function concludeList() {
    if (!supabase || !activeList) return;
    setConcludeConfirm(false);

    const { error } = await supabase
      .from("shopping_lists")
      .update({ status: "archived" })
      .eq("id", activeList.id);

    if (error) {
      notify("error", "Erro ao concluir lista", error.message);
    } else {
      notify("success", "Lista concluída e arquivada.");
      setActiveList(null);
      await fetchActiveList();
    }
  }

  // Toggle sector collapsibles
  function toggleSector(sectorName: string) {
    setCollapsedSectors(prev => ({
      ...prev,
      [sectorName]: !prev[sectorName]
    }));
  }

  // Add custom manual item directly to active list
  const [newManualItem, setNewManualItem] = useState({ name: "", quantity: "", unit: "", sector: "Outros" });
  const [addManualDrawer, setAddManualDrawer] = useState(false);

  async function handleAddManualItem(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase || !activeList || !newManualItem.name.trim()) return;

    const { data, error } = await supabase
      .from("shopping_list_items")
      .insert({
        shopping_list_id: activeList.id,
        name: newManualItem.name.trim(),
        normalized_name: newManualItem.name.trim().toLowerCase(),
        quantity: newManualItem.quantity ? Number(newManualItem.quantity) : null,
        unit: newManualItem.unit.trim() || null,
        sector: newManualItem.sector,
        position: activeList.shopping_list_items.length
      })
      .select()
      .single();

    if (error) {
      notify("error", "Erro ao adicionar item", error.message);
    } else {
      notify("success", "Item adicionado!");
      setActiveList((prev: any) => ({
        ...prev,
        shopping_list_items: [...prev.shopping_list_items, data]
      }));
      setNewManualItem({ name: "", quantity: "", unit: "", sector: "Outros" });
      setAddManualDrawer(false);
    }
  }

  // Count items checked progress
  const checkedItemsCount = activeList?.shopping_list_items?.filter((i: any) => i.checked).length ?? 0;
  const totalItemsCount = activeList?.shopping_list_items?.length ?? 0;

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-6">
      {creationStep === "idle" && (
        <>
          <Header
            title="Lista de compras ativa"
            action={
              <button className="button" onClick={() => setCreationStep("select")}>
                <Plus /> Criar Lista
              </button>
            }
          />

          {activeList ? (
            <>
              {/* Progress Summary */}
              <section className="bg-surface border border-border p-4 rounded-xl shadow-sm">
                <div className="flex justify-between items-center mb-2">
                  <strong className="text-base font-serif font-bold text-text-primary">{activeList.name}</strong>
                  <span className="text-xs text-primary font-bold">{checkedItemsCount} de {totalItemsCount} comprados</span>
                </div>
                <div className="w-full bg-surface-muted h-3 rounded-full overflow-hidden mb-1">
                  <div
                    className="bg-primary h-full rounded-full transition-all duration-300"
                    style={{ width: `${totalItemsCount > 0 ? (checkedItemsCount / totalItemsCount) * 100 : 0}%` }}
                  />
                </div>
              </section>

              {/* Collapsible Sectors */}
              <div className="flex flex-col gap-4">
                {Object.keys(itemsBySector).map(sector => {
                  const collapsed = collapsedSectors[sector];
                  const sectorItems = itemsBySector[sector];
                  const checkedInSector = sectorItems.filter(i => i.checked).length;
                  
                  return (
                    <section key={sector} className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
                      <button
                        onClick={() => toggleSector(sector)}
                        className="w-full p-4 flex justify-between items-center bg-surface-muted border-b border-border text-left font-serif font-semibold text-text-primary hover:bg-surface-muted/80"
                      >
                        <span className="flex items-center gap-2">
                          {sector}
                          <span className="text-xs font-sans text-text-secondary">({checkedInSector} de {sectorItems.length})</span>
                        </span>
                        {collapsed ? <ChevronLeft /> : <ChevronDownIcon />}
                      </button>

                      {!collapsed && (
                        <ul className="shopping-list p-4">
                          {sectorItems.map(item => (
                            <li key={item.id} className="flex justify-between items-center border-b border-border py-3">
                              <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={item.checked}
                                  onChange={() => toggleCheck(item.id, item.checked)}
                                />
                                <span className={item.checked ? "line-through text-text-secondary" : "text-text-primary font-medium"}>
                                  {item.name}
                                </span>
                              </label>
                              
                              <div className="flex items-center gap-3">
                                {item.quantity && (
                                  <span className="qty text-sm text-primary font-bold">
                                    {readableQuantity(item.quantity)} {item.unit ?? ""}
                                  </span>
                                )}
                                <button
                                  className="text-text-secondary hover:text-primary"
                                  onClick={() => setEditItemModal(item)}
                                >
                                  <Edit3Icon className="w-4 h-4" />
                                </button>
                                <button
                                  className="text-text-secondary hover:text-destructive"
                                  onClick={() => deleteListItem(item.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </section>
                  );
                })}
              </div>

              {/* Bottom Sticky Action Panel */}
              <div className="flex gap-4 mt-4">
                <button className="button secondary flex-grow" onClick={() => setAddManualDrawer(true)}>
                  <PlusCircle className="w-4 h-4" /> Adicionar item manual
                </button>
                <button className="button flex-grow danger" onClick={() => setConcludeConfirm(true)}>
                  Concluir e Arquivar Lista
                </button>
              </div>

              {/* Modal/Drawer for adding manual item */}
              <BottomSheet isOpen={addManualDrawer} onClose={() => setAddManualDrawer(false)} title="Adicionar Item Manual">
                <form onSubmit={handleAddManualItem} className="flex flex-col gap-4">
                  <label>
                    Nome do item
                    <input
                      required
                      placeholder="Ex.: Creme de leite"
                      value={newManualItem.name}
                      onChange={(e) => setNewManualItem(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <label>
                      Quantidade
                      <input
                        type="number"
                        step="any"
                        placeholder="Ex.: 2"
                        value={newManualItem.quantity}
                        onChange={(e) => setNewManualItem(prev => ({ ...prev, quantity: e.target.value }))}
                      />
                    </label>
                    <label>
                      Unidade
                      <input
                        placeholder="Ex.: caixas"
                        value={newManualItem.unit}
                        onChange={(e) => setNewManualItem(prev => ({ ...prev, unit: e.target.value }))}
                      />
                    </label>
                  </div>
                  <label>
                    Setor (Organização)
                    <select
                      value={newManualItem.sector}
                      onChange={(e) => setNewManualItem(prev => ({ ...prev, sector: e.target.value }))}
                    >
                      <option value="Outros">Outros</option>
                      <option value="Hortifrúti">Hortifrúti</option>
                      <option value="Açougue">Açougue</option>
                      <option value="Laticínios">Laticínios</option>
                      <option value="Mercearia">Mercearia</option>
                      <option value="Padaria">Padaria</option>
                      <option value="Congelados">Congelados</option>
                      <option value="Bebidas">Bebidas</option>
                    </select>
                  </label>
                  <button type="submit" className="button mt-2">Adicionar item</button>
                </form>
              </BottomSheet>

              {/* Edit Item Modal */}
              <PromptDialog
                isOpen={!!editItemModal}
                title="Editar Item"
                defaultValue={editItemModal?.name ?? ""}
                placeholder="Nome do ingrediente"
                onSubmit={(val) => saveItemEdits({ ...editItemModal, name: val })}
                onCancel={() => setEditItemModal(null)}
              />

              {/* Conclude Dialog */}
              <ConfirmDialog
                isOpen={concludeConfirm}
                title="Concluir Lista de Compras"
                description="Tem certeza que terminou? Esta lista será arquivada e não aparecerá mais no Início."
                confirmLabel="Concluir e Arquivar"
                cancelLabel="Voltar"
                onConfirm={concludeList}
                onCancel={() => setConcludeConfirm(false)}
              />
            </>
          ) : (
            <State
              title="Sua lista de compras está vazia"
              text="Você pode selecionar receitas para criar uma lista ou adicionar itens manualmente."
            />
          )}
        </>
      )}

      {/* STEP 1: SELECT RECIPES */}
      {creationStep === "select" && (
        <div className="flex flex-col gap-5">
          <header className="page-header">
            <div>
              <span className="eyebrow">NOVA LISTA DE COMPRAS</span>
              <h1 className="text-2xl font-serif">Selecione as Receitas</h1>
            </div>
            <button className="button secondary" onClick={() => setCreationStep("idle")}>Cancelar</button>
          </header>

          <div className="relative mb-2">
            <input
              placeholder="Buscar receita..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary w-5 h-5" />
          </div>

          <div className="flex flex-col gap-3">
            {filteredRecipes.map(r => {
              const isChecked = selectedRecipes.includes(r.id);
              const count = portionsOverride[r.id] ?? r.servings ?? 1;

              return (
                <div key={r.id} className="p-4 bg-surface border border-border rounded-xl shadow-sm flex items-center justify-between">
                  <label className="flex items-center gap-3 cursor-pointer flex-grow">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => setSelectedRecipes(prev => 
                        prev.includes(r.id) ? prev.filter(id => id !== r.id) : [...prev, r.id]
                      )}
                      style={{ width: "24px", height: "24px" }}
                    />
                    <div>
                      <strong className="block text-sm font-semibold">{r.title}</strong>
                      <span className="text-xs text-text-secondary">{r.servings ? `${r.servings} porções originais` : "Rendimento indefinido"}</span>
                    </div>
                  </label>

                  {isChecked && (
                    <div className="flex items-center gap-2 bg-surface-muted rounded-lg p-1.5 border border-border">
                      <button
                        onClick={() => setRecipePortion(r.id, count - 1)}
                        className="w-7 h-7 rounded bg-surface border border-border flex items-center justify-center font-bold"
                      >
                        -
                      </button>
                      <span className="text-xs font-bold px-1">{count} porções</span>
                      <button
                        onClick={() => setRecipePortion(r.id, count + 1)}
                        className="w-7 h-7 rounded bg-surface border border-border flex items-center justify-center font-bold"
                      >
                        +
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Sticky footer for creation select step */}
          <div className="mt-4 flex gap-4">
            <button
              className="button flex-grow"
              disabled={selectedRecipes.length === 0}
              onClick={generateConsolidatedReview}
            >
              Gerar Lista ({selectedRecipes.length} receitas)
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: REVIEW & EDIT CONSOLIDATED LIST */}
      {creationStep === "review" && (
        <div className="flex flex-col gap-5">
          <header className="page-header">
            <div>
              <span className="eyebrow">NOVA LISTA DE COMPRAS</span>
              <h1 className="text-2xl font-serif">Revisar Ingredientes</h1>
            </div>
            <button className="button secondary" onClick={() => setCreationStep("select")}>Voltar</button>
          </header>

          <label className="mb-2">
            Nome da lista
            <input
              value={listName}
              onChange={(e) => setListName(e.target.value)}
              placeholder="Ex.: Compras da semana"
            />
          </label>

          <div className="bg-surface border border-border rounded-xl p-4 shadow-sm flex flex-col gap-3">
            <h3 className="text-sm font-serif font-semibold border-b border-border pb-2 mb-1">Ingredientes Consolidados</h3>
            
            {reviewItems.length === 0 ? (
              <p className="text-xs text-text-secondary">Nenhum ingrediente encontrado nas receitas selecionadas.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {reviewItems.map((item) => (
                  <div key={item.id} className="flex justify-between items-center py-2 border-b border-border/50 text-sm">
                    <span>{item.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-primary">
                        {item.quantity ? readableQuantity(item.quantity) : ""} {item.unit ?? ""}
                      </span>
                      <button
                        className="text-text-secondary hover:text-destructive"
                        onClick={() => setReviewItems(prev => prev.filter(i => i.id !== item.id))}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 flex gap-4">
            <button className="button flex-grow" onClick={saveGeneratedList}>
              Salvar Lista
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// 6. PROFILE WITH DIALOG FOR CONFIRMATION ACTIONS
function Profile({ session }: { session: Session | null }) {
  const { theme, setTheme } = useApp();
  const [busy, setBusy] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase || !session) return;
    
    supabase
      .from("profiles")
      .select("full_name, avatar_url")
      .eq("id", session.user.id)
      .maybeSingle()
      .then(async ({ data }) => {
        if (data) {
          setFullName(data.full_name || "");
          if (data.avatar_url) {
            const { data: signed } = await supabase!.storage
              .from("recipe-photos")
              .createSignedUrl(data.avatar_url, 3600 * 24);
            setAvatarUrl(signed?.signedUrl ?? null);
          }
        }
      });
  }, [session]);

  async function uploadAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !supabase || !session) return;
    
    setBusy(true);
    const path = `${session.user.id}/avatar-${crypto.randomUUID()}-${file.name.replace(/[^\w.-]/g, "-")}`;
    const { error: uploadError } = await supabase.storage
      .from("recipe-photos")
      .upload(path, file, { contentType: file.type });
      
    if (uploadError) {
      setBusy(false);
      notify("error", "Erro ao enviar imagem", uploadError.message);
      return;
    }
    
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        avatar_url: path,
        updated_at: new Date().toISOString(),
      })
      .eq("id", session.user.id);
      
    setBusy(false);
    if (updateError) {
      notify("error", "Erro ao salvar perfil", updateError.message);
    } else {
      notify("success", "Foto de perfil atualizada!");
      const { data: signed } = await supabase.storage
        .from("recipe-photos")
        .createSignedUrl(path, 3600 * 24);
      setAvatarUrl(signed?.signedUrl ?? null);
    }
  }

  async function updateProfile() {
    if (!supabase || !session) return;
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", session.user.id);
      
    setBusy(false);
    if (error) {
      notify("error", "Não foi possível atualizar perfil", error.message);
    } else {
      notify("success", "Perfil atualizado!");
    }
  }

  async function deleteAccount() {
    setDeleteConfirm(false);
    setBusy(true);
    const { error } = await supabase!.functions.invoke("delete-account");
    if (error) {
      setBusy(false);
      notify("error", "Não foi possível excluir a conta", error.message);
      return;
    }
    notify("success", "Sua conta foi excluída definitivamente.");
    await supabase?.auth.signOut();
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6">
      <Header title="Perfil" />

      <section className="form-card">
        <div className="flex flex-col sm:flex-row items-center gap-4 border-b border-border pb-6">
          <div className="relative group cursor-pointer" onClick={() => document.getElementById("avatar-upload")?.click()}>
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Foto de perfil"
                className="w-16 h-16 rounded-full object-cover border border-border shadow-sm group-hover:opacity-80 transition"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary flex items-center justify-center text-primary font-bold text-2xl uppercase group-hover:opacity-80 transition">
                {fullName?.[0] || session?.user.email?.[0] || "U"}
              </div>
            )}
            <div className="absolute inset-0 bg-black/45 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
              <Camera className="w-5 h-5 text-white" />
            </div>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              id="avatar-upload"
              onChange={uploadAvatar}
            />
          </div>
          <div className="text-center sm:text-left flex-grow">
            <h2 className="text-xl font-serif font-bold text-text-primary mb-0.5">{fullName || "Cozinheiro(a)"}</h2>
            <p className="text-sm text-text-secondary">{session?.user.email ?? "Modo de demonstração"}</p>
          </div>
        </div>

        <label>
          Nome
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Seu nome completo"
            disabled={busy}
          />
        </label>

        <label>
          Tema visual
          <select value={theme} onChange={(e) => setTheme(e.target.value)}>
            <option value="system">Seguir Sistema</option>
            <option value="light">Tema Claro</option>
            <option value="dark">Tema Escuro</option>
          </select>
        </label>

        <div className="flex items-center gap-3 text-sm text-text-secondary">
          <Sun className="w-4 h-4" />
          <span>Altera automaticamente o visual com base nas suas preferências.</span>
          <Moon className="w-4 h-4 ml-auto" />
        </div>

        <button className="button" onClick={updateProfile} disabled={busy || !fullName.trim()}>
          Salvar Alterações
        </button>

        <div className="border-t border-border pt-6 mt-2 flex flex-col gap-4">
          <h4 className="text-sm font-semibold text-text-primary">Zona de risco</h4>
          <p className="text-xs text-text-secondary leading-relaxed">
            Ao excluir sua conta, todas as suas receitas, listas de compras, histórico de preparo e informações de despensa serão removidos permanentemente dos nossos servidores. Esta ação não poderá ser desfeita.
          </p>
          <button
            className="button danger"
            disabled={busy}
            onClick={() => setDeleteConfirm(true)}
          >
            Excluir minha conta
          </button>
        </div>
      </section>

      <LoadingOverlay open={busy} title="Carregando…" />

      <ConfirmDialog
        isOpen={deleteConfirm}
        title="Excluir Conta Permanentemente"
        description="Tem certeza absoluta que deseja excluir sua conta e apagar todos os dados da plataforma? Esta ação é irreversível."
        confirmLabel="Excluir Conta"
        cancelLabel="Cancelar"
        isDestructive={true}
        onConfirm={deleteAccount}
        onCancel={() => setDeleteConfirm(false)}
      />
    </div>
  );
}

function Header({
  title,
  eyebrow,
  action,
}: {
  title: string;
  eyebrow?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="page-header flex justify-between items-center mb-6">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1 className="text-2xl font-serif font-bold text-text-primary">{title}</h1>
      </div>
      {action}
    </header>
  );
}

function State({ title, text }: { title: string; text?: string }) {
  return (
    <div className="state flex flex-col items-center justify-center text-center p-8 bg-surface border border-border rounded-2xl min-h-[180px]">
      <ChefHat className="text-primary w-12 h-12 mb-3" />
      <strong className="text-base text-text-primary font-serif mb-1">{title}</strong>
      {text && <p className="text-xs text-text-secondary max-w-sm">{text}</p>}
    </div>
  );
}

// Extra Custom SVG Icons
function ChevronDownIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polyline points="6 9 12 15 18 9"></polyline>
    </svg>
  );
}

function Edit3Icon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 20h9"></path>
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
    </svg>
  );
}

export default App;
