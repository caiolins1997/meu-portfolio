#!/bin/sh
# Atualiza o Sistema Vora na VPS com a versão mais recente do GitHub e reconstrói o contêiner.
# Uso (na VPS, como root):  sh /opt/vora-sistema/atualizar.sh
# Os dados (volume vora-data) e o arquivo .env são preservados.
set -e
cd /opt/vora-sistema
echo "Baixando a versão mais recente do GitHub..."
curl -fsSL https://codeload.github.com/caiolins1997/meu-portfolio/tar.gz/refs/heads/main \
  | tar -xz --strip-components=2 meu-portfolio-main/vora-sistema
echo "Reconstruindo o contêiner..."
docker compose up -d --build
echo "Aguardando o sistema responder..."
i=0
until docker exec vora-sistema wget -qO- http://127.0.0.1:3000/admin/api/saude >/dev/null 2>&1; do
  i=$((i + 1)); [ "$i" -gt 30 ] && { echo "O sistema não respondeu. Veja: docker logs vora-sistema"; exit 1; }
  sleep 2
done
echo "Pronto! Sistema atualizado: https://vorapi.com.br/admin"
