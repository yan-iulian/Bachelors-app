"""
Analiza Clusterilor Ierarhici (AC / Hierarchical Clustering)
=============================================================
Adaptat din scriptul original ac.py pentru datele din DB AerYan.

Ce face:
  1. Standardizează scorurile mașinilor
  2. Aplică linkage Ward (minimizează varianța intra-cluster)
  3. Determină nr. optim de clustere (diferența maximă la joncțiune)
  4. Calculează indici Silhouette per mașină și pe partiție
  5. Identifică cluster-ul cel mai potrivit pentru user
  6. Returnează date pentru dendrogramă și histograme
"""

import numpy as np
import pandas as pd
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.cm as cm
import scipy.cluster.hierarchy as hclust
from scipy.cluster.hierarchy import fcluster
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import silhouette_score, silhouette_samples
import io, base64


def fig_to_base64(fig):
    """Convert a matplotlib figure to a base64-encoded PNG string."""
    buf = io.BytesIO()
    fig.savefig(buf, format='png', dpi=150, bbox_inches='tight',
                facecolor='#151022', edgecolor='none')
    plt.close(fig)
    buf.seek(0)
    return base64.b64encode(buf.read()).decode('utf-8')


# Etichete intuitive pentru clustere
CLUSTER_LABELS = {
    1: 'Sportive',
    2: 'Confort & Lux',
    3: 'Economice',
    4: 'Familiale',
    5: 'Versatile',
    6: 'Premium',
    7: 'Urbane',
}

CLUSTER_COLORS = {
    1: '#ef4444',   # red
    2: '#895af6',   # purple
    3: '#22c55e',   # green
    4: '#3b82f6',   # blue
    5: '#f59e0b',   # amber
    6: '#D4AF37',   # gold
    7: '#2DD4BF',   # teal
}


