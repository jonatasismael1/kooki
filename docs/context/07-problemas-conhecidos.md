# Problemas conhecidos — Kooki

- Integrações externas precisam de credenciais e validação em ambiente conectado.
- YouTube/áudio requerem adapters de legenda/transcrição antes de suporte completo.
- Instagram/TikTok permanecem experimentais: alguns links podem retornar `error.api.fetch.empty` no Cobalt. O fallback permite usar legenda, texto manual ou tentar novamente.
- Carga longa deverá migrar de Edge Function síncrona para worker/queue.
