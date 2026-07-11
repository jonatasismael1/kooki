import { useEffect, useMemo, useState } from "react";
import {
  BrowserRouter,
  Navigate,
  NavLink,
  Route,
  Routes,
  useNavigate,
  useParams,
} from "react-router-dom";
import {
  BookOpen,
  ChefHat,
  CircleUserRound,
  Heart,
  Home,
  ListChecks,
  LogOut,
  Moon,
  Plus,
  Search,
  ShoppingBasket,
  Sparkles,
  Sun,
  Trash2,
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
import { normalizeUrl } from "./lib/import";
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

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(!supabaseConfigured);
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);
  if (!ready) return <State title="Preparando sua cozinha…" />;
  return (
    <>
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
      <ToastViewport />
    </>
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
      "Conta criada",
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
      <div className="brand">
        <ChefHat /> Kooki
      </div>
      <section className="auth-card">
        <span className="eyebrow">SEU LIVRO DE RECEITAS INTELIGENTE</span>
        <h1>Organize o que você ama cozinhar.</h1>
        <p>
          Transforme links, textos e áudios em receitas claras e listas de
          compras.
        </p>
        <button className="button secondary" disabled={busy} onClick={google}>
          Continuar com Google
        </button>
        <div className="divider">ou</div>
        <label>
          E-mail
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="voce@exemplo.com"
          />
        </label>
        <label>
          Senha
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            placeholder="Sua senha"
          />
        </label>
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
          className="button secondary"
          disabled={busy || !email}
          onClick={magic}
        >
          Receber Magic Link
        </button>
        <small>
          Ao continuar, você aceita os Termos e a Política de Privacidade.
        </small>
      </section>
      <LoadingOverlay open={busy} title={stage} />
    </main>
  );
}

function Shell({ session }: { session: Session | null }) {
  async function logout() {
    await supabase?.auth.signOut();
    notify("success", "Sessão encerrada");
  }
  return (
    <div className="shell">
      <aside>
        <div className="brand">
          <ChefHat /> Kooki
        </div>
        <Navigation />
        <button className="nav logout" onClick={logout}>
          <LogOut /> Sair
        </button>
      </aside>
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
      <nav className="bottom">
        <Navigation />
      </nav>
    </div>
  );
}
function Navigation() {
  return (
    <>
      <NavLink className="nav" to="/" end>
        <Home />
        Início
      </NavLink>
      <NavLink className="nav" to="/receitas">
        <BookOpen />
        Receitas
      </NavLink>
      <NavLink className="nav" to="/compras">
        <ShoppingBasket />
        Compras
      </NavLink>
      <NavLink className="nav" to="/perfil">
        <CircleUserRound />
        Perfil
      </NavLink>
    </>
  );
}

