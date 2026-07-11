# Regras de IA — Kooki

OpenRouter recebe somente conteúdo necessário delimitado como dado não confiável. Nunca recebe secrets. Deve retornar JSON, não inventar, usar `null` quando ausente e gerar avisos. O backend valida schema estrito e recalcula confiança. Ausência de credencial retorna erro real; não há mock de sucesso.
