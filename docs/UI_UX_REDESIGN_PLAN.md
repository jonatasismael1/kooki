# Diagnóstico e Plano de Redesign UI/UX — Kooki

Este documento apresenta a auditoria completa da experiência visual do Kooki e define as diretrizes para a reformulação visual premium e mobile-first do aplicativo.

---

## 1. Auditoria e Diagnóstico de Consistências

### A. Espaçamento e Layout
- **Inconsistências**: Os paddings das páginas usam valores genéricos (como `42px 5vw 100px` no desktop e `24px 18px 100px` no mobile). Isso gera desalinhamentos em diferentes viewports e faz com que elementos fiquem colados nos cantos em telas menores.
- **Teclado Virtual**: Os formulários no mobile não adaptam a área de scroll quando o teclado virtual é aberto, ocultando botões de ação e campos ativos.
- **Safe Areas**: A barra de navegação inferior e as barras de ação fixas no mobile não respeitam `env(safe-area-inset-bottom)` de forma robusta, correndo o risco de sobreposição em dispositivos iOS.

### B. Tipografia
- **Fontes**: A combinação atual de uma serif tradicional (`Georgia, serif`) e sans-serif (`Inter`) carece de refinamento visual premium. A hierarquia de títulos e subtítulos é inconsistente em termos de tamanhos e pesos.
- **Proporção**: H1 e H2 têm tamanhos de fonte excessivamente grandes no desktop, ocupando espaço desnecessário e distorcendo a proporção mobile.

### C. Cores e Identidade Visual (Tailwind Tokens)
- **Cores Estáticas**: Cores como o tom de pêssego (`#f8e9df`) e fundo (`#fbf8f4`) estão diretamente codificadas no CSS em vez de estarem centralizadas em tokens globais reutilizáveis do Tailwind CSS v4.
- **Dark Mode**: Falta de consistência nos fundos e superfícies no modo escuro. Cores estáticas quentes (como `#f8e9df` nas sugestões de despensa e `#fff2d7` nos banners) geram contraste desagradável no modo escuro.

### D. Botões e Ações
- **Estados Visuais**: Botões não têm animações sutis de hover/active nem transições de cor suaves.
- **Loading State**: Muitos botões não possuem loaders inline durante as requisições (por exemplo, ao favoritar, salvar notas ou criar itens na despensa), deixando o usuário na dúvida se a ação foi registrada.
- **Controles Nativos (Confirm/Prompt)**: Uso excessivo de `window.confirm` e `window.prompt` nativos do navegador para ações críticas (excluir receitas, deletar notas, rating da cozinha, reordenar). Isso quebra totalmente a sensação de aplicativo móvel premium.

### E. Cards e Skeletons
- **Grade Esticada**: Os cards de receita (`.recipe-card`) esticam imagens e textos em resoluções maiores.
- **Miniaturas de Receita**: Não há imagens reais ou miniaturas elegantes; todas exibem o ícone `ChefHat` padrão em uma caixa cinza/bege.
- **Skeletons**: Os skeletons atuais são apenas blocos cinzas genéricos que piscam. Falta um design que corresponda aos formatos exatos dos cards reais.

### F. Formulários e Inputs
- **Inputs**: Contornos ásperos e falta de estados `:focus-visible` adequados.
- **Seleção de Receitas**: Para gerar listas de compras, as receitas são exibidas como uma linha de checkboxes simples, sem miniaturas ou controle de porções de fácil acesso.

### G. Fluxo de Importação e Jobs
- **Feedback Bloqueante**: A importação abre um modal de carregamento que bloqueia a interação do usuário. O usuário deve ser capaz de minimizar o job ou ver o progresso de forma não bloqueante.
- **Cards de Progresso**: Falta uma seção visualmente rica com o progresso de jobs ativos.

### H. Recursos Difíceis de Encontrar
- **Modo Cozinha**: Fica oculto no rodapé de uma receita longa.
- **Organização**: Gerenciamento de categorias, tags, coleções e despensa está misturado em uma única página "Organizar" de abas simples.
- **Dashboard**: A tela inicial atual é apenas um banner de boas-vindas com 5 botões de atalho gigantes.

---

## 2. Nova Estrutura Visual Premium (Diretrizes)

### A. Tokens de Design (Tailwind CSS v4 `@theme`)
Os tokens serão definidos diretamente no `index.css` usando a diretiva `@theme` do Tailwind CSS v4:
- `background`: Fundo principal acolhedor e leve (`#fbf8f4` | escuro: `#151210`).
- `surface`: Superfícies elevadas (`#ffffff` | escuro: `#201a17`).
- `surface-muted`: Variações secundárias (`#f4eee7` | escuro: `#2c2420`).
- `primary`: Terracota moderno (`#c5522d` | escuro: `#d9653f`).
- `primary-foreground`: Texto claro sobre primary (`#ffffff`).
- `accent`: Detalhes vibrantes (`#e2724a`).
- `border`: Linhas e divisórias (`#e6ded5` | escuro: `#3d332d`).
- `success`: Tons de verde culinário (`#2c6e49`).
- `warning`: Tons quentes de atenção (`#d68c45`).
- `destructive`: Tons de vermelho elegantes (`#a83232`).
- `text-primary`: `#2b241f` (escuro: `#f5ece5`).
- `text-secondary`: `#756b63` (escuro: `#bfaea2`).

### B. Mobile-First (Nativo)
- **Bottom Navigation**: Barra inferior fixa com Início, Receitas, Compras, Planejamento e Perfil. Safe areas integradas.
- **Drawer / Bottom Sheets**: Uso de folhas deslizantes inferiores para filtros, menus de contexto, adição rápida e seleção de categorias.
- **Thumb-Zone**: Botões de ação principais fixados na base da tela (Sticky Action Bar).

### C. Desktop
- **Sidebar**: Navegação elegante no lado esquerdo com atalhos de perfil integrados.
- **Aproveitamento de Tela**: Layouts divididos (two-column) para receitas e listas de compras, evitando que o conteúdo se estique infinitamente.

### D. Novo Dashboard (Home)
1. Saudação personalizada com base na hora do dia.
2. Novo campo de importação destacado com detecção de plataforma e limpeza rápida.
3. Grade compacta de ações rápidas.
4. Jobs de importação ativos e que requerem revisão.
5. Planejamento de refeições do dia corrente.
6. Carrossel de categorias de receitas com contadores de itens.
7. Lista de compras ativa com barra de progresso.
8. Status de cota de importação elegante.

### E. Fluxo de Criação da Lista de Compras
- Seleção de receitas através de um Bottom Sheet ou Drawer completo com miniaturas, busca e controle de porções.
- Agrupamento inteligente de itens consolidados por setor com opções de edição imediata e alertas de unidades de medida incompatíveis.

### F. Lista de Compras Ativa
- Setores recolhíveis com animações suaves.
- Checkboxes grandes (mínimo de 48px de área de toque) com texto tachado ao marcar.
- Atualização otimista com feedbacks micro-interativos.

---

## 3. Plano de Implementação Técnica

### Componentes Reutilizáveis a Criar/Padronizar
- `Drawer` / `Sheet` / `Dialog`: Utilizando Radix UI primitives para total acessibilidade e fluidez.
- `LoadingButton`: Botão com spinner integrado e desativação automática.
- `SkeletonCard`: Layouts de skeleton correspondentes aos cards reais.
- `AppHeader` e `BottomNavigation`: Navegação mobile-first com safe areas.
- `AppToast`: Toasts de notificação consistentes com animações e opções de ação ("desfazer").
