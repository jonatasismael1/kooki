# Compartilhamento

- Receitas permanecem privadas por padrão.
- `recipe_share_links` usa token aleatório de 192 bits, permite revogação e expiração.
- A Edge Function `public-recipe` devolve apenas título, descrição, porções, ingredientes e passos.
- Notas, histórico, usuário e IDs internos não são expostos.
- Usuário autenticado pode copiar a receita, criando novos IDs e novo proprietário.
