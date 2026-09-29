# Guia de entrega do PI2

O que já está pronto, o que só você pode fazer e em que ordem.

## 1. Relatório Parcial — vence 30/09/2026, 23h59

Arquivo: `docs/relatorio/Relatorio_Parcial_PI2.docx` (PDF ao lado para conferência).

Antes de enviar:

- [ ] Abrir no Word e ler inteiro, ajustando qualquer frase à sua voz
- [ ] Se o AVA pedir PDF, usar o `Relatorio_Parcial_PI2.pdf` ou exportar pelo Word
- [ ] Enviar no AVA (são 3 tentativas; a primeira já pode ser esta versão)

Para regenerar depois de mudar o painel ou os dados:

```bash
python docs/relatorio/gerar_figuras.py
python docs/relatorio/gerar_relatorio.py
powershell -ExecutionPolicy Bypass -File docs/relatorio/atualizar_campos.ps1
```

(`python` = `C:\Users\Gustavo\anaconda3\python.exe`; o painel precisa estar rodando em
`localhost:3123` via `PORT=3123 node scripts/demo-sem-banco.js` para refazer a captura.)

## 2. Plano de Ação — pendente desde a Q2

Arquivo: `docs/relatorio/Plano_de_Acao_PI2.docx`.

- [ ] Trocar `RA: [preencher]` pelo seu RA
- [ ] Conferir as atividades das quinzenas 1 a 3: estão como "conforme calendário do AVA" porque não há
      registro do que você fez antes de 28/09 — ajuste para o que de fato aconteceu
- [ ] Perguntar à tutora se aceita envio em atraso

## 3. Publicar o código no GitHub (requisito "controle de versão")

1. Criar em https://github.com/new um repositório **público** chamado `painel-dengue-marilia`, sem README.
2. No terminal, dentro da pasta do projeto:

```bash
git remote add origin https://github.com/SEU_USUARIO/painel-dengue-marilia.git
git push -u origin main
```

## 4. Publicar o painel na nuvem (requisito "nuvem")

1. **Neon** (https://neon.tech): criar conta gratuita e um projeto; copiar a *connection string*
   (começa com `postgresql://`).
2. **Render** (https://render.com): *New → Blueprint*, apontar para o repositório do GitHub. O
   `render.yaml` já configura tudo; o Render vai pedir o valor de `DATABASE_URL` — colar a string do Neon.
3. Esperar o deploy e abrir a URL. Conferir `/healthz` (deve responder `{"ok":true}`) e o painel.
4. Colocar no topo do `README.md`: `**Painel publicado:** <url>` e fazer commit + push.

Se preferir, me passe a URL do repositório depois de criado que eu faço o push e o ajuste do README.

## 5. Consulta à comunidade (etapa "ouvir" — pesa na nota)

O relatório declara com honestidade que o contexto foi levantado por pesquisa documental. Para o
relatório final, aplicar o questionário do **Apêndice A** do relatório a pelo menos 8 a 10 pessoas
(moradores, agentes de endemias, profissionais de UBS ou de escola), depois de elas usarem o painel.
Um Google Forms anônimo resolve. Guarde as respostas: elas viram a seção de devolutivas do final.

## 6. Vídeo (Q7)

Roteiro em `docs/ROTEIRO_VIDEO.md`.
