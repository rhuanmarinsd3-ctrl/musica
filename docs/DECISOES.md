# Escopo e decisões da base

O Voz e Sinais começa como uma ferramenta de comunicação em português do Brasil, para diferentes idades. Os controles devem ser fáceis de alcançar, com texto junto às imagens e sem depender de áudio para orientar quem usa.

| Recurso | Decisão | Limite |
| --- | --- | --- |
| Cartões de necessidades e emoções | Conteúdo local com imagem e frase falada ao tocar. | O conjunto inicial é limitado; não representa todas as emoções ou necessidades de cada pessoa. |
| Texto livre para fala | Voz Android pt-BR instalada que funcione sem rede. | Aparelhos sem uma voz local precisam prepará-la primeiro; não usar voz online como alternativa silenciosa. |
| Fala para texto | Demonstração principal `bundled`: modelo Whisper Tiny de português embarcado e processamento local. Variante opcional `device`: reconhecedor explicitamente on-device do Android 12+ quando serviço e idioma locais estão disponíveis. | A demonstração inclui o modelo e não depende do reconhecedor do sistema. Na variante `device`, a escuta fica indisponível sem suporte local compatível. Qualidade e desempenho exigem testes em celulares reais, ainda não executados. |
| Visualização por imagens | Destacar conceitos reconhecidos por palavras-chave e conservar a transcrição. | Não detecta emoção, intenção, ironia ou contexto. Não converte toda frase em imagem equivalente. |
| Visualização por texto | Mostrar a fala reconhecida em texto legível. | A transcrição não é uma garantia do que foi dito. |
| Libras | Reservar espaço para conteúdo local e traduções validadas. | Tradução e avatar não estão implementados. Não simular sinais. |
| Rede e anúncios | Sem conta, servidor, publicidade ou análise de uso no app. | Instalar o app e preparar uma voz do sistema podem exigir conexão. O site tem hospedagem própria. |
| Dados locais | Texto e favoritos no dispositivo; áudio só para reconhecimento temporário. | O projeto desativa backup e exclui transferência de dados; conferir as regras e a limpeza no APK final antes da publicação. |
| Distribuição | Android para Google Play e APK pelo site. | Exige assinatura de produção, testes e processos de publicação ainda não concluídos. |

A demonstração usa a variante `bundled`. O modelo de reconhecimento oficial foi obtido e verificado durante a preparação e acompanha o APK: isso aumenta o tamanho do aplicativo, mas evita um download obrigatório ao iniciar a primeira conversa e a dependência do reconhecedor do sistema. O comportamento em diferentes aparelhos, inclusive em modo avião, ainda precisa ser testado antes de um lançamento público.

O reconhecimento de voz não é equivalente a interpretar Libras. A tradução para Libras precisa levar em conta gramática, contexto, expressões faciais e variantes de uso. Esse trabalho não pode ser validado apenas por um teste de código.

Os arquivos de música preexistentes no repositório são independentes do aplicativo. Não são necessários ao fluxo de comunicação e não devem ser empacotados por conveniência.
