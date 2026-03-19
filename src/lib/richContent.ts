const mergeStyle = (existing: string | null, additions: Record<string, string>) => {
  const map = new Map<string, string>();

  for (const chunk of String(existing || '')
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)) {
    const [rawKey, ...rawValue] = chunk.split(':');
    const key = rawKey?.trim().toLowerCase();
    const value = rawValue.join(':').trim();
    if (key && value) {
      map.set(key, value);
    }
  }

  for (const [key, value] of Object.entries(additions)) {
    map.set(key.toLowerCase(), value);
  }

  return Array.from(map.entries())
    .map(([key, value]) => `${key}: ${value}`)
    .join('; ');
};

const hasOnlyImageChild = (node: HTMLElement) => {
  const meaningfulChildren = Array.from(node.childNodes).filter((child) => {
    if (child.nodeType === Node.TEXT_NODE) {
      return child.textContent?.trim();
    }
    return true;
  });

  return meaningfulChildren.length === 1 && meaningfulChildren[0] instanceof HTMLImageElement;
};

export function normalizeRichContentHtml(html: string) {
  const source = String(html || '').trim();
  if (!source) return '';
  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') {
    return source;
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(source, 'text/html');

    doc.body.querySelectorAll('ol').forEach((node) => {
      node.setAttribute(
        'style',
        mergeStyle(node.getAttribute('style'), {
          'list-style-type': 'decimal',
          'list-style-position': 'outside',
          'padding-left': '1.5rem',
          margin: '1rem 0',
        }),
      );
    });

    doc.body.querySelectorAll('ul').forEach((node) => {
      node.setAttribute(
        'style',
        mergeStyle(node.getAttribute('style'), {
          'list-style-type': 'disc',
          'list-style-position': 'outside',
          'padding-left': '1.5rem',
          margin: '1rem 0',
        }),
      );
    });

    doc.body.querySelectorAll('li').forEach((node) => {
      node.setAttribute(
        'style',
        mergeStyle(node.getAttribute('style'), {
          display: 'list-item',
          margin: '0.5rem 0',
        }),
      );
    });

    doc.body.querySelectorAll('figure').forEach((node) => {
      node.setAttribute(
        'style',
        mergeStyle(node.getAttribute('style'), {
          margin: '2rem 0',
          'text-align': 'center',
        }),
      );
    });

    doc.body.querySelectorAll('img').forEach((node) => {
      node.setAttribute(
        'style',
        mergeStyle(node.getAttribute('style'), {
          display: 'block',
          margin: '1.5rem auto',
          'max-width': '100%',
          height: 'auto',
          'border-radius': '1rem',
        }),
      );

      if (node.parentElement?.tagName === 'P' && hasOnlyImageChild(node.parentElement)) {
        node.parentElement.setAttribute(
          'style',
          mergeStyle(node.parentElement.getAttribute('style'), {
            margin: '1.5rem 0',
            'text-align': 'center',
          }),
        );
      }
    });

    return doc.body.innerHTML;
  } catch {
    return source;
  }
}