function Dashboard() {
  const nav = useNavigate();
  const [usage, setUsage] = useState(0);
  const [reviews, setReviews] = useState(0);
  useEffect(() => {
    supabase
      ?.rpc("get_monthly_usage")
      .then(({ data }) => setUsage(Number(data ?? 0)));
    supabase
      ?.from("recipe_import_jobs")
      .select("*", { count: "exact", head: true })
      .in("status", ["needs_review", "needs_manual_input", "failed"])
      .then(({ count }) => setReviews(count ?? 0));
  }, []);
  return (
    <>
      <Header
        eyebrow="BEM-VINDO À SUA COZINHA"
        title="O que vamos preparar hoje?"
      />
      <section className="hero">
        <div>
          <Sparkles />
          <h2>Transforme qualquer receita</h2>
          <p>
            Cole um link, texto ou envie um áudio. Nós organizamos tudo para
            você.
          </p>
        </div>
        <button className="button" onClick={() => nav("/receitas/nova")}>
          Importar receita
        </button>
      </section>
      {reviews > 0 && (
        <button className="review-banner" onClick={() => nav("/organizar")}>
          {reviews} importação(ões) precisam da sua atenção. Ver importações →
        </button>
      )}
      <div className="usage">
        <span>Plano gratuito</span>
        <strong>{usage} de 15 importações</strong>
        <progress max="15" value={usage} />
      </div>
      <h2>Atalhos</h2>
      <div className="quick">
        <button onClick={() => nav("/receitas/nova")}>
          <Plus />
          Nova receita
        </button>
        <button onClick={() => nav("/receitas")}>
          <Search />
          Buscar no acervo
        </button>
        <button onClick={() => nav("/planejamento")}>
          <ListChecks />
          Planejamento
        </button>
        <button onClick={() => nav("/organizar")}>
          <BookOpen />
          Organizar
        </button>
        <button onClick={() => nav("/compras")}>
          <ShoppingBasket />
          Compras
        </button>
      </div>
    </>
  );
}

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
  const [items, setItems] = useState<RichRecipe[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"all" | "categories">("all");
  const [favorites, setFavorites] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [platform, setPlatform] = useState("");
  useEffect(() => {
    if (!supabase) {
      setItems(getLocalRecipes());
      setLoading(false);
      return;
    }
    Promise.all([
      supabase
        .from("recipes")
        .select(
          "*,recipe_ingredients(*),recipe_categories(category_id),recipe_tags(tag_id)",
        )
        .neq("status", "archived")
        .order("created_at", { ascending: false }),
      supabase
        .from("categories")
        .select("id,name,icon,recipe_categories(count)")
        .order("position"),
    ]).then(([recipesResult, categoriesResult]) => {
      setItems((recipesResult.data as RichRecipe[]) ?? []);
      setCategories((categoriesResult.data as Category[]) ?? []);
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
        recipe.recipe_categories?.some(
          (item) => item.category_id === selectedCategory,
        )),
  );
  async function favorite(recipe: RichRecipe) {
    if (!supabase) return;
    const next = !recipe.is_favorite;
    setItems((values) =>
      values.map((item) =>
        item.id === recipe.id ? { ...item, is_favorite: next } : item,
      ),
    );
    const { error } = await supabase
      .from("recipes")
      .update({ is_favorite: next })
      .eq("id", recipe.id);
    if (error) {
      setItems((values) =>
        values.map((item) =>
          item.id === recipe.id ? { ...item, is_favorite: !next } : item,
        ),
      );
      notify("error", "Erro ao atualizar favorito", error.message);
    } else
      notify(
        "success",
        next ? "Adicionada aos favoritos" : "Removida dos favoritos",
      );
  }
  return (
    <>
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
        <button
          className={view === "all" ? "active" : ""}
          onClick={() => setView("all")}
        >
          Todas
        </button>
        <button
          className={view === "categories" ? "active" : ""}
          onClick={() => setView("categories")}
        >
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
              <ChefHat />
              <strong>{category.name}</strong>
              <span>
                {category.recipe_categories?.[0]?.count ?? 0} receitas
              </span>
            </button>
          ))}
        </div>
      ) : (
        <>
          <div className="filter-bar">
            <input
              className="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por título ou ingrediente…"
            />
            <select
              value={platform}
              onChange={(event) => setPlatform(event.target.value)}
            >
              <option value="">Todas as origens</option>
              <option value="instagram">Instagram</option>
              <option value="tiktok">TikTok</option>
              <option value="manual">Manual</option>
              <option value="blog">Blog</option>
            </select>
            <button
              className={favorites ? "active" : ""}
              onClick={() => setFavorites((value) => !value)}
            >
              <Heart />
              Favoritas
            </button>
            {(query || platform || favorites || selectedCategory) && (
              <button
                onClick={() => {
                  setQuery("");
                  setPlatform("");
                  setFavorites(false);
                  setSelectedCategory("");
                }}
              >
                Limpar filtros
              </button>
            )}
          </div>
          {loading ? (
            <div className="skeleton-list">
              <i />
              <i />
              <i />
            </div>
          ) : filtered.length === 0 ? (
            <State
              title="Nenhuma receita encontrada"
              text="Limpe os filtros ou importe uma nova receita."
            />
          ) : (
            <div className="recipe-grid">
              {filtered.map((recipe) => (
                <article className="recipe-card" key={recipe.id}>
                  <NavLink to={`/receitas/${recipe.id}`}>
                    <div className="recipe-art">
                      <ChefHat />
                    </div>
                    <span>{recipe.source_platform ?? "manual"}</span>
                    <h3>{recipe.title}</h3>
                    <p>
                      {recipe.description ?? "Receita salva no seu acervo."}
                    </p>
                  </NavLink>
                  <button
                    className="favorite-card"
                    aria-label={
                      recipe.is_favorite
                        ? "Remover dos favoritos"
                        : "Adicionar aos favoritos"
                    }
                    onClick={() => favorite(recipe)}
                  >
                    <Heart
                      fill={recipe.is_favorite ? "currentColor" : "none"}
                    />
                    <span>{recipe.is_favorite ? "Favorita" : "Favoritar"}</span>
                  </button>
                </article>
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}

function RecipeEditor() {
  const nav = useNavigate();
  const [mode, setMode] = useState<"manual" | "url" | "text" | "audio">(
    "manual",
  );
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [media, setMedia] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [currentStage, setCurrentStage] = useState("");
  useEffect(() => {
    if (error) notify("error", "Não foi possível importar", error);
  }, [error]);
  async function upload(file: File) {
    if (!supabase) throw new Error("Supabase indisponível");
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Sessão inválida. Entre novamente.");
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
    return path;
  }
  async function waitForJob(jobId: string) {
    if (!supabase) throw new Error("Supabase indisponível");
    return new Promise<{ recipe_id?: string; status: string; error_message?: string }>((resolve, reject) => {
      let settled = false;
      const finish = (value: { recipe_id?: string; status: string; error_message?: string }) => {
        if (settled) return;
        settled = true;
        clearInterval(poll);
        void supabase.removeChannel(channel);
        resolve(value);
      };
      const inspect = (job: { recipe_id?: string; status: string; current_stage?: string; error_message?: string }) => {
        if (job.current_stage) setCurrentStage(job.current_stage);
        if (["completed", "needs_review", "needs_manual_input", "failed", "cancelled"].includes(job.status)) finish(job);
      };
      const channel = supabase.channel(`import-job-${jobId}`).on("postgres_changes", {
        event: "UPDATE", schema: "public", table: "recipe_import_jobs", filter: `id=eq.${jobId}`,
      }, (payload) => inspect(payload.new as { recipe_id?: string; status: string; current_stage?: string; error_message?: string })).subscribe();
      const check = async () => {
        const { data, error: pollError } = await supabase.from("recipe_import_jobs")
          .select("recipe_id,status,current_stage,error_message").eq("id", jobId).single();
        if (pollError) { if (!settled) reject(new Error("Não foi possível acompanhar a importação.")); return; }
        inspect(data);
      };
      const poll = window.setInterval(() => void check(), 3000);
      void check();
    });
  }
  async function save() {
    setBusy(true);
    setError("");
    setCurrentStage("Analisando o conteúdo");
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
        nav(`/receitas/${recipe.id}`);
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
          title,
          description: content,
          status: "ready",
          source_platform: "manual",
        })
        .select("id")
        .single();
      if (e) setError(e.message);
      else {
        notify("success", "Receita salva");
        nav(`/receitas/${data.id}`);
      }
    } else {
      let audioPath: string | undefined;
      let replaceRecipeId: string | undefined;
      let idempotencyKey: string | undefined;
      try {
        if (mode === "audio") {
          if (!media)
            throw new Error("Selecione um arquivo de áudio ou vídeo.");
          audioPath = await upload(media);
        } else if (mode === "url") {
          const normalized = normalizeUrl(content);
          const { data: existing } = await supabase
            .from("recipes")
            .select("id,title")
            .eq("source_url_normalized", normalized)
            .maybeSingle();
          if (existing) {
            const action = window
              .prompt(
                `Este link já existe como “${existing.title}”. Digite abrir, copiar ou atualizar:`,
                "abrir",
              )
              ?.trim()
              .toLowerCase();
            if (!action || action === "abrir") {
              setBusy(false);
              nav(`/receitas/${existing.id}`);
              return;
            }
            if (action === "atualizar") replaceRecipeId = existing.id;
            else if (action !== "copiar")
              throw new Error("Escolha abrir, copiar ou atualizar.");
            idempotencyKey = crypto.randomUUID();
          }
        }
      } catch (extractionError) {
        const message =
          extractionError instanceof Error
            ? extractionError.message
            : "Falha no download ou upload da mídia";
        console.error("[Kooki import]", {
          stage: "download_or_upload_failed",
          message,
        });
        setError(message === "Failed to fetch" ? "Não foi possível enviar o arquivo. Verifique sua conexão e tente novamente." : message);
        setBusy(false);
        return;
      }
      const { data, error: e } = await supabase.functions.invoke(
        "import-recipe",
        {
          body: {
            inputType: mode === "url" ? "url" : mode,
            sourceUrl: mode === "url" ? content : null,
            rawText: mode === "text" ? content : null,
            storagePath: audioPath,
            replaceRecipeId,
            idempotencyKey,
          },
        },
      );
      if (e) {
        let message = e.message;
        const context = (e as unknown as { context?: Response }).context;
        if (context)
          try {
            const details = (await context.json()) as { error?: { message?: string } };
            message = details.error?.message ?? message;
          } catch {
            message = e.message;
          }
        console.error("[Kooki import]", {
          stage: "transcription_or_structure_failed",
          message,
        });
        setError(message === "Failed to fetch" ? "Não foi possível iniciar a importação. Verifique sua conexão e tente novamente." : message);
      } else {
        const result = data as {
          success?: boolean;
          job_id?: string;
          status?: string;
        };
        if (!result.success || !result.job_id) setError("A importação não pôde ser iniciada.");
        else {
          const job = await waitForJob(result.job_id);
          if (job.recipe_id) {
          notify(
            "success",
            job.status === "needs_review"
              ? "Receita criada para revisão"
              : "Receita importada com sucesso",
          );
            nav(`/receitas/${job.recipe_id}`);
          } else setError(job.error_message ?? (job.status === "needs_manual_input"
            ? "Não conseguimos obter conteúdo suficiente. Use a legenda ou envie o arquivo."
            : "A importação não pôde ser concluída. Tente novamente ou use texto manual."));
        }
      }
    }
    setBusy(false);
  }
  const loadingTitle =
    mode === "url"
      ? currentStage || "Analisando o link…"
      : mode === "audio"
        ? currentStage || "Enviando o arquivo…"
        : currentStage || "Organizando sua receita…";
  return (
    <>
      <Header title="Adicionar receita" />
      <div className="tabs">
        {(["manual", "url", "text", "audio"] as const).map((x) => (
          <button
            className={mode === x ? "active" : ""}
            onClick={() => setMode(x)}
            key={x}
          >
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
          Título
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex.: Bolo de cenoura"
          />
        </label>
        {mode !== "audio" && (
          <label>
            {mode === "url" ? "Link da receita" : "Conteúdo e observações"}
            <textarea
              rows={9}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={
                mode === "url" ? "https://…" : "Ingredientes e modo de preparo…"
              }
            />
          </label>
        )}
        {mode === "url" && (
          <p className="notice">
            Instagram e TikTok: o Kooki baixa e transcreve o vídeo antes de
            montar a receita.
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
              Até 100 MB. O arquivo é privado, transcrito no backend e excluído
              após o processamento.
            </p>
          </>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button
          className="button"
          disabled={
            busy ||
            (!title && mode === "manual") ||
            (mode === "audio" ? !media : !content)
          }
          onClick={save}
        >
          {busy
            ? loadingTitle
            : mode === "manual"
              ? "Salvar receita"
              : "Importar e organizar"}
        </button>
      </section>
      <LoadingOverlay
        open={busy}
        title={loadingTitle}
        description="Isso pode levar alguns segundos, especialmente para vídeos."
      />
    </>
  );
}

function RecipeDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [recipe, setRecipe] = useState<Recipe | null>(() =>
    !supabase && id ? getLocalRecipe(id) : null,
  );
  const [targetServings, setTargetServings] = useState<number | null>(null);
  useEffect(() => {
    if (!supabase) return;
    supabase
      .from("recipes")
      .select("*,recipe_ingredients(*),recipe_steps(*)")
      .eq("id", id)
      .single()
      .then(({ data, error }) => {
        if (error) notify("error", "Erro ao carregar receita", error.message);
        else {
          const loaded = data as Recipe;
          setRecipe(loaded);
          setTargetServings(loaded.servings);
        }
      });
  }, [id]);
  if (!recipe) return <State title="Carregando receita…" />;
  async function remove() {
    if (!confirm("Excluir esta receita definitivamente?")) return;
    if (supabase) {
      const { error } = await supabase
        .from("recipes")
        .delete()
        .eq("id", recipe.id);
      if (error) {
        notify("error", "Não foi possível excluir", error.message);
        return;
      }
    } else deleteLocalRecipe(recipe.id);
    notify("success", "Receita excluída");
    nav("/receitas");
  }
  return (
    <>
      <Header
        title={recipe.title}
        action={
          <button
            className="icon-button danger"
            aria-label="Excluir receita"
            onClick={remove}
          >
            <Trash2 />
          </button>
        }
      />
      {recipe.status === "needs_review" && (
        <p className="notice">
          Algumas informações precisam de revisão antes de preparar.
        </p>
      )}
      <p className="lead">{recipe.description}</p>
      {recipe.source_url && (
        <p>
          <a href={recipe.source_url} target="_blank" rel="noreferrer">
            Abrir conteúdo original
          </a>
        </p>
      )}
      {recipe.servings && (
        <div className="servings">
          <span>Porções</span>
          <button
            onClick={() =>
              setTargetServings((value) =>
                Math.max(1, (value ?? recipe.servings!) - 1),
              )
            }
          >
            −
          </button>
          <strong>{targetServings ?? recipe.servings}</strong>
          <button
            onClick={() =>
              setTargetServings((value) => (value ?? recipe.servings!) + 1)
            }
          >
            +
          </button>
          {targetServings !== recipe.servings && (
            <button onClick={() => setTargetServings(recipe.servings)}>
              Restaurar
            </button>
          )}
        </div>
      )}
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
                      <input type="checkbox" />{" "}
                      {adjusted !== null
                        ? `${readableQuantity(adjusted)} ${ingredient.unit ?? ""}`
                        : ingredient.quantity_text}{" "}
                      {ingredient.name}
                    </li>
                  );
                })}
            </ul>
          ) : (
            <State title="Nenhum ingrediente" />
          )}
        </section>
        <section>
          <h2>Modo de preparo</h2>
          {recipe.recipe_steps?.length ? (
            <ol>
              {recipe.recipe_steps
                .sort((a, b) => a.position - b.position)
                .map((step) => (
                  <li key={step.id}>{step.instruction}</li>
                ))}
            </ol>
          ) : (
            <State title="Nenhuma etapa" />
          )}
        </section>
      </div>
      <button
        className="button kitchen-button"
        onClick={() => nav(`/receitas/${recipe.id}/cozinha`)}
      >
        <ChefHat />
        Iniciar Modo Cozinha
      </button>
      <RecipeTools
        recipeId={recipe.id}
        isFavorite={Boolean(recipe.is_favorite)}
        onFavorite={(value) =>
          setRecipe((current) =>
            current ? { ...current, is_favorite: value } : current,
          )
        }
      />
    </>
  );
}

