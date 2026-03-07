"""
Analiza K-Means Clustering
============================
Alternativă la Clustering Ierarhic (AC / Ward) pentru comparație academică.

Ce face:
  1. Aplică K-Means cu diverse valori de K (2..8)
  2. Determină K optim prin Elbow Method (inerția / WCSS)
  3. Calculează Silhouette Score per K + global
  4. Compară cu HC (primește nr_clusteri_hc din request)
  5. Returnează cluster assignments, centroizi, comparație
  6. Generează grafice: Elbow Plot, Scatter 2D (PCA), Radar Centroizi
"""

import numpy as np
import pandas as pd
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans
from sklearn.decomposition import PCA
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


CLUSTER_LABELS = {
    1: 'Sportive',
    2: 'Confort & Lux',
    3: 'Economice',
    4: 'Familiale',
    5: 'Versatile',
    6: 'Premium',
    7: 'Urbane',
}

CLUSTER_COLORS_LIST = ['#ef4444', '#895af6', '#22c55e', '#3b82f6', '#f59e0b', '#D4AF37', '#2DD4BF']


def run_kmeans_analysis(df, preferinte, active_keys, nr_clusteri_hc=None):
    """
    Aplică K-Means Clustering pe mașini + compară cu HC.

    Args:
        df: DataFrame cu coloanele din active_keys
        preferinte: dict { 'performanta': 8, ... }
        active_keys: list of criteria keys
        nr_clusteri_hc: nr optim de clustere determinat de HC (pentru comparație)

    Returns:
        dict cu cluster assignments, elbow data, comparație HC vs KMeans
    """
    n_cars = len(df)
    if n_cars < 4:
        return {'error': 'Prea puține mașini pentru analiză K-Means', 'clusters': []}

    # Matricea de observații
    X_orig = df[active_keys].values.astype(float)
    scaler = StandardScaler()
    X = scaler.fit_transform(X_orig)

    # ── Elbow Method: testăm K de la 2 la min(8, n-1) ──
    k_range = range(2, min(9, n_cars))
    inertias = []
    silhouette_scores = []

    for k in k_range:
        km = KMeans(n_clusters=k, n_init=10, random_state=42, max_iter=300)
        km.fit(X)
        inertias.append(float(km.inertia_))
        sil = float(silhouette_score(X, km.labels_))
        silhouette_scores.append(round(sil, 4))

    # ── Determinare K optim (Elbow = cel mai mare "cot") ──
    # Metoda: a doua derivată a inerțiilor
    inertia_arr = np.array(inertias)
    if len(inertia_arr) >= 3:
        d1 = np.diff(inertia_arr)
        d2 = np.diff(d1)
        k_optimal_elbow = int(list(k_range)[np.argmax(d2) + 2])
    else:
        k_optimal_elbow = 2

    # K optim din Silhouette (max silhouette score)
    k_optimal_sil = int(list(k_range)[np.argmax(silhouette_scores)])

    # Folosim K din Silhouette ca K final (mai robust)
    k_final = k_optimal_sil
    k_final = max(2, min(k_final, 7))

    # ── Rulare K-Means final ──
    km_final = KMeans(n_clusters=k_final, n_init=20, random_state=42, max_iter=500)
    km_final.fit(X)
    labels = km_final.labels_ + 1  # 1-indexed ca la HC

    sill_samples = silhouette_samples(X, km_final.labels_)
    sill_global = float(silhouette_score(X, km_final.labels_))

    # ── PCA pentru vizualizare 2D ──
    pca = PCA(n_components=2)
    X_2d = pca.fit_transform(X)
    explained = pca.explained_variance_ratio_

    # Centroizi proiectați pe PCA
    centroids_scaled = km_final.cluster_centers_
    centroids_2d = pca.transform(centroids_scaled)

    # User proiectat
    user_vec = np.array([preferinte.get(k, 5) for k in active_keys], dtype=float).reshape(1, -1)
    user_scaled = scaler.transform(user_vec)
    user_2d = pca.transform(user_scaled)[0]

    # ── Assign user to closest cluster ──
    user_cluster = 1
    min_dist = float('inf')
    cluster_distances = {}
    for c_id in range(1, k_final + 1):
        centroid = centroids_scaled[c_id - 1]
        dist = float(np.linalg.norm(user_scaled[0] - centroid))
        cluster_distances[c_id] = round(dist, 4)
        if dist < min_dist:
            min_dist = dist
            user_cluster = c_id

    # ── Info per cluster ──
    cluster_info = []
    for c_id in range(1, k_final + 1):
        mask = labels == c_id
        members = df[mask]
        sill_cluster = float(sill_samples[km_final.labels_ == (c_id - 1)].mean()) if np.any(mask) else 0

        # Profilul mediu (pe scoruri originale, nu standardizate)
        profile = {}
        for key in active_keys:
            profile[key] = round(float(members[key].mean()), 2) if len(members) > 0 else 0

        cluster_info.append({
            'id':           c_id,
            'label':        CLUSTER_LABELS.get(c_id, f'Cluster {c_id}'),
            'color':        CLUSTER_COLORS_LIST[(c_id - 1) % len(CLUSTER_COLORS_LIST)],
            'count':        int(mask.sum()),
            'silhouette':   round(sill_cluster, 3),
            'profile':      profile,
            'isUserCluster': c_id == user_cluster,
        })

    # ── Info per mașină ──
    car_clusters = []
    for i, (_, row) in enumerate(df.iterrows()):
        c_id = int(labels[i])
        car_clusters.append({
            'idMasina':     int(row['idMasina']),
            'marca':        row['marca'],
            'model':        row['model'],
            'an':           int(row.get('anFabricatie', 0)),
            'km':           int(row.get('km', 0)),
            'pret':         float(row.get('pretPromotional', 0) if row.get('esteInPromotie') and row.get('pretPromotional') else row.get('pretEuro', 0)),
            'combustibil':  int(row.get('combustibil', 0)),
            'imagine':      row.get('imaginePrincipala', ''),
            'cluster':      c_id,
            'clusterLabel': CLUSTER_LABELS.get(c_id, f'Cluster {c_id}'),
            'clusterColor': CLUSTER_COLORS_LIST[(c_id - 1) % len(CLUSTER_COLORS_LIST)],
            'silhouette':   round(float(sill_samples[i]), 3),
            'scores':       {k: float(row.get(k, 0)) for k in active_keys},
            'x': round(float(X_2d[i, 0]), 4),
            'y': round(float(X_2d[i, 1]), 4),
        })

    # ── Comparație HC vs K-Means ──
    comparatie = None
    if nr_clusteri_hc is not None:
        # Rulăm HC silhouette pentru comparație
        from scipy.cluster.hierarchy import linkage, fcluster
        Z = linkage(X, method='ward')
        hc_labels = fcluster(Z, nr_clusteri_hc, criterion='maxclust')
        hc_sil = float(silhouette_score(X, hc_labels)) if nr_clusteri_hc >= 2 else 0

        # KMeans la aceeași K ca HC
        km_compare = KMeans(n_clusters=nr_clusteri_hc, n_init=10, random_state=42)
        km_compare.fit(X)
        km_sil_at_hc_k = float(silhouette_score(X, km_compare.labels_))

        comparatie = {
            'hcClusters':       nr_clusteri_hc,
            'hcSilhouette':     round(hc_sil, 4),
            'kmClusters':       k_final,
            'kmSilhouette':     round(sill_global, 4),
            'kmAtHcK_Sil':      round(km_sil_at_hc_k, 4),
            'winner':           'K-Means' if sill_global > hc_sil else 'Ward HC',
            'winnerAtSameK':    'K-Means' if km_sil_at_hc_k > hc_sil else 'Ward HC',
        }

    return {
        'nrClusteri':       k_final,
        'kOptimalElbow':    k_optimal_elbow,
        'kOptimalSilhouette': k_optimal_sil,
        'silhouetteGlobal': round(sill_global, 4),
        'clusters':         cluster_info,
        'cars':             car_clusters,
        'userCluster':      user_cluster,
        'userClusterLabel': CLUSTER_LABELS.get(user_cluster, f'Cluster {user_cluster}'),
        'clusterDistances': {str(k): v for k, v in cluster_distances.items()},
        'comparatie':       comparatie,
        'elbow': {
            'kValues':      list(k_range),
            'inertias':     [round(v, 2) for v in inertias],
            'silhouettes':  silhouette_scores,
        },
        'userPosition': {
            'x': round(float(user_2d[0]), 4),
            'y': round(float(user_2d[1]), 4),
        },
        'pcaExplained': [round(float(v) * 100, 2) for v in explained],
        'charts': _generate_kmeans_charts(
            X, X_2d, labels, k_final, k_range, inertias, silhouette_scores,
            sill_samples, centroids_2d, user_2d, explained,
            active_keys, df, centroids_scaled, km_final, preferinte
        ),
    }


