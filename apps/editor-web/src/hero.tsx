import { type Config } from '@puckeditor/core';
import type { CSSProperties, ReactNode } from 'react';
import { createHeroBlock, type HeroProps, type Snapshot } from '@design-workbench/m0-contract';

export type Components = { Hero: Omit<HeroProps, 'id'> };

function Hero({ title, body, animation, backgroundToken, theme }: HeroProps & { theme: Snapshot['theme'] }) {
  const style = {
    '--site-background': theme.tokens[backgroundToken].value,
    '--site-text': theme.tokens['color.text'].value,
    '--site-accent': theme.tokens['color.accent'].value,
  } as CSSProperties;
  return (
    <section className={`site-hero site-hero--${animation}`} style={style} aria-label="Section d’accueil">
      <div className="site-hero__masthead"><span>Atelier / Architecture</span><span>Des lieux de vie</span></div>
      <div className="site-hero__body">
        <div className="site-hero__copy"><span className="site-hero__caption">Matière, espace, lumière.</span><h1>{title}</h1><p>{body}</p><div className="site-hero__signature" aria-hidden="true"><span /><span /></div></div>
        <div className="site-hero__drawing">
          <svg viewBox="0 0 360 420" role="img" aria-label="Plan architectural abstrait, dessin de l’atelier">
            <g fill="none" stroke="currentColor" strokeWidth="1.4">
              <path d="M45 55H310V345H45Z M45 165H200V345 M200 55V115 M245 55V165H310 M200 165H245 M45 265H125 M125 220V345" />
              <path d="M200 115a50 50 0 0 1 50 50 M125 220a45 45 0 0 0-45 45" strokeWidth=".65" />
              <path d="M30 42H325 M30 40V48 M325 40V48 M327 55V345 M323 55H331 M323 345H331 M35 355H315 M45 351V359 M310 351V359" strokeWidth=".55" />
              <path d="M59 69H184V149H59Z M260 180H296V331H260Z M60 281H110V331H60Z" strokeWidth=".5" />
              <circle cx="262" cy="108" r="27" strokeWidth=".55" /><path d="M262 81V135 M235 108H289" strokeWidth=".4" />
              <path d="M150 355V378 M140 368L150 378L160 368" />
            </g>
            <g fill="currentColor" fontFamily="Arial, sans-serif" fontSize="8"><text x="156" y="34">LUMIÈRE NATURELLE</text><text x="45" y="391">ÉTUDE D’ESPACE</text><text x="268" y="391">ATELIER</text></g>
          </svg>
        </div>
      </div>
      <div className="site-hero__foot"><span>Architecture & aménagement</span><span>Concevoir pour habiter.</span></div>
    </section>
  );
}

export function heroConfig(theme: Snapshot['theme']): Config {
  const { id: _id, ...defaultProps } = createHeroBlock().props;
  return {
    root: { label: 'Page', fields: {}, render: ({ children }: { children: ReactNode }) => <>{children}</> },
    components: {
      Hero: {
        label: 'Section d’accueil',
        fields: {
          title: { type: 'text', label: 'Titre' },
          body: { type: 'textarea', label: 'Texte de présentation' },
          animation: { type: 'radio', label: 'Animation d’entrée', options: [{ label: 'Aucune', value: 'none' }, { label: 'Fondu discret', value: 'fade' }] },
          backgroundToken: { type: 'custom', render: () => <></> },
        },
        defaultProps,
        permissions: { delete: false, duplicate: false, insert: false, drag: false },
        render: (props) => <Hero id={props.id} title={props.title} body={props.body} backgroundToken={props.backgroundToken} animation={props.animation} theme={theme} />,
      },
    },
  };
}
