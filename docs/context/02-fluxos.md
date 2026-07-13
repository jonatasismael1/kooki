# Fluxos — Kooki

1. Login Google ou Magic Link restaura sessão e perfil automático.
2. Receita manual salva diretamente e não consome cota.
3. Link/texto cria job idempotente, valida limite, extrai, chama IA, valida e salva.
4. Baixa confiança abre como `needs_review`; conteúdo insuficiente pede entrada manual.
5. Receitas alimentam Modo Cozinha e consolidação conservadora da lista de compras.
6. O frontend chama somente a Edge Function de início; ela autentica, cria o job e responde 202, sem chamar Cobalt, baixar ou transcrever mídia.
7. Uploads seguem diretamente para o bucket privado por URL assinada. O worker lê o Storage; arquivos não atravessam a Edge Function.
8. Para links sociais/YouTube, o worker pede áudio MP3 a 64 kbps ao Cobalt e cai para vídeo 720p; `tunnel`, `redirect`, `picker` e erros têm tratamento explícito.
9. O worker transmite a mídia ao ffmpeg, normaliza para mono/16 kHz/64 kbps, divide em segmentos de 10 minutos e persiste cada transcrição para retomada.
10. O frontend acompanha por Realtime com polling; falhas oferecem legenda, texto manual, upload ou nova tentativa.
11. A revisão manual usa rota dedicada, rascunho local automático, avisos por campo e proteção ao sair.
12. Antes de salvar ou restaurar uma edição, o banco preserva a versão atual; a receita original gerada pela IA permanece restaurável.
13. Excluir uma receita primeiro a arquiva e oferece “Desfazer”; após a janela de segurança, a exclusão definitiva é retomada mesmo se o app tiver sido fechado.
