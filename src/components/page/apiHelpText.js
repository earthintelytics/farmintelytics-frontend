/**
 * Plain guides for the API pages: what products, plans, prices, wallets and keys are, and what happens to money
 * on each request. Matches api_platform (pricing.py, products/*, wallet, billing): change both together.
 * Pricing (owner, 24 Nov 2026): per hectare, on the total area of a request's plots, from a prepaid wallet.
 */

export const API_ADMIN_GUIDE = {
  intro: 'Products, plans, prices, wallets and keys: what each one is and what happens to money on a request.',
  sections: [
    { title: 'Product, plan, client', points: [
      ['Product', 'What a client can call: the EUDR check (deforestation after 2020) and crop suitability (S1 to N per field). Every product is priced per hectare.'],
      ['Plan', 'The price list for one product: its price per hectare and its limits. Make plans in "Plans and prices".'],
      ['Client', 'An organisation using the API. It has one plan per product, its own keys, and a prepaid wallet.'],
      'Changing a client\'s plan applies to its next request; finished checks keep the price they were charged.',
    ] },
    { title: 'What each plan setting means', points: [
      ['Price per hectare', 'What one hectare checked costs, in naira. A plot under a hectare costs its fraction (0.4 ha = 0.4 × the price).'],
      ['Most plots in one request', 'A larger file is refused; the client splits it. The price does not change with the number of plots.'],
      ['Free test hectares a day', 'How many hectares test keys can check each day, free.'],
      ['Warn the client below', 'When the wallet falls under this, one email goes to the billing contact. The next one goes only after a top-up.'],
    ] },
    { title: 'Priced by area, so it cannot be bypassed', points: [
      ['Total area', 'A request costs the total area of its valid plots × the price per hectare. Fifty small plots cost the same as one plot covering the same land.'],
      ['Polygons only', 'Every EUDR plot is a polygon and counts as measured. Points are refused (E_POINT_NOT_ACCEPTED): the client sends the boundary.'],
      ['No monthly fee', 'There are no subscriptions, monthly fees or invoices: the client tops up the wallet and checks draw on it.'],
    ] },
    { title: 'What happens to money on one request', points: [
      ['Validate', 'Free, always. It only checks the file against the EU information system\'s rules.'],
      ['Send for checking', 'The cost (total valid area × price per hectare) is held from the wallet. Not enough in it: the request is refused (402) and nothing runs.'],
      ['Check finished', 'Only the area really checked is charged (for suitability: fields that got a class); the rest of the hold goes back.'],
      ['Never charged', 'Plots the EU rules refuse, test keys, failed checks, and a repeated request with the same Idempotency-Key.'],
    ] },
    { title: 'Keys', points: [
      ['Test key (fi_test_…)', 'Runs the same real check, free, up to the plan\'s test hectares a day. For building the integration.'],
      ['Live key (fi_live_…)', 'Charged. Give it when the client is ready.'],
      'A key is shown once, when made: send it safely. We keep only a fingerprint, so a lost key is revoked and replaced, never recovered.',
      'Revoking stops the key at once. Suspending the client stops all its keys.',
    ] },
    { title: 'Your routine', points: [
      'When a client pays: open the client, Money, "Top-up received", with the bank reference. The warning email is re-armed.',
      'To fix a mistake: an adjustment (+ or −) with a note. Entries are never edited or deleted, so the statement stays a true record.',
      'Prices and money: team owners only. The server refuses everyone else too.',
    ] },
  ],
  example: { title: 'Example: a plan at ₦100 per hectare', lines: [
    'The client sends 120 plots; the EU rules refuse 5 (for example, an open polygon). 115 are valid, 230.5 ha in all.',
    '230.5 ha × ₦100 = ₦23,050 is held from the wallet.',
    'The check finishes; 3 plots (6 ha) could not be processed. 224.5 ha are charged: ₦22,450. The other ₦600 goes back.',
    'Had the client split the same land into 1,000 small plots, the cost would be the same: it is the area that is priced.',
  ] },
};

