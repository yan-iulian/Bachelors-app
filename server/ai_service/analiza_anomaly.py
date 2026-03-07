"""
Anomaly Detection – Identificare Mașini Sub/Supraevaluate
==========================================================
Combină Isolation Forest + Z-Score Analysis pentru a detecta mașini
care au scoruri de calitate neobișnuit de mari față de preț (chilipiruri)
sau preț neobișnuit de mare față de calitate (supraevaluate).

Ce face:
  1. Calculează un „Quality Score" compozit din cele 7 criterii
  2. Aplică Isolation Forest pe spațiul (quality, pret) 
  3. Calculează Z-Score ratio (quality / preț normalizat)
  4. Clasifică: Chilipir, Supraevaluat, Normal, Outlier Pur
  5. Generează grafice: Scatter Quality vs Preț, Box Plot, Distribuție Anomalii
"""

import numpy as np
import pandas as pd
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from sklearn.preprocessing import StandardScaler, MinMaxScaler
from sklearn.ensemble import IsolationForest
from scipy import stats
import io, base64


def fig_to_base64(fig):
    """Convert a matplotlib figure to a base64-encoded PNG string."""
    buf = io.BytesIO()
    fig.savefig(buf, format='png', dpi=150, bbox_inches='tight',
                facecolor='#151022', edgecolor='none')
    plt.close(fig)
    buf.seek(0)
    return base64.b64encode(buf.read()).decode('utf-8')


ANOMALY_TYPES = {
    'chilipir':       {'label': 'Chilipir',       'color': '#22c55e', 'icon': 'local_offer'},
    'supraevaluat':   {'label': 'Supraevaluată',  'color': '#ef4444', 'icon': 'trending_up'},
    'outlier':        {'label': 'Outlier',         'color': '#f59e0b', 'icon': 'warning'},
    'normal':         {'label': 'Normal',          'color': '#64748b', 'icon': 'check_circle'},
}


def run_anomaly_detection(df, active_keys):
    """
    Detectează mașini anomale (chilipiruri sau supraevaluate).

    Args:
        df: DataFrame cu coloanele din active_keys + pretEuro, pretPromotional etc.
        active_keys: list of criteria keys

    Returns:
        dict cu anomaliile detectate, scoruri, grafice
    """
    n_cars = len(df)
    if n_cars < 5:
        return {'error': 'Prea puține mașini pentru anomaly detection', 'anomalies': []}

    # ── 1. Calculăm Quality Score compozit ──
    quality_scores = df[active_keys].values.astype(float).mean(axis=1)  # Media pe 7 criterii (0-10)

    # Prețul efectiv
    prices = df.apply(
        lambda r: r['pretPromotional'] if r.get('esteInPromotie') and r.get('pretPromotional') else r['pretEuro'],
        axis=1
    ).values.astype(float)

    # ── 2. Normalizare pentru Isolation Forest ──
    scaler = MinMaxScaler()
    X_norm = scaler.fit_transform(np.column_stack([quality_scores, prices]))

    # ── 3. Isolation Forest ──
    iso = IsolationForest(
        n_estimators=200,
        contamination=0.15,     # ~15% anomalii
        random_state=42,
        max_features=1.0
    )
    iso_labels = iso.fit_predict(X_norm)  # 1 = normal, -1 = anomaly
    iso_scores = iso.decision_function(X_norm)  # Mai mic = mai anomal

    # ── 4. Z-Score value ratio ──
    # Value Ratio = Quality / Price (normat) → cu cât e mai mare, cu atât e mai bun deal
    q_z = stats.zscore(quality_scores)
    p_z = stats.zscore(prices)
    value_ratio = q_z - p_z  # Pozitiv = calitate > preț (chilipir), Negativ = preț > calitate

    # ── 5. Clasificare anomalii ──
    anomaly_types = []
    for i in range(n_cars):
        if iso_labels[i] == -1:
            # E anomalie — dar de ce tip?
            if value_ratio[i] > 0.5:
                anomaly_types.append('chilipir')
            elif value_ratio[i] < -0.5:
                anomaly_types.append('supraevaluat')
            else:
                anomaly_types.append('outlier')
        else:
            anomaly_types.append('normal')

    # ── 6. Construcție response ──
    cars_data = []
    for i, (_, row) in enumerate(df.iterrows()):
        atype = anomaly_types[i]
        pret_actual = float(prices[i])
        q_score = float(quality_scores[i])

        cars_data.append({
            'idMasina':       int(row['idMasina']),
            'marca':          row['marca'],
            'model':          row['model'],
            'an':             int(row.get('anFabricatie', 0)),
            'km':             int(row.get('km', 0)),
            'pret':           pret_actual,
            'combustibil':    int(row.get('combustibil', 0)),
            'imagine':        row.get('imaginePrincipala', ''),
            'qualityScore':   round(q_score, 2),
            'valueRatio':     round(float(value_ratio[i]), 3),
            'isoScore':       round(float(iso_scores[i]), 4),
            'anomalyType':    atype,
            'anomalyLabel':   ANOMALY_TYPES[atype]['label'],
            'anomalyColor':   ANOMALY_TYPES[atype]['color'],
            'scores':         {k: float(row.get(k, 0)) for k in active_keys},
        })

    # Sortare: chilipiruri primele, apoi outliers, apoi supraevaluate
    priority = {'chilipir': 0, 'outlier': 1, 'supraevaluat': 2, 'normal': 3}
    cars_data.sort(key=lambda x: (priority.get(x['anomalyType'], 3), -x['valueRatio']))

    # Statistici sumar
    n_chilipir = sum(1 for c in cars_data if c['anomalyType'] == 'chilipir')
    n_supra = sum(1 for c in cars_data if c['anomalyType'] == 'supraevaluat')
    n_outlier = sum(1 for c in cars_data if c['anomalyType'] == 'outlier')
    n_normal = sum(1 for c in cars_data if c['anomalyType'] == 'normal')

    # Medii
    avg_quality = float(np.mean(quality_scores))
    avg_price = float(np.mean(prices))
    median_price = float(np.median(prices))

    return {
        'totalCars':    n_cars,
        'nChilipir':    n_chilipir,
        'nSupraevaluat': n_supra,
        'nOutlier':     n_outlier,
        'nNormal':      n_normal,
        'avgQuality':   round(avg_quality, 2),
        'avgPrice':     round(avg_price, 0),
        'medianPrice':  round(median_price, 0),
        'cars':         cars_data,
        'charts':       _generate_anomaly_charts(
            quality_scores, prices, value_ratio, iso_labels, iso_scores,
            anomaly_types, df, active_keys
        ),
    }


