# Problemas conhecidos — Kooki

- Integrações externas precisam de credenciais e validação em ambiente conectado.
- YouTube/áudio requerem adapters de legenda/transcrição antes de suporte completo.
- Instagram/TikTok permanecem experimentais: alguns links podem retornar `error.api.fetch.empty` no Cobalt. O fallback permite usar legenda, texto manual ou tentar novamente.
- O Cobalt ainda pode retornar `error.api.fetch.empty` para Reels bloqueados externamente; o job passa a `needs_manual_input` com fallback.
- A imagem Docker não pôde ser construída localmente nesta máquina porque Docker não está instalado; o mesmo Dockerfile foi construído e executado com sucesso no Railway.
