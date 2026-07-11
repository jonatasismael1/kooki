/* oxlint-disable eslint-plugin-react-hooks/exhaustive-deps */
import { useEffect, useMemo, useState } from "react";
import {
  Archive,
  FolderHeart,
  Inbox,
  PackageOpen,
  Plus,
  Pencil,
  ArrowUp,
  ArrowDown,
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
  position?: number;
  expires_at?: string | null;
  notes?: string | null;
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
  const [queryText, setQueryText] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [sector, setSector] = useState("Outros");
  const [expiresAt, setExpiresAt] = useState("");
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
      ({ error } = await supabase.from("pantry_items").insert({
        name: name.trim(),
        normalized_name: name.trim().toLowerCase(),
        quantity: quantity ? Number(quantity.replace(",", ".")) : null,
        unit: unit.trim() || null,
        sector: sector.trim() || "Outros",
        expires_at: expiresAt || null,
        status: "available",
      }));
    if (error) notify("error", "Não foi possível criar", error.message);
    else {
      notify("success", `${labels[tab].slice(0, -1)} criada`);
      setName("");
      setQuantity("");
      setUnit("");
      setExpiresAt("");
      await load();
    }
  }
  async function edit(row: Row) {
    if (!supabase || row.is_system) return;
    const nextName = prompt("Nome:", row.name)?.trim();
    if (!nextName) return;
    const payload: Record<string, unknown> = {
      name: nextName,
      updated_at: new Date().toISOString(),
    };
    if (tab === "pantry") {
      const nextQuantity = prompt(
        "Quantidade (vazio para desconhecida):",
        row.quantity?.toString() ?? "",
      );
      const nextUnit = prompt("Unidade:", row.unit ?? "");
      const nextSector = prompt("Setor:", row.sector ?? "Outros");
      const nextExpiry = prompt("Validade (AAAA-MM-DD):", row.expires_at ?? "");
      const nextNotes = prompt("Observações:", row.notes ?? "");
      payload.normalized_name = nextName.toLowerCase();
      payload.quantity = nextQuantity
        ? Number(nextQuantity.replace(",", "."))
        : null;
      payload.unit = nextUnit?.trim() || null;
      payload.sector = nextSector?.trim() || "Outros";
      payload.expires_at = nextExpiry?.trim() || null;
      payload.notes = nextNotes?.trim() || null;
    } else if (tab === "collections") {
      payload.description =
        prompt("Descrição:", row.description ?? "")?.trim() || null;
      payload.icon =
        prompt("Ícone:", row.icon ?? "folder-heart")?.trim() || null;
    } else if (tab === "categories") {
      payload.icon = prompt("Ícone:", row.icon ?? "utensils")?.trim() || null;
    }
    const { error } = await supabase.from(tab).update(payload).eq("id", row.id);
    if (error) notify("error", "Não foi possível editar", error.message);
    else await load();
  }
  async function setStatus(row: Row, status: string) {
    if (!supabase) return;
    const { error } = await supabase
      .from(tab === "imports" ? "recipe_import_jobs" : tab)
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", row.id);
    if (error) notify("error", "Não foi possível atualizar", error.message);
    else await load();
  }
  async function move(row: Row, delta: number) {
    if (!supabase || row.position === undefined) return;
    const ordered = rows
      .filter((item) => item.position !== undefined)
      .sort((a, b) => a.position! - b.position!);
    const index = ordered.findIndex((item) => item.id === row.id);
    const target = ordered[index + delta];
    if (!target) return;
    const table = tab;
    const [{ error }] = await Promise.all([
      supabase
        .from(table)
        .update({ position: target.position })
        .eq("id", row.id),
      supabase
        .from(table)
        .update({ position: row.position })
        .eq("id", target.id),
    ]);
    if (error) notify("error", "Não foi possível reordenar", error.message);
    else await load();
  }
  async function removeImport(row: Row) {
    if (!supabase || !confirm("Excluir este registro de importação?")) return;
    const { error } = await supabase
      .from("recipe_import_jobs")
      .delete()
      .eq("id", row.id);
    if (error) notify("error", "Não foi possível excluir", error.message);
    else await load();
  }
  const visibleRows = useMemo(
    () =>
      rows.filter((row) => {
        const text =
          `${row.name ?? ""} ${row.source_platform ?? ""} ${row.sector ?? ""}`.toLowerCase();
        return (
          text.includes(queryText.toLowerCase()) &&
          (!statusFilter || row.status === statusFilter)
        );
      }),
    [rows, queryText, statusFilter],
  );
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
        <section className="inline-create pantry-form">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={`Nova ${labels[tab].toLowerCase().slice(0, -1)}…`}
            onKeyDown={(event) => {
              if (event.key === "Enter") void create();
            }}
          />
          {tab === "pantry" && (
            <>
              <input
                inputMode="decimal"
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                placeholder="Quantidade"
              />
              <input
                value={unit}
                onChange={(event) => setUnit(event.target.value)}
                placeholder="Unidade"
              />
              <input
                value={sector}
                onChange={(event) => setSector(event.target.value)}
                placeholder="Setor"
              />
              <input
                type="date"
                value={expiresAt}
                onChange={(event) => setExpiresAt(event.target.value)}
                aria-label="Validade"
              />
            </>
          )}
          <button className="button" disabled={!name.trim()} onClick={create}>
            <Plus />
            Adicionar
          </button>
        </section>
      )}
      {(tab === "pantry" || tab === "imports") && (
        <section className="filter-bar organizer-filters">
          <input
            value={queryText}
            onChange={(event) => setQueryText(event.target.value)}
            placeholder="Buscar…"
          />
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            aria-label="Filtrar status"
          >
            <option value="">Todos os estados</option>
            {(tab === "pantry"
              ? ["available", "low", "out", "expired"]
              : [
                  "extracting",
                  "transcribing",
                  "structuring",
                  "completed",
                  "needs_review",
                  "needs_manual_input",
                  "failed",
                  "cancelled",
                ]
            ).map((status) => (
              <option key={status}>{status}</option>
            ))}
          </select>
        </section>
      )}
      {tab === "pantry" && <PantrySuggestions />}
      {loading ? (
        <div className="skeleton-list" aria-label="Carregando">
          <i />
          <i />
          <i />
        </div>
      ) : visibleRows.length === 0 ? (
        <div className="state">
          <PackageOpen />
          <strong>Nenhum item por aqui</strong>
          <p>Adicione o primeiro para começar.</p>
        </div>
      ) : (
        <div className="manage-list">
          {visibleRows.map((row) => (
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
              {tab === "imports" ? (
                <div className="tool-actions">
                  {row.recipe_id && (
                    <a
                      className="button secondary"
                      href={`/receitas/${row.recipe_id}`}
                    >
                      Abrir
                    </a>
                  )}
                  {!["completed", "cancelled"].includes(row.status ?? "") && (
                    <button onClick={() => void setStatus(row, "cancelled")}>
                      Cancelar
                    </button>
                  )}
                  <button onClick={() => void removeImport(row)}>
                    <Trash2 />
                  </button>
                </div>
              ) : (
                !row.is_system && (
                  <div className="tool-actions">
                    <button
                      aria-label={`Editar ${row.name}`}
                      onClick={() => void edit(row)}
                    >
                      <Pencil />
                    </button>
                    {tab === "categories" && (
                      <>
                        <button
                          aria-label="Mover para cima"
                          onClick={() => void move(row, -1)}
                        >
                          <ArrowUp />
                        </button>
                        <button
                          aria-label="Mover para baixo"
                          onClick={() => void move(row, 1)}
                        >
                          <ArrowDown />
                        </button>
                      </>
                    )}
                    {tab === "collections" && (
                      <button
                        onClick={() =>
                          void setStatus(
                            row,
                            row.status === "archived" ? "active" : "archived",
                          )
                        }
                      >
                        {row.status === "archived" ? "Reativar" : "Arquivar"}
                      </button>
                    )}
                    {tab === "pantry" && (
                      <button
                        onClick={() =>
                          void setStatus(
                            row,
                            row.status === "out" ? "available" : "out",
                          )
                        }
                      >
                        {row.status === "out" ? "Disponível" : "Acabou"}
                      </button>
                    )}
                    <button
                      className="icon-button"
                      aria-label={`Excluir ${row.name}`}
                      onClick={() => remove(row)}
                    >
                      <Trash2 />
                    </button>
                  </div>
                )
              )}
            </article>
          ))}
        </div>
      )}
    </>
  );
}
