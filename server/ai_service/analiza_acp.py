"""
Analiza Componentelor Principale (ACP / PCA)
=============================================
Adaptat din scriptul original acp.py pentru datele din DB AerYan.

Ce face:
  1. Standardizează scorurile mașinilor (StandardScaler)
  2. Aplică PCA pe toate criteriile active
  3. Returnează:
     - Pozițiile mașinilor în spațiul C1-C2 (pentru scatter plot)
     - Poziția utilizatorului proiectată pe aceleași componente
     - Varianta explicată de fiecare componentă (pentru Scree Plot)
     - Cercul corelațiilor (loadings pe C1, C2)
     - Criterii Kaiser & Cattell
     - Comunalități
"""

import numpy as np
import pandas as pd
import matplotlib
matplotlib.use('Agg')  # Non-interactive backend for server
import matplotlib.pyplot as plt
import seaborn as sb
from sklearn.decomposition import PCA
from sklearn.preprocessing import StandardScaler
import io, base64


def fig_to_base64(fig):
    """Convert a matplotlib figure to a base64-encoded PNG string."""
    buf = io.BytesIO()
    fig.savefig(buf, format='png', dpi=150, bbox_inches='tight',
                facecolor='#151022', edgecolor='none')
    plt.close(fig)
    buf.seek(0)
    return base64.b64encode(buf.read()).decode('utf-8')


def run_pca_analysis(df, preferinte, active_keys):
    """
    Aplică PCA pe mașinile din DataFrame + proiectează user-ul.

    Args:
        df: DataFrame cu coloanele din active_keys
        preferinte: dict { 'performanta': 8, ... }
        active_keys: list of criteria keys

    Returns:
        dict cu toate datele necesare pentru vizualizare
    """
    n_cars = len(df)
    if n_cars < 3:
        return {'error': 'Prea puține mașini pentru analiză PCA', 'cars': []}

    # Matricea de observații (mașini × criterii)
    X_orig = df[active_keys].values.astype(float)
    m, n = X_orig.shape

    # Standardizare
    scaler = StandardScaler()
    X = scaler.fit_transform(X_orig)

    # Crearea modelului PCA
    model_pca = PCA()
    model_pca.fit(X)

    # Valorile proprii (eigenvalues)
    alpha = model_pca.explained_variance_
    explained_ratio = model_pca.explained_variance_ratio_  # procent varianță

    # Componente principale etichete
    n_components = len(alpha)
    etichete = [f'C{i+1}' for i in range(n_components)]

    # Transformare mașini în spațiul componentelor
    C = model_pca.transform(X)

    # Proiectare user pe aceleași componente
    user_vec = np.array([preferinte.get(k, 5) for k in active_keys], dtype=float).reshape(1, -1)
    user_scaled = scaler.transform(user_vec)
    user_C = model_pca.transform(user_scaled)[0]

    # Corelații variabile × componente (loadings)
    r_x_c = np.corrcoef(X, C, rowvar=False)[:n, n:]

    # Comunalități cumulate
    r_sq = r_x_c ** 2
    comunalitati = np.cumsum(r_sq, axis=1)

    # ── Criterii de selectare componente ──

    # Kaiser: componente cu eigenvalue > 1
    kaiser_count = int(np.sum(alpha > 1))

    # Cattell: cotitură pe scree plot
    if n > 2:
        eps = alpha[:-1] - alpha[1:]
        sig = eps[:-1] - eps[1:]
        cattell_idx = np.where(sig < 0)
        cattell_count = int(cattell_idx[0][0] + 1) if len(cattell_idx[0]) > 0 else n
    else:
        cattell_count = n

    # 80% varianță
    cum_var = np.cumsum(explained_ratio)
    var80_count = int(np.argmax(cum_var >= 0.80) + 1)

    # ── Construcție response ──

    # Pozițiile mașinilor pe C1, C2
    car_positions = []
    for i, (_, row) in enumerate(df.iterrows()):
        car_positions.append({
            'idMasina': int(row['idMasina']),
            'marca':    row['marca'],
            'model':    row['model'],
            'label':    f"{row['marca']} {row['model']}",
            'c1':       round(float(C[i, 0]), 4),
            'c2':       round(float(C[i, 1]), 4) if n_components > 1 else 0,
        })

    # Cercul corelațiilor (loadings)
    correlation_circle = []
    for j, key in enumerate(active_keys):
        correlation_circle.append({
            'variable': key,
            'c1': round(float(r_x_c[j, 0]), 4),
            'c2': round(float(r_x_c[j, 1]), 4) if n_components > 1 else 0,
        })

    # Comunalități per variabilă
    comunalitati_data = {}
    for j, key in enumerate(active_keys):
        comunalitati_data[key] = round(float(comunalitati[j, min(1, n_components - 1)]), 4)

    return {
        # Scree Plot data
        'eigenvalues':       [round(float(v), 4) for v in alpha],
        'explainedVariance': [round(float(v) * 100, 2) for v in explained_ratio],
        'cumulativeVariance': [round(float(v) * 100, 2) for v in cum_var],
        'componentLabels':   etichete,

        # Criterii selectare
        'kaiserComponents':  kaiser_count,
        'cattellComponents': cattell_count,
        'variance80Components': var80_count,

        # Scatter plot (C1 vs C2)
        'carPositions':      car_positions,
        'userPosition': {
            'c1': round(float(user_C[0]), 4),
            'c2': round(float(user_C[1]), 4) if n_components > 1 else 0,
        },

        # Cercul corelațiilor
        'correlationCircle': correlation_circle,

        # Comunalități
        'comunalitati':      comunalitati_data,

        # Grafice matplotlib (base64 PNG)
        'charts':            _generate_pca_charts(alpha, explained_ratio, cum_var, C, r_x_c, active_keys, user_C, n, df),
    }


