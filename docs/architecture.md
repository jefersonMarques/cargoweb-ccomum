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
- contratos técnicos estáveis e independentes de domínio.

## Fora de escopo

Não pertencem a este repositório:

- autenticação, sessão e composição do processo;
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
