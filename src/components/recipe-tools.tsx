/* oxlint-disable eslint-plugin-react-hooks/exhaustive-deps */
import { useEffect, useState } from "react";
import {
  Camera,
  Check,
  Heart,
  NotebookPen,
  Share2,
  Star,
  Tag,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { notify } from "./feedback-events";
import { RecipeExtras } from "./recipe-extras";
import { compressImage, validateImage } from "../lib/image";
type Option = { id: string; name: string };
export function RecipeTools({
  recipeId,
  isFavorite,
  onFavorite,
}: {
  recipeId: string;
  isFavorite: boolean;
  onFavorite: (value: boolean) => void;
}) {
  const [categories, setCategories] = useState<Option[]>([]);
  const [tags, setTags] = useState<Option[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [notes, setNotes] = useState<
    Array<{ id: string; content: string; created_at: string }>
  >([]);
  const [note, setNote] = useState("");
  const [shareUrl, setShareUrl] = useState("");
  async function load() {
    if (!supabase) return;
    const [cat, tag, rc, rt, noteRows, share] = await Promise.all([
      supabase.from("categories").select("id,name").order("position"),
      supabase.from("tags").select("id,name").order("name"),
      supabase
        .from("recipe_categories")
        .select("category_id")
        .eq("recipe_id", recipeId),
      supabase.from("recipe_tags").select("tag_id").eq("recipe_id", recipeId),
      supabase
        .from("recipe_notes")
        .select("id,content,created_at")
        .eq("recipe_id", recipeId)
        .order("created_at", { ascending: false }),
      supabase
        .from("recipe_share_links")
        .select("token,is_public,revoked_at")
        .eq("recipe_id", recipeId)
        .is("revoked_at", null)
        .maybeSingle(),
    ]);
    setCategories((cat.data as Option[]) ?? []);
    setTags((tag.data as Option[]) ?? []);
    setSelectedCategories((rc.data ?? []).map((row) => row.category_id));
    setSelectedTags((rt.data ?? []).map((row) => row.tag_id));
    setNotes(noteRows.data ?? []);
    if (share.data?.is_public)
      setShareUrl(`${location.origin}/compartilhada/${share.data.token}`);
  }
  useEffect(() => {
    void load();
  }, [recipeId]);
  async function favorite() {
    if (!supabase) return;
    const next = !isFavorite;
    onFavorite(next);
    const { error } = await supabase
      .from("recipes")
      .update({ is_favorite: next })
      .eq("id", recipeId);
    if (error) {
      onFavorite(!next);
      notify("error", "Não foi possível atualizar favorito", error.message);
    } else
      notify(
        "success",
        next ? "Adicionada aos favoritos" : "Removida dos favoritos",
      );
  }
  async function toggle(kind: "category" | "tag", id: string) {
    if (!supabase) return;
    const selected = kind === "category" ? selectedCategories : selectedTags;
    const table = kind === "category" ? "recipe_categories" : "recipe_tags";
    const field = kind === "category" ? "category_id" : "tag_id";
    if (selected.includes(id))
      await supabase
        .from(table)
        .delete()
        .eq("recipe_id", recipeId)
        .eq(field, id);
    else
      await supabase.from(table).insert({ recipe_id: recipeId, [field]: id });
    if (kind === "category")
      setSelectedCategories((values) =>
        values.includes(id)
          ? values.filter((value) => value !== id)
          : [...values, id],
      );
    else
      setSelectedTags((values) =>
        values.includes(id)
          ? values.filter((value) => value !== id)
          : [...values, id],
      );
    notify("success", "Organização atualizada");
  }
  async function addNote() {
    if (!supabase || !note.trim()) return;
    const { error } = await supabase
      .from("recipe_notes")
      .insert({ recipe_id: recipeId, content: note.trim() });
    if (error) notify("error", "Erro ao salvar nota", error.message);
    else {
      setNote("");
      notify("success", "Nota adicionada");
      await load();
    }
  }
  async function editNote(id: string, current: string) {
    if (!supabase) return;
    const content = prompt("Editar nota:", current)?.trim();
    if (!content || content === current) return;
    const { error } = await supabase
      .from("recipe_notes")
      .update({ content, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) notify("error", "Erro ao editar nota", error.message);
    else await load();
  }
  async function deleteNote(id: string) {
    if (!supabase || !confirm("Excluir esta nota?")) return;
    const { error } = await supabase.from("recipe_notes").delete().eq("id", id);
    if (error) notify("error", "Erro ao excluir nota", error.message);
    else await load();
  }
  async function applyNote(content: string) {
    if (!supabase || !confirm("Adicionar esta nota à descrição da receita?"))
      return;
    const { data } = await supabase
      .from("recipes")
      .select("description")
      .eq("id", recipeId)
      .single();
    const description = [data?.description, `Ajuste pessoal: ${content}`]
      .filter(Boolean)
      .join("\n\n");
    const { error } = await supabase
      .from("recipes")
      .update({ description })
      .eq("id", recipeId);
    notify(
      error ? "error" : "success",
      error ? "Erro ao aplicar nota" : "Ajuste aplicado",
      error?.message,
    );
  }
  async function markCooked() {
    if (!supabase) return;
    const rating = Number(prompt("Nota de 1 a 5 (opcional):") || 0) || null;
    const comment = prompt("Como ficou? Observações opcionais:");
    const { error } = await supabase
      .from("recipe_cook_sessions")
      .insert({ recipe_id: recipeId, rating, comment });
    if (error) notify("error", "Erro ao registrar preparo", error.message);
    else notify("success", "Preparo registrado");
  }
  async function share() {
    if (!supabase) return;
    let url = shareUrl;
    if (!url) {
      const { data, error } = await supabase
        .from("recipe_share_links")
        .insert({ recipe_id: recipeId, is_public: true })
        .select("token")
        .single();
      if (error) {
        notify("error", "Erro ao compartilhar", error.message);
        return;
      }
      url = `${location.origin}/compartilhada/${data.token}`;
      setShareUrl(url);
    }
    if (navigator.share)
      await navigator
        .share({ title: "Receita Kooki", url })
        .catch(() => undefined);
    else await navigator.clipboard.writeText(url);
    notify("success", "Link de compartilhamento pronto");
  }
  async function revoke() {
    if (!supabase) return;
    await supabase
      .from("recipe_share_links")
      .update({ revoked_at: new Date().toISOString(), is_public: false })
      .eq("recipe_id", recipeId)
      .is("revoked_at", null);
    setShareUrl("");
    notify("success", "Link revogado");
  }
  async function photo(file: File | null) {
    if (!supabase || !file) return;
    if (file.size > 10 * 1024 * 1024) {
      notify("error", "Foto muito grande", "Limite de 10 MB");
      return;
    }
    if (!(await validateImage(file))) {
      notify(
        "error",
        "Arquivo inválido",
        "O conteúdo não corresponde a uma imagem JPEG, PNG ou WebP.",
      );
      return;
    }
    const optimized = await compressImage(file);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const path = `${user.id}/${recipeId}/${crypto.randomUUID()}-${optimized.name.replace(/[^\w.-]/g, "-")}`;
    const { error } = await supabase.storage
      .from("recipe-photos")
      .upload(path, optimized, { contentType: optimized.type });
    if (error) notify("error", "Erro no upload", error.message);
    else {
      await supabase.from("recipe_photos").insert({
        recipe_id: recipeId,
        storage_path: path,
        alt_text: `Foto da receita`,
      });
      notify("success", "Foto adicionada");
    }
  }
  return (
    <div className="recipe-tools">
      <div className="tool-actions">
        <button
          className="button secondary"
          onClick={favorite}
          aria-pressed={isFavorite}
        >
          <Heart fill={isFavorite ? "currentColor" : "none"} />
          {isFavorite ? "Favorita" : "Favoritar"}
        </button>
        <button className="button secondary" onClick={markCooked}>
          <Check />
          Marcar preparada
        </button>
        <button className="button secondary" onClick={share}>
          <Share2 />
          Compartilhar
        </button>
        {shareUrl && (
          <button className="button secondary" onClick={revoke}>
            Revogar link
          </button>
        )}
        <label className="button secondary file-button">
          <Camera />
          Adicionar foto
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => void photo(event.target.files?.[0] ?? null)}
          />
        </label>
      </div>
      <section>
        <h2>
          <Tag />
          Categorias
        </h2>
        <div className="chip-list">
          {categories.map((item) => (
            <button
              className={selectedCategories.includes(item.id) ? "active" : ""}
              onClick={() => toggle("category", item.id)}
              key={item.id}
            >
              {item.name}
            </button>
          ))}
        </div>
      </section>
      <section>
        <h2>
          <Star />
          Tags
        </h2>
        <div className="chip-list">
          {tags.map((item) => (
            <button
              className={selectedTags.includes(item.id) ? "active" : ""}
              onClick={() => toggle("tag", item.id)}
              key={item.id}
            >
              {item.name}
            </button>
          ))}
        </div>
      </section>
      <section>
        <h2>
          <NotebookPen />
          Notas pessoais
        </h2>
        <div className="note-form">
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="O que você quer lembrar para a próxima vez?"
          />
          <button className="button" disabled={!note.trim()} onClick={addNote}>
            Adicionar nota
          </button>
        </div>
        {notes.length === 0 ? (
          <p className="muted">Nenhuma nota pessoal.</p>
        ) : (
          <div className="notes">
            {notes.map((item) => (
              <article key={item.id}>
                <p>{item.content}</p>
                <small>
                  {new Date(item.created_at).toLocaleDateString("pt-BR")}
                </small>
                <div className="tool-actions">
                  <button onClick={() => void editNote(item.id, item.content)}>
                    Editar
                  </button>
                  <button onClick={() => void applyNote(item.content)}>
                    Aplicar à receita
                  </button>
                  <button onClick={() => void deleteNote(item.id)}>
                    Excluir
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
      <RecipeExtras recipeId={recipeId} />
    </div>
  );
}
