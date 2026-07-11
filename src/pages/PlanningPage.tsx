/* oxlint-disable eslint-plugin-react-hooks/exhaustive-deps */
import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  ShoppingBasket,
  Trash2,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { consolidateIngredients } from "../lib/shopping";
import { notify } from "../components/feedback-events";
type Recipe = { id: string; title: string; servings: number | null };
type Plan = { id: string; week_start: string };
type Item = {
  id: string;
  meal_plan_id: string;
  recipe_id: string | null;
  manual_name: string | null;
  day_of_week: number;
  meal_type: string;
  servings: number | null;
  recipes?: { title: string } | null;
};
const days = [
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
  "Domingo",
];
const meals = [
  ["breakfast", "Café da manhã"],
  ["lunch", "Almoço"],
  ["snack", "Lanche"],
  ["dinner", "Jantar"],
] as const;
function monday(date = new Date()) {
  const copy = new Date(date);
  const day = (copy.getDay() + 6) % 7;
  copy.setDate(copy.getDate() - day);
  return copy.toISOString().slice(0, 10);
}
export function PlanningPage() {
  const [week, setWeek] = useState(monday());
  const [plan, setPlan] = useState<Plan | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selected, setSelected] = useState("");
  async function load() {
    if (!supabase) return;
    const { data: recipeData } = await supabase
      .from("recipes")
      .select("id,title,servings")
      .neq("status", "archived")
      .order("title");
    setRecipes((recipeData as Recipe[]) ?? []);
    let { data: planData } = await supabase
      .from("meal_plans")
      .select("*")
      .eq("week_start", week)
      .maybeSingle();
    if (!planData) {
      const result = await supabase
        .from("meal_plans")
        .insert({ week_start: week })
        .select()
        .single();
      planData = result.data;
    }
    setPlan(planData as Plan);
    if (planData) {
      const { data } = await supabase
        .from("meal_plan_items")
        .select("*,recipes(title)")
        .eq("meal_plan_id", planData.id)
        .order("position");
      setItems((data as Item[]) ?? []);
    }
  }
  useEffect(() => {
    void load();
  }, [week]);
  function move(amount: number) {
    const date = new Date(`${week}T12:00:00`);
    date.setDate(date.getDate() + amount * 7);
    setWeek(monday(date));
  }
  async function add(day: number, meal: string) {
    if (!supabase || !plan || !selected) return;
    const recipe = recipes.find((item) => item.id === selected);
    const { error } = await supabase
      .from("meal_plan_items")
      .insert({
        meal_plan_id: plan.id,
        recipe_id: selected,
        day_of_week: day,
        meal_type: meal,
        servings: recipe?.servings ?? 1,
      });
    if (error) notify("error", "Erro ao planejar", error.message);
    else {
      notify("success", "Refeição adicionada");
      await load();
    }
  }
  async function remove(id: string) {
    if (!supabase) return;
    await supabase.from("meal_plan_items").delete().eq("id", id);
    notify("success", "Refeição removida");
    await load();
  }
  async function generate() {
    if (!supabase || !items.length) return;
    const ids = [
      ...new Set(
        items.flatMap((item) => (item.recipe_id ? [item.recipe_id] : [])),
      ),
    ];
    const { data } = await supabase
      .from("recipe_ingredients")
      .select("*,recipes(servings)")
      .in("recipe_id", ids);
    const adjusted = (data ?? []).map((ingredient) => {
      const item = items.find(
        (entry) => entry.recipe_id === ingredient.recipe_id,
      );
      const original = Number(
        (ingredient.recipes as { servings?: number } | null)?.servings ?? 1,
      );
      const factor = Number(item?.servings ?? original) / original;
      return {
        ...ingredient,
        quantity:
          ingredient.quantity === null
            ? null
            : Number(ingredient.quantity) * factor,
      };
    });
    const consolidated = consolidateIngredients(adjusted);
    const { data: list, error } = await supabase
      .from("shopping_lists")
      .insert({
        name: `Semana de ${new Date(`${week}T12:00:00`).toLocaleDateString("pt-BR")}`,
      })
      .select()
      .single();
    if (error || !list) {
      notify("error", "Erro ao gerar lista", error?.message);
      return;
    }
    await supabase
      .from("shopping_list_items")
      .insert(
        consolidated.map((entry, index) => ({
          shopping_list_id: list.id,
          name: entry.name,
          normalized_name: entry.normalizedName,
          quantity: entry.quantity,
          unit: entry.unit,
          position: index,
        })),
      );
    notify("success", "Lista da semana criada");
  }
  const bySlot = useMemo(
    () =>
      new Map(
        items.map((item) => [`${item.day_of_week}-${item.meal_type}`, item]),
      ),
    [items],
  );
  return (
    <>
      <header className="page-header">
        <div>
          <span className="eyebrow">PLANEJAMENTO</span>
          <h1>Semana à mesa</h1>
        </div>
        <button className="button" disabled={!items.length} onClick={generate}>
          <ShoppingBasket />
          Gerar compras
        </button>
      </header>
      <div className="week-nav">
        <button onClick={() => move(-1)} aria-label="Semana anterior">
          <ChevronLeft />
        </button>
        <strong>
          Semana de {new Date(`${week}T12:00:00`).toLocaleDateString("pt-BR")}
        </strong>
        <button onClick={() => move(1)} aria-label="Próxima semana">
          <ChevronRight />
        </button>
        <button onClick={() => setWeek(monday())}>Hoje</button>
      </div>
      <label className="recipe-picker">
        Receita para adicionar
        <select
          value={selected}
          onChange={(event) => setSelected(event.target.value)}
        >
          <option value="">Selecione…</option>
          {recipes.map((recipe) => (
            <option value={recipe.id} key={recipe.id}>
              {recipe.title}
            </option>
          ))}
        </select>
      </label>
      <div className="week-grid">
        {days.map((day, dayIndex) => (
          <section key={day}>
            <h2>
              <CalendarDays />
              {day}
            </h2>
            {meals.map(([key, label]) => {
              const item = bySlot.get(`${dayIndex}-${key}`);
              return (
                <div className="meal-slot" key={key}>
                  <span>{label}</span>
                  {item ? (
                    <>
                      <strong>{item.recipes?.title ?? item.manual_name}</strong>
                      <button
                        aria-label="Remover"
                        onClick={() => remove(item.id)}
                      >
                        <Trash2 />
                      </button>
                    </>
                  ) : (
                    <button
                      disabled={!selected}
                      onClick={() => add(dayIndex, key)}
                    >
                      <Plus />
                      Adicionar
                    </button>
                  )}
                </div>
              );
            })}
          </section>
        ))}
      </div>
    </>
  );
}
