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
import { ConfirmDialog } from "../components/ui";

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
  
  // Custom confirm dialog state
  const [concludeGenerate, setConcludeGenerate] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

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
    if (error) {
      notify("error", "Erro ao planejar", error.message);
    } else {
      notify("success", "Refeição adicionada");
      await load();
    }
  }

  async function remove() {
    if (!supabase || !itemToDelete) return;
    await supabase.from("meal_plan_items").delete().eq("id", itemToDelete);
    setItemToDelete(null);
    notify("success", "Refeição removida");
    await load();
  }

  async function generate() {
    if (!supabase || !items.length) return;
    setConcludeGenerate(false);

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
        name: `Compras para semana de ${new Date(`${week}T12:00:00`).toLocaleDateString("pt-BR")}`,
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
      
    notify("success", "Lista de compras da semana criada!");
  }

  const bySlot = useMemo(
    () =>
      new Map(
        items.map((item) => [`${item.day_of_week}-${item.meal_type}`, item]),
      ),
    [items],
  );

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-6">
      <header className="page-header flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <span className="eyebrow">PLANEJAMENTO</span>
          <h1>Cardápio da semana</h1>
        </div>
        <button className="button" disabled={!items.length} onClick={() => setConcludeGenerate(true)}>
          <ShoppingBasket className="w-5 h-5" />
          Gerar lista de compras
        </button>
      </header>

      {/* Week Navigation */}
      <section className="bg-surface border border-border p-4 rounded-xl flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <button className="icon-button w-9 h-9" onClick={() => move(-1)} aria-label="Semana anterior">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <strong className="text-sm font-serif px-2">
            Semana de {new Date(`${week}T12:00:00`).toLocaleDateString("pt-BR")}
          </strong>
          <button className="icon-button w-9 h-9" onClick={() => move(1)} aria-label="Próxima semana">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        <button className="button secondary px-4 py-1.5 min-h-0 text-xs" onClick={() => setWeek(monday())}>Hoje</button>
      </section>

      {/* Select Recipe to Add */}
      <section className="form-card p-4">
        <label className="text-xs font-bold uppercase text-text-secondary">
          Selecione a receita abaixo para adicionar aos dias do cardápio:
          <select
            value={selected}
            onChange={(event) => setSelected(event.target.value)}
            className="mt-2"
          >
            <option value="">Selecione uma receita…</option>
            {recipes.map((recipe) => (
              <option value={recipe.id} key={recipe.id}>
                {recipe.title}
              </option>
            ))}
          </select>
        </label>
      </section>

      {/* Week Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {days.map((day, dayIndex) => (
          <section key={day} className="bg-surface border border-border rounded-2xl shadow-sm overflow-hidden flex flex-col">
            <div className="bg-surface-muted border-b border-border p-4 flex items-center gap-2">
              <CalendarDays className="text-primary w-5 h-5" />
              <h2 className="text-base font-serif font-bold text-text-primary mb-0">{day}</h2>
            </div>
            
            <div className="p-4 flex flex-col gap-3 flex-grow">
              {meals.map(([key, label]) => {
                const item = bySlot.get(`${dayIndex}-${key}`);
                return (
                  <div className="flex flex-col gap-1 border-b border-border/40 pb-3 last:border-0 last:pb-0" key={key}>
                    <span className="text-[10px] uppercase font-bold text-text-secondary tracking-wider">{label}</span>
                    {item ? (
                      <div className="flex justify-between items-center bg-surface-muted/50 p-2.5 rounded-xl border border-border/60">
                        <strong className="text-sm text-text-primary font-medium truncate max-w-[150px]">
                          {item.recipes?.title ?? item.manual_name}
                        </strong>
                        <button
                          className="text-text-secondary hover:text-destructive p-1 rounded hover:bg-surface-muted"
                          aria-label="Remover"
                          onClick={() => setItemToDelete(item.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        className="button secondary w-full py-2 min-h-0 text-xs justify-start gap-1 text-text-secondary hover:text-primary hover:border-primary border-dashed"
                        disabled={!selected}
                        onClick={() => add(dayIndex, key)}
                      >
                        <Plus className="w-3.5 h-3.5" /> Adicionar
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {/* Confirm Deletion */}
      <ConfirmDialog
        isOpen={!!itemToDelete}
        title="Remover refeição"
        description="Deseja retirar esta receita do cardápio semanal?"
        confirmLabel="Remover"
        cancelLabel="Cancelar"
        isDestructive={true}
        onConfirm={remove}
        onCancel={() => setItemToDelete(null)}
      />

      {/* Confirm Generate Purchases */}
      <ConfirmDialog
        isOpen={concludeGenerate}
        title="Gerar lista de compras"
        description="Deseja consolidar todos os ingredientes do cardápio semanal em uma nova lista de compras ativa?"
        confirmLabel="Gerar lista"
        cancelLabel="Cancelar"
        onConfirm={generate}
        onCancel={() => setConcludeGenerate(false)}
      />
    </div>
  );
}
