# Full kode- og arkitekturgjennomgang – Water-Distribution-Map

**Dato:** 2026-10-12  
**Gjennomgått ref:** `main` @ `61cb12b7d3b11167c629151193c5eccdebbd64ed`  
**Mål:** Lesbarhet, tydelig ansvar per fil, minimalt med gjentakelser, datakvalitet, trygg opprydding og uendret funksjonalitet.  
**Omfang:** Alle 62 sporbare filer/konfigurasjonsfiler i repoet ble kartlagt. Applikasjonskomponenter, hooks, tjenester, hjelpefunksjoner, tester og konfigurasjon ble lest. `frontend/package-lock.json` og rotens lockfile ble kontrollert på metadata og avhengigheter, ikke linje for linje.

> **Avgrensning:** Repoet inneholder **ikke** database-migrasjoner, SQL-definisjoner av RPC-ene, skjema, RLS-policyer eller produksjonsdata. Funn om databasekontrakten er derfor risikoer/kontrollpunkter, **ikke** bekreftede databasefeil. Testene og byggekommandoen er ikke kjørt i dette miljøet; verifiser i lokal checkout/CI før merge. Ingen live Supabase-data ble endret.

## Resultat og endringsomfang

Dette er primært en **review-PR**. Den inkluderer denne rapporten samt én minimal opprydding: `mapOperations.ts` fjerner den ubrukte `operationColors` og den overflødige `filterOperationalMap`-eksporten; den eksisterende `filterVisibleFeatures`-oppførselen er beholdt.

**Ingen** endringer i kartoppførsel, API-kall, database, oppretting eller redigering er tilsiktet i denne PR-en. Punktene nedenfor er forslag til **senere, separate PR-er**. Ikke slett flere filer eller felter før kallsteder, databasens avhengigheter og testdekning er verifisert.

### Prioritetsforklaring
- **P1:** Sannsynlig funksjonsfeil eller høy risiko – undersøk/test først.
- **P2:** Vesentlig lesbarhet, vedlikehold eller data-/API-kontrakt.
- **P3:** Mindre konsistens, presentasjon eller dokumentasjon.

## A. Mulige funksjonsfeil og dataintegritet

### A1 (P1, konkret lagrekkefølge): Markering av valgt ledning kan dekkes til
**Fil:** [`mapLayers.ts`](../frontend/src/pages/main/lib/mapLayers.ts)  
`selected-pipe` legges inn `beforeId: mapIds.pipesOutline`, altså **under** både outline og det vanlige ledningslaget. En bred cyan linje vises dermed bare som en smal kant for vanlige ledninger. For skjulte hovedledninger kan outline-laget (11 px) dekke hele cyan-markeringen (10 px).

**Tiltak:** Gjennomgå ønsket lagrekkefølge; legg markering som et overlegg over grunnledningene, og bekreft visuelt for både skjulte/viste og `main`/`service`/`unknown`. Behold eventuelt en todelt «halo» hvis det er tilsiktet.

### A2 (P1, konkret): Flere uforenlige måter å identifisere et objekt på
**Filer:** [`mapObjectUpdates.ts`](../frontend/src/pages/main/lib/mapObjectUpdates.ts), [`useMapSelection.ts`](../frontend/src/pages/main/hooks/useMapSelection.ts), [`CandidateSelector.tsx`](../frontend/src/pages/main/Subcomponents/MapObject/subcomponents/CandidateSelector.tsx), [`MapObjectEditor.tsx`](../frontend/src/pages/main/Subcomponents/MapObject/MapObjectEditor.tsx), [`mapSnapping.ts`](../frontend/src/pages/main/lib/mapSnapping.ts).  
`featureId()` støtter `feature.id ?? feature.properties?.id`, mens flere andre steder bruker bare `feature.id`, lager nøkkelen `kind:undefined` eller bruker `selection.feature.id!` som ekskludert snap-objekt. Koden hevder uttrykkelig støtte for eldre data med ID i `properties`.

**Tiltak:** Én `getFeatureId(feature)` med validering og `selectionKey(kind, feature)`. Bruk den i valgt objekt, kandidater, CRUD og snapping. Skill mellom «mangler ID» og en ekte ID. Test legacy GeoJSON med bare `properties.id`.

### A3 (P1, konkret): Endring av objekttype telles ikke som ulagret endring
**Fil:** [`MapObjectCreator.tsx`](../frontend/src/pages/main/Subcomponents/MapObject/MapObjectCreator.tsx)  
`dirty` sjekker `geometry`, `name`, `comment` og `status`, men **ikke** `type`. Å velge eksempelvis «Hovedledning» og bytte modus uten å tegne geometri gir derfor intet varsel.