export const API_CLIENT_GUIDE = {
  intro: 'Your price, your wallet, your keys, and what is charged. Read this before your first live request.',
  sections: [
    { title: 'What you pay', points: [
      ['Per hectare', 'A request costs the total area of its plots × the price per hectare shown under Products. A plot under a hectare costs its fraction.'],
      ['Polygons only', 'Send each plot as its boundary (a polygon). Single points are refused with E_POINT_NOT_ACCEPTED.'],
      ['Never charged', 'Validating a file, plots the EU rules refuse, test keys, failed checks, and a repeated request with the same Idempotency-Key. No monthly fees.'],
    ] },
    { title: 'Your wallet', points: [
      ['Prepaid', 'Pay by bank transfer and send us the reference; the balance goes up when we record it. A request that costs more than your balance is refused (402) and nothing runs.'],
      ['Hold, then charge', 'When you send plots, their cost is held. When the check finishes, only the area really checked is charged and the rest goes back. The statement shows each step.'],
      ['Low balance', 'If your plan has a warning level, we email your billing contact once when the balance falls below it.'],
    ] },
    { title: 'Your keys', points: [
      ['Test key', 'Runs the same real check, free, up to the daily test hectares. Build with this first.'],
      ['Live key', 'Charged. Use it once your integration works.'],
      'Keys are shown once. Keep them on your server, never in a website or app people can download.',
      'Rotate a key to replace it (the old one stops at once); revoke a key you no longer use.',
    ] },
    { title: 'Getting results', points: [
      ['Ask', 'GET /eudr/checks/{id} until the status is done (most checks take seconds to minutes).'],
      ['Or be called', `Set a callback below: we POST to it when a check finishes, signed with your secret (FI-Signature). If your server does not answer, we try again 5 more times over about 7 hours.`],
      ['Each plot', 'pass, review or fail, with forest in 2020, loss after the cut-off and its year, and protected areas. Confirm review and fail on the ground.'],
    ] },
  ],
};

export const API_MODAL_HELP = {
  plan: {
    intro: 'A plan is the price list for one product, per hectare. Clients on it pay from a prepaid wallet.',
    items: API_ADMIN_GUIDE.sections[1].points.concat([
      ['Plan can be given to clients', 'Untick to stop offering it; clients already on it keep it.'],
      ['Show on the pricing page', 'Makes this plan\'s price per hectare the published price on /pricing. One plan per product.'],
    ]),
  },
  client: {
    intro: 'Makes an organisation an API client with a prepaid wallet. It needs no estates or boundaries: those can come later.',
    items: [
      ['Organisation', 'An existing organisation, or a new one made from its name.'],
      ['Plan', 'Its price per hectare and limits. It can be changed later.'],
      ['Technical contact', 'Who builds the integration.'],
      ['Billing contact', 'Who gets the low-balance email. Empty: the technical contact gets it.'],
    ],
  },
};

/** The (?) beside each field on the API pages: one or two plain lines each. */
export const API_FIELD_HELP = {
  product: 'What the plan prices: the EUDR check or crop suitability. A plan belongs to one product.',
  planName: 'A name for the team only, for example "Standard" or "Exporter volume". Clients see it on their statement.',
  price: 'What one hectare checked costs, in naira. A request costs the total area of its plots × this price; 0.4 ha costs 0.4 of it.',
  maxPlots: 'The most plots one request may hold. A larger file is refused and the client splits it; the price does not change.',
  testHa: 'Hectares a client may check free each day with a test key, to build its integration.',
  warnBelow: 'When the wallet falls under this amount, one email goes to the billing contact; the next only after a top-up. 0: no warning.',
  notes: 'For the team only; the client never sees it.',
  organisation: 'The client: an existing organisation, or a new one made from its name. Its API service is switched on in its licence.',
  newName: 'The organisation\'s name as it should appear. Its estates and other services can be added later.',
  plan: 'The price list this client pays: price per hectare and limits. It can be changed later; finished checks keep their price.',
  techContact: 'Who builds the integration: we write to them about keys and changes to the API.',
  billingContact: 'Who pays: gets the low-balance email. Empty: the technical contact gets it.',
  moneyType: 'Top-up: money received from the client. Adjustment: a correction by the team (+ adds, − removes), always with a note.',
  amount: 'In naira, for example 50000 for ₦50,000. For an adjustment, use − to take money off.',
  reference: 'Leave empty and one is made for you (TOP-FI-…). If the bank gave its own reference, type that instead so the statement matches the bank.',
  moneyNote: 'Why this entry was made, for the statement, for example "Bank transfer of 24 Nov".',
  keyName: 'A name to recognise the key by, for example "ERP server" or "Sandbox". It is not secret.',
  keyMode: 'Test: free, up to the daily test hectares, for building. Live: charged from the wallet.',
  callback: 'An https address on the public internet. When a check finishes we POST the result there, signed with your secret.',
  paymentReference: 'Quote this on every bank transfer to this wallet, so the money is credited to the right account.',
};

