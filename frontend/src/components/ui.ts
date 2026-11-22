/* Patrones compartidos: Tailwind detecta las clases completas en este archivo. */
const buttonBase =
  'inline-flex shrink-0 items-center justify-center gap-3 rounded-full border font-semibold text-center transition duration-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-patzi-coral disabled:cursor-wait disabled:opacity-50 disabled:shadow-none';
const buttonSize = 'min-h-12 px-6 py-3 text-sm';
const smallSize = 'min-h-11 px-4 py-2 text-xs';
const solid =
  'border-patzi-green bg-patzi-green text-white hover:bg-patzi-ink hover:shadow-lg hover:shadow-patzi-green/10';
const outline = 'border-patzi-green/25 bg-transparent text-patzi-green hover:bg-patzi-sage';
const light = 'border-patzi-gold bg-patzi-gold text-patzi-ink hover:bg-amber-200';

export const ui = {
  button: `${buttonBase} ${buttonSize} ${solid}`,
  buttonSmall: `${buttonBase} ${smallSize} ${solid}`,
  buttonOutline: `${buttonBase} ${buttonSize} ${outline}`,
  buttonOutlineSmall: `${buttonBase} ${smallSize} ${outline}`,
  buttonLight: `${buttonBase} ${buttonSize} ${light}`,
  buttonLightSmall: `${buttonBase} ${smallSize} ${light}`,
  buttonFull: 'w-full',
  wrap: 'mx-auto w-[calc(100%-40px)] max-w-[1320px] md:w-[calc(100%-80px)]',
  eyebrow: 'mb-5 text-[10px] font-bold leading-5 tracking-[0.18em] text-patzi-coral',
  textLink:
    'inline-flex min-h-11 items-center gap-2 text-sm font-semibold underline decoration-patzi-green/30 underline-offset-4 hover:text-patzi-coral',
  textButton:
    'min-h-11 cursor-pointer border-0 bg-transparent px-0 text-sm font-semibold text-patzi-green underline decoration-patzi-green/30 underline-offset-4 hover:text-patzi-coral disabled:cursor-wait disabled:opacity-50',
  field:
    'mb-5 flex min-w-0 flex-col gap-2 [&_label]:text-sm [&_label]:font-semibold [&_input]:min-h-12 [&_input]:w-full [&_input]:min-w-0 [&_input]:rounded-xl [&_input]:border [&_input]:border-patzi-green/20 [&_input]:bg-white [&_input]:px-4 [&_input]:py-3 [&_textarea]:w-full [&_textarea]:resize-y [&_textarea]:rounded-xl [&_textarea]:border [&_textarea]:border-patzi-green/20 [&_textarea]:bg-white [&_textarea]:p-4 [&_select]:min-h-12 [&_select]:w-full [&_select]:rounded-xl [&_select]:border [&_select]:border-patzi-green/20 [&_select]:bg-white [&_select]:px-3 [&_input:focus]:ring-2 [&_input:focus]:ring-patzi-green/15 [&_textarea:focus]:ring-2 [&_textarea:focus]:ring-patzi-green/15 [&_select:focus]:ring-2 [&_select:focus]:ring-patzi-green/15 [&_[aria-invalid=true]]:border-red-700 [&_small]:text-xs [&_small]:leading-5',
  fieldError: 'text-sm leading-6 text-red-800',
  fieldHint: 'text-xs leading-6 text-patzi-muted',
  formCard:
    'rounded-3xl border border-patzi-green/10 bg-white p-6 shadow-sm sm:p-8 [&>h2]:mb-4 [&>h2]:text-2xl [&>h2]:font-semibold [&>h2]:tracking-tight [&>p]:mb-6 [&>p]:leading-7',
  formRow: 'grid grid-cols-1 gap-x-5 sm:grid-cols-2',
  formAlert:
    'mb-5 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm leading-6 text-red-900',
  formSuccess:
    'mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm leading-6 text-emerald-900',
  formFoot:
    'mt-6! mb-0! border-t border-patzi-green/10 pt-5 text-center text-sm [&_a]:font-semibold [&_a]:underline [&_a]:underline-offset-4',
  passwordField: 'relative pb-2',
  passwordToggle: '-mt-2 mb-4 text-xs',
  pageState:
    'min-h-[50vh] py-14 leading-7 [&>h1]:mb-5 [&>h1]:text-3xl [&>h1]:font-semibold [&>p]:mb-5',
  pageMessage:
    'min-h-[55vh] py-20 [&>h1]:mb-5 [&>h1]:text-4xl [&>h1]:font-semibold [&>p]:mb-6 [&>p]:leading-7 [&>p]:text-patzi-muted',
  backLink:
    'mb-6 inline-flex min-h-11 items-center text-sm font-semibold text-patzi-muted hover:text-patzi-coral',
  pageIntro: 'mb-6 max-w-2xl text-base leading-8 text-patzi-muted',
  muted: 'text-sm leading-7 text-patzi-muted',
  authPage: 'grid items-start gap-6 py-8 lg:grid-cols-[1fr_1.05fr] lg:gap-12 lg:py-14',
  authStory:
    'relative isolate overflow-hidden rounded-3xl bg-patzi-ink p-7 text-white sm:p-10 lg:sticky lg:top-32 [&>h1]:my-6 [&>h1]:text-4xl [&>h1]:font-semibold [&>h1]:leading-tight [&>h1]:tracking-tight sm:[&>h1]:text-5xl [&>p:not(:first-child)]:max-w-sm [&>p:not(:first-child)]:text-sm [&>p:not(:first-child)]:leading-7 [&>p:first-child]:text-patzi-gold',
  storyMark: 'mt-8 hidden text-8xl leading-none text-patzi-gold lg:block',
  roleSelector:
    'mb-6 grid grid-cols-1 gap-3 border-0 p-0 sm:grid-cols-2 [&_legend]:mb-3 [&_legend]:text-sm [&_legend]:font-semibold [&_label]:flex [&_label]:min-h-14 [&_label]:cursor-pointer [&_label]:items-center [&_label]:gap-3 [&_label]:rounded-xl [&_label]:border [&_label]:border-patzi-green/20 [&_label]:p-4 [&_label:has(input:checked)]:border-patzi-green [&_label:has(input:checked)]:bg-patzi-sage [&_input]:size-4 [&_input]:accent-patzi-green',
  accountPage:
    'py-10 pb-20 [&>h1]:mb-3 [&>h1]:text-4xl [&>h1]:font-semibold [&>h1]:tracking-tight [&>h1]:wrap-anywhere md:[&>h1]:text-5xl',
  accountGrid: 'mt-8 grid items-start gap-6 lg:grid-cols-[1.5fr_1fr]',
  accountAside:
    'rounded-3xl border border-patzi-green/10 bg-patzi-sage p-7 [&>span]:text-6xl [&>span]:text-patzi-coral [&>h2]:my-5 [&>h2]:text-2xl [&>h2]:font-semibold [&>p]:mb-5 [&>p]:text-sm [&>p]:leading-7',
  profileDetails:
    'grid gap-y-2 [&_dt]:mt-5 [&_dt]:text-xs [&_dt]:font-semibold [&_dt]:tracking-wide [&_dt]:text-patzi-muted [&_dd]:m-0 [&_dd]:border-b [&_dd]:border-patzi-green/10 [&_dd]:pb-4 [&_dd]:text-sm [&_dd]:wrap-anywhere',
} as const;