**Tiltak:** Beregn `dirty` mot komplett start-draft, inklusive type. Avklar om endring av type uten geometri faktisk skal behandles som ulagret arbeid.

### A4 (P1, mulig UX-/konsistensfeil): Ny innlasting av detaljer oppdaterer ikke kartdata
**Filer:** [`MapObjectDetails.tsx`](../frontend/src/pages/main/Subcomponents/MapObject/MapObjectDetails.tsx), [`MapPage.tsx`](../frontend/src/pages/main/MapPage.tsx).  
`onRefresh` henter ny `WaterObject` for panelet, men oppdaterer ikke `MapPage.data` / kartkildene. Hvis en annen bruker har endret kategori, status, geometri eller synlighet, kan sidepanelet og kartet vise **forskjellige** verdier etter refresh.

**Tiltak:** La refresh propagere oppdatert objekt til felles kartstate, slik `onSaved` allerede gjør. Test ekstern endring av status, geometri og synlighet.

### A5 (P1, mulig brukerfeil): Snapping for eldre ID-varianter
**Filer:** [`useMapDrawing.ts`](../frontend/src/pages/main/hooks/useMapDrawing.ts), [`mapSnapping.ts`](../frontend/src/pages/main/lib/mapSnapping.ts).  
Egenredigerte objekter ekskluderes via `feature.id`. I `snapCandidates` sammenlignes det samme feltet. For legacy-objekter som bare har `properties.id`, kan egen geometri bli snap-kandidat ved redigering.

**Tiltak:** Bruk felles objekt-ID-funksjon fra A2, og legg test for legacy-objekt med `properties.id` uten toppnivå-ID.

### A6 (P2): Oppretting av objektkind baseres på om kategori-nøkkel finnes
**Fil:** [`MapObjectCreator.tsx`](../frontend/src/pages/main/Subcomponents/MapObject/MapObjectCreator.tsx).  
`Object.hasOwn(pipeCategories, type)` avgjør om objektet er ledning eller punkt. Dette knytter to domener til ett felt og tillater kollisjon hvis en punkttype i fremtiden får samme verdi som en ledningskategori.

**Tiltak:** Modellér `ObjectKind` eksplisitt, enten med separate valg eller en typed `{ kind, type }`-modell. Nullstill/valider geometri når kind byttes.

### A7 (P2): Filtrering og snapping bruker ikke hele samme datagrunnlag
**Filer:** [`MapPage.tsx`](../frontend/src/pages/main/MapPage.tsx), [`useMapDrawing.ts`](../frontend/src/pages/main/hooks/useMapDrawing.ts).  
`snapDataRef.current = filtered` gjør at kun **synlige gjennom aktive filtre** kan brukes som snap-mål. Dette kan være riktig, men betyr at bortfiltrerte nettverksobjekter ikke kan snapppes til, selv om de eksisterer i databasen.

**Tiltak:** Ta en eksplisitt produktbeslutning: snapping mot alle geografiske objekter, alle aktive objekter eller bare synlige objekter. Test før eventuell endring.

### A8 (P2): MapLibre-lastefeil gir bare generisk feilmelding
**Fil:** [`useWaterMap.ts`](../frontend/src/pages/main/hooks/useWaterMap.ts).  
Feil fra `Promise.all` fanges, men brukeren får bare beskjed om å laste hele siden på nytt. Raster/DEM-tile-feil og eventuelle MapLibre-`error`-hendelser håndteres ikke eksplisitt. Kartet bruker ekstern OSM-/Mapterhorn-tjeneste.

**Tiltak:** Skille mellom datalastingsfeil og bakgrunnskart-/terrain-feil, logg nok kontekst for utviklere, tilby retry for RPC-er. Overvåk 404/overskalering for DEM-kilden; ikke påstå at eksisterende konfigurasjon er feil uten nettverkstest.

### A9 (P2): Ingen runtime-validering av GeoJSON-/RPC-svar
**Filer:** [`mapServices.ts`](../frontend/src/pages/main/services/mapServices.ts), [`mapObjectService.ts`](../frontend/src/pages/main/services/mapObjectService.ts).  
RPC-svar castes direkte med `as FeatureCollection` og `as WaterObject`. TypeScript beskytter ikke mot feil JSON eller endret RPC-kontrakt; `getWaterObject` kan dessuten gi null selv om returtypen lover objekt.

**Tiltak:** Lag en liten validerings-/normaliseringsgrense for innkommende data. Sjekk `type`, `features`, `geometry`, `id`, `is_visible` og forventede felt. Separat innlastings-/feilmodell. Ikke innfør stort schema-bibliotek uten reelt behov.

