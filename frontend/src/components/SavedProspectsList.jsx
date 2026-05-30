import React from 'react';

/**
 * SavedProspectsList component displaying saved prospects inside LocalStorage,
 * with options to clear prospects, delete individuals, or download the list as a CSV file.
 */
export default function SavedProspectsList({ prospects, onDelete, onClearAll }) {
  if (!prospects || prospects.length === 0) {
    return null;
  }

  // Generates CSV format and initiates download
  const handleDownloadCSV = () => {
    // CSV Header row
    const headers = ['URL', 'Brand Health Score', 'Brand Health Insight', 'Readiness Score', 'Readiness Insight', 'DM Pitch', 'Saved At'];
    
    // Format rows
    const rows = prospects.map(p => [
      p.url,
      p.brand_health.score,
      `"${p.brand_health.insight.replace(/"/g, '""')}"`, // escape quotes for CSV compatibility
      p.outreach_readiness.score,
      `"${p.outreach_readiness.insight.replace(/"/g, '""')}"`,
      `"${p.dm_suggestion.replace(/"/g, '""')}"`,
      new Date(p.savedAt).toLocaleString()
    ]);

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    
    // Create browser blob and link to download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Signal_Hunt_Prospects_${new Date().toISOString().slice(0,10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <section className="dm-card" style={{ marginTop: '2.5rem', borderLeft: '4px solid var(--color-brand)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3 style={{ margin: 0 }}>
          <span role="img" aria-label="Book">📚</span> Saved Prospects ({prospects.length})
        </h3>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-primary" onClick={handleDownloadCSV} style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}>
            Download CSV
          </button>
          <button className="btn btn-secondary" onClick={onClearAll} style={{ fontSize: '0.85rem', padding: '0.5rem 1rem', borderColor: 'var(--color-red)', color: 'var(--color-red)' }}>
            Clear List
          </button>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.95rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
              <th style={{ padding: '0.75rem 0.5rem' }}>URL / Handle</th>
              <th style={{ padding: '0.75rem 0.5rem', width: '90px', textAlign: 'center' }}>Brand</th>
              <th style={{ padding: '0.75rem 0.5rem', width: '90px', textAlign: 'center' }}>Readiness</th>
              <th style={{ padding: '0.75rem 0.5rem', width: '80px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {prospects.map((p) => (
              <tr key={p.hunt_id} style={{ borderBottom: '1px solid var(--border-color)', hover: { backgroundColor: 'var(--bg-primary)' } }}>
                <td style={{ padding: '0.75rem 0.5rem', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '280px' }}>
                  <a href={p.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-brand)', textDecoration: 'none' }}>
                    {p.url.replace(/^https?:\/\/(www\.)?/, '')}
                  </a>
                </td>
                <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center', fontWeight: '600' }}>
                  {p.brand_health.score}
                </td>
                <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center', fontWeight: '600' }}>
                  {p.outreach_readiness.score}
                </td>
                <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>
                  <button 
                    onClick={() => onDelete(p.hunt_id)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--color-red)', cursor: 'pointer', fontSize: '0.9rem' }}
                    title="Remove prospect"
                  >
                    🗑️
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
