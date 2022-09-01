# glider-types
Typescript types of Glider projects: Simard Pay, Derbysoft Proxy, Win.so backend

## Getting started

```bash
yarn add @windingtree/glider-types
```

## Usage

### JSON schemas

```typescript
import { simard, derbysoft, win } from '@windingtree/glider-types';

// simard.Guarantee
// simard.Deposit
// derbysoft.Price
// win.Guest
// ...
```

### Typescript types

```typescript
import { Guarantee, Deposit } from '@windingtree/glider-types/types/simard';
import { Price } from '@windingtree/glider-types/types/derbysoft';
import { OffersSearchResponse, PricePlansReferences } from '@windingtree/glider-types/types/win';
```
