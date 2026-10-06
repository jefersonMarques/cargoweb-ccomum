# Arquitetura do CargoWeb Comum

`cargoweb-ccomum` é a base técnica compartilhada entre o host e módulos do CargoWeb.

## Objetivo

Evitar dependências circulares e duplicação de infraestrutura quando uma capacidade técnica é usada por múltiplos módulos.

## Regra de entrada

Um código só deve ser movido para este repositório quando houver uso ou necessidade concreta em mais de um módulo, ou quando sua permanência em um consumidor impedir uma direção de dependência válida.

Não antecipar abstrações para usos hipotéticos.

## Responsabilidades

Exemplos de responsabilidades adequadas:

- DataGrid genérico e seus modelos de estado, paginação, filtros e ordenação;
- primitives reutilizáveis de formulário;
- modal, painel, status e elementos visuais genéricos;
- contratos técnicos estáveis e independentes de domínio;
- transporte HTTP autenticado para APIs técnicas compartilhadas, sem conhecer configuração do host.

## Fora de escopo

Não pertencem a este repositório:

- autenticação de usuários, sessão do host e composição do processo;
- shell administrativo, sidebar e topbar;
- configuração específica do host;
- regras, handlers, rotas, repositories ou views específicas de negócio;
- organizações, unidades, usuários organizacionais, whitelabel e PGR.

## Dependências permitidas

```text
cargoweb-cadmin ───────► cargoweb-ccomum
       │
       └───────────────► cargoweb-centidade ─────► cargoweb-ccomum
```

`cargoweb-ccomum` deve permanecer na base do grafo e não importar `cargoweb-cadmin` nem módulos de negócio.

## Versionamento

Consumidores devem referenciar versão, tag ou pseudo-versão válida em `go.mod` e registrar a resolução em `go.sum`.

Para desenvolvimento simultâneo, usar `go.work` local.

## Distribuição de componentes Templ

Quando o módulo exportar componentes Templ, o arquivo `.templ` permanece como fonte autoritativa, mas o `*_templ.go` correspondente deve ser gerado e versionado. O Go não executa geração de código automaticamente ao baixar uma dependência pelo `go mod`.

Consumidores não devem gerar código dentro do module cache.

## Assets frontend compartilhados

Assets TypeScript comprovadamente multi-módulo pertencem ao `cargoweb-ccomum`.

Cada conjunto carregável pelo host deve declarar `assets/ts/module.json` com:

- `selector`: seletor CSS que indica quando o comportamento é necessário;
- `entry`: entrypoint TypeScript do módulo.

O DataGrid genérico possui sua implementação frontend em `assets/ts` e não deve ser duplicado no host ou em módulos de negócio.


## Cliente de integrações

O pacote `integrationapi` fornece uma chamada JSON genérica para endpoints sob uma mesma API de integrações.

No modo interno, a autenticação técnica ocorre em `auth/relogincargoweb` com os identificadores injetados pelo host. O token permanece somente no processo consumidor, é reutilizado entre chamadas e é renovado quando expira ou quando uma chamada retorna HTTP 401.

O pacote não lê variáveis de ambiente, não conhece usuários autenticados do CargoWeb e não expõe o token ao frontend.
