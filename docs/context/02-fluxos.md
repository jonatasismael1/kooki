# Fluxos — Kooki

1. Login Google ou Magic Link restaura sessão e perfil automático.
2. Receita manual salva diretamente e não consome cota.
3. Link/texto cria job idempotente, valida limite, extrai, chama IA, valida e salva.
4. Baixa confiança abre como `needs_review`; conteúdo insuficiente pede entrada manual.
5. Receitas alimentam Modo Cozinha e consolidação conservadora da lista de compras.
6. Para Instagram/TikTok, a Netlify Function encaminha somente a URL ao Cobalt e devolve seu JSON, sem baixar mídia e sem consumir memória com blobs.
7. O navegador seleciona vídeo/áudio em respostas `redirect`, `tunnel` ou `picker`, baixa diretamente, valida até 100 MB e envia ao bucket privado do usuário.
8. A Edge Function baixa do Storage, transcreve, estrutura a receita e remove o arquivo temporário mesmo quando a transcrição falha.
