# Fisio Valente — site modernizado (demonstração)

Redesenho completo do site do **Centro Terapêutico Fisio Valente** (Olhão, Algarve),
construído como demonstração: HTML, CSS e JavaScript estáticos, sem framework,
sem passo de compilação e sem dependências externas obrigatórias.

```
.
├── index.html            Página inicial (herói em vídeo, serviços, espaço, equipa, testemunhos, FAQ)
├── servicos.html         As cinco áreas clínicas, em detalhe, com tabelas de preços
├── espaco.html           O espaço: vídeo de apresentação e galeria filtrável com lightbox
├── equipa.html           Equipa, princípios de trabalho e história do projeto
├── reservas.html         Sistema de marcações em 4 passos  ← peça central
├── contactos.html        Contactos, formulário, horário e mapa
├── assets/
│   ├── css/styles.css    Design system completo (tokens + componentes)
│   ├── js/main.js        Navegação, animações, galeria, lightbox, FAQ, formulários
│   ├── js/booking.js     Motor de marcações (catálogo, calendário, horários, .ics)
│   ├── img/              Logótipo, ícone e placeholders SVG da marca
│   └── media/            Vídeos ambiente e texturas geradas para o site
├── scripts/
│   ├── generate_assets.py  Gera texturas, imagens e vídeos da marca
│   └── fetch-media.sh      Descarrega as fotografias e converte o site para media local
├── robots.txt · sitemap.xml
```

## Como ver o site

Qualquer servidor estático serve. Abrir os ficheiros diretamente (`file://`) também
funciona, mas um servidor evita restrições do navegador no vídeo e no mapa:

```bash
python3 -m http.server 8080      # depois abrir http://localhost:8080
```

---

## ⚠️ Dois pontos a confirmar com o cliente

1. **Logótipo** — `assets/img/logo.svg`, `logo-light.svg`, `mark.svg` e `favicon.svg` são
   **marcas de substituição**, desenhadas a partir do nome do centro. Basta trocar os
   ficheiros (mantendo os nomes) para o site inteiro passar a usar o logótipo original.
2. **Paleta** — as cores atuais (petróleo/turquesa + areia) são uma proposta coerente com
   o posicionamento clínico. Toda a paleta vive nos *tokens* no topo de
   `assets/css/styles.css`; mudar os valores de `--brand-*` e `--accent-*` reveste o site
   inteiro, sem tocar em mais nada.

```css
:root {
  --brand-700: #0B4F5C;   /* cor principal  */
  --brand-500: #128C99;   /* cor de apoio   */
  --accent-500: #E9B155;  /* cor de destaque */
}
```

Os textos de contacto (telefone, email, redes sociais) são igualmente de demonstração:
procurar por `289 000 000`, `geral@fisiovalente.pt` e `wa.me/351289000000`.

---

## Sistema de marcações (`reservas.html`)

Assistente de quatro passos, inteiramente acessível por teclado:

1. **Serviço** — 17 serviços em 5 categorias, com duração e preço.
2. **Profissional, dia e hora** — o profissional é filtrado pela área do serviço; o
   calendário respeita o horário de funcionamento (encerrado ao domingo), bloqueia dias
   passados, limita as marcações a 3 meses e mostra apenas horários compatíveis com a
   duração do serviço (intervalos de 30 min, com margem de 2 h para o próprio dia).
3. **Dados** — validação campo a campo, com mensagens de erro em português.
4. **Confirmação** — resumo, consentimento RGPD, referência da marcação, download do
   evento em `.ics` (com alarme 2 h antes) e atalho de confirmação por WhatsApp.

A página inicial tem ainda uma caixa de **marcação rápida** que passa serviço e dia por
*query string* (`reservas.html?servico=…&data=…`) e pré-preenche o assistente.

### Ligar a um backend real

Nesta demonstração nada sai do navegador: a marcação é guardada em `localStorage`
(`fv-bookings`) e a disponibilidade é simulada de forma determinística — o mesmo dia
devolve sempre os mesmos horários ocupados.

Para produção há dois pontos a substituir, ambos assinalados no código:

```js
// assets/js/booking.js — submitBooking()
const resposta = await fetch('/api/marcacoes', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ reference, service: s.id, date: state.date, time: state.time,
                         professional: state.professional, ...state.data })
});

// assets/js/booking.js — slotsFor()
// substituir a simulação por GET /api/disponibilidade?data=…&servico=…&profissional=…
```

O formulário de contacto (`assets/js/main.js`, secção 15) segue o mesmo padrão e
funciona tal e qual com serviços como Formspree, Basin ou uma função serverless.

---

## Fotografias e vídeo

- **Vídeos** (`assets/media/ambient-*.mp4`) e **texturas** são originais, gerados por
  `scripts/generate_assets.py` na paleta da marca. Não dependem de terceiros.
- **Fotografias**: as páginas apontam para fotografias de demonstração do Unsplash.
  Qualquer imagem que não carregue passa automaticamente para um *placeholder* da marca
  (`assets/img/ph-*.svg`), pelo que o site nunca mostra imagens partidas.
- **O passo seguinte é substituí-las por fotografias reais do centro e da equipa** — é o
  que mais valoriza a página. Substituir o `src` de cada `<img>`, mantendo o
  `data-fallback`.

Para deixar de depender de serviços externos:

```bash
./scripts/fetch-media.sh        # descarrega as fotografias para assets/media/fotos/
                                # e reescreve o HTML para as usar localmente
```

Para regenerar vídeos e texturas (requer `pillow`, `numpy` e `ffmpeg`):

```bash
python3 scripts/generate_assets.py
```

---

## Detalhes técnicos

**Acessibilidade** — HTML semântico, `skip link`, foco visível, navegação por teclado no
assistente e no lightbox (setas e `Esc`), `aria-expanded`/`aria-controls` no menu e no
acordeão, `aria-live` nas mensagens, contraste conforme WCAG AA e respeito integral por
`prefers-reduced-motion`.

**SEO** — títulos e descrições por página, Open Graph e Twitter Card, `canonical`,
dados estruturados `MedicalClinic` (schema.org) com morada, horário e serviços,
`sitemap.xml` e `robots.txt`.

**Desempenho** — sem frameworks nem bibliotecas; CSS e JS próprios (~45 KB no total, não
minificados), imagens com `loading="lazy"` e `decoding="async"`, vídeos com `preload`
controlado e poster. As únicas dependências externas são os tipos de letra do Google
Fonts (com alternativas de sistema) e as fotografias de demonstração.

**Compatibilidade** — Chrome, Edge, Firefox e Safari recentes; testado de 390 px a
1600 px de largura.

---

## Publicar

Sendo um site estático, serve em qualquer alojamento: Netlify, Vercel, Cloudflare Pages,
GitHub Pages ou o alojamento atual por FTP. Antes de publicar convém rever `SITE` em
`sitemap.xml` e os endereços canónicos das páginas.
