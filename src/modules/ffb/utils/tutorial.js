// The tutorial text, in plain and direct English. Used by the welcome tour and the Help page.
// Each step lists who it is for: 'all' people, or 'manager' (Manager and Super Admin only).

export const TOUR_STEPS = [
  {
    key: 'welcome', who: 'all', title: 'Welcome to Earthintelytics FFB Analytics',
    body: (u) => [
      'This portal shows what is harvested, where it was harvested and who did the work.',
      `You are signed in as ${u.role}.`,
      u.estate === 'All Estates'
        ? 'You can view all configured estates and plantation blocks.'
        : `You can see ${u.estate} only. Every page, table, card and map shows ${u.estate} and nothing else.`,
      'This short tour takes about one minute.',
    ],
  },
  {
    key: 'menu', who: 'all', title: 'Find your way',
    body: () => [
      'The green menu on the left has every page.',
      'Dashboard: the totals for bunches and loose fruit.',
      'Geospatial Intel: the map of plots. Colours show when each plot was last harvested.',
      'Approved Workers: the people whose work was approved.',
      'Plot Analytics and Worker Analytics: the detail behind the numbers.',
      'Click the three-line button at the top to hide or show the menu.',
    ],
    go: { path: '/', label: 'Open the Dashboard' },
  },
  {
    key: 'estate', who: 'all', title: 'Your estate',
    body: (u) => [
      `The top bar shows your estate: ${u.estate}.`,
      u.estate === 'All Estates'
        ? 'Use the Plantation Location filter on a page to look at one estate.'
        : 'You do not need to choose an estate. The pages open on your estate, and the map opens zoomed on it.',
      'Use the date filters to choose the days you want to look at. Press Reset to start again.',
    ],
    go: { path: '/map', label: 'Open the map' },
  },
  {
    key: 'approve', who: 'manager', title: 'Approve or reject records',
    body: () => [
      'Open Approval Center. Every record has a photo, the count from the AI and the count typed by the recorder.',
      'Look at the photo. If the two counts are different, choose the one that is right.',
      'Write a short note about what you checked. The note is needed.',
      'Press Approve or Reject. Only approved records are paid.',
      'The red number on the menu shows how many plots still need a decision.',
    ],
    go: { path: '/approval', label: 'Open Approval Center' },
  },
  {
    key: 'settlement', who: 'manager', title: 'Monthly Settlement',
    body: () => [
      'Open Approved Workers, then Monthly Settlement.',
      'It adds up the approved work of every person for the pay month, one line for each role. A person who cut and carried has two lines.',
      'A pay month runs from the 27th to the 26th. A record counts in the month it was approved.',
      'The red card shows records that are not approved yet. Decide them before the 26th, or they wait for next month.',
      'Press Export CSV to send the figures to the ERP. The ERP works out the money.',
    ],
    go: { path: '/approved-workers/monthly-settlement', label: 'Open Monthly Settlement' },
  },
  {
    key: 'help', who: 'all', title: 'Need help later?',
    body: () => [
      'Help is at the bottom of the left menu.',
      'It has this tour, step-by-step guides and answers to common questions.',
      'If something looks wrong, tell the Super Admin and say which page you were on.',
    ],
    go: { path: '/help', label: 'Open Help' },
  },
];

export const stepsFor = (role) => TOUR_STEPS.filter(s => s.who === 'all' || (s.who === 'manager' && (role === 'Manager' || role === 'Super Admin' || role === 'Edit')));

export const GUIDES = [
  {
    key: 'approve', who: 'manager', title: 'How to approve a record',
    steps: [
      'Open Approval Center from the menu.',
      'Find the plot and the day. Click it to see the records.',
      'Look at the photo and the two counts: the AI count and the typed count.',
      'If the counts are different, choose the count that is right.',
      'Write a short note about what you checked.',
      'Press Approve. If the work is not good, press Reject and say why.',
    ],
  },
  {
    key: 'settlement', who: 'manager', title: 'How to get the monthly figures',
    steps: [
      'Open Approved Workers, then Monthly Settlement.',
      'Choose the pay month. The dates are shown next to it, for example 27 Aug to 26 Sep.',
      'Look at the red card. It shows records that are not approved yet. Approve or reject them first.',
      'Check the table. Each line is one person in one role.',
      'Press Export CSV, choose the columns, and download the file for the ERP.',
      'After the 26th, the Super Admin can lock the month. A locked month opens fast and its figures do not change.',
    ],
  },
  {
    key: 'map', who: 'all', title: 'How to read the map',
    steps: [
      'Open Geospatial Intel.',
      'Each shape is a plot. The colour tells you when it was last harvested.',
      'Click a plot to see its details on the side.',
      'Use the date filter to choose the days. The map moves to the plots that match.',
      'Press Reset to go back to your estate.',
    ],
  },
  {
    key: 'export', who: 'all', title: 'How to download a table',
    steps: [
      'Use the filters on the page to choose what you want.',
      'Press Export CSV.',
      'Tick the columns you want and press Export.',
      'The file opens in Excel. The file name shows the dates you chose.',
    ],
  },
];

export const FAQ = [
  { q: 'A number shows 0. Is something broken?', a: 'Not always. A number is 0 when there is no approved work in the dates and the estate you chose. Change the dates, or press Reset.' },
  { q: 'Why can I not see another estate?', a: 'Your account is set to one estate. Ask the Super Admin if you need more.' },
  { q: 'Why is a worker on two lines in Monthly Settlement?', a: 'One line for each role. A person who cut and carried bunches is paid for both roles, so there is a Cutter line and a Carrier line.' },
  { q: 'What does the red card on Monthly Settlement mean?', a: 'It counts records from that month that nobody has approved or rejected yet. They are not in the figures until they are approved.' },
  { q: 'A record I approved is not in this month. Why?', a: 'A record counts in the month it was approved. Anything approved after the 26th goes to the next month.' },
  { q: 'Can I change a record in a locked month?', a: 'Only a Super Admin can. A locked month is already summed up for payment.' },
  { q: 'I forgot my password.', a: 'Ask the Super Admin to reset it. The new password is sent to your email.' },
  { q: 'The page says my session has expired.', a: 'Sign in again. You are signed out after a day, or if your account is changed.' },
];
