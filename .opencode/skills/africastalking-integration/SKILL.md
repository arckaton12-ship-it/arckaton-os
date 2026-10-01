---
name: africastalking-integration
description: Use when integrating Africa's Talking for payments, SMS, or USSD - covers Mobile Money (MTN MoMo, Airtel, Orange), the Node SDK, webhook handling, logging to a payments table, and sandbox testing. Triggers on "Africa's Talking", "Mobile Money", "MTN MoMo", "Airtel Money", "Orange Money", "paiement", "webhook".
---

# Intégration Africa's Talking

Africa's Talking est le canal de paiement et de messagerie de l'agence :
MTN Mobile Money, Airtel Money, Orange Money, plus SMS et USSD.

## Workflow

### 1. Identifier le service avant d'écrire du code

| Besoin | API Africa's Talking |
| --- | --- |
| Encaisser un paiement | Mobile Money STK Push / Express |
| Vérifier le statut d'un paiement | Transaction Status |
| Rembourser | Mobile Money B2C |
| Notifier par SMS | SMS Send |
| Menu interactif | USSD |
| Appels vocaux | Voice |

Ne pas partir sur le SDK avant d'avoir tranché lequel de ces services est
visé : les signatures, les états et les webhooks diffèrent.

### 2. SDK Node

```bash
npm install africastalking
```

```ts
import AfricasTalking from 'africastalking';

const client = AfricasTalking({
  username: process.env.AT_USERNAME,   // 'sandbox' en test
  apiKey: process.env.AT_API_KEY,       // jamais dans le dépôt
});

const payment = await client.mobile
  .stkPush({
    phoneNumber: `${prefixe}${numero}`,  // indicatif du pays du client
    amount: '5000',
    currencyCode: 'XAF',
    callbackUrl: `${process.env.PUBLIC_URL}/api/webhooks/africastalking`,
    transactionDesc: 'Forfait Synergie',
  });
```

La clé d'API vient de l'environnement. Un secret en dur dans le code ou dans
une image Docker est à supprimer avant merge.

### 3. Créer l'endpoint

- `POST /api/paiements` : crée la demande de paiement, enregistre une ligne en
  statut `en_attente`, puis appelle l'API. Si l'appel échoue, la ligne reste
  `en_attente` et l'utilisateur n'est jamais facturé à tort.
- `POST /api/webhooks/africastalking` : reçoit la confirmation. **Ne jamais
  faire confiance au retour de l'initiation** : seul le webhook fait foi.

Le webhook ne doit dépendre d'aucun état de session. C'est un appel serveur
vers serveur, authentifié par le secret du compte, pas un utilisateur connecté.

### 4. Gérer les webhooks

Africa's Talking peut appeler plusieurs fois le même webhook. Traiter chaque
notification comme **idempotente** : le même `transactionId` ne doit faire
passer le paiement qu'une seule fois de `en_attente` à `reussi`.

- Vérifier la signature ou le token partagé avant de traiter quoi que ce soit.
- Répondre `200` vite, traiter de façon asynchrone : un traitement lent risque
  de dépasser la fenêtre du service et de déclencher des reprises.
- Distinguer `success` de `failure` et du timeout du réseau : un timeout ne
  signifie pas que le client n'a pas payé.

### 5. Logger dans la table payments

```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL DEFAULT 'africastalking',
  transaction_id TEXT UNIQUE,
  phone TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'XAF',
  status TEXT NOT NULL CHECK (status IN ('en_attente','reussi','echoue','rembourse')),
  raw JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

`transaction_id` en `UNIQUE` est ce qui rend l'idempotence du webhook possible :
l'upsert échoue proprement sur un doublon au lieu de créer un second paiement.
`raw` conserve la charge utile complète pour l'audit.

Ne jamais considérer un paiement comme acquis tant que la ligne n'est pas
`reussi`. Une erreur de crédit.client est le pire échec possible ici.

### 6. Tester en sandbox

- `username: 'sandbox'` avec les numéros de test Africa's Talking, sinon la
  transaction part en production réelle.
- Le sandbox ne débite pas d'argent : ne pas s'appuyer dessus pour valider la
  logique de reprise de paiement.
- Tester au minimum : paiement réussi, callback dupliqué, callback en échec,
  timeout réseau, solde insuffisant.
- Vérifier l'apparition de la ligne dans `payments` et son passage de
  `en_attente` à `reussi` sur le callback.

## Pièges

- **Format du numéro** : indicatif pays + 8 chiffres, soit `+237XXXXXXXX` au
  Cameroun. L'indicatif vient de la table
  `countries` via le `country_id` du **client**, jamais du corps de la requête :
  un client HTTP qui fournit `to` ou `countryId` peut demander un paiement MTN
  vers un numéro d'un autre pays. Ni `00237`, ni séparateurs, ni numéro
  national brut.
- **L'opérateur dépend du pays.** Airtel Money n'existe pas au Cameroun : seuls
  MTN MoMo et Orange Money y sont disponibles. Vérifier que l'opérateur demandé
  appartient bien à
  `countries.operateurs` avant d'appeler l'API, sinon le paiement échoue côté
  provider pour une raison opaque.
- **Callback : fenêtre de 30 secondes.** Le traitement doit tenir dans ce
  délai, sinon le service considère l'appel échoué. Tout traitement long part
  dans une file d'attente, la réponse HTTP est immédiate.
- **Erreur 402 : solde insuffisant.** C'est un refus de paiement volontaire, pas
  une panne. Le remonter à l'utilisateur comme un refus clair ; ne pas
  réessayer en boucle et ne pas le compter comme une erreur technique.
- Le `STK Push` renvoie un `CheckoutRequestID` et non une confirmation de
  paiement : cet identifiant sert à suivre la demande, pas à la valider.
- Le format du montant est une chaîne, pas un nombre, et sans décimales pour le
  XAF (devise du Cameroun, donc pas de conversion).
- Les numéros MTN et Orange n'acceptent pas les mêmes services, et un service
  donné ne fonctionne pas sur un numéro d'un autre pays : un STK Push MTN
  camerounais ne passe pas sur un numéro d'un autre pays.
