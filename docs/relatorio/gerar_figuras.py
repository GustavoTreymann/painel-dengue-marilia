"""Gera as figuras do relatorio a partir dos dados reais e da captura do painel.
Uso: python docs/relatorio/gerar_figuras.py  (rodar na raiz do repositorio)"""
import json
from pathlib import Path
import numpy as np
import matplotlib
import matplotlib.ticker
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch
from PIL import Image

RAIZ = Path(__file__).resolve().parents[2]
FIG = RAIZ / "docs" / "relatorio" / "figuras"
plt.rcParams.update({"font.family": "DejaVu Serif", "font.size": 11})

# ---------- Figura: arquitetura ----------
fig, ax = plt.subplots(figsize=(10, 3.4))
ax.set_xlim(0, 10); ax.set_ylim(0, 3.4); ax.axis("off")
caixas = [
    (0.1, 1.6, "API pública\nInfoDengue", "#e8eef4"),
    (2.1, 1.6, "Ingestão (ETL)\nnode-cron, diária", "#f4efe6"),
    (4.1, 1.6, "PostgreSQL\nsérie semanal", "#e6f1ea"),
    (6.1, 1.6, "API REST própria\nExpress", "#f4efe6"),
    (8.1, 1.6, "Painel web\nChart.js + tabelas", "#e8eef4"),
    (4.1, 0.1, "Análise de dados\nfunções puras", "#f1e6ee"),
]
for x, y, texto, cor in caixas:
    ax.add_patch(FancyBboxPatch((x, y), 1.8, 1.1, boxstyle="round,pad=0.05", fc=cor, ec="#333"))
    ax.text(x + 0.9, y + 0.55, texto, ha="center", va="center", fontsize=10)
for x0 in (1.9, 3.9, 5.9, 7.9):
    ax.annotate("", xy=(x0 + 0.2, 2.15), xytext=(x0, 2.15), arrowprops=dict(arrowstyle="->", lw=1.5))
ax.annotate("", xy=(6.6, 1.6), xytext=(5.9, 0.65), arrowprops=dict(arrowstyle="->", lw=1.2, ls="--"))
ax.text(0.1, 3.1, "Nuvem: aplicação no Render · banco no Neon · código versionado no GitHub", fontsize=9, color="#444")
fig.tight_layout(); fig.savefig(FIG / "fig-arquitetura.png", dpi=200); plt.close(fig)

# ---------- Dados ----------
bruto = json.loads((RAIZ / "dados" / "infodengue_marilia.json").read_text(encoding="utf-8"))
bruto.sort(key=lambda r: int(r["SE"]))
def serie(campo): return np.array([np.nan if r.get(campo) in (None, "") else float(r[campo]) for r in bruto])
inc = serie("p_inc100k")

def pearson_defasado(clima, k):
    x = clima[: len(clima) - k] if k else clima
    y = inc[k:]
    ok = ~np.isnan(x) & ~np.isnan(y)
    return np.corrcoef(x[ok], y[ok])[0, 1], int(ok.sum())

# ---------- Figura: correlacao por defasagem ----------
variaveis = [("tempmin", "Temperatura mínima"), ("tempmed", "Temperatura média"),
             ("tempmax", "Temperatura máxima"), ("umidmed", "Umidade média")]
estilos = ["-o", "-s", "-^", "--d"]
fig, ax = plt.subplots(figsize=(8, 4.2))
tabela = []
for (campo, nome), est in zip(variaveis, estilos):
    vals = [pearson_defasado(serie(campo), k) for k in range(7)]
    ax.plot(range(7), [v[0] for v in vals], est, label=nome, color="black" if "Temp" in nome else "#555", ms=5)
    tabela.append((nome, [round(v[0], 3) for v in vals]))
ax.set_xlabel("Defasagem (semanas entre o clima e a incidência)")
ax.set_ylabel("Coeficiente de Pearson (r)")
ax.set_ylim(0, 0.6); ax.grid(alpha=0.3); ax.legend(loc="lower right", fontsize=9)
ax.yaxis.set_major_formatter(matplotlib.ticker.FuncFormatter(lambda v, _: f"{v:.1f}".replace(".", ",")))
fig.tight_layout(); fig.savefig(FIG / "fig-correlacao-defasagem.png", dpi=200); plt.close(fig)
for nome, v in tabela: print(nome, v)

# ---------- Recortes da captura do painel ----------
tela = Image.open(FIG / "painel-completo.png")
largura = tela.width
recortes = {"fig-painel-topo.png": (140, 0, 1140, 990),
            "fig-painel-alertas.png": (140, 990, 1140, 1780),
            "fig-painel-clima.png": (140, 1780, 1140, 2485)}
for nome, caixa in recortes.items():
    tela.crop(caixa).save(FIG / nome)
print("ok", tela.size)
