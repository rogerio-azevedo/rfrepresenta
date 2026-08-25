# Modelo de acesso

## Entidades

- `clients`: cadastro comercial e futuro escopo de preço.
- `users`: pessoa com credencial, papel e estado de sessão.
- `auth_login_attempts`: throttling de credenciais sem armazenar e-mail ou IP em claro.

`clients 1:N users` é uma relação permanente. Desativar o cliente bloqueia todos os seus usuários; reativá-lo não reativa usuários desativados individualmente.

## Papéis

- `ADMIN`: administra clientes e acessos; `clientId` é nulo.
- `CLIENT`: acessa somente o contexto do próprio `clientId`.

Não aceite `role` ou `clientId` do navegador para decidir escopo. O DAL resolve ambos a partir da sessão e confirma a linha atual no banco.

## Catálogo e preço

O catálogo ainda não possui modelo aprovado. Qualquer preço futuro deve resolver pelo `clientId` da sessão. Até que produtos, variantes e precedência sejam definidos, não adicione percentuais, tabelas ou preços ao cadastro de acesso.
