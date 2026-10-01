# CargoWeb Comum

Base compartilhada multi-módulo do CargoWeb.

Este repositório contém somente código reutilizável por dois ou mais módulos ou pelo host e módulos, evitando dependências circulares entre repositórios de negócio.

Módulo Go:

```text
github.com/jefersonMarques/cargoweb-ccomum
```

## Regra de responsabilidade

Entram aqui apenas abstrações e componentes comprovadamente multi-módulo, por exemplo:

- DataGrid genérico;
- primitives reutilizáveis de formulário;
- modal, painel, status e elementos visuais genéricos;
- contratos técnicos estáveis que não pertençam a um domínio de negócio.

Não entram aqui:

- autenticação e sessão do host;
- shell administrativo, sidebar e topbar;
- regras de negócio;
- handlers ou rotas específicas de módulos;
- organizações, unidades, usuários organizacionais, whitelabel ou PGR;
- infraestrutura criada apenas para um consumidor.

## Direção de dependências

```text
cargoweb-cadmin ───────► cargoweb-ccomum
       │
       └───────────────► cargoweb-centidade ─────► cargoweb-ccomum
```

`cargoweb-ccomum` não deve importar `cargoweb-cadmin` nem módulos de negócio.

A base compartilhada deve permanecer pequena, estável e previsível.
