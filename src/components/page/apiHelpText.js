/**
 * Plain guides for the API pages: what products, plans, prices, wallets and keys are, and what happens to money
 * on each request. Matches api_platform (service.quote/submit, wallet, billing): change both together.
 */

export const API_ADMIN_GUIDE = {
  intro: 'Products, plans, prices, wallets and keys: what each one is and what happens to money on a request.',
  sections: [
    { title: 'Product, plan, client', points: [
      ['Product', 'What a client can call, counted per plot: the EUDR check (deforestation after 2020) and crop suitability (S1 to N per field). Give a client a plan for each product it may use.'],
      ['Plan', 'The price list for one product: price per plot, any monthly fee, free plots and limits. Make plans in "Plans and prices".'],
      ['Client', 'An organisation using the API. It has one plan per product, its own keys, and a wallet.'],
      'Changing a client\'s plan applies to its next request; finished checks keep the price they were charged.',
    ] },
    { title: 'What each plan setting means', points: [
      ['Price per plot', 'What one checked plot costs, in naira.'],
      ['Monthly fee', 'Charged once on the 1st of each month (0: pay as you go). Never charged twice for one month.'],
      ['Plots included each month', 'The first plots checked each month are free, up to this number.'],
      ['Most plots in one request', 'A larger file is refused; the client splits it.'],
      ['Free test plots a day', 'How many plots test keys can check each day, free.'],
      ['Warn the client below', 'When the balance falls under this, one email goes to the billing contact. The next one goes only after a top-up.'],
    ] },
    { title: 'Prepaid wallet or monthly invoice', points: [
      ['Prepaid', 'The client pays first. You record the bank transfer as a top-up. A request that costs more than the balance is refused (402) and nothing runs.'],
      ['Monthly invoice', 'The balance can go below zero, down to the credit limit. At month end, invoice the client from the statement and record the payment as a top-up.'],
      'A client can be moved between the two at any time (team owner only).',
    ] },
    { title: 'What happens to money on one request', points: [
      ['Validate', 'Free, always. It only checks the file against the EU information system\'s rules.'],
      ['Send for checking', 'The cost (valid plots × price, after free plots) is held from the balance.'],
      ['Check finished', 'Only plots really checked are charged (for suitability: fields that got a class); the rest of the hold goes back.'],
      ['Never charged', 'Plots the EU rules refuse, test keys, failed checks, and a repeated request with the same Idempotency-Key.'],
    ] },
    { title: 'Keys', points: [
      ['Test key (fi_test_…)', 'Runs the same real check, free, up to the daily test limit. For building the integration.'],
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
  example: { title: 'Example: a plan at ₦100 per plot with 50 plots included each month', lines: [
    'The client has already checked 30 plots this month, so 20 free plots are left.',
    'It sends 120 plots; the EU rules refuse 5 (for example, an open polygon). 115 are valid.',
    '20 are free, 95 are paid: 95 × ₦100 = ₦9,500 is held.',
    'The check finishes for all 115 plots: ₦9,500 is charged. Had 10 plots failed to process, ₦1,000 would go back.',
  ] },
};

export const API_CLIENT_GUIDE = {
  intro: 'Your price, your balance, your keys, and what is charged. Read this before your first live request.',
  sections: [
    { title: 'What you pay', points: [
      ['Per plot', 'Each plot checked costs the price shown under Products. Plots included each month are free.'],
      ['Monthly fee', 'If your plan has one, it is taken on the 1st of each month.'],
      ['Never charged', 'Validating a file, plots the EU rules refuse, test keys, failed checks, and a repeated request with the same Idempotency-Key.'],
    ] },
    { title: 'Your balance', points: [
      ['Prepaid wallet', 'Pay by bank transfer and send us the reference; the balance goes up when we record it. A request that costs more than your balance is refused (402) and nothing runs.'],
      ['Monthly invoice', 'You use the API up to your credit limit and pay the invoice each month.'],
      ['Hold, then charge', 'When you send plots, their cost is held. When the check finishes, only the plots really checked are charged and the rest goes back. The statement shows each step.'],
      ['Low balance', 'If your plan has a warning level, we email your billing contact once when the balance falls below it.'],
    ] },
    { title: 'Your keys', points: [
      ['Test key', 'Runs the same real check, free, up to the daily test limit. Build with this first.'],
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
    intro: 'A plan is the price list for one product. Clients on it are charged per plot checked.',
    items: API_ADMIN_GUIDE.sections[1].points.concat([
      ['Billing', 'Whether new clients on this plan start prepaid (pay first) or on a monthly invoice (credit limit).'],
      ['Plan can be given to clients', 'Untick to stop offering it; clients already on it keep it.'],
    ]),
  },
  client: {
    intro: 'Makes an organisation an API client. It needs no estates or boundaries: those can come later.',
    items: [
      ['Organisation', 'An existing organisation, or a new one made from its name.'],
      ['Plan', 'Its price per plot and limits. It can be changed later.'],
      ['Billing', 'Prepaid: pays first, requests refused when the balance is too low. Monthly invoice: can owe up to the credit limit.'],
      ['Credit limit', 'For monthly invoice only: how far below zero the balance may go.'],
      ['Technical contact', 'Who builds the integration.'],
      ['Billing contact', 'Who gets the low-balance email. Empty: the technical contact gets it.'],
    ],
  },
};