### A10 (P2): Oppdaterings-konflikt og sletting må testes mot faktisk SQL/RLS
**Fil:** [`mapObjectService.ts`](../frontend/src/pages/main/services/mapObjectService.ts).  
Oppdatering bruker `updated_at` som optimistisk lås via RPC, mens sletting utføres direkte mot tabell med `updated_at`-filter. Dette kan fungere, men har to forskjellige autorisasjons-/konfliktbaner.

**Tiltak:** Verifiser i Supabase at `save_water_object` og direkte DELETE bruker samme tilgangsregler og konfliktsemantikk, inkludert `updated_at IS NULL`, 0 rader, samtidige skriv og endret rettighet. Ikke endre databasens policy basert kun på frontendkoden.

### A11 (P2): UI viser «Full karttilgang» uten å bruke den til skjermtilpasning
**Filer:** [`UserPermission.tsx`](../frontend/src/pages/main/Subcomponents/Account/UserPermission.tsx), [`MapPage.tsx`](../frontend/src/pages/main/MapPage.tsx).  
`getMapAccess` styrer en label, men opprett-, rediger- og slettekontroller vises uavhengig av tilgang. Det er **ikke** i seg selv en tilgangssårbarhet dersom RLS/RPC beskytter, men kan gi misvisende brukergrensesnitt.

**Tiltak:** Definer faktisk rolle-/rettighetsmodell og gi UI eksplisitte capabilities. Backend forblir fasit. Test konto med/uten tilgang.

### A12 (P2): Saklige navn for synlighet versus drift
**Filer:** [`mapOperations.ts`](../frontend/src/pages/main/lib/mapOperations.ts), [`OperationsLegend.tsx`](../frontend/src/pages/main/Subcomponents/Selector/subcomponents/OperationsLegend.tsx).  
Driftskart inkluderer alle `is_visible === true`, ikke bare `status=operational`. Den nye teksten i legend er nå presis. Behold navnet `filterVisibleFeatures` overalt, og ikke gjeninnfør `filterOperationalMap`.

## B. Struktur, ansvar og duplisering

### B1 (P2): Mappestrukturen er forbedret, men nesting og navngivning er fortsatt tung
**Eksempler:** `pages/main/Subcomponents/MapObject/subcomponents/*`, `pages/main/Subcomponents/Selector/subcomponents/*`.  
`Subcomponents` og `subcomponents` i samme sti sier lite om funksjon. Det er ikke antall filer som er problemet; det er at plasseringen og ordvalget ikke gjør ansvar enkelt å finne.

**Anbefalt målstruktur (ikke innført i denne PR-en):**
```text
frontend/src/
  app/App.tsx
  components/ui/{Button,Checkbox,Select}.tsx
  features/auth/{AuthPage,authService,useSession}.ts(x)
  features/map/
    MapPage.tsx
    components/{MapModeSelector,MapFilterPanel,PointLegend,OperationsLegend}.tsx
    components/objects/{ObjectPanel,ObjectDetails,ObjectView,ObjectEditor,ObjectCreator}.tsx
    components/drawing/{DrawingToolbar,GeometryButton}.tsx
    hooks/{useWaterMap,useMapSelection,useMapDrawing,useUnsavedChangesWarning}.ts
    lib/{mapConfig,mapLayers,mapFilters,mapSnapping,mapGeometry,mapObjectUpdates,mapPointIcons}.ts
    model/{waterObjects,operationStatus,pipeCategories,pointTypes}.ts
    services/{mapService,mapObjectService}.ts
    tests/
  shared/supabase.ts
```
Et alternativ er å beholde `pages/main`, men erstatte `Subcomponents`-nivåene med selvbeskrivende feature-mapper. Ingen grunn til å flytte filer bare for flyttingens skyld; ta importoppdateringer i egen PR.

### B2 (P2): `MapObjectEditor.tsx` er nå største UI-ansvarskonsentrasjon
**Fil:** [`MapObjectEditor.tsx`](../frontend/src/pages/main/Subcomponents/MapObject/MapObjectEditor.tsx).  
Filen inneholder drafting, dirty-sammenligning, CRUD, fokus, egenskapsfelt, geometritegning, kommentar, avansert JSON og admin-knapper. Denne filen har klart størst gevinst av flere små filer.

**Tiltak:** Flytt visningsseksjonene til `ObjectClassificationFields`, `ObjectGeometryFields`, `ObjectCommentField`, `ObjectAdvancedProperties` og `ObjectEditorActions`. Flytt `Draft`/`makeDraft`/`geometrySummary` til `objectDraft.ts` eller hook. Behold én form/eier av draft og én lagringsbane (unngå å splitte form-state i mange komponenter).

