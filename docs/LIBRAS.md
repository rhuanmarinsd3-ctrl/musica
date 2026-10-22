# Biblioteca de Libras: próxima etapa

Não há tradução nem avatar implementados nesta versão. O botão Libras informa isso e conserva a transcrição em português. Não mostra movimentos inventados, soletração apresentada como tradução ou sinais por palavra.

Para construir a função solicitada, definir com pessoas surdas e profissionais de Libras:

1. Quais situações e frases precisam ser atendidas primeiro.
2. A tradução de cada frase completa, com seu contexto e as variantes de uso.
3. Vídeo ou animação com mãos, expressões faciais, postura e espaço de sinalização corretos.
4. Autorização de uso e redistribuição dos conteúdos, inclusive dentro de um APK offline.
5. Avaliação de compreensão com o público antes de habilitar o conteúdo.

## Ponto de integração já preparado

A interface pode reproduzir um **vídeo local de uma frase exata** revisada. Isso é uma base de conteúdo limitado, não um tradutor de conversas livres nem um avatar gerador de sinais.

Entradas do catálogo precisam de `phrase`, `video` e `reviewed: true`. O arquivo deve estar em `app/src/main/assets/web/libras/`, com caminho relativo `libras/nome.mp4`. Não incluir vídeos de exemplo com sinais não validados apenas para preencher o recurso.

O código só seleciona uma entrada quando a transcrição inteira corresponde à frase cadastrada, ignorando acentuação, pontuação e caixa. Conserva o texto em português. Esse critério evita apresentar uma tradução cadastrada para parte de uma frase cujo sentido completo pode ser diferente.

Cada entrada publicada deve ter registro separado de autoria, licença, tradutor, revisores, contexto e data de validação. O campo `reviewed` é uma marca de conteúdo aprovado, não uma verificação automática de qualidade.

Um avatar que traduza qualquer conversa em Libras sem internet requer um trabalho adicional de tradução e síntese de movimento; não está concluído por esta integração de vídeos.