function Shopping() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  useEffect(() => {
    if (!supabase) {
      setRecipes(
        getLocalRecipes().filter((recipe) => recipe.status === "ready"),
      );
      return;
    }
    supabase
      .from("recipes")
      .select("*,recipe_ingredients(*)")
      .eq("status", "ready")
      .then(({ data }) => setRecipes((data as Recipe[]) ?? []));
  }, []);
  const items = useMemo(
    () =>
      consolidateIngredients(
        recipes
          .filter((r) => selected.includes(r.id))
          .flatMap((r) => r.recipe_ingredients ?? []),
      ),
    [recipes, selected],
  );
  return (
    <>
      <Header title="Lista de compras" />
      <p>
        Selecione receitas para consolidar apenas quantidades e unidades
        compatíveis.
      </p>
      <div className="select-recipes">
        {recipes.map((r) => (
          <label key={r.id}>
            <input
              type="checkbox"
              checked={selected.includes(r.id)}
              onChange={() =>
                setSelected((s) =>
                  s.includes(r.id) ? s.filter((x) => x !== r.id) : [...s, r.id],
                )
              }
            />
            {r.title}
          </label>
        ))}
      </div>
      {items.length === 0 ? (
        <State
          title="Sua lista está vazia"
          text="Selecione receitas para começar."
        />
      ) : (
        <ul className="shopping-list">
          {items.map((i, n) => (
            <li key={`${i.normalizedName}-${i.unit}-${n}`}>
              <input type="checkbox" /> <strong>{i.name}</strong>
              <span>
                {i.quantity ?? ""} {i.unit ?? ""}
              </span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function Profile({ session }: { session: Session | null }) {
  const [theme, setTheme] = useState(
    localStorage.getItem("kooki-theme") ?? "system",
  );
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    localStorage.setItem("kooki-theme", theme);
    document.documentElement.classList.toggle(
      "dark",
      theme === "dark" ||
        (theme === "system" &&
          matchMedia("(prefers-color-scheme: dark)").matches),
    );
  }, [theme]);
  async function deleteAccount() {
    if (
      !confirm(
        "Esta ação exclui permanentemente sua conta e todos os dados. Continuar?",
      )
    )
      return;
    setBusy(true);
    const { error } = await supabase!.functions.invoke("delete-account");
    if (error) {
      setBusy(false);
      notify("error", "Não foi possível excluir a conta", error.message);
      return;
    }
    notify("success", "Conta excluída");
    await supabase?.auth.signOut();
  }
  return (
    <>
      <Header title="Perfil" />
      <section className="form-card">
        <h2>{session?.user.user_metadata.full_name ?? "Cozinheiro(a)"}</h2>
        <p>{session?.user.email ?? "Modo de demonstração"}</p>
        <label>
          Tema
          <select value={theme} onChange={(e) => setTheme(e.target.value)}>
            <option value="system">Sistema</option>
            <option value="light">Claro</option>
            <option value="dark">Escuro</option>
          </select>
        </label>
        <div className="theme-icons">
          <Sun />
          <Moon />
        </div>
        <button
          className="button danger"
          disabled={busy}
          onClick={deleteAccount}
        >
          Excluir minha conta
        </button>
      </section>
      <LoadingOverlay open={busy} title="Excluindo sua conta…" />
    </>
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
    <header className="page-header">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
      </div>
      {action}
    </header>
  );
}
function State({ title, text }: { title: string; text?: string }) {
  return (
    <div className="state">
      <ChefHat />
      <strong>{title}</strong>
      {text && <p>{text}</p>}
    </div>
  );
}
export default App;