### B3 (P2): `useMapDrawing.ts` blander snap-algoritme, MapLibre-lyttere og vertex-UI
**Fil:** [`useMapDrawing.ts`](../frontend/src/pages/main/hooks/useMapDrawing.ts).  
Håndterer synlig snap-markør, muse-/touch-eventer, geometribygging, dragbare markører, kartkildeoppdatering og editorcallback. Flere tydelige delansvar enn nødvendig.

**Tiltak:** Vurder `useDrawingMarkers.ts` (markører/drag), `useDrawingMapEvents.ts` (klikk/pointer), `useSnapIndicator.ts` (visualisering), mens `mapSnapping.ts` beholder ren matematikk. Ikke flytt state vilkårlig; marker at `drawingRef` synkroniserer hendelseshåndterere.

### B4 (P2): Delte datakonsepter hører ikke hjemme i rene kartfiltre
**Fil:** [`mapFilters.ts`](../frontend/src/pages/main/lib/mapFilters.ts).  
`pipeCategories` inneholder domeneverdi, norsk navn og kartstil samtidig. Den brukes av filter, opprettingsskjema, editor og lag. Den er nå **korrekt sentralisert**, men navnet/plasseringen gjør avhengighetene utydelige.

**Tiltak:** Flytt `pipeCategories` til `model/pipeCategories.ts` eller `config/pipeCategories.ts`; importer den fra både `mapFilters` og komponenter. `unknown` er **en reell filterkategori**, ikke en kodebit som skal slettes.

### B5 (P2): Samme konsept for status kan få én typed lesefunksjon
**Filer:** [`operationStatus.ts`](../frontend/src/pages/main/lib/operationStatus.ts), [`MapObjectView.tsx`](../frontend/src/pages/main/Subcomponents/MapObject/MapObjectView.tsx).  
Sentralisering av de fire statusene og aliasene er gjort. I `MapObjectView` brukes `Object.entries(...).find(...)` for å slå opp alias/status, og tilsvarende `find` for ledningskategori.

**Tiltak:** Legg `resolveOperationStatus(raw)` og `resolvePipeCategory(raw)` i modell-/visningsfunksjoner. Returner fallback tydelig. Behold råverdier ved redigering dersom legacy-data skal kunne lagres uten utilsiktet normalisering.

### B6 (P2): Gjentatt bygging av MapLibre-`match` for ledningskategorier
**Fil:** [`mapLayers.ts`](../frontend/src/pages/main/lib/mapLayers.ts).  
`main`, `service`, `unknown` er spesifisert separat for normal linjefarge, bredde og outline-bredde, selv om alle verdiene allerede er i `pipeCategories`.

**Tiltak:** Bruk en liten typed `pipeCategoryExpression(field, mapper)`/konfigurasjonsdrevet generator, men hold MapLibre-uttrykket lesbart og test fallback for uventet `pipe_category`.

### B7 (P2): Delt beregning av koordinatoppsummering
**Filer:** [`MapObjectView.tsx`](../frontend/src/pages/main/Subcomponents/MapObject/MapObjectView.tsx), [`MapObjectEditor.tsx`](../frontend/src/pages/main/Subcomponents/MapObject/MapObjectEditor.tsx), [`MapObjectCreator.tsx`](../frontend/src/pages/main/Subcomponents/MapObject/MapObjectCreator.tsx).  
Alle viser samme informasjon om koordinater/knekkpunkter, men formaterer den ulikt og med gjentatt implementasjon.

**Tiltak:** `geometrySummary(geometry)` i ren `lib/geometryFormat.ts` eller `mapGeometry.ts`, gjenbrukbar for visning og skjema.

### B8 (P2): Blandet UI-system
**Filer:** `components/{Button,Checkbox,Select}.tsx`, `MapObjectEditor.tsx`, `MapObjectCreator.tsx`, `AuthPage.tsx`, `GeometryButton.tsx`.  
Nye gjenbrukbare komponenter sameksisterer med egenbygde knappestiler, checkboxer, `<select>` og tekstfelter. Konsekvensen er visuelle/semantiske forskjeller samt gjentatte Tailwind-klasser.

**Tiltak:** Et lite `ui/`-lag med Button, Checkbox, Select, TextField, Textarea, FormField. Bruk det konsekvent i ny/omskrevet UI. Ikke tving generisk form-komponent der spesifikk funksjonalitet blir vanskeligere å forstå.

### B9 (P2): StatusSelect er sentralisert, men typekontrakten er bred
**Filer:** [`StatusSelect.tsx`](../frontend/src/pages/main/Subcomponents/MapObject/subcomponents/StatusSelect.tsx), [`waterObjects.ts`](../frontend/src/pages/main/types/waterObjects.ts).  
`value: string` og `status: string | null` er bevisst for importerte/legacy verdier. Det er riktig å bevare råstatus, men et skille mellom `RawStatus`, `OperationStatus` og `resolve...` vil gjøre kode enklere å lese.

