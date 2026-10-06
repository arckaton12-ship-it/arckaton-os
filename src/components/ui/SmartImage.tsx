import React, { useEffect, useState } from 'react';
import fallbackImage from '../../assets/images/poles_network_hub_1789213238339.webp';

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
  const [enErreur, setEnErreur] = useState(false);
  useEffect(() => setEnErreur(false), [src]);

  const estUnsplash = UNSPLASH.test(src) && !enErreur;
  const srcSet = estUnsplash
    ? LARGEURS.map((w) => `${optimisee(src, w)} ${w}w`).join(', ')
    : undefined;
  // Une URL injoignable (CDN bloqué, image supprimée) ne doit jamais laisser
  // d'icône de fichier cassé : on bascule sur une visuelle local, toujours
  // embarquée dans le bundle, plutôt que sur un trou gris.
  const source = enErreur || !src ? fallbackImage : srcSet ? optimisee(src, 1280) : src;

  return (
    <img
      src={source}
      srcSet={srcSet}
      sizes={srcSet ? sizes ?? '(max-width: 768px) 100vw, 640px' : sizes}
      alt={alt}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : 'auto'}
      decoding="async"
      onError={() => setEnErreur(true)}
      {...rest}
    />
  );
};