def _generate_pca_charts(alpha, explained_ratio, cum_var, C, r_x_c, active_keys, user_C, n, df):
    """Generate all PCA charts as base64 PNG images."""
    charts = {}
    colors = {
        'bg': '#151022', 'panel': '#1e1538', 'grid': '#2a2045',
        'text': '#e2e8f0', 'muted': '#94a3b8', 'accent': '#895af6',
        'teal': '#2DD4BF', 'gold': '#D4AF37', 'red': '#ef4444',
    }

    # Style for all charts
    plt.rcParams.update({
        'figure.facecolor': colors['bg'],
        'axes.facecolor': colors['panel'],
        'axes.edgecolor': colors['grid'],
        'axes.labelcolor': colors['text'],
        'xtick.color': colors['muted'],
        'ytick.color': colors['muted'],
        'text.color': colors['text'],
        'grid.color': colors['grid'],
        'grid.alpha': 0.3,
        'font.size': 10,
    })

    # ── 1. Scree Plot ──
    fig, ax = plt.subplots(figsize=(8, 4.5))
    x_range = range(1, n + 1)
    ax.bar(x_range, alpha, color=colors['accent'], alpha=0.7, edgecolor=colors['accent'], linewidth=0.5, label='Eigenvalue')
    ax.plot(x_range, alpha, 'o-', color=colors['teal'], markersize=6, linewidth=2, label='Trend')
    ax.axhline(y=1, linestyle='--', color=colors['red'], linewidth=1.5, alpha=0.8, label='Kaiser (λ=1)')
    ax.set_xlabel('Componenta Principală')
    ax.set_ylabel('Eigenvalue (Varianța)')
    ax.set_title('Scree Plot – Varianța Componentelor Principale', fontsize=13, fontweight='bold', pad=15)
    ax.set_xticks(list(x_range))
    ax.set_xticklabels([f'C{i}' for i in x_range])
    for i, (ev, pct) in enumerate(zip(alpha, explained_ratio)):
        ax.annotate(f'{pct*100:.1f}%', (i + 1, ev), textcoords="offset points",
                    xytext=(0, 10), ha='center', fontsize=8, color=colors['teal'])
    ax.legend(loc='upper right', framealpha=0.3, edgecolor=colors['grid'])
    ax.grid(True, axis='y')
    charts['screePlot'] = fig_to_base64(fig)

    # ── 2. Scatter Plot C1 vs C2 ──
    if C.shape[1] >= 2:
        fig, ax = plt.subplots(figsize=(8, 6))
        ax.scatter(C[:, 0], C[:, 1], c=colors['accent'], alpha=0.6, s=50, edgecolors='white', linewidth=0.5, zorder=3)
        # Label some cars
        for i, (_, row) in enumerate(df.iterrows()):
            label = f"{row['marca']} {row['model']}"
            ax.annotate(label, (C[i, 0], C[i, 1]), fontsize=6, color=colors['muted'],
                        xytext=(5, 5), textcoords='offset points', alpha=0.7)
        # User position
        ax.scatter(user_C[0], user_C[1], c=colors['teal'], s=200, marker='*', edgecolors='white',
                   linewidth=1, zorder=5, label='Preferințele Tale')
        ax.axhline(y=0, color=colors['grid'], linewidth=0.5)
        ax.axvline(x=0, color=colors['grid'], linewidth=0.5)
        ax.set_xlabel(f'Componenta C1 ({explained_ratio[0]*100:.1f}%)')
        ax.set_ylabel(f'Componenta C2 ({explained_ratio[1]*100:.1f}%)')
        ax.set_title('Plotul Componentelor Principale (C1 vs C2)', fontsize=13, fontweight='bold', pad=15)
        ax.legend(loc='upper right', framealpha=0.3, edgecolor=colors['grid'])
        ax.grid(True, alpha=0.2)
        charts['scatterPlot'] = fig_to_base64(fig)

    # ── 3. Cercul Corelațiilor ──
    if r_x_c.shape[1] >= 2:
        fig, ax = plt.subplots(figsize=(7, 7))
        x_coord = r_x_c[:, 0]
        y_coord = r_x_c[:, 1]
        ax.scatter(x_coord, y_coord, color=colors['accent'], s=60, edgecolors='white', linewidth=0.5, zorder=3)
        for i in range(len(active_keys)):
            ax.arrow(0, 0, x_coord[i] * 0.95, y_coord[i] * 0.95,
                     color=colors['accent'], alpha=0.8, head_width=0.03, head_length=0.02)
            ax.annotate(active_keys[i], (x_coord[i] * 1.08, y_coord[i] * 1.08),
                        fontsize=9, fontweight='bold', ha='center', color=colors['teal'])
        theta = np.linspace(0, 2 * np.pi, 500)
        ax.plot(np.cos(theta), np.sin(theta), color=colors['gold'], linewidth=1.5, alpha=0.6)
        ax.axhline(y=0, color=colors['grid'], linewidth=0.5, alpha=0.5)
        ax.axvline(x=0, color=colors['grid'], linewidth=0.5, alpha=0.5)
        ax.set_xlim(-1.2, 1.2)
        ax.set_ylim(-1.2, 1.2)
        ax.set_aspect('equal')
        ax.set_xlabel('Componenta C1')
        ax.set_ylabel('Componenta C2')
        ax.set_title('Cercul Corelațiilor', fontsize=13, fontweight='bold', pad=15)
        ax.grid(True, alpha=0.15)
        charts['correlationCircle'] = fig_to_base64(fig)

    # ── 4. Corelograma (Heatmap corelații variabile × componente) ──
    n_show = min(len(alpha), 5)
    etichete_show = [f'C{i+1}' for i in range(n_show)]
    r_show = r_x_c[:, :n_show]
    fig, ax = plt.subplots(figsize=(8, 5))
    rxc_df = pd.DataFrame(r_show, index=active_keys, columns=etichete_show)
    sb.heatmap(rxc_df, vmin=-1, vmax=1, cmap='RdBu_r', center=0, annot=True, fmt='.2f',
               ax=ax, linewidths=0.5, linecolor=colors['grid'],
               cbar_kws={'shrink': 0.8, 'label': 'Corelație'})
    ax.set_title('Corelograma – Variabile × Componente Principale', fontsize=13, fontweight='bold', pad=15)
    ax.set_xlabel('Componente Principale')
    ax.set_ylabel('Variabile')
    ax.tick_params(axis='x', rotation=0)
    ax.tick_params(axis='y', rotation=0)
    charts['correlogram'] = fig_to_base64(fig)

    # ── 5. Comunalități Heatmap ──
    com_show = np.cumsum(r_x_c ** 2, axis=1)[:, :n_show]
    fig, ax = plt.subplots(figsize=(8, 5))
    com_df = pd.DataFrame(com_show, index=active_keys, columns=etichete_show)
    sb.heatmap(com_df, cmap='YlGnBu', annot=True, fmt='.2f',
               ax=ax, linewidths=0.5, linecolor=colors['grid'],
               cbar_kws={'shrink': 0.8, 'label': 'Comunalitate'})
    ax.set_title('Comunalități Cumulate', fontsize=13, fontweight='bold', pad=15)
    ax.set_xlabel('Componente Principale')
    ax.set_ylabel('Variabile')
    ax.tick_params(axis='x', rotation=0)
    ax.tick_params(axis='y', rotation=0)
    charts['comunalitati'] = fig_to_base64(fig)

    return charts