**Tiltak:** Typed verdier for nye data, separate råverdier ved DB-grense og fallback for gamle/ukjente data. Unngå blind casting.

### B10 (P3): Konsolider identifikatorer for MapLibre
**Fil:** [`mapConfig.ts`](../frontend/src/pages/main/lib/mapConfig.ts).  
`mapIds` samler lag- og source-ID-er; dette er positivt og skal beholdes. Ved videre opprydding legg også kart-startposisjon, terrenginnstillinger og eventuelt kilde-URL-er i en navngitt config dersom de justeres i flere steder. Hold konfigurasjon adskilt fra sideeffekter.

### B11 (P3): Komponenter med få linjer trenger ikke ekstra wrapper-nivå
**Eksempler:** `CandidateSelector.tsx`, `ObjectPanel.tsx`, `ModeSelector.tsx`.  
Disse er allerede ryddige og eier ett ansvar. Ikke splitt dem videre bare for å få flere filer. Den strukturelle gevinsten ligger primært i `MapObjectEditor` og `useMapDrawing`.

## C. Datamodell, Supabase og drift

### C1 (P1, manglende verifikasjonsgrunnlag): Ingen versjonskontrollert databasemodell
Repoet har ingen `supabase/migrations/`, `schema.sql`, RPC-definisjoner, RLS-policies eller seed-eksempler. Frontend bygger på `water_pipes`, `water_points`, `map_access`, `get_water_pipes`, `get_water_points`, `get_water_object` og `save_water_object`.

**Tiltak:** Eksporter og gjennomgå **schema-only** og policyer uten private nøkler, persondata eller produksjonsdump. Registrer fremtidige endringer som migrasjoner; dokumenter kontraktene og en anonymisert eksempel-/seedbestand.

### C2 (P1, verifiser): RPC-er og RLS må ha samme autorisasjonsmodell
Kontroller `EXECUTE`-grant, `SECURITY DEFINER`/invoker, `search_path`, eierrolle, mål-tabeller, konfliktkontroll og feltvalidering. Spesielt viktig siden appen både lagrer via RPC og sletter direkte fra tabell. **Dette er et kontrollpunkt, ikke en påvist sårbarhet.**

### C3 (P2): Datafelter mangler én dokumentert semantikk
Definer betydning og nullability for `status`, `is_visible`, `comment`, `point_type`, `pipe_category`, `properties`, `source_dataset`, `updated_at`, `geometry`. `status=unknown` er ikke det samme som `is_visible=false`; dokumenter dette eksplisitt.

### C4 (P2): Kategorienes «unknown» slår sammen flere årsaker
**Fil:** [`mapFilters.ts`](../frontend/src/pages/main/lib/mapFilters.ts).  
`pipeCategory()` mapper alle andre verdier enn `main` og `service` til `unknown`. Dette er praktisk for visning/filter, men skiller ikke mellom `null`, importfeil og nye kategorier.

**Tiltak:** Behold UI-kategorien `Ukjent`, men vurder å logge/rapportere råverdiene separat i kvalitetssjekken slik at datakorrupsjon ikke skjules.

### C5 (P2): Geometri-/koordinatvalidering har bare klientperspektiv
**Fil:** [`mapGeometry.ts`](../frontend/src/pages/main/lib/mapGeometry.ts).  
Kontrollerer Point/LineString, WGS84-verdiområde og to forskjellige endepunkter. Men topologi, nullgeometrier, SRID, duplikater og ledningsnettverkets sammenheng krever en database-/domenevalidering. Test også antimeridian, ugyldige GeoJSON-egenskaper og urealistiske koordinater om relevant.

### C6 (P2): Ingen kvalitetstall eller dataprofil i repoet
Anbefalt read-only rutine for begge tabeller: antall rader, `NULL` per sentralt felt, fordeling av status/type/kategori, tom/ugyldig geometri, like koordinater, dubletter på importnøkkel, `updated_at`-mangler og antall skjulte objekter. Avklar unike nøkkelregler før du sletter dubletter.

### C7 (P2): Alle kartobjekter hentes på én gang
**Filer:** [`mapServices.ts`](../frontend/src/pages/main/services/mapServices.ts), [`useWaterMap.ts`](../frontend/src/pages/main/hooks/useWaterMap.ts).  
RPC-er henter hele FeatureCollection for både ledninger og punkter, filtrering skjer i nettleser. For en liten kommune/datasett kan dette være fornuftig, men ytelsen og nettverksoverføring skalerer lineært.

**Tiltak:** Mål faktisk datasettestørrelse og responstid. Vurder bbox-query og serverfiltrering først når måling viser behov. Ikke kompliser for små datasett uten grunn.