def run_hc_analysis(df, preferinte, active_keys):
    """
    Aplică Hierarchical Clustering pe mașini + identifică cluster-ul utilizatorului.

    Args:
        df: DataFrame cu coloanele din active_keys
        preferinte: dict { 'performanta': 8, ... }
        active_keys: list of criteria keys

    Returns:
        dict cu cluster assignments, dendrogramă, silhouette scores, etc.
    """
    n_cars = len(df)
    if n_cars < 4:
        return {'error': 'Prea puține mașini pentru analiză de clustering', 'clusters': []}

    # Matricea de observații
    X_orig = df[active_keys].values.astype(float)
    scaler = StandardScaler()
    X = scaler.fit_transform(X_orig)

    n = len(X)
    p = n - 1

    # ── Crearea modelului de clusteri ierarhici (metoda Ward) ──
    Z = hclust.linkage(X, method='ward')

    # ── Determinare nr. optim de clustere ──
    # Căutăm joncțiunea cu diferența maximă de distanță
    distances = Z[:, 2]
    diffs = np.diff(distances)
    k_max = np.argmax(diffs[1:]) + 1  # skip first trivial diff
    nr_clusteri = int(min(max(p - k_max, 2), 7))  # clamp between 2 and 7

    # ── Creare partiție cu fcluster ──
    labels = fcluster(Z, nr_clusteri, criterion='maxclust')

    # ── Indici Silhouette ──
    if nr_clusteri >= 2:
        sill_samples = silhouette_samples(X, labels)
        sill_global = float(silhouette_score(X, labels))
    else:
        sill_samples = np.zeros(n)
        sill_global = 0.0

    # ── Joncțiunea cu valoarea maximă ──
    pas_maxim = int(np.argmax(diffs)) + 1
    valoare_prag = float(distances[pas_maxim - 1])

    # ── Assign user to closest cluster ──
    user_vec = np.array([preferinte.get(k, 5) for k in active_keys], dtype=float).reshape(1, -1)
    user_scaled = scaler.transform(user_vec)[0]

    # Calculează centroizii fiecărui cluster
    centroids = {}
    for c_id in range(1, nr_clusteri + 1):
        mask = labels == c_id
        if np.any(mask):
            centroids[c_id] = X[mask].mean(axis=0)

    # Distanță euclidiană user → fiecare centroid
    user_cluster = 1
    min_dist = float('inf')
    cluster_distances = {}
    for c_id, centroid in centroids.items():
        dist = float(np.linalg.norm(user_scaled - centroid))
        cluster_distances[c_id] = round(dist, 4)
        if dist < min_dist:
            min_dist = dist
            user_cluster = c_id

    # ── Construcție response ──

    # Info per cluster
    cluster_info = []
    for c_id in range(1, nr_clusteri + 1):
        mask = labels == c_id
        members = df[mask]
        sill_cluster = float(sill_samples[mask].mean()) if np.any(mask) else 0

        # Profilul mediu al clusterului
        profile = {}
        for key in active_keys:
            profile[key] = round(float(members[key].mean()), 2) if len(members) > 0 else 0

        cluster_info.append({
            'id':           c_id,
            'label':        CLUSTER_LABELS.get(c_id, f'Cluster {c_id}'),
            'color':        CLUSTER_COLORS.get(c_id, '#64748b'),
            'count':        int(mask.sum()),
            'silhouette':   round(sill_cluster, 3),
            'profile':      profile,
            'isUserCluster': c_id == user_cluster,
        })

    # Info per mașină
    car_clusters = []
    for i, (_, row) in enumerate(df.iterrows()):
        car_clusters.append({
            'idMasina':    int(row['idMasina']),
            'marca':       row['marca'],
            'model':       row['model'],
            'an':          int(row.get('anFabricatie', 0)),
            'km':          int(row.get('km', 0)),
            'pret':        float(row.get('pretPromotional', 0) if row.get('esteInPromotie') and row.get('pretPromotional') else row.get('pretEuro', 0)),
            'combustibil': int(row.get('combustibil', 0)),
            'imagine':     row.get('imaginePrincipala', ''),
            'cluster':     int(labels[i]),
            'clusterLabel': CLUSTER_LABELS.get(int(labels[i]), f'Cluster {labels[i]}'),
            'clusterColor': CLUSTER_COLORS.get(int(labels[i]), '#64748b'),
            'silhouette':  round(float(sill_samples[i]), 3),
            'scores':      {k: float(row.get(k, 0)) for k in active_keys},
        })

    # Date pentru dendrogramă (structura de linkage)
    dendrogram_data = {
        'linkageMatrix': Z.tolist(),
        'labels': [f"{row['marca']} {row['model']}" for _, row in df.iterrows()],
    }

    return {
        'nrClusteri':       nr_clusteri,
        'silhouetteGlobal': round(sill_global, 3),
        'pasMaxim':         pas_maxim,
        'valoarePrag':      round(valoare_prag, 4),
        'clusters':         cluster_info,
        'cars':             car_clusters,
        'userCluster':      user_cluster,
        'userClusterLabel': CLUSTER_LABELS.get(user_cluster, f'Cluster {user_cluster}'),
        'clusterDistances': {str(k): v for k, v in cluster_distances.items()},
        'dendrogram':       dendrogram_data,

        # Grafice matplotlib (base64 PNG)
        'charts':            _generate_hc_charts(Z, X, labels, sill_samples, nr_clusteri, active_keys, df),
    }


