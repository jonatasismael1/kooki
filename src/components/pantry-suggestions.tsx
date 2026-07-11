import { useEffect, useState } from "react";
import { ChefHat } from "lucide-react";
import { supabase } from "../lib/supabase";
import { matchPantry } from "../lib/product";
type Suggestion = {
  id: string;
  title: string;
  missing: string[];
  expiringUsed: number;
};
export function PantrySuggestions() {
  const [items, setItems] = useState<Suggestion[]>([]);
  useEffect(() => {
    if (!supabase) return;
    Promise.all([
      supabase.from("pantry_items").select("name,status,expires_at"),
      supabase
        .from("recipes")
        .select("id,title,recipe_ingredients(name)")
        .neq("status", "archived"),
    ]).then(([pantry, recipes]) => {
      const source = (recipes.data ?? []).map((recipe) => ({
        id: recipe.id,
        ingredients: (recipe.recipe_ingredients as Array<{ name: string }>).map(
          (item) => item.name,
        ),
      }));
      const matches = matchPantry(
        source,
        (pantry.data ?? []).map((item) => ({
          name: item.name,
          status: item.status,
          expiresAt: item.expires_at,
        })),
      );
      setItems(
        matches
          .slice(0, 8)
          .map((match) => ({
            id: match.recipeId,
            title:
              (recipes.data ?? []).find(
                (recipe) => recipe.id === match.recipeId,
              )?.title ?? "Receita",
            missing: match.missing,
            expiringUsed: match.expiringUsed,
          })),
      );
    });
  }, []);
  if (!items.length) return null;
  return (
    <section className="pantry-suggestions">
      <h2>
        <ChefHat />O que posso preparar?
      </h2>
      <div className="manage-list">
        {items.map((item) => (
          <a href={`/receitas/${item.id}`} key={item.id}>
            <strong>{item.title}</strong>
            <span>
              {item.missing.length === 0
                ? "Você tem tudo"
                : `Faltam ${item.missing.length}: ${item.missing.slice(0, 3).join(", ")}`}
              {item.expiringUsed > 0
                ? ` · usa ${item.expiringUsed} próximo(s) da validade`
                : ""}
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}