### C8 (P2): Snapping har O(N) gjennomgang for hvert museflytt
**Filer:** [`mapSnapping.ts`](../frontend/src/pages/main/lib/mapSnapping.ts), [`useMapDrawing.ts`](../frontend/src/pages/main/hooks/useMapDrawing.ts).  
`snapCandidates` materialiserer koordinater, og `nearestSnap` projiserer alle hver gang. For store ledningsnett kan dette gi dårlig respons.

**Tiltak:** Profilér før optimalisering; vurder cached kandidatindeks, geografisk bounding-box eller R-tree dersom nødvendig.

### C9 (P2): Nullverdier for RPC-objekter er ikke kontraktfestet
`getWaterObject` deklarerer `Promise<WaterObject>` og kaster på RPC-feil, men validerer ikke at `data` faktisk er et objekt. Dokumenter «finnes ikke», «mangler tilgang» og «forbigående feil» som forskjellige scenarioer.

### C10 (P3): Miljøvariabler og tilkobling er ikke tilstrekkelig dokumentert
**Filer:** [`supabase.ts`](../frontend/src/shared/supabase.ts), [`vite.config.ts`](../frontend/vite.config.ts).  
`vite.config.ts` setter `envDir` til repo-roten, mens frontend ligger under `frontend/`. Dokumenter eksplisitt plasseringen og navnene for `VITE_SUPABASE_URL` og `VITE_SUPABASE_PUBLISHABLE_KEY`. Legg til ufarlig `.env.example`, uten reelle nøkler.

## D. UX, tilgjengelighet og presisjon

### D1 (P2): Filterpanelet mangler synlig/seman­tisk legend for kategoriene
**Fil:** [`MapFilterPanel.tsx`](../frontend/src/pages/main/Subcomponents/Selector/subcomponents/MapFilterPanel.tsx).  
Ledningskategoriene ligger i et `fieldset` **uten `legend`**, selv om de er én tydelig kontrollgruppe. Legg til `<legend>Ledningstyper</legend>`, slik at både skjermleser og bruker ser gruppering.

### D2 (P3): Faktisk skrivefeil i filtreringsvalg
`visibilityOptions` inneholder `Alle (inkludert skjulte` uten avsluttende parentes. Rett i egen UI-opprydding.

### D3 (P2): Delebiblioteket for Select har begrenset labeling-API
**Fil:** [`Select.tsx`](../frontend/src/components/Select.tsx).  
Eksponerer ikke `id`, `aria-label` eller `aria-labelledby` eksplisitt. I filterpanelet brukes en wrapper-`label` rundt kontrollen, men tilgjengelig navn bør kunne gis deterministisk.

**Tiltak:** Utvid kontrollens offentlige API, koble `Select.Trigger` til faktisk label og test med tastatur og skjermleser.

### D4 (P2): Valgt punkt-/ledningstype og status visualiseres ulikt mellom paneler
Det finnes egen PointLegend, statuslegend, statusfarge i ObjectView og linjefarge på kart. Gjenbruk en delt ikon-/legend-komponent eller presentasjonsdata der det gagner forståelsen, uten å koble UI direkte til canvas-registrering.

### D5 (P2): Smale skjermer kan få konkurrerende overlays
**Filer:** [`MapPage.tsx`](../frontend/src/pages/main/MapPage.tsx), [`ObjectPanel.tsx`](../frontend/src/pages/main/Subcomponents/MapObject/subcomponents/ObjectPanel.tsx), [`Selector.tsx`](../frontend/src/pages/main/Subcomponents/Selector/Selector.tsx), [`AccountPanel.tsx`](../frontend/src/pages/main/Subcomponents/Account/AccountPanel.tsx).  
Venstre filterpanel, høyre objektpanel, konto nederst og DrawingToolbar er alle `absolute`. Max-width brukes, men ingen tydelig mobil navigasjonsmodell er definert.

**Tiltak:** Test ved 320, 375, 768 og 1280 px med alle paneler åpne, tastatur og tegning. Overvei mobil sheet/tab-layout.

### D6 (P3): Blandede språk og metadata
**Filer:** [`UserPermission.tsx`](../frontend/src/pages/main/Subcomponents/Account/UserPermission.tsx), [`index.html`](../frontend/index.html).  
Labelen starter med «Permission:», mens resten er norsk. HTML-dokumentet har `lang="en"` og generisk `<title>App</title>`. Bruk norsk språk-tag og deskriptiv tittel.

### D7 (P3): Knappvarianter er ikke intuitivt navngitt
**Fil:** [`Button.tsx`](../frontend/src/components/Button.tsx).  
`default` er en blåfylt knapp, mens `primary` er mørk. Et design-system kan definere dette, men navnekonvensjonen bør dokumenteres så kritiske handlinger ser konsistente ut.