def _generate_anomaly_charts(quality_scores, prices, value_ratio, iso_labels, iso_scores,
                             anomaly_types, df, active_keys):
    """Generate all Anomaly Detection charts as base64 PNG images."""
    charts = {}
    colors = {
        'bg': '#151022', 'panel': '#1e1538', 'grid': '#2a2045',
        'text': '#e2e8f0', 'muted': '#94a3b8', 'accent': '#895af6',
        'teal': '#2DD4BF', 'gold': '#D4AF37', 'red': '#ef4444',
        'green': '#22c55e', 'amber': '#f59e0b',
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

    type_colors = {
        'chilipir': colors['green'],
        'supraevaluat': colors['red'],
        'outlier': colors['amber'],
        'normal': '#64748b',
    }
    type_labels = {
        'chilipir': 'Chilipir (calitate/preț ↑)',
        'supraevaluat': 'Supraevaluat (preț/calitate ↑)',
        'outlier': 'Outlier (atipic)',
        'normal': 'Normal',
    }

    prices_k = prices / 1000  # Euro în k€

    # ── 1. Scatter: Calitate vs Preț ──
    fig, ax = plt.subplots(figsize=(10, 7))

    for atype in ['normal', 'outlier', 'supraevaluat', 'chilipir']:
        mask = np.array(anomaly_types) == atype
        if not np.any(mask):
            continue
        s = 40 if atype == 'normal' else 100
        alpha = 0.3 if atype == 'normal' else 0.85
        marker = 'o' if atype == 'normal' else ('D' if atype == 'chilipir' else ('^' if atype == 'supraevaluat' else 's'))
        ax.scatter(prices_k[mask], quality_scores[mask], c=type_colors[atype],
                   s=s, alpha=alpha, marker=marker, edgecolors='white', linewidth=0.5,
                   zorder=4 if atype != 'normal' else 2, label=type_labels[atype])

    # Etichete pe anomalii
    for i in range(len(df)):
        if anomaly_types[i] != 'normal':
            row = df.iloc[i]
            ax.annotate(f"{row['marca']} {row['model']}",
                        (prices_k[i], quality_scores[i]),
                        fontsize=7, color=type_colors[anomaly_types[i]],
                        xytext=(8, 6), textcoords='offset points',
                        fontweight='bold', alpha=0.9)

    # Trendline
    z = np.polyfit(prices_k, quality_scores, 1)
    p = np.poly1d(z)
    x_trend = np.linspace(prices_k.min(), prices_k.max(), 100)
    ax.plot(x_trend, p(x_trend), '--', color=colors['accent'], linewidth=1.5,
            alpha=0.6, label='Trend Liniar')

    ax.set_xlabel('Preț (k€)', fontsize=12)
    ax.set_ylabel('Quality Score (media criteriilor)', fontsize=12)
    ax.set_title('Anomaly Detection – Calitate vs. Preț', fontsize=14, fontweight='bold', pad=15)
    ax.legend(loc='lower right', framealpha=0.3, edgecolor=colors['grid'], fontsize=9)
    ax.grid(True, alpha=0.15)
    charts['scatterQualityPrice'] = fig_to_base64(fig)

    # ── 2. Value Ratio Distribution ──
    fig, ax = plt.subplots(figsize=(9, 5))
    vr = np.array(value_ratio)

    for atype in ['normal', 'outlier', 'supraevaluat', 'chilipir']:
        mask = np.array(anomaly_types) == atype
        if not np.any(mask):
            continue
        ax.scatter(np.arange(len(vr))[mask], vr[mask], c=type_colors[atype],
                   s=60, alpha=0.7, edgecolors='white', linewidth=0.5, zorder=3,
                   label=type_labels[atype])

    ax.axhline(y=0, color=colors['muted'], linewidth=1, alpha=0.5)
    ax.axhline(y=0.5, color=colors['green'], linewidth=1, linestyle='--', alpha=0.4, label='Prag Chilipir')
    ax.axhline(y=-0.5, color=colors['red'], linewidth=1, linestyle='--', alpha=0.4, label='Prag Supraevaluat')

    # Etichete anomalii
    for i in range(len(df)):
        if anomaly_types[i] != 'normal':
            row = df.iloc[i]
            ax.annotate(f"{row['marca']} {row['model']}", (i, vr[i]),
                        fontsize=6, color=type_colors[anomaly_types[i]],
                        xytext=(5, 8 if vr[i] > 0 else -12), textcoords='offset points',
                        fontweight='bold', alpha=0.8)

    ax.set_xlabel('Index Mașină', fontsize=11)
    ax.set_ylabel('Value Ratio (Z-Quality − Z-Preț)', fontsize=11)
    ax.set_title('Distribuția Value Ratio – Isolation Forest', fontsize=13, fontweight='bold', pad=15)
    ax.legend(loc='upper right', framealpha=0.3, edgecolor=colors['grid'], fontsize=8)
    ax.grid(True, alpha=0.15, axis='y')
    charts['valueRatioDistribution'] = fig_to_base64(fig)

    # ── 3. Box Plot: Criteriile per tip anomalie ──
    fig, axes = plt.subplots(1, min(4, len(active_keys)), figsize=(4 * min(4, len(active_keys)), 5))
    if not hasattr(axes, '__iter__'):
        axes = [axes]

    show_keys = active_keys[:4]
    for idx, key in enumerate(show_keys):
        ax = axes[idx]
        data_by_type = {}
        labels_box = []
        colors_box = []
        for atype in ['chilipir', 'normal', 'supraevaluat']:
            mask = np.array(anomaly_types) == atype
            if np.any(mask):
                data_by_type[atype] = df[mask][key].values.astype(float)
                labels_box.append(ANOMALY_TYPES[atype]['label'])
                colors_box.append(ANOMALY_TYPES[atype]['color'])

        if data_by_type:
            bp = ax.boxplot(list(data_by_type.values()), patch_artist=True, labels=labels_box,
                           medianprops={'color': 'white', 'linewidth': 2},
                           whiskerprops={'color': colors['muted']},
                           capprops={'color': colors['muted']},
                           flierprops={'markerfacecolor': colors['muted'], 'markersize': 4})
            for patch, color in zip(bp['boxes'], colors_box):
                patch.set_facecolor(color + '40')
                patch.set_edgecolor(color)

        ax.set_title(key.capitalize(), fontsize=11, fontweight='bold')
        ax.set_ylabel('Scor (0-10)')
        ax.tick_params(axis='x', labelsize=7, rotation=15)
        ax.grid(True, axis='y', alpha=0.2)

    fig.suptitle('Distribuția Criteriilor – Chilipir vs Normal vs Supraevaluat',
                 fontsize=12, fontweight='bold', y=1.02)
    fig.tight_layout()
    charts['boxPlotCriteria'] = fig_to_base64(fig)

    # ── 4. Isolation Forest Score Distribution ──
    fig, ax = plt.subplots(figsize=(9, 5))

    for atype in ['normal', 'outlier', 'supraevaluat', 'chilipir']:
        mask = np.array(anomaly_types) == atype
        if not np.any(mask):
            continue
        ax.hist(iso_scores[mask], bins=15, alpha=0.5, color=type_colors[atype],
                edgecolor='white', linewidth=0.5, label=type_labels[atype])

    threshold = np.percentile(iso_scores, 15)
    ax.axvline(x=threshold, linestyle='--', color=colors['red'], linewidth=1.5,
               label=f'Prag Anomalie ({threshold:.3f})')

    ax.set_xlabel('Isolation Forest Score', fontsize=11)
    ax.set_ylabel('Frecvență', fontsize=11)
    ax.set_title('Distribuția Scorurilor Isolation Forest', fontsize=13, fontweight='bold', pad=15)
    ax.legend(framealpha=0.3, edgecolor=colors['grid'], fontsize=8)
    ax.grid(True, axis='y', alpha=0.15)
    charts['isoScoreDistribution'] = fig_to_base64(fig)

    return charts
