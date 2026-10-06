# CargoWeb Comum

Base técnica compartilhada do CargoWeb.

Este repositório contém somente código neutro e reutilizável entre contextos ou aplicações CargoWeb.

Módulo Go de desenvolvimento:

```text
github.com/jefersonMarques/cargoweb-ccomum
```

A origem final permanece no namespace canônico do Bitbucket.

## Responsabilidades

Entram aqui capacidades técnicas compartilhadas, por exemplo:

- DataGrid genérico;
- primitives reutilizáveis de formulário e UI;
- formatação de documentos brasileiros;
- consulta técnica de CEP brasileiro via ViaCEP;
- comportamentos genéricos de entrada e validação para documento, telefone, CEP, UF e e-mail;
- contratos técnicos estáveis sem regra de negócio.

Não entram aqui:

- autenticação e sessão do host;
- shell administrativo;
- regras de Cliente, Usuário, Whitelabel, PGR ou outros contextos;
- handlers e rotas de negócio;
- código criado apenas para antecipar uma reutilização futura.

## Direção de dependências

```text
cargoweb-cadmin ───────► cargoweb-ccomum
```

O `cargoweb-ccomum` não importa o host nem áreas de negócio.

A base compartilhada deve permanecer pequena, estável e previsível.

## Documentos brasileiros

O pacote `brdoc` concentra capacidades neutras de documentos brasileiros usadas pelo backend.

Novas validações e formatações compartilhadas de documentos devem evoluir nesse pacote quando não pertencerem a uma regra específica de negócio.

## Frontend compartilhado

`assets/ts` contém comportamentos reutilizáveis carregados pelo host.

Os comportamentos genéricos de formulário ficam em `assets/ts/forms`.

Comportamentos que conheçam um domínio específico permanecem no domínio consumidor.

## Templ em módulo distribuído

Arquivos `.templ` são a fonte de edição.

Como este módulo é consumido via `go mod`, componentes Templ exportados devem ter seus `*_templ.go` gerados e versionados antes de publicar uma versão.

Nunca editar `*_templ.go` manualmente.
