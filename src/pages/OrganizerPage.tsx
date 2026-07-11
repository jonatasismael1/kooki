/* oxlint-disable eslint-plugin-react-hooks/exhaustive-deps */
import { useEffect, useState } from "react";
import {
  Archive,
  FolderHeart,
  Inbox,
  PackageOpen,
  Plus,
  Tags,
  Trash2,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { notify } from "../components/feedback-events";
import { PantrySuggestions } from "../components/pantry-suggestions";
type Tab = "categories" | "tags" | "collections" | "pantry" | "imports";
type Row = {
  id: string;
  name: string;
  type?: string;
  icon?: string;
  is_system?: boolean;
  description?: string;
  status?: string;
  quantity?: number | null;
  unit?: string | null;
  sector?: string;
  current_stage?: string;
  error_message?: string;
  recipe_id?: string | null;
  source_platform?: string;
  created_at?: string;
};
const labels: Record<Tab, string> = {
  categories: "Categorias",
  tags: "Tags",
  collections: "Coleções",
  pantry: "Despensa",
  imports: "Importações",
};
export function OrganizerPage() {
  const [tab, setTab] = useState<Tab>("categories");
  const [rows, setRows] = useState<Row[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  async function load() {
    if (!supabase) return;
    setLoading(true);
    const table =
      tab === "imports"
        ? "recipe_import_jobs"
        : tab === "pantry"
          ? "pantry_items"
          : tab;
    let query = supabase.from(table).select("*");
    if (tab === "imports")
      query = query.order("created_at", { ascending: false }).limit(30);
    else if (tab === "categories") query = query.order("position");
    else query = query.order("created_at", { ascending: false });
    const { data, error } = await query;
    if (error)
      notify(
        "error",
        `Erro ao carregar ${labels[tab].toLowerCase()}`,
        error.message,
      );
    setRows((data as Row[]) ?? []);
    setLoading(false);
  }
  useEffect(() => {
    void load();
  }, [tab]);
  async function create() {
    if (!supabase || !name.trim()) return;
    let error: Error | null = null;
    if (tab === "categories")
      ({ error } = await supabase
        .from("categories")
        .insert({ name: name.trim(), type: "custom", is_system: false }));
    else if (tab === "tags")
      ({ error } = await supabase
        .from("tags")
        .insert({ name: name.trim(), is_system: false }));
    else if (tab === "collections")
      ({ error } = await supabase
        .from("collections")
        .insert({ name: name.trim() }));
    else if (tab === "pantry")
      ({ error } = await supabase
        .from("pantry_items")
        .insert({
          name: name.trim(),
          normalized_name: name.trim().toLowerCase(),
          status: "available",
        }));
    if (error) notify("error", "Não foi possível criar", error.message);
    else {
      notify("success", `${labels[tab].slice(0, -1)} criada`);
      setName("");
      await load();
    }
  }
  async function remove(row: Row) {
    if (!supabase || row.is_system || !confirm(`Excluir “${row.name}”?`))
      return;
    const { error } = await supabase.from(tab).delete().eq("id", row.id);
    if (error) notify("error", "Não foi possível excluir", error.message);
    else {
      notify("success", "Item excluído");
      await load();
    }
  }
  return (
    <>
      <header className="page-header">
        <div>
          <span className="eyebrow">ORGANIZAÇÃO</span>
          <h1>Sua cozinha, do seu jeito</h1>
        </div>
      </header>
      <div className="tabs organizer-tabs">
        {(Object.keys(labels) as Tab[]).map((key) => (
          <button
            className={tab === key ? "active" : ""}
            onClick={() => setTab(key)}
            key={key}
          >
            {labels[key]}
          </button>
        ))}
      </div>
      {tab !== "imports" && (
        <section className="inline-create">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={`Nova ${labels[tab].toLowerCase().slice(0, -1)}…`}
            onKeyDown={(event) => {
              if (event.key === "Enter") void create();
            }}
          />
          <button className="button" disabled={!name.trim()} onClick={create}>
            <Plus />
            Adicionar
          </button>
        </section>
      )}
      {tab === "pantry" && <PantrySuggestions />}
      {loading ? (
        <div className="skeleton-list" aria-label="Carregando">
          <i />
          <i />
          <i />
        </div>
      ) : rows.length === 0 ? (
        <div className="state">
          <PackageOpen />
          <strong>Nenhum item por aqui</strong>
          <p>Adicione o primeiro para começar.</p>
        </div>
      ) : (
        <div className="manage-list">
          {rows.map((row) => (
            <article key={row.id}>
              <div className="manage-icon">
                {tab === "collections" ? (
                  <FolderHeart />
                ) : tab === "tags" ? (
                  <Tags />
                ) : tab === "imports" ? (
                  <Inbox />
                ) : tab === "pantry" ? (
                  <PackageOpen />
                ) : (
                  <Archive />
                )}
              </div>
              <div>
                <strong>
                  {row.name ?? row.source_platform ?? "Importação"}
                </strong>
                <p>
                  {tab === "imports"
                    ? `${row.status} · ${row.current_stage ?? "aguardando"}`
                    : tab === "pantry"
                      ? `${row.quantity ?? "—"} ${row.unit ?? ""} · ${row.status}`
                      : (row.description ??
                        row.type ??
                        (row.is_system ? "Sistema" : "Personalizada"))}
                </p>
                {row.error_message && (
                  <small className="error-text">{row.error_message}</small>
                )}
              </div>
              {tab === "imports"
                ? row.recipe_id && (
                    <a
                      className="button secondary"
                      href={`/receitas/${row.recipe_id}`}
                    >
                      Abrir
                    </a>
                  )
                : !row.is_system && (
                    <button
                      className="icon-button"
                      aria-label={`Excluir ${row.name}`}
                      onClick={() => remove(row)}
                    >
                      <Trash2 />
                    </button>
                  )}
            </article>
          ))}
        </div>
      )}
    </>
  );
}
