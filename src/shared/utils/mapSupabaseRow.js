export const mapSupabaseRow = (row) => {
  const d = new Date(row.event_date);
  return {
    // Properties consumed by existing useMemo aggregations (MUST match parseCSV output):
    switcher: row.switcher?.name || 'Unknown',
    client: row.client?.name || row.client_name_raw || 'Unknown',
    department: (row.department && row.department !== 'Cross-Department')
      ? row.department
      : row.switcher?.primary_dept || row.department || 'Unknown',
    task: row.task_details || '',
    minutes: row.duration_minutes || 0,
    dateStr: `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`,
    dateObj: d,
    // Additional Phase 3 properties:
    id: row.id,
    temporalStatus: row.temporal_status,
    startAt: row.start_at,
    endAt: row.end_at,
    categoryName: row.category?.name || 'Misc',
    classificationMethod: row.classification_method,
    switcherId: row.switcher?.id,
    clientId: row.client?.id,
  };
};
