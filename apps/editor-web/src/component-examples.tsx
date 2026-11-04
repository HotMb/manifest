import { useId, useRef, useState } from 'react';

type Example = { id: string; title: string; kind: 'Composant' | 'Animation'; description: string; terms: string };
const EXAMPLES: readonly Example[] = [
  { id: 'menu', title: 'Menu de navigation', kind: 'Composant', description: 'Un menu compact pour parcourir les sections.', terms: 'menu navigation entete header liens onglets' },
  { id: 'hero', title: 'Section d’accueil', kind: 'Composant', description: 'Un titre, une présentation et une action principale.', terms: 'hero accueil titre texte introduction bandeau' },
  { id: 'cards', title: 'Cartes de contenu', kind: 'Composant', description: 'Une grille pour présenter des projets ou des services.', terms: 'cartes cards grille grid projets services liste' },
  { id: 'faq', title: 'Accordéon FAQ', kind: 'Composant', description: 'Des questions qui dévoilent leur réponse.', terms: 'faq accordeon questions reponses details' },
  { id: 'fade', title: 'Fondu à l’entrée', kind: 'Animation', description: 'Faire apparaître le contenu progressivement.', terms: 'fondu fade apparition opacite entree transition' },
  { id: 'slide', title: 'Glissement doux', kind: 'Animation', description: 'Faire entrer un élément avec un léger déplacement.', terms: 'glissement slide deplacement mouvement entree transition' },
  { id: 'hover', title: 'Bouton au survol', kind: 'Animation', description: 'Souligner une action au survol et au focus clavier.', terms: 'bouton button survol hover focus interaction' },
];
const normalize = (value: string) => value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

function ExampleDemo({ id, replay }: { id: string; replay: number }) {
  const [activeSection, setActiveSection] = useState('Accueil');
  const [activated, setActivated] = useState(false);
  if (id === 'menu') return <div className="example-demo example-demo--menu"><strong>atelier.</strong><div aria-label="Navigation de démonstration">{['Accueil', 'Services', 'Contact'].map((label) => <button key={label} aria-pressed={activeSection === label} onClick={() => setActiveSection(label)}>{label}</button>)}</div><p>{activeSection === 'Accueil' ? 'Bienvenue dans l’atelier.' : activeSection === 'Services' ? 'Découvre nos services.' : 'Échangeons sur ton projet.'}</p></div>;
  if (id === 'hero') return <div className="example-demo example-demo--hero"><small>Une idée à partager</small><strong>Donne forme à ton projet.</strong><p>Quelques mots pour présenter l’essentiel.</p><span className="example-demo__cta">Découvrir ↗</span></div>;
  if (id === 'cards') return <div className="example-demo example-demo--cards">{['Imaginer', 'Concevoir', 'Créer'].map((label) => <div key={label}><span aria-hidden="true" /><strong>{label}</strong></div>)}</div>;
  if (id === 'faq') return <div className="example-demo example-demo--faq"><details><summary>Comment ça fonctionne ?</summary><p>Une question à la fois, avec sa réponse juste en dessous.</p></details><details><summary>Par où commencer ?</summary><p>Décris ce que tu souhaites réaliser.</p></details></div>;
  if (id === 'hover') return <div className="example-demo example-demo--hover"><button className="example-hover-button" aria-pressed={activated} onClick={() => setActivated((value) => !value)}>{activated ? 'Action activée' : 'Survole-moi ou utilise Tab'} <span aria-hidden="true">↗</span></button></div>;
  return <div className={`example-demo example-demo--motion example-demo--${id}`}><div className="example-motion-tile" key={replay}><span aria-hidden="true">✦</span><strong>{id === 'fade' ? 'Une apparition en douceur' : 'Un mouvement léger'}</strong></div></div>;
}

/** Local examples only. This component has no document or provider access. */
export function ComponentExamples() {
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [replay, setReplay] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const prefix = useId();
  const words = normalize(query).trim().split(/\s+/).filter(Boolean);
  const examples = EXAMPLES.filter((example) => words.every((word) => normalize(`${example.title} ${example.kind}s ${example.description} ${example.terms}`).includes(word)));

  function changeQuery(value: string) { setQuery(value); setExpanded(null); setReplay(0); }
  function clearQuery() { changeQuery(''); input.current?.focus(); }

  return <section className="component-examples" aria-labelledby={`${prefix}-title`}>
    <h3 id={`${prefix}-title`}>Composants & animations</h3>
    <label htmlFor={`${prefix}-search`}>Rechercher un composant ou une animation</label>
    <div className="example-search">
      <svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5" /><path d="m13 13 4 4" /></svg>
      <input ref={input} id={`${prefix}-search`} type="search" value={query} onChange={(event) => changeQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Escape' && query) { event.preventDefault(); clearQuery(); } }} placeholder="Menu, cartes, fondu, survol…" autoComplete="off" maxLength={200} aria-describedby={`${prefix}-scope`} />
      {query && <button className="example-search__clear" aria-label="Effacer la recherche de composants" onClick={clearQuery}>×</button>}
    </div>
    <p id={`${prefix}-scope`} className="examples-scope">Exemples locaux à explorer. La recherche ne modifie pas ta page.</p>
    <p className="examples-count" role="status" aria-live="polite">{examples.length} exemple{examples.length === 1 ? '' : 's'}{query.trim() ? ' trouvé' : ' à explorer'}{examples.length !== 1 && query.trim() ? 's' : ''}</p>
    {examples.length ? <ul className="examples-list" aria-label="Exemples de composants et d’animations">{examples.map((example) => {
      const open = expanded === example.id;
      const demoId = `${prefix}-demo-${example.id}`;
      return <li key={example.id}><article className="example-card">
        <div className="example-card__heading"><span className={`example-kind example-kind--${example.kind === 'Animation' ? 'motion' : 'component'}`}>{example.kind}</span><h4>{example.title}</h4></div>
        <p>{example.description}</p>
        <button className="text-button example-toggle" aria-expanded={open} aria-controls={demoId} onClick={() => { setExpanded(open ? null : example.id); setReplay(0); }}>{open ? 'Fermer l’exemple' : 'Voir l’exemple'}<span className="sr-only"> : {example.title}</span><span aria-hidden="true">{open ? '−' : '+'}</span></button>
        <div id={demoId} hidden={!open} role="region" aria-label={`Exemple : ${example.title}`}>
          {open && <><ExampleDemo id={example.id} replay={replay} />{['fade', 'slide'].includes(example.id) && <button className="text-button example-replay" onClick={() => setReplay((value) => value + 1)}>Rejouer l’animation</button>}</>}
        </div>
      </article></li>;
    })}</ul> : <div className="examples-empty"><strong>Aucun exemple trouvé</strong><p>Essaie « menu », « cartes », « fondu » ou « survol ».</p><button className="text-button" onClick={clearQuery}>Voir tous les exemples</button></div>}
  </section>;
}
