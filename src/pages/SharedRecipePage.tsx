import { useEffect, useState } from "react";
import { ChefHat, Copy, Globe, AlertTriangle } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { notify } from "../components/feedback-events";

type Shared = {
  title: string;
  description: string | null;
  servings: number | null;
  recipe_ingredients: Array<{ name: string; quantity_text: string | null }>;
  recipe_steps: Array<{ position: number; instruction: string }>;
};

export function SharedRecipePage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [recipe, setRecipe] = useState<Shared | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/public-recipe?token=${encodeURIComponent(token ?? "")}`,
      { headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY } },
    )
      .then(async (response) => {
        const result = (await response.json()) as {
          recipe?: Shared;
          error?: string;
        };
        if (!response.ok) setError(result.error ?? "Link indisponível");
        else setRecipe(result.recipe ?? null);
      })
      .catch(() => setError("Não foi possível abrir o compartilhamento"));
  }, [token]);

  async function copy() {
    if (!supabase) return;
    const { data, error: invokeError } = await supabase.functions.invoke(
      "public-recipe",
      { body: { token, copy: true } },
    );
    if (invokeError) {
      notify("error", "Não foi possível copiar", invokeError.message);
      return;
    }
    notify("success", "Receita copiada para seu acervo");
    navigate(`/receitas/${(data as { recipeId: string }).recipeId}`);
  }

  if (error)
    return (
      <main className="shared-page state min-h-screen justify-center flex flex-col items-center">
        <AlertTriangle className="w-12 h-12 text-destructive mb-3 animate-pulse" />
        <strong>{error}</strong>
      </main>
    );

  if (!recipe)
    return (
      <main className="shared-page state min-h-screen justify-center flex flex-col items-center">
        <ChefHat className="w-12 h-12 text-primary mb-3 animate-spin" />
        <strong>Carregando receita compartilhada…</strong>
      </main>
    );

  return (
    <main className="shared-page max-w-4xl mx-auto px-4 py-8 pb-20">
      <div className="brand mb-8 text-2xl font-bold flex items-center justify-center gap-2">
        <ChefHat /> Kooki
      </div>
      
      <article className="flex flex-col gap-6">
        <header className="page-header flex flex-col items-start gap-1">
          <span className="eyebrow flex items-center gap-1.5 font-bold"><Globe className="w-3.5 h-3.5" /> Receita compartilhada</span>
          <h1 className="text-3xl font-serif font-bold text-text-primary mt-1">{recipe.title}</h1>
        </header>

        {recipe.description && (
          <p className="text-text-secondary text-lg font-light italic bg-surface-muted p-4 rounded-xl border border-border/50">
            {recipe.description}
          </p>
        )}

        <button className="button w-full md:w-auto self-start mt-2" onClick={copy}>
          <Copy className="w-4 h-4" />
          Copiar para meu acervo
        </button>

        {/* Ingredients and Method in Two Columns */}
        <div className="detail-grid mt-6">
          <section className="bg-surface border border-border p-6 rounded-2xl shadow-sm">
            <h2 className="text-lg font-serif font-bold border-b border-primary pb-2 mb-4">Ingredientes</h2>
            <ul className="check-list">
              {recipe.recipe_ingredients.map((item, index) => (
                <li key={index} className="py-2 border-b border-border/40 last:border-0">
                  <span className="text-text-primary font-medium text-sm">
                    {item.quantity_text ? `${item.quantity_text} ` : ""}
                    {item.name}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="bg-surface border border-border p-6 rounded-2xl shadow-sm">
            <h2 className="text-lg font-serif font-bold border-b border-primary pb-2 mb-4">Modo de preparo</h2>
            <ol className="flex flex-col gap-3 list-decimal pl-4">
              {recipe.recipe_steps
                .sort((a, b) => a.position - b.position)
                .map((item) => (
                  <li key={item.position} className="pl-1 text-text-primary text-sm leading-relaxed">
                    {item.instruction}
                  </li>
                ))}
            </ol>
          </section>
        </div>
      </article>
    </main>
  );
}
export default SharedRecipePage;
