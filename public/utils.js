export function generateSearchableKeywords(data, collectionName) {
    const keywords = new Set();
    const addWords = (str) => {
        if (!str) return;
        str.toLowerCase().split(/[\s,.-]+/).filter(Boolean).forEach(word => keywords.add(word));
    };

    if (collectionName === 'services') {
        addWords(data.name);
        addWords(data.tag);
        addWords(data.type);
        if (Array.isArray(data.keywords)) {
            data.keywords.forEach(addWords);
        }
    } else if (collectionName === 'locations') {
        addWords(data.state);
        addWords(data.city);
        if (Array.isArray(data.areas)) {
            data.areas.forEach(addWords);
        }
    }

    return Array.from(keywords);
}
