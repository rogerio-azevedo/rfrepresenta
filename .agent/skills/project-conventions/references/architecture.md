# Arquitetura

O fluxo padrão é `RSC -> DAL -> Drizzle` para leitura e `form -> Server Action -> DAL -> Drizzle` para mutação.

Cada tabela de negócio mantém arquivos equivalentes em schema, validação, DAL e Action quando houver mutações públicas. Infraestruturas internas, como tentativas de login, não precisam de Action ou UI.

Operações compostas são atômicas. A criação de cliente, por exemplo, valida `client` e `user` separadamente; a Action abre a transação e chama a DAL de cada entidade.

Erros esperados retornam estado serializável para o formulário. Falhas de autorização, integridade inesperada e infraestrutura não devem ser mascaradas como sucesso.

Use route groups para layouts sem alterar URL: `(auth)`, `(admin)` e `(client)`. URLs públicas permanecem em português quando já definidas pelo produto.