### D8 (P3): `StatusSelect` viser gammel verdi som deaktivert valg
Dette er bevisst for å bevare rå legacy-verdi, men brukeren får ikke forklaring på hvorfor valget ikke kan velges igjen. Vurder hjelpetekst ved ukjent status og eksplisitt konverteringshandling hvis datakvalitet skal forbedres.

## E. TypeScript, testing, avhengigheter og dokumentasjon

### E1 (P2): TypeScript strict mode er ikke aktivert
**Filer:** [`tsconfig.app.json`](../frontend/tsconfig.app.json), [`tsconfig.node.json`](../frontend/tsconfig.node.json).  
Begge har ulike kvalitetssjekker, men mangler `"strict": true`. Dette kan skjule null-/typefeil, særlig rundt GeoJSON og RPC. Aktiver i en egen PR og håndter faktiske feil før merge.

### E2 (P2): Testene bruker egen transpile-/VM-harness
**Filer:** [`map-model.test.mjs`](../frontend/src/pages/main/tests/map-model.test.mjs), [`mapDrawing.test.mjs`](../frontend/src/pages/main/tests/mapDrawing.test.mjs), [`mapObjectDetails.test.mjs`](../frontend/src/pages/main/tests/mapObjectDetails.test.mjs).  
Det finnes allerede gode enhetstester for statusfarger, filtre, seleksjon, tegning og lagring. Men egendefinerte mock-harnesses for hooks/JSX er komplekse og kan avvike fra faktisk React/DOM-semantikk. Samme loader- og hook-runner-mønster gjentas i flere filer.

**Tiltak:** På sikt vurder Vitest + React Testing Library for komponent- og hookadferd, med rene TS-funksjoner testet separat. Ikke bytt rammeverk uten konkret gevinst; en delt testutility er et mindre første steg.

### E3 (P2): Mangler browser-/integrasjonstester
Legg til minst én flyt som åpner kart, endrer filter, velger objekt, redigerer/angrer, oppretter og sletter mot kontrollert test-backend eller mockede RPC-er. Manuell MapLibre-gjennomgang er fremdeles nødvendig for lagrekkefølge/terreng.

### E4 (P2): Ingen CI-workflow i repoet
Det finnes ingen `.github/workflows/` i gjeldende git-tre. Anbefalt minimal workflow: `npm ci`, `npm run lint`, `npm test`, `npm run build` fra `frontend/`; legg til en kontroll for uønskede secrets/migrations.

### E5 (P2): To uavhengige Node-manifester i samme repo
**Filer:** [`package.json`](../package.json), [`frontend/package.json`](../frontend/package.json), og begge lockfiler.  
Rotpakken inneholder `@supabase/ssr`, `@supabase/supabase-js` og `@types/geojson`, mens frontend allerede har egen Supabase-klient og har `@types/geojson` transitive i frontend-lockfile. Ingen sporbar rot-JS/TS-kode importerer rotens SSR-pakke.

**Tiltak:** Verifiser eventuelle lokale scripts/bygg før sletting. Dersom rotpakken faktisk er ubrukt, slett **begge** rotfiler, og legg `@types/geojson` eksplisitt til frontend-devDependencies for en selvstendig installasjon. Dette er med vilje **ikke** slettet i audit-PR fordi ekstern tooling ikke kan utelukkes.

### E6 (P2): README er Vite-mal og delvis utdatert
**Filer:** [`README.md`](../README.md) (`...`) og [`frontend/README.md`](../frontend/README.md).  
Frontend-README beskriver `components/ui/`, mens filene ligger direkte i `components/`; den beholder mye Vite-boilerplate og mangler en fullstendig oversikt over faktisk domenelogikk og data.

**Tiltak:** Én primær README: hva appen gjør, installasjon, miljøvariabler, database/RPC/migrasjoner, brukertilgang, test/build, mappestruktur og hvordan importerte data behandles. Behold kort frontend-README hvis den har eget formål.

### E7 (P2): Ingen formatstandard
Oxlint er konfigurert, men prosjektet har ujevne apostrofer, semikolon, innrykk og JSX-format. `supabase.ts` og enkelte nyere UI-filer har andre stiler enn hooks.

**Tiltak:** Velg Prettier eller Biome for ren formatering, én delt konfigurasjon, og kjør mekanisk formattering i en **egen** PR for å holde logikkdiffs lesbare.

### E8 (P3): `mapOperations.ts` inneholder døde eksporter (håndtert her)
Tidligere `operationColors` gjeninnførte gamle statusnavn (`not_operational`, `maintenance`) og ble ikke importert av applikasjonen. `filterOperationalMap` eksisterte bare som alias. I audit-PR beholdes kun `filterVisibleFeatures`, som er i bruk i `MapPage` og testene.

