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
  marketplacePage: 'py-8 pb-20 md:pt-12',
  marketHeading:
    'mb-9 flex flex-col items-start justify-between gap-6 rounded-3xl border border-patzi-green/10 bg-patzi-sage p-6 sm:p-9 lg:flex-row lg:items-end [&_h1]:my-4 [&_h1]:text-4xl [&_h1]:font-semibold [&_h1]:leading-tight [&_h1]:tracking-tight [&_h1]:wrap-anywhere md:[&_h1]:text-5xl [&_h1_em]:font-editorial [&_h1_em]:font-normal [&_h1_em]:text-patzi-coral [&_p]:max-w-2xl [&_p]:leading-7 [&>a]:shrink-0 [&>button]:shrink-0',
  remoteState:
    'min-h-52 rounded-3xl border border-dashed border-patzi-green/20 bg-white px-6 py-12 text-center [&_h2]:mb-4 [&_h2]:text-2xl [&_h2]:font-semibold [&_p]:mb-6 [&_p]:leading-7',
  catalogFilters:
    'rounded-3xl border border-patzi-green/10 bg-white p-6 shadow-sm [&_h2]:mb-6 [&_h2]:border-b [&_h2]:border-patzi-green/10 [&_h2]:pb-5 [&_h2]:text-lg [&_h2]:font-semibold',
  priceFields:
    'm-0 grid min-w-0 grid-cols-2 gap-x-3 border-0 p-0 [&_legend]:mb-4 [&_legend]:text-sm [&_legend]:font-semibold',
  clearFilters: 'mx-auto mt-4 block',
  filterWarning: 'mb-5 rounded-xl bg-amber-50 p-4 text-xs leading-6 [&_button]:mt-2',
  resultsBar:
    'mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-patzi-green/10 pb-4 text-sm text-patzi-muted [&_p]:m-0 [&_strong]:text-patzi-green [&>span]:text-xs',
  publicImage:
    'overflow-hidden rounded-2xl bg-patzi-sage [&>img]:block [&>img]:size-full [&>img]:object-cover',
  imagePlaceholder:
    'flex h-full flex-col items-center justify-center gap-4 bg-patzi-sage text-patzi-muted [&_svg]:size-14 [&_span]:font-editorial [&_span]:text-sm [&_span]:italic',
  pagination:
    'mt-9 flex flex-wrap items-center justify-between gap-4 border-t border-patzi-green/10 pt-6 text-xs text-patzi-muted [&>div]:flex [&>div]:flex-wrap [&>div]:gap-3',
  storeSearch:
    'mb-9 max-w-2xl [&>label]:mb-3 [&>label]:block [&>label]:text-sm [&>label]:font-semibold [&>div]:flex [&>div]:flex-wrap [&>div]:gap-3 [&_input]:min-h-12 [&_input]:min-w-0 [&_input]:flex-1 [&_input]:rounded-xl [&_input]:border [&_input]:border-patzi-green/20 [&_input]:bg-white [&_input]:px-4',
  storeCard:
    'overflow-hidden rounded-3xl border border-patzi-green/10 bg-white p-2 shadow-sm transition-shadow hover:shadow-lg hover:shadow-patzi-green/10 [&_a>div:first-child]:aspect-[1.8] [&_img]:object-contain [&_img]:p-6',
  storeCardCopy:
    'p-5 [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:wrap-anywhere [&_p]:mb-4 [&_p]:line-clamp-3 [&_p]:text-sm [&_p]:leading-7 [&_span]:text-xs [&_span]:font-semibold [&_span]:text-patzi-coral',
  storeBanner: 'mb-8',
  shopIntro:
    'mb-7 flex flex-col gap-6 sm:flex-row sm:items-center [&_h1]:my-4 [&_h1]:text-4xl [&_h1]:font-semibold [&_h1]:tracking-tight [&_h1]:wrap-anywhere md:[&_h1]:text-5xl',
  shopLogo: 'size-24 shrink-0 [&>img]:object-contain [&_span]:hidden',
  preserveText: 'whitespace-pre-wrap text-sm leading-7 wrap-anywhere',
  shopContact:
    'mb-10 flex flex-wrap gap-x-8 gap-y-3 border-y border-patzi-green/10 py-5 text-sm wrap-anywhere [&_a]:underline [&_a]:underline-offset-4',
  sectionTitle: 'mb-7 text-2xl font-semibold tracking-tight sm:text-3xl',
  breadcrumbs:
    'mb-8 flex flex-wrap gap-3 text-xs leading-6 text-patzi-muted [&_a]:underline [&_a]:underline-offset-4 [&_span]:wrap-anywhere',
  productDetail: 'grid items-start gap-8 lg:grid-cols-[1.1fr_1fr] lg:gap-12',
  productGallery: 'min-w-0',
  galleryThumbs:
    'mt-4 flex flex-wrap gap-3 [&_button]:w-18 [&_button]:cursor-pointer [&_button]:rounded-xl [&_button]:border [&_button]:border-patzi-green/20 [&_button]:p-1 [&_button[aria-pressed=true]]:border-patzi-coral [&_button[aria-pressed=true]]:ring-2 [&_button[aria-pressed=true]]:ring-patzi-coral/30 [&_span]:hidden [&_svg]:size-7',
  productDetailCopy:
    'min-w-0 rounded-3xl border border-patzi-green/10 bg-white p-6 sm:p-8 [&>h1]:my-5 [&>h1]:text-3xl [&>h1]:font-semibold [&>h1]:tracking-tight [&>h1]:wrap-anywhere sm:[&>h1]:text-4xl [&_h2]:mb-4 [&_h2]:text-xl [&_h2]:font-semibold',
  detailPrice: 'mb-5 text-3xl font-bold tracking-tight text-patzi-green',
  availableBadge:
    'mb-4 inline-flex rounded-full border border-patzi-green/10 bg-patzi-sage px-3 py-1.5 text-xs font-semibold text-patzi-green',
  sellerNote:
    'mt-8 flex gap-4 border-t border-patzi-green/10 pt-7 [&>span]:text-5xl [&>span]:text-patzi-coral [&_p]:mb-5 [&_p]:text-sm [&_p]:leading-7',
  addToCart:
    'my-7 rounded-2xl bg-patzi-sage/60 p-5 [&>label]:mb-3 [&>label]:block [&>label]:text-sm [&>label]:font-semibold [&>small]:mt-4 [&>small]:block [&>small]:text-xs [&>small]:leading-6',
  quantityAction:
    'flex flex-wrap items-center gap-3 [&_input]:min-h-12 [&_input]:w-22 [&_input]:min-w-0 [&_input]:rounded-xl [&_input]:border [&_input]:border-patzi-green/20 [&_input]:bg-white [&_input]:px-3 [&_input[aria-invalid=true]]:border-red-700',
  cartLayout: 'grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_320px]',
  cartGroups: 'min-w-0',
  cartGroup: 'mb-6 rounded-3xl border border-patzi-green/10 bg-white p-5 sm:p-7',
  cartGroupHeading:
    'flex flex-wrap items-center justify-between gap-3 border-b border-patzi-green/10 pb-5 [&_h2]:m-0 [&_h2]:text-lg [&_h2]:font-semibold [&_span]:text-xs',
  cartLine:
    'grid grid-cols-[72px_minmax(0,1fr)] gap-4 border-b border-patzi-green/10 py-6 last:border-0 last:pb-0 sm:grid-cols-[96px_minmax(0,1fr)_auto] [&>div:first-child]:size-18 sm:[&>div:first-child]:size-24 [&>div:first-child_span]:hidden',
  cartLineCopy:
    'min-w-0 text-sm [&>h3]:mb-2 [&>h3]:text-lg [&>h3]:font-semibold [&>h3]:wrap-anywhere [&>p]:my-2',
  cartQuantityForm:
    '[&_label]:mt-4 [&_label]:mb-2 [&_label]:block [&_label]:text-xs [&_label]:font-semibold',
  cartRemove: 'mt-3 text-left',
  cartLineTotal: 'col-start-2 whitespace-nowrap text-base sm:col-start-auto',
  cartSummary:
    'rounded-3xl border border-patzi-green/10 bg-patzi-sage p-6 lg:sticky lg:top-32 [&>h2]:mb-5 [&>h2]:text-xl [&>h2]:font-semibold [&_dl]:my-6 [&_dl>div]:mt-3 [&_dl>div]:flex [&_dl>div]:justify-between [&_dl>div]:gap-3 [&_dt]:text-sm [&_dd]:m-0 [&_dd]:whitespace-nowrap [&>p]:my-4 [&>p]:text-xs [&>p]:leading-6',
  cartTotal: 'border-t border-patzi-green/20 pt-4 font-bold',
  cartNotice:
    'mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900',
  checkoutLink: 'mt-5',
  checkoutNotice:
    'mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-7 text-amber-950',
  checkoutLayout: 'mt-7 grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_340px]',
  checkoutForm:
    '[&_fieldset]:mb-7 [&_fieldset]:min-w-0 [&_fieldset]:border-0 [&_fieldset]:p-0 [&_fieldset:disabled]:opacity-60 [&_legend]:mb-6 [&_legend]:text-lg [&_legend]:font-semibold',
  checkoutFields: 'grid gap-x-5 sm:grid-cols-2',
  checkoutReviewGrid:
    'mt-7 grid items-start gap-6 md:grid-cols-2 [&_h3]:mb-4 [&_h3]:text-lg [&_h3]:font-semibold',
  checkoutCountry: 'mb-5 text-sm text-patzi-muted',
  paymentOptions: 'grid gap-3',
  paymentOption:
    'flex cursor-pointer items-start gap-3 rounded-2xl border border-patzi-green/20 p-4 has-checked:border-patzi-green has-checked:bg-patzi-sage [&_input]:mt-1 [&_input]:size-5 [&_input]:shrink-0 [&_input]:accent-patzi-green [&_strong]:block [&_strong]:text-sm [&_small]:mt-2 [&_small]:block [&_small]:text-xs [&_small]:leading-6',
  checkoutPrivacy: 'mt-5 mb-0 text-xs leading-6 text-patzi-muted',
  checkoutStore:
    'mb-5 border-b border-patzi-green/10 py-4 [&>h3]:mb-4 [&>h3]:font-semibold [&>h4]:mb-4 [&>h4]:font-semibold [&>ul]:list-none [&>ul]:p-0 [&>ul>li]:mb-3 [&>ul>li]:flex [&>ul>li]:justify-between [&>ul>li]:gap-4 [&>ul>li]:text-sm [&>ul>li>strong]:whitespace-nowrap',
  checkoutSummaryItem:
    'mb-3 flex items-start justify-between gap-4 text-sm leading-6 [&_strong]:whitespace-nowrap',
  checkoutReview:
    'mt-10 rounded-3xl border border-patzi-green/10 bg-white p-6 shadow-sm sm:p-9 [&>h2]:mb-6 [&>h2]:text-3xl [&>h2]:font-semibold [&_h3]:mt-6 [&_h3]:mb-3 [&_h3]:font-semibold [&_p]:leading-7',
  checkoutReviewTotal:
    'my-5 flex justify-between gap-4 border-t border-patzi-green/10 pt-5 text-lg font-semibold',
  confirmOrder: 'mt-7 border-t border-patzi-green/10 pt-6',
  orderList: 'my-7 grid gap-4',
  orderListCard:
    'rounded-3xl border border-patzi-green/10 bg-white p-6 shadow-sm [&_h2]:mb-4 [&_h2]:text-xl [&_h2]:font-semibold [&_p]:mb-3 [&_p]:text-sm [&_p]:leading-7',
  orderPage: 'leading-7',
  catalogContent: 'min-w-0',
} as const;
