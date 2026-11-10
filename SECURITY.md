# Política de segurança

## Reportando uma vulnerabilidade

Não abra uma issue pública. Use o recurso
[Report a vulnerability](https://github.com/llorenzojorge/radar-vagas/security/advisories/new)
do GitHub para enviar o relato de forma privada.

## Credenciais

- Credenciais são lidas exclusivamente de variáveis de ambiente (GitHub Actions Secrets ou `.env` local, ignorado pelo Git).
- O acesso ao Gmail é feito via IMAP em modo somente leitura, com senha de app revogável.
- O bot só processa comandos vindos do chat configurado em `TELEGRAM_CHAT_ID`.
- Mensagens de erro não incluem tokens nem query strings de URLs.
