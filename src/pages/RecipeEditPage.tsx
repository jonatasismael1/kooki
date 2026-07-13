import {
  AlertTriangle,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { notify } from "../components/feedback-events";
import { ConfirmDialog, LoadingButton } from "../components/ui";
import { loadRecipeForEditing, saveRecipeRevision } from "../lib/recipe-revisions";
import {
  clearRecipeDraft,
  draftFingerprint,
  draftToSnapshot,
  getReviewHints,
  loadRecipeDraft,
  moveItem,
  recipeToDraft,
  saveRecipeDraft,
  type RecipeEditDraft,
  type RecipeRecord,
  type ReviewField,
  type ReviewHints,
} from "../lib/recipes";

function FieldHint({ field, hints }: { field: ReviewField; hints: ReviewHints }) {
  if (!hints[field]?.length) return null;
  return (
    <div className="review-field-hint" role="note">
      <AlertTriangle className="w-4 h-4" />
      <span>{hints[field]?.join(" ")}</span>
    </div>
  );
}

export function RecipeEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [recipe, setRecipe] = useState<RecipeRecord | null>(null);
  const [draft, setDraft] = useState<RecipeEditDraft | null>(null);
  const [initialFingerprint, setInitialFingerprint] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [draftSavedAt, setDraftSavedAt] = useState<Date | null>(null);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);

  const dirty = Boolean(draft && initialFingerprint && draftFingerprint(draft) !== initialFingerprint);
  const reviewHints = useMemo(() => (recipe ? getReviewHints(recipe) : {}), [recipe]);

  useEffect(() => {
    if (!id) return;
    let active = true;
    setLoading(true);
    loadRecipeForEditing(id)
      .then((loaded) => {
        if (!active) return;
        const originalDraft = recipeToDraft(loaded);
        const savedDraft = loadRecipeDraft(id);
        setRecipe(loaded);
        setDraft(savedDraft ?? originalDraft);
        setInitialFingerprint(draftFingerprint(originalDraft));
        if (savedDraft && draftFingerprint(savedDraft) !== draftFingerprint(originalDraft)) {
          notify("info", "Rascunho recuperado", "Suas alterações não salvas foram restauradas.");
        }
      })
      .catch((loadError) => {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : "Não foi possível carregar a receita.");
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    if (!id || !draft || !dirty) return;
    const timeout = window.setTimeout(() => {
      saveRecipeDraft(id, draft);
      setDraftSavedAt(new Date());
    }, 500);
    return () => window.clearTimeout(timeout);
  }, [dirty, draft, id]);

  useEffect(() => {
    if (!dirty) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (id && draft) saveRecipeDraft(id, draft);
      event.preventDefault();
      event.returnValue = "";
    };
    const handleLink = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const link = target.closest<HTMLAnchorElement>("a[href]");
      if (!link || link.target === "_blank" || link.origin !== window.location.origin) return;
      event.preventDefault();
      setPendingNavigation(`${link.pathname}${link.search}${link.hash}`);
    };
    const handlePopState = () => {
      if (id && draft) saveRecipeDraft(id, draft);
      const shouldLeave = window.confirm(
        "Há alterações ainda não aplicadas à receita. Sair da edição e manter o rascunho?",
      );
      if (!shouldLeave) window.history.forward();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("popstate", handlePopState);
    document.addEventListener("click", handleLink, true);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("popstate", handlePopState);
      document.removeEventListener("click", handleLink, true);
    };
  }, [dirty, draft, id]);

  function updateDraft(update: (current: RecipeEditDraft) => RecipeEditDraft) {
    setDraft((current) => (current ? update(current) : current));
  }

  function requestExit(path: string) {
    if (dirty) setPendingNavigation(path);
    else navigate(path);
  }

  async function save() {
    if (!draft || !recipe || !id) return;
    setSaving(true);
    try {
      const snapshot = draftToSnapshot(draft, recipe.recipe_ingredients);
      const updated = await saveRecipeRevision(recipe, snapshot);
      clearRecipeDraft(id);
      const savedDraft = recipeToDraft(updated);
      setRecipe(updated);
      setDraft(savedDraft);
      setInitialFingerprint(draftFingerprint(savedDraft));
      notify("success", "Receita atualizada", "Uma versão anterior foi guardada no histórico.");
      navigate(`/receitas/${id}`);
    } catch (saveError) {
      notify(
        "error",
        "Não foi possível salvar as alterações",
        saveError instanceof Error ? saveError.message : "Tente novamente.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="state">Carregando editor…</div>;
  }
  if (error || !recipe || !draft || !id) {
    return (
      <div className="state">
        <strong>Não foi possível abrir o editor.</strong>
        <p>{error || "Receita não encontrada."}</p>
        <button className="button secondary" onClick={() => navigate("/receitas")}>Voltar</button>
      </div>
    );
  }

  return (
    <div className="recipe-editor-page">
      <header className="recipe-editor-page-header">
        <button
          className="icon-button"
          aria-label="Voltar para a receita"
          onClick={() => requestExit(`/receitas/${id}`)}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <span className="eyebrow">Edição manual</span>
          <h1>Revisar receita</h1>
          <p>{draftSavedAt ? `Rascunho salvo às ${draftSavedAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : "As alterações são salvas como rascunho neste aparelho."}</p>
        </div>
      </header>

      {reviewHints.general?.length ? (
        <div className="notice" role="note">
          <AlertTriangle className="w-5 h-5" />
          <span>{reviewHints.general.join(" ")}</span>
        </div>
      ) : null}

      <section className="form-card recipe-manual-editor" aria-label="Editar receita manualmente">
        <div className={`review-field ${reviewHints.title?.length ? "has-warning" : ""}`}>
          <label>
            Título da receita
            <input
              value={draft.title}
              onChange={(event) => updateDraft((current) => ({ ...current, title: event.target.value }))}
              disabled={saving}
            />
          </label>
          <FieldHint field="title" hints={reviewHints} />
        </div>

        <div className={`review-field ${reviewHints.description?.length ? "has-warning" : ""}`}>
          <label>
            Descrição
            <textarea
              rows={3}
              value={draft.description}
              onChange={(event) => updateDraft((current) => ({ ...current, description: event.target.value }))}
              disabled={saving}
            />
          </label>
          <FieldHint field="description" hints={reviewHints} />
        </div>

        <div className={`review-field ${reviewHints.servings?.length ? "has-warning" : ""}`}>
          <label>
            Porções
            <input
              type="number"
              min="1"
              step="1"
              inputMode="numeric"
              value={draft.servings}
              onChange={(event) => updateDraft((current) => ({ ...current, servings: event.target.value }))}
              disabled={saving}
            />
          </label>
          <FieldHint field="servings" hints={reviewHints} />
        </div>

        <div className={`recipe-editor-group review-field ${reviewHints.ingredients?.length ? "has-warning" : ""}`}>
          <div className="recipe-editor-heading">
            <div>
              <h2>Ingredientes</h2>
              <FieldHint field="ingredients" hints={reviewHints} />
            </div>
            <button
              type="button"
              className="button secondary"
              disabled={saving}
              onClick={() => updateDraft((current) => ({
                ...current,
                ingredients: [...current.ingredients, {
                  id: crypto.randomUUID(), name: "", normalized_name: null, quantity: null,
                  normalized_unit: null, quantity_text: null, notes: null, sector: "Outros",
                  position: current.ingredients.length,
                }],
              }))}
            >
              <Plus className="w-4 h-4" /> Adicionar
            </button>
          </div>
          {draft.ingredients.length ? (
            <div className="recipe-editor-list">
              {draft.ingredients.map((ingredient, index) => (
                <div className="recipe-editor-row" key={ingredient.id}>
                  <div className="recipe-reorder-actions" aria-label={`Reordenar ingrediente ${index + 1}`}>
                    <button type="button" className="icon-button" aria-label={`Mover ingrediente ${index + 1} para cima`} disabled={saving || index === 0} onClick={() => updateDraft((current) => ({ ...current, ingredients: moveItem(current.ingredients, index, index - 1) }))}><ChevronUp /></button>
                    <button type="button" className="icon-button" aria-label={`Mover ingrediente ${index + 1} para baixo`} disabled={saving || index === draft.ingredients.length - 1} onClick={() => updateDraft((current) => ({ ...current, ingredients: moveItem(current.ingredients, index, index + 1) }))}><ChevronDown /></button>
                  </div>
                  <label>Quantidade<input value={ingredient.quantity_text ?? ""} placeholder="Ex.: 2 xícaras" disabled={saving} onChange={(event) => updateDraft((current) => ({ ...current, ingredients: current.ingredients.map((item, itemIndex) => itemIndex === index ? { ...item, quantity_text: event.target.value } : item) }))} /></label>
                  <label>Ingrediente<input value={ingredient.name} placeholder="Ex.: farinha de trigo" disabled={saving} onChange={(event) => updateDraft((current) => ({ ...current, ingredients: current.ingredients.map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value } : item) }))} /></label>
                  <button type="button" className="icon-button danger" aria-label={`Remover ingrediente ${index + 1}`} disabled={saving} onClick={() => updateDraft((current) => ({ ...current, ingredients: current.ingredients.filter((_, itemIndex) => itemIndex !== index) }))}><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-text-secondary">Nenhum ingrediente. Adicione o primeiro.</p>}
        </div>

        <div className={`recipe-editor-group review-field ${reviewHints.steps?.length ? "has-warning" : ""}`}>
          <div className="recipe-editor-heading">
            <div>
              <h2>Modo de preparo</h2>
              <FieldHint field="steps" hints={reviewHints} />
            </div>
            <button type="button" className="button secondary" disabled={saving} onClick={() => updateDraft((current) => ({ ...current, steps: [...current.steps, { id: crypto.randomUUID(), instruction: "", position: current.steps.length }] }))}><Plus className="w-4 h-4" /> Adicionar</button>
          </div>
          {draft.steps.length ? (
            <div className="recipe-editor-list">
              {draft.steps.map((step, index) => (
                <div className="recipe-editor-row recipe-editor-step" key={step.id}>
                  <div className="recipe-reorder-actions" aria-label={`Reordenar etapa ${index + 1}`}>
                    <button type="button" className="icon-button" aria-label={`Mover etapa ${index + 1} para cima`} disabled={saving || index === 0} onClick={() => updateDraft((current) => ({ ...current, steps: moveItem(current.steps, index, index - 1) }))}><ChevronUp /></button>
                    <button type="button" className="icon-button" aria-label={`Mover etapa ${index + 1} para baixo`} disabled={saving || index === draft.steps.length - 1} onClick={() => updateDraft((current) => ({ ...current, steps: moveItem(current.steps, index, index + 1) }))}><ChevronDown /></button>
                  </div>
                  <span className="recipe-step-number">{index + 1}</span>
                  <label><span className="sr-only">Etapa {index + 1}</span><textarea rows={2} value={step.instruction} placeholder="Descreva esta etapa" disabled={saving} onChange={(event) => updateDraft((current) => ({ ...current, steps: current.steps.map((item, itemIndex) => itemIndex === index ? { ...item, instruction: event.target.value } : item) }))} /></label>
                  <button type="button" className="icon-button danger" aria-label={`Remover etapa ${index + 1}`} disabled={saving} onClick={() => updateDraft((current) => ({ ...current, steps: current.steps.filter((_, itemIndex) => itemIndex !== index) }))}><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-text-secondary">Nenhuma etapa. Adicione a primeira.</p>}
        </div>
      </section>

      <div className="recipe-editor-sticky-actions">
        <button className="button secondary" onClick={() => requestExit(`/receitas/${id}`)} disabled={saving}>Cancelar</button>
        <LoadingButton loading={saving} disabled={!draft.title.trim() || !dirty || saving} onClick={save}>
          <Save className="w-4 h-4" /> Salvar alterações
        </LoadingButton>
      </div>

      <ConfirmDialog
        isOpen={Boolean(pendingNavigation)}
        title="Sair da edição?"
        description="Há alterações que ainda não foram aplicadas à receita. O rascunho ficará salvo neste aparelho para você continuar depois."
        confirmLabel="Sair e manter rascunho"
        cancelLabel="Continuar editando"
        onConfirm={() => {
          const path = pendingNavigation;
          saveRecipeDraft(id, draft);
          setPendingNavigation(null);
          if (path) navigate(path);
        }}
        onCancel={() => setPendingNavigation(null)}
      />
    </div>
  );
}

export default RecipeEditPage;
