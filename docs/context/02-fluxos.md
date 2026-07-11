# Fluxos — Kooki

1. Login Google ou Magic Link restaura sessão e perfil automático.
2. Receita manual salva diretamente e não consome cota.
3. Link/texto cria job idempotente, valida limite, extrai, chama IA, valida e salva.
4. Baixa confiança abre como `needs_review`; conteúdo insuficiente pede entrada manual.
5. Receitas alimentam Modo Cozinha e consolidação conservadora da lista de compras.
6. Para Instagram/TikTok, a Netlify Function solicita ao Cobalt áudio MP3 a 64 kbps e devolve seu JSON, sem baixar mídia e sem consumir memória com `blob`, `arrayBuffer` ou base64.
7. O navegador seleciona áudio em respostas `redirect`, `tunnel` ou `picker`, baixa diretamente, valida até 32 MB e 60 minutos estimados e envia ao bucket privado do usuário.
8. A Edge Function rejeita mídia social que não seja áudio, registra tamanho/duração/etapa, transcreve, estrutura a receita e remove o arquivo temporário mesmo quando falha.
9. Falha de recursos, limite ou extração oferece legenda, texto manual ou nova tentativa; upload manual de até 100 MB continua disponível.
