# Segurança de acesso

- Auth.js usa Credentials e JWT; usuários são persistidos explicitamente com Drizzle.
- Senhas usam Argon2id e nunca são persistidas ou registradas em claro.
- Senhas provisórias aparecem uma vez, exigem troca e não viajam em URL.
- Reset, troca de senha ou mudança de status incrementa `sessionVersion` para invalidar JWTs existentes.
- Toda DAL autenticada confirma usuário ativo, versão da sessão e, para clientes, empresa ativa.
- Erros de login são genéricos e tentativas são limitadas por chave HMAC de e-mail/IP.
- Actions são endpoints públicos: autentique, autorize e valide todo input dentro delas.
- Não registre `DATABASE_URL`, `AUTH_SECRET`, hashes, senhas ou tokens.

O primeiro admin é criado por seed idempotente com variáveis de ambiente. O seed nunca redefine silenciosamente uma conta existente.
