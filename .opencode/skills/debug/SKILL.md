---
name: debug
description: Use when investigating a bug, failing test, stack trace, or unexpected behavior - follows the 5 steps reproduce, read logs, find root cause, minimal fix, regression test. Triggers on "bug", "erreur", "ça marche pas", "échec", "stack trace", "500", "test rouge".
---

# Debug

Cinq étapes, dans cet ordre. Sauter la première ou la troisième coûte plus de
temps qu'elle n'en économise.

## 1. Reproduire l'erreur

Rien ne se corrige sur une hypothèse. Exécuter le cas qui échoue et obtenir
le message exact.

- Noter la commande exacte, les données en entrée, l'environnement.
- Une erreur intermittente se reproduit sous charge ou de façon répétée, pas
  en une tentative : si elle est intermittente, elle est deux bugs.
- Capturer la sortie complète, pas la dernière ligne supposée utile.

Écrire le cas qui échoue sous forme de test **avant** de chercher la cause. Il
doit échouer pour la bonne raison, sinon il ne teste rien.

## 2. Lire les logs

- Le message d'erreur, avec sa stack complète et ses codes.
- Les logs juste avant l'échec : l'état réel diffère presque toujours de ce
  qu'on suppose.
- Les logs applicatifs en plus de la sortie console.
- Les logs du service dépendant : base, cache, API tierce. Un `500` peut
  venir d'en dessous.

En production, redémarrer avant de lire les logs ne prouve rien : la cause
disparaît au redémarrage.

## 3. Identifier la cause racine

Poser « pourquoi » jusqu'à arrive à une cause qu'on peut corriger, pas à un
symptôme.

- Lire le code qui produit l'erreur, pas seulement celui qui l'affiche.
- Comparer ce qui marche et ce qui échoue : l'écart entre les deux cas est
  souvent la cause.
- Vérifier les frontières : parsing JSON, valeur `null` ou `undefined`,
  réponse HTTP d'un tiers, type de la base.
- **Un `try/catch` qui avale l'erreur masque la cause. Le lire comme un
  symptôme de quelque chose de cassé en amont, jamais comme la solution.**

Formuler la cause en une phrase avant de coder. Si la phrase n'est pas
vérifiable, la cause n'est pas trouvée.

## 4. Proposer un fix minimal

- Corriger la cause, pas le symptôme affiché. Un garde-fou qui évite de planter
  sur une valeur nulle masque le bug et le laisse se reproduire ailleurs.
- Le plus petit changement qui résout le problème. Un refonte pendant un
  correctif rend la régression impossible à isoler.
- Ne pas élargir le périmètre : une correction qui ajoute une fonctionnalité
  est deux travaux.
- Vérifier que le correctif ne casse pas le comportement qui fonctionnait, et
  le dire explicitement.

## 5. Ajouter un test de régression

- Le test reproduit le cas qui échouait, avec les données exactes.
- Il échoue sur le code d'avant, passe sur le code d'après. Le vérifier dans
  les deux sens : un test qui passe avant le correctif ne teste rien.
- Il reste rapide et déterministe : pas d'appel réseau réel, pas de date
  dépendante de l'heure, pas d'ordre aléatoire.
- Il vit dans la suite existante, à côté des tests voisins.

## Notes de terrain

- Un bug du « dernier commit » se reproduit avec `git bisect` bien plus
  vite qu'à la lecture.
- Un `console.log` retiré trop tôt laisse revenir le problème ; laasser une
  trace utile ou documenter pourquoi elle ne sert plus.
- Si la cause est dans un service tiers, le test doit vérifier notre réaction
  à l'échec, pas la réponse du tiers.
