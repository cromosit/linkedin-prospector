#!/bin/bash
# review.sh — LinkedIn Prospector — Fiscal de Responsabilidade v1.0

DECISOES="decisions.csv"
HOJE=$(date +%Y-%m-%d)
HOJE_SEC=$(date -d "$HOJE" +%s)

echo "🏛️ --- LIVRO NEGRO DAS DECISÕES: REVISÕES PENDENTES --- 🏛️"
echo "--------------------------------------------------------"

# Lê o CSV ignorando o cabeçalho
tail -n +2 "$DECISOES" | while IFS=, read -r data decisao raciocinio resultado revisao status; do
    REV_SEC=$(date -d "$revisao" +%s)
    
    if [ "$REV_SEC" -le "$HOJE_SEC" ]; then
        echo -e "\033[0;31m[REVIEW DUE]\033[0m $data - $decisao"
        echo "    ↳ Raciocínio: $raciocinio"
        echo "    ↳ Esperado: $resultado"
        echo "--------------------------------------------------------"
    fi
done
