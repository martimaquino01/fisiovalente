#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Descarrega para o projeto todas as fotografias remotas usadas nas páginas e
# reescreve o HTML para passar a servi-las localmente (assets/media/fotos/).
#
#   ./scripts/fetch-media.sh
#
# Útil para deixar de depender de serviços externos e para servir as imagens
# com o desempenho e a privacidade do próprio alojamento. Depois de correr,
# basta substituir cada ficheiro em assets/media/fotos/ pela fotografia real
# equivalente do centro, mantendo o nome.
# ---------------------------------------------------------------------------
set -euo pipefail

cd "$(dirname "$0")/.."
DEST="assets/media/fotos"
mkdir -p "$DEST"

# Recolher todos os URLs remotos presentes nos atributos src= e data-lightbox=
mapfile -t URLS < <(grep -ho 'https://images\.unsplash\.com/[^"]*' ./*.html | sort -u)

if [ ${#URLS[@]} -eq 0 ]; then
  echo "Nada a descarregar: o site já usa apenas media local."
  exit 0
fi

echo "A descarregar ${#URLS[@]} fotografias para $DEST …"

for url in "${URLS[@]}"; do
  # nome estável a partir do identificador da fotografia e da largura pedida
  id=$(sed -E 's|.*/photo-([a-zA-Z0-9_-]+).*|\1|' <<< "$url")
  w=$(sed -E 's|.*[?&]w=([0-9]+).*|\1|' <<< "$url")
  file="$DEST/foto-${id}-${w}.jpg"
  if [ -f "$file" ]; then
    echo "  = $file (já existe)"
  elif curl -fsSL --max-time 60 "$url" -o "$file"; then
    echo "  + $file ($(du -h "$file" | cut -f1))"
  else
    echo "  ! falhou: $url" >&2
    continue
  fi
  # apontar o HTML para o ficheiro local
  for page in ./*.html; do
    python3 - "$page" "$url" "$file" <<'PY'
import io, sys
page, url, local = sys.argv[1], sys.argv[2], sys.argv[3]
s = io.open(page, encoding="utf-8").read()
if url in s:
    io.open(page, "w", encoding="utf-8").write(s.replace(url, local))
PY
  done
done

echo
echo "Concluído. As páginas passaram a usar as imagens de $DEST."
echo "Substitua agora cada ficheiro pela fotografia real correspondente."
