import { useEffect, useState } from "react";
import { ChefHat, Copy } from "lucide-react";
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
  const nav = useNavigate();
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
    nav(`/receitas/${(data as { recipeId: string }).recipeId}`);
  }
  if (error)
    return (
      <main className="shared-page state">
        <ChefHat />
        <strong>{error}</strong>
      </main>
    );
  if (!recipe)
    return (
      <main className="shared-page state">
        <ChefHat />
        <strong>Carregando receita compartilhada…</strong>
      </main>
    );
  return (
    <main className="shared-page">
      <div className="brand">
        <ChefHat />
        Kooki
      </div>
      <article>
        <span className="eyebrow">RECEITA COMPARTILHADA</span>
        <h1>{recipe.title}</h1>
        <p>{recipe.description}</p>
        <button className="button" onClick={copy}>
          <Copy />
          Copiar para meu acervo
        </button>
        <div className="detail-grid">
          <section>
            <h2>Ingredientes</h2>
            <ul>
              {recipe.recipe_ingredients.map((item, index) => (
                <li key={index}>
                  {item.quantity_text} {item.name}
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h2>Modo de preparo</h2>
            <ol>
              {recipe.recipe_steps
                .sort((a, b) => a.position - b.position)
                .map((item) => (
                  <li key={item.position}>{item.instruction}</li>
                ))}
            </ol>
          </section>
        </div>
      </article>
    </main>
  );
}