def _generate_kmeans_charts(X, X_2d, labels, k_final, k_range, inertias, silhouette_scores,
                            sill_samples, centroids_2d, user_2d, explained,
                            active_keys, df, centroids_scaled, km_final, preferinte):
    """Generate all K-Means charts as base64 PNG images."""
    charts = {}
    colors = {
        'bg': '#151022', 'panel': '#1e1538', 'grid': '#2a2045',
        'text': '#e2e8f0', 'muted': '#94a3b8', 'accent': '#895af6',
        'teal': '#2DD4BF', 'gold': '#D4AF37', 'red': '#ef4444',
        'green': '#22c55e', 'blue': '#3b82f6',
    }

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

    # ── 1. Elbow Plot (Inerția + Silhouette) ──
    fig, ax1 = plt.subplots(figsize=(9, 5))
    k_list = list(k_range)

    # Axa stângă: Inerția (WCSS)
    line1, = ax1.plot(k_list, inertias, 'o-', color=colors['accent'], linewidth=2.5,
                      markersize=8, label='Inerție (WCSS)', zorder=3)
    ax1.fill_between(k_list, inertias, alpha=0.1, color=colors['accent'])
    ax1.set_xlabel('Număr de Clustere (K)', fontsize=11)
    ax1.set_ylabel('Inerție (WCSS)', color=colors['accent'], fontsize=11)
    ax1.tick_params(axis='y', labelcolor=colors['accent'])

    # Marcaj K optim
    k_opt_idx = k_list.index(k_final) if k_final in k_list else 0
    ax1.axvline(x=k_final, linestyle='--', color=colors['red'], linewidth=1.5,
                alpha=0.8, label=f'K optim = {k_final}')
    ax1.plot(k_final, inertias[k_opt_idx], 's', color=colors['red'],
             markersize=14, zorder=5, markeredgecolor='white', markeredgewidth=2)

    # Axa dreaptă: Silhouette Score
    ax2 = ax1.twinx()
    line2, = ax2.plot(k_list, silhouette_scores, 's--', color=colors['teal'], linewidth=2,
                      markersize=7, label='Silhouette Score', zorder=3)
    ax2.set_ylabel('Silhouette Score', color=colors['teal'], fontsize=11)
    ax2.tick_params(axis='y', labelcolor=colors['teal'])

    # Annotare pe punctul optim
    ax2.annotate(f'Sil={silhouette_scores[k_opt_idx]:.3f}',
                 (k_final, silhouette_scores[k_opt_idx]),
                 textcoords="offset points", xytext=(15, 10),
                 fontsize=9, color=colors['teal'], fontweight='bold',
                 arrowprops=dict(arrowstyle='->', color=colors['teal'], lw=1.5))

    ax1.set_xticks(k_list)
    ax1.grid(True, axis='y', alpha=0.15)

    lines = [line1, line2]
    ax1.legend(lines, [l.get_label() for l in lines],
               loc='upper right', framealpha=0.3, edgecolor=colors['grid'])

    fig.suptitle('Metoda Elbow – Determinarea K Optim', fontsize=13, fontweight='bold', y=0.98)
    fig.tight_layout(rect=[0, 0, 1, 0.95])
    charts['elbow'] = fig_to_base64(fig)

    # ── 2. Scatter 2D (PCA) cu clustere K-Means ──
    fig, ax = plt.subplots(figsize=(9, 7))

    for c_id in range(1, k_final + 1):
        mask = labels == c_id
        color = CLUSTER_COLORS_LIST[(c_id - 1) % len(CLUSTER_COLORS_LIST)]
        label_text = CLUSTER_LABELS.get(c_id, f'Cluster {c_id}')
        ax.scatter(X_2d[mask, 0], X_2d[mask, 1], c=color, alpha=0.65, s=60,
                   edgecolors='white', linewidth=0.5, zorder=3, label=f'{label_text} ({mask.sum()})')

        # Câteva etichete
        for i in np.where(mask)[0][:3]:
            row = df.iloc[i]
            ax.annotate(f"{row['marca']} {row['model']}", (X_2d[i, 0], X_2d[i, 1]),
                        fontsize=6, color=colors['muted'], xytext=(5, 5),
                        textcoords='offset points', alpha=0.7)

    # Centroizi
    for c_id in range(k_final):
        color = CLUSTER_COLORS_LIST[c_id % len(CLUSTER_COLORS_LIST)]
        ax.scatter(centroids_2d[c_id, 0], centroids_2d[c_id, 1],
                   marker='D', s=120, c=color, edgecolors='white', linewidth=2, zorder=5)

    # User
    ax.scatter(user_2d[0], user_2d[1], c=colors['teal'], s=250, marker='*',
               edgecolors='white', linewidth=1.5, zorder=6, label='Preferințele Tale')

    ax.axhline(y=0, color=colors['grid'], linewidth=0.5)
    ax.axvline(x=0, color=colors['grid'], linewidth=0.5)
    ax.set_xlabel(f'Componenta PC1 ({explained[0]*100:.1f}%)', fontsize=11)
    ax.set_ylabel(f'Componenta PC2 ({explained[1]*100:.1f}%)', fontsize=11)
    ax.set_title(f'K-Means – {k_final} Clustere (Proiecție PCA)', fontsize=13, fontweight='bold', pad=15)
    ax.legend(loc='upper right', framealpha=0.3, edgecolor=colors['grid'], fontsize=8)
    ax.grid(True, alpha=0.15)
    charts['scatter'] = fig_to_base64(fig)

    # ── 3. Radar Centroizi (profilul mediu per cluster) ──
    n_vars = len(active_keys)
    angles = np.linspace(0, 2 * np.pi, n_vars, endpoint=False).tolist()
    angles += angles[:1]

    fig, ax = plt.subplots(figsize=(8, 8), subplot_kw=dict(polar=True))
    ax.set_facecolor(colors['panel'])
    fig.patch.set_facecolor(colors['bg'])

    # Inversăm standardizarea pentru afișare în scara originală
    for c_id in range(1, k_final + 1):
        mask = labels == c_id
        members = df[mask]
        vals = [float(members[k].mean()) for k in active_keys]
        vals += vals[:1]
        color = CLUSTER_COLORS_LIST[(c_id - 1) % len(CLUSTER_COLORS_LIST)]
        label_text = CLUSTER_LABELS.get(c_id, f'Cluster {c_id}')
        ax.plot(angles, vals, 'o-', color=color, linewidth=2, markersize=5, label=label_text, alpha=0.8)
        ax.fill(angles, vals, color=color, alpha=0.08)

    # User profile
    user_vals = [preferinte.get(k, 5) for k in active_keys]
    user_vals += user_vals[:1]
    ax.plot(angles, user_vals, '*--', color=colors['teal'], linewidth=2.5,
            markersize=10, label='Preferințele Tale', zorder=5)

    ax.set_xticks(angles[:-1])
    ax.set_xticklabels(active_keys, fontsize=9, color=colors['text'])
    ax.set_ylim(0, 10)
    ax.set_yticks([2, 4, 6, 8, 10])
    ax.set_yticklabels(['2', '4', '6', '8', '10'], fontsize=7, color=colors['muted'])
    ax.yaxis.grid(True, color=colors['grid'], alpha=0.3)
    ax.xaxis.grid(True, color=colors['grid'], alpha=0.3)
    ax.spines['polar'].set_color(colors['grid'])

    ax.legend(loc='upper right', bbox_to_anchor=(1.3, 1.1), framealpha=0.3,
              edgecolor=colors['grid'], fontsize=8)
    ax.set_title('Profilul Centroizilor K-Means', fontsize=13, fontweight='bold', pad=25,
                 color=colors['text'])
    charts['radarCentroids'] = fig_to_base64(fig)

    # ── 4. Silhouette Plot (similar cu HC) ──
    fig, ax = plt.subplots(figsize=(8, 6))
    y_lower = 10
    for c_id in range(1, k_final + 1):
        mask = km_final.labels_ == (c_id - 1)
        cluster_sill = np.sort(sill_samples[mask])
        size = cluster_sill.shape[0]
        y_upper = y_lower + size
        color = CLUSTER_COLORS_LIST[(c_id - 1) % len(CLUSTER_COLORS_LIST)]
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
    ax.set_title('Silhouette Plot – K-Means', fontsize=13, fontweight='bold', pad=15)
    ax.set_yticks([])
    ax.legend(loc='upper right', framealpha=0.3, edgecolor=colors['grid'])
    ax.grid(True, axis='x', alpha=0.2)
    charts['silhouette'] = fig_to_base64(fig)

    return charts
