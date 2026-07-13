import { History, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { LoadingOverlay } from "./feedback";
import { notify } from "./feedback-events";
import { ConfirmDialog } from "./ui";
import { loadRecipeVersions, saveRecipeRevision } from "../lib/recipe-revisions";
import type { RecipeRecord, RecipeVersion } from "../lib/recipes";

export function RecipeVersionHistory({
  recipe,
  onRestored,
}: {
  recipe: RecipeRecord;
  onRestored: (recipe: RecipeRecord) => void;
}) {
  const [versions, setVersions] = useState<RecipeVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState(false);
  const [selected, setSelected] = useState<RecipeVersion | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setVersions(await loadRecipeVersions(recipe.id));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Não foi possível carregar o histórico.");
    } finally {
      setLoading(false);
    }
  }, [recipe.id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function restore() {
    if (!selected) return;
    setRestoring(true);
    try {
      const restored = await saveRecipeRevision(recipe, selected.snapshot);
      onRestored(restored);
      setSelected(null);
      notify("success", "Versão restaurada", "O estado atual também foi preservado no histórico.");
      await load();
    } catch (restoreError) {
      notify(
        "error",
        "Não foi possível restaurar a versão",
        restoreError instanceof Error ? restoreError.message : "Tente novamente.",
      );
    } finally {
      setRestoring(false);
    }
  }

  return (
    <section className="recipe-history" aria-labelledby="recipe-history-title">
      <div className="recipe-history-heading">
        <div>
          <span className="eyebrow">Segurança para editar</span>
          <h2 id="recipe-history-title"><History className="w-5 h-5" /> Histórico de versões</h2>
        </div>
        {!loading && versions.length ? <span>{versions.length} versões</span> : null}
      </div>

      {loading ? <p className="text-sm text-text-secondary">Carregando histórico…</p> : null}
      {error ? (
        <div className="error">
          <span>O histórico não pôde ser carregado. {error}</span>
          <button className="button secondary" onClick={() => void load()}>Tentar novamente</button>
        </div>
      ) : null}
      {!loading && !error && !versions.length ? (
        <p className="text-sm text-text-secondary">
          A primeira versão será criada automaticamente quando esta receita for editada.
        </p>
      ) : null}
      {versions.length ? (
        <div className="recipe-history-list">
          {versions.map((version) => (
            <article key={version.id}>
              <div>
                <strong>{version.label}</strong>
                <span>{new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(version.created_at))}</span>
              </div>
              <button className="button secondary" onClick={() => setSelected(version)}>
                <RotateCcw className="w-4 h-4" /> Restaurar
              </button>
            </article>
          ))}
        </div>
      ) : null}

      <ConfirmDialog
        isOpen={Boolean(selected)}
        title="Restaurar esta versão?"
        description="A versão atual será guardada no histórico antes da restauração, então você poderá voltar atrás."
        confirmLabel="Restaurar versão"
        cancelLabel="Cancelar"
        onConfirm={() => void restore()}
        onCancel={() => setSelected(null)}
      />
      <LoadingOverlay open={restoring} title="Restaurando versão…" />
    </section>
  );
}

export default RecipeVersionHistory;
