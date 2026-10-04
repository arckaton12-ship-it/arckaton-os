import React from 'react';

type SmartImageProps = Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
  src: string;
  alt: string;
  /** Image au-dessus de la ligne de flottaison : chargement prioritaire. */
  priority?: boolean;
};

const UNSPLASH = /images\.unsplash\.com/;
const LARGEURS = [640, 960, 1280, 1600];

// Les images du CMS sont saisies sous forme d'URL par le responsable du
// site. Pour les sources compatibles (Unsplash), on demande au CDN une
// version WebP/AVIF redimensionnee : le navigateur ne telecharge jamais
// l'original de plusieurs megaoctets. Les autres URLs passent telles quelles.
function optimisee(src: string, largeur: number): string {
  try {
    const url = new URL(src);
    url.searchParams.set('auto', 'format');
    url.searchParams.set('fit', 'crop');
    url.searchParams.set('q', '72');
    url.searchParams.set('w', String(largeur));
    return url.toString();
  } catch {
    return src;
  }
}

export const SmartImage: React.FC<SmartImageProps> = ({
  src,
  alt,
  priority = false,
  sizes,
  ...rest
}) => {
  const estUnsplash = UNSPLASH.test(src);
  const srcSet = estUnsplash
    ? LARGEURS.map((w) => `${optimisee(src, w)} ${w}w`).join(', ')
    : undefined;
  const source = srcSet ? optimisee(src, 1280) : src;

  return (
    <img
      src={source}
      srcSet={srcSet}
      sizes={srcSet ? sizes ?? '(max-width: 768px) 100vw, 640px' : sizes}
      alt={alt}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : 'auto'}
      decoding="async"
      {...rest}
    />
  );
};
