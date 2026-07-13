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
import { useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { notify } from "../components/feedback-events";
import { PantrySuggestions } from "../components/pantry-suggestions";
import { ConfirmDialog, Dialog } from "../components/ui";
import {
  importErrorMessage,
  importStatusFilterOptions,
  importStatusLabel,
  pantryStatusFilterOptions,
  pantryStatusLabel,
  platformLabel,
} from "../lib/import-status";

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
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get("tab");
  const [tab, setTab] = useState<Tab>(
    initialTab && initialTab in labels ? (initialTab as Tab) : "categories",
  );
  const [rows, setRows] = useState<Row[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [queryText, setQueryText] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [sector, setSector] = useState("Outros");
  const [expiresAt, setExpiresAt] = useState("");

  // Visual modal states
  const [deleteConfirm, setDeleteConfirm] = useState<Row | null>(null);
  const [deleteImportConfirm, setDeleteImportConfirm] = useState<Row | null>(null);
  const [editingRow, setEditingRow] = useState<Row | null>(null);
  
  // States for the edit form inside Dialog
  const [editFields, setEditFields] = useState<Partial<Row>>({});

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
    if (error) {
      notify(
        "error",
        `Erro ao carregar ${labels[tab].toLowerCase()}`,
        error.message,
      );
    }
    setRows((data as Row[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, [tab]);

  function selectTab(nextTab: Tab) {
    setTab(nextTab);
    setStatusFilter("");
    setQueryText("");
    setSearchParams(nextTab === "categories" ? {} : { tab: nextTab });
  }

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

    if (error) {
      notify("error", "Não foi possível criar", error.message);
    } else {
      notify("success", `${labels[tab].slice(0, -1)} criada`);
      setName("");
      setQuantity("");
      setUnit("");
      setExpiresAt("");
      await load();
    }
  }

  function handleStartEdit(row: Row) {
    setEditingRow(row);
    setEditFields({ ...row });
  }

  async function saveEdits() {
    if (!supabase || !editingRow) return;
    
    const payload: Record<string, any> = {
      name: editFields.name?.trim(),
      updated_at: new Date().toISOString(),
    };

    if (tab === "pantry") {
      payload.normalized_name = editFields.name?.trim().toLowerCase();
      payload.quantity = editFields.quantity ? Number(String(editFields.quantity).replace(",", ".")) : null;
      payload.unit = editFields.unit?.trim() || null;
      payload.sector = editFields.sector?.trim() || "Outros";
      payload.expires_at = editFields.expires_at || null;
      payload.notes = editFields.notes?.trim() || null;
    } else if (tab === "collections") {
      payload.description = editFields.description?.trim() || null;
      payload.icon = editFields.icon?.trim() || "folder-heart";
    } else if (tab === "categories") {
      payload.icon = editFields.icon?.trim() || "utensils";
    }

    const { error } = await supabase.from(tab).update(payload).eq("id", editingRow.id);
    if (error) {
      notify("error", "Não foi possível editar", error.message);
    } else {
      notify("success", "Item atualizado!");
      setEditingRow(null);
      await load();
    }
  }

  async function setStatus(row: Row, status: string) {
    if (!supabase) return;
    const { error } = await supabase
      .from(tab === "imports" ? "recipe_import_jobs" : tab)
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", row.id);
      
    if (error) {
      notify("error", "Não foi possível atualizar", error.message);
    } else {
      await load();
    }
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
    if (error) {
      notify("error", "Não foi possível reordenar", error.message);
    } else {
      await load();
    }
  }

  async function removeImport() {
    if (!supabase || !deleteImportConfirm) return;
    const { error } = await supabase
      .from("recipe_import_jobs")
      .delete()
      .eq("id", deleteImportConfirm.id);
      
    setDeleteImportConfirm(null);
    
    if (error) {
      notify("error", "Não foi possível excluir", error.message);
    } else {
      notify("success", "Registro removido");
      await load();
    }
  }

  async function remove() {
    if (!supabase || !deleteConfirm) return;
    const { error } = await supabase.from(tab).delete().eq("id", deleteConfirm.id);
    setDeleteConfirm(null);
    
    if (error) {
      notify("error", "Não foi possível excluir", error.message);
    } else {
      notify("success", "Item excluído");
      await load();
    }
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

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-6">
      <header className="page-header">
        <div>
          <span className="eyebrow">ORGANIZAÇÃO</span>
          <h1>Configurações e acervo</h1>
        </div>
      </header>

      <div className="tabs organizer-tabs">
        {(Object.keys(labels) as Tab[]).map((key) => (
          <button
            className={tab === key ? "active" : ""}
            onClick={() => selectTab(key)}
            key={key}
          >
            {labels[key]}
          </button>
        ))}
      </div>

      {tab !== "imports" && (
        <section className="form-card p-5">
          <h3 className="text-sm font-serif font-semibold border-b border-border pb-2 mb-2">Adicionar Novo</h3>
          <div className="flex flex-col md:flex-row gap-3">
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={`Nome da ${labels[tab].toLowerCase().slice(0, -1)}…`}
              onKeyDown={(event) => {
                if (event.key === "Enter") void create();
              }}
              style={{ flexGrow: 2 }}
            />
            {tab === "pantry" && (
              <>
                <input
                  inputMode="decimal"
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                  placeholder="Qtd"
                  style={{ flexGrow: 0, width: "100px" }}
                />
                <input
                  value={unit}
                  onChange={(event) => setUnit(event.target.value)}
                  placeholder="Unidade"
                  style={{ flexGrow: 0, width: "120px" }}
                />
                <select
                  value={sector}
                  onChange={(event) => setSector(event.target.value)}
                  style={{ flexGrow: 0, width: "160px" }}
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
                <input
                  type="date"
                  value={expiresAt}
                  onChange={(event) => setExpiresAt(event.target.value)}
                  aria-label="Validade"
                  style={{ flexGrow: 0, width: "160px" }}
                />
              </>
            )}
            <button className="button md:min-w-[140px]" disabled={!name.trim()} onClick={create}>
              <Plus /> Adicionar
            </button>
          </div>
        </section>
      )}

      {(tab === "pantry" || tab === "imports") && (
        <section className="flex flex-col md:flex-row gap-3">
          <input
            value={queryText}
            onChange={(event) => setQueryText(event.target.value)}
            placeholder="Buscar nos itens..."
          />
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            aria-label="Filtrar status"
            className="md:w-[200px]"
          >
            <option value="">Todos os estados</option>
            {(tab === "pantry" ? pantryStatusFilterOptions : importStatusFilterOptions).map((status) => (
              <option key={status} value={status}>
                {tab === "pantry" ? pantryStatusLabel(status) : importStatusLabel(status)}
              </option>
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
          <strong>Nenhum item encontrado</strong>
          <p>Crie um novo item acima para começar.</p>
        </div>
      ) : (
        <div className="manage-list flex flex-col gap-3">
          {visibleRows.map((row) => (
            <article key={row.id} className={`p-4 bg-surface border border-border rounded-xl flex items-center justify-between shadow-sm ${tab === "imports" ? "import-row" : ""}`}>
              <div className="flex items-center gap-3">
                <div className="manage-icon w-10 h-10 rounded-lg bg-surface-muted flex items-center justify-center text-primary">
                  {tab === "collections" ? (
                    <FolderHeart className="w-5 h-5" />
                  ) : tab === "tags" ? (
                    <Tags className="w-5 h-5" />
                  ) : tab === "imports" ? (
                    <Inbox className="w-5 h-5" />
                  ) : tab === "pantry" ? (
                    <PackageOpen className="w-5 h-5" />
                  ) : (
                    <Archive className="w-5 h-5" />
                  )}
                </div>
                <div className="manage-copy">
                  <strong className="block text-sm font-semibold text-text-primary">
                    {row.name ?? (tab === "imports" ? platformLabel(row.source_platform) : row.source_platform) ?? "Importação"}
                  </strong>
                  <span className="text-xs text-text-secondary">
                    {tab === "imports"
                      ? `${importStatusLabel(row.status)} · ${row.current_stage ?? "Aguardando processamento"}`
                      : tab === "pantry"
                        ? `${row.quantity ?? "—"} ${row.unit ?? ""} · ${pantryStatusLabel(row.status)}`
                        : (row.description ??
                          row.type ??
                          (row.is_system ? "Sistema" : "Personalizada"))}
                  </span>
                  {row.error_message && (
                    <small className="import-error-text block text-xs text-destructive mt-0.5">
                      {importErrorMessage(row.error_message)}
                    </small>
                  )}
                </div>
              </div>

              {tab === "imports" ? (
                <div className="import-row-actions flex gap-2">
                  {row.recipe_id && (
                    <a className="button secondary px-3 py-1.5 min-h-0 text-xs" href={`/receitas/${row.recipe_id}`}>
                      Abrir
                    </a>
                  )}
                  {!["completed", "cancelled"].includes(row.status ?? "") && (
                    <button className="button secondary px-3 py-1.5 min-h-0 text-xs text-text-secondary" onClick={() => void setStatus(row, "cancelled")}>
                      Cancelar
                    </button>
                  )}
                  <button className="icon-button danger w-8 h-8 min-w-0 min-h-0" onClick={() => setDeleteImportConfirm(row)}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                !row.is_system && (
                  <div className="flex gap-2">
                    <button
                      className="icon-button w-8 h-8 min-w-0 min-h-0"
                      aria-label={`Editar ${row.name}`}
                      onClick={() => handleStartEdit(row)}
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    {tab === "categories" && (
                      <>
                        <button
                          className="icon-button w-8 h-8 min-w-0 min-h-0"
                          aria-label="Mover para cima"
                          onClick={() => void move(row, -1)}
                        >
                          <ArrowUp className="w-4 h-4" />
                        </button>
                        <button
                          className="icon-button w-8 h-8 min-w-0 min-h-0"
                          aria-label="Mover para baixo"
                          onClick={() => void move(row, 1)}
                        >
                          <ArrowDown className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    {tab === "collections" && (
                      <button
                        className="button secondary px-3 py-1.5 min-h-0 text-xs text-text-secondary"
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
                        className="button secondary px-3 py-1.5 min-h-0 text-xs text-text-secondary"
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
                      className="icon-button danger w-8 h-8 min-w-0 min-h-0"
                      aria-label={`Excluir ${row.name}`}
                      onClick={() => setDeleteConfirm(row)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )
              )}
            </article>
          ))}
        </div>
      )}

      {/* CUSTOM CONFIRM DIALOG FOR DELETION */}
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        title={`Excluir ${labels[tab].slice(0, -1)}`}
        description={`Tem certeza que deseja remover permanentemente “${deleteConfirm?.name}”?`}
        confirmLabel="Remover"
        cancelLabel="Cancelar"
        isDestructive={true}
        onConfirm={remove}
        onCancel={() => setDeleteConfirm(null)}
      />

      <ConfirmDialog
        isOpen={!!deleteImportConfirm}
        title="Excluir Registro de Importação"
        description="Tem certeza que deseja apagar o registro desta importação de mídia?"
        confirmLabel="Remover"
        cancelLabel="Cancelar"
        isDestructive={true}
        onConfirm={removeImport}
        onCancel={() => setDeleteImportConfirm(null)}
      />

      {/* DIALOG FOR EDITING RECORDS */}
      <Dialog isOpen={!!editingRow} onClose={() => setEditingRow(null)} title={`Editar ${labels[tab].slice(0, -1)}`}>
        <div className="flex flex-col gap-4">
          <label>
            Nome
            <input
              value={editFields.name ?? ""}
              onChange={(e) => setEditFields(prev => ({ ...prev, name: e.target.value }))}
            />
          </label>

          {tab === "pantry" && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <label>
                  Quantidade
                  <input
                    type="number"
                    step="any"
                    value={editFields.quantity ?? ""}
                    onChange={(e) => setEditFields(prev => ({ ...prev, quantity: e.target.value ? Number(e.target.value) : null }))}
                  />
                </label>
                <label>
                  Unidade
                  <input
                    value={editFields.unit ?? ""}
                    onChange={(e) => setEditFields(prev => ({ ...prev, unit: e.target.value }))}
                  />
                </label>
              </div>
              <label>
                Setor
                <select
                  value={editFields.sector ?? "Outros"}
                  onChange={(e) => setEditFields(prev => ({ ...prev, sector: e.target.value }))}
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
              <label>
                Validade
                <input
                  type="date"
                  value={editFields.expires_at ?? ""}
                  onChange={(e) => setEditFields(prev => ({ ...prev, expires_at: e.target.value }))}
                />
              </label>
              <label>
                Observações
                <textarea
                  rows={3}
                  value={editFields.notes ?? ""}
                  onChange={(e) => setEditFields(prev => ({ ...prev, notes: e.target.value }))}
                />
              </label>
            </>
          )}

          {tab === "collections" && (
            <>
              <label>
                Descrição
                <input
                  value={editFields.description ?? ""}
                  onChange={(e) => setEditFields(prev => ({ ...prev, description: e.target.value }))}
                />
              </label>
              <label>
                Ícone (Lucide name)
                <input
                  value={editFields.icon ?? ""}
                  onChange={(e) => setEditFields(prev => ({ ...prev, icon: e.target.value }))}
                />
              </label>
            </>
          )}

          {tab === "categories" && (
            <label>
              Ícone
              <input
                value={editFields.icon ?? ""}
                onChange={(e) => setEditFields(prev => ({ ...prev, icon: e.target.value }))}
              />
            </label>
          )}

          <div className="flex justify-end gap-3 mt-4">
            <button className="button secondary" onClick={() => setEditingRow(null)}>
              Cancelar
            </button>
            <button className="button" onClick={saveEdits}>
              Salvar
            </button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