### E9 (P3): Unødvendige nullsjekker i editor
**Fil:** `MapObjectEditor.tsx`. `record` og `draft` er ikke-nullbare TypeScript-verdier i komponenten, men `dirty` og `save` behandler dem som nullable. Forenkle når `strict` og typekontrakten er stabil.

### E10 (P3): Kode og UI-tekst inneholder små stave-/formatfeil
Eksempler: `Display Componenets`-kommentar, ujevnt formattert `mapLayers.ts`, `ModeSelector.tsx`-semikolon, `Permission:` og feil filtertekst. Samle kosmetiske endringer i en egen PR; ikke bland med endring av funksjonalitet.

## F. Hva kan slettes, og hva skal beholdes?

| Element | Vurdering | Handling i denne PR |
|---|---|---|
| `operationColors` i `mapOperations.ts` | Bekreftet ubrukt; gamle statusnøkler | **Fjernet** |
| Eksport `filterOperationalMap` | Overflødig alias, bare `filterVisibleFeatures` brukes | **Fjernet**, funksjon beholdt med riktig navn |
| `PointLegend` / `OperationsLegend` | Begge brukes | Behold |
| `pipeCategories.unknown` | Gyldig og brukt av filter, legend og editor | **Behold** |
| `statusAliases` | Brukes til legacy-data i rendering | **Behold** |
| `mapObjectUpdates.ts` | Brukes av CRUD og tester | Behold |
| `MapObjectDetails`, `MapObjectView` | Begge brukes; ulike ansvar | Behold |
| `useUnsavedChangesWarning` | Brukes flere steder | Behold |
| `frontend/src/components/{Button,Checkbox,Select}` | Alle importeres | Behold |
| Rotens `package.json` og `package-lock.json` | Ser overflødige ut, men kan støtte lokal tooling | **Ikke fjernet**; verifiser først |
| `hiddenPointStyle`, `pointTypeAliases` og fallback | Brukes i kartikon-/legende-logikken | Behold |
| Kommentar/`properties`/legacy-verdi | Potensielt virkelige data | Ikke slett fra DB basert på kode alene |

## G. Konkrete anbefalte oppfølgings-PR-er

1. **fix: selection rendering and consistent feature IDs** – A1, A2, A5; visuell verifikasjon og legacy-ID-tester.
2. **fix: draft state and record refresh synchronization** – A3, A4; test etter ekstern endring og modusbytte.
3. **refactor: centralize feature model and formatting** – B4–B7, B9; flytt felles domain helpers.
4. **refactor: split object editor and drawing hook** – B2–B3; behold samme state-/callbackmodell.
5. **refactor: unify form controls** – B8, D1–D4; følg opp skjermleser- og mobiltest.
6. **chore: database schema and API contracts** – C1–C6, C9; først etter eksport av sikre skjema-/RLS-definisjoner.
7. **test: establish CI and strict typing** – E1–E4; typefeil og reelle browser-tester.
8. **docs: streamline README and dependency layout** – C10, E5–E7; fjern rotmanifestene bare hvis de faktisk ikke trengs.

## H. Minimumssjekkliste før merge av oppryddinger

- [ ] Ingen tap av kategoriene `main`, `service`, `unknown`.
- [ ] Alle fire statuser har riktige linje- og punktfarger, også legacy-aliaser og null.
- [ ] Filtre og driftskart bruker riktig synlighetssemantikk.
- [ ] `feature.id` og `properties.id` håndteres konsekvent.
- [ ] Valgmarkering er synlig over både skjulte og synlige ledninger.
- [ ] Opprett, rediger, avbryt, lagre, last inn på nytt og slett fungerer.
- [ ] Ulagrede endringer og aktiv tegning blokkerer utilsiktet navigering.
- [ ] RLS/RPC verifisert med både tilgang og avslag i testmiljø.
- [ ] `npm ci && npm run lint && npm test && npm run build` lykkes i `frontend/`.
- [ ] Visuell sjekk: mobil, desktop, terreng og valgt objekt.
- [ ] Ingen produksjonsdata, secrets eller database-dumper i git.

## Konklusjon

**Den nye oppdelingen er et reelt fremskritt.** Prioriter konkrete brukerfeil (lagrekkefølge, identifikatorer, dirty state, refresh) før kosmetisk flytting. Behold mange små filer der det tydeliggjør ansvar, men reduser dobbelt nesting og unødvendige wrapper-lag. Ingen omfattende sletting av databasefelt eller konfigurasjon er forsvarlig før runtime- og databasereferanser er kartlagt.
