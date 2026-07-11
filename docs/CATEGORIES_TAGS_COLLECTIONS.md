# Categorias, tags e coleções

- Categorias descrevem a receita e podem ser `meal`, `dish`, `diet`, `method` ou `custom`.
- Categorias do sistema são globais, ordenadas e não podem ser alteradas por usuários.
- Tags representam características combináveis e permanecem separadas das categorias.
- Coleções são organizações pessoais; uma receita pode estar em várias coleções.
- Relações muitos-para-muitos usam `recipe_categories`, `recipe_tags` e `collection_recipes`.
- RLS permite leitura de itens do sistema e CRUD somente sobre itens pessoais.
