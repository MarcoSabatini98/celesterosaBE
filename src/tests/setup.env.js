'use strict';

// Caricato da Jest (setupFiles) PRIMA dell'import dell'app negli integration
// test: forza le variabili dell'ambiente di test, sovrascrivendo eventuali
// valori già presenti.
require('dotenv').config({ path: '.env.test', override: true });