def _generate_hc_charts(Z, X, labels, sill_samples, nr_clusteri, active_keys, df):
    """Generate all HC charts as base64 PNG images."""
    charts = {}
    colors = {
        'bg': '#151022', 'panel': '#1e1538', 'grid': '#2a2045',
        'text': '#e2e8f0', 'muted': '#94a3b8', 'accent': '#895af6',
        'teal': '#2DD4BF', 'gold': '#D4AF37', 'red': '#ef4444',
    }
    cluster_palette = ['#ef4444', '#895af6', '#22c55e', '#3b82f6', '#f59e0b', '#D4AF37', '#2DD4BF']

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

    car_labels = [f"{row['marca']} {row['model']}" for _, row in df.iterrows()]

    # ── 1. Dendrograma ──
    fig, ax = plt.subplots(figsize=(12, 6))
    hclust.dendrogram(
        Z,
        labels=car_labels,
        leaf_rotation=90,
        leaf_font_size=7,
        color_threshold=Z[-(nr_clusteri - 1), 2] if nr_clusteri > 1 else 0,
        above_threshold_color=colors['muted'],
        ax=ax
    )
    # Linie prag
    if nr_clusteri > 1:
        threshold_y = Z[-(nr_clusteri - 1), 2]
        ax.axhline(y=threshold_y, linestyle='--', color=colors['red'], linewidth=1.5,
                   alpha=0.8, label=f'Prag ({nr_clusteri} clustere)')
        ax.legend(loc='upper right', framealpha=0.3, edgecolor=colors['grid'])
    ax.set_title(f'Dendrograma – {nr_clusteri} Clustere (Metoda Ward)', fontsize=13, fontweight='bold', pad=15)
    ax.set_xlabel('Mașini')
    ax.set_ylabel('Distanța')
    charts['dendrogram'] = fig_to_base64(fig)

    # ── 2. Silhouette Plot ──
    if nr_clusteri >= 2:
        fig, ax = plt.subplots(figsize=(8, 6))
        y_lower = 10
        for c_id in range(1, nr_clusteri + 1):
            mask = labels == c_id
            cluster_sill = np.sort(sill_samples[mask])
            size = cluster_sill.shape[0]
            y_upper = y_lower + size
            color = cluster_palette[(c_id - 1) % len(cluster_palette)]
            ax.fill_betweenx(np.arange(y_lower, y_upper), 0, cluster_sill,
                             facecolor=color, edgecolor=color, alpha=0.7)
            ax.text(-0.05, y_lower + 0.5 * size,
                    CLUSTER_LABELS.get(c_id, f'C{c_id}'),
                    fontsize=8, color=colors['text'], fontweight='bold')
            y_lower = y_upper + 10
        ax.axvline(x=float(np.mean(sill_samples)), linestyle='--', color=colors['red'],
                   linewidth=1.5, label=f'Media: {np.mean(sill_samples):.3f}')
        ax.set_xlabel('Coeficient Silhouette')
        ax.set_ylabel('Mașini (grupate pe clustere)')
        ax.set_title('Silhouette Plot', fontsize=13, fontweight='bold', pad=15)
        ax.set_yticks([])
        ax.legend(loc='upper right', framealpha=0.3, edgecolor=colors['grid'])
        ax.grid(True, axis='x', alpha=0.2)
        charts['silhouette'] = fig_to_base64(fig)

    # ── 3. Histograme primele 3 variabile per cluster ──
    n_vars = min(3, len(active_keys))
    fig, axes = plt.subplots(1, n_vars, figsize=(5 * n_vars, 4))
    if n_vars == 1:
        axes = [axes]
    for i in range(n_vars):
        ax = axes[i]
        var = active_keys[i]
        for c_id in range(1, nr_clusteri + 1):
            mask = labels == c_id
            vals = X[mask, i]
            color = cluster_palette[(c_id - 1) % len(cluster_palette)]
            ax.hist(vals, bins=8, alpha=0.5, color=color,
                    label=CLUSTER_LABELS.get(c_id, f'C{c_id}'), edgecolor='white', linewidth=0.5)
        ax.set_title(var, fontsize=11, fontweight='bold')
        ax.set_xlabel('Valoare (standardizată)')
        ax.set_ylabel('Frecvență')
        ax.legend(fontsize=7, framealpha=0.3, edgecolor=colors['grid'])
        ax.grid(True, axis='y', alpha=0.2)
    fig.suptitle('Distribuția Variabilelor pe Clustere', fontsize=13, fontweight='bold', y=1.02)
    fig.tight_layout()
    charts['histograms'] = fig_to_base64(fig)

    return charts
