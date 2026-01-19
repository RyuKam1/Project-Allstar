export function getPlayButtonText(sports) {
    if (!sports) return 'Play Here';

    // Handle array or single string
    const sportList = Array.isArray(sports) ? sports : [sports];

    // If multiple sports, maybe generic is better, or "Play Here" is fine.
    // User wants adaptive.
    if (sportList.length > 1) return 'Play Here';

    const s = sportList[0]?.toLowerCase() || '';

    if (s.includes('basketball')) return 'Hoop Here';
    if (s.includes('soccer') || s.includes('football')) return 'Kick Off';
    if (s.includes('tennis')) return 'Hit the Court';
    if (s.includes('volleyball')) return 'Join Match';
    if (s.includes('run') || s.includes('track')) return 'Run Here';
    if (s.includes('fitness') || s.includes('gym')) return 'Workout Here';
    if (s.includes('skate')) return 'Skate Here';
    if (s.includes('swimming') || s.includes('pool')) return 'Dive In';
    if (s.includes('baseball')) return 'Play Ball';

    return 'Play Here';
}